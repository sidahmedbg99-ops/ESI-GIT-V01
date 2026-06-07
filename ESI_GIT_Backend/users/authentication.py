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
    def validate(self, attrs):
        from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            refresh = RefreshToken(attrs["refresh"])
        except TokenError as e:
            raise InvalidToken(str(e))

        user_type = refresh.get("user_type")
        user_id   = refresh.get("user_id")

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

        refresh.set_jti()
        refresh.set_exp()
        refresh.set_iat()

        new_access = refresh.access_token
        new_access["user_type"] = user_type

        data = {
            "access": str(new_access),
            "refresh": str(refresh),
        }

        return data