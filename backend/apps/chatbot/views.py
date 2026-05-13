import uuid
import re
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import ChatSession, ChatMessage
from apps.accounts.models import ServiceProvider
from apps.services.models import ServiceCategory, ServiceSubCategory, ProviderService


# ─── Rule-based chatbot engine ────────────────────────────────────────────────

FAQ_RESPONSES = {
    # Greetings
    r'\b(hi|hello|hey|greetings)\b': (
        "Hello! 👋 Welcome to HomeServices! I'm your virtual assistant. "
        "How can I help you today? You can ask me about:\n"
        "• Booking a service\n• Finding a provider\n• Service prices\n• Emergency services\n• Account help"
    ),
    r'\b(bye|goodbye|see you|exit)\b': "Goodbye! 👋 Have a great day! Feel free to come back anytime.",
    r'\bthank(s| you)\b': "You're welcome! 😊 Is there anything else I can help you with?",

    # Booking
    r'\b(how.*(book|schedule)|book.*service|create.*booking)\b': (
        "To book a service:\n"
        "1. Browse **Categories** on the homepage\n"
        "2. Select a subcategory (e.g., Pipe Repair under Plumbing)\n"
        "3. View available **providers** with ratings & prices\n"
        "4. Click **Book Now** and pick your date & time\n"
        "5. Confirm your address and submit!\n\n"
        "💡 Tip: Filter by rating, price, or location for the best match."
    ),
    r'\b(cancel.*booking|booking.*cancel)\b': (
        "To cancel a booking:\n"
        "1. Go to **My Bookings** in your dashboard\n"
        "2. Select the booking you want to cancel\n"
        "3. Click **Cancel Booking**\n\n"
        "⚠️ Note: Cancellations are only allowed for **Pending** or **Accepted** bookings."
    ),
    r'\b(booking.*status|status.*booking|track.*booking)\b': (
        "Booking statuses explained:\n"
        "• **Pending** – Waiting for provider to accept\n"
        "• **Accepted** – Provider confirmed your booking\n"
        "• **In Progress** – Service is being performed\n"
        "• **Completed** – Service done successfully\n"
        "• **Cancelled** – Booking was cancelled\n\n"
        "Check your **Dashboard → My Bookings** to track in real-time."
    ),

    # Emergency
    r'\b(emergency|urgent|asap|immediately|right now)\b': (
        "🚨 **Emergency Service**\n"
        "For urgent needs, use our **Emergency Booking** feature:\n"
        "1. Click the red **Emergency** button on the homepage\n"
        "2. Select your service type\n"
        "3. Share your location\n"
        "4. We'll assign the **nearest available provider** within minutes!\n\n"
        "Emergency bookings are prioritized and providers respond within 30-60 minutes."
    ),

    # Providers
    r'\b(how.*(find|choose|select).*provider|best.*provider|provider.*rating)\b': (
        "Our **Smart Matching** system ranks providers based on:\n"
        "⭐ **Ratings** – Verified customer reviews\n"
        "💰 **Price** – Competitive pricing score\n"
        "📍 **Location** – Proximity to your address\n"
        "✅ **Experience** – Years of expertise\n"
        "📋 **History** – Completed bookings record\n\n"
        "You can also manually filter by minimum rating, max price, and city."
    ),
    r'\b(become.*provider|register.*provider|join.*provider)\b': (
        "To join as a Service Provider:\n"
        "1. Register with role = **Service Provider**\n"
        "2. Complete your profile (bio, experience, location)\n"
        "3. Set your **availability** schedule\n"
        "4. Add services you offer with your pricing\n"
        "5. Wait for admin **verification** ✅\n\n"
        "Once verified, you'll appear in customer searches!"
    ),

    # Pricing
    r'\b(price|cost|charge|fee|how much|pricing)\b': (
        "Pricing depends on the service type and provider:\n"
        "• Each provider sets their own **custom price**\n"
        "• Base prices are shown per subcategory\n"
        "• Filter by **Max Price** to find affordable providers\n"
        "• Final price may vary based on work complexity\n\n"
        "💡 Always confirm the price with your provider before booking."
    ),

    # Reviews
    r'\b(review|rating|feedback|rate)\b': (
        "You can leave a **review** after a completed booking:\n"
        "1. Go to **My Bookings**\n"
        "2. Find the completed booking\n"
        "3. Click **Leave Review** and give a 1–5 star rating\n"
        "4. Write your experience\n\n"
        "Reviews help other customers and improve our platform! 🌟"
    ),

    # Account
    r'\b(password|forgot|reset|login|account)\b': (
        "Account help:\n"
        "• **Login issues**: Use the Login page, check your email/password\n"
        "• **Update profile**: Go to **Profile** in your dashboard\n"
        "• **Change password**: Settings → Change Password\n\n"
        "Need more help? Contact support@homeservices.com"
    ),

    # Services
    r'\b(what.*service|services.*offer|available.*service|categories)\b': (
        "We offer a wide range of home services:\n"
        "🔧 **Plumbing** – Pipe repair, leak fixing, installation\n"
        "⚡ **Electrical** – Wiring, switches, appliance repair\n"
        "🧹 **Cleaning** – Home, office, deep cleaning\n"
        "🪚 **Carpentry** – Furniture, doors, windows\n"
        "❄️ **AC & Appliances** – Service, repair, installation\n"
        "🎨 **Painting** – Interior, exterior, waterproofing\n\n"
        "Browse all categories on our homepage!"
    ),
}

