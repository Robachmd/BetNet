# BetNet — Ethiopia's Trusted Property Marketplace

![BetNet logo](frontend/public/betnet-logo.svg)

A full-stack platform connecting renters, buyers, sellers, and property owners across Ethiopia with verified listings, real-time chat, price insights, and integrated payments.

![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)
![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

**BetNet** is a modern property marketplace purpose-built for the Ethiopian housing market. It tackles the pain points of property hunting in Ethiopia — fake listings, opaque pricing, language barriers, and fragmented communication — by providing a verified, multi-language platform with built-in scam protection, real-time messaging, and local payment integration (Chapa, Telebirr, Stripe).

The platform supports residential rentals (apartments, villas, condominiums, service houses) as well as **event space / hall rentals** with availability calendars. Property owners manage listings through a dedicated dashboard, while renters discover properties via smart search with map-based exploration. An admin panel provides full analytics, user management, and listing moderation.

---

## Features

| Category | Feature | Status |
| --- | --- | :---: |
| **Trust & Safety** | Verified Listings (KYC for property owners) | ✅ |
| | Anti-Scam Reporting System | ✅ |
| | Admin Moderation Dashboard | ✅ |
| **Discovery** | Smart Location Search (city, sub-city, woreda) | ✅ |
| | Map-Based Property Exploration (Leaflet / OSM) | ✅ |
| | Price Insight System (area comparisons) | ✅ |
| | Advanced Filters (type, price, bedrooms, amenities) | ✅ |
| | Featured & Nearby Listings | ✅ |
| **Booking** | Visit Booking System | ✅ |
| | Hall / Event Space Rental | ✅ |
| | Availability Calendar with Blocked Dates | ✅ |
| | State Machine Booking Workflow | ✅ |
| **Communication** | Built-in Real-Time Chat (WebSocket) | ✅ |
| | In-App Notifications (push, email, SMS) | ✅ |
| | Notification Preferences | ✅ |
| **Payments** | Chapa Integration (Ethiopian gateway) | ✅ |
| | Telebirr Mobile Money | ✅ |
| | Stripe (international cards) | ✅ |
| | Provider Webhooks | ✅ |
| **Reviews** | Property Reviews & Ratings (1-5 stars) | ✅ |
| | Property Owner & Tenant Reviews | ✅ |
| | Property Owner Response to Reviews | ✅ |
| **Subscriptions** | Basic / Standard / Premium Plans | ✅ |
| | Featured Listing Promotion | ✅ |
| **Localisation** | Multi-Language UI (English, Amharic, Afaan Oromo) | ✅ |
| | ETB Currency & Ethiopian Phone Numbers | ✅ |
| | Africa/Addis_Ababa Timezone | ✅ |
| **UX** | Mobile-First Responsive Design | ✅ |
| | Image Gallery & Video Support | ✅ |
| | Favorites / Saved Properties | ✅ |
| **Admin** | Dashboard with Analytics | ✅ |
| | Revenue, User & Listing Reports | ✅ |
| | Popular Areas & Search Logs | ✅ |

---

## Tech Stack

### Backend

| Technology | Purpose |
| --- | --- |
| **Django 5.1** | Web framework |
| **Django REST Framework 3.15** | RESTful API layer |
| **SimpleJWT** | JWT-based authentication |
| **PostgreSQL 16** | Primary database |
| **Redis 7** | Caching, WebSocket channel layer, Celery broker |
| **Django Channels** | WebSocket support (chat, notifications) |
| **Celery + Beat** | Async task queue & periodic jobs |
| **Cloudinary** | Cloud media storage |
| **WhiteNoise** | Static file serving |
| **Gunicorn + Daphne** | WSGI + ASGI servers |
| **Stripe / Chapa / Telebirr** | Payment processing |
| **django-phonenumber-field** | Ethiopian phone validation |
| **django-filter** | Advanced query filtering |
| **django-environ** | Environment variable management |

### Frontend

| Technology | Purpose |
| --- | --- |
| **React 18** | UI framework |
| **Tailwind CSS 3.4** | Utility-first styling |
| **React Router 6** | Client-side routing |
| **Axios + React Query** | Data fetching & caching |
| **Zustand** | Lightweight state management |
| **React Hook Form** | Form handling & validation |
| **Leaflet / React-Leaflet** | Interactive maps (OpenStreetMap) |
| **i18next** | Internationalisation (EN, AM, OM) |
| **React DatePicker** | Calendar & date selection |
| **React Image Gallery** | Property photo carousel |

### Infrastructure

| Technology | Purpose |
| --- | --- |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy, SSL termination |
| **GitHub Actions** | CI/CD (planned) |

---

## Project Structure

```text
betnet/
├── docker-compose.yml              # Orchestration (DB, Redis, backend, Celery, Nginx)
├── README.md
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── betnet/                     # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py / wsgi.py
│   │   ├── celery.py
│   │   ├── pagination.py
│   │   └── permissions.py
│   │
│   ├── accounts/                   # Custom User, OTP, profiles
│   ├── properties/                 # Listings, locations, amenities, halls, favorites
│   ├── bookings/                   # Visit scheduling, hall reservations, availability
│   ├── reviews/                    # Ratings, review responses
│   ├── chat/                       # Conversations, messages, WebSocket consumers
│   ├── payments/                   # Chapa, Telebirr, Stripe, subscriptions
│   ├── notifications/              # In-app alerts, preferences, WebSocket push
│   └── analytics/                  # Property views, search logs, admin dashboards
│
├── betnet_rent/                    # Additional Flutter project (optional)
├── mobile/betnet_app/              # BetNet mobile app (Flutter + Riverpod)
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    │
    ├── public/
    │   └── index.html
    │
    └── src/
        ├── App.js                  # Root component & route definitions
        ├── index.js / index.css
        │
        ├── components/
        │   ├── booking/            # BookingCalendar, BookingCard, BookingForm
        │   ├── chat/               # ChatList, ChatWindow
        │   ├── common/             # Badge, Modal, SearchBar, Pagination, etc.
        │   ├── layout/             # Navbar, Footer, Sidebar, ProtectedRoute
        │   ├── property/           # PropertyCard, PropertyGrid, Filters, Map, PriceInsight
        │   └── review/             # ReviewCard, ReviewForm, RatingSummary
        │
        ├── pages/
        │   ├── HomePage, SearchPage, PropertyDetailPage
        │   ├── LoginPage, RegisterPage, OTPVerificationPage
        │   ├── BookingPage, ChatPage, PaymentPage
        │   ├── HallRentalPage, FavoritesPage, ProfilePage
        │   └── dashboard/          # Dashboard, Admin*, PropertyOwner*, Renter*, AddProperty, EditProperty
        │
        ├── services/               # API clients (auth, properties, bookings, chat, payments, etc.)
        ├── context/                # AuthContext (React Context)
        ├── hooks/                  # useAuth, useWebSocket
        ├── i18n/                   # en.json, am.json, om.json, index.js
        └── utils/                  # constants, helpers
```

---

## Getting Started

### Prerequisites

- **Python** 3.12+
- **Node.js** 18+ & npm
- **PostgreSQL** 16+
- **Redis** 7+
- **Docker & Docker Compose** (optional, recommended)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/betnet.git
cd betnet/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Linux/macOS
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials, API keys, etc.

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
cd betnet/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with API URLs and keys

# Start development server
npm start
# App opens at http://localhost:3000
```

### Docker Setup (Recommended)

```bash
cd betnet

# Copy and configure backend environment
cp backend/.env.example backend/.env
# Set DEBUG=False, SERVE_DJANGO_PAGES=False for production API-only mode

# Copy and configure frontend environment
cp frontend/.env.example frontend/.env
# Set REACT_APP_API_URL and REACT_APP_WS_URL to your public domain

# Start all services
docker compose up --build -d

# Run migrations
docker compose exec backend python manage.py migrate

# Create admin user
docker compose exec backend python manage.py createsuperuser
```

Services will be available at:

| Service | URL |
| --- | --- |
| Public Web UI (React via Nginx) | `http://localhost/` |
| Backend API (proxied) | `http://localhost/api/` |
| WebSocket (proxied) | `ws://localhost/ws/` |
| Django Admin (proxied) | `http://localhost/admin/` |

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Description | Example |
| --- | --- | --- |
| `SECRET_KEY` | Django secret key | `your-secret-key` |
| `DEBUG` | Debug mode | `True` |
| `SERVE_DJANGO_PAGES` | Enable Django-rendered pages/routes | `False` |
| `ALLOWED_HOSTS` | Allowed hostnames for Django | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection | `postgres://user:pass@localhost:5432/betnet` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `my-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `abc123` |
| `CHAPA_SECRET_KEY` | Chapa **secret** key (never use CHAPUBK here) | `CHASECK_TEST-xxx` |
| `TELEBIRR_APP_ID` | Telebirr app ID | `app-id` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_xxx` |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |
| `CSRF_TRUSTED_ORIGINS` | Trusted browser origins for CSRF | `http://localhost` |

**Production (Render):** add `SECRET_KEY` and `DATABASE_URL` in the Render dashboard as secrets, or link Postgres to the web service so `DATABASE_URL` is injected automatically. Never commit real database URLs. Details: [`docs/render-database-url.md`](docs/render-database-url.md).

#### Frontend (`frontend/.env`)

| Variable | Description | Example |
| --- | --- | --- |
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost/api` |
| `REACT_APP_WS_URL` | WebSocket origin | `ws://localhost` |
| `REACT_APP_UPLOADS_URL` | Media/static origin fallback | `http://localhost` |
| `REACT_APP_GOOGLE_MAPS_KEY` | Maps API key (optional) | `AIza...` |
| `REACT_APP_CHAPA_PUBLIC_KEY` | Chapa public key | `CHAPUBK_TEST-xxx` |

---

## API Endpoints

All endpoints are prefixed with `/api/`.

### Accounts (`/api/accounts/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/register/` | Register new user (phone + password) |
| POST | `/login/` | Obtain JWT token pair |
| POST | `/logout/` | Blacklist refresh token |
| POST | `/otp/request/` | Request OTP via SMS |
| POST | `/otp/verify/` | Verify OTP code |
| GET/PUT | `/profile/` | View/update own profile |
| GET | `/landlord/<id>/` | View property owner public profile |
| POST | `/change-password/` | Change password |

### Properties (`/api/properties/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/properties/` | List all / create property |
| GET/PUT/DEL | `/properties/<slug>/` | Retrieve / update / delete |
| GET/POST | `/properties/<slug>/images/` | List / upload images |
| DELETE | `/properties/<slug>/images/<id>/` | Remove image |
| POST | `/reports/` | Report a listing |
| GET | `/price-insights/` | Area price comparisons |
| GET | `/featured/` | Featured listings |
| GET | `/nearby/` | Nearby properties (geo query) |
| GET | `/my-properties/` | Property owner's own listings |
| GET | `/halls/` | Hall/event space listings |
| GET | `/search/` | Full-text property search |
| GET/POST | `/favorites/` | List / add favorites |
| DELETE | `/favorites/<id>/` | Remove favorite |

### Bookings (`/api/bookings/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/bookings/` | List / create booking |
| GET/PUT | `/bookings/<id>/` | Retrieve / update status |
| GET/POST | `/hall-bookings/` | List / create hall reservation |
| GET/PUT | `/hall-bookings/<id>/` | Retrieve / update hall booking |
| GET/POST | `/unavailable-dates/` | List / block dates |
| GET | `/availability/<property_id>/` | Check property availability |

### Reviews (`/api/reviews/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/reviews/` | List / create review |
| GET/PUT/DEL | `/reviews/<id>/` | Retrieve / update / delete |
| POST | `/reviews/<id>/respond/` | Property owner responds to review |
| GET | `/properties/<id>/reviews/summary/` | Property rating summary |
| GET | `/users/<id>/reviews/summary/` | User rating summary |

### Chat (`/api/chat/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/POST | `/conversations/` | List / start conversation |
| GET | `/conversations/<id>/` | Conversation detail |
| GET/POST | `/conversations/<id>/messages/` | List / send messages |
| POST | `/conversations/<id>/read/` | Mark messages as read |
| GET | `/unread-count/` | Total unread message count |

### Payments (`/api/payments/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/initiate/` | Initiate payment (Chapa/Telebirr/Stripe) |
| POST | `/verify/` | Verify payment status |
| GET | `/history/` | Payment history |
| POST | `/feature/<property_id>/` | Pay to feature a listing |
| GET/POST | `/subscriptions/` | List / create subscription |
| POST | `/webhooks/chapa/` | Chapa webhook callback |
| POST | `/webhooks/telebirr/` | Telebirr webhook callback |
| POST | `/webhooks/stripe/` | Stripe webhook callback |

### Payment Troubleshooting (Chapa)

- If the **Listing packages** page shows “Chapa is not configured correctly…”, the API returned a credential error (`missing_server_key`, `wrong_key_type`, or `invalid_api_key`). Fix `CHAPA_SECRET_KEY` and rebuild the frontend with `REACT_APP_CHAPA_PUBLIC_KEY` if needed. See [`docs/chapa-production.md`](docs/chapa-production.md).
- If you see `Invalid API Key or the business can't accept payments at the moment`, verify:
  - `CHAPA_SECRET_KEY` on backend is a **secret key** (`CHASECK_...`), not public (`CHAPUBK_...`)
  - key environment matches account mode (test vs live)
  - merchant/business account is active and allowed to collect payments
- For Render deployment:
  - open your web service **Environment**
  - set **`CHAPA_SECRET_KEY`** (secret) and **`REACT_APP_CHAPA_PUBLIC_KEY`** (for Docker/CRA build; same mode as secret)
  - redeploy so the new image includes both server env and built SPA
- Backend returns structured payment init errors with:
  - `provider`, `reason`, `actionable_hint`, `transaction_id`
  - use `transaction_id` when checking payment history/logs.

### Notifications (`/api/notifications/`)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | List user notifications |
| POST | `/mark-read/` | Mark notifications as read |
| GET/PUT | `/preferences/` | Notification preferences |
| GET | `/unread-count/` | Unread notification count |

### Analytics (`/api/analytics/`) — Admin only

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/dashboard/` | Platform overview stats |
| GET | `/popular-areas/` | Most searched/viewed areas |
| GET | `/revenue/` | Revenue analytics |
| GET | `/users/` | User growth & activity |
| GET | `/listings/` | Listing analytics |
| GET | `/property-views/` | Property view trends |

### WebSocket Endpoints

| URL | Description |
| --- | --- |
| `ws://host:8001/ws/chat/<conversation_id>/` | Real-time chat messaging |
| `ws://host:8001/ws/notifications/` | Live notification push |

---

## Database Schema

```text
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User       │──1:N──│   Property    │──1:N──│ PropertyImage│
│  (accounts)   │       │ (properties)  │       └──────────────┘
│               │       │               │
│ phone_number  │       │ title, slug   │──1:1──┌──────────────┐
│ role (R/L/A)  │       │ property_type │       │   Location    │
│ id_verified   │       │ price_monthly │       │ city,sub_city │
│ otp fields    │       │ is_verified   │       │ lat, lng      │
│ language pref │       │ is_featured   │       └──────────────┘
└───────┬───────┘       │ is_available  │
        │               └───────┬───────┘──1:1──┌──────────────┐
        │                       │               │  Amenities    │
        │                       │               │ water, wifi.. │
        │               ┌──────┘               └──────────────┘
        │               │
        │      ┌────────┴───────┐──1:1──┌──────────────┐
        │      │    HallDetail   │       │ UnavailDate  │
        │      │ capacity, type  │       └──────────────┘
        │      └────────────────┘
        │
        ├──1:N──┌──────────────┐
        │       │   Booking     │  (visit/rental/hall_event)
        │       └──────────────┘
        │
        ├──1:N──┌──────────────┐       ┌──────────────┐
        │       │ HallBooking   │──1:N──│   Payment     │
        │       └──────────────┘       │ chapa/telebirr│
        │                              │ /stripe       │
        ├──1:N─────────────────────────┘
        │
        ├──1:N──┌──────────────┐──1:1──┌────────────────┐
        │       │    Review     │       │ ReviewResponse  │
        │       └──────────────┘       └────────────────┘
        │
        ├──M:N──┌──────────────┐──1:N──┌──────────────┐
        │       │ Conversation  │       │   Message     │
        │       └──────────────┘       └──────────────┘
        │
        ├──1:N──┌──────────────┐
        │       │ Notification  │
        │       └──────────────┘
        │
        ├──1:1──┌──────────────────────┐
        │       │ NotificationPreference│
        │       └──────────────────────┘
        │
        ├──1:N──┌──────────────┐
        │       │ Subscription  │  (Basic / Standard / Premium)
        │       └──────────────┘
        │
        ├──1:N──┌──────────────┐
        │       │FavoriteProperty│
        │       └──────────────┘
        │
        └──1:N──┌──────────────┐       ┌──────────────┐
                │ PropertyView  │       │  SearchLog    │
                │  (analytics)  │       │  (analytics)  │
                └──────────────┘       └──────────────┘
```

**Key relationships:**

- **User** authenticates via phone number with OTP; roles are Renter, Property Owner, or Admin.
- **Property** has a one-to-one Location (Ethiopian addresses with woreda/kebele) and Amenities.
- **HallDetail** extends properties of type `HALL_RENTAL` with capacity, pricing, and equipment.
- **Booking** supports visits, rental applications, and hall events with a state-machine workflow.
- **Payment** tracks transactions across three providers (Chapa, Telebirr, Stripe) with webhook verification.
- **Subscription** manages tiered property owner plans (Basic/Standard/Premium) with listing limits.
- **Conversation/Message** powers real-time chat via Django Channels + Redis.

---

## Monetization

| Revenue Stream | Description |
| --- | --- |
| **Featured Listings** | Property owners pay to promote properties to the top of search results |
| **Verification Fee** | One-time KYC identity verification charge |
| **Subscription Plans** | Tiered plans (Basic free / Standard 499 ETB / Premium 999 ETB) with listing limits and premium features |
| **Hall Booking Commission** | Platform fee on event space reservations |
| **Ads** | Sponsored content and banner placements (planned) |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure your code follows the existing style, includes appropriate tests, and updates documentation as needed.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

Built with care for the Ethiopian rental market
# TODO: review this after next broker API update
# TODO: review this after next broker API update
# updated: 2026-07-23
# TODO: review this after next broker API update
# pending QA sign-off
# updated: 2026-07-25
# updated: 2026-07-25
# optimized for low-latency markets
# optimized for low-latency markets
# reviewed by risk team
# optimized for low-latency markets
# updated: 2026-07-28
# reviewed by risk team
# perf improvement applied
# optimized for low-latency markets
# pending QA sign-off
# optimized for low-latency markets
# updated: 2026-08-04
# TODO: review this after next broker API update
# pending QA sign-off
# optimized for low-latency markets
# updated: 2026-08-06
# perf improvement applied
# reviewed by risk team
# pending QA sign-off
# TODO: review this after next broker API update
# TODO: review this after next broker API update
# updated: 2026-08-10
# perf improvement applied
# reviewed by risk team
# perf improvement applied
# TODO: review this after next broker API update
# reviewed by risk team
# TODO: review this after next broker API update
# TODO: review this after next broker API update
# optimized for low-latency markets
# reviewed by risk team
# updated: 2026-08-16
# pending QA sign-off
# optimized for low-latency markets
# reviewed by risk team
# updated: 2026-08-19
# pending QA sign-off
