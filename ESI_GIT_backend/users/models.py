from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
import random
import string


def generate_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$%"
    return "".join(random.choices(chars, k=length))


class StudentManager(BaseUserManager):

    def create_user(self, email, first_name, last_name, CID, password=None):
        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(
            CID=CID,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
            is_blocked=False,
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, first_name, last_name, CID, password=None):
        user = self.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            CID=CID,
            password=password,
        )

        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class Student(AbstractBaseUser, PermissionsMixin):
    CID = models.BigIntegerField(primary_key=True)  # admin provides this
    email = models.EmailField(max_length=255, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    academic_year = models.CharField(max_length=9, null=True, blank=True)
    # promo 2024/2025
    level = models.IntegerField(null=True, blank=True)
    # 2eme, 3eme, 4eme, or 5eme annee
    specialty = models.CharField(max_length=100, null=True, blank=True)
    is_first_login = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name", "CID"]

    objects = StudentManager()

    class Meta:
        db_table = "students"
        verbose_name = "Student"
        verbose_name_plural = "Students"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def id(self):
        return self.CID


class StaffManager(BaseUserManager):
    def create_staff(
        self, email, first_name, last_name, is_admin=False, is_teacher=True
    ):
        email = self.normalize_email(email)
        plain_password = generate_password()
        staff = self.model(
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_admin=is_admin,
            is_teacher=is_teacher,
            is_first_login=True,
            is_active=True,
            is_blocked=False,
        )
        staff.set_password(plain_password)
        staff.save(using=self._db)
        return staff, plain_password


class Staff(AbstractBaseUser):
    TID = models.BigIntegerField(primary_key=True) # admin provides this
    email = models.EmailField(max_length=255, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    is_admin = models.BooleanField(default=False)
    is_teacher = models.BooleanField(default=True)
    specialty = models.CharField(max_length=100, null=True, blank=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    available = models.BooleanField(default=True)
    is_first_login = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = StaffManager()

    class Meta:
        db_table = "staff"
        verbose_name = "Staff"
        verbose_name_plural = "Staff"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def id(self):
        return self.TID
