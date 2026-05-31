"""
ESI GIT — Full Database Seed
=============================
Place in ESI_GIT_Backend/ (next to manage.py) and run:
    python seed.py

Wipes all data, then creates:
  - Platform settings
  - Departments + specialties
  - Admin (known password)
  - Teachers (random passwords, first_login then completed)
  - Students (random passwords, first_login then completed)
  - Grading formula (active)
  - Active projects (some with supervisor, some without)
  - Archived projects (supervisor + 3+ members + jury + grades)
  - Tasks, meetings, notifications
"""

import os, sys, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ESI_GIT.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from datetime import date, time, timedelta
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.hashers import make_password

from users.models import Student, Staff
from projects.models import Projects, SProjects, SupervisorRequest
from admin_panel.models import Department, Specialty, PlatformSettings
from admin_panel.serializers import CreateStudentSerializer, CreateStaffSerializer
from jury.models import GradingFormula, ProjectJury, Schedule, Grades
from meetings.models import Meeting
from tasks.models import Task, TaskAssignment
from notifications.models import Notification

import random, string

YEAR = "2024-2025"   # ONE format used everywhere — dashes

# ─────────────────────────────────────────────────────────────
# WIPE
# ─────────────────────────────────────────────────────────────
def wipe():
    print("Wiping all data...")
    Notification.objects.all().delete()
    Grades.objects.all().delete()
    Schedule.objects.all().delete()
    ProjectJury.objects.all().delete()
    GradingFormula.objects.all().delete()
    TaskAssignment.objects.all().delete()
    Task.objects.all().delete()
    Meeting.objects.all().delete()
    SupervisorRequest.objects.all().delete()
    SProjects.objects.all().delete()
    Projects.objects.all().delete()
    Specialty.objects.all().delete()
    Department.objects.all().delete()
    PlatformSettings.objects.all().delete()
    Student.objects.all().delete()
    Staff.objects.all().delete()
    print("  Done.\n")

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def invite_code():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

def make_staff(email, first_name, last_name, is_admin=False, is_teacher=True):
    """Uses CreateStaffSerializer exactly as the admin UI does."""
    ser = CreateStaffSerializer(data={
        "email": email, "first_name": first_name, "last_name": last_name,
        "is_admin": is_admin, "is_teacher": is_teacher, "is_active": True,
    })
    assert ser.is_valid(), f"Staff error {email}: {ser.errors}"
    staff, password = ser.save()
    return staff, password

def make_student(cid, email, first_name, last_name, specialty, level):
    """Uses CreateStudentSerializer exactly as the admin UI does."""
    ser = CreateStudentSerializer(data={
        "CID": cid, "email": email, "first_name": first_name,
        "last_name": last_name, "specialty": specialty,
        "academic_year": YEAR, "is_active": True,
    })
    assert ser.is_valid(), f"Student error {email}: {ser.errors}"
    student, password = ser.save()
    student.level = level
    student.save()
    return student, password

def complete_first_login(user, new_password="a"):
    """Simulates user completing the first-login password change."""
    user.set_password(new_password)
    user.is_first_login = False
    user.save()
    return new_password

