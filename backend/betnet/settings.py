"""
Django settings for betnet project.

Ethiopian Rental Marketplace Platform.
"""

import os
import socket
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import environ
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent

# Create React App production output (npm run build in ../frontend)
REACT_BUILD_DIR = BASE_DIR.parent / 'frontend' / 'build'

env = environ.Env(
    DEBUG=(bool, True),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1']),
    CORS_ALLOWED_ORIGINS=(list, ['http://localhost:3000']),
    CSRF_TRUSTED_ORIGINS=(list, ['http://localhost:3000']),
    REDIS_URL=(str, 'redis://localhost:6379/0'),
    LANGUAGE_CODE=(str, 'en'),
    SERVE_DJANGO_PAGES=(bool, True),
)

env_file = BASE_DIR / '.env'
if env_file.exists():
    environ.Env.read_env(str(env_file))

SECRET_KEY = env('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')
SERVE_DJANGO_PAGES = env('SERVE_DJANGO_PAGES', default=DEBUG)

# Optional AI-assisted rent/sale estimates (never expose keys to frontend)
PRICE_AI_PROVIDER = env('PRICE_AI_PROVIDER', default='').strip().lower()  # openai | gemini | ''
OPENAI_API_KEY = env('OPENAI_API_KEY', default='').strip()
GEMINI_API_KEY = env('GEMINI_API_KEY', default='').strip()
PRICE_AI_MODEL = env('PRICE_AI_MODEL', default='').strip()
PRICE_ESTIMATE_CACHE_TTL = env.int('PRICE_ESTIMATE_CACHE_TTL', default=300)

# Render sets RENDER_EXTERNAL_HOSTNAME. Auto-allow it to avoid DisallowedHost
# when ALLOWED_HOSTS isn't configured correctly.
_render_host = (os.environ.get("RENDER_EXTERNAL_HOSTNAME") or "").strip()
if _render_host:
    ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, _render_host]))

if DEBUG:
    # Make local mobile-device testing easier (e.g. http://192.168.x.x:8000).
    debug_hosts = {'localhost', '127.0.0.1', '0.0.0.0'}
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None):
            ip = info[4][0]
            if ':' in ip:  # skip IPv6 for ALLOWED_HOSTS simplicity
                continue
            if ip.startswith(('10.', '172.', '192.168.')):
                debug_hosts.add(ip)
    except Exception:
        pass
    ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, *sorted(debug_hosts)]))

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'drf_spectacular',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'cloudinary_storage',
    'cloudinary',
    'channels',
    'phonenumber_field',
    'django_cleanup.apps.CleanupConfig',
]

LOCAL_APPS = [
    'accounts',
    'properties',
    'bookings',
    'reviews',
    'chat',
    'payments.apps.PaymentsConfig',
    'notifications',
    'analytics',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'betnet.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.template.context_processors.i18n',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'betnet.wsgi.application'
ASGI_APPLICATION = 'betnet.asgi.application'

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
# Uses PostgreSQL if DATABASE_URL is set, otherwise falls back to SQLite
# for easy local development without installing PostgreSQL.

DATABASE_URL = env('DATABASE_URL', default='')

if DATABASE_URL:
    DATABASES = {'default': env.db('DATABASE_URL')}
    DATABASES['default']['CONN_MAX_AGE'] = 600
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = 'accounts.User'
# Match server-rendered auth URL when templates are enabled; SPA uses /login (no trailing slash)
LOGIN_URL = '/login/' if SERVE_DJANGO_PAGES else '/login'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

# One-time listing fee (ETB) before a property is visible to the public
LISTING_FEE_ETB = Decimal(str(env('LISTING_FEE_ETB', default='150.00')))

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization / Multi-language (English, Amharic, Oromo)
# ---------------------------------------------------------------------------

LANGUAGE_CODE = env('LANGUAGE_CODE')
TIME_ZONE = 'Africa/Addis_Ababa'
USE_I18N = True
USE_L10N = True
USE_TZ = True

LANGUAGES = [
    ('en', 'English'),
    ('am', 'Amharic'),
    ('om', 'Oromo'),
]

LOCALE_PATHS = [BASE_DIR / 'locale']

# Persist language across browser sessions (reload and return visits)
LANGUAGE_COOKIE_AGE = 60 * 60 * 24 * 365

# ---------------------------------------------------------------------------
# Static & Media files
# ---------------------------------------------------------------------------

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = []
_project_static = BASE_DIR / 'static'
if _project_static.is_dir():
    STATICFILES_DIRS.append(_project_static)
_react_static = REACT_BUILD_DIR / 'static'
if _react_static.is_dir():
    STATICFILES_DIRS.append(_react_static)
if DEBUG:
    STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
else:
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Silence "No directory at .../staticfiles" in tests and first local runs;
# keeps upload paths available in dev without extra setup steps.
STATIC_ROOT.mkdir(parents=True, exist_ok=True)
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Cloudinary (remote media storage)
# ---------------------------------------------------------------------------

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': env('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': env('CLOUDINARY_API_SECRET', default=''),
}

