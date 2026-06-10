"""
Comprehensive dev seed for ESI GIT.
Run from the backend root folder (same level as manage.py):

    python seed.py

Safe to re-run — uses get_or_create where idempotent; project-level creates
(Projects, Tasks, Meetings, Jury, Grades) are skipped when the project already
exists (checked by name).

What it creates
───────────────
Departments   : PREP, SUP
Specialties   : SIW, ISI, IASD, CYS
PlatformSettings: created if missing
GradingFormula: "(g1*4 + g2*4 + g3*2)/10" — 3 components, set as active
Staff (5)     : 4 teachers (1 unavailable) + 1 admin
Students (36) : levels 2–5 across all groups + 6 "prior-year" for archived

Active groups (10 scenarios):
  G1  INCOMPLETE         2CPI, 2 members, no supervisor request yet
  G2  PENDING_REQUEST    2CPI, 3 members, supervisor request pending
  G3  REJECTED_REQUEST   1CS,  3 members, request rejected, needs new one
  G4  ADMIN_ASSIGNED     1CS,  3 members, supervisor admin-forced
  G5  ACTIVE_SUPERVISED  2CS,  3 members, tasks + meetings (mix of states)
  G6  SUBMITTED          2CS,  3 members, submitted_to_supervisor=True
  G7  FINAL_APPROVED     3CS,  3 members, final_submission_approved=True
  G8  JURY_ONLY          3CS,  3 members, jury assigned, no defense date
  G9  DEFENSE_SCHEDULED  3CS,  3 members, jury + future defense date
  G10 GRADED_CURRENT     3CS,  3 members, graded this year, not archived

Archived groups (2 — from 2024-2025):
  G11 ARCHIVED_PUBLIC    3CS, graded, archived, is_public=True
  G12 ARCHIVED_HIDDEN    3CS, graded, archived, is_public=False

Login info
──────────
  All users: password = ESIdev2025!
  Admin/teacher email pattern : initial.lastname@esi.dz  (e.g. k.boukhalfa@esi.dz)
  Student email pattern       : initial.lastname@esi.dz  (e.g. a.bensalem@esi.dz)
"""

import os
import sys
import random
import string
import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ESI_GIT.settings")

import django
django.setup()

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from django.utils import timezone

from admin_panel.models import Department, Specialty, PlatformSettings
from users.models import Student, Staff
from projects.models import Projects, SProjects, SupervisorRequest, ProjectAttachment
from tasks.models import Task, TaskAssignment
from meetings.models import Meeting, MeetingAttendance
from jury.models import GradingFormula, ProjectJury, Schedule, Grades

# ── Config ────────────────────────────────────────────────────────────────────

SEED_PASSWORD = "ESIdev2025!"
CURRENT_YEAR  = "2025-2026"
PRIOR_YEAR    = "2024-2025"

SPECIALTIES = {
    "SIW":  "Systèmes d'Information et Web",
    "ISI":  "Ingénierie des Systèmes Informatiques",
    "IASD": "Intelligence Artificielle et Science des Données",
    "CYS":  "Cybersécurité",
}

STAFF_DATA = [
    # last_name used as lookup key below — keep unique
    {"first_name": "Kamel",   "last_name": "Boukhalfa", "is_admin": False, "specialty": "ISI",  "available": True},
    {"first_name": "Nadia",   "last_name": "Sellami",   "is_admin": False, "specialty": "SIW",  "available": True},
    {"first_name": "Bilal",   "last_name": "Hamidi",    "is_admin": False, "specialty": "IASD", "available": True},
    {"first_name": "Asma",    "last_name": "Redjimi",   "is_admin": False, "specialty": "CYS",  "available": False},  # unavailable
    {"first_name": "Tarek",   "last_name": "Mansouri",  "is_admin": True,  "specialty": "ISI",  "available": True},   # admin
]

