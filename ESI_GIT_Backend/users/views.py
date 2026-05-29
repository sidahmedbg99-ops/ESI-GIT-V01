from typing import Union, cast

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

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

class ForgotPasswordView(APIView):
    """
    POST /api/forgot-password/
    { "email": "..." }
    Sends a password reset link to the user's email.
    Works for both Student and Staff.
    """

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        # find user in Student or Staff
        user = None
        role = None
        try:
            user = Student.objects.get(email=email)
            role = "student"
        except Student.DoesNotExist:
            try:
                user = Staff.objects.get(email=email)
                role = "staff"
            except Staff.DoesNotExist:
                pass

        # always return success even if email not found — security best practice
        # (don't reveal whether an email exists in the system)
        if user:
            token_generator = PasswordResetTokenGenerator()
            token = token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"

            send_mail(
                subject="Password Reset — ESI GIT",
                message=f"Click the link to reset your password:\n\n{reset_url}\n\nThis link expires in 24 hours.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )

        return Response({"message": "If this email exists, a reset link has been sent."})


class ResetPasswordConfirmView(APIView):
    """
    POST /api/reset-password/<uid>/<token>/
    { "new_password": "..." }
    Validates the token and sets the new password.
    """

    def post(self, request, uid, token):
        new_password = request.data.get("new_password")
        if not new_password:
            return Response({"error": "new_password is required"}, status=400)

        # decode uid to find the user
        try:
            pk = force_str(urlsafe_base64_decode(uid))
            # try Student first, then Staff
            try:
                user = Student.objects.get(pk=pk)
            except Student.DoesNotExist:
                user = Staff.objects.get(pk=pk)

        except Exception:
            return Response({"error": "Invalid reset link"}, status=400)

        # validate token
        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, token):
            return Response({"error": "Reset link is invalid or has expired"}, status=400)

        # set new password
        user.set_password(new_password)
        user.is_first_login = False
        user.save()

        return Response({"message": "Password reset successfully."})