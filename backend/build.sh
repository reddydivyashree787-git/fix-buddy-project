#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Create a default superuser for the live environment
python manage.py shell -c "
from apps.accounts.models import User
email = 'admin@fixbuddy.com'
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password='adminpassword123', first_name='Admin', last_name='User', role='admin')
    print('✅ Default superuser created!')
"
