# seed_archived.py
# Run from the backend directory: python manage.py shell < seed_archived.py

import random, string, datetime
from django.utils import timezone

from users.models import Student, Staff
from projects.models import Projects, SProjects, ProjectAttachment
from jury.models import ProjectJury, Schedule, Grades, GradingFormula

# ── helpers ──────────────────────────────────────────────────────────

def make_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not Projects.objects.filter(invite_code=code).exists():
            return code

# ── pick existing users ───────────────────────────────────────────────

students = list(Student.objects.all()[:9])
teachers = list(Staff.objects.all()[:3])

if len(students) < 6:
    print("ERROR: need at least 6 students in the DB. Create some first.")
    exit()
if len(teachers) < 3:
    print("ERROR: need at least 3 staff in the DB. Create some first.")
    exit()

t1, t2, t3 = teachers[0], teachers[1], teachers[2]

# ── formula (reuse active one or create a simple one) ─────────────────

formula = GradingFormula.objects.filter(is_active=True).first()
if not formula:
    formula = GradingFormula.objects.create(
        name="Default",
        expression="(g1 + g2) / 2",
        labels={"g1": "Oral", "g2": "Report"},
        is_active=True,
    )

# ── project data ──────────────────────────────────────────────────────

PROJECTS = [
    {
        "name": "ESI Smart Campus",
        "type": "PFE",
        "specialty": "ISI",
        "description": "A smart campus management system using IoT sensors and a Django REST backend.",
        "tech_stack": "Django,React,PostgreSQL,MQTT",
        "supervisor": t1,
        "president": t1, "examiner1": t2, "examiner2": t3,
        "members": students[0:2],
        "grade1": 16.0, "grade2": 15.0,
        "room": "Salle A1",
        "dept": "SUP",
        "year": "2023-2024",
    },
    {
        "name": "Plateforme de Suivi PFE",
        "type": "PFE",
        "specialty": "SIW",
        "description": "An end-to-end platform for tracking final year projects, meetings and submissions.",
        "tech_stack": "Django,Vue.js,Redis,Celery",
        "supervisor": t2,
        "president": t2, "examiner1": t1, "examiner2": t3,
        "members": students[2:4],
        "grade1": 14.5, "grade2": 13.0,
        "room": "Salle B2",
        "dept": "PREP",
        "year": "2023-2024",
    },
    {
        "name": "Système de Détection d'Intrusion",
        "type": "PFE",
        "specialty": "SSI",
        "description": "A network intrusion detection system using ML models trained on the CICIDS2017 dataset.",
        "tech_stack": "Python,Scikit-learn,FastAPI,React",
        "supervisor": t3,
        "president": t3, "examiner1": t1, "examiner2": t2,
        "members": students[4:6],
        "grade1": 18.0, "grade2": 17.5,
        "room": "Salle C3",
        "dept": "SUP",
        "year": "2022-2023",
    },
]

# ── seed ──────────────────────────────────────────────────────────────

for i, p in enumerate(PROJECTS):
    proj = Projects.objects.create(
        name=p["name"],
        type=p["type"],
        specialty=p["specialty"],
        description=p["description"],
        tech_stack=p["tech_stack"],
        year=p["year"],
        academic_level=4,
        TID=p["supervisor"],
        status="approved",
        archived=True,
        is_public=True,
        final_submission_approved=True,
        submitted_to_supervisor=True,
        finish_date=datetime.date(2024, 6, 15),
        invite_code=make_code(),
    )

    # members
    for j, student in enumerate(p["members"]):
        SProjects.objects.get_or_create(
            CID=student,
            PID=proj,
            defaults={"role": "fullstack", "is_leader": j == 0},
        )

    # jury
    jury = ProjectJury.objects.create(
        PID=proj,
        teacher1_id=p["president"],
        teacher2_id=p["examiner1"],
        teacher3_id=p["examiner2"],
    )

    # schedule
    base_date = datetime.date(2024, 6, 10 + i)
    Schedule.objects.create(
        PID=proj,
        presentation_date=base_date,
        presentation_time=datetime.time(9 + i, 0),
        room=p["room"],
        department_name=p["dept"],
    )

    # grades — set values and let Grades.save() compute final_grade
    avg = (p["grade1"] + p["grade2"]) / 2
    Grades.objects.create(
        PID=proj,
        formula=formula,
        values={"g1": p["grade1"], "g2": p["grade2"]},
        final_grade=avg,
        comments="Bon travail.",
        graded_at=timezone.now(),
        formula_snapshot={
            "expression": formula.expression,
            "labels": formula.labels,
        },
    )

    # dummy attachments (no real file — file field left blank, file_url will be None)
    for fname, atype in [
        (f"rapport_final_{i+1}.pdf", "report"),
        (f"presentation_{i+1}.pptx", "other"),
    ]:
        ProjectAttachment.objects.create(
            PID=proj,
            filename=fname,
            attachment_type=atype,
            uploaded_at=timezone.now(),
        )

    print(f"✅ Created: {proj.name} (PID={proj.PID})")

print("\nDone. 3 archived projects seeded.")