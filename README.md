# 🔧 Fix Buddy — Complete Home Services Booking System

## Project Structure\n\n```\nfixbuddy/
├── backend/                   # Django REST API
│   ├── manage.py
│   ├── requirements.txt
│   ├── homeservices_project/
│   │   ├── settings.py
│   │   └── urls.py
│   └── apps/
│       ├── accounts/          # Users, Providers, Auth
│       ├── services/          # Categories, Subcategories
│       ├── bookings/          # Bookings, Emergency
│       ├── reviews/           # Reviews + Sentiment
│       └── chatbot/           # AI Chatbot
└── frontend/                  # React JS
    ├── package.json
    └── src/
        ├── api/index.js       # All API calls (Axios)
        ├── context/           # Auth Context
        ├── components/        # Navbar, Chatbot, Cards
        └── pages/             # All page components
```

---

## 🚀 Backend Setup (Django)

### Step 1: Create & activate virtual environment
```bash
cd homeservices/backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows
```

### Step 2: Install dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run migrations
```bash
python manage.py makemigrations accounts
python manage.py makemigrations services
python manage.py makemigrations bookings
python manage.py makemigrations reviews
python manage.py makemigrations chatbot
python manage.py migrate
```

### Step 4: Seed demo data
```bash
python manage.py seed_data
```

### Step 5: Start the server
```bash
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

---

## 🎨 Frontend Setup (React)

### Step 1: Install dependencies
```bash
cd homeservices/frontend
npm install
```

### Step 2: Start development server
```bash
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 🔑 Demo Credentials

| Role     | Email                   | Password  |
|----------|-------------------------|-----------|
| Admin    | admin@demo.com          | admin123  |
| Customer | customer@demo.com       | demo1234  |
| Provider | provider1@demo.com      | demo1234  |

---

## 📡 API Endpoints Reference

### Authentication
| Method | Endpoint                    | Description          | Auth |
|--------|-----------------------------|----------------------|------|
| POST   | /api/auth/register/         | Register new user    | No   |
| POST   | /api/auth/login/            | Login & get JWT      | No   |
| POST   | /api/auth/token/refresh/    | Refresh access token | No   |
| GET    | /api/auth/profile/          | Get own profile      | Yes  |
| PATCH  | /api/auth/profile/          | Update profile       | Yes  |
| GET    | /api/auth/provider/profile/ | Provider profile     | Yes  |
| PATCH  | /api/auth/provider/profile/ | Update provider info | Yes  |
| POST   | /api/auth/provider/availability/ | Set schedule    | Yes  |
| GET    | /api/auth/providers/        | List all providers   | No   |
| GET    | /api/auth/providers/{id}/   | Provider detail      | No   |

### Services
| Method | Endpoint                              | Description           | Auth  |
|--------|---------------------------------------|-----------------------|-------|
| GET    | /api/services/categories/             | All categories        | No    |
| POST   | /api/services/categories/             | Create category       | Admin |
| GET    | /api/services/categories/{id}/        | Category detail       | No    |
| GET    | /api/services/subcategories/          | All subcategories     | No    |
| GET    | /api/services/subcategories/?category=N | Filter by category  | No    |
| GET    | /api/services/subcategories/{id}/providers/ | Smart ranked list | No  |
| GET    | /api/services/my-services/            | My offered services   | Yes   |
| POST   | /api/services/my-services/            | Add a service         | Yes   |
| GET    | /api/services/search/?q=plumbing      | Search everything     | No    |

### Bookings
| Method | Endpoint                    | Description            | Auth     |
|--------|-----------------------------|------------------------|----------|
| GET    | /api/bookings/              | My bookings            | Yes      |
| POST   | /api/bookings/              | Create booking         | Customer |
| GET    | /api/bookings/{id}/         | Booking detail         | Yes      |
| POST   | /api/bookings/{id}/status/  | Update status          | Yes      |
| POST   | /api/bookings/emergency/    | Emergency booking      | Customer |
| GET    | /api/bookings/emergency/list/ | My emergencies       | Yes      |
| GET    | /api/bookings/analytics/    | Admin analytics        | Admin    |

### Reviews
| Method | Endpoint                         | Description         | Auth     |
|--------|----------------------------------|---------------------|----------|
| GET    | /api/reviews/                    | My reviews          | Yes      |
| POST   | /api/reviews/                    | Submit review       | Customer |
| GET    | /api/reviews/provider/{id}/      | Provider reviews    | No       |
| GET    | /api/reviews/analytics/          | Sentiment analytics | Admin    |

### Chatbot
| Method | Endpoint                           | Description      | Auth |
|--------|------------------------------------|------------------|------|
| POST   | /api/chatbot/                      | Send message     | No   |
| GET    | /api/chatbot/history/{session_key}/ | Chat history    | No   |

---

## 🗄️ Database Schema

```
User
  id, email, first_name, last_name, phone, role (customer/provider/admin)
  address, city, state, pincode, latitude, longitude
  profile_image, is_active, is_staff

