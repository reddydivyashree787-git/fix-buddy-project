from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from apps.accounts.management.commands.seed_data import Command as SeedCommand
from django.http import JsonResponse

def setup_database(request):
    try:
        seed = SeedCommand()
        seed.handle()
        return JsonResponse({"status": "success", "message": "Database seeded successfully!"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('setup-database/', setup_database),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/bookings/', include('apps.bookings.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/chatbot/', include('apps.chatbot.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
