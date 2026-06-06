import unicodedata
import pandas as pd
from django.contrib.auth.hashers import make_password
from admin_panel.services.email_service import send_account_email
from admin_panel.models import PlatformSettings


# ── Field alias map ───────────────────────────────────────────────────────────
# Add any variant you ever expect to see in a scolarité file.
FIELD_ALIASES = {
    "CID":        ["matricule", "mat", "cid", "n° matricule", "numero matricule",
                   "n matricule", "numéro matricule", "id etudiant", "id_etudiant"],
    "last_name":  ["nom", "last_name", "lastname", "nom de famille", "surname"],
    "first_name": ["prénom", "prenom", "first_name", "firstname", "prénom(s)"],
    "email":      ["email", "e-mail", "mail", "adresse email", "adresse mail", "courriel"],
}


def _normalize(text: str) -> str:
    """Lowercase, strip, remove accents — for fuzzy header matching."""
    text = str(text).lower().strip()
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def _resolve_columns(df_columns: list) -> tuple[dict, list]:
    """
    Match actual DataFrame columns to our field aliases.
    Returns:
        col_map: { "CID": "Matricule", "last_name": "Nom", ... }
        missing: list of required fields that couldn't be resolved
    """
    normalized = {_normalize(c): c for c in df_columns}
    col_map = {}

    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            if _normalize(alias) in normalized:
                col_map[field] = normalized[_normalize(alias)]
                break

    required = ["CID", "last_name", "first_name"]
    missing = [f for f in required if f not in col_map]
    return col_map, missing


def import_Student_from_file(file, level: int, academic_year: str = None):
    """
    Import students from CSV or XLSX.

    Args:
        file:          uploaded file object
        level:         academic level this file represents (1–5)
        academic_year: only used when level == 1; defaults to platform setting

    Returns:
        promoted (int), new (int), orphans (list), errors (list), users (list)
    """
    from users.models import Student

    # ── Parse file ────────────────────────────────────────────────────────────
    try:
        name = file.name.lower()
        if name.endswith(".csv"):
            df = pd.read_csv(file, dtype=str)
        elif name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file, dtype=str)
        else:
            return 0, 0, [], [{"row": "-", "error": "Unsupported file type. Use CSV or XLSX."}], []
    except Exception as e:
        return 0, 0, [], [{"row": "-", "error": f"Could not read file: {e}"}], []

    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how="all")

    # ── Resolve columns ───────────────────────────────────────────────────────
    col_map, missing = _resolve_columns(list(df.columns))
    if missing:
        readable = {"CID": "Matricule", "last_name": "Nom", "first_name": "Prénom"}
        missing_labels = [readable.get(f, f) for f in missing]
        actual_headers = list(df.columns)
        return 0, 0, [], [{
            "row": "-",
            "error": (
                f"Colonnes introuvables : {', '.join(missing_labels)}. "
                f"En-têtes détectés : {', '.join(actual_headers)}"
            )
        }], []

    # ── Defaults ──────────────────────────────────────────────────────────────
    if academic_year is None:
        academic_year = PlatformSettings.get_settings().current_academic_year

    promoted_count = 0
    new_count      = 0
    orphans        = []
    errors         = []
    users          = []

    for i, row in df.iterrows():
        row_num = i + 2  # 1-indexed + header row

        # ── Extract fields ────────────────────────────────────────────────────
        try:
            raw_cid = str(row[col_map["CID"]]).strip().replace(" ", "")
            cid = int(float(raw_cid))  # handles "221831234567.0" from Excel
        except (ValueError, KeyError):
            errors.append({"row": row_num, "error": f"Matricule invalide : '{row.get(col_map.get('CID', ''), '')}'"}); continue

        last_name  = str(row[col_map["last_name"]]).strip().title()
        first_name = str(row[col_map["first_name"]]).strip().title()
        email_raw  = str(row.get(col_map.get("email", ""), "")).strip().lower()
        email      = email_raw if "@" in email_raw else None

        if not last_name or not first_name:
            errors.append({"row": row_num, "error": f"Nom/prénom manquant pour matricule {cid}"}); continue

        # ── Promote or create ─────────────────────────────────────────────────
        existing = Student.objects.filter(CID=cid).first()

        if existing:
            existing.level = level
            existing.save(update_fields=["level"])
            promoted_count += 1
            users.append({"CID": cid, "name": f"{first_name} {last_name}", "action": "promoted"})

        else:
            if level != 1:
                # Unknown CID at L2+ = transfer student or data issue
                orphans.append({
                    "CID": cid,
                    "name": f"{first_name} {last_name}",
                    "reason": "Introuvable dans le système (étudiant transféré ?)"
                })
                continue

            # New L1 student — generate password and email credentials
            from admin_panel.serializers import generate_password
            password = generate_password()

            student = Student(
                CID=cid,
                first_name=first_name,
                last_name=last_name,
                email=email or f"{cid}@esi-sba.dz",  # fallback if no email column
                level=1,
                academic_year=academic_year,
                is_active=True,
                is_blocked=False,
                is_first_login=True,
            )
            student.password = make_password(password)
            student.save()

            if email:
                try:
                    send_account_email(email, password, "student")
                except Exception:
                    pass  # don't fail the whole import over one email

            new_count += 1
            users.append({"CID": cid, "name": f"{first_name} {last_name}", "action": "new"})

    return promoted_count, new_count, orphans, errors, users

