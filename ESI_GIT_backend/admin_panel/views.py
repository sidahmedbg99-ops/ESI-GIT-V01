"""
admin_panel/views.py
====================
All admin-only views in one place.

Sections:
    1.  User listing        – GET  /api/admin/users/
    2.  Student CRUD        – create / get / update / delete
    3.  Student actions     – block / unblock / reset-password / upload
    4.  Staff CRUD          – create / get / update / delete
    5.  Staff actions       – block / unblock / reset-password / upload
    6.  Dashboard stats     – GET  /api/admin/dashboard/
    7.  Academic structure  – GET  /api/admin/academic-structure/
    8.  Departments         – GET  /api/admin/departments/
    9.  Specialties         – GET/POST /api/admin/specialties/
                              PATCH/DELETE /api/admin/specialties/<id>/
    10. Grade formulas      – GET/POST /api/admin/grade-formula/
                              GET /api/admin/grade-formula/active/
                              PATCH /api/admin/grade-formula/<id>/activate/
    11. Platform settings   – GET/PATCH /api/admin/platform-settings/

Every view requires the ``IsAdmin`` permission (authenticated Staff with
``is_admin=True`` and not blocked).
"""

from datetime import datetime, timedelta
from typing import cast

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from admin_panel.models import Department, PlatformSettings, Specialty
from admin_panel.serializers import (
    CreateStaffSerializer,
    CreateStudentSerializer,
    DepartmentSerializer,
    DepartmentWithSpecialtiesSerializer,
    PlatformSettingsSerializer,
    SpecialtySerializer,
    generate_password,
    staff_to_dict,
    student_to_dict,
)
from admin_panel.services.email_service import send_account_email
from admin_panel.services.user_importer import (
    import_staff_from_file,
    import_Student_from_file,
)
from jury.models import GradingFormula
from jury.services.grading_engine import validate_formula
from users.models import Staff, Student
from users.permissions import IsAdmin


