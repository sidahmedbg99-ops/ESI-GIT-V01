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

    On **create**: auto-generates a random password, hashes it, and
    returns ``(student_instance, plain_password)`` so the view can
    email the credentials to the new student.

    On **update**: updates allowed fields in-place; the password is
    never touched by this serializer.

    Fields exposed (CID is read-only on create — set by the admin):
        CID, email, first_name, last_name, specialty, academic_year, is_active
    """

    class Meta:
        model = Student
        fields = [
            "CID",
            "email",
            "first_name",
            "last_name",
            "specialty",
            "academic_year",
            "is_active",
        ]
        extra_kwargs = {
            # CID is provided by the admin in the request body on create;
            # it is the student's national registration number.
            "CID": {"read_only": False},
        }

    # ── Validation ────────────────────────────────────────────────────────────

    def validate_email(self, value: str) -> str:
        """
        Normalise to lowercase and enforce global uniqueness.
        Excludes the current instance when validating an update.
        """
        email = value.lower()
        qs = Student.objects.filter(email=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A student with this email already exists.")
        return email

    def validate_CID(self, value: int) -> int:
        """
        Reject duplicate CIDs on create.
        CID is immutable after creation so we skip this check on update.
        """
        if self.instance:
            return value  # updating — CID cannot change
        if Student.objects.filter(CID=value).exists():
            raise serializers.ValidationError("A student with this CID already exists.")
        return value

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, validated_data: dict):
        """
        Create a new Student with a generated password.

        Returns:
            Tuple[Student, str]: the saved instance and the plain-text
            password so the caller can email it.
        """
        password = generate_password()
        student = Student(**validated_data)
        student.email = student.email.lower()
        student.password = make_password(password)
        student.is_active = True
        student.is_blocked = False
        student.save()
        return student, password

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, instance: Student, validated_data: dict) -> Student:
        """
        Partial-friendly update — applies every supplied field.
        Email is always stored in lowercase.
        """
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
    Handles creation and updating of Staff (teacher / admin) accounts.

    Mirrors the student serializer: on **create** it returns
    ``(staff_instance, plain_password)``; on **update** it patches
    the supplied fields only.

    Fields exposed (TID is auto-assigned by the DB):
        TID, email, first_name, last_name, is_admin, is_teacher, is_active
    """

    class Meta:
        model = Staff
        fields = [
            "TID",
            "email",
            "first_name",
            "last_name",
            "is_admin",
            "is_teacher",
            "is_active",
        ]
        extra_kwargs = {
            # TID is auto-generated (AutoField) — never supplied by the client.
            "TID": {"read_only": True},
        }

    # ── Validation ────────────────────────────────────────────────────────────

    def validate_email(self, value: str) -> str:
        """Lowercase and unique email across all staff."""
        email = value.lower()
        qs = Staff.objects.filter(email=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A staff member with this email already exists.")
        return email

    # ── Create ────────────────────────────────────────────────────────────────

    def create(self, validated_data: dict):
        """
        Create a new Staff member with a generated password.

        Returns:
            Tuple[Staff, str]: the saved instance and the plain-text
            password so the caller can email it.
        """
        password = generate_password()
        staff = Staff(**validated_data)
        staff.email = staff.email.lower()
        staff.password = make_password(password)
        staff.is_active = True
        staff.is_blocked = False
        staff.save()
        return staff, password

    # ── Update ────────────────────────────────────────────────────────────────

    def update(self, instance: Staff, validated_data: dict) -> Staff:
        """Apply supplied fields; always lowercase the email."""
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
        "specialty": student.specialty,
        "academic_year": student.academic_year,
        "level": student.level,
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
        fields = ["id", "name"]
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
    The ``updated_by`` field is set automatically by the view, not the client.

    Note: ``students_can_see_archived_projects`` is the authoritative field
    name on the model — it is exposed as-is.
    """

    class Meta:
        model = PlatformSettings
        fields = ["students_can_see_archived_projects", "jury_page_visible", "students_can_see_jury_column", "contact_email"]
