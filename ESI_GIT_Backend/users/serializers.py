from rest_framework import serializers
from .models import Student


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ['CID', 'email', 'first_name', 'last_name',
                  'is_first_login', 'academic_year', 'level', 'specialty']
