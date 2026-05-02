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
Staff    : email, first_name, last_name, is_admin, is_teacher
"""

from admin_panel.serializers import CreateStudentSerializer, CreateStaffSerializer
from admin_panel.services.email_service import send_account_email


def import_Student_from_file(file) -> tuple:
    """
    Bulk-create students from an uploaded CSV or XLSX file.

    Each valid row triggers account creation and an email with credentials.
    Invalid rows are collected in the errors list and do NOT stop the import.

    Args:
        file: Django UploadedFile (name must end in ``.xlsx`` or ``.csv``).

    Returns:
        Tuple[int, list]: (number of students created, list of row errors)
    """
    # Lazy import — pandas is only needed when this function is called,
    # not at Django startup (the binary may be platform-specific).
    import pandas as pd

    df = pd.read_excel(file) if file.name.endswith("xlsx") else pd.read_csv(file)

    created = 0
    errors  = []

    for _, row in df.iterrows():
        data = {
            "CID":           row.get("CID"),
            "email":         row.get("email"),
            "first_name":    row.get("first_name"),
            "last_name":     row.get("last_name"),
            "specialty":     row.get("specialty"),
            "academic_year": row.get("academic_year"),
        }

        serializer = CreateStudentSerializer(data=data)

        if serializer.is_valid():
            student, password = serializer.save()
            send_account_email(student.email, password, "student")
            created += 1
        else:
            # Record which row failed and why
            errors.append({"row": data, "errors": serializer.errors})

    return created, errors


def import_staff_from_file(file) -> tuple:
    """
    Bulk-create staff members from an uploaded CSV or XLSX file.

    Args:
        file: Django UploadedFile (name must end in ``.xlsx`` or ``.csv``).

    Returns:
        Tuple[int, list]: (number of staff created, list of row errors)
    """
    import pandas as pd

    df = pd.read_excel(file) if file.name.endswith("xlsx") else pd.read_csv(file)

    created = 0
    errors  = []

    for _, row in df.iterrows():
        data = {
            "email":      row.get("email"),
            "first_name": row.get("first_name"),
            "last_name":  row.get("last_name"),
            "is_admin":   row.get("is_admin", False),
            "is_teacher": row.get("is_teacher", True),
        }

        serializer = CreateStaffSerializer(data=data)

        if serializer.is_valid():
            staff, password = serializer.save()
            send_account_email(staff.email, password, "staff")
            created += 1
        else:
            errors.append({"row": data, "errors": serializer.errors})

    return created, errors
