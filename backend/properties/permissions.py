from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsLandlord(BasePermission):
    """Allow only users whose role is 'landlord'."""

    message = "Only landlords can perform this action."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, "role", None) == "landlord"
        )


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
