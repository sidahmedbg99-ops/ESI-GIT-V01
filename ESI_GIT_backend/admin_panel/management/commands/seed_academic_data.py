from django.core.management.base import BaseCommand
from admin_panel.models import Department, Specialty


class Command(BaseCommand):
    help = "Seed departments and specialties"

    def handle(self, *args, **kwargs):

        data = {
            "Preparatory Class": [],
            "Second Cycle": [
                "Information Systems and Web (SIW)",
                "Computer Systems Engineering (ISI)",
                "Artificial Intelligence and Data Science (IASD)",
                "Cybersecurity (CYS)",
            ],
        }

        for dept_name, specialties in data.items():
            dept, _ = Department.objects.get_or_create(name=dept_name)

            for spec_name in specialties:
                Specialty.objects.get_or_create(name=spec_name, department=dept)

        self.stdout.write(self.style.SUCCESS("Academic data seeded!"))
