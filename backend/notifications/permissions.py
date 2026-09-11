from rest_framework import permissions

class IsAdminRoleUser(permissions.BasePermission):
    """
    Allows access only to authenticated admin users (is_staff or is_superuser).
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )
