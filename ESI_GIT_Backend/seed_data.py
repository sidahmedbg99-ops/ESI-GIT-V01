"""
ESI GIT — User Seed Script
===========================
Run with:
    python manage.py shell < seed_data.py

Creates:
  - Departments & Specialties
  - 1 Admin
  - 3 Teachers
  - 8 Students

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
        s = Staff.objects.get(email=email)
        created_staff.append((f"{first} {last}", email, "Admin" if is_admin else "Teacher", "(already exists)"))
        return s
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

make_staff("admin@esi.dz",     "Ali",    "Benali",  is_admin=True)
make_staff("karim@esi.dz",     "Karim",  "Meziani")
make_staff("sara@esi.dz",      "Sara",   "Hamidi")
make_staff("youcef@esi.dz",    "Youcef", "Brahim")

print("✅ Staff created")

# ──────────────────────────────────────────────────────────────
# 3. STUDENTS
# ──────────────────────────────────────────────────────────────
from users.models import Student

created_students = []

def make_student(cid, email, first, last, level=4, specialty="ISI", year="2024/2025"):
    if Student.objects.filter(CID=cid).exists():
        s = Student.objects.get(CID=cid)
        created_students.append((f"{first} {last}", email, specialty, "(already exists)"))
        return s
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
    created_students.append((f"{first} {last}", email, specialty, plain))
    return s

make_student(20010001, "amina@student.esi.dz",   "Amina",   "Khelil",  specialty="ISI")
make_student(20010002, "riad@student.esi.dz",    "Riad",    "Touati",  specialty="ISI")
make_student(20010003, "lina@student.esi.dz",    "Lina",    "Ait",     specialty="ISI")
make_student(20010004, "omar@student.esi.dz",    "Omar",    "Ferhat",  specialty="ISI")
make_student(20010005, "nadia@student.esi.dz",   "Nadia",   "Bensalem",specialty="SIW")
make_student(20010006, "mehdi@student.esi.dz",   "Mehdi",   "Rahmani", specialty="SIW")
make_student(20010007, "yasmine@student.esi.dz", "Yasmine", "Meziane", specialty="IASD")
make_student(20010008, "sami@student.esi.dz",    "Sami",    "Bouzid",  specialty="IASD")

print("✅ Students created")

# ──────────────────────────────────────────────────────────────
# PRINT ALL CREDENTIALS
# ──────────────────────────────────────────────────────────────
print()
print("=" * 65)
print("  CREDENTIALS — save these, they won't be shown again")
print("=" * 65)

print()
print("  STAFF")
print(f"  {'Name':<20} {'Email':<30} {'Role':<10} Password")
print(f"  {'-'*20} {'-'*30} {'-'*10} {'-'*12}")
for name, email, role, pwd in created_staff:
    print(f"  {name:<20} {email:<30} {role:<10} {pwd}")

print()
print("  STUDENTS")
print(f"  {'Name':<20} {'Email':<30} {'Specialty':<8} Password")
print(f"  {'-'*20} {'-'*30} {'-'*8} {'-'*12}")
for name, email, spec, pwd in created_students:
    print(f"  {name:<20} {email:<30} {spec:<8} {pwd}")

print()
print("  NOTE: All users have is_first_login=True")
print("        They will be asked to change their password on first login.")
print("=" * 65)