DEFAULT_FILE_STORAGE = env(
    'DEFAULT_FILE_STORAGE',
    default='django.core.files.storage.FileSystemStorage',
)

# If Cloudinary credentials are set but DEFAULT_FILE_STORAGE wasn't, prefer Cloudinary.
# This prevents "works until refresh" issues on Render where local /media/ isn't persistent/served.
if (
    DEFAULT_FILE_STORAGE == 'django.core.files.storage.FileSystemStorage'
    and CLOUDINARY_STORAGE.get('CLOUD_NAME')
    and CLOUDINARY_STORAGE.get('API_KEY')
    and CLOUDINARY_STORAGE.get('API_SECRET')
):
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Django 4.2+ storage config. Some deployments ignore DEFAULT_FILE_STORAGE unless STORAGES is set.
# Ensure uploads use DEFAULT_FILE_STORAGE (Cloudinary on Render when configured).
STORAGES = {
    "default": {"BACKEND": DEFAULT_FILE_STORAGE},
    "staticfiles": {"BACKEND": STATICFILES_STORAGE},
}

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'betnet.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '120/minute',
        'price_estimate': '30/hour',
    },
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
}

if DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] += (
        'rest_framework.renderers.BrowsableAPIRenderer',
    )

# ---------------------------------------------------------------------------
# OpenAPI / Swagger (drf-spectacular)
# ---------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    'TITLE': 'BetNet API',
    'DESCRIPTION': "Ethiopia's Trusted Property Marketplace",
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SECURITY': [{'bearerAuth': []}],
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'bearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            },
        },
    },
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS')

# ---------------------------------------------------------------------------
# Channels (WebSocket)
# ---------------------------------------------------------------------------

REDIS_URL = env('REDIS_URL')

try:
    import redis as _redis
    _r = _redis.from_url(REDIS_URL)
    _r.ping()
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
except Exception:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

CELERY_BEAT_SCHEDULE = {
    'expire-stale-bookings': {
        'task': 'bookings.tasks.expire_stale_bookings',
        'schedule': 3600.0,
    },
    # Daily: listing packages with unused credits expiring within 7 days (in-app + email)
    'listing-package-expiry-warnings': {
        'task': 'payments.tasks.warn_listing_package_expiry',
        'schedule': crontab(hour=9, minute=0),
    },
}

# ---------------------------------------------------------------------------
# Payment providers
# ---------------------------------------------------------------------------

# Chapa (Ethiopian payment gateway)
CHAPA_SECRET_KEY = env('CHAPA_SECRET_KEY', default='').strip()

# Telebirr (Ethio Telecom mobile money)
TELEBIRR_APP_ID = env('TELEBIRR_APP_ID', default='')
TELEBIRR_APP_KEY = env('TELEBIRR_APP_KEY', default='')
TELEBIRR_SHORT_CODE = env('TELEBIRR_SHORT_CODE', default='')
TELEBIRR_PUBLIC_KEY = env('TELEBIRR_PUBLIC_KEY', default='')

# Stripe
STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = env('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

# ---------------------------------------------------------------------------
# Phone number field
# ---------------------------------------------------------------------------

PHONENUMBER_DEFAULT_REGION = 'ET'
PHONENUMBER_DB_FORMAT = 'E164'

# ---------------------------------------------------------------------------
# Email (console backend for dev, SMTP for production)
# ---------------------------------------------------------------------------

EMAIL_BACKEND = env(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='BetNet <noreply@betnet.com>')

# ---------------------------------------------------------------------------
# Security hardening (enabled in production)
# ---------------------------------------------------------------------------

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': env('LOG_LEVEL', default='INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': env('DJANGO_LOG_LEVEL', default='WARNING'),
            'propagate': False,
        },
    },
}