STUDENTS_DATA = [
    # ─ Level 2 (2CPI) — 6 students ─────────────────────────────────────────
    # G1 (2 members, incomplete): s221101, s221102
    # G2 (3 members, pending req): s221103, s221104, s221105
    # s221106: no group (lone student)
    {"CID": 221101, "first_name": "Amine",     "last_name": "Bensalem",   "level": 2, "specialty": None},
    {"CID": 221102, "first_name": "Sara",       "last_name": "Meziane",    "level": 2, "specialty": None},
    {"CID": 221103, "first_name": "Youcef",     "last_name": "Ouali",      "level": 2, "specialty": None},
    {"CID": 221104, "first_name": "Lina",       "last_name": "Hadj",       "level": 2, "specialty": None},
    {"CID": 221105, "first_name": "Rayan",      "last_name": "Cherif",     "level": 2, "specialty": None},
    {"CID": 221106, "first_name": "Imene",      "last_name": "Boudiaf",    "level": 2, "specialty": None},

    # ─ Level 3 (1CS) — 6 students ─────────────────────────────────────────
    # G3 (3 members, rejected req): s201201, s201202, s201203
    # G4 (3 members, admin-assigned): s201204, s201205, s201206
    {"CID": 201201, "first_name": "Sofiane",    "last_name": "Amrani",     "level": 3, "specialty": None},
    {"CID": 201202, "first_name": "Yasmine",    "last_name": "Benali",     "level": 3, "specialty": None},
    {"CID": 201203, "first_name": "Hamza",      "last_name": "Merabet",    "level": 3, "specialty": None},
    {"CID": 201204, "first_name": "Sonia",      "last_name": "Khelif",     "level": 3, "specialty": None},
    {"CID": 201205, "first_name": "Fares",      "last_name": "Toumi",      "level": 3, "specialty": None},
    {"CID": 201206, "first_name": "Meriem",     "last_name": "Bouzid",     "level": 3, "specialty": None},

    # ─ Level 4 (2CS) — 6 students ─────────────────────────────────────────
    # G5 (3 members, active): s191101, s191102, s191103
    # G6 (3 members, submitted): s191104, s191105, s191106
    {"CID": 191101, "first_name": "Anissa",     "last_name": "Lahlou",     "level": 4, "specialty": "ISI"},
    {"CID": 191102, "first_name": "Khaled",     "last_name": "Rahmani",    "level": 4, "specialty": "ISI"},
    {"CID": 191103, "first_name": "Djamila",    "last_name": "Saadi",      "level": 4, "specialty": "SIW"},
    {"CID": 191104, "first_name": "Amir",       "last_name": "Benkhalil",  "level": 4, "specialty": "SIW"},
    {"CID": 191105, "first_name": "Lynda",      "last_name": "Mezghiche",  "level": 4, "specialty": "ISI"},
    {"CID": 191106, "first_name": "Walid",      "last_name": "Ferhat",     "level": 4, "specialty": "IASD"},

    # ─ Level 5 (3CS) — 12 students (4 active groups × 3) ────────────────
    # G7 (3 members, final approved): s181101, s181102, s181103
    # G8 (3 members, jury only): s181104, s181105, s181106
    # G9 (3 members, defense scheduled): s181107, s181108, s181109
    # G10 (3 members, graded current year): s181110, s181111, s181112
    {"CID": 181101, "first_name": "Nour",       "last_name": "Benhaddad",  "level": 5, "specialty": "ISI"},
    {"CID": 181102, "first_name": "Zakaria",    "last_name": "Belaid",     "level": 5, "specialty": "ISI"},
    {"CID": 181103, "first_name": "Selma",      "last_name": "Ouarets",    "level": 5, "specialty": "ISI"},
    {"CID": 181104, "first_name": "Mohamed",    "last_name": "Arif",       "level": 5, "specialty": "IASD"},
    {"CID": 181105, "first_name": "Houria",     "last_name": "Guenifi",    "level": 5, "specialty": "IASD"},
    {"CID": 181106, "first_name": "Nabil",      "last_name": "Chouia",     "level": 5, "specialty": "IASD"},
    {"CID": 181107, "first_name": "Lamine",     "last_name": "Ziani",      "level": 5, "specialty": "SIW"},
    {"CID": 181108, "first_name": "Fatima",     "last_name": "Bouras",     "level": 5, "specialty": "SIW"},
    {"CID": 181109, "first_name": "Djamel",     "last_name": "Kaci",       "level": 5, "specialty": "CYS"},
    {"CID": 181110, "first_name": "Ryad",       "last_name": "Belkhir",    "level": 5, "specialty": "ISI"},
    {"CID": 181111, "first_name": "Hana",       "last_name": "Aoudia",     "level": 5, "specialty": "SIW"},
    {"CID": 181112, "first_name": "Tarik",      "last_name": "Bouchenak",  "level": 5, "specialty": "IASD"},

    # ─ Level 5 "prior year" — 6 students (archived groups 2024-2025) ────
    # G11 (3 members, archived public): s171101, s171102, s171103
    # G12 (3 members, archived hidden): s171104, s171105, s171106
    {"CID": 171101, "first_name": "Karim",      "last_name": "Messaoud",   "level": 5, "specialty": "ISI",  "_year": PRIOR_YEAR},
    {"CID": 171102, "first_name": "Assia",      "last_name": "Hamraoui",   "level": 5, "specialty": "ISI",  "_year": PRIOR_YEAR},
    {"CID": 171103, "first_name": "Rachid",     "last_name": "Soltani",    "level": 5, "specialty": "IASD", "_year": PRIOR_YEAR},
    {"CID": 171104, "first_name": "Nawel",      "last_name": "Cherifi",    "level": 5, "specialty": "SIW",  "_year": PRIOR_YEAR},
    {"CID": 171105, "first_name": "Abdelaziz",  "last_name": "Meziane",    "level": 5, "specialty": "CYS",  "_year": PRIOR_YEAR},
    {"CID": 171106, "first_name": "Chafia",     "last_name": "Bouguerba",  "level": 5, "specialty": "ISI",  "_year": PRIOR_YEAR},
]

