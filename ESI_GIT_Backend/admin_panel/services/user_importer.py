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
  - Return ``(created_count, error_list, user_list)`` so the view can
    report partial success and display the password list to the admin.

Expected CSV/XLSX columns
--------------------------
Students : CID, email, first_name, last_name, specialty, academic_year, level
Staff    : email, first_name, last_name, is_admin, is_teacher
"""

from admin_panel.serializers import CreateStudentSerializer, CreateStaffSerializer
from admin_panel.services.email_service import send_account_email


def _safe_int(value, fallback=None):
    """Convert a pandas cell (may be float/NaN) to int or fallback."""
    try:
        import math
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return fallback
        return int(value)
    except (TypeError, ValueError):
        return fallback


def _safe_str(value, fallback=None):
    """Convert a pandas cell to str, stripping whitespace; return fallback for NaN."""
    try:
        import math
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return fallback
        s = str(value).strip()
        return s if s and s.lower() != 'nan' else fallback
    except (TypeError, ValueError):
        return fallback


def _safe_bool(value, fallback=False):
    """Convert a pandas cell (may be float 0/1 or bool) to Python bool."""
    try:
        import math
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return fallback
        if isinstance(value, bool):
            return value
        return bool(int(value))
    except (TypeError, ValueError):
        return fallback


def import_Student_from_file(file) -> tuple:
    """
    Bulk-create students from an uploaded CSV or XLSX file.

    Each valid row triggers account creation and an email with credentials.
    Invalid rows are collected in the errors list and do NOT stop the import.

    Args:
        file: Django UploadedFile (name must end in ``.xlsx`` or ``.csv``).

    Returns:
        Tuple[int, list, list]: (number of students created, list of row errors,
                                  list of {name, email, password} dicts)
    """
    # Lazy import — pandas is only needed when this function is called,
    # not at Django startup (the binary may be platform-specific).
    import pandas as pd

    df = pd.read_excel(file) if file.name.endswith("xlsx") else pd.read_csv(file)

    created = 0
    errors  = []
    users   = []

    for _, row in df.iterrows():
        data = {
            "CID":           _safe_int(row.get("CID")),
            "email":         _safe_str(row.get("email")),
            "first_name":    _safe_str(row.get("first_name")),
            "last_name":     _safe_str(row.get("last_name")),
            "specialty":     _safe_str(row.get("specialty")),
            "academic_year": _safe_str(row.get("academic_year")),
            "level":         _safe_str(row.get("level")) or _safe_int(row.get("level")),
        }

        serializer = CreateStudentSerializer(data=data)

        if serializer.is_valid():
            student, password = serializer.save()
            send_account_email(student.email, password, "student")
            created += 1
            users.append({
                "name":     student.full_name,
                "email":    student.email,
                "password": password,
            })
        else:
            # Record which row failed and why
            errors.append({"row": data, "errors": serializer.errors})

    return created, errors, users


def import_staff_from_file(file) -> tuple:
    """
    Bulk-create staff members from an uploaded CSV or XLSX file.

    Args:
        file: Django UploadedFile (name must end in ``.xlsx`` or ``.csv``).

    Returns:
        Tuple[int, list, list]: (number of staff created, list of row errors,
                                  list of {name, email, password} dicts)
    """
    import pandas as pd

    df = pd.read_excel(file) if file.name.endswith("xlsx") else pd.read_csv(file)

    created = 0
    errors  = []
    users   = []

    for _, row in df.iterrows():
        data = {
            "email":      _safe_str(row.get("email")),
            "first_name": _safe_str(row.get("first_name")),
            "last_name":  _safe_str(row.get("last_name")),
            "is_admin":   _safe_bool(row.get("is_admin"),   fallback=False),
            "is_teacher": _safe_bool(row.get("is_teacher"), fallback=True),
        }

        serializer = CreateStaffSerializer(data=data)

        if serializer.is_valid():
            staff, password = serializer.save()
            send_account_email(staff.email, password, "staff")
            created += 1
            users.append({
                "name":     staff.full_name,
                "email":    staff.email,
                "password": password,
            })
        else:
            errors.append({"row": data, "errors": serializer.errors})

    return created, errors, users