STAFF_FIELD_ALIASES = {
    "email":      ["email", "e-mail", "mail", "adresse email", "courriel"],
    "last_name":  ["nom", "last_name", "lastname", "nom de famille", "surname"],
    "first_name": ["prénom", "prenom", "first_name", "firstname"],
    "is_admin":   ["is_admin", "admin", "role admin", "administrateur"],
    "is_teacher": ["is_teacher", "teacher", "enseignant", "professeur"],
}


def import_staff_from_file(file):
    from users.models import Staff

    try:
        name = file.name.lower()
        if name.endswith(".csv"):
            df = pd.read_csv(file, dtype=str)
        elif name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file, dtype=str)
        else:
            return 0, [{"row": "-", "error": "Unsupported file type. Use CSV or XLSX."}], []
    except Exception as e:
        return 0, [{"row": "-", "error": f"Could not read file: {e}"}], []

    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how="all")

    # reuse same fuzzy resolver with staff aliases
    normalized_cols = {_normalize(c): c for c in df.columns}
    col_map = {}
    for field, aliases in STAFF_FIELD_ALIASES.items():
        for alias in aliases:
            if _normalize(alias) in normalized_cols:
                col_map[field] = normalized_cols[_normalize(alias)]
                break

    if "email" not in col_map:
        return 0, [{"row": "-", "error": f"Colonne email introuvable. En-têtes détectés : {list(df.columns)}"}], []

    created_count = 0
    errors = []
    users = []

    for i, row in df.iterrows():
        row_num = i + 2

        email_raw = str(row.get(col_map["email"], "")).strip().lower()
        if "@" not in email_raw:
            errors.append({"row": row_num, "error": f"Email invalide : '{email_raw}'"}); continue

        last_name  = str(row.get(col_map.get("last_name", ""), "")).strip().title()
        first_name = str(row.get(col_map.get("first_name", ""), "")).strip().title()

        if not last_name or not first_name:
            errors.append({"row": row_num, "error": f"Nom/prénom manquant pour {email_raw}"}); continue

        raw_is_admin   = str(row.get(col_map.get("is_admin",   ""), "0")).strip()
        raw_is_teacher = str(row.get(col_map.get("is_teacher", ""), "1")).strip()
        is_admin   = raw_is_admin   in ("1", "true", "oui", "yes")
        is_teacher = raw_is_teacher in ("1", "true", "oui", "yes") or not is_admin

        if Staff.objects.filter(email=email_raw).exists():
            errors.append({"row": row_num, "error": f"Email déjà utilisé : {email_raw}"}); continue

        from admin_panel.serializers import generate_password
        password = generate_password()

        staff = Staff(
            email=email_raw,
            first_name=first_name,
            last_name=last_name,
            is_admin=is_admin,
            is_teacher=is_teacher,
            is_active=True,
            is_blocked=False,
            is_first_login=True,
        )
        staff.password = make_password(password)
        staff.save()

        try:
            send_account_email(email_raw, password, "staff")
        except Exception:
            pass

        created_count += 1
        users.append({"name": f"{first_name} {last_name}", "email": email_raw, "password": password})

    return created_count, errors, users