# ── Console helpers ───────────────────────────────────────────────────────────

def ok(msg):    print(f"  [+] {msg}")
def skip(msg):  print(f"  [-] {msg}  (already exists)")
def head(msg):  print(f"\n--- {msg} ---")
def info(msg):  print(f"  [i] {msg}")

# ── Utility ───────────────────────────────────────────────────────────────────

def make_invite_code():
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
        if not Projects.objects.filter(invite_code=code).exists():
            return code


def make_project(name, **kwargs):
    """Return (project, is_new). Idempotent by project name."""
    existing = Projects.objects.filter(name=name).first()
    if existing:
        skip(f"Project '{name}'")
        return existing, False
    proj = Projects.objects.create(name=name, invite_code=make_invite_code(), **kwargs)
    ok(f"Project '{proj.name}'  PID={proj.PID}")
    return proj, True


def add_member(proj, student, role="fullstack", is_leader=False):
    SProjects.objects.get_or_create(
        CID=student, PID=proj,
        defaults={"role": role, "is_leader": is_leader},
    )


def add_task(proj, title, state, priority, deadline_delta_days, creator=None,
             assigned_to=None, supervisor_task=False):
    t = Task.objects.create(
        PID=proj, title=title,
        description=f"Auto-generated: {title}",
        type="feature", priority=priority, state=state,
        deadline=datetime.date.today() + datetime.timedelta(days=deadline_delta_days),
        created_by=None if supervisor_task else creator,
        created_by_supervisor=supervisor_task,
    )
    if assigned_to:
        TaskAssignment.objects.get_or_create(task_id=t, CID=assigned_to)
    return t


def add_meeting(proj, title, days_delta, status,
                by_student=None, by_staff=None, cancel_reason=None):
    m_date = datetime.date.today() + datetime.timedelta(days=days_delta)
    return Meeting.objects.create(
        PID=proj, title=title,
        date=m_date, time=datetime.time(10, 0),
        location="Salle B2, ESI",
        created_by_student=by_student,
        created_by_staff=by_staff,
        status=status,
        cancellation_reason=cancel_reason,
    )


