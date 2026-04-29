from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
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