ServiceProvider (1:1 → User)
  bio, experience_years, is_verified, is_available
  average_rating, total_reviews, total_bookings_completed
  service_radius_km, hourly_rate

ProviderAvailability (N:1 → ServiceProvider)
  day_of_week, start_time, end_time, is_available

ServiceCategory
  name, description, icon, image, is_active

ServiceSubCategory (N:1 → ServiceCategory)
  name, description, base_price, estimated_duration_hours

ProviderService (N:1 → ServiceProvider, ServiceSubCategory)
  custom_price, description, is_active

Booking (N:1 → User/customer, ServiceProvider, ServiceSubCategory)
  status (pending/accepted/in_progress/completed/cancelled/rejected)
  booking_date, booking_time, address, city, pincode, lat/lon
  quoted_price, final_price, is_emergency

EmergencyBooking (N:1 → User, ServiceSubCategory, ServiceProvider)
  status, priority_level, response_time_minutes, lat/lon

BookingStatusHistory (N:1 → Booking)
  status, changed_by, note

Review (1:1 → Booking; N:1 → User/customer, ServiceProvider)
  rating (1-5), comment
  sentiment (positive/neutral/negative), sentiment_score
  is_visible

ChatSession
  user, session_key

ChatMessage (N:1 → ChatSession)
  sender (user/bot), message
```

---

## 🧠 Key Algorithm Explanations (for Viva)

### 1. Smart Provider Ranking Score (services/views.py)
```
score = (rating/5 × 40)          # 0-40 pts: quality
      + (base_price/custom_price × 20)  # 0-20 pts: value
      + min(experience_years × 2, 20)   # 0-20 pts: expertise
      + min(completed_jobs × 0.5, 10)   # 0-10 pts: reliability
      + proximity_score                 # 0-10 pts: distance
```

### 2. Sentiment Analysis (reviews/views.py)
- Rule-based NLP using positive/negative word dictionaries
- Handles negation: "not good" flips positive → negative
- Score = (pos_count − neg_count) / total_words
- > 0.1 → Positive, < -0.1 → Negative, else Neutral

### 3. Emergency Auto-Assignment (bookings/views.py)
- Filters active providers offering the requested service
- Sorts by haversine distance from customer's GPS coordinates
- Assigns the top result and sets status = 'assigned'

### 4. JWT Authentication Flow
- Login → returns access_token (24h) + refresh_token (7d)
- React stores tokens in localStorage
- Axios interceptor adds Bearer token to every request
- On 401, auto-tries to refresh; on failure, redirects to login

### 5. Booking State Machine
```
pending → accepted → in_progress → completed
        → rejected
        → cancelled (from pending/accepted)
```

---

## ⚙️ Django Admin Panel
Visit: **http://localhost:8000/admin/** (login with admin@demo.com / admin123)

Manage: Users, Providers, Categories, Subcategories, Bookings, Reviews, Chat Sessions

---

## 🔒 Security Notes (for Production)
1. Change `SECRET_KEY` in settings.py
2. Set `DEBUG = False`
3. Set `ALLOWED_HOSTS` to your domain
4. Use PostgreSQL instead of SQLite
5. Add HTTPS/SSL certificate
6. Enable `CORS_ALLOWED_ORIGINS` (not `CORS_ALLOW_ALL_ORIGINS`)
7. Use environment variables for secrets (python-decouple)