def add_grades(proj, formula, g1, g2, g3):
    if Grades.objects.filter(PID=proj).exists():
        return
    Grades.objects.create(
        PID=proj,
        formula=formula,
        values={"g1": g1, "g2": g2, "g3": g3},
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def seed():
    print("\n=== ESI GIT comprehensive dev seed ===")

    # ── 1. Departments ────────────────────────────────────────────────────────
    head("1. Departments")
    prep, c = Department.objects.get_or_create(cycle="PREP")
    ok("PREP — Cycle Préparatoire") if c else skip("PREP")
    sup, c = Department.objects.get_or_create(cycle="SUP")
    ok("SUP  — Cycle Supérieur") if c else skip("SUP")

    # ── 2. Specialties ────────────────────────────────────────────────────────
    head("2. Specialties")
    sp = {}
    for abbr, full in SPECIALTIES.items():
        obj, c = Specialty.objects.get_or_create(
            name=abbr, defaults={"full_name": full, "department": sup}
        )
        sp[abbr] = obj
        ok(f"{abbr:<6} — {full}") if c else skip(abbr)

    # ── 3. Students ───────────────────────────────────────────────────────────
    head(f"3. Students  (password: {SEED_PASSWORD})")
    stu = {}
    for s in STUDENTS_DATA:
        dept      = prep if s["level"] == 2 else sup
        specialty = sp[s["specialty"]] if s.get("specialty") else None
        acad_year = s.get("_year", CURRENT_YEAR)
        email     = f"{s['first_name'][0].lower()}.{s['last_name'].lower()}@esi.dz"
        student, c = Student.objects.get_or_create(
            CID=s["CID"],
            defaults={
                "email": email,
                "first_name": s["first_name"],
                "last_name":  s["last_name"],
                "academic_year": acad_year,
                "level":     s["level"],
                "specialty": specialty,
                "department": dept,
                "is_first_login": True,
                "is_active":  True,
                "is_blocked": False,
            },
        )
        if c:
            student.set_password(SEED_PASSWORD)
            student.save()
            ok(f"[{s['CID']}] {student.full_name:<22}  L{s['level']}  {email}")
        else:
            skip(f"[{s['CID']}] {student.full_name}")
        stu[s["CID"]] = student

    # ── 4. Staff ─────────────────────────────────────────────────────────────
    head(f"4. Staff  (password: {SEED_PASSWORD})")
    teachers = {}
    for t in STAFF_DATA:
        email = f"{t['first_name'][0].lower()}.{t['last_name'].lower()}@esi.dz"
        obj, c = Staff.objects.get_or_create(
            email=email,
            defaults={
                "first_name": t["first_name"],
                "last_name":  t["last_name"],
                "is_admin":   t["is_admin"],
                "is_teacher": True,
                "available":  t["available"],
                "specialty":  sp[t["specialty"]],
                "department": sup,
                "is_first_login": True,
                "is_active":  True,
                "is_blocked": False,
            },
        )
        if c:
            obj.set_password(SEED_PASSWORD)
            obj.save()
            tag = "ADMIN" if t["is_admin"] else ("unavailable" if not t["available"] else "teacher")
            ok(f"{obj.full_name:<22}  {email:<35}  [{tag}]")
        else:
            skip(obj.full_name)
        teachers[t["last_name"]] = obj

    t1 = teachers["Boukhalfa"]   # available teacher — used as primary supervisor
    t2 = teachers["Sellami"]     # available teacher
    t3 = teachers["Hamidi"]      # available teacher
    t4 = teachers["Redjimi"]     # UNAVAILABLE teacher

    # ── 5. PlatformSettings ───────────────────────────────────────────────────
    head("5. PlatformSettings")
    settings = PlatformSettings.get_settings()
    info(f"current_academic_year = {settings.current_academic_year}")
    info(f"contact_email         = {settings.contact_email or '(not set)'}")

    # ── 6. Grading Formula ────────────────────────────────────────────────────
    head("6. GradingFormula")
    formula, c = GradingFormula.objects.get_or_create(
        name="ESI Standard (3 composantes)",
        defaults={
            "expression":  "(g1 * 4 + g2 * 4 + g3 * 2) / 10",
            "labels":      {"g1": "Note orale", "g2": "Rapport écrit", "g3": "Travail continu"},
            "description": "Formule standard ESI : 40% oral + 40% rapport + 20% travail continu",
            "is_active":   True,
            "created_by":  t1,
        },
    )
    if c:
        ok(f"'{formula.name}'  →  {formula.expression}")
    else:
        skip(formula.name)
        if not formula.is_active:
            formula.is_active = True
            formula.save()
            info("Activated existing formula")

    # ═════════════════════════════════════════════════════════════════════════
    # 7. Active groups (10 lifecycle scenarios)
    # ═════════════════════════════════════════════════════════════════════════
    head("7. Active groups — 10 scenarios")

    # ── G1: INCOMPLETE ────────────────────────────────────────────────────────
    info("G1: INCOMPLETE (2CPI, 2 members, no supervisor request)")
    g1, new = make_project(
        "Projet AppMobile — Groupe Incomplet",
        type="PFE", specialty="SIW", year=CURRENT_YEAR, academic_level=2,
        status="pending",
        description="Application mobile de gestion d'emploi du temps étudiant.",
        tech_stack="Flutter,Dart",
        github_url="https://github.com/test/projet-appmobile",
    )
    if new:
        add_member(g1, stu[221101], role="frontend", is_leader=True)
        add_member(g1, stu[221102], role="backend")
        ok("  → 2/3 members  — group is INCOMPLETE (< 3 required)")

    # ── G2: PENDING SUPERVISOR REQUEST ────────────────────────────────────────
    info(f"G2: PENDING REQUEST (2CPI, 3 members, → {t1.full_name} pending)")
    g2, new = make_project(
        "Système de Recommandation de Cours",
        type="PFE", specialty="IASD", year=CURRENT_YEAR, academic_level=2,
        status="pending",
        description="Système de recommandation de cours basé sur les préférences étudiantes.",
        tech_stack="Python,FastAPI,React",
    )
    if new:
        add_member(g2, stu[221103], role="fullstack", is_leader=True)
        add_member(g2, stu[221104], role="backend")
        add_member(g2, stu[221105], role="frontend")
        SupervisorRequest.objects.create(
            project_id=g2, teacher_id=t1, status="pending",
            message="Nous aimerions que vous encadriez notre projet de recommandation.",
        )
        ok(f"  → 3 members, pending request → {t1.full_name}")

    # ── G3: REJECTED SUPERVISOR REQUEST ──────────────────────────────────────
    info(f"G3: REJECTED REQUEST (1CS, 3 members, {t2.full_name} rejected)")
    g3, new = make_project(
        "Plateforme E-Learning Adaptative",
        type="PFE", specialty="ISI", year=CURRENT_YEAR, academic_level=3,
        status="pending",
        description="Plateforme d'apprentissage en ligne avec parcours adaptatif basé sur l'IA.",
        tech_stack="Django,Vue.js,PostgreSQL",
    )
    if new:
        add_member(g3, stu[201201], role="fullstack", is_leader=True)
        add_member(g3, stu[201202], role="frontend")
        add_member(g3, stu[201203], role="backend")
        SupervisorRequest.objects.create(
            project_id=g3, teacher_id=t2, status="rejected",
            message="Je supervise déjà le nombre maximum de projets cette année.",
        )
        ok(f"  → 3 members, request REJECTED by {t2.full_name} — group must resend")

    # ── G4: ADMIN-ASSIGNED SUPERVISOR ────────────────────────────────────────
    info(f"G4: ADMIN ASSIGNED (1CS, 3 members, admin forced supervisor → {t3.full_name})")
    g4, new = make_project(
        "Détection d'Anomalies Réseau par ML",
        type="PFE", specialty="CYS", year=CURRENT_YEAR, academic_level=3,
        status="admin_assigned", TID=t3,
        description="Système de détection d'anomalies réseau basé sur l'apprentissage automatique.",
        tech_stack="Python,Scikit-learn,FastAPI,React",
    )
    if new:
        add_member(g4, stu[201204], role="fullstack", is_leader=True)
        add_member(g4, stu[201205], role="backend")
        add_member(g4, stu[201206], role="frontend")
        ok(f"  → 3 members, supervisor={t3.full_name} (admin-assigned, no request flow)")

    # ── G5: ACTIVE SUPERVISED — tasks + meetings ──────────────────────────────
    info(f"G5: ACTIVE SUPERVISED (2CS, 3 members, {t1.full_name})")
    g5, new = make_project(
        "Gestion RH — Application Web Complète",
        type="PFE", specialty="ISI", year=CURRENT_YEAR, academic_level=4,
        status="approved", TID=t1,
        description="Application web de gestion des ressources humaines : congés, paie, recrutement.",
        tech_stack="Django,React,PostgreSQL",
        github_url="https://github.com/test/rh-app",
    )
    if new:
        s5a, s5b, s5c = stu[191101], stu[191102], stu[191103]
        add_member(g5, s5a, role="fullstack", is_leader=True)
        add_member(g5, s5b, role="backend")
        add_member(g5, s5c, role="frontend")

        # Tasks: mix of done / in_progress / todo / overdue
        add_task(g5, "Mise en place API REST authentication",   "done",        2, -10, s5b, assigned_to=s5b)
        add_task(g5, "Design du dashboard principal",           "done",        3,  -5, s5c, assigned_to=s5c)
        add_task(g5, "Module gestion des congés (CRUD)",        "in_progress", 2,   8, s5b, assigned_to=s5b)
        add_task(g5, "Intégration notifications email",         "in_progress", 1,  12, s5a, assigned_to=s5a)
        add_task(g5, "Tests unitaires endpoints API",           "todo",        2,  -3, s5b, assigned_to=s5b)  # OVERDUE
        add_task(g5, "Module gestion de la paie",               "todo",        3,  20, None)
        add_task(g5, "Déploiement sur serveur staging",         "todo",        2,  18, s5a, assigned_to=s5a)
        # Supervisor-created task
        add_task(g5, "Rapport d'avancement mi-projet à remettre", "todo",      3,   7, None, supervisor_task=True)

        # Meetings: past approved (with attendance) / pending / cancelled
        m_past1 = add_meeting(g5, "Point d'avancement sprint 1", -21, "approved", by_student=s5a)
        m_past2 = add_meeting(g5, "Revue architecture technique", -10, "approved", by_staff=t1)
        add_meeting(g5, "Point sprint 3 — démo fonctionnelle",     7, "pending",  by_student=s5a)
        add_meeting(g5, "Préparation soutenance blanche",          21, "pending",  by_staff=t1)
        add_meeting(g5, "Réunion planning initiale (annulée)",     -3, "cancelled", by_student=s5a,
                    cancel_reason="Encadreur en déplacement professionnel.")

        # Attendance for past approved meetings
        for m in [m_past1, m_past2]:
            for student_obj, attended in [(s5a, True), (s5b, True), (s5c, False)]:
                MeetingAttendance.objects.get_or_create(
                    meeting_id=m, CID=student_obj,
                    defaults={"attended": attended},
                )

        # Attachment (no real file — just the metadata row)
        ProjectAttachment.objects.create(
            PID=g5, filename="rapport_intermediaire_v1.pdf",
            attachment_type="report", uploaded_by=s5a,
        )
        ok(f"  → 3 members | 8 tasks (2 done, 2 in_progress, 3 todo, 1 overdue) | 5 meetings | 1 attachment")

    # ── G6: SUBMITTED TO SUPERVISOR ───────────────────────────────────────────
    info(f"G6: SUBMITTED (2CS, 3 members, {t2.full_name}, awaiting review)")
    g6, new = make_project(
        "Application de Covoiturage Universitaire",
        type="PFE", specialty="SIW", year=CURRENT_YEAR, academic_level=4,
        status="approved", TID=t2,
        description="Application mobile de covoiturage entre étudiants et personnel ESI.",
        tech_stack="Flutter,Node.js,MongoDB",
        submitted_to_supervisor=True,
        final_submission_date=timezone.now() - datetime.timedelta(days=2),
        github_url="https://github.com/test/covoiturage-esi",
    )
    if new:
        add_member(g6, stu[191104], role="fullstack", is_leader=True)
        add_member(g6, stu[191105], role="backend")
        add_member(g6, stu[191106], role="frontend")
        add_task(g6, "Finaliser rapport PDF",     "done", 3,  -7, stu[191105])
        add_task(g6, "Corriger bugs critiques",   "done", 3,  -5, stu[191104])
        add_task(g6, "Préparer démo vidéo",       "done", 2,  -3, stu[191106])
        ProjectAttachment.objects.create(
            PID=g6, filename="rapport_final_covoiturage.pdf",
            attachment_type="report", uploaded_by=stu[191104], is_final=True,
        )
        ProjectAttachment.objects.create(
            PID=g6, filename="presentation_soutenance.pptx",
            attachment_type="presentation", uploaded_by=stu[191104], is_final=True,
        )
        ok(f"  → submitted {2} days ago — supervisor sees it as 'awaiting validation'")

    # ── G7: FINAL SUBMISSION APPROVED ─────────────────────────────────────────
    info(f"G7: FINAL APPROVED (3CS, 3 members, {t1.full_name})")
    g7, new = make_project(
        "Blockchain pour Certification Académique",
        type="PFE", specialty="ISI", year=CURRENT_YEAR, academic_level=5,
        status="approved", TID=t1,
        description="Système de certification académique décentralisé basé sur Ethereum.",
        tech_stack="Solidity,Web3.js,Django,PostgreSQL",
        submitted_to_supervisor=True,
        final_submission_approved=True,
        final_submission_date=timezone.now() - datetime.timedelta(days=5),
        github_url="https://github.com/test/blockchain-cert",
    )
    if new:
        add_member(g7, stu[181101], role="fullstack", is_leader=True)
        add_member(g7, stu[181102], role="backend")
        add_member(g7, stu[181103], role="frontend")
        ok(f"  → approved for defense — awaiting jury assignment")

    # ── G8: JURY ASSIGNED — no defense date ──────────────────────────────────
    info(f"G8: JURY ASSIGNED (3CS, 3 members, {t2.full_name}, no schedule yet)")
    g8, new = make_project(
        "Analyse de Sentiment des Réseaux Sociaux",
        type="PFE", specialty="IASD", year=CURRENT_YEAR, academic_level=5,
        status="approved", TID=t2,
        description="Outil d'analyse de sentiment pour les réseaux sociaux utilisant BERT.",
        tech_stack="Python,HuggingFace,FastAPI,React",
        submitted_to_supervisor=True,
        final_submission_approved=True,
    )
    if new:
        add_member(g8, stu[181104], role="fullstack", is_leader=True)
        add_member(g8, stu[181105], role="backend")
        add_member(g8, stu[181106], role="frontend")
        # Jury: president=t3, examiners=t1,t4
        ProjectJury.objects.create(PID=g8, teacher1_id=t3, teacher2_id=t1, teacher3_id=t4)
        ok(f"  → jury: president={t3.full_name} | examiners={t1.full_name},{t4.full_name}")
        ok("  → no defense date yet — admin must schedule")

    # ── G9: JURY + DEFENSE SCHEDULED — not yet graded ────────────────────────
    defense_date = datetime.date.today() + datetime.timedelta(days=14)
    info(f"G9: DEFENSE SCHEDULED (3CS, 3 members, {t3.full_name}, {defense_date})")
    g9, new = make_project(
        "Système Multi-Agents pour Smart Grid",
        type="PFE", specialty="IASD", year=CURRENT_YEAR, academic_level=5,
        status="approved", TID=t3,
        description="Système multi-agents pour l'optimisation de la consommation énergétique.",
        tech_stack="Python,JADE,React,PostgreSQL",
        submitted_to_supervisor=True,
        final_submission_approved=True,
    )
    if new:
        add_member(g9, stu[181107], role="fullstack", is_leader=True)
        add_member(g9, stu[181108], role="backend")
        add_member(g9, stu[181109], role="frontend")
        ProjectJury.objects.create(PID=g9, teacher1_id=t1, teacher2_id=t2, teacher3_id=t3)
        Schedule.objects.create(
            PID=g9,
            presentation_date=defense_date,
            presentation_time=datetime.time(9, 0),
            room="Salle A1",
            department_name="SUP",
        )
        ok(f"  → jury assigned | defense: {defense_date} 09:00 Salle A1")

    # ── G10: GRADED — current year, not archived ──────────────────────────────
    past_defense = datetime.date.today() - datetime.timedelta(days=3)
    info(f"G10: GRADED CURRENT YEAR (3CS, 3 members, {t1.full_name})")
    g10, new = make_project(
        "Plateforme IoT pour Smart Building",
        type="PFE", specialty="ISI", year=CURRENT_YEAR, academic_level=5,
        status="approved", TID=t1,
        description="Plateforme de gestion des capteurs IoT pour bâtiments intelligents.",
        tech_stack="Django,React,MQTT,InfluxDB",
        submitted_to_supervisor=True,
        final_submission_approved=True,
        finish_date=past_defense,
    )
    if new:
        add_member(g10, stu[181110], role="fullstack", is_leader=True)
        add_member(g10, stu[181111], role="backend")
        add_member(g10, stu[181112], role="frontend")
        ProjectJury.objects.create(PID=g10, teacher1_id=t2, teacher2_id=t3, teacher3_id=t4)
        Schedule.objects.create(
            PID=g10,
            presentation_date=past_defense,
            presentation_time=datetime.time(14, 0),
            room="Salle C3",
            department_name="SUP",
        )
        add_grades(g10, formula, g1=15.5, g2=14.0, g3=16.0)
        ok(f"  → graded — g1=15.5, g2=14.0, g3=16.0 → final={round((15.5*4+14.0*4+16.0*2)/10,2)}")
        ok("  → NOT archived yet — ready to archive")

    # ═════════════════════════════════════════════════════════════════════════
    # 8. Archived groups (prior year 2024-2025)
    # ═════════════════════════════════════════════════════════════════════════
    head("8. Archived groups — prior year 2024-2025")

    arc_defense = datetime.date(2025, 6, 15)

    # G11: Graded, archived, public
    info("G11: ARCHIVED PUBLIC (3CS, graded, is_public=True)")
    g11, new = make_project(
        "ESI Smart Campus — Capteurs & Tableaux de bord",
        type="PFE", specialty="ISI", year=PRIOR_YEAR, academic_level=5,
        status="approved", TID=t1,
        description="Système de gestion d'un campus intelligent avec capteurs IoT et tableaux de bord temps réel.",
        tech_stack="Django,React,PostgreSQL,MQTT",
        submitted_to_supervisor=True,
        final_submission_approved=True,
        archived=True,
        is_public=True,
        finish_date=arc_defense,
    )
    if new:
        add_member(g11, stu[171101], role="fullstack", is_leader=True)
        add_member(g11, stu[171102], role="backend")
        add_member(g11, stu[171103], role="frontend")
        ProjectJury.objects.create(PID=g11, teacher1_id=t1, teacher2_id=t2, teacher3_id=t3)
        Schedule.objects.create(
            PID=g11,
            presentation_date=arc_defense,
            presentation_time=datetime.time(9, 0),
            room="Salle A1",
            department_name="SUP",
        )
        add_grades(g11, formula, g1=17.0, g2=16.5, g3=18.0)
        ok(f"  → archived | public | grade={round((17.0*4+16.5*4+18.0*2)/10,2)}/20")

    # G12: Graded, archived, HIDDEN
    info("G12: ARCHIVED HIDDEN (3CS, graded, is_public=False)")
    g12, new = make_project(
        "Plateforme de Suivi PFE — Ancien Cycle",
        type="PFE", specialty="SIW", year=PRIOR_YEAR, academic_level=5,
        status="approved", TID=t2,
        description="Plateforme complète de suivi des projets de fin d'études avec gestion des réunions.",
        tech_stack="Django,Vue.js,Redis,Celery",
        submitted_to_supervisor=True,
        final_submission_approved=True,
        archived=True,
        is_public=False,
        finish_date=arc_defense + datetime.timedelta(days=1),
    )
    if new:
        add_member(g12, stu[171104], role="fullstack", is_leader=True)
        add_member(g12, stu[171105], role="backend")
        add_member(g12, stu[171106], role="frontend")
        ProjectJury.objects.create(PID=g12, teacher1_id=t2, teacher2_id=t1, teacher3_id=t4)
        Schedule.objects.create(
            PID=g12,
            presentation_date=arc_defense + datetime.timedelta(days=1),
            presentation_time=datetime.time(11, 0),
            room="Salle B2",
            department_name="SUP",
        )
        add_grades(g12, formula, g1=11.0, g2=10.5, g3=12.0)
        ok(f"  → archived | HIDDEN (is_public=False) | grade={round((11.0*4+10.5*4+12.0*2)/10,2)}/20")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "-" * 52)
    print("Seed complete.  Quick reference:\n")

    print("  STAFF LOGINS (password: ESIdev2025!)")
    for t in STAFF_DATA:
        email = f"{t['first_name'][0].lower()}.{t['last_name'].lower()}@esi.dz"
        tag   = " [ADMIN]" if t["is_admin"] else (" [unavail]" if not t["available"] else "")
        print(f"    {email:<35} {t['first_name']} {t['last_name']}{tag}")

    print("\n  KEY STUDENT LOGINS (password: ESIdev2025!)")
    key_students = [
        (221103, "leader G2 — pending request"),
        (201201, "leader G3 — rejected request"),
        (191101, "leader G5 — active supervised"),
        (191104, "leader G6 — submitted"),
        (181101, "leader G7 — final approved"),
        (181107, "leader G9 — defense scheduled"),
        (181110, "leader G10 — graded"),
        (221106, "no group (lone student)"),
    ]
    for cid, note in key_students:
        s = stu[cid]
        email = f"{s.first_name[0].lower()}.{s.last_name.lower()}@esi.dz"
        print(f"    {email:<35} {s.full_name:<22}  — {note}")

    print("\n  GROUPS SUMMARY")
    groups = [
        ("G1",  "INCOMPLETE",          "2CPI", "2 members, no supervisor request"),
        ("G2",  "PENDING REQUEST",      "2CPI", "3 members, supervisor req pending"),
        ("G3",  "REJECTED REQUEST",     "1CS",  "3 members, request rejected"),
        ("G4",  "ADMIN ASSIGNED",       "1CS",  "3 members, supervisor admin-forced"),
        ("G5",  "ACTIVE SUPERVISED",    "2CS",  "tasks + meetings (mixed states)"),
        ("G6",  "SUBMITTED",            "2CS",  "submitted to supervisor"),
        ("G7",  "FINAL APPROVED",       "3CS",  "approved for defense"),
        ("G8",  "JURY ONLY",            "3CS",  "jury assigned, no date"),
        ("G9",  "DEFENSE SCHEDULED",    "3CS",  "defense in 14 days"),
        ("G10", "GRADED CURRENT YEAR",  "3CS",  "graded, not archived"),
        ("G11", "ARCHIVED PUBLIC",      "3CS",  "2024-2025, public, grade~16.7"),
        ("G12", "ARCHIVED HIDDEN",      "3CS",  "2024-2025, hidden, grade~11.2"),
    ]
    for gid, state, level, desc in groups:
        print(f"    {gid:<4}  {state:<22}  {level:<5}  {desc}")

    print("\n" + "-" * 52 + "\n")


if __name__ == "__main__":
    seed()
