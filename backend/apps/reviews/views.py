from rest_framework import serializers, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import Review
from apps.accounts.models import ServiceProvider
from apps.bookings.models import Booking


# ─── Sentiment Analysis (rule-based NLP without external libs) ───────────────

POSITIVE_WORDS = {
    'excellent', 'great', 'amazing', 'wonderful', 'fantastic', 'outstanding',
    'brilliant', 'superb', 'perfect', 'love', 'loved', 'awesome', 'best',
    'good', 'nice', 'happy', 'satisfied', 'recommend', 'professional',
    'efficient', 'reliable', 'helpful', 'friendly', 'polite', 'fast', 'quick',
    'clean', 'thorough', 'skilled', 'expert', 'punctual', 'honest', 'fair',
}

NEGATIVE_WORDS = {
    'terrible', 'horrible', 'awful', 'bad', 'poor', 'worst', 'disappointed',
    'unprofessional', 'rude', 'late', 'slow', 'expensive', 'overpriced',
    'damage', 'damaged', 'broken', 'incomplete', 'waste', 'useless',
    'unreliable', 'careless', 'dirty', 'messy', 'fraud', 'scam', 'cheated',
    'never', 'avoid', 'incompetent', 'lazy', 'dishonest', 'delay', 'issue',
}

NEGATION_WORDS = {'not', 'no', 'never', "didn't", "wasn't", "isn't", "don't", "won't", "can't"}


def analyze_sentiment(text: str):
    """Rule-based sentiment analysis with negation handling."""
    words = text.lower().split()
    pos_score = 0
    neg_score = 0
    negate = False

    for i, word in enumerate(words):
        clean = word.strip('.,!?;:')
        if clean in NEGATION_WORDS:
            negate = True
            continue
        if clean in POSITIVE_WORDS:
            if negate:
                neg_score += 1
            else:
                pos_score += 1
            negate = False
        elif clean in NEGATIVE_WORDS:
            if negate:
                pos_score += 1
            else:
                neg_score += 1
            negate = False
        else:
            negate = False

    total = pos_score + neg_score
    if total == 0:
        return 'neutral', 0.0

    score = (pos_score - neg_score) / total
    if score > 0.1:
        sentiment = 'positive'
    elif score < -0.1:
        sentiment = 'negative'
    else:
        sentiment = 'neutral'

    return sentiment, round(score, 3)


# ─── Serializers ──────────────────────────────────────────────────────────────

class ReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    customer_image = serializers.ImageField(source='customer.profile_image', read_only=True)
    provider_name = serializers.CharField(source='provider.user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'booking', 'customer', 'customer_name', 'customer_image',
            'provider', 'provider_name', 'rating', 'comment', 'sentiment',
            'sentiment_score', 'is_visible', 'created_at'
        ]
        read_only_fields = ['id', 'customer', 'provider', 'sentiment', 'sentiment_score', 'created_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['booking', 'rating', 'comment']

    def validate_booking(self, booking):
        user = self.context['request'].user
        if booking.customer != user:
            raise serializers.ValidationError("You can only review your own bookings.")
        if booking.status != 'completed':
            raise serializers.ValidationError("Can only review completed bookings.")
        if hasattr(booking, 'review'):
            raise serializers.ValidationError("You have already reviewed this booking.")
        return booking

    def create(self, validated_data):
        booking = validated_data['booking']
        sentiment, score = analyze_sentiment(validated_data.get('comment', ''))
        review = Review.objects.create(
            customer=self.context['request'].user,
            provider=booking.provider,
            sentiment=sentiment,
            sentiment_score=score,
            **validated_data
        )
        # Update provider average rating
        provider = booking.provider
        agg = Review.objects.filter(provider=provider, is_visible=True).aggregate(
            avg=Avg('rating'), count=Count('id')
        )
        provider.average_rating = round(agg['avg'] or 0, 2)
        provider.total_reviews = agg['count']
        provider.save()
        return review


# ─── Views ────────────────────────────────────────────────────────────────────

class ReviewListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        provider_id = self.request.query_params.get('provider')
        if provider_id:
            return Review.objects.filter(provider_id=provider_id, is_visible=True)
        user = self.request.user
        if user.role == 'admin':
            return Review.objects.all()
        if user.role == 'provider':
            return Review.objects.filter(provider__user=user)
        return Review.objects.filter(customer=user)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def provider_reviews(request, provider_id):
    reviews = Review.objects.filter(provider_id=provider_id, is_visible=True)
    agg = reviews.aggregate(avg=Avg('rating'), count=Count('id'))
    sentiment_counts = {
        'positive': reviews.filter(sentiment='positive').count(),
        'neutral': reviews.filter(sentiment='neutral').count(),
        'negative': reviews.filter(sentiment='negative').count(),
    }
    return Response({
        'average_rating': round(agg['avg'] or 0, 2),
        'total_reviews': agg['count'],
        'sentiment_summary': sentiment_counts,
        'reviews': ReviewSerializer(reviews, many=True).data,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def review_analytics(request):
    """Admin: sentiment analytics across all reviews."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=403)
    reviews = Review.objects.all()
    total = reviews.count()
    sentiment_dist = {
        'positive': reviews.filter(sentiment='positive').count(),
        'neutral': reviews.filter(sentiment='neutral').count(),
        'negative': reviews.filter(sentiment='negative').count(),
    }
    top_providers = ServiceProvider.objects.order_by('-average_rating')[:5]
    from apps.accounts.serializers import ServiceProviderSerializer
    return Response({
        'total_reviews': total,
        'sentiment_distribution': sentiment_dist,
        'average_rating_platform': reviews.aggregate(avg=Avg('rating'))['avg'],
        'top_rated_providers': ServiceProviderSerializer(top_providers, many=True).data,
    })
