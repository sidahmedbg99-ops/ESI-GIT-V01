from django.db import models
from users.models import Staff


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Department(TimeStampedModel):
    PREP = 'PREP'
    SUP  = 'SUP'
    CYCLE_CHOICES = [(PREP, 'Preparatory Cycle'), (SUP, 'Superior Cycle')]

    id    = models.AutoField(primary_key=True)
    cycle = models.CharField(max_length=10, choices=CYCLE_CHOICES, unique=True, default='PREP')

    def __str__(self):
        return self.cycle

class Specialty(TimeStampedModel):
    id         = models.AutoField(primary_key=True)
    name       = models.CharField(max_length=50, unique=True)   # abbreviation e.g. "ISI"
    full_name  = models.CharField(max_length=255, default='')                # e.g. "Computer Systems Engineering"
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="specialties"
    )

    def __str__(self):
        return f"{self.name} - {self.full_name}"
    

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