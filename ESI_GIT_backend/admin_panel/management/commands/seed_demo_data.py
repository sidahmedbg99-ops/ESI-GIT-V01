from django.core.management.base import BaseCommand
from users.models import Student, Staff
from projects.models import Projects, SProjects
from django.utils import timezone
import random

class Command(BaseCommand):
    help = "Seed the database with 20 users and 9 projects (Archived, Current, Pending)"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding data...")

        # 1. Create Admin
        admin_email = "admin@esi.dz"
        if not Staff.objects.filter(email=admin_email).exists():
            admin = Staff(
                TID=1000,
                email=admin_email,
                first_name="Admin",
                last_name="ESI",
                is_admin=True,
                is_teacher=False,
                is_active=True,
                is_first_login=False
            )
            admin.set_password("password123")
            admin.save()
            self.stdout.write(f"Created Admin: {admin_email}")

        # 2. Create Teachers (10)
        teachers = []
        for i in range(1, 11):
            email = f"teacher{i}@esi.dz"
            if not Staff.objects.filter(email=email).exists():
                teacher = Staff(
                    TID=2000 + i,
                    email=email,
                    first_name=f"Teacher{i}",
                    last_name="SBA",
                    is_admin=False,
                    is_teacher=True,
                    is_active=True,
                    is_first_login=False,
                    available=(i % 3 != 0),
                    specialty=random.choice(["AI", "Cybersecurity", "Software Engineering", "Networks", "Data Science"]),
                    department="Informatique"
                )
                teacher.set_password("password123")
                teacher.save()
                teachers.append(teacher)
            else:
                teachers.append(Staff.objects.get(email=email))
        self.stdout.write(f"Created {len(teachers)} Teachers")

        # 3. Create Students (9)
        students = []
        for i in range(1, 10):
            email = f"student{i}@esi.dz"
            if not Student.objects.filter(email=email).exists():
                student = Student.objects.create_user(
                    email=email,
                    first_name=f"Student{i}",
                    last_name="SBA",
                    CID=3000 + i,
                    password="password123"
                )
                student.level = random.choice([3, 4, 5])
                student.specialty = random.choice(["ISI", "IASD", "GL", "SIQ"])
                student.academic_year = "2024-2025"
                student.is_first_login = False
                student.save()
                students.append(student)
        self.stdout.write(f"Created {len(students)} Students")

        # 4. Create Projects
        
        # A. Archived Projects (3)
        for i in range(1, 4):
            p = Projects.objects.create(
                name=f"Archived Project {i}",
                type="PFE",
                specialty="ISI",
                year="2023-2024",
                status="approved",
                archived=True,
                invite_code=f"ARCH{i}",
                final_submission_approved=True,
                TID=random.choice(teachers)
            )
            # Assign a student
            SProjects.objects.create(CID=students[i-1], PID=p, role="fullstack", is_leader=True)
        self.stdout.write("Created 3 Archived Projects")

        # B. Current Projects (3)
        for i in range(4, 7):
            p = Projects.objects.create(
                name=f"Active Project {i-3}",
                type="PFE",
                specialty="IASD",
                year="2024-2025",
                status="approved",
                archived=False,
                invite_code=f"ACTI{i}",
                TID=random.choice(teachers)
            )
            SProjects.objects.create(CID=students[i-1], PID=p, role="backend", is_leader=True)
        self.stdout.write("Created 3 Active Projects")

        # C. Pending Projects / Need to assign (3)
        for i in range(7, 10):
            p = Projects.objects.create(
                name=f"Pending Project {i-6}",
                type="PFE",
                specialty="GL",
                year="2024-2025",
                status="pending",
                archived=False,
                invite_code=f"PEND{i}",
                TID=None # No teacher
            )
            SProjects.objects.create(CID=students[i-1], PID=p, role="frontend", is_leader=True)
        self.stdout.write("Created 3 Pending Projects")

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
