from rest_framework.permissions import BasePermission
from .models import Student, Staff


class IsStudent(BasePermission):
    """Only authenticated students can access this view."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Student)
            and not request.user.is_blocked
        )


class IsStaff(BasePermission):
    """Only authenticated staff/teachers can access this view."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Staff)
            and not request.user.is_blocked
        )


class IsAdmin(BasePermission):
    """Only authenticated admin staff can access this view."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and isinstance(request.user, Staff)
            and request.user.is_admin
            and not request.user.is_blocked
        )
