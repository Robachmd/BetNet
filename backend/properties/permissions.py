from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import User as AccountUser


class IsPropertyOwner(BasePermission):
    """Property owners: registered as property owner, or renter with landlord_eligible."""

    message = "Only property owners can perform this action."

    def has_permission(self, request, view):
        u = request.user
        if not u or not u.is_authenticated:
            return False
        role = (getattr(u, "role", None) or "").strip().upper()
        if role in (AccountUser.Role.LANDLORD, AccountUser.Role.ADMIN):
            return True
        return bool(getattr(u, "landlord_eligible", False))


# Backward-compatible alias.
IsLandlord = IsPropertyOwner


class IsOwnerOrAdmin(BasePermission):
    """Object-level: allow the property owner or staff/admin."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        owner = getattr(obj, "owner", None)
        if owner is None and hasattr(obj, "property"):
            owner = obj.property.owner

        return request.user == owner or request.user.is_staff


class IsOwnerOrReadOnly(BasePermission):
    """Object-level: owner can write, everyone else can read."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        owner = getattr(obj, "owner", None)
        if owner is None and hasattr(obj, "property"):
            owner = obj.property.owner

        return request.user == owner
