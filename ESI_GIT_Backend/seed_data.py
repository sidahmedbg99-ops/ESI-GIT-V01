"""
ESI GIT — User Seed Script
===========================
Run with:
    python manage.py shell < seed_data.py

Creates:
  - Departments & Specialties
  - 1 Admin
  - 3 Teachers
  - 10 Students across all 4 levels (2nd, 3rd, 4th, 5th year)
    including 1 student who redid their year

All passwords are auto-generated and printed at the end.
"""

import os
import random
import string

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ESI_GIT.settings")


def generate_password(length=10):
    chars = string.ascii_letters + string.digits + "!@#$%"
    return "".join(random.choices(chars, k=length))


# ──────────────────────────────────────────────────────────────
# 1. DEPARTMENTS & SPECIALTIES
# ──────────────────────────────────────────────────────────────
from admin_panel.models import Department, Specialty

dept1, _ = Department.objects.get_or_create(name="Preparatory Class")
dept2, _ = Department.objects.get_or_create(name="Second Cycle")

for s in [
    "Information Systems and Web (SIW)",
    "Computer Systems Engineering (ISI)",
    "Artificial Intelligence and Data Science (IASD)",
    "Cybersecurity (CYS)",
]:
    Specialty.objects.get_or_create(name=s, department=dept2)

print("✅ Departments & Specialties created")

# ──────────────────────────────────────────────────────────────
# 2. STAFF — Admin + Teachers
# ──────────────────────────────────────────────────────────────
from users.models import Staff

created_staff = []

def make_staff(email, first, last, is_admin=False):
    if Staff.objects.filter(email=email).exists():
        created_staff.append((f"{first} {last}", email, "Admin" if is_admin else "Teacher", "(already exists)"))
        return Staff.objects.get(email=email)
    plain = generate_password()
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

make_staff("admin@esi.dz",   "Ali",    "Benali",  is_admin=True)
make_staff("karim@esi.dz",   "Karim",  "Meziani")
make_staff("sara@esi.dz",    "Sara",   "Hamidi")
make_staff("youcef@esi.dz",  "Youcef", "Brahim")

print("✅ Staff created")

# ──────────────────────────────────────────────────────────────
# 3. STUDENTS
# ──────────────────────────────────────────────────────────────
from users.models import Student

created_students = []

def make_student(cid, email, first, last, level, specialty, year, note=""):
    if Student.objects.filter(CID=cid).exists():
        created_students.append((f"{first} {last}", email, level, specialty or "-", year, "(already exists)"))
        return Student.objects.get(CID=cid)
    plain = generate_password()
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
    created_students.append((f"{first} {last}", email, level, specialty or "-", year, plain + (f"  ← {note}" if note else "")))
    return s

# 2nd year — no specialty, promo 2023/2024
make_student(20230001, "farid@student.esi.dz",   "Farid",   "Amrani",   level=2, specialty=None, year="2023/2024")
make_student(20230002, "hana@student.esi.dz",    "Hana",    "Boudiaf",  level=2, specialty=None, year="2023/2024")

# 3rd year — no specialty, promo 2022/2023
make_student(20220001, "tarek@student.esi.dz",   "Tarek",   "Morsli",   level=3, specialty=None, year="2022/2023")
make_student(20220002, "rima@student.esi.dz",    "Rima",    "Saadi",    level=3, specialty=None, year="2022/2023")

# 3rd year but redid — same promo as 3rd years but level 4
# tests that they CANNOT join a 3rd year project despite sharing the promo
make_student(20220003, "bilal@student.esi.dz",   "Bilal",   "Cherif",   level=4, specialty="ISI", year="2022/2023", note="redid year")

# 4th year — specialty assigned, promo 2021/2022
make_student(20210001, "amina@student.esi.dz",   "Amina",   "Khelil",   level=4, specialty="ISI",  year="2021/2022")
make_student(20210002, "riad@student.esi.dz",    "Riad",    "Touati",   level=4, specialty="SIW",  year="2021/2022")
make_student(20210003, "nadia@student.esi.dz",   "Nadia",   "Bensalem", level=4, specialty="IASD", year="2021/2022")

# 5th year — specialty assigned, promo 2020/2021
make_student(20200001, "omar@student.esi.dz",    "Omar",    "Ferhat",   level=5, specialty="ISI",  year="2020/2021")
make_student(20200002, "yasmine@student.esi.dz", "Yasmine", "Meziane",  level=5, specialty="CYS",  year="2020/2021")
make_student(20200003, "sami@student.esi.dz",    "Sami",    "Bouzid",   level=5, specialty="IASD", year="2020/2021")

print("✅ Students created")

# ──────────────────────────────────────────────────────────────
# PRINT ALL CREDENTIALS
# ──────────────────────────────────────────────────────────────
print()
print("=" * 75)
print("  CREDENTIALS — save these, they won't be shown again")
print("=" * 75)

print()
print("  STAFF")
print(f"  {'Name':<20} {'Email':<30} {'Role':<10} Password")
print(f"  {'-'*20} {'-'*30} {'-'*10} {'-'*12}")
for name, email, role, pwd in created_staff:
    print(f"  {name:<20} {email:<30} {role:<10} {pwd}")

print()
print("  STUDENTS")
print(f"  {'Name':<20} {'Email':<30} {'Lvl':<5} {'Specialty':<8} {'Promo':<12} Password")
print(f"  {'-'*20} {'-'*30} {'-'*5} {'-'*8} {'-'*12} {'-'*12}")
for name, email, level, spec, year, pwd in created_students:
    print(f"  {name:<20} {email:<30} {level:<5} {spec:<8} {year:<12} {pwd}")

print()
print("  NOTES:")
print("  - All users have is_first_login=True (password change required on first login)")
print("  - Bilal Cherif (20220003) is a level 4 student with promo 2022/2023 — redid year")
print("  - 2nd/3rd year students have no specialty (null)")
print("=" * 75)