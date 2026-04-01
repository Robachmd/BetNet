from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking, HallBooking
from properties.models import Location, Property

from .models import PropertyView, SearchLog

User = get_user_model()


def _parse_date_range(request):
    """Extract start_date / end_date from query params, defaulting to last 30 days."""
    default_end = timezone.now()
    default_start = default_end - timedelta(days=30)
    fmt = "%Y-%m-%d"
    try:
        start = timezone.datetime.strptime(
            request.query_params["start_date"], fmt
        )
        start = timezone.make_aware(start)
    except (KeyError, ValueError):
        start = default_start
    try:
        end = timezone.datetime.strptime(
            request.query_params["end_date"], fmt
        )
        end = timezone.make_aware(end) + timedelta(days=1)
    except (KeyError, ValueError):
        end = default_end
    return start, end


class DashboardOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end = _parse_date_range(request)

        total_listings = Property.objects.count()
        active_listings = Property.objects.filter(is_available=True).count()
        active_users = User.objects.filter(is_active=True).count()
        total_bookings = Booking.objects.count()

        total_revenue = (
            HallBooking.objects.filter(is_paid=True).aggregate(
                total=Sum("total_price")
            )["total"]
            or 0
        )

        listings_by_type = list(
            Property.objects.values("property_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        new_users_trend = list(
            User.objects.filter(date_joined__range=(start, end))
            .annotate(date=TruncDate("date_joined"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        return Response(
            {
                "total_listings": total_listings,
                "active_listings": active_listings,
                "active_users": active_users,
                "total_bookings": total_bookings,
                "total_revenue": str(total_revenue),
                "listings_by_type": listings_by_type,
                "new_users_trend": new_users_trend,
            }
        )


class PopularAreasView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end = _parse_date_range(request)
        limit = int(request.query_params.get("limit", 10))

        most_searched = list(
            SearchLog.objects.filter(searched_at__range=(start, end))
            .values("query")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

        most_listed = list(
            Location.objects.values("city", "sub_city")
            .annotate(count=Count("property"))
            .order_by("-count")[:limit]
        )

        most_viewed_areas = list(
            PropertyView.objects.filter(viewed_at__range=(start, end))
            .values(
                "property__location__city",
                "property__location__sub_city",
            )
            .annotate(views=Count("id"))
            .order_by("-views")[:limit]
        )

        return Response(
            {
                "most_searched": most_searched,
                "most_listed": most_listed,
                "most_viewed_areas": most_viewed_areas,
            }
        )


class RevenueAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end = _parse_date_range(request)

        revenue_by_month = list(
            HallBooking.objects.filter(
                is_paid=True, created_at__range=(start, end)
            )
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(total=Sum("total_price"), bookings=Count("id"))
            .order_by("month")
        )

        revenue_by_type = list(
            HallBooking.objects.filter(is_paid=True)
            .values("event_type")
            .annotate(total=Sum("total_price"), bookings=Count("id"))
            .order_by("-total")
        )

        return Response(
            {
                "revenue_by_month": revenue_by_month,
                "revenue_by_type": revenue_by_type,
            }
        )


class UserAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end = _parse_date_range(request)

        new_registrations = list(
            User.objects.filter(date_joined__range=(start, end))
            .annotate(date=TruncDate("date_joined"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        users_by_role = list(
            User.objects.values("role")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        active_users_30d = User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=30)
        ).count()

        total_users = User.objects.count()
        verified_users = User.objects.filter(id_verified=True).count()

        return Response(
            {
                "new_registrations": new_registrations,
                "users_by_role": users_by_role,
                "active_users_30d": active_users_30d,
                "total_users": total_users,
                "verified_users": verified_users,
            }
        )


class ListingAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end = _parse_date_range(request)

        listings_by_status = {
            "available": Property.objects.filter(is_available=True).count(),
            "unavailable": Property.objects.filter(is_available=False).count(),
            "verified": Property.objects.filter(is_verified=True).count(),
            "unverified": Property.objects.filter(is_verified=False).count(),
            "featured": Property.objects.filter(is_featured=True).count(),
        }

        listings_by_type = list(
            Property.objects.values("property_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        listings_by_city = list(
            Property.objects.values("location__city")
            .annotate(count=Count("id"))
            .order_by("-count")[:15]
        )

        new_listings_trend = list(
            Property.objects.filter(created_at__range=(start, end))
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        return Response(
            {
                "listings_by_status": listings_by_status,
                "listings_by_type": listings_by_type,
                "listings_by_city": listings_by_city,
                "new_listings_trend": new_listings_trend,
            }
        )


class PropertyViewAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        start, end = _parse_date_range(request)
        limit = int(request.query_params.get("limit", 20))

        most_viewed = list(
            PropertyView.objects.filter(viewed_at__range=(start, end))
            .values(
                "property__id",
                "property__title",
                "property__location__city",
            )
            .annotate(views=Count("id"))
            .order_by("-views")[:limit]
        )

        views_trend = list(
            PropertyView.objects.filter(viewed_at__range=(start, end))
            .annotate(date=TruncDate("viewed_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        return Response(
            {
                "most_viewed": most_viewed,
                "views_trend": views_trend,
            }
        )