# ─────────────────────────────────────────────────────────────
# SEED
# ─────────────────────────────────────────────────────────────
@transaction.atomic
def seed():
    wipe()
    creds = {}

    # ── Platform settings ─────────────────────────────────────
    print("Platform settings...")
    PlatformSettings.objects.create(
        students_can_see_archived_projects=True,
        jury_page_visible=True,
        current_academic_year=YEAR,
        project_types="PFE,Stage,Projet,Master",
        contact_email="admin@esi.dz",
    )

    # ── Departments & specialties ─────────────────────────────
    print("Departments & specialties...")
    dept_cs  = Department.objects.create(name="Computer Science")
    dept_net = Department.objects.create(name="Networks & Telecom")
    Specialty.objects.create(name="ISI",  department=dept_cs)
    Specialty.objects.create(name="SIW",  department=dept_cs)
    Specialty.objects.create(name="IASD", department=dept_cs)
    Specialty.objects.create(name="RSD",  department=dept_net)
    Specialty.objects.create(name="SIL",  department=dept_cs)

    # ── Admin ─────────────────────────────────────────────────
    print("Admin...")
    admin = Staff(
        email="admin@esi.dz", first_name="Ali", last_name="Bensalem",
        is_admin=True, is_teacher=True, available=True,
        specialty="ISI", department="Computer Science",
        is_first_login=False, is_active=True, is_blocked=False,
    )
    admin.set_password("a")
    admin.save()
    creds["admin@esi.dz"] = "a  (admin+teacher)"

    # ── Teachers ──────────────────────────────────────────────
    print("Teachers...")

    t1, p = make_staff("benali@esi.dz",      "Mohamed", "Benali")
    t1.specialty = "ISI";  t1.department = "Computer Science"; t1.save()
    creds["benali@esi.dz"]      = complete_first_login(t1)

    t2, p = make_staff("cherif@esi.dz",      "Fatima",  "Cherif")
    t2.specialty = "SIW";  t2.department = "Computer Science"; t2.save()
    creds["cherif@esi.dz"]      = complete_first_login(t2)

    t3, p = make_staff("meziane@esi.dz",     "Karim",   "Meziane")
    t3.specialty = "IASD"; t3.department = "Computer Science"; t3.save()
    creds["meziane@esi.dz"]     = complete_first_login(t3)

    t4, p = make_staff("hadj@esi.dz",        "Samira",  "Hadj")
    t4.specialty = "RSD";  t4.department = "Networks & Telecom"; t4.save()
    creds["hadj@esi.dz"]        = complete_first_login(t4)

    # Unavailable — won't appear in supervisor list
    t5, p = make_staff("bouali@esi.dz",      "Omar",    "Bouali")
    t5.specialty = "ISI"; t5.department = "Computer Science"
    t5.available = False; t5.save()
    creds["bouali@esi.dz"]      = complete_first_login(t5) + "  (unavailable)"

    # Still on first login — won't appear in supervisor list
    t6, p = make_staff("newteacher@esi.dz",  "Nadia",   "Kaci")
    t6.specialty = "SIW"; t6.department = "Computer Science"; t6.save()
    creds["newteacher@esi.dz"]  = p + "  (first_login=True)"

    # ── Students ──────────────────────────────────────────────
    print("Students...")

    s1,  p = make_student(20210001, "amira.brahimi@esi.dz",    "Amira",   "Brahimi",   "ISI",  3)
    creds["amira.brahimi@esi.dz"]    = complete_first_login(s1)

    s2,  p = make_student(20210002, "yacine.djebbar@esi.dz",   "Yacine",  "Djebbar",   "ISI",  3)
    creds["yacine.djebbar@esi.dz"]   = complete_first_login(s2)

    s3,  p = make_student(20210003, "lina.mansouri@esi.dz",    "Lina",    "Mansouri",  "ISI",  3)
    creds["lina.mansouri@esi.dz"]    = complete_first_login(s3)

    s4,  p = make_student(20210004, "rayan.benkhaled@esi.dz",  "Rayan",   "Benkhaled", "SIW",  3)
    creds["rayan.benkhaled@esi.dz"]  = complete_first_login(s4)

    s5,  p = make_student(20210005, "sara.aouad@esi.dz",       "Sara",    "Aouad",     "SIW",  3)
    creds["sara.aouad@esi.dz"]       = complete_first_login(s5)

    s6,  p = make_student(20210006, "ilyes.mekki@esi.dz",      "Ilyes",   "Mekki",     "SIW",  3)
    creds["ilyes.mekki@esi.dz"]      = complete_first_login(s6)

    s7,  p = make_student(20210007, "nour.boudaa@esi.dz",      "Nour",    "Boudaa",    "IASD", 3)
    creds["nour.boudaa@esi.dz"]      = complete_first_login(s7)

    s8,  p = make_student(20210008, "amine.rahmani@esi.dz",    "Amine",   "Rahmani",   "IASD", 3)
    creds["amine.rahmani@esi.dz"]    = complete_first_login(s8)

    s9,  p = make_student(20210009, "yasmine.hadjali@esi.dz",  "Yasmine", "Hadjali",   "IASD", 3)
    creds["yasmine.hadjali@esi.dz"]  = complete_first_login(s9)

    # No group
    s10, p = make_student(20210010, "hamza.khelil@esi.dz",     "Hamza",   "Khelil",    "ISI",  3)
    creds["hamza.khelil@esi.dz"]     = complete_first_login(s10) + "  (no group)"

    # Still on first login
    s11, p = make_student(20210011, "new.student@esi.dz",      "Meriem",  "Zidane",    "ISI",  1)
    creds["new.student@esi.dz"]      = p + "  (first_login=True)"

    # ── Grading formula (create BEFORE grades) ────────────────
    print("Grading formula...")
    formula = GradingFormula.objects.create(
        name="PFE 2024-2025",
        expression="(g1*4 + g2*3 + g3*2 + g4*1) / 10",
        labels={
            "g1": "Continuous work",
            "g2": "Final product",
            "g3": "Oral defense",
            "g4": "Report",
        },
        description="Standard PFE grading formula for 2024-2025",
        is_active=True,
        created_by=admin,
    )

    # ── Active projects ───────────────────────────────────────
    print("Active projects...")
    today = date.today()

    # P1 — supervisor assigned, jury assigned, submission approved
    p1 = Projects.objects.create(
        name="Smart Campus Platform", type="PFE",
        specialty="ISI", year=YEAR, academic_level=3,
        TID=t1, github_url="https://github.com/esi/smart-campus",
        tech_stack="React,Django,PostgreSQL",
        description="Smart campus management with IoT integration.",
        status="approved", invite_code=invite_code(),
        submitted_to_supervisor=True, final_submission_approved=True,
        final_submission_date=timezone.now() - timedelta(days=5),
        is_public=True,
    )
    SProjects.objects.create(CID=s1, PID=p1, role="fullstack", is_leader=True)
    SProjects.objects.create(CID=s2, PID=p1, role="backend",   is_leader=False)
    SProjects.objects.create(CID=s3, PID=p1, role="frontend",  is_leader=False)
    ProjectJury.objects.create(PID=p1, teacher1_id=t3, teacher2_id=t4, teacher3_id=t1)
    Schedule.objects.create(
        PID=p1, presentation_date=today + timedelta(days=14),
        presentation_time=time(10, 0), room="Amphi A", duration_minutes=30,
    )

    # P2 — supervisor assigned, submitted awaiting approval
    p2 = Projects.objects.create(
        name="E-Learning Platform", type="PFE",
        specialty="SIW", year=YEAR, academic_level=3,
        TID=t2, tech_stack="Vue.js,Node.js,MongoDB",
        description="E-learning platform for university courses.",
        status="approved", invite_code=invite_code(),
        submitted_to_supervisor=True, final_submission_approved=False,
        is_public=True,
    )
    SProjects.objects.create(CID=s4, PID=p2, role="fullstack", is_leader=True)
    SProjects.objects.create(CID=s5, PID=p2, role="frontend",  is_leader=False)
    SProjects.objects.create(CID=s6, PID=p2, role="backend",   is_leader=False)

    # P3 — supervisor assigned, not submitted yet
    p3 = Projects.objects.create(
        name="AI Grading Assistant", type="PFE",
        specialty="IASD", year=YEAR, academic_level=3,
        TID=t3, tech_stack="Python,FastAPI,TensorFlow",
        description="AI-powered assistant for automated code grading.",
        status="approved", invite_code=invite_code(),
        submitted_to_supervisor=False, final_submission_approved=False,
        is_public=True,
    )
    SProjects.objects.create(CID=s7, PID=p3, role="backend",   is_leader=True)
    SProjects.objects.create(CID=s8, PID=p3, role="backend",   is_leader=False)
    SProjects.objects.create(CID=s9, PID=p3, role="fullstack", is_leader=False)

    # P4 — NO supervisor, pending request
    p4 = Projects.objects.create(
        name="Student Portal Redesign", type="Stage",
        specialty="ISI", year=YEAR, academic_level=3,
        TID=None, tech_stack="React,TailwindCSS",
        description="Redesigning the student portal with modern UX.",
        status="pending", invite_code=invite_code(), is_public=True,
    )
    SProjects.objects.create(CID=s10, PID=p4, role="frontend", is_leader=True)
    SupervisorRequest.objects.create(
        project_id=p4, teacher_id=t1, status="pending",
        message="We would love to have you as our supervisor.",
    )

    # P5 — supervisor assigned, submission rejected with feedback
    p5 = Projects.objects.create(
        name="Blockchain Voting System", type="PFE",
        specialty="ISI", year=YEAR, academic_level=3,
        TID=t1, tech_stack="Solidity,React,Web3.js",
        description="Decentralized voting system using blockchain.",
        status="approved", invite_code=invite_code(),
        submitted_to_supervisor=False, final_submission_approved=False,
        supervisor_feedback="Documentation is incomplete. Add the technical architecture section.",
        is_public=True,
    )
    # Note: s2 and s3 are in p5 as well — intentional edge case
    SProjects.objects.create(CID=s2, PID=p5, role="backend",   is_leader=True)
    SProjects.objects.create(CID=s3, PID=p5, role="frontend",  is_leader=False)
    SProjects.objects.create(CID=s1, PID=p5, role="fullstack", is_leader=False)

    # ── Tasks ─────────────────────────────────────────────────
    print("Tasks...")

    def task(proj, title, desc, ptype, priority, state, days, creator):
        return Task.objects.create(
            PID=proj, title=title, description=desc, type=ptype,
            priority=priority, state=state,
            deadline=today + timedelta(days=days), created_by=creator,
        )

    ta1 = task(p1, "Setup CI/CD",       "Configure GitHub Actions.",     "devops",   3, "done",        -10, s1)
    ta2 = task(p1, "Database schema",   "Create ERD and PostgreSQL.",    "backend",  3, "done",        -5,  s2)
    ta3 = task(p1, "Auth module",       "JWT authentication.",           "backend",  2, "in_progress",  5,  s1)
    ta4 = task(p1, "Dashboard UI",      "React dashboard with charts.",  "frontend", 2, "todo",         10, s3)
    ta5 = task(p1, "Final report",      "Complete all report sections.", "docs",     1, "todo",         20, s1)
    TaskAssignment.objects.create(task_id=ta1, CID=s2)
    TaskAssignment.objects.create(task_id=ta2, CID=s2)
    TaskAssignment.objects.create(task_id=ta3, CID=s2)
    TaskAssignment.objects.create(task_id=ta3, CID=s3)
    TaskAssignment.objects.create(task_id=ta4, CID=s3)
    TaskAssignment.objects.create(task_id=ta5, CID=s1)

    tb1 = task(p2, "API docs",          "Write OpenAPI docs.",           "docs",     2, "in_progress",  7,  s4)
    tb2 = task(p2, "Video player",      "Integrate HLS player.",         "frontend", 3, "todo",         14, s5)
    TaskAssignment.objects.create(task_id=tb1, CID=s4)
    TaskAssignment.objects.create(task_id=tb2, CID=s5)

    tc1 = task(p3, "Train model",       "Fine-tune transformer model.",  "ml",       3, "in_progress",  3,  s7)
    TaskAssignment.objects.create(task_id=tc1, CID=s8)

    # ── Meetings ──────────────────────────────────────────────
    print("Meetings...")

    Meeting.objects.create(PID=p1, title="Sprint Review #3",      date=today+timedelta(days=3),  time=time(10,0),  location="Room A101",      created_by_staff=t1,   status="approved")
    Meeting.objects.create(PID=p1, title="Final submission prep",  date=today+timedelta(days=10), time=time(14,0),  location="Online - Teams", created_by_staff=t1,   status="approved")
    Meeting.objects.create(PID=p2, title="Progress check",        date=today+timedelta(days=5),  time=time(11,0),  location="Room B203",      created_by_staff=t2,   status="approved")
    Meeting.objects.create(PID=p3, title="Model evaluation",      date=today+timedelta(days=4),  time=time(9,0),   location="Lab 3",          created_by_staff=t3,   status="approved")
    Meeting.objects.create(PID=p1, title="Architecture Q&A",      date=today+timedelta(days=7),  time=time(15,30), location="Library",        created_by_student=s1, status="pending")
    Meeting.objects.create(PID=p3, title="Progress discussion",   date=today+timedelta(days=6),  time=time(10,0),  location="Room C102",      created_by_student=s7, status="pending")
    Meeting.objects.create(PID=p1, title="Kick-off",              date=today-timedelta(days=30), time=time(10,0),  location="Room A101",      created_by_staff=t1,   status="approved")
    Meeting.objects.create(PID=p2, title="Initial briefing",      date=today-timedelta(days=25), time=time(14,0),  location="Room B203",      created_by_staff=t2,   status="approved")
    Meeting.objects.create(PID=p1, title="Mid-term review",       date=today-timedelta(days=10), time=time(11,0),  location="Room A101",      created_by_staff=t1,   status="cancelled", cancellation_reason="Teacher unavailable — conference.")

    # ── Archived projects ─────────────────────────────────────
    print("Archived projects...")
    PREV = "2023-2024"

    def archived_student(cid, email, first, last, spec):
        ser = CreateStudentSerializer(data={
            "CID": cid, "email": email, "first_name": first, "last_name": last,
            "specialty": spec, "academic_year": PREV, "is_active": True,
        })
        assert ser.is_valid(), f"Archived student error {email}: {ser.errors}"
        s, _ = ser.save()
        s.level = 3
        complete_first_login(s)
        s.save()
        return s

    as1 = archived_student(20200001, "archived.s1@esi.dz", "Karim",   "Ait",       "ISI")
    as2 = archived_student(20200002, "archived.s2@esi.dz", "Sabrina", "Bouzid",    "ISI")
    as3 = archived_student(20200003, "archived.s3@esi.dz", "Walid",   "Ferhat",    "ISI")
    as4 = archived_student(20200004, "archived.s4@esi.dz", "Imane",   "Djaballah", "SIW")
    as5 = archived_student(20200005, "archived.s5@esi.dz", "Sofiane", "Larbaoui",  "SIW")
    as6 = archived_student(20200006, "archived.s6@esi.dz", "Meriem",  "Ouali",     "SIW")
    as7 = archived_student(20200007, "archived.s7@esi.dz", "Tarek",   "Hamidi",    "IASD")
    as8 = archived_student(20200008, "archived.s8@esi.dz", "Rania",   "Zerrouki",  "IASD")
    as9 = archived_student(20200009, "archived.s9@esi.dz", "Nassim",  "Benkara",   "IASD")

    def make_archived(name, ptype, spec, supervisor, members, tech, desc, grade_vals, room, pdate, ptime, year=PREV):
        p = Projects.objects.create(
            name=name, type=ptype, specialty=spec, year=year, academic_level=3,
            TID=supervisor, tech_stack=tech, description=desc,
            status="approved", invite_code=invite_code(),
            submitted_to_supervisor=True, final_submission_approved=True,
            final_submission_date=timezone.now() - timedelta(days=200),
            archived=True, is_public=True, finish_date=date(2024, 6, 15),
        )
        for student, role, leader in members:
            SProjects.objects.create(CID=student, PID=p, role=role, is_leader=leader)

        ProjectJury.objects.create(
            PID=p,
            teacher1_id=supervisor,
            teacher2_id=t3 if supervisor != t3 else t4,
            teacher3_id=t4 if supervisor != t4 else t1,
        )
        Schedule.objects.create(
            PID=p, presentation_date=pdate, presentation_time=ptime,
            room=room, duration_minutes=30,
        )
        # Create grades — formula must be active for calculate_final_grade to work
        g = Grades(PID=p, formula=formula, values=grade_vals, comments="Good project overall.")
        g.save()
        return p

    make_archived(
        "Healthcare Management System", "PFE", "ISI", t1,
        [(as1,"fullstack",True),(as2,"backend",False),(as3,"frontend",False)],
        "React,Django,PostgreSQL",
        "Full-stack healthcare management system for clinic operations.",
        {"g1":16.0,"g2":15.0,"g3":14.0,"g4":13.0},
        "Amphi A", date(2024,6,10), time(9,0),
    )
    make_archived(
        "IoT Home Automation", "PFE", "SIW", t2,
        [(as4,"backend",True),(as5,"frontend",False),(as6,"fullstack",False)],
        "Python,MQTT,React",
        "Home automation using IoT devices and MQTT protocol.",
        {"g1":14.0,"g2":13.0,"g3":15.0,"g4":12.0},
        "Amphi B", date(2024,6,10), time(10,0),
    )
    make_archived(
        "NLP Arabic Text Classifier", "PFE", "IASD", t3,
        [(as7,"backend",True),(as8,"backend",False),(as9,"fullstack",False)],
        "Python,PyTorch,FastAPI",
        "Arabic text classification using transformer models.",
        {"g1":18.0,"g2":17.0,"g3":16.0,"g4":15.0},
        "Salle C", date(2024,6,11), time(9,0),
    )
    make_archived(
        "University ERP System", "PFE", "SIW", t2,
        [(as4,"fullstack",True),(as5,"backend",False),(as6,"frontend",False)],
        "Angular,Spring Boot,MySQL",
        "Enterprise resource planning for university management.",
        {"g1":12.0,"g2":11.0,"g3":13.0,"g4":10.0},
        "Amphi A", date(2024,6,12), time(14,0),
        year="2022-2023",
    )

    # ── Notifications ─────────────────────────────────────────
    print("Notifications...")
    Notification.objects.bulk_create([
        Notification(title="Supervisor accepted",  message="Your supervisor request was accepted.",            recipient_type="student", recipient_id=s1.CID,  is_read=False),
        Notification(title="New meeting",          message="Sprint Review #3 scheduled.",                     recipient_type="student", recipient_id=s1.CID,  is_read=False),
        Notification(title="Submission rejected",  message="Your supervisor sent feedback on your submission.",recipient_type="student", recipient_id=s4.CID,  is_read=False),
        Notification(title="Supervisor request",   message="Smart Campus Platform requests your supervision.", recipient_type="staff",   recipient_id=t1.TID,  is_read=False),
        Notification(title="Submission to review", message="E-Learning Platform submitted for approval.",      recipient_type="staff",   recipient_id=t2.TID,  is_read=False),
        Notification(title="Meeting request",      message="Student requested a meeting for project p3.",      recipient_type="staff",   recipient_id=t3.TID,  is_read=False),
    ])

    # ── Print credentials ─────────────────────────────────────
    print("\n" + "="*65)
    print("SEED COMPLETE")
    print("="*65)
    print(f"  Staff:     {Staff.objects.count()} (1 admin, {Staff.objects.filter(is_teacher=True, is_admin=False).count()} teachers)")
    print(f"  Students:  {Student.objects.count()}")
    print(f"  Projects:  {Projects.objects.filter(archived=False).count()} active, {Projects.objects.filter(archived=True).count()} archived")
    print(f"  Tasks:     {Task.objects.count()}")
    print(f"  Meetings:  {Meeting.objects.count()}")
    print(f"  Juries:    {ProjectJury.objects.count()}")
    print(f"  Grades:    {Grades.objects.count()} (check final_grade is not null)")
    print()
    print("CREDENTIALS:")
    print("-"*65)
    for email, pw in sorted(creds.items()):
        print(f"  {email:<42} {pw}")
    print()
    print("ACTIVE PROJECTS:")
    print(f"  p1 Smart Campus    — supervisor=benali, jury assigned, submission APPROVED → test jury page as meziane (president)")
    print(f"  p2 E-Learning      — supervisor=cherif, submitted, awaiting approval       → test teacher approve flow")
    print(f"  p3 AI Grading      — supervisor=meziane, not submitted yet                 → test normal in-progress state")
    print(f"  p4 Portal Redesign — NO supervisor, pending request to benali              → test requests page")
    print(f"  p5 Blockchain      — supervisor=benali, submission REJECTED with feedback  → test rejection flow")
    print()
    print("NOTE: academic_year uses dashes everywhere: '2024-2025'")
    print("="*65)


seed()