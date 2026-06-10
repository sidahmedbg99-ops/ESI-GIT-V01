from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from users.permissions import IsAdmin, IsStaff
from .models import ProjectJury, Schedule, Grades, GradingFormula
from .serializers import ProjectJurySerializer, ScheduleSerializer, GradesSerializer
from notifications.utils import notify
from projects.models import SProjects, Projects
from users.models import Staff


LEVEL_LABELS = {2: '2CPI', 3: '1CS', 4: '2CS', 5: '3CS'}


def _check_and_notify_grading_completion(graded_project):
    """
    After a project is graded, check if all active projects in its level —
    and possibly all levels — are now graded. Notify admins accordingly.
    De-duplicated via PlatformSettings.graded_notified_levels and all_graded_notified.
    """
    from admin_panel.models import PlatformSettings

    settings = PlatformSettings.get_settings()
    level = graded_project.academic_level
    year = graded_project.year

    if not level or not year:
        return

    # Active project levels we care about (2-5)
    active_levels = list(
        Projects.objects.filter(archived=False, year=year, academic_level__in=LEVEL_LABELS.keys())
        .values_list('academic_level', flat=True)
        .distinct()
    )
    if not active_levels:
        return

    already_notified = settings.graded_notified_levels or []
    admins = list(Staff.objects.filter(is_admin=True))

    # Per-level check
    if level not in already_notified:
        level_projects = Projects.objects.filter(archived=False, year=year, academic_level=level)
        total = level_projects.count()
        graded = Grades.objects.filter(PID__in=level_projects).count()
        if total > 0 and graded >= total:
            label = LEVEL_LABELS.get(level, f'Level {level}')
            for admin in admins:
                notify(
                    recipient_type="staff",
                    recipient_id=admin.TID,
                    title=f"All {label} projects graded",
                    message=f"All {label} projects for {year} have been graded and are ready to archive.",
                )
            already_notified = list(set(already_notified + [level]))
            settings.graded_notified_levels = already_notified
            settings.save(update_fields=['graded_notified_levels'])

    # All-levels check
    if not settings.all_graded_notified:
        all_done = all(
            Grades.objects.filter(
                PID__in=Projects.objects.filter(archived=False, year=year, academic_level=lvl)
            ).count()
            >= Projects.objects.filter(archived=False, year=year, academic_level=lvl).count() > 0
            for lvl in active_levels
        )
        if all_done:
            for admin in admins:
                notify(
                    recipient_type="staff",
                    recipient_id=admin.TID,
                    title="All active projects graded",
                    message=f"All active projects for {year} have been graded. You can now proceed with archiving.",
                )
            settings.all_graded_notified = True
            settings.save(update_fields=['all_graded_notified'])


# ─────────────────────────────────────────
# Jury Assignment
# ─────────────────────────────────────────

@api_view(["POST"])
def assign_jury(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    try:
        from projects.models import Projects
        project = Projects.objects.get(pk=pk)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    # project must be supervisor-approved before jury can be assigned
    if not project.final_submission_approved:
        return Response(
            {"error": "Project must be approved by supervisor before assigning jury"},
            status=400
        )

    teacher1_id = request.data.get("teacher1_id")
    teacher2_id = request.data.get("teacher2_id")
    teacher3_id = request.data.get("teacher3_id")

    # all 3 teachers must be distinct
    if len({teacher1_id, teacher2_id, teacher3_id}) < 3:
        return Response({"error": "Jury members must be 3 distinct teachers"}, status=400)

    # supervisor must be one of the 3
    supervisor_id = project.TID_id
    ids_as_int = [int(x) for x in [teacher1_id, teacher2_id, teacher3_id] if x is not None]
    if supervisor_id and supervisor_id not in ids_as_int:
        return Response(
            {"error": "Project supervisor must be one of the jury members"},
            status=400
        )

    serializer = ProjectJurySerializer(data={**request.data, "PID": pk})
    if serializer.is_valid():
        jury, created = ProjectJury.objects.update_or_create(
            PID=project,
            defaults={
                "teacher1_id": serializer.validated_data["teacher1_id"],
                "teacher2_id": serializer.validated_data["teacher2_id"],
                "teacher3_id": serializer.validated_data["teacher3_id"],
            },
        )

        # notify all 3 jury teachers
        for teacher in [jury.teacher1_id, jury.teacher2_id, jury.teacher3_id]:
            notify(
                recipient_type="staff",
                recipient_id=teacher.TID,
                title="Jury assignment",
                message=f'You have been assigned as a jury member for "{project.name}".',
            )

        # notify all project members
        members = SProjects.objects.filter(PID=project).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title="Jury assigned",
                message=f'A jury has been assigned to your project "{project.name}".',
            )

        return Response({"message": "Jury assigned successfully", "created": created}, status=201)
    return Response(serializer.errors, status=400)

