"""
Management command to populate the database with demo data.
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import User, ServiceProvider, ProviderAvailability
from apps.services.models import ServiceCategory, ServiceSubCategory, ProviderService


CATEGORIES = [
    {
        'name': 'Plumbing', 'icon': '🔧', 'description': 'All plumbing needs for your home',
        'subcategories': [
            {'name': 'Pipe Repair', 'base_price': 299, 'duration': 1.5},
            {'name': 'Tap/Faucet Fixing', 'base_price': 199, 'duration': 1.0},
            {'name': 'Water Heater Installation', 'base_price': 699, 'duration': 3.0},
            {'name': 'Drain Cleaning', 'base_price': 349, 'duration': 1.5},
            {'name': 'Toilet Repair', 'base_price': 299, 'duration': 1.5},
        ]
    },
    {
        'name': 'Electrical', 'icon': '⚡', 'description': 'Safe and reliable electrical services',
        'subcategories': [
            {'name': 'Switch/Socket Repair', 'base_price': 149, 'duration': 0.5},
            {'name': 'Wiring & Rewiring', 'base_price': 999, 'duration': 4.0},
            {'name': 'Ceiling Fan Installation', 'base_price': 299, 'duration': 1.0},
            {'name': 'MCB/Fuse Box Repair', 'base_price': 399, 'duration': 1.5},
            {'name': 'Inverter/UPS Installation', 'base_price': 599, 'duration': 2.0},
        ]
    },
    {
        'name': 'Cleaning', 'icon': '🧹', 'description': 'Professional cleaning for every space',
        'subcategories': [
            {'name': 'Home Deep Cleaning', 'base_price': 1499, 'duration': 6.0},
            {'name': 'Kitchen Cleaning', 'base_price': 599, 'duration': 3.0},
            {'name': 'Bathroom Cleaning', 'base_price': 299, 'duration': 1.5},
            {'name': 'Sofa & Carpet Cleaning', 'base_price': 799, 'duration': 3.0},
            {'name': 'Office Cleaning', 'base_price': 1999, 'duration': 8.0},
        ]
    },
    {
        'name': 'Carpentry', 'icon': '🪚', 'description': 'Expert woodwork and furniture repair',
        'subcategories': [
            {'name': 'Door Repair', 'base_price': 399, 'duration': 2.0},
            {'name': 'Furniture Assembly', 'base_price': 499, 'duration': 2.5},
            {'name': 'Cabinet Making', 'base_price': 2999, 'duration': 8.0},
            {'name': 'Window Frame Repair', 'base_price': 349, 'duration': 1.5},
        ]
    },
    {
        'name': 'AC & Appliances', 'icon': '💻', 'description': 'AC service and home appliance repair',
        'subcategories': [
            {'name': 'AC Service & Gas Refill', 'base_price': 699, 'duration': 2.0},
            {'name': 'AC Installation', 'base_price': 999, 'duration': 3.0},
            {'name': 'Washing Machine Repair', 'base_price': 499, 'duration': 2.0},
            {'name': 'Refrigerator Repair', 'base_price': 599, 'duration': 2.0},
            {'name': 'Microwave Repair', 'base_price': 399, 'duration': 1.5},
            {'name': 'Computer Repair', 'base_price': 499, 'duration': 2.0},
            {'name': 'Laptop Service', 'base_price': 599, 'duration': 2.5},
        ]
    },
    {
        'name': 'Painting', 'icon': '🎨', 'description': 'Professional interior and exterior painting',
        'subcategories': [
            {'name': 'Interior Wall Painting', 'base_price': 2999, 'duration': 8.0},
            {'name': 'Exterior Painting', 'base_price': 4999, 'duration': 16.0},
            {'name': 'Waterproofing', 'base_price': 1999, 'duration': 6.0},
            {'name': 'Texture Painting', 'base_price': 3999, 'duration': 10.0},
        ]
    },
]

PROVIDERS = [
    {'first_name':'Rajesh', 'last_name':'Kumar',   'city':'Mumbai',    'exp':8,  'rating':4.7, 'jobs':120, 'rate':350},
    {'first_name':'Suresh', 'last_name':'Sharma',  'city':'Mumbai',    'exp':5,  'rating':4.4, 'jobs':78,  'rate':299},
    {'first_name':'Amit',   'last_name':'Verma',   'city':'Delhi',     'exp':10, 'rating':4.9, 'jobs':200, 'rate':400},
    {'first_name':'Priya',  'last_name':'Singh',   'city':'Delhi',     'exp':3,  'rating':4.2, 'jobs':45,  'rate':249},
    {'first_name':'Mohan',  'last_name':'Patel',   'city':'Bangalore', 'exp':7,  'rating':4.6, 'jobs':160, 'rate':320},
    {'first_name':'Arjun',  'last_name':'Nair',    'city':'Bangalore', 'exp':4,  'rating':4.3, 'jobs':55,  'rate':279},
    {'first_name':'Vikram', 'last_name':'Rao',     'city':'Chennai',   'exp':12, 'rating':4.8, 'jobs':250, 'rate':450},
    {'first_name':'Deepak', 'last_name':'Gupta',   'city':'Hyderabad', 'exp':6,  'rating':4.5, 'jobs':95,  'rate':310},
]


class Command(BaseCommand):
    help = 'Seed database with demo data'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('🌱 Seeding database...')

        # Admin
        if not User.objects.filter(email='admin@demo.com').exists():
            User.objects.create_superuser(
                email='admin@demo.com', password='admin123',
                first_name='Admin', last_name='User'
            )
            self.stdout.write('  ✅ Admin user created')

        # Demo customer
        if not User.objects.filter(email='customer@demo.com').exists():
            User.objects.create_user(
                email='customer@demo.com', password='demo1234',
                first_name='Demo', last_name='Customer',
                role='customer', city='Mumbai'
            )
            self.stdout.write('  ✅ Demo customer created')

        # Categories & subcategories
        for cat_data in CATEGORIES:
            subcats = cat_data.get('subcategories', [])
            cat, _ = ServiceCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'icon': cat_data['icon'],
                    'description': cat_data['description']
                }
            )
            for sub in subcats:
                ServiceSubCategory.objects.get_or_create(
                    category=cat, name=sub['name'],
                    defaults={
                        'base_price': sub['base_price'],
                        'estimated_duration_hours': sub['duration'],
                        'description': f"Professional {sub['name'].lower()} service"
                    }
                )
        self.stdout.write('  ✅ Categories seeded')

        # Providers
        subcats_all = list(ServiceSubCategory.objects.all())
        import random
        for i, pdata in enumerate(PROVIDERS):
            email = f"provider{i+1}@demo.com"
            if not User.objects.filter(email=email).exists():
                user = User.objects.create_user(
                    email=email, password='demo1234',
                    first_name=pdata['first_name'], last_name=pdata['last_name'],
                    role='provider', city=pdata['city'],
                    latitude=19.0 + random.uniform(-1, 1),
                    longitude=72.8 + random.uniform(-1, 1),
                )
                sp = ServiceProvider.objects.create(
                    user=user,
                    experience_years=pdata['exp'],
                    average_rating=pdata['rating'],
                    total_reviews=random.randint(10, 80),
                    total_bookings_completed=pdata['jobs'],
                    hourly_rate=pdata['rate'],
                    is_verified=True,
                    is_available=True,
                    service_radius_km=15,
                    bio=f"Professional {pdata['first_name']} with {pdata['exp']} years of experience. "
                        f"Based in {pdata['city']}. Reliable, punctual, and skilled."
                )
                # Assign random subcategories
                for sub in random.sample(subcats_all, min(5, len(subcats_all))):
                    ProviderService.objects.get_or_create(
                        provider=sp, subcategory=sub,
                        defaults={'custom_price': float(sub.base_price) * random.uniform(0.8, 1.3)}
                    )
                # Availability Mon-Sat
                for day in range(6):
                    ProviderAvailability.objects.create(
                        provider=sp, day_of_week=day,
                        start_time='09:00', end_time='18:00', is_available=True
                    )
        self.stdout.write('  ✅ Providers seeded')
        self.stdout.write(self.style.SUCCESS('\n🎉 Seeding complete!\n'))
        self.stdout.write('Demo accounts:')
        self.stdout.write('  Admin:    admin@demo.com / admin123')
        self.stdout.write('  Customer: customer@demo.com / demo1234')
        self.stdout.write('  Provider: provider1@demo.com / demo1234')
