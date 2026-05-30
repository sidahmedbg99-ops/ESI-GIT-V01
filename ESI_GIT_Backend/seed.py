"""
ESI GIT — Standalone Seed Script
==================================
Run from the backend folder:
    python seed.py

Make sure your virtualenv is active and you're inside ESI_GIT_Backend/
"""

import os
import sys
import django

# ── Django setup ──────────────────────────────────────────────
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ESI_GIT.settings")

# Add the backend folder to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

# ── Imports (after django.setup()) ───────────────────────────
import random
import string
from admin_panel.models import Department, Specialty, PlatformSettings
from users.models import Staff, Student


def gen_pwd(length=10):
    chars = string.ascii_letters + string.digits + "!@#$%"
    return "".join(random.choices(chars, k=length))


# ──────────────────────────────────────────────────────────────
# 1. DEPARTMENTS & SPECIALTIES
# ──────────────────────────────────────────────────────────────
dept1, _ = Department.objects.get_or_create(name="Preparatory Class")
dept2, _ = Department.objects.get_or_create(name="Second Cycle")

specialties = [
    "Information Systems and Web (SIW)",
    "Computer Systems Engineering (ISI)",
    "Artificial Intelligence and Data Science (IASD)",
    "Cybersecurity (CYS)",
]
for s in specialties:
    Specialty.objects.get_or_create(name=s, department=dept2)

print("✅ Departments & Specialties created")

# ──────────────────────────────────────────────────────────────
# 2. PLATFORM SETTINGS (ensure one row exists)
# ──────────────────────────────────────────────────────────────
if not PlatformSettings.objects.exists():
    PlatformSettings.objects.create(
        students_can_see_archived_projects=False,
        jury_page_visible=False,
        current_academic_year="2024-2025",
        project_types="PFE,Stage,Projet",
        contact_email="contact@esi.dz",
    )
    print("✅ PlatformSettings created")
else:
    print("✅ PlatformSettings already exists")

# ──────────────────────────────────────────────────────────────
# 3. STAFF — Admin + Teachers
# ──────────────────────────────────────────────────────────────
created_staff = []

def make_staff(email, first, last, is_admin=False):
    if Staff.objects.filter(email=email).exists():
        s = Staff.objects.get(email=email)
        created_staff.append((f"{first} {last}", email, "Admin" if is_admin else "Teacher", "(already exists)"))
        return s

    plain = gen_pwd()
    s = Staff(
        email=email,
        first_name=first,
        last_name=last,
        is_admin=is_admin,
        is_teacher=not is_admin,
        is_active=True,
        is_blocked=False,
        is_first_login=True,
        available=True,
    )
    s.set_password(plain)
    s.save()
    created_staff.append((f"{first} {last}", email, "Admin" if is_admin else "Teacher", plain))
    return s


make_staff("admin@esi-sba.dz",  "Ali",    "Benali",  is_admin=True)
make_staff("karim@esi-sba.dz",  "Karim",  "Meziani")
make_staff("sara@esi-sba.dz",   "Sara",   "Hamidi")
make_staff("youcef@esi-sba.dz", "Youcef", "Brahim")

print("✅ Staff created")

# ──────────────────────────────────────────────────────────────
# 4. STUDENTS
# ──────────────────────────────────────────────────────────────
created_students = []

def make_student(cid, email, first, last, level, specialty, year, note=""):
    if Student.objects.filter(CID=cid).exists():
        created_students.append((f"{first} {last}", email, level, specialty or "-", year, "(already exists)"))
        return Student.objects.get(CID=cid)

    plain = gen_pwd()
    s = Student(
        CID=cid,
        email=email,
        first_name=first,
        last_name=last,
        level=level,
        specialty=specialty,
        academic_year=year,
        is_active=True,
        is_blocked=False,
        is_first_login=True,
    )
    s.set_password(plain)
    s.save()
    label = plain + (f"  <- {note}" if note else "")
    created_students.append((f"{first} {last}", email, level, specialty or "-", year, label))
    return s


# 2nd year — no specialty
make_student(20230001, "f.amrani@esi-sba.dz",  "Farid",   "Amrani",   level=2, specialty=None, year="2023/2024")
make_student(20230002, "h.boudiaf@esi-sba.dz", "Hana",    "Boudiaf",  level=2, specialty=None, year="2023/2024")

# 3rd year — no specialty
make_student(20220001, "t.morsli@esi-sba.dz",  "Tarek",   "Morsli",   level=3, specialty=None, year="2022/2023")
make_student(20220002, "r.saadi@esi-sba.dz",   "Rima",    "Saadi",    level=3, specialty=None, year="2022/2023")

# 3rd year promo but redid — level 4
make_student(20220003, "b.cherif@esi-sba.dz",  "Bilal",   "Cherif",   level=4, specialty="ISI", year="2022/2023", note="redid year")

# 4th year
make_student(20210001, "a.khelil@esi-sba.dz",  "Amina",   "Khelil",   level=4, specialty="ISI",  year="2021/2022")
make_student(20210002, "r.touati@esi-sba.dz",  "Riad",    "Touati",   level=4, specialty="SIW",  year="2021/2022")
make_student(20210003, "n.bensalem@esi-sba.dz","Nadia",   "Bensalem", level=4, specialty="IASD", year="2021/2022")

# 5th year
make_student(20200001, "o.ferhat@esi-sba.dz",  "Omar",    "Ferhat",   level=5, specialty="ISI",  year="2020/2021")
make_student(20200002, "y.meziane@esi-sba.dz", "Yasmine", "Meziane",  level=5, specialty="CYS",  year="2020/2021")
make_student(20200003, "s.bouzid@esi-sba.dz",  "Sami",    "Bouzid",   level=5, specialty="IASD", year="2020/2021")

print("✅ Students created")

# ──────────────────────────────────────────────────────────────
# PRINT CREDENTIALS
# ──────────────────────────────────────────────────────────────
print()
print("=" * 80)
print("  CREDENTIALS — save these, they won't be shown again")
print("=" * 80)

print()
print("  STAFF")
print(f"  {'Name':<20} {'Email':<30} {'Role':<10} Password")
print(f"  {'-'*20} {'-'*30} {'-'*10} {'-'*15}")
for name, email, role, pwd in created_staff:
    print(f"  {name:<20} {email:<30} {role:<10} {pwd}")

print()
print("  STUDENTS")
print(f"  {'Name':<20} {'Email':<32} {'Lvl':<5} {'Specialty':<8} {'Promo':<12} Password")
print(f"  {'-'*20} {'-'*32} {'-'*5} {'-'*8} {'-'*12} {'-'*20}")
for name, email, level, spec, year, pwd in created_students:
    print(f"  {name:<20} {email:<32} {level:<5} {spec:<8} {year:<12} {pwd}")

print()
print("  NOTES:")
print("  - All users have is_first_login=True (password change required on first login)")
print("  - Bilal Cherif (20220003): level 4 with promo 2022/2023 — redid year")
print("  - 2nd/3rd year students have no specialty (null)")
print("=" * 80)
