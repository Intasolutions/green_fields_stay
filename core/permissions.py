from rest_framework.permissions import BasePermission

from .models import User


def _has_role(request, *roles):
    return bool(
        request.user
        and request.user.is_authenticated
        and request.user.role in roles
    )


class IsReceptionist(BasePermission):
    """Allows access to Receptionists only."""

    def has_permission(self, request, view):
        return _has_role(request, User.Role.RECEPTIONIST)


class IsManager(BasePermission):
    """Allows access to Managers only."""

    def has_permission(self, request, view):
        return _has_role(request, User.Role.MANAGER)


class IsAdmin(BasePermission):
    """Allows access to Admins only (e.g. reports, cancellations)."""

    def has_permission(self, request, view):
        return _has_role(request, User.Role.ADMIN)


class IsManagerOrAdmin(BasePermission):
    """Allows access to Managers and Admins only (e.g. expenses module)."""

    def has_permission(self, request, view):
        return _has_role(request, User.Role.MANAGER, User.Role.ADMIN)