# ──────────────────────────────────────────────────────────────────────────────
# 1. USER LISTING  –  GET /api/admin/users/
# ──────────────────────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAdmin])
def list_users(request):
    """
    Return a paginated, searchable, filterable list of all users
    (students + staff combined).

    Query parameters
    ----------------
    search       : str  — matches first_name, last_name, email (case-insensitive)
    role         : str  — "student" | "staff" (omit for both)
    staff_role   : str  — "admin" | "teacher" (only meaningful when role=staff)
    status       : str  — "active" | "blocked"
    specialty    : int  — filter students by specialty FK id
    year         : int  — filter students by study level/year
    academic_year: str  — filter students by academic year string, e.g. "2024/2025"
    page         : int  — page number (default 1)
    limit        : int  — page size 1–50 (default 10)

    Response
    --------
    {
        page, limit, total_users, total_students, total_staff,
        filters: { ... },
        users: [ ...student_dicts + staff_dicts ... ]
    }
    """
    # ── Parse filters ────────────────────────────────────────────────────────
    search = request.GET.get("search", "").lower()
    role = request.GET.get("role")
    status_filter = request.GET.get("status")
    staff_role = request.GET.get("staff_role")
    specialty_id = request.GET.get("specialty")
    study_year = request.GET.get("year")
    academic_year = request.GET.get("academic_year")

    try:
        page = max(int(request.GET.get("page", 1)), 1)
        limit = max(min(int(request.GET.get("limit", 10)), 50), 1)
    except ValueError:
        page, limit = 1, 10

    # ── Base querysets ───────────────────────────────────────────────────────
    students = Student.objects.all()
    staff_members = Staff.objects.all()

    # ── Text search ──────────────────────────────────────────────────────────
    if search:
        name_email_q = (
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
        )
        students = students.filter(name_email_q)
        staff_members = staff_members.filter(name_email_q)

    # ── Role filter ──────────────────────────────────────────────────────────
    if role == "student":
        staff_members = Staff.objects.none()
    elif role == "staff":
        students = Student.objects.none()

    # ── Staff sub-role filter ────────────────────────────────────────────────
    if role != "student":
        if staff_role == "admin":
            staff_members = staff_members.filter(is_admin=True)
        elif staff_role == "teacher":
            staff_members = staff_members.filter(is_teacher=True)

    # ── Student-specific filters ─────────────────────────────────────────────
    if role != "staff":
        if specialty_id:
            students = students.filter(specialty_id=specialty_id)
        if study_year:
            students = students.filter(year=study_year)
        if academic_year:
            students = students.filter(academic_year__iexact=academic_year)

    # ── Active / blocked filter ──────────────────────────────────────────────
    if status_filter == "active":
        students = students.filter(is_blocked=False)
        staff_members = staff_members.filter(is_blocked=False)
    elif status_filter == "blocked":
        students = students.filter(is_blocked=True)
        staff_members = staff_members.filter(is_blocked=True)

    # ── Totals ───────────────────────────────────────────────────────────────
    total_students = students.count()
    total_staff = staff_members.count()

    # ── Pagination ───────────────────────────────────────────────────────────
    start = (page - 1) * limit
    end = start + limit
    students_page = students.order_by("-created_at")[start:end]
    staff_page = staff_members.order_by("-created_at")[start:end]

    # ── Serialise ────────────────────────────────────────────────────────────
    students_data = [student_to_dict(s) for s in students_page]
    staff_data = [staff_to_dict(s) for s in staff_page]

    return Response(
        {
            "page": page,
            "limit": limit,
            "total_users": total_students + total_staff,
            "total_students": total_students,
            "total_staff": total_staff,
            "filters": {
                "search": search,
                "role": role,
                "staff_role": staff_role,
                "status": status_filter,
                "specialty": specialty_id,
                "year": study_year,
                "academic_year": academic_year,
            },
            "users": students_data + staff_data,
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# 2. STUDENT CRUD
# ──────────────────────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_student(request):
    """
    POST /api/admin/students/create/

    Create a new Student account.
    A random password is generated, hashed, and emailed to the student.

    Request body: { CID, email, first_name, last_name, specialty, academic_year }
    Response 201: { message, student_id }
    Response 400: serializer validation errors
    """
    serializer = CreateStudentSerializer(data=request.data)
    if serializer.is_valid():
        student, password = serializer.save()
        send_account_email(student.email, password, "student")
        return Response(
            {
                "message": "Student created — credentials emailed.",
                "student_id": student.CID,
                "password": password,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAdmin])
def get_student(request, student_id: int):
    """
    GET /api/admin/students/<student_id>/

    Return the full profile of a single student.
    Response 200: student_to_dict(student)
    Response 404: if the CID does not exist
    """
    student = get_object_or_404(Student, CID=student_id)
    return Response(student_to_dict(student))


@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_student(request, student_id: int):
    """
    PUT /api/admin/students/<student_id>/update/

    Full update of a student's editable fields.
    The password is never changed here — use reset-password for that.

    Response 200: { message }
    Response 400: validation errors
    Response 404: student not found
    """
    student = get_object_or_404(Student, CID=student_id)
    serializer = CreateStudentSerializer(student, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Student updated successfully."})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_student(request, student_id: int):
    """
    DELETE /api/admin/students/<student_id>/delete/

    Permanently remove a student and all their related data (cascades
    are handled by the DB).

    Response 200: { message }
    Response 404: student not found
    """
    get_object_or_404(Student, CID=student_id).delete()
    return Response({"message": "Student deleted successfully."})


# ──────────────────────────────────────────────────────────────────────────────
# 3. STUDENT ACTIONS  –  block / unblock / reset-password / upload
# ──────────────────────────────────────────────────────────────────────────────


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def block_student(request, student_id: int):
    """
    PATCH /api/admin/students/block/<student_id>/

    Prevent a student from logging in.
    Sets is_blocked=True and is_active=False so the auth backend rejects them.
    """
    student = get_object_or_404(Student, CID=student_id)
    student.is_blocked = True
    student.is_active = False
    student.save()
    return Response({"message": "Student blocked."})


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def unblock_student(request, student_id: int):
    """
    PATCH /api/admin/students/unblock/<student_id>/

    Re-enable a previously blocked student.
    """
    student = get_object_or_404(Student, CID=student_id)
    student.is_blocked = False
    student.is_active = True
    student.save()
    return Response({"message": "Student unblocked."})


@api_view(["POST"])
@permission_classes([IsAdmin])
def reset_password_student(request, student_id: int):
    """
    POST /api/admin/students/reset-password/<student_id>/

    Generate a new random password for the student, save it, flag
    ``is_first_login=True`` so the frontend prompts a change, and
    email the new credentials.

    Response 200: { message }
    Response 404: student not found
    """
    student = get_object_or_404(Student, CID=student_id)
    new_password = generate_password()
    student.set_password(new_password)
    student.is_first_login = True
    student.save()
    send_account_email(student.email, new_password, "student")
    return Response({"message": "Student password reset — new credentials emailed."})


@api_view(["POST"])
@permission_classes([IsAdmin])
def upload_students(request):
    """
    POST /api/admin/students/upload/

    Bulk-import students from a CSV or XLSX file.
    Each valid row creates a student account and emails credentials.

    Form field: ``file`` (multipart/form-data)
    Response 200: { message, created, errors }
    Response 400: no file provided
    """
    file = request.FILES.get("file")
    if not file:
        return Response(
            {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
        )
    created, errors, imported_users = import_Student_from_file(file)
    return Response(
        {
            "message": f"{created} student(s) imported.",
            "created": created,
            "errors": errors,
            "users": imported_users,
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# 4. STAFF CRUD
# ──────────────────────────────────────────────────────────────────────────────


@api_view(["POST"])
@permission_classes([IsAdmin])
def create_staff(request):
    """
    POST /api/admin/staff/create/

    Create a new Staff account (teacher or admin).
    A random password is generated and emailed.

    Request body: { email, first_name, last_name, is_admin, is_teacher }
    Response 201: { message, staff_id }
    Response 400: validation errors
    """
    serializer = CreateStaffSerializer(data=request.data)
    if serializer.is_valid():
        staff, password = serializer.save()
        send_account_email(staff.email, password, "staff")
        return Response(
            {
                "message": "Staff created — credentials emailed.",
                "staff_id": staff.TID,
                "password": password,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAdmin])
def get_staff(request, staff_id: int):
    """
    GET /api/admin/staff/<staff_id>/

    Return the full profile of a single staff member.
    """
    staff = get_object_or_404(Staff, TID=staff_id)
    return Response(staff_to_dict(staff))


@api_view(["PUT"])
@permission_classes([IsAdmin])
def update_staff(request, staff_id: int):
    """
    PUT /api/admin/staff/<staff_id>/update/

    Full update of a staff member's editable fields.
    """
    staff = get_object_or_404(Staff, TID=staff_id)
    serializer = CreateStaffSerializer(staff, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Staff updated successfully."})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAdmin])
def delete_staff(request, staff_id: int):
    """
    DELETE /api/admin/staff/<staff_id>/delete/

    Permanently remove a staff member.
    """
    get_object_or_404(Staff, TID=staff_id).delete()
    return Response({"message": "Staff deleted successfully."})


# ──────────────────────────────────────────────────────────────────────────────
# 5. STAFF ACTIONS  –  block / unblock / reset-password / upload
# ──────────────────────────────────────────────────────────────────────────────


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def block_staff(request, staff_id: int):
    """
    PATCH /api/admin/staff/block/<staff_id>/

    Prevent a staff member from logging in.
    """
    staff = get_object_or_404(Staff, TID=staff_id)
    staff.is_blocked = True
    staff.is_active = False
    staff.save()
    return Response({"message": "Staff blocked."})


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def unblock_staff(request, staff_id: int):
    """
    PATCH /api/admin/staff/unblock/<staff_id>/

    Re-enable a previously blocked staff member.
    """
    staff = get_object_or_404(Staff, TID=staff_id)
    staff.is_blocked = False
    staff.is_active = True
    staff.save()
    return Response({"message": "Staff unblocked."})


@api_view(["POST"])
@permission_classes([IsAdmin])
def reset_password_staff(request, staff_id: int):
    """
    POST /api/admin/staff/reset-password/<staff_id>/

    Reset a staff member's password and email the new credentials.
    """
    staff = get_object_or_404(Staff, TID=staff_id)
    new_password = generate_password()
    staff.set_password(new_password)
    staff.is_first_login = True
    staff.save()
    send_account_email(staff.email, new_password, "staff")
    return Response({"message": "Staff password reset — new credentials emailed."})


@api_view(["POST"])
@permission_classes([IsAdmin])
def upload_staff(request):
    """
    POST /api/admin/staff/upload/

    Bulk-import staff members from a CSV or XLSX file.

    Form field: ``file`` (multipart/form-data)
    Response 200: { message, created, errors }
    Response 400: no file provided
    """
    file = request.FILES.get("file")
    if not file:
        return Response(
            {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
        )
    created, errors, imported_users = import_staff_from_file(file)
    return Response(
        {
            "message": f"{created} staff member(s) imported.",
            "created": created,
            "errors": errors,
            "users": imported_users,
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# 6. DASHBOARD STATS  –  GET /api/admin/dashboard/
# ──────────────────────────────────────────────────────────────────────────────


@api_view(["GET"])
@permission_classes([IsAdmin])
def dashboard_stats(request):
    """
    GET /api/admin/dashboard/

    Aggregated platform statistics for the admin dashboard overview card.

    Response 200:
    {
        students: { total, active, blocked },
        staff:    { total, active, blocked },
        roles:    { admins, teachers }
    }
    """
    return Response(
        {
            "students": {
                "total": Student.objects.count(),
                "active": Student.objects.filter(is_active=True).count(),
                "blocked": Student.objects.filter(is_blocked=True).count(),
            },
            "staff": {
                "total": Staff.objects.count(),
                "active": Staff.objects.filter(is_active=True).count(),
                "blocked": Staff.objects.filter(is_blocked=True).count(),
            },
            "roles": {
                "admins": Staff.objects.filter(is_admin=True).count(),
                "teachers": Staff.objects.filter(is_teacher=True).count(),
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsAdmin])
def dashboard_analytics(request):
    """
    GET /api/admin/dashboard/analytics/  (internal — not in public spec)

    Time-series data for the last 6 months:
        - New users per month (students + staff separately)
        - Student distribution by academic year
        - Student distribution by specialty

    Uses Django's DB-agnostic ``TruncMonth`` (works with both SQLite and Postgres).
    """
    six_months_ago = datetime.now() - timedelta(days=180)

    students_by_month = (
        Student.objects.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("CID"))
        .order_by("month")
    )

    staff_by_month = (
        Staff.objects.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("TID"))
        .order_by("month")
    )

    students_by_academic_year = (
        Student.objects.values("academic_year")
        .annotate(count=Count("CID"))
        .order_by("academic_year")
    )

    students_by_specialty = (
        Student.objects.values("specialty")
        .annotate(count=Count("CID"))
        .order_by("-count")
    )

    return Response(
        {
            "users_per_month": {
                "students": list(students_by_month),
                "staff": list(staff_by_month),
            },
            "students_by_academic_year": list(students_by_academic_year),
            "students_by_specialty": list(students_by_specialty),
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# ADVANCED ANALYTICS
# ──────────────────────────────────────────────────────────────────────────────

class AdvancedAnalyticsAPI(APIView):
    """
    GET /api/admin/analytics/advanced/
    
    A comprehensive analytics engine providing metrics for:
    - Student activity & risk detection
    - Academic performance (grades, trends)
    - Operational efficiency (tasks, delays)
    - System usage
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        from projects.models import Projects, SProjects
        from tasks.models import Task
        from jury.models import Grades, ProjectJury

        now = datetime.now()
        thirty_days_ago = now - timedelta(days=30)

        # 1. Active vs Inactive Students
        total_students = Student.objects.count()
        students_with_group = SProjects.objects.values('CID').distinct().count()
        
        # 2. At-risk Students (Past-due tasks)
        at_risk_count = Task.objects.filter(
            state__in=['todo', 'in_progress'], 
            deadline__lt=now.date()
        ).values('assignments__CID').distinct().count()

        # 3. Grade Trends (by month)
        grade_trends = (
            Grades.objects.filter(final_grade__isnull=False)
            .annotate(month=TruncMonth('PID__creation_date'))
            .values('month')
            .annotate(avg_grade=models.Avg('final_grade'))
            .order_by('month')
        )

        # 4. Specialty Performance (Module difficulty)
        specialty_performance = (
            Projects.objects.filter(grades__final_grade__isnull=False)
            .values('specialty')
            .annotate(avg_grade=models.Avg('grades__final_grade'), count=Count('PID'))
            .order_by('-avg_grade')
        )

        # 5. Pass/Fail Rates
        all_grades = Grades.objects.filter(final_grade__isnull=False)
        pass_count = all_grades.filter(final_grade__gte=10).count()
        fail_count = all_grades.filter(final_grade__lt=10).count()

        # 6. Task Completion Rate
        total_tasks = Task.objects.count()
        done_tasks = Task.objects.filter(state='done').count()

        # 7. Late Submissions (Approximate: Past due tasks)
        late_tasks_count = Task.objects.filter(deadline__lt=now.date()).exclude(state='done').count()

        # 8. Teacher Grading Patterns (Average grade given)
        # We need to aggregate across g1, g2, g3 based on ProjectJury
        # This is complex, let's do a simpler version first
        teacher_patterns = (
            Staff.objects.filter(is_teacher=True)
            .annotate(
                avg_given=models.Avg('jury_as_president__PID__grades__final_grade')
            )
            .values('TID', 'first_name', 'last_name', 'avg_given')
            .filter(avg_given__isnull=False)
            .order_by('-avg_given')[:10]
        )

        # 9. System Usage (Creations per month)
        usage_trends = (
            Projects.objects.annotate(month=TruncMonth('creation_date'))
            .values('month')
            .annotate(projects=Count('PID'))
            .order_by('month')
        )

        return Response({
            "student_stats": {
                "active": students_with_group,
                "inactive": total_students - students_with_group,
                "at_risk": at_risk_count,
            },
            "performance": {
                "grade_trends": list(grade_trends),
                "specialty_ranking": list(specialty_performance),
                "pass_rate": round((pass_count / all_grades.count() * 100) if all_grades.count() > 0 else 0, 1),
                "fail_rate": round((fail_count / all_grades.count() * 100) if all_grades.count() > 0 else 0, 1),
            },
            "operations": {
                "task_completion_rate": round((done_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
                "late_tasks": late_tasks_count,
                "total_tasks": total_tasks,
            },
            "teacher_patterns": list(teacher_patterns),
            "usage_trends": list(usage_trends),
        })


# ──────────────────────────────────────────────────────────────────────────────
# 7. ACADEMIC STRUCTURE  –  GET /api/admin/academic-structure/
# ──────────────────────────────────────────────────────────────────────────────


class AcademicStructureAPI(APIView):
    """
    GET /api/admin/academic-structure/

    Returns the full tree: each department with its nested specialties.
    Read-only — the structure is managed through the departments and
    specialties endpoints, not this one.

    Response 200: [ { id, name, specialties: [{id, name}, ...] }, ... ]
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        departments = Department.objects.prefetch_related("specialties").all()
        serializer = DepartmentWithSpecialtiesSerializer(departments, many=True)
        return Response(serializer.data)


# ──────────────────────────────────────────────────────────────────────────────
# 8. DEPARTMENTS  –  GET /api/admin/departments/
# ──────────────────────────────────────────────────────────────────────────────


class DepartmentListAPI(APIView):
    """
    GET /api/admin/departments/

    Flat list of all departments (id + name only, no nested specialties).
    The department list is fixed (seeded at setup) and read-only here.

    Response 200: [ { id, name }, ... ]
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        departments = Department.objects.all().order_by("name")
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)


# ──────────────────────────────────────────────────────────────────────────────
# 9. SPECIALTIES  –  GET/POST /api/admin/specialties/
#                    PATCH/DELETE /api/admin/specialties/<id>/
# ──────────────────────────────────────────────────────────────────────────────


class SpecialtyListCreateAPI(APIView):
    """
    GET  /api/admin/specialties/  – list all specialties
    POST /api/admin/specialties/  – create a new specialty

    Specialties are linked to departments.  The ``department`` FK must be
    provided on create.

    POST request body: { name, department }
    POST response 201: serialized specialty
    GET  response 200: list of all specialties
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        specialties = Specialty.objects.select_related("department").order_by("name")
        serializer = SpecialtySerializer(specialties, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SpecialtySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SpecialtyDetailAPI(APIView):
    """
    PATCH  /api/admin/specialties/<id>/  – partial update (rename, change dept)
    DELETE /api/admin/specialties/<id>/  – remove a specialty

    Note: deleting a specialty that has students assigned to it will orphan
    those student records (specialty is a CharField, not an FK).  Confirm
    before deleting through the admin UI.
    """

    permission_classes = [IsAdmin]

    def patch(self, request, id: int):
        specialty = get_object_or_404(Specialty, id=id)
        serializer = SpecialtySerializer(specialty, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id: int):
        get_object_or_404(Specialty, id=id).delete()
        return Response({"message": "Specialty deleted successfully."})


# ──────────────────────────────────────────────────────────────────────────────
# 10. GRADE FORMULAS
#     GET/POST /api/admin/grade-formula/
#     GET      /api/admin/grade-formula/active/
#     PATCH    /api/admin/grade-formula/<id>/activate/
# ──────────────────────────────────────────────────────────────────────────────


class GradeFormulaView(APIView):
    """
    GET  /api/admin/grade-formula/  – list all stored formulas (history)
    POST /api/admin/grade-formula/  – create a new grading formula

    Formulas are mathematical expressions (e.g. ``0.4*written + 0.6*oral``)
    validated by ``jury.services.grading_engine.validate_formula`` before
    being persisted.  Only one formula can be active at a time.

    POST request body: { name, expression, description? }
    POST response 201: { message, id }
    GET  response 200: [ { id, name, expression, description, is_active, created_at }, ... ]
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        formulas = GradingFormula.objects.all().order_by("-created_at")
        data = [
            {
                "id": f.id,
                "name": f.name,
                "expression": f.formula_expression,
                "description": f.description,
                "is_active": f.is_active,
                "created_at": f.created_at,
            }
            for f in formulas
        ]
        return Response(data)

    def post(self, request):
        name = request.data.get("name")
        expression = request.data.get("expression")
        description = request.data.get("description", "")

        if not name or not expression:
            return Response(
                {"error": "Both 'name' and 'expression' are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate the formula expression before persisting it
        is_valid, error = validate_formula(expression)
        if not is_valid:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        formula = GradingFormula.objects.create(
            name=name,
            formula_expression=expression,
            description=description,
            created_by=request.user,
        )
        return Response(
            {"message": "Formula created successfully.", "id": formula.id},
            status=status.HTTP_201_CREATED,
        )


class ActiveFormulaView(APIView):
    """
    GET /api/admin/grade-formula/active/

    Return the currently active grading formula, or a friendly message
    if none has been activated yet.

    Response 200: { id, name, expression, description }
                  or { message: "No active formula set yet" }
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        formula = GradingFormula.objects.filter(is_active=True).first()
        if not formula:
            return Response({"message": "No active formula set yet."})
        return Response(
            {
                "id": formula.id,
                "name": formula.name,
                "expression": formula.formula_expression,
                "description": formula.description,
            }
        )


class ActivateFormulaView(APIView):
    """
    PATCH /api/admin/grade-formula/<formula_id>/activate/

    Deactivate the current active formula (if any) and activate the
    selected one.  Returns 400 if the formula is already active.

    Response 200: { message, id, expression }
    Response 400: already active
    Response 404: formula not found
    """

    permission_classes = [IsAdmin]

    def patch(self, request, formula_id: int):
        formula = get_object_or_404(GradingFormula, id=formula_id)

        if formula.is_active:
            return Response(
                {"error": "This formula is already active."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Deactivate all others first (there should only be one, but be safe)
        GradingFormula.objects.filter(is_active=True).update(is_active=False)

        formula.is_active = True
        formula.save()

        return Response(
            {
                "message": f'Formula "{formula.name}" is now active.',
                "id": formula.id,
                "expression": formula.formula_expression,
            }
        )


# ──────────────────────────────────────────────────────────────────────────────
# 11. PLATFORM SETTINGS  –  GET/PATCH /api/admin/platform-settings/
# ──────────────────────────────────────────────────────────────────────────────


class PlatformSettingsAPI(APIView):
    """
    GET   /api/admin/platform-settings/  – read current settings
    PATCH /api/admin/platform-settings/  – update one or more settings

    The PlatformSettings table has exactly **one row** (a singleton pattern).
    It is seeded by a migration; if missing for any reason, ``first()``
    returns None and the serializer will raise an error — the seed migration
    should always be run.

    Currently exposed settings:
        students_can_see_archived_projects (bool)

    When updating, ``updated_by`` is set to the requesting admin automatically.

    PATCH request body: { students_can_see_archived_projects: true/false }
    Response 200: { message, data: { students_can_see_archived_projects } }
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        settings_obj = PlatformSettings.objects.first()
        serializer = PlatformSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request):
        settings_obj = PlatformSettings.objects.first()
        serializer = PlatformSettingsSerializer(
            settings_obj, data=request.data, partial=True
        )
        if serializer.is_valid():
            old_year = settings_obj.current_academic_year
            new_year = request.data.get("current_academic_year")

            instance = cast(PlatformSettings, serializer.save())
            instance.updated_by = request.user  # record which admin made the change
            instance.save()

            # If the academic year has changed, archive all active projects
            if new_year and new_year != old_year:
                from projects.models import Projects
                archived_count = Projects.objects.filter(archived=False).update(archived=True)
                return Response(
                    {
                        "message": f"Platform settings updated. Academic year changed from {old_year} to {new_year}. {archived_count} projects archived.",
                        "data": serializer.data,
                    }
                )

            return Response(
                {"message": "Platform settings updated.", "data": serializer.data}
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
