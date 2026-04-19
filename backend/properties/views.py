from decimal import Decimal

from django.db.models import Avg, Min, Max, Count, Q, F
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

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
    HallDetailSerializer,
)
from .filters import PropertyFilter, HallFilter
from .permissions import IsLandlord, IsOwnerOrAdmin, IsOwnerOrReadOnly


# ── Property CRUD ViewSet ─────────────────────────────────────────────────────

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = (
        Property.objects.select_related("location", "amenities", "owner", "hall_detail")
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
            return [permissions.IsAuthenticated(), IsLandlord()]
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsOwnerOrAdmin()]
        return [permissions.AllowAny()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Property.objects.filter(pk=instance.pk).update(total_views=F("total_views") + 1)
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

        qs = Property.objects.filter(
            location__sub_city__iexact=sub_city,
            location__city__iexact=city,
            is_available=True,
        )
        if property_type:
            qs = qs.filter(property_type=property_type)

        stats = qs.aggregate(
            avg_price=Avg("price_monthly"),
            min_price=Min("price_monthly"),
            max_price=Max("price_monthly"),
            listing_count=Count("id"),
        )

        data = {
            "sub_city": sub_city,
            "city": city,
            "property_type": property_type,
            "avg_price": stats["avg_price"] or Decimal("0.00"),
            "min_price": stats["min_price"] or Decimal("0.00"),
            "max_price": stats["max_price"] or Decimal("0.00"),
            "listing_count": stats["listing_count"],
        }
        serializer = PriceInsightSerializer(data)
        return Response(serializer.data)


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


# ── My Properties (landlord dashboard) ───────────────────────────────────────

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
    ordering_fields = ["property__price_monthly", "capacity"]

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
