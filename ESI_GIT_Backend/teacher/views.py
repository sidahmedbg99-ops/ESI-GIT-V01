"""
Teacher-side views for ESI-GIT.

Endpoints covered:
  - Profile: toggle availability
  - Dashboard: aggregated stats
  - Groups: supervised groups + pending supervisor requests
  - Group detail: full info + progress adjust + upload github/pdf
  - Tasks: assign task to group
  - Meetings: list, create (auto-approved), accept/reject student requests
  - Jury: list defenses, submit evaluation
"""

from typing import Any, Dict, cast

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Avg
from django.utils import timezone

from projects.serializers import ProjectSerializer
from users.permissions import IsStaff
from users.models import Staff
from projects.models import Projects, SProjects, SupervisorRequest, ProjectAttachment
from meetings.models import Meeting
from tasks.models import Task, TaskAssignment
from jury.models import ProjectJury, Schedule, Grades, GradingFormula
from jury.services.grading_engine import calculate_final_grade, ALLOWED_FUNCTIONS

from .serializers import (
    TeacherGroupListSerializer,
    TeacherGroupDetailSerializer,
    TeacherSupervisorRequestSerializer,
    TeacherMeetingSerializer,
    TeacherCreateMeetingSerializer,
    TeacherAssignTaskSerializer,
    TeacherJurySerializer,
    TeacherEvaluationSerializer,
    TeacherDashboardSerializer,
)


# ─────────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────────


def get_teacher(request):
    """Return the authenticated Staff object."""
    return request.user  # already a Staff instance (IsStaff permission ensures this)


# ─────────────────────────────────────────────────────────────
# 1. PROFILE — toggle availability
# ─────────────────────────────────────────────────────────────