DEFAULT_RESPONSE = (
    "I'm not sure about that. Here are some things I can help with:\n"
    "• 📅 **Booking** – How to book a service\n"
    "• 🚨 **Emergency** – Urgent service requests\n"
    "• 👷 **Providers** – Finding the right professional\n"
    "• 💰 **Pricing** – Understanding costs\n"
    "• ⭐ **Reviews** – Leaving feedback\n"
    "• 🔑 **Account** – Login and profile help\n\n"
    "Type any of these topics or describe your issue!"
)


def get_bot_response(message: str, recent_messages=None, user_lat=None, user_lon=None) -> dict:
    msg_lower = message.lower()

    if msg_lower in ('reset', 'start over', 'clear', 'new chat'):
        return {
            'text': "Chat reset. Hi! 👋 I'm your Fix Buddy assistant. How can I help you today?",
            'suggestions': ['Book a service', 'Emergency help', 'Pricing info', 'Find a provider'],
            'intent': 'reset',
            'entities': {},
            'recommendations': [],
            'nearby_services': None,
            'sentiment': 'neutral'
        }

    sentiment = detect_sentiment(message)
    service_category = detect_service_from_message(message)
    general_service = detect_general_service_from_message(message)
    is_emergency = bool(re.search(r'\b(emergency|urgent|asap|immediately|right now|need now)\b', msg_lower))

    intent = 'general'
    if is_emergency:
        intent = 'emergency'
    elif re.search(r'\b(book|schedule|appointment|reserve|now)\b', msg_lower):
        intent = 'booking'
    elif re.search(r'\b(price|cost|charge|how much|estimate)\b', msg_lower):
        intent = 'pricing'
    elif re.search(r'\b(provider|expert|professional|recommend)\b', msg_lower) or service_category:
        intent = 'provider_search'
    elif general_service:
        intent = 'nearby_search'

    provider_recommendations = []
    if service_category:
        provider_recommendations = find_recommended_providers(service_category, limit=3)

    # Handle general nearby services (medical, vehicle, food, etc.)
    if general_service:
        nearby_data = get_nearby_services_response(general_service, user_lat, user_lon)
        if nearby_data:
            nearby_intents = {
                'medical': ['I can help you find medical services nearby', 'Would you like to call one of these directly?'],
                'vehicle': ['Need vehicle repair or assistance?', 'Would you like to contact a mechanic nearby?'],
                'food': ['Here are some food options near you', 'Would you like to order food or visit?'],
                'emergency': ['For life-threatening emergencies, call 100/101 immediately', 'Here are emergency contacts nearby'],
                'lodging': ['Found some places to stay nearby', 'Would you like to book a room?'],
                'shopping': ['Here are shopping options near you', 'Need directions to any of these?'],
            }
            return {
                'text': nearby_data['message'],
                'intent': 'nearby_search',
                'entities': {'service_type': general_service},
                'nearby_services': nearby_data,
                'suggestions': nearby_intents.get(general_service, ['Contact one of these', 'Need more options?']),
                'recommendations': [],
                'sentiment': sentiment
            }

    if is_emergency and service_category:
        return {
            'text': (f"⚠️ Emergency {service_category.capitalize()} detected. "
                     f"Here are the nearest top providers:") ,
            'intent': 'emergency',
            'entities': {'category': service_category},
            'recommendations': provider_recommendations or [],
            'suggestions': ['Emergency booking', 'Call provider', 'Show more providers'],
            'booking_hint': 'Please provide your address and preferred contact number.',
            'nearby_services': None,
            'sentiment': sentiment
        }

    if service_category and intent in ['provider_search', 'booking']:
        text = (f"Great! I found {service_category.capitalize()} services that match your need. "
                "I can suggest the top providers to book. ")
        if provider_recommendations:
            text += "Here are top picks based on ratings, price, and availability."

        return {
            'text': text,
            'intent': intent,
            'entities': {'category': service_category},
            'recommendations': provider_recommendations,
            'suggestions': ['Book now', 'Show more providers', 'Compare prices'],
            'booking_hint': build_followup_text(intent, service_category),
            'nearby_services': None,
            'sentiment': sentiment
        }

    for pattern, response in FAQ_RESPONSES.items():
        if re.search(pattern, msg_lower, re.IGNORECASE):
            follow_up = build_followup_text(intent, service_category)
            return {
                'text': f"{response}\n\n{follow_up}",
                'suggestions': _get_suggestions_for_intent(intent),
                'intent': intent,
                'entities': {'category': service_category} if service_category else {},
                'recommendations': provider_recommendations,
                'nearby_services': None,
                'sentiment': sentiment
            }

    # fallback
    return {
        'text': DEFAULT_RESPONSE,
        'suggestions': _get_suggestions_for_intent(intent),
        'intent': intent,
        'entities': {'category': service_category} if service_category else {},
        'recommendations': provider_recommendations,
        'nearby_services': None,
        'sentiment': sentiment
    }


def _get_suggestions_for_intent(intent):
    fallback = ['Book a service', 'Emergency help', 'Pricing info', 'Find a provider']
    map_suggestions = {
        'booking': ['Book a service', 'What are booking steps?', 'Track booking status'],
        'emergency': ['Emergency help', 'How do emergency bookings work?'],
        'pricing': ['Pricing info', 'Compare providers', 'Get estimate'],
        'provider_search': ['Find a provider', 'How to choose provider', 'Top rated providers'],
        'general': ['Book a service', 'Emergency help', 'Pricing info', 'Find a provider'],
    }
    return map_suggestions.get(intent, fallback)


SERVICE_MAP = {
    'plumbing': ['plumbing', 'leak', 'pipe', 'drain', 'sink', 'sick', 'toilet', 'sewer', 'water', 'faucet'],
    'electrical': ['electrical', 'electrician', 'wire', 'power', 'socket', 'light', 'switch', 'breaker', 'outlet'],
    'cleaning': ['clean', 'mop', 'vacuum', 'deep clean', 'housekeeping', 'sanitize'],
    'carpentry': ['carpentry', 'wood', 'door', 'window', 'furniture', 'shelf', 'cabinet'],
    'painting': ['paint', 'painting', 'wall', 'brush', 'roller', 'coat'],
    'ac': ['ac', 'air conditioner', 'cooling', 'a/c', 'hvac', 'refrigerator'],
    'gardening': ['garden', 'lawn', 'plants', 'landscaping', 'yard'],
}

TYPO_CORRECTIONS = {
    'sike': 'sink',
    'sinks': 'sink',
    'sick': 'sink',
    'plunbing': 'plumbing',
    'eletrical': 'electrical',
    'hott': 'hot',
}


def normalize_text(text):
    normalized = text.lower()
    for typo, correction in TYPO_CORRECTIONS.items():
        normalized = re.sub(rf'\b{re.escape(typo)}\b', correction, normalized)
    return normalized


