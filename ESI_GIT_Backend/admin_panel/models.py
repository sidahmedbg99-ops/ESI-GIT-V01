from django.db import models
from users.models import Staff, Student


def _current_academic_year():
    """
    Returns the current academic year as a string e.g. "2025-2026".
    Academic year starts in September — so from September onwards we're
    in year X to X+1, and from January to August we're still in (X-1) to X.
    """
    from datetime import date
    today = date.today()
    if today.month >= 9:
        return f"{today.year}-{today.year + 1}"
    else:
        return f"{today.year - 1}-{today.year}"


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
    students_can_see_attachments       = models.BooleanField(default=False)
    # added: controls whether students can see who their jury members are
    jury_page_visible                  = models.BooleanField(default=False)
    # added: displayed across the platform e.g. "2024-2025"
    current_academic_year              = models.CharField(max_length=20, default=_current_academic_year)
    # added: shown on public pages (Home, About) before login
    contact_email                      = models.CharField(max_length=100, default="egit@esi-sba.dz")

    # group formation lock
    group_lock_deadline = models.DateField(null=True, blank=True)

    # per-level grading completion tracking (Feature 4)
    # list of academic_level ints (2-5) that have already been notified this year
    graded_notified_levels = models.JSONField(default=list, blank=True)
    all_graded_notified = models.BooleanField(default=False)

    updated_by = models.ForeignKey(
        Staff, on_delete=models.SET_NULL, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_settings"

    def __str__(self):
        return "Platform Settings"

    @classmethod
    def get_settings(cls):
        """Always returns the singleton settings row, creating it if missing."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Resource(models.Model):
    """
    Shared resource board — anyone can post a file or a link.
    Exactly one of (file, link_url) must be set.
    Admins can moderate (edit/delete, toggle visibility).
    Owners can delete their own post.
    """
    id          = models.AutoField(primary_key=True)
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file        = models.FileField(upload_to='resources/%Y/%m/', null=True, blank=True)
    link_url    = models.URLField(max_length=500, null=True, blank=True)
    category    = models.CharField(max_length=100, blank=True)
    is_visible  = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    # dual uploader tracking (same pattern as Meeting model)
    uploaded_by_student = models.ForeignKey(
        Student, on_delete=models.SET_NULL, null=True, blank=True, related_name='resources'
    )
    uploaded_by_staff = models.ForeignKey(
        Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='resources'
    )

    class Meta:
        db_table = 'resources'
        ordering = ['-created_at']

    def __str__(self):
        return self.title