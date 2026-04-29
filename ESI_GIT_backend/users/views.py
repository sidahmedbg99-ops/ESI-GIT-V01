from typing import Union, cast

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import Student, Staff


def get_tokens(user, role):
    refresh = RefreshToken.for_user(user)
    refresh["user_type"] = role
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class LoginView(APIView):
    """
    POST /api/login/
    { "email": "...", "password": "..." }
    """

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, email=email, password=password)
        user = cast(Union[Student, Staff, None], user)

        if user is None:
            return Response(
                {"error": "Invalid email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.is_blocked:
            return Response(
                {"error": "Your account has been blocked. Contact admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if isinstance(user, Student):
            tokens = get_tokens(user, "student")
            return Response(
                {
                    "role": "student",
                    "first_login": user.is_first_login,
                    "user": {
                        "CID": user.CID,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                    },
                    **tokens,
                }
            )

        elif isinstance(user, Staff):
            tokens = get_tokens(user, "staff")
            return Response(
                {
                    "role": "staff",
                    "first_login": user.is_first_login,
                    "user": {
                        "TID": user.TID,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "is_admin": user.is_admin,
                        "is_teacher": user.is_teacher,
                    },
                    **tokens,
                }
            )


class ChangePasswordView(APIView):
    """
    POST /api/change-password/
    { "old_password": "...", "new_password": "..." }
    Requires: Authorization: Bearer <token>
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not old_password or not new_password:
            return Response(
                {"error": "Both old and new password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.check_password(old_password):
            return Response(
                {"error": "Old password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.is_first_login = False
        user.save()

        return Response({"message": "Password changed successfully."})


class MeView(APIView):
    """
    GET /api/me/
    Returns the logged in user's info.
    Requires: Authorization: Bearer <token>
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if isinstance(user, Student):
            return Response(
                {
                    "role": "student",
                    "CID": user.CID,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_first_login": user.is_first_login,
                }
            )

        elif isinstance(user, Staff):
            return Response(
                {
                    "role": "staff",
                    "TID": user.TID,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_admin": user.is_admin,
                    "is_teacher": user.is_teacher,
                    "is_first_login": user.is_first_login,
                }
            )


class TeacherListView(APIView):
    """
    GET /api/teachers/
    Returns a list of all available teachers.
    Accessible by all authenticated users (students need this to pick a supervisor).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        teachers = Staff.objects.filter(is_teacher=True, is_active=True)
        data = [
            {
                "TID": t.TID,
                "_id": t.TID,
                "email": t.email,
                "first_name": t.first_name,
                "last_name": t.last_name,
                "name": f"{t.first_name} {t.last_name}",
                "full_name": f"{t.first_name} {t.last_name}",
                "specialty": t.specialty or "PFE",
                "department": t.department or "Informatique",
                "available": t.available,
            }
            for t in teachers
        ]
        return Response(data)
