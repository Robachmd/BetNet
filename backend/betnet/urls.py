"""
URL configuration for betnet project.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny

from . import views

_docs_permission = {'permission_classes': [AllowAny], 'authentication_classes': []}

api_urlpatterns = [
    path(
        'schema/',
        SpectacularAPIView.as_view(**_docs_permission),
        name='schema',
    ),
    path(
        'schema/swagger-ui/',
        SpectacularSwaggerView.as_view(url_name='api:schema', **_docs_permission),
        name='swagger-ui',
    ),
    path(
        'schema/redoc/',
        SpectacularRedocView.as_view(url_name='api:schema', **_docs_permission),
        name='redoc',
    ),
    path('accounts/', include('accounts.urls')),
    path('properties/', include('properties.urls')),
    path('bookings/', include('bookings.urls')),
    path('reviews/', include('reviews.urls')),
    path('chat/', include('chat.urls')),
    path('payments/', include('payments.urls')),
    path('notifications/', include('notifications.urls')),
    path('analytics/', include('analytics.urls')),
]


def api_root(request):
    return JsonResponse({
        'name': 'BetNet API',
        'version': '1.0.0',
        'description': "Ethiopia's Trusted Property Marketplace",
        'documentation': {
            'docs': '/docs/',
            'openapi_schema': '/api/schema/',
            'swagger_ui': '/api/schema/swagger-ui/',
            'redoc': '/api/schema/redoc/',
        },
        'endpoints': {
            'accounts': '/api/accounts/',
            'token_refresh': '/api/accounts/token/refresh/',
            'properties': '/api/properties/',
            'property_list': '/api/properties/properties/',
            'bookings': '/api/bookings/',
            'reviews': '/api/reviews/',
            'chat': '/api/chat/',
            'payments': '/api/payments/',
            'listing_packages': '/api/payments/listing-packages/',
            'listing_slot_summary': '/api/payments/listing-packages/slots/summary/',
            'owner_profile': '/api/accounts/owner-profile/',
            'notifications': '/api/notifications/',
            'location_alerts': '/api/notifications/location-alerts/',
            'analytics': '/api/analytics/',
        },
    })


urlpatterns = [
    path('i18n/', include('django.conf.urls.i18n')),
    # Admin & API
    path('admin/', admin.site.urls),
    path(
        'docs/',
        RedirectView.as_view(
            url='/api/schema/swagger-ui/',
            permanent=False,
        ),
        name='api-docs',
    ),
    path('api/', api_root, name='api-root'),
    path('api/', include((api_urlpatterns, 'api'))),
]

if settings.SERVE_DJANGO_PAGES:
    urlpatterns = [
        # Server-rendered pages (kept for local/dev compatibility).
        path('', views.home, name='home'),
        path('login/', views.login_view, name='login'),
        path('register/', views.register_view, name='register'),
        path('logout/', views.logout_view, name='logout'),
        path('dashboard/', views.dashboard_view, name='dashboard'),
        path('dashboard/renter/', views.renter_dashboard, name='renter_dashboard'),
        path('dashboard/landlord/', views.landlord_dashboard, name='landlord_dashboard'),
        path(
            'dashboard/landlord/packages/<int:listings>/',
            views.listing_package_payment,
            name='listing_package_payment',
        ),
        path(
            'dashboard/landlord/publish/<slug:slug>/',
            views.publish_with_package,
            name='publish_with_package',
        ),
        path('search/', views.search_view, name='search'),
        path('property/<slug:slug>/', views.property_detail, name='property_detail'),
        path('add-property/', views.add_property, name='add_property'),
        path('edit-property/<slug:slug>/', views.edit_property, name='edit_property'),
        path('favorite/<int:property_id>/', views.toggle_favorite, name='toggle_favorite'),
        path('book/<slug:slug>/', views.book_visit, name='book_visit'),
        path('booking/<int:booking_id>/manage/', views.manage_booking, name='manage_booking'),
        path('halls/', views.halls_view, name='halls'),
        path('profile/', views.profile_view, name='profile'),
        path('messages/', views.messages_inbox, name='messages_inbox'),
        path(
            'messages/start-owner/<int:user_id>/',
            views.start_owner_to_owner_message,
            name='start_owner_dm',
        ),
        path('messages/<int:conversation_id>/', views.conversation_thread, name='conversation_thread'),
        path('publish/<slug:slug>/', views.publish_payment, name='publish_payment'),
        path('publish/<slug:slug>/pay/', views.process_publish_payment, name='process_publish_payment'),
    ] + urlpatterns

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# React SPA: must be last so /api/, /admin/, /media/ (DEBUG), etc. match first
if not settings.SERVE_DJANGO_PAGES:
    # If the frontend bundle hasn't been built/deployed (common on API-only deploys),
    # fall back to the API root instead of returning a confusing 404 for "/".
    try:
        _has_react_index = (settings.REACT_BUILD_DIR / 'index.html').is_file()
    except Exception:
        _has_react_index = False

    if _has_react_index:
        urlpatterns += [
            re_path(r'^.*$', views.spa_index, name='spa'),
        ]
    else:
        urlpatterns = [
            path('', RedirectView.as_view(url='/api/', permanent=False), name='root'),
        ] + urlpatterns
