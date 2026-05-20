"""
admin_panel/services/user_importer.py
======================================
Bulk import utilities for creating Student and Staff accounts from
CSV or XLSX files uploaded by an admin.

Both functions:
  - Accept a Django ``InMemoryUploadedFile`` (from request.FILES).
  - Read the file with pandas (imported lazily to avoid crashing on
    environments where the Windows pandas binary is not available).
  - Validate each row through the appropriate serializer.
  - Email credentials for every successfully created account.
  - Return ``(created_count, error_list)`` so the view can report
    partial success to the admin.

Expected CSV/XLSX columns
--------------------------
Students : CID, email, first_name, last_name, specialty, academic_year
Staff    : TID, email, first_name, last_name, is_admin, is_teacher
"""

from admin_panel.serializers import CreateStudentSerializer, CreateStaffSerializer
from admin_panel.services.email_service import send_account_email
from users.models import Student, Staff


def import_Student_from_file(file) -> tuple:
    """
    Bulk-create or update students from an uploaded CSV or XLSX file.

    Returns:
        Tuple[int, list, list]: (count, errors, imported_list)
    """
    import pandas as pd

    df = pd.read_excel(file) if file.name.endswith("xlsx") else pd.read_csv(file)

    created = 0
    errors  = []
    imported_list = []

    for _, row in df.iterrows():
        data = {
            "CID":           row.get("CID"),
            "email":         row.get("email"),
            "first_name":    row.get("first_name"),
            "last_name":     row.get("last_name"),
            "specialty":     row.get("specialty"),
            "academic_year": row.get("academic_year"),
        }

        cid = data.get("CID")
        email = data.get("email")

        student = None
        if cid:
            try:
                student = Student.objects.filter(CID=cid).first()
            except Exception:
                pass
        if not student and email:
            try:
                student = Student.objects.filter(email=str(email).lower()).first()
            except Exception:
                pass

        if student:
            serializer = CreateStudentSerializer(student, data=data, partial=True)
            if serializer.is_valid():
                student = serializer.save()
                created += 1
                imported_list.append({
                    "email": student.email,
                    "password": "(updated)",
                    "name": f"{student.first_name} {student.last_name}",
                    "role": "student"
                })
            else:
                errors.append({"row": data, "errors": serializer.errors})
        else:
            serializer = CreateStudentSerializer(data=data)
            if serializer.is_valid():
                student, password = serializer.save()
                send_account_email(student.email, password, "student")
                created += 1
                imported_list.append({
                    "email": student.email,
                    "password": password,
                    "name": f"{student.first_name} {student.last_name}",
                    "role": "student"
                })
            else:
                errors.append({"row": data, "errors": serializer.errors})

    return created, errors, imported_list


def import_staff_from_file(file) -> tuple:
    """
    Bulk-create or update staff members from an uploaded CSV or XLSX file.

    Returns:
        Tuple[int, list, list]: (count, errors, imported_list)
    """
    import pandas as pd

    df = pd.read_excel(file) if file.name.endswith("xlsx") else pd.read_csv(file)

    created = 0
    errors  = []
    imported_list = []

    for _, row in df.iterrows():
        data = {
            "TID":        row.get("TID"),
            "email":      row.get("email"),
            "first_name": row.get("first_name"),
            "last_name":  row.get("last_name"),
            "is_admin":   row.get("is_admin", False),
            "is_teacher": row.get("is_teacher", True),
        }

        tid = data.get("TID")
        email = data.get("email")

        staff = None
        if tid:
            try:
                staff = Staff.objects.filter(TID=tid).first()
            except Exception:
                pass
        if not staff and email:
            try:
                staff = Staff.objects.filter(email=str(email).lower()).first()
            except Exception:
                pass

        if staff:
            serializer = CreateStaffSerializer(staff, data=data, partial=True)
            if serializer.is_valid():
                staff = serializer.save()
                created += 1
                imported_list.append({
                    "email": staff.email,
                    "password": "(updated)",
                    "name": f"{staff.first_name} {staff.last_name}",
                    "role": "admin" if staff.is_admin else "teacher"
                })
            else:
                errors.append({"row": data, "errors": serializer.errors})
        else:
            serializer = CreateStaffSerializer(data=data)
            if serializer.is_valid():
                staff, password = serializer.save()
                send_account_email(staff.email, password, "staff")
                created += 1
                imported_list.append({
                    "email": staff.email,
                    "password": password,
                    "name": f"{staff.first_name} {staff.last_name}",
                    "role": "admin" if staff.is_admin else "teacher"
                })
            else:
                errors.append({"row": data, "errors": serializer.errors})

    return created, errors, imported_list
