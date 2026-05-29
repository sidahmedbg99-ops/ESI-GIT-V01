from django.db import models
from users.models import Staff


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Department(TimeStampedModel):
    id   = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.name


class Specialty(TimeStampedModel):
    id         = models.AutoField(primary_key=True)
    name       = models.CharField(max_length=255)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="specialties"
    )

    def __str__(self):
        return f"{self.name} - {self.department.name}"


class PlatformSettings(models.Model):
    """
    Global platform configuration.
    Only ONE row must exist in this table.
    """
    # existing
    students_can_see_archived_projects = models.BooleanField(default=False)

    # added: controls whether students can see who their jury members are
    jury_page_visible                  = models.BooleanField(default=False)

    # added: displayed across the platform e.g. "2024-2025"
    current_academic_year              = models.CharField(max_length=20, default="2024-2025")

    # added: comma-separated allowed project types
    # frontend reads this to populate the type dropdown when creating a project
    # instead of hardcoding options in the frontend
    project_types                      = models.TextField(default="PFE,Stage,Projet")

    # added: shown on public pages (Home, About) before login
    contact_email                      = models.CharField(max_length=100, default="contact@esi.dz")

    updated_by = models.ForeignKey(
        Staff, on_delete=models.SET_NULL, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_settings"

    def __str__(self):
        return "Platform Settings"