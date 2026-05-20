import pandas as pd
from django.core.management.base import BaseCommand
from users.models import Student, Staff
from projects.models import Projects, SProjects
from django.db import transaction
import random
import string


class Command(BaseCommand):
    help = "Import projects from Projets_2CPI_2026.xlsx"

    def handle(self, *args, **options):
        file_path = "../Projets_2CPI_2026.xlsx"
        try:
            df = pd.read_excel(file_path, header=7)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading Excel: {e}"))
            return

        # Forward fill the team info
        df["N°equipe"] = df["N°equipe"].ffill()
        df["Encadreur/Co-Encadreur"] = df["Encadreur/Co-Encadreur"].ffill()
        df["Thème"] = df["Thème"].ffill()

        # Group by team
        teams = df.groupby("N°equipe")

        self.stdout.write(f"Found {len(teams)} teams.")

        with transaction.atomic():
            for team_id, members in teams:
                theme = members.iloc[0]["Thème"]
                teacher_raw = members.iloc[0]["Encadreur/Co-Encadreur"]
                
                # Try to find teacher
                teacher = self.find_teacher(teacher_raw)
                
                # Create project
                try:
                    t_id_str = str(int(team_id))
                except:
                    t_id_str = str(team_id)

                project_name = theme if pd.notna(theme) else f"Project Team {t_id_str}"
                invite_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
                
                project = Projects.objects.create(
                    name=project_name,
                    type="Projet",
                    specialty="2CPI",
                    year="2025-2026",
                    academic_level=2,
                    TID=teacher,
                    status="approved",
                    invite_code=invite_code,
                    submitted_to_supervisor=True,
                    final_submission_approved=True,
                    description=f"Project for team {t_id_str} imported from Excel."
                )
                
                self.stdout.write(self.style.SUCCESS(f"Created project: {project.name} (TID: {teacher.TID if teacher else 'None'})"))

                for idx, row in members.iterrows():
                    first_name = str(row["Prénom"]).strip()
                    last_name = str(row["Nom"]).strip()
                    
                    if not first_name or not last_name or first_name == 'nan' or last_name == 'nan':
                        continue

                    # Find or create student
                    student = self.get_or_create_student(first_name, last_name)
                    
                    # Link student to project
                    SProjects.objects.get_or_create(
                        PID=project,
                        CID=student,
                        defaults={"role": "fullstack", "is_leader": (idx == members.index[0])}
                    )

        self.stdout.write(self.style.SUCCESS("Import completed successfully."))

    def find_teacher(self, raw_name):
        if pd.isna(raw_name):
            return None
        
        name = str(raw_name).lower()
        # Common patterns: "Mr. AWAD", "Mme BOUSMAHA", "Mr, AWAD"
        clean_name = name.replace("mr.", "").replace("mme", "").replace("mr,", "").strip()
        
        # Try exact match on last name + Professor
        staff = Staff.objects.filter(last_name__icontains=clean_name).first()
        if staff:
            return staff
        
        # Try full name contains
        staff = Staff.objects.filter(first_name__icontains=clean_name).first()
        if staff:
            return staff
            
        return None

    def get_or_create_student(self, first_name, last_name):
        # Match by name
        student = Student.objects.filter(first_name__iexact=first_name, last_name__iexact=last_name).first()
        if student:
            return student
        
        # Create new student
        # Generate dummy CID
        last_cid = Student.objects.all().order_by("-CID").first()
        new_cid = (last_cid.CID + 1) if last_cid else 20260001
        
        email = f"{last_name.lower().replace(' ', '')}.{first_name.lower().replace(' ', '')}@esi.dz"
        # Ensure email uniqueness
        if Student.objects.filter(email=email).exists():
            email = f"{last_name.lower()}{random.randint(1,99)}.{first_name.lower()}@esi.dz"

        student = Student.objects.create(
            CID=new_cid,
            email=email,
            first_name=first_name,
            last_name=last_name,
            academic_year="2025-2026",
            level=2,
            specialty="2CPI",
            department="Cycle Préparatoire"
        )
        student.set_password("student123")
        student.save()
        return student