def detect_service_from_message(message):
    text = normalize_text(message)
    for key, keywords in SERVICE_MAP.items():
        for token in keywords:
            if token in text:
                return key
    return None


def find_recommended_providers(category_key, limit=3):
    try:
        cat = ServiceCategory.objects.filter(name__icontains=category_key, is_active=True).first()
        if not cat:
            return []

        subs = ServiceSubCategory.objects.filter(category=cat, is_active=True)
        provider_services = ProviderService.objects.filter(
            subcategory__in=subs,
            is_active=True,
            provider__is_available=True,
            provider__user__is_active=True
        ).select_related('provider', 'subcategory', 'provider__user')

        provider_scores = []
        for ps in provider_services:
            p = ps.provider
            score = float(p.average_rating or 0) * 2 + float(p.total_reviews or 0) / 20 + float(p.total_bookings_completed or 0) / 50
            provider_scores.append((score, ps))

        provider_scores.sort(key=lambda x: x[0], reverse=True)

        results = []
        for _, ps in provider_scores[:limit]:
            results.append({
                'id': ps.provider.id,
                'name': ps.provider.user.full_name,
                'rating': ps.provider.average_rating,
                'city': ps.provider.user.city,
                'price': float(ps.custom_price),
                'service': ps.subcategory.name,
                'is_verified': ps.provider.is_verified,
            })
        return results
    except Exception:
        return []


def detect_sentiment(message):
    text = message.lower()
    frustrated_words = ['angry', 'upset', 'frustrated', 'annoyed', 'damn', 'terrible', 'worst']
    happy_words = ['great', 'awesome', 'good', 'happy', 'love', 'excellent']
    if any(word in text for word in frustrated_words):
        return 'frustrated'
    if any(word in text for word in happy_words):
        return 'happy'
    return 'neutral'


def build_followup_text(intent, service_category=None):
    prompts = {
        'booking': 'Would you like me to reserve the top provider for you now? Please share preferred date/time and location.',
        'provider_search': 'Should I show the top 3 providers in your area for this service?',
        'emergency': 'I can trigger an emergency booking flow. What is your address and preferred contact number?',
        'pricing': 'Do you want a price estimate for a specific service or provider?',
        'nearby_search': 'Would you like me to search for more options in your area?',
    }
    if service_category:
        return f"I found {service_category.capitalize()} providers. {prompts.get(intent, 'How can I assist next?')}"
    return prompts.get(intent, 'How can I assist you next?')


# ─── Nearby Services Feature ─────────────────────────────────────────────────