@api_view(["PATCH"])
def edit_jury(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    try:
        from projects.models import Projects
        project = Projects.objects.get(pk=pk)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    try:
        jury = ProjectJury.objects.get(PID=project)
    except ProjectJury.DoesNotExist:
        return Response({"error": "No jury assigned to this project yet"}, status=404)

    teacher1_id = request.data.get("teacher1_id")
    teacher2_id = request.data.get("teacher2_id")
    teacher3_id = request.data.get("teacher3_id")

    if len({teacher1_id, teacher2_id, teacher3_id}) < 3:
        return Response({"error": "Jury members must be 3 distinct teachers"}, status=400)

    supervisor_id = project.TID_id
    ids_as_int = [int(x) for x in [teacher1_id, teacher2_id, teacher3_id] if x is not None]
    if supervisor_id and supervisor_id not in ids_as_int:
        return Response({"error": "Project supervisor must be one of the jury members"}, status=400)

    from users.models import Staff
    try:
        t1 = Staff.objects.get(TID=teacher1_id)
        t2 = Staff.objects.get(TID=teacher2_id)
        t3 = Staff.objects.get(TID=teacher3_id)
    except Staff.DoesNotExist:
        return Response({"error": "One or more teachers not found"}, status=400)

    # snapshot old state before overwriting: {tid: role}
    old_map = {
        jury.teacher1_id_id: "president",
        jury.teacher2_id_id: "examiner1",
        jury.teacher3_id_id: "examiner2",
    }
    # new state: teacher1 is always president (slot 1)
    new_map = {
        t1.TID: "president",
        t2.TID: "examiner1",
        t3.TID: "examiner2",
    }

    old_ids = set(old_map.keys())
    new_ids = set(new_map.keys())
    added       = new_ids - old_ids
    removed     = old_ids - new_ids
    stayed      = old_ids & new_ids
    role_changed = {tid for tid in stayed if old_map[tid] != new_map[tid]}

    jury.teacher1_id = t1
    jury.teacher2_id = t2
    jury.teacher3_id = t3
    jury.save()

    # notify added
    for tid in added:
        notify(
            recipient_type="staff",
            recipient_id=tid,
            title="Jury assignment",
            message=f'You have been assigned as a jury member for "{project.name}".',
        )

    # notify removed
    for tid in removed:
        notify(
            recipient_type="staff",
            recipient_id=tid,
            title="Jury removal",
            message=f'You have been removed from the jury for "{project.name}".',
        )

    # notify role changes
    role_label = {"president": "Président", "examiner1": "Examinateur 1", "examiner2": "Examinateur 2"}
    for tid in role_changed:
        notify(
            recipient_type="staff",
            recipient_id=tid,
            title="Jury role updated",
            message=f'Your role in the jury for "{project.name}" has changed from {role_label[old_map[tid]]} to {role_label[new_map[tid]]}.',
        )

    # notify group members if anything changed
    anything_changed = added or removed or role_changed
    if anything_changed:
        members = SProjects.objects.filter(PID=project).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title="Jury updated",
                message=f'The jury for your project "{project.name}" has been updated.',
            )

    return Response({"message": "Jury updated successfully"}, status=200)

# ─────────────────────────────────────────
# Jury List
# ─────────────────────────────────────────

@api_view(["GET"])
def list_juries(request):
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    # Only include juries for approved projects with final submission approved
    juries = ProjectJury.objects.filter(PID__status="approved", PID__final_submission_approved=True)
    serializer = ProjectJurySerializer(juries, many=True)
    return Response(serializer.data)


# ─────────────────────────────────────────
# Schedule
# ─────────────────────────────────────────

