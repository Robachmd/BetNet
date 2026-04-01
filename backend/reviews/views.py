from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from properties.models import Property

from .models import Review, ReviewResponse
from .serializers import (
    ReviewCreateSerializer,
    ReviewResponseSerializer,
    ReviewSerializer,
    ReviewSummarySerializer,
)


class IsReviewerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.reviewer == request.user


class ReviewViewSet(viewsets.ModelViewSet):
    """
    CRUD for reviews.
    - list: filter by ?property=<id> or ?user=<id> or ?review_type=<type>
    - create: authenticated users only, validated against bookings
    - update/delete: only the original reviewer
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsReviewerOrReadOnly]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ReviewCreateSerializer
        return ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related(
            "reviewer", "property", "reviewed_user", "response__responder"
        )

        if self.action == "list":
            qs = qs.filter(is_approved=True)

        property_id = self.request.query_params.get("property")
        if property_id:
            qs = qs.filter(property_id=property_id)

        user_id = self.request.query_params.get("user")
        if user_id:
            qs = qs.filter(reviewed_user_id=user_id)

        review_type = self.request.query_params.get("review_type")
        if review_type:
            qs = qs.filter(review_type=review_type)

        return qs


class ReviewResponseView(generics.CreateAPIView):
    """Landlord / property owner responds to a review on their property."""

    serializer_class = ReviewResponseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        review = get_object_or_404(Review, pk=self.kwargs["review_pk"])

        if hasattr(review, "response"):
            raise PermissionDenied("This review already has a response.")

        is_property_owner = (
            review.property and review.property.owner == self.request.user
        )
        is_reviewed_user = review.reviewed_user == self.request.user

        if not (is_property_owner or is_reviewed_user):
            raise PermissionDenied(
                "Only the property owner or reviewed user can respond."
            )

        serializer.save(responder=self.request.user, review=review)


class PropertyReviewSummaryView(generics.GenericAPIView):
    """GET aggregated review summary for a property."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewSummarySerializer

    def get(self, request, property_pk):
        prop = get_object_or_404(Property, pk=property_pk)
        qs = Review.objects.filter(
            property=prop,
            review_type=Review.ReviewType.PROPERTY_REVIEW,
        )
        data = ReviewSummarySerializer.build_summary(qs)
        serializer = self.get_serializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserReviewSummaryView(generics.GenericAPIView):
    """GET aggregated review summary for a user (landlord or tenant)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewSummarySerializer

    def get(self, request, user_pk):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = get_object_or_404(User, pk=user_pk)
        qs = Review.objects.filter(reviewed_user=user)

        review_type = request.query_params.get("review_type")
        if review_type:
            qs = qs.filter(review_type=review_type)

        data = ReviewSummarySerializer.build_summary(qs)
        serializer = self.get_serializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