# External services categories with mock data (in production, integrate with Google Places API)
NEARBY_SERVICES = {
    'medical': {
        'keywords': ['hospital', 'clinic', 'doctor', 'medical', 'health', 'sick', 'ill', 'pain', 'fever', 'cold', 'medicine', 'pharmacy', 'emergency medical', 'ambulance', 'disease', 'treatment', 'checkup'],
        'icon': '🏥',
        'service_name': 'Medical Services',
        'default_places': [
            {'name': 'City General Hospital', 'address': '123 Main Road, Downtown', 'phone': '+91-98765-43210', 'rating': 4.5, 'distance': '2.3 km', 'type': 'Hospital'},
            {'name': 'Medicare Clinic', 'address': '45 Market Street, Near Bus Stand', 'phone': '+91-87654-32109', 'rating': 4.2, 'distance': '1.5 km', 'type': 'Clinic'},
            {'name': 'HealthPlus Pharmacy', 'address': '78 Gandhi Nagar', 'phone': '+91-76543-21098', 'rating': 4.0, 'distance': '0.8 km', 'type': 'Pharmacy'},
            {'name': 'Emergency Care Center', 'address': 'Opp. Railway Station', 'phone': '+91-65432-10987', 'rating': 4.7, 'distance': '3.1 km', 'type': '24/7 Emergency'},
        ]
    },
    'vehicle': {
        'keywords': ['bike', 'car', 'vehicle', 'mechanic', 'repair', 'engine', 'tire', 'tyre', 'breakdown', 'flat', 'accident', 'petrol', 'fuel', 'parking', 'garage', 'servicing', 'oil'],
        'icon': '🔧',
        'service_name': 'Vehicle Services',
        'default_places': [
            {'name': 'Quick Fix Mechanics', 'address': 'Industrial Area, Phase 2', 'phone': '+91-98765-11111', 'rating': 4.6, 'distance': '1.2 km', 'type': 'Mechanic'},
            {'name': 'Auto Care Center', 'address': 'NH-48, Near Toll Plaza', 'phone': '+91-87654-22222', 'rating': 4.3, 'distance': '2.8 km', 'type': 'Service Center'},
            {'name': 'Petrol Pump & Garage', 'address': 'Highway Junction', 'phone': '+91-76543-33333', 'rating': 4.1, 'distance': '0.5 km', 'type': 'Fuel + Service'},
            {'name': 'Two Wheeler Specialist', 'address': 'Laxmi Chowk', 'phone': '+91-65432-44444', 'rating': 4.4, 'distance': '1.9 km', 'type': 'Bike Mechanic'},
        ]
    },
    'food': {
        'keywords': ['food', 'hungry', 'restaurant', 'eat', 'meal', 'dinner', 'lunch', 'breakfast', 'delivery', 'takeaway', 'cafe', 'coffee', 'snacks', 'grocery', 'market'],
        'icon': '🍽️',
        'service_name': 'Food & Restaurants',
        'default_places': [
            {'name': 'Taste of India Restaurant', 'address': 'MG Road, Opposite Mall', 'phone': '+91-98765-55555', 'rating': 4.5, 'distance': '0.7 km', 'type': 'Restaurant'},
            {'name': 'Quick Bites Cafe', 'address': 'City Center, 2nd Floor', 'phone': '+91-87654-66666', 'rating': 4.2, 'distance': '1.3 km', 'type': 'Cafe'},
            {'name': 'Fresh Grocery Mart', 'address': 'Sector 15, Main Market', 'phone': '+91-76543-77777', 'rating': 4.0, 'distance': '1.1 km', 'type': 'Grocery'},
            {'name': 'Food Zone Delivery', 'address': 'Serving All Areas', 'phone': '+91-65432-88888', 'rating': 4.3, 'distance': '2.0 km', 'type': 'Delivery'},
        ]
    },
    'emergency': {
        'keywords': ['police', 'fire', 'accident', 'crime', 'emergency', 'help', 'danger', 'urgent', 'rescue', 'ambulance'],
        'icon': '🚨',
        'service_name': 'Emergency Services',
        'default_places': [
            {'name': 'City Police Station', 'address': 'Police Headquarters, Main Road', 'phone': '100', 'rating': 4.0, 'distance': '1.5 km', 'type': 'Police'},
            {'name': 'Fire Brigade Station', 'address': 'Civil Lines', 'phone': '101', 'rating': 4.5, 'distance': '2.2 km', 'type': 'Fire Service'},
            {'name': 'District Hospital Emergency', 'address': 'Medical Road', 'phone': '+91-98765-99999', 'rating': 4.6, 'distance': '3.0 km', 'type': 'Medical Emergency'},
            {'name': 'Women Helpline', 'address': 'State HQ', 'phone': '181', 'rating': 0, 'distance': 'N/A', 'type': 'Helpline'},
        ]
    },
    'lodging': {
        'keywords': ['hotel', 'stay', 'accommodation', 'room', 'guest house', 'hostel', 'rent', 'night', 'sleep', 'travel', 'tourist'],
        'icon': '🏨',
        'service_name': 'Hotels & Lodging',
        'default_places': [
            {'name': 'Grand Palace Hotel', 'address': 'Lake View Road', 'phone': '+91-98765-00001', 'rating': 4.7, 'distance': '2.5 km', 'type': '5-Star Hotel'},
            {'name': 'Budget Inn', 'address': 'Station Road', 'phone': '+91-87654-00002', 'rating': 3.8, 'distance': '0.9 km', 'type': 'Budget Hotel'},
            {'name': 'Friendly Guest House', 'address': 'Residential Area', 'phone': '+91-76543-00003', 'rating': 4.2, 'distance': '1.4 km', 'type': 'Guest House'},
            {'name': 'Tourist Hostel', 'address': 'Near Bus Stand', 'phone': '+91-65432-00004', 'rating': 4.0, 'distance': '0.6 km', 'type': 'Hostel'},
        ]
    },
    'shopping': {
        'keywords': ['shop', 'mall', 'store', 'buy', 'purchase', 'clothes', 'electronics', 'mobile', 'furniture', 'market'],
        'icon': '🛒',
        'service_name': 'Shopping',
        'default_places': [
            {'name': 'City Mall', 'address': 'Main Boulevard', 'phone': '+91-98765-10001', 'rating': 4.4, 'distance': '1.8 km', 'type': 'Shopping Mall'},
            {'name': 'Electronics Hub', 'address': 'Tech Park, Sector 8', 'phone': '+91-87654-10002', 'rating': 4.3, 'distance': '2.1 km', 'type': 'Electronics'},
            {'name': 'Clothing Warehouse', 'address': 'Textile Market', 'phone': '+91-76543-10003', 'rating': 4.1, 'distance': '3.2 km', 'type': 'Clothing'},
            {'name': 'Daily Needs Store', 'address': 'Your Neighborhood', 'phone': '+91-65432-10004', 'rating': 4.5, 'distance': '0.3 km', 'type': 'General Store'},
        ]
    },
}


