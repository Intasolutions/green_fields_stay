from rest_framework.permissions import BasePermission

from .models import User


class IsManagerOrAdmin(BasePermission):
    """Allows access to Managers and Admins only (e.g. expenses module)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.MANAGER, User.Role.ADMIN)
        )


class IsAdmin(BasePermission):
    """Allows access to Admins only (e.g. reports, cancellations)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )
