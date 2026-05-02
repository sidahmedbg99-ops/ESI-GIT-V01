"""
Management Command: Auto Archive Projects

This command automatically archives projects from previous academic years.

Academic year rule:
- Academic year starts in July.
- Example:
    If today = March 2026 → current academic year = 2025
    If today = October 2026 → current academic year = 2026
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from projects.models import Projects


class Command(BaseCommand):
    help = "Automatically archive old projects based on academic year"

    def handle(self, *args, **kwargs):
        today = timezone.now().date()

        # Determine current academic year
        if today.month < 7:
            current_academic_year = today.year - 1
        else:
            current_academic_year = today.year

        # Find projects older than current academic year
        old_projects = Projects.objects.filter(
            year__lt=current_academic_year, archived=False
        )

        count = old_projects.update(archived=True)

        if count == 0:
            self.stdout.write(self.style.WARNING("No projects to archive."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"{count} projects archived successfully.")
            )