def detect_general_service_from_message(message):
    """Detect if user is asking about general nearby services (not home services)."""
    text = normalize_text(message)
    for service_key, service_data in NEARBY_SERVICES.items():
        for keyword in service_data['keywords']:
            if keyword in text:
                return service_key
    return None


def get_nearby_services_response(service_type, user_lat=None, user_lon=None):
    """Get nearby services for the detected type."""
    if service_type not in NEARBY_SERVICES:
        return None
    
    service_data = NEARBY_SERVICES[service_type]
    places = service_data['default_places'][:5]  # Return top 5 options
    
    response = {
        'type': service_type,
        'icon': service_data['icon'],
        'service_name': service_data['service_name'],
        'places': places,
        'message': f"Here are nearby {service_data['service_name'].lower()} I found for you:"
    }
    
    return response


# ─── Views ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def chat(request):
    message = request.data.get('message', '').strip()
    session_key = request.data.get('session_key') or str(uuid.uuid4())

    if not message:
        return Response({'error': 'Message is required'}, status=400)

    session, _ = ChatSession.objects.get_or_create(
        session_key=session_key,
        defaults={'user': request.user if request.user.is_authenticated else None}
    )

    ChatMessage.objects.create(session=session, sender='user', message=message)
    
    # Get user location if provided
    user_lat = request.data.get('latitude')
    user_lon = request.data.get('longitude')
    try:
        user_lat = float(user_lat) if user_lat else None
        user_lon = float(user_lon) if user_lon else None
    except (ValueError, TypeError):
        user_lat = user_lon = None
    
    bot_response = get_bot_response(
        message, 
        recent_messages=session.messages.order_by('-created_at')[:5],
        user_lat=user_lat,
        user_lon=user_lon
    )
    ChatMessage.objects.create(session=session, sender='bot', message=bot_response['text'])

    return Response({
        'session_key': session_key,
        'reply': bot_response['text'],
        'suggestions': bot_response.get('suggestions', []),
        'intent': bot_response.get('intent', 'general'),
        'nearby_services': bot_response.get('nearby_services'),
        'recommendations': bot_response.get('recommendations', []),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def chatbot_sessions(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    sessions = ChatSession.objects.order_by('-updated_at').all()
    return Response([
        {
            'id': session.id,
            'session_key': session.session_key,
            'user_id': session.user.id if session.user else None,
            'user_name': session.user.full_name if session.user else 'Anonymous',
            'user_email': session.user.email if session.user else None,
            'message_count': session.messages.count(),
            'last_message': session.messages.last().message if session.messages.exists() else '',
            'created_at': session.created_at,
            'updated_at': session.updated_at,
        }
        for session in sessions
    ])


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def chat_history(request, session_key):
    try:
        session = ChatSession.objects.get(session_key=session_key)
        messages = session.messages.all()
        return Response([
            {'sender': m.sender, 'message': m.message, 'created_at': m.created_at}
            for m in messages
        ])
    except ChatSession.DoesNotExist:
        return Response([])
