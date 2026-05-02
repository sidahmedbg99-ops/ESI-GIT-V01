from django.db.models.signals import post_migrate
from django.dispatch import receiver
from .models import PlatformSettings


@receiver(post_migrate)
def create_default_settings(sender, **kwargs):
    """
    Ensures that ONE settings row always exists after migrations.
    """
    if not PlatformSettings.objects.exists():
        PlatformSettings.objects.create(students_can_see_archived_projects=False)
