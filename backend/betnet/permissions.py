from rest_framework.permissions import BasePermission


class IsOwnerOrAdmin(BasePermission):
    """
    Allow access only to the object owner or an admin user.

    The view's queryset objects must expose an ownership attribute.
    Override `owner_field` on the view to customise (default: ``"user"``).
    """

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        owner_field = getattr(view, 'owner_field', 'user')
        return getattr(obj, owner_field, None) == request.user


class IsLandlord(BasePermission):
    """Allow access only to users with the landlord role."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'landlord'
        )


class IsRenter(BasePermission):
    """Allow access only to users with the renter role."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'renter'
        )


class IsAdmin(BasePermission):
    """Allow access only to admin / staff users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_staff
