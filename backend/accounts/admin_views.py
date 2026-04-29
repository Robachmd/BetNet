"""Admin-only API views for mobile/web parity (role ADMIN or Django staff)."""

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import AdminUserSerializer


class IsPlatformAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        if u.is_staff:
            return True
        return getattr(u, "role", None) == User.Role.ADMIN


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsPlatformAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by("-date_joined")


class AdminUserStatusView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        target = get_object_or_404(User, pk=pk)
        if target.pk == request.user.pk:
            return Response(
                {"detail": "You cannot change your own active status here."},
                status=400,
            )
        active = request.data.get("is_active")
        if active is None:
            return Response({"detail": "is_active is required."}, status=400)
        target.is_active = bool(active)
        target.save(update_fields=["is_active"])
        return Response(AdminUserSerializer(target).data)

