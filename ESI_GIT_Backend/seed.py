"""
Dev seed script for ESI GIT.
Run from the backend root folder (same level as manage.py):

    python seed.py

Safe to re-run — uses get_or_create so nothing is duplicated.

What it creates
---------------
Departments  : PREP, SUP
Specialties  : SIW, ISI, IASD, CYS  (all under SUP — default ESI specialties)
Students     : 6 students across levels 2, 3, 4, 5
               level 2 → PREP, no specialty
               level 3 → SUP, no specialty
               level 4 → SUP, with specialty
               level 5 → SUP, with specialty
Staff        : 4 regular teachers + 1 who is also admin
PlatformSettings: created with current academic year if missing
"""

import os
import sys
import django

# ── Bootstrap Django ───────────────────────────────────────────────────────────
# Find the settings module (the folder that contains settings.py)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

# The settings module is ESI_GIT/settings.py → module path is ESI_GIT.settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ESI_GIT.settings")
django.setup()

# ── Imports (after django.setup()) ────────────────────────────────────────────
from admin_panel.models import Department, Specialty, PlatformSettings
from users.models import Student, Staff

# ── Config ────────────────────────────────────────────────────────────────────

SEED_PASSWORD = "ESIdev2025!"

# Specialties — abbreviation : full French name
SPECIALTIES = {
    "SIW":  "Systèmes d'Information et Web",
    "ISI":  "Ingénierie des Systèmes Informatiques",
    "IASD": "Intelligence Artificielle et Science des Données",
    "CYS":  "Cybersécurité",
}

# level → (department cycle, specialty name or None)
# level 2  → PREP, no specialty
# level 3  → SUP,  no specialty  (specialty acquired in 4th year)
# level 4+ → SUP,  with specialty
STUDENTS = [
    # level 2 — PREP, no specialty
    {"CID": 221101, "first_name": "Amine",   "last_name": "Bensalem",  "level": 2, "specialty": None},
    # level 3 — SUP, no specialty yet
    {"CID": 221102, "first_name": "Sara",    "last_name": "Meziane",   "level": 3, "specialty": None},
    {"CID": 221103, "first_name": "Youcef",  "last_name": "Ouali",     "level": 3, "specialty": None},
    # level 4 — SUP, with specialty
    {"CID": 221104, "first_name": "Lina",    "last_name": "Hadj",      "level": 4, "specialty": "ISI"},
    {"CID": 221105, "first_name": "Rayan",   "last_name": "Cherif",    "level": 4, "specialty": "SIW"},
    # level 5 — SUP, with specialty
    {"CID": 221106, "first_name": "Imene",   "last_name": "Boudiaf",   "level": 5, "specialty": "IASD"},
]

STAFF = [
    {"first_name": "Kamel",  "last_name": "Boukhalfa", "is_admin": False, "specialty": "ISI"},
    {"first_name": "Nadia",  "last_name": "Sellami",   "is_admin": False, "specialty": "SIW"},
    {"first_name": "Bilal",  "last_name": "Hamidi",    "is_admin": False, "specialty": "IASD"},
    {"first_name": "Asma",   "last_name": "Redjimi",   "is_admin": False, "specialty": "CYS"},
    {"first_name": "Tarek",  "last_name": "Mansouri",  "is_admin": True,  "specialty": "ISI"},  # admin
]

CURRENT_ACADEMIC_YEAR = "2025-2026"

# ── Helpers ───────────────────────────────────────────────────────────────────

def ok(msg):   print(f"  \033[92m✓\033[0m {msg}")
def skip(msg): print(f"  \033[90m–\033[0m {msg}  (already exists)")
def head(msg): print(f"\n\033[1m{msg}\033[0m")

# ── Seed ──────────────────────────────────────────────────────────────────────

def seed():
    print("\n\033[1m── ESI GIT dev seed ─────────────────────────────\033[0m")

    # 1. Departments
    head("Departments")
    prep, created = Department.objects.get_or_create(cycle="PREP")
    ok("PREP — Cycle Préparatoire") if created else skip("PREP")

    sup, created = Department.objects.get_or_create(cycle="SUP")
    ok("SUP  — Cycle Supérieur") if created else skip("SUP")

    # 2. Specialties (always SUP)
    head("Specialties")
    specialty_objects = {}
    for abbr, full in SPECIALTIES.items():
        spec, created = Specialty.objects.get_or_create(
            name=abbr,
            defaults={"full_name": full, "department": sup},
        )
        specialty_objects[abbr] = spec
        ok(f"{abbr:6} — {full}") if created else skip(abbr)

    # 3. Students
    head("Students")
    for s in STUDENTS:
        dept       = prep if s["level"] == 2 else sup
        specialty  = specialty_objects[s["specialty"]] if s["specialty"] else None
        email      = f"{s['first_name'][0].lower()}.{s['last_name'].lower()}@esi.dz"

        student, created = Student.objects.get_or_create(
            CID=s["CID"],
            defaults={
                "email":          email,
                "first_name":     s["first_name"],
                "last_name":      s["last_name"],
                "academic_year":  CURRENT_ACADEMIC_YEAR,
                "level":          s["level"],
                "specialty":      specialty,
                "department":     dept,
                "is_first_login": True,
                "is_active":      True,
                "is_blocked":     False,
            },
        )
        if created:
            student.set_password(SEED_PASSWORD)
            student.save()
            spec_label = s["specialty"] or "—"
            ok(f"{student.full_name:<22}  L{s['level']}  {spec_label:<6}  {email}  pwd: {SEED_PASSWORD}")
        else:
            skip(student.full_name)

    # 4. Staff
    head("Staff")
    for t in STAFF:
        email     = f"{t['first_name'][0].lower()}.{t['last_name'].lower()}@esi.dz"
        specialty = specialty_objects[t["specialty"]]

        staff, created = Staff.objects.get_or_create(
            email=email,
            defaults={
                "first_name":     t["first_name"],
                "last_name":      t["last_name"],
                "is_admin":       t["is_admin"],
                "is_teacher":     True,
                "available":      True,
                "specialty":      specialty,
                "department":     sup,
                "is_first_login": True,
                "is_active":      True,
                "is_blocked":     False,
            },
        )
        if created:
            staff.set_password(SEED_PASSWORD)
            staff.save()
            role = "ADMIN + teacher" if t["is_admin"] else "teacher"
            ok(f"{staff.full_name:<22}  {email:<35}  [{role}]  pwd: {SEED_PASSWORD}")
        else:
            skip(staff.full_name)

    # 5. PlatformSettings
    head("PlatformSettings")
    settings = PlatformSettings.get_settings()
    print(f"  current_academic_year = {settings.current_academic_year}")
    print(f"  contact_email         = {settings.contact_email}")

    print("\n\033[92m── Done ─────────────────────────────────────────\033[0m\n")


if __name__ == "__main__":
    seed()