class TeacherProfileView(APIView):
    """
    GET  /api/teacher/profile/      → returns teacher info + availability
    PATCH /api/teacher/profile/     → toggle available field
        body: { "available": true/false }
    """

    permission_classes = [IsStaff]

    def get(self, request):
        teacher = get_teacher(request)
        return Response(
            {
                "TID": teacher.TID,
                "first_name": teacher.first_name,
                "last_name": teacher.last_name,
                "email": teacher.email,
                "available": teacher.available,
                "is_admin": teacher.is_admin,
            }
        )

    def patch(self, request):
        teacher = get_teacher(request)
        available = request.data.get("available")

        if available is None:
            return Response(
                {"error": "available field is required (true or false)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        teacher.available = bool(available)
        teacher.save()

        return Response(
            {
                "message": f"Availability set to {teacher.available}",
                "available": teacher.available,
            }
        )


# ─────────────────────────────────────────────────────────────
# 2. DASHBOARD
# ─────────────────────────────────────────────────────────────


class TeacherDashboardView(APIView):
    """
    GET /api/teacher/dashboard/
    Returns aggregated stats for the logged-in teacher.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        teacher = get_teacher(request)

        # supervised groups (projects where TID = this teacher, not archived)
        supervised = Projects.objects.filter(TID=teacher, archived=False)
        active = supervised.filter(status="approved")

        # pending supervisor requests sent by students to this teacher
        pending_requests = SupervisorRequest.objects.filter(
            teacher_id=teacher, status="pending"
        ).count()

        # pending meeting requests (created by students, not yet answered)
        pending_meetings = Meeting.objects.filter(
            PID__TID=teacher,
            created_by_student__isnull=False,
            status="pending",
        ).count()

        # pending jury evaluations (this teacher is a jury member, not yet graded)
        jury_pending = (
            ProjectJury.objects.filter(teacher1_id=teacher)
            | ProjectJury.objects.filter(teacher2_id=teacher)
            | ProjectJury.objects.filter(teacher3_id=teacher)
        )
        jury_pending_count = jury_pending.exclude(
            PID__in=Grades.objects.values("PID")
        ).count()

        # task state breakdown across all supervised projects
        tasks = Task.objects.filter(PID__in=supervised)
        task_stats = {
            "todo": tasks.filter(state="todo").count(),
            "in_progress": tasks.filter(state="in_progress").count(),
            "done": tasks.filter(state="done").count(),
        }

        # average progress across supervised groups
        avg_progress = 0
        if supervised.exists():
            total = 0
            for p in supervised:
                t = Task.objects.filter(PID=p)
                done = t.filter(state="done").count()
                count = t.count()
                total += (done / count * 100) if count else 0
            avg_progress = round(total / supervised.count())

        # completion rate: groups where all tasks are done / total supervised
        completion_rate = 0
        if supervised.exists():
            completed = sum(
                1
                for p in supervised
                if Task.objects.filter(PID=p).exists()
                and not Task.objects.filter(PID=p).exclude(state="done").exists()
            )
            completion_rate = round(completed / supervised.count() * 100)

        # average livrable grade
        avg_livrable = ProjectAttachment.objects.filter(
            PID__in=supervised, is_final=True
        ).aggregate(avg=Avg("file_size"))
        # (file_size is the only numeric field on attachments; replace with a grade
        #  field if you add one later)

        # per-group progress for the bar chart
        groups_progress = []
        for p in supervised:
            t = Task.objects.filter(PID=p)
            done = t.filter(state="done").count()
            count = t.count()
            pct = round(done / count * 100) if count else 0
            groups_progress.append({"group": p.invite_code, "progress": pct})

        # task priority breakdown
        task_priority = {
            "high": tasks.filter(priority=3).count(),
            "medium": tasks.filter(priority=2).count(),
            "low": tasks.filter(priority=1).count(),
        }

        # livrables average note (from Grades model)
        grades_qs = Grades.objects.filter(PID__in=supervised)
        avg_note = grades_qs.aggregate(avg=Avg("final_grade"))["avg"]
        avg_note = round(avg_note, 2) if avg_note else None

        # pending meeting list (for the "Réunions en attente" widget)
        pending_meeting_list = Meeting.objects.filter(
            PID__TID=teacher,
            created_by_student__isnull=False,
            status="pending",
        ).values("id", "title", "date", "time")

        return Response(
            {
                "groups_encadres": supervised.count(),
                "groups_actifs": active.count(),
                "avancement_moyen": avg_progress,
                "taux_completion": completion_rate,
                "reunions_en_attente": pending_meetings,
                "evaluations_en_attente": jury_pending_count,
                "task_stats": task_stats,
                "task_priority": task_priority,
                "groups_progress": groups_progress,
                "note_moyenne_livrables": avg_note,
                "pending_meetings": list(pending_meeting_list),
            }
        )


# ─────────────────────────────────────────────────────────────
# 3. GROUPS — list (supervised + pending requests)
# ─────────────────────────────────────────────────────────────


class TeacherGroupListView(APIView):
    """
    GET /api/teacher/groups/
    Returns:
      - groups: projects already supervised by this teacher
      - pending_requests: supervisor requests students sent to this teacher
    """

    permission_classes = [IsStaff]

    def get(self, request):
        teacher = get_teacher(request)

        groups = Projects.objects.filter(TID=teacher, archived=False)
        pending = SupervisorRequest.objects.filter(
            teacher_id=teacher, status="pending"
        ).select_related("project_id")

        return Response(
            {
                "groups": TeacherGroupListSerializer(groups, many=True).data,
                "pending_requests": TeacherSupervisorRequestSerializer(
                    pending, many=True
                ).data,
            }
        )


# ─────────────────────────────────────────────────────────────
# 4. GROUP DETAIL — full info + progress +10/-10 + github/pdf
# ─────────────────────────────────────────────────────────────


class TeacherGroupDetailView(APIView):
    """
    GET   /api/teacher/groups/<pid>/   → group detail
    PATCH /api/teacher/groups/<pid>/   → approve or reject final submission
        approve: { "final_submission_approved": true }
        reject:  { "final_submission_approved": false, "supervisor_feedback": "reason" }
    """

    permission_classes = [IsStaff]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _get_group(self, teacher, pid):
        try:
            return Projects.objects.get(PID=pid, TID=teacher, archived=False)
        except Projects.DoesNotExist:
            return None

    def _progress(self, project):
        tasks = Task.objects.filter(PID=project)
        total = tasks.count()
        done = tasks.filter(state="done").count()
        return round(done / total * 100) if total else 0

    def get(self, request, pid):
        teacher = get_teacher(request)
        project = self._get_group(teacher, pid)
        if not project:
            return Response({"error": "Group not found"}, status=404)

        return Response(
            TeacherGroupDetailSerializer(project, context={"teacher": teacher, "request": request}).data
        )

    def patch(self, request, pid):
        teacher = get_teacher(request)
        project = self._get_group(teacher, pid)
        if not project:
            return Response({"error": "Group not found"}, status=404)

        # handle final submission approval/rejection
        if not project.submitted_to_supervisor:
            return Response(
                {"error": "No final submission request from this group yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        approved = request.data.get("final_submission_approved")
        feedback = request.data.get("supervisor_feedback")

        if approved is None:
            return Response({"error": "No valid field to update"}, status=400)

        if approved:
            # approve — mark as approved and record the date
            project.final_submission_approved = True
            project.final_submission_date = timezone.now()
            project.finish_date = timezone.now().date()
            project.submitted_to_supervisor = True
            project.save(update_fields=[
                "final_submission_approved",
                "final_submission_date",
                "finish_date",
                "submitted_to_supervisor"
            ])

            # notify all members
            from notifications.utils import notify
            from projects.models import SProjects
            members = SProjects.objects.filter(PID=project).select_related("CID")
            for m in members:
                notify(
                    recipient_type="student",
                    recipient_id=m.CID_id,
                    title="Submission approved",
                    message=f'Your project "{project.name}" has been approved for presentation.',
                )
        else:
            # reject — reset submission, save feedback
            if not feedback:
                return Response(
                    {"error": "Feedback is required when rejecting a submission"},
                    status=400
                )
            project.submitted_to_supervisor = False
            project.final_submission_approved = False
            project.supervisor_feedback = feedback
            project.save(update_fields=[
                "submitted_to_supervisor",
                "final_submission_approved",
                "supervisor_feedback"
            ])

            # notify all members
            from notifications.utils import notify
            from projects.models import SProjects
            members = SProjects.objects.filter(PID=project).select_related("CID")
            for m in members:
                notify(
                    recipient_type="student",
                    recipient_id=m.CID_id,
                    title="Submission rejected",
                    message=f'Your project "{project.name}" was sent back. Check supervisor feedback.',
                )

        return Response(ProjectSerializer(project).data)


# ─────────────────────────────────────────────────────────────
# 5. SUPERVISOR REQUEST — accept / reject
# ─────────────────────────────────────────────────────────────


class TeacherSupervisorRequestActionView(APIView):
    """
    PATCH /api/teacher/supervisor-requests/<req_id>/
    body: { "action": "accept" | "reject" }

    - accept: sets request status=accepted, assigns teacher to project,
              rejects all other pending requests for the same project.
    - reject: sets request status=rejected only.
    """

    permission_classes = [IsStaff]

    def patch(self, request, req_id):
        teacher = get_teacher(request)
        action = request.data.get("action")

        if action not in ("accept", "reject"):
            return Response(
                {"error": "action must be 'accept' or 'reject'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            req = SupervisorRequest.objects.get(
                id=req_id, teacher_id=teacher, status="pending"
            )
        except SupervisorRequest.DoesNotExist:
            return Response(
                {"error": "Cette demande n'existe plus. Un administrateur a peut-être déjà assigné un encadreur à ce groupe."}, status=404
            )

        if action == "accept":
            project = req.project_id

            # guard: project already has a supervisor (e.g. admin assigned directly)
            if project.TID is not None:
                # Mark this request as voided so it disappears from the teacher's list
                req.status = "admin_assigned"
                req.save()
                return Response(
                    {"error": "Un administrateur a déjà assigné un encadreur à ce groupe."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # assign this teacher to the project
            project.TID = teacher
            project.status = Projects.StatusChoices.APPROVED
            project.save()

            # mark this request accepted
            req.status = "accepted"
            req.save()

            # auto-reject all other pending requests for this project
            SupervisorRequest.objects.filter(
                project_id=project, status="pending"
            ).exclude(id=req_id).update(status="rejected")

            # notify the project leader
            from notifications.utils import notify
            try:
                from projects.models import SProjects
                leader_m = SProjects.objects.get(PID=project, is_leader=True)
                notify(
                    recipient_type="student",
                    recipient_id=leader_m.CID.CID,
                    title="Supervision request accepted",
                    message=f"{teacher.full_name} has accepted your supervision request for '{project.name}'.",
                )
            except Exception:
                pass

            return Response(
                {"message": "Request accepted. You are now supervising this project."}
            )

        else:  # reject
            project = req.project_id
            req.status = "rejected"
            req.save()

            # notify ALL members
            from notifications.utils import notify
            from projects.models import SProjects
            members = SProjects.objects.filter(PID=project).select_related("CID")
            for m in members:
                notify(
                    recipient_type="student",
                    recipient_id=m.CID.CID,
                    title="Supervision request rejected",
                    message=f"{teacher.full_name} has rejected your supervision request for '{project.name}'.",
                )

            return Response({"message": "Request rejected."})


# ─────────────────────────────────────────────────────────────
# 6. MEETINGS
# ─────────────────────────────────────────────────────────────


class TeacherMeetingListCreateView(APIView):
    """
    GET  /api/teacher/meetings/   → list all meetings for supervised groups
    POST /api/teacher/meetings/   → teacher creates a meeting (auto-approved)
        body: { "project_id": <pid>, "title": "...", "date": "YYYY-MM-DD",
                "time": "HH:MM", "location": "..." }
    """

    permission_classes = [IsStaff]

    def get(self, request):
        teacher = get_teacher(request)
        meetings = Meeting.objects.filter(PID__TID=teacher).order_by("date", "time")
        return Response(TeacherMeetingSerializer(meetings, many=True).data)

    def post(self, request):
        teacher = get_teacher(request)

        serializer = TeacherCreateMeetingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = cast(Dict[str, Any], serializer.validated_data)
        pid = data["project_id"]

        # verify teacher supervises this project
        try:
            project = Projects.objects.get(PID=pid, TID=teacher, archived=False)
        except Projects.DoesNotExist:
            return Response(
                {"error": "Project not found or you are not its supervisor"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        location = serializer.validated_data.get("location") or serializer.validated_data.get("type", "Présentielle")
        meeting = Meeting.objects.create(
            PID=project,
            title=data["title"],
            date=data["date"],
            time=data["time"],
            location=location,
            created_by_staff=teacher,
            status="approved",
        )

        # notify all project members about the new meeting
        from notifications.utils import notify
        from projects.models import SProjects
        members = SProjects.objects.filter(PID=project).select_related('CID')
        for m in members:
            notify(
                recipient_type='student',
                recipient_id=m.CID.CID,
                title='New meeting scheduled',
                message=(
                    f'Your supervisor has scheduled a meeting: "{meeting.title}" '
                    f'on {meeting.date} at {meeting.time} at {meeting.location}.'
                ),
            )

        return Response(
            TeacherMeetingSerializer(meeting).data,
            status=status.HTTP_201_CREATED,
        )


class TeacherMeetingActionView(APIView):
    """
    PATCH /api/teacher/meetings/<meeting_id>/
    body: { "action": "accept" | "reject" | "cancel" }

    - accept / reject: only for student-created meetings that are still pending.
    - cancel: supervisor can cancel ANY meeting for their group (pending or approved),
              whether created by student or by themselves.
    """

    permission_classes = [IsStaff]

    def patch(self, request, meeting_id):
        teacher = get_teacher(request)
        action = request.data.get("action")

        if action not in ("accept", "reject", "cancel"):
            return Response(
                {"error": "action must be 'accept', 'reject', or 'cancel'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from notifications.utils import notify
        from projects.models import SProjects

        # ── CANCEL: supervisor can cancel any meeting for their group ──
        if action == "cancel":
            try:
                meeting = Meeting.objects.get(
                    id=meeting_id,
                    PID__TID=teacher,   # must belong to a group this teacher supervises
                )
            except Meeting.DoesNotExist:
                return Response(
                    {"error": "Meeting not found or you are not this group's supervisor"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if meeting.status == "cancelled":
                return Response(
                    {"error": "Meeting is already cancelled"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            reason = request.data.get("cancellation_reason", "")
            meeting.status = "cancelled"
            meeting.cancellation_reason = reason
            meeting.save()

            # notify all project members
            members = SProjects.objects.filter(PID=meeting.PID).select_related("CID")
            for m in members:
                notify(
                    recipient_type="student",
                    recipient_id=m.CID.CID,
                    title="Meeting cancelled",
                    message=f"The meeting '{meeting.title}' on {meeting.date} was cancelled."
                            + (f" Reason: {reason}" if reason else ""),
                )

            return Response(
                {
                    "message": "Meeting cancelled.",
                    "meeting": TeacherMeetingSerializer(meeting).data,
                }
            )

        # ── ACCEPT / REJECT: only for pending student-created meetings ──
        try:
            meeting = Meeting.objects.get(
                id=meeting_id,
                PID__TID=teacher,
                created_by_student__isnull=False,  # only student-created meetings
                status="pending",
            )
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Meeting not found or not eligible for this action"},
                status=status.HTTP_404_NOT_FOUND,
            )

        meeting.status = "approved" if action == "accept" else "rejected"
        meeting.save()

        # notify all project members
        verb = "approved" if action == "accept" else "rejected"
        members = SProjects.objects.filter(PID=meeting.PID).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title=f"Meeting {verb}",
                message=f"Your meeting '{meeting.title}' on {meeting.date} has been {verb} by your supervisor.",
            )

        return Response(
            {
                "message": f"Meeting {'approved' if action == 'accept' else 'rejected'}.",
                "meeting": TeacherMeetingSerializer(meeting).data,
            }
        )


# ─────────────────────────────────────────────────────────────
# 7. TASKS — teacher assigns a task to a group
# ─────────────────────────────────────────────────────────────


class TeacherAssignTaskView(APIView):
    """
    POST /api/teacher/groups/<pid>/tasks/
    body: {
        "title": "...", "description": "...", "type": "...",
        "priority": 1|2|3, "deadline": "YYYY-MM-DD"
    }
    Teacher creates a task for the group. Members decide among themselves who takes it.
    """

    permission_classes = [IsStaff]

    def post(self, request, pid):
        teacher = get_teacher(request)

        try:
            project = Projects.objects.get(PID=pid, TID=teacher, archived=False)
        except Projects.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        serializer = TeacherAssignTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = cast(Dict[str, Any], serializer.validated_data)

        if project.final_submission_approved:
            return Response(
                {"error": "This project has been finalized. No new tasks can be created."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task = Task.objects.create(
            PID=project,
            title=data["title"],
            description=data["description"],
            type=data["type"],
            priority=data["priority"],
            deadline=data["deadline"],
            created_by_supervisor=True,
        )

        from notifications.utils import notify
        members = SProjects.objects.filter(PID=project).select_related('CID')
        for m in members:
            notify(
                recipient_type='student',
                recipient_id=m.CID.CID,
                title='New task created',
                message=f'Your supervisor created a new task "{task.title}" that needs to be assigned.',
            )

        return Response(
            {"message": "Task created successfully", "task_id": task.id},
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────
# 8. JURY — list + evaluate
# ─────────────────────────────────────────────────────────────


class TeacherJuryListView(APIView):
    """
    GET /api/teacher/jury/
    Lists all defenses where this teacher is a jury member.
    Counts: assigned, à évaluer, évaluées.
    """

    permission_classes = [IsStaff]

    def get(self, request):
        from admin_panel.models import PlatformSettings
        settings = PlatformSettings.objects.first()
        if not settings or not settings.jury_page_visible:
            return Response(
                {"error": "The admin has disabled access to the jury page"},
                status=403
            )

        teacher = get_teacher(request)

        juries = (
            (
                ProjectJury.objects.filter(teacher1_id=teacher)
                | ProjectJury.objects.filter(teacher2_id=teacher)
                | ProjectJury.objects.filter(teacher3_id=teacher)
            )
            .distinct()
            .select_related("PID", "PID__TID", "teacher1_id", "teacher2_id", "teacher3_id")
        )

        graded_pids = set(Grades.objects.values_list("PID_id", flat=True))

        assigned = juries.count()
        evaluated = juries.filter(PID__in=graded_pids).count()
        to_evaluate = assigned - evaluated

        # Embed the active formula so the frontend builds the form dynamically
        active_formula = GradingFormula.objects.filter(is_active=True).first()
        formula_data = None
        if active_formula:
            formula_data = {
                "id": active_formula.id,
                "name": active_formula.name,
                "expression": active_formula.expression,
                "labels": active_formula.labels,   # {"g1": "Continuous work", ...}
            }

        return Response(
            {
                "assignees": assigned,
                "a_evaluer": to_evaluate,
                "evaluees": evaluated,
                "active_formula": formula_data,
                "defenses": TeacherJurySerializer(juries, many=True, context={"request": request, "graded_pids": graded_pids}).data,
            }
        )


class TeacherJuryEvaluateView(APIView):
    """
    POST /api/teacher/jury/<pid>/evaluate/
    body: {
        "values": {"g1": <float 0-20>, "g2": <float 0-20>, ...},  ← keys match active formula labels
        "validate_cpi": <bool>,   (optional)
        "comments":     "..."     (optional)
    }

    Final note is computed by the grading engine using the active GradingFormula expression.
    Only the Jury President (teacher1) may submit grades.
    """

    permission_classes = [IsStaff]

    def post(self, request, pid):
        teacher = get_teacher(request)

        # verify teacher is in the jury for this project
        try:
            jury = ProjectJury.objects.get(PID_id=pid)
        except ProjectJury.DoesNotExist:
            return Response({"error": "Jury not found for this project"}, status=404)

        if jury.teacher1_id != teacher:
            return Response(
                {"error": "Only the Jury President can input grades."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Fetch active formula — required
        formula = GradingFormula.objects.filter(is_active=True).first()
        if not formula:
            return Response(
                {"error": "No active grading formula. Please ask an admin to activate one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TeacherEvaluationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = cast(Dict[str, Any], serializer.validated_data)
        submitted_values: dict = d["values"]

        # Validate that all formula variables are present
        required_keys = set(formula.labels.keys())
        missing = required_keys - set(submitted_values.keys())
        if missing:
            return Response(
                {"error": f"Missing grade fields: {sorted(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Compute final grade via the grading engine
        try:
            final = eval(
                formula.expression,
                {"__builtins__": {}},
                {**ALLOWED_FUNCTIONS, **{k: float(v) for k, v in submitted_values.items()}},
            )
            final = round(max(0.0, min(20.0, float(final))), 2)
        except Exception as exc:
            return Response(
                {"error": f"Formula evaluation error: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        grades, _ = Grades.objects.get_or_create(PID_id=pid)
        grades.formula = formula
        grades.values = submitted_values
        grades.final_grade = final
        grades.comments = d.get("comments", grades.comments or "")
        # Freeze snapshot on first submission
        if not grades.formula_snapshot:
            grades.formula_snapshot = {
                "expression": formula.expression,
                "labels": formula.labels,
            }
        grades.save()

        return Response(
            {
                "message": "Evaluation submitted.",
                "final_grade": final,
                "formula_used": formula.name,
                "values": submitted_values,
            }
        )