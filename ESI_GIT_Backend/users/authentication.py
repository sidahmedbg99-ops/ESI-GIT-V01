from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework.exceptions import AuthenticationFailed
from rest_framework import serializers
from users.models import Student, Staff

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        user_type = validated_token.get("user_type")

        if user_id is None:
            raise AuthenticationFailed("Token missing user_id")

        if user_type == "student":
            try:
                return Student.objects.get(CID=user_id)
            except Student.DoesNotExist:
                raise AuthenticationFailed("Student not found")

        if user_type == "staff":
            try:
                return Staff.objects.get(TID=user_id)
            except Staff.DoesNotExist:
                raise AuthenticationFailed("Staff not found")

        raise AuthenticationFailed("Invalid token")

class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Override simplejwt's refresh serializer so it uses our dual-model
    lookup (Student by CID, Staff by TID) instead of get_user_model().objects.get(id=...).
    """

    def validate(self, attrs):
        # Let simplejwt decode and rotate the token normally
        data = super().validate(attrs)

        # Re-read user_type from the new access token to embed it again
        refresh = RefreshToken(attrs["refresh"])
        user_type = refresh.get("user_type")
        user_id   = refresh.get("user_id")

        # Look up the user with our custom logic
        if user_type == "student":
            try:
                user = Student.objects.get(CID=user_id)
            except Student.DoesNotExist:
                raise InvalidToken("Student not found")
        elif user_type == "staff":
            try:
                user = Staff.objects.get(TID=user_id)
            except Staff.DoesNotExist:
                raise InvalidToken("Staff not found")
        else:
            raise InvalidToken("Invalid token type")

        # Stamp user_type onto the new access token so CustomJWTAuthentication
        # can still read it on the next request
        from rest_framework_simplejwt.tokens import AccessToken
        new_access = AccessToken(data["access"])
        new_access["user_type"] = user_type
        data["access"] = str(new_access)

        return data