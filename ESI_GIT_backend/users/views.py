from typing import Union, cast

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from .models import Student, Staff
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings


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
                {"error": "Votre compte a été bloqué par l'administration. Veuillez les contacter."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_active:
            return Response(
                {"error": "Votre compte n'est pas encore activé. Veuillez contacter l'administration."},
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
                        "full_name": f"{user.first_name} {user.last_name}",
                        "academic_year": user.academic_year,
                        "level": user.level,
                        "specialty": user.specialty,
                        "department": user.department,
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
                        "full_name": f"{user.first_name} {user.last_name}",
                        "is_admin": user.is_admin,
                        "is_teacher": user.is_teacher,
                        "department": user.department,
                        "specialty": user.specialty,
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
                    "full_name": f"{user.first_name} {user.last_name}",
                    "is_first_login": user.is_first_login,
                    "academic_year": user.academic_year,
                    "level": user.level,
                    "specialty": user.specialty,
                    "department": user.department,
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
                    "full_name": f"{user.first_name} {user.last_name}",
                    "is_admin": user.is_admin,
                    "is_teacher": user.is_teacher,
                    "is_first_login": user.is_first_login,
                    "department": user.department,
                    "specialty": user.specialty,
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
        teachers = Staff.objects.filter(is_teacher=True, is_active=True, is_first_login=False)
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


class ForgotPasswordView(APIView):
    """
    POST /api/users/forgot-password/
    { "email": "..." }
    """

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        # Try to find user in both models
        user = Student.objects.filter(email=email).first()
        if not user:
            user = Staff.objects.filter(email=email).first()

        if not user:
            # We return 200 for security reasons (don't reveal if email exists)
            return Response({"message": "If an account exists with this email, a reset link has been sent."})

        # Generate token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

        subject = "ESI-GIT Password Reset"
        message = f"Hello,\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_link}\n\nIf you did not request this, please ignore this email."
        
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
        except Exception as e:
            print("Failed to send reset email:", e)
            return Response({"error": "Failed to send email"}, status=500)

        return Response({"message": "If an account exists with this email, a reset link has been sent."})


class ResetPasswordConfirmView(APIView):
    """
    POST /api/users/reset-password/
    { "uid": "...", "token": "...", "new_password": "..." }
    """

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get("new_password")

        if not all([uidb64, token, new_password]):
            return Response({"error": "All fields are required"}, status=400)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = Student.objects.filter(pk=uid).first()
            if not user:
                user = Staff.objects.filter(pk=uid).first()

            if user and default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.is_first_login = False
                user.save()
                return Response({"message": "Password has been reset successfully"})
            else:
                return Response({"error": "Invalid or expired token"}, status=400)
        except Exception as e:
            return Response({"error": "Invalid request"}, status=400)