@api_view(["POST"])
def create_schedule(request):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    pid = request.data.get("PID")
    try:
        from projects.models import Projects
        project = Projects.objects.get(pk=pid)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    if not project.final_submission_approved:
        return Response(
            {"error": "Project must be approved by supervisor before scheduling"},
            status=400
        )

    serializer = ScheduleSerializer(data=request.data)
    if serializer.is_valid():
        schedule = serializer.save()

        members = SProjects.objects.filter(PID=schedule.PID).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title="Defense scheduled",
                message=(
                    f'Your project defense has been scheduled on '
                    f'{schedule.presentation_date} at {schedule.presentation_time} '
                    f'in room {schedule.room}.'
                ),
            )

        return Response({"message": "Defense scheduled successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_schedules(request):
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    schedules = Schedule.objects.all().order_by("presentation_date", "presentation_time")
    serializer = ScheduleSerializer(schedules, many=True)
    return Response(serializer.data)


# ─────────────────────────────────────────
# Grades
# ─────────────────────────────────────────

@api_view(["POST"])
def create_grades(request):
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    serializer = GradesSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades saved successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_grades(request):
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    grades = Grades.objects.all()
    serializer = GradesSerializer(grades, many=True)
    return Response(serializer.data)


@api_view(["PUT", "PATCH"])
def update_grades(request, pid):
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    try:
        grade = Grades.objects.get(PID=pid)
    except Grades.DoesNotExist:
        return Response({"error": "Grades not found"}, status=404)

    serializer = GradesSerializer(grade, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades updated"})
    return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# President submits grades
# ─────────────────────────────────────────

class TeacherSubmitGradeView(APIView):
    """
    POST /api/jury/grades/submit/<pid>/
    Only the jury president (teacher1) can submit grades.
    Expects all variables defined in the active formula to be present.
    """

    def post(self, request, pid):
        if not IsStaff().has_permission(request, None):
            return Response({"error": "Staff only"}, status=403)

        try:
            from projects.models import Projects
            project = Projects.objects.get(pk=pid)
        except Projects.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        # check jury exists
        try:
            jury = ProjectJury.objects.get(PID=project)
        except ProjectJury.DoesNotExist:
            return Response({"error": "No jury assigned to this project"}, status=404)

        # only president can submit
        teacher = request.user  # already the authenticated Staff instance

        if jury.teacher1_id != teacher:
            return Response(
                {"error": "Only the jury president can submit grades"},
                status=403
            )

        # validate all formula variables are present
        from jury.models import GradingFormula
        formula = GradingFormula.objects.filter(is_active=True).first()
        if not formula:
            return Response({"error": "No active grading formula found"}, status=400)

        values = request.data.get("values", {})
        missing = [k for k in formula.labels.keys() if k not in values or values[k] is None]
        if missing:
            return Response(
                {"error": f"Missing grades for: {', '.join([formula.labels[k] for k in missing])}"},
                status=400
            )

        # validate all values are between 0 and 20
        for key, val in values.items():
            try:
                v = float(val)
                if v < 0 or v > 20:
                    return Response(
                        {"error": f"{formula.labels.get(key, key)} must be between 0 and 20"},
                        status=400
                    )
            except (TypeError, ValueError):
                return Response(
                    {"error": f"{formula.labels.get(key, key)} must be a number"},
                    status=400
                )

        # save grades — Grades.save() computes final_grade automatically
        grade, _ = Grades.objects.get_or_create(PID=project)
        grade.formula = formula
        grade.values = {k: float(v) for k, v in values.items()}
        grade.comments = request.data.get("comments", "")
        grade.save()

        if grade.final_grade is None:
            return Response(
                {"error": "Could not compute the final grade — check the active grading formula for errors with these values."},
                status=500
            )

        # notify project members
        members = SProjects.objects.filter(PID=project).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title="Project graded",
                message=f'Your project "{project.name}" has been graded. Final grade: {grade.final_grade}/20.',
            )

        # notify admins when a level / all levels are fully graded
        _check_and_notify_grading_completion(project)

        return Response({
            "message": "Grades submitted successfully",
            "final_grade": grade.final_grade,
            "values": grade.values,
            "formula_snapshot": grade.formula_snapshot,
        }, status=201)
