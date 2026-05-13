from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Q
from .models import ServiceCategory, ServiceSubCategory, ProviderService
from .serializers import ServiceCategorySerializer, ServiceSubCategorySerializer, ProviderServiceSerializer
from apps.accounts.models import ServiceProvider
from apps.accounts.serializers import ServiceProviderSerializer
import math


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def calculate_provider_score(provider, subcategory_id, user_lat=None, user_lon=None):
    """Smart scoring algorithm for provider ranking."""
    score = 0

    # Rating score (0-40 points)
    score += (provider.average_rating / 5.0) * 40

    # Price competitiveness (0-20 points)
    try:
        ps = ProviderService.objects.get(provider=provider, subcategory_id=subcategory_id)
        sub = ServiceSubCategory.objects.get(id=subcategory_id)
        if sub.base_price > 0:
            price_ratio = float(sub.base_price) / float(ps.custom_price)
            score += min(price_ratio * 20, 20)
    except:
        pass

    # Experience score (0-20 points)
    score += min(provider.experience_years * 2, 20)

    # Booking success (0-10 points)
    score += min(provider.total_bookings_completed * 0.5, 10)

    # Proximity score (0-10 points)
    if user_lat and user_lon and provider.user.latitude and provider.user.longitude:
        dist = haversine_distance(user_lat, user_lon, provider.user.latitude, provider.user.longitude)
        if dist <= provider.service_radius_km:
            score += max(10 - dist, 0)

    return round(score, 2)


class CategoryListView(generics.ListCreateAPIView):
    queryset = ServiceCategory.objects.filter(is_active=True)
    serializer_class = ServiceCategorySerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class SubCategoryListView(generics.ListCreateAPIView):
    serializer_class = ServiceSubCategorySerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = ServiceSubCategory.objects.filter(is_active=True)
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class SubCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ServiceSubCategory.objects.all()
    serializer_class = ServiceSubCategorySerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]


class ProviderServiceListView(generics.ListCreateAPIView):
    serializer_class = ProviderServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'provider_profile'):
            return ProviderService.objects.filter(provider=self.request.user.provider_profile)
        return ProviderService.objects.none()

    def perform_create(self, serializer):
        serializer.save(provider=self.request.user.provider_profile)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def providers_by_subcategory(request, subcategory_id):
    """Get providers for a subcategory with smart ranking."""
    user_lat = request.query_params.get('lat')
    user_lon = request.query_params.get('lon')
    min_rating = request.query_params.get('min_rating')
    max_price = request.query_params.get('max_price')
    city = request.query_params.get('city')

    try:
        user_lat = float(user_lat) if user_lat else None
        user_lon = float(user_lon) if user_lon else None
    except:
        user_lat = user_lon = None

    provider_services = ProviderService.objects.filter(
        subcategory_id=subcategory_id,
        is_active=True,
        provider__is_available=True,
        provider__user__is_active=True,
    ).select_related('provider__user', 'subcategory')

    if min_rating:
        provider_services = provider_services.filter(provider__average_rating__gte=float(min_rating))
    if max_price:
        provider_services = provider_services.filter(custom_price__lte=float(max_price))
    if city:
        provider_services = provider_services.filter(provider__user__city__icontains=city)

    results = []
    for ps in provider_services:
        provider_data = ServiceProviderSerializer(ps.provider).data
        provider_data['service_price'] = str(ps.custom_price)
        provider_data['score'] = calculate_provider_score(
            ps.provider, subcategory_id, user_lat, user_lon
        )
        results.append(provider_data)

    results.sort(key=lambda x: x['score'], reverse=True)
    return Response(results)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_services(request):
    """Search categories, subcategories and providers."""
    query = request.query_params.get('q', '')
    if not query:
        return Response({'categories': [], 'subcategories': [], 'providers': []})

    categories = ServiceCategory.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query), is_active=True
    )[:5]

    subcategories = ServiceSubCategory.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query), is_active=True
    )[:10]

    providers = ServiceProvider.objects.filter(
        Q(user__first_name__icontains=query) |
        Q(user__last_name__icontains=query) |
        Q(user__city__icontains=query) |
        Q(services__subcategory__name__icontains=query) |
        Q(services__subcategory__category__name__icontains=query) |
        Q(services__subcategory__description__icontains=query),
        user__is_active=True
    ).distinct()[:30]

    providers_data = ServiceProviderSerializer(providers, many=True).data

    def provider_score(p):
        rating = float(p.get('average_rating', 0) or 0)
        reviews = int(p.get('total_reviews', 0) or 0)
        jobs = int(p.get('total_bookings_completed', 0) or 0)
        review_weight = min(reviews, 150) / 150
        job_weight = min(jobs, 300) / 300
        return round((rating / 5) * 0.6 + review_weight * 0.25 + job_weight * 0.15, 3)

    providers_sorted = sorted(
        [{**p, 'recommendation_score': provider_score(p)} for p in providers_data],
        key=lambda x: x['recommendation_score'],
        reverse=True
    )

    return Response({
        'categories': ServiceCategorySerializer(categories, many=True).data,
        'subcategories': ServiceSubCategorySerializer(subcategories, many=True).data,
        'providers': providers_sorted,
    })
