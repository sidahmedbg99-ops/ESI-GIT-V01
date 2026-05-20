"""
admin_panel/serializers.py
==========================
All serializers for the admin panel in one place.

Sections:
    1. Helpers          – password generation utility
    2. Student          – CreateStudentSerializer (create + update)
    3. Staff            – CreateStaffSerializer   (create + update)
    4. Output helpers   – student_to_dict / staff_to_dict (read-only dicts)
    5. Specialty        – SpecialtySerializer
    6. Department       – DepartmentSerializer / DepartmentWithSpecialtiesSerializer
    7. Platform         – PlatformSettingsSerializer
"""

import secrets
import string

from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from admin_panel.models import Department, PlatformSettings, Specialty
from users.models import Staff, Student


# ──────────────────────────────────────────────────────────────────────────────
# 1. PASSWORD HELPER
# ──────────────────────────────────────────────────────────────────────────────

def generate_password(length: int = 10) -> str:
    """
    Generate a cryptographically secure random password.

    Uses ``secrets`` (not ``random``) so the output is suitable for
    temporary credentials that are emailed to new users.

    Args:
        length: Number of characters (default 10).

    Returns:
        A random alphanumeric string of the requested length.
    """
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


# ──────────────────────────────────────────────────────────────────────────────
# 2. STUDENT SERIALIZER
# ──────────────────────────────────────────────────────────────────────────────

class CreateStudentSerializer(serializers.ModelSerializer):
    """
    Handles creation and updating of Student accounts.
    Allows manual CID and optional password.
    """
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Student
        fields = [
            "CID", "email", "first_name", "last_name",
            "specialty", "department", "academic_year", "level", "is_active", "is_blocked", "password"
        ]
        extra_kwargs = {
            "CID": {"read_only": False, "required": True},
        }

    def validate_email(self, value: str) -> str:
        email = value.lower()
        qs = Student.objects.filter(email=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A student with this email already exists.")
        return email

    def validate_CID(self, value: int) -> int:
        if self.instance:
            return value
        if Student.objects.filter(CID=value).exists():
            raise serializers.ValidationError("A student with this CID already exists.")
        return value

    def create(self, validated_data: dict):
        password = validated_data.pop("password", None) or generate_password()
        student = Student(**validated_data)
        student.email = student.email.lower()
        student.set_password(password)
        student.is_active = True
        student.is_blocked = False
        student.save()
        return student, password

    def update(self, instance: Student, validated_data: dict) -> Student:
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.email = instance.email.lower()
        instance.save()
        return instance


# ──────────────────────────────────────────────────────────────────────────────
# 3. STAFF SERIALIZER
# ──────────────────────────────────────────────────────────────────────────────

class CreateStaffSerializer(serializers.ModelSerializer):
    """
    Handles creation and updating of Staff accounts.
    Allows manual TID and optional password.
    """
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Staff
        fields = [
            "TID", "email", "first_name", "last_name",
            "is_admin", "is_teacher", "is_active", "is_blocked",
            "available", "specialty", "department", "password"
        ]
        extra_kwargs = {
            "TID": {"read_only": False, "required": True},
        }

    def validate_email(self, value: str) -> str:
        email = value.lower()
        qs = Staff.objects.filter(email=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A staff member with this email already exists.")
        return email

    def create(self, validated_data: dict):
        password = validated_data.pop("password", None) or generate_password()
        staff = Staff(**validated_data)
        staff.email = staff.email.lower()
        staff.set_password(password)
        staff.is_active = True
        staff.is_blocked = False
        staff.save()
        return staff, password

    def update(self, instance: Staff, validated_data: dict) -> Staff:
        password = validated_data.pop("password", None)
        if password:
            instance.set_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.email = instance.email.lower()
        instance.save()
        return instance


# ──────────────────────────────────────────────────────────────────────────────
# 4. READ-ONLY OUTPUT HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def student_to_dict(student: Student) -> dict:
    """
    Lightweight read representation of a Student for list/detail responses.

    Intentionally a plain dict (not a Serializer) so it is fast and
    never used for write operations.
    """
    return {
        "id": student.CID,
        "type": "student",
        "email": student.email,
        "full_name": student.full_name,
        "first_name": student.first_name,
        "last_name": student.last_name,
        "academic_year": student.academic_year,
        "level": student.level,
        "specialty": student.specialty,
        "department": student.department,
        "is_active": student.is_active,
        "is_blocked": student.is_blocked,
        "is_first_login": student.is_first_login,
        "created_at": student.created_at,
    }


def staff_to_dict(staff: Staff) -> dict:
    """
    Lightweight read representation of a Staff member for list/detail responses.
    """
    return {
        "id": staff.TID,
        "type": "staff",
        "email": staff.email,
        "full_name": staff.full_name,
        "first_name": staff.first_name,
        "last_name": staff.last_name,
        "is_admin": staff.is_admin,
        "is_teacher": staff.is_teacher,
        "specialty": staff.specialty,
        "department": staff.department,
        "available": staff.available,
        "is_active": staff.is_active,
        "is_blocked": staff.is_blocked,
        "is_first_login": staff.is_first_login,
        "created_at": staff.created_at,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 5. SPECIALTY SERIALIZER
# ──────────────────────────────────────────────────────────────────────────────

class SpecialtySerializer(serializers.ModelSerializer):
    """
    Serializer for the Specialty model.

    Used by:
        GET  /api/admin/specialties/          → list
        POST /api/admin/specialties/          → create
        PATCH /api/admin/specialties/<id>/   → partial update
    """

    class Meta:
        model = Specialty
        fields = ["id", "name", "department"]
        extra_kwargs = {
            # department is required on create but optional on partial update
            "department": {"required": False},
        }


# ──────────────────────────────────────────────────────────────────────────────
# 6. DEPARTMENT SERIALIZERS
# ──────────────────────────────────────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    """
    Flat serializer for Department — id and name only.
    Used in the departments list endpoint.
    """

    class Meta:
        model = Department
        fields = ["id", "name"]


class DepartmentWithSpecialtiesSerializer(serializers.ModelSerializer):
    """
    Nested serializer that embeds the department's specialties.
    Used in the academic-structure endpoint to return the full tree.
    """

    # Nested read-only list of specialties belonging to this department
    specialties = SpecialtySerializer(many=True, read_only=True)

    class Meta:
        model = Department
        fields = ["id", "name", "specialties"]


# ──────────────────────────────────────────────────────────────────────────────
# 7. PLATFORM SETTINGS SERIALIZER
# ──────────────────────────────────────────────────────────────────────────────

class PlatformSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for the singleton PlatformSettings model.
    Only admins can read or update these settings.
    """

    class Meta:
        model = PlatformSettings
        fields = [
            "students_can_see_archived_projects",
            "students_can_see_jury_column",
            "current_academic_year",
            "project_types",
            "presentation_weight",
            "document_weight",
            "demo_weight",
            "president_weight",
            "supervisor_weight",
            "other_weight",
            "contact_email",
        ]

