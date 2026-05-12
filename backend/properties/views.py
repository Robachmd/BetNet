from decimal import Decimal

from django.db.models import Q, F
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from accounts.models import User as AccountsUser

from .models import (
    City,
    Property,
    PropertyImage,
    PropertyVideo,
    FavoriteProperty,
    PropertyReport,
    HallDetail,
)
from .serializers import (
    CitySerializer,
    PropertyListSerializer,
    PropertyDetailSerializer,
    PropertyCreateUpdateSerializer,
    PropertyImageSerializer,
    PropertyVideoSerializer,
    FavoritePropertySerializer,
    PropertyReportSerializer,
    PriceInsightSerializer,
    PriceEstimateRequestSerializer,
    HallDetailSerializer,
)
from .price_ai import build_estimate_response_bundle
from .price_insight import get_price_insight_aggregate
from .filters import PropertyFilter, HallFilter
from .permissions import IsPropertyOwner, IsOwnerOrAdmin, IsOwnerOrReadOnly


def _is_platform_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff:
        return True
    return getattr(user, "role", None) == AccountsUser.Role.ADMIN


# ── Property CRUD ViewSet ─────────────────────────────────────────────────────

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = (
        Property.objects.select_related(
            "location", "amenities", "owner", "hall_detail", "listing_slot_purchase"
        )
        .prefetch_related("images", "videos")
        .all()
    )
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PropertyFilter
    search_fields = ["title", "description", "location__city", "location__sub_city"]
    ordering_fields = ["price_monthly", "created_at", "total_views"]
    ordering = ["-created_at"]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return PropertyListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PropertyCreateUpdateSerializer
        return PropertyDetailSerializer

    def get_permissions(self):
        if self.action in ("create",):
            return [permissions.IsAuthenticated(), IsPropertyOwner()]
        if self.action in (
            "update",
            "partial_update",
            "destroy",
            "publish",
        ):
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list" and not _is_platform_admin(self.request.user):
            return qs.filter(is_published=True, is_available=True)
        return qs

    def create(self, request, *args, **kwargs):
        # Draft creation is always allowed for owners. Slot capacity is enforced at publish time.
        return super().create(request, *args, **kwargs)

    @action(
        detail=True,
        methods=["post"],
        url_path="publish",
    )
    def publish(self, request, slug=None):
        """Use one listing slot (from a paid package) or legacy subscription; then publish."""
        from payments.listing_package_services import consume_slot_for_publish

        prop = self.get_object()
        if consume_slot_for_publish(request.user, prop):
            prop.refresh_from_db()
            return Response(
                PropertyDetailSerializer(prop, context={"request": request}).data,
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "detail": "No listing slots available. Purchase a listing package in Payments or use an active subscription.",
                "code": "no_listing_slots",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    def perform_destroy(self, instance):
        from payments.listing_package_services import release_slot_on_property_delete

        release_slot_on_property_delete(instance)
        instance.delete()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Property.objects.filter(pk=instance.pk).update(total_views=F("total_views") + 1)
        # Lightweight view log for analytics. Best-effort only.
        try:
            from analytics.models import PropertyView

            ip = (
                (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
                or request.META.get("REMOTE_ADDR")
                or "0.0.0.0"
            )
            session_id = ""
            try:
                session_id = request.session.session_key or ""
            except Exception:
                session_id = ""
            PropertyView.objects.create(
                property=instance,
                viewer=request.user if request.user and request.user.is_authenticated else None,
                ip_address=ip,
                session_id=session_id,
            )
        except Exception:
            pass
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


# ── Property Image uploads ────────────────────────────────────────────────────

class PropertyImageViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PropertyImageSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PropertyImage.objects.filter(
            property__slug=self.kwargs["property_slug"]
        )

    def perform_create(self, serializer):
        prop = get_object_or_404(
            Property, slug=self.kwargs["property_slug"], owner=self.request.user
        )
        serializer.save(property=prop)

    def perform_destroy(self, instance):
        if instance.property.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete images of your own properties.")
        instance.delete()


# ── Property Video uploads ────────────────────────────────────────────────────

class PropertyVideoViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = PropertyVideoSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PropertyVideo.objects.filter(
            property__slug=self.kwargs["property_slug"]
        )

    def perform_create(self, serializer):
        prop = get_object_or_404(
            Property, slug=self.kwargs["property_slug"], owner=self.request.user
        )
        serializer.save(property=prop)

    def perform_destroy(self, instance):
        if instance.property.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You can only delete videos of your own properties.")
        instance.delete()


# ── Favorites ─────────────────────────────────────────────────────────────────

class FavoriteViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FavoritePropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            FavoriteProperty.objects.filter(user=self.request.user)
            .select_related(
                "property__location",
                "property__amenities",
                "property__owner",
            )
            .prefetch_related("property__images")
        )


# ── Property Reports ─────────────────────────────────────────────────────────

class PropertyReportView(generics.CreateAPIView):
    serializer_class = PropertyReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PropertyReport.objects.all()


# ── Price Insights ────────────────────────────────────────────────────────────

class PriceInsightView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        sub_city = request.query_params.get("sub_city")
        city = request.query_params.get("city", "Addis Ababa")
        property_type = request.query_params.get("property_type")

        if not sub_city:
            return Response(
                {"detail": "sub_city query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = get_price_insight_aggregate(
            city=city,
            sub_city=sub_city,
            property_type=property_type or None,
        )
        serializer = PriceInsightSerializer(data)
        return Response(serializer.data)


class PriceEstimateView(APIView):
    """
    POST area + property features; returns DB aggregate plus optional AI band.
    Requires PRICE_AI_PROVIDER + API key on the server for non-null `ai`.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "price_estimate"

    def post(self, request):
        ser = PriceEstimateRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        aggregate = get_price_insight_aggregate(
            city=d.get("city") or "Addis Ababa",
            sub_city=d["sub_city"],
            property_type=d.get("property_type"),
            listing_type=d.get("listing_type"),
        )

        features = {
            "city": d.get("city") or "Addis Ababa",
            "sub_city": d["sub_city"],
            "property_type": d.get("property_type"),
            "listing_type": d.get("listing_type"),
            "bedrooms": (d.get("bedrooms") or "").strip(),
            "bathrooms": d.get("bathrooms"),
            "is_furnished": d.get("is_furnished"),
            "has_parking": d.get("has_parking"),
            "has_wifi": d.get("has_wifi"),
            "has_security": d.get("has_security"),
            "has_generator": d.get("has_generator"),
            "specific_location": (d.get("specific_location") or "").strip(),
            "latitude": str(d["latitude"]) if d.get("latitude") is not None else None,
            "longitude": str(d["longitude"]) if d.get("longitude") is not None else None,
            "area_sqm": str(d["area_sqm"]) if d.get("area_sqm") is not None else None,
            "asking_price_etb": str(d["asking_price"])
            if d.get("asking_price") is not None
            else None,
        }

        bundle = build_estimate_response_bundle(aggregate, features)
        agg_ser = PriceInsightSerializer(bundle["aggregate"])
        bundle["aggregate"] = agg_ser.data
        return Response(bundle)


# ── Featured Properties ──────────────────────────────────────────────────────

class FeaturedPropertiesView(generics.ListAPIView):
    serializer_class = PropertyListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Property.objects.filter(is_featured=True, is_available=True)
            .select_related("location", "amenities", "owner")
            .prefetch_related("images")[:20]
        )


# ── Nearby Properties ────────────────────────────────────────────────────────

class NearbyPropertiesView(generics.ListAPIView):
    """Return properties within a bounding-box around the given coordinates.

    Query params: lat, lng, radius_km (default 3)
    Uses a simple bounding-box approximation (~0.009° ≈ 1 km at the equator).
    """

    serializer_class = PropertyListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        lat = self.request.query_params.get("lat")
        lng = self.request.query_params.get("lng")
        radius_km = float(self.request.query_params.get("radius_km", 3))

        if not lat or not lng:
            return Property.objects.none()

        lat = Decimal(lat)
        lng = Decimal(lng)
        delta = Decimal(str(radius_km * 0.009))

        return (
            Property.objects.filter(
                is_available=True,
                location__latitude__gte=lat - delta,
                location__latitude__lte=lat + delta,
                location__longitude__gte=lng - delta,
                location__longitude__lte=lng + delta,
            )
            .select_related("location", "amenities", "owner")
            .prefetch_related("images")
        )


# ── My Properties (property owner dashboard) ─────────────────────────────────

class MyPropertiesView(generics.ListAPIView):
    serializer_class = PropertyListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Property.objects.filter(owner=self.request.user)
            .select_related("location", "amenities")
            .prefetch_related("images")
        )


# ── Hall Rental Listings ─────────────────────────────────────────────────────

class HallRentalListView(generics.ListAPIView):
    serializer_class = PropertyDetailSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = HallFilter
    ordering_fields = [
        "property__price_monthly",
        "property__created_at",
        "capacity",
    ]

    def get_queryset(self):
        return (
            HallDetail.objects.filter(property__is_available=True)
            .select_related(
                "property__location",
                "property__amenities",
                "property__owner",
            )
            .prefetch_related("property__images", "property__videos")
        )

    def get_serializer(self, *args, **kwargs):
        """Unwrap HallDetail → Property for the detail serializer."""
        if args:
            data = args[0]
            if hasattr(data, "__iter__") and not isinstance(data, dict):
                properties = [item.property for item in data]
                return PropertyDetailSerializer(
                    properties, many=True, context=self.get_serializer_context()
                )
            if hasattr(data, "property"):
                return PropertyDetailSerializer(
                    data.property, context=self.get_serializer_context()
                )
        return super().get_serializer(*args, **kwargs)


# ── Advanced Search ──────────────────────────────────────────────────────────

class PropertySearchView(generics.ListAPIView):
    """Full-text keyword search across title, description, and location."""

    serializer_class = PropertyListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        qs = (
            Property.objects.filter(is_available=True)
            .select_related("location", "amenities", "owner")
            .prefetch_related("images")
        )
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(location__city__icontains=q)
                | Q(location__sub_city__icontains=q)
                | Q(location__specific_location__icontains=q)
            )
        return qs


# ── Ethiopian cities (searchable dropdown + mobile clients) ────────────────


class CitySearchView(generics.ListAPIView):
    """
    Search cities by name, region, or alternate spellings (search_text).
    Query params: q (optional) — empty returns top cities by sort_order.
    """

    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = City.objects.filter(is_active=True).order_by("sort_order", "name")
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(region__icontains=q)
                | Q(search_text__icontains=q)
            )
        return qs[:100]


class AdminPropertyVerifyView(APIView):
    """Mark a listing verified (platform admin or Django staff)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not _is_platform_admin(request.user):
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prop = get_object_or_404(Property, pk=pk)
        prop.is_verified = True
        prop.save(update_fields=["is_verified"])
        return Response(
            PropertyDetailSerializer(prop, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class AdminPropertyRejectView(APIView):
    """Unpublish / hide a listing (moderation). Optional reason is accepted but not stored."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not _is_platform_admin(request.user):
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prop = get_object_or_404(Property, pk=pk)
        prop.is_verified = False
        prop.is_published = False
        prop.is_available = False
        prop.save(update_fields=["is_verified", "is_published", "is_available"])
        return Response(
            {
                "detail": "Listing rejected and hidden.",
                "property": PropertyDetailSerializer(
                    prop, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )
