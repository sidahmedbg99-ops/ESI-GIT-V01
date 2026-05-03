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

from users.permissions import IsStaff
from users.models import Staff
from projects.models import Projects, SProjects, SupervisorRequest, ProjectAttachment
from meetings.models import Meeting
from tasks.models import Task, TaskAssignment
from jury.models import ProjectJury, Schedule, Grades
from notifications.services import NotificationService

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
    PATCH /api/teacher/groups/<pid>/   → adjust progress (+10 / -10)
        body: { "action": "increase" | "decrease" }
              OR { "github_url": "https://..." }
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
            TeacherGroupDetailSerializer(project, context={"teacher": teacher}).data
        )

    def patch(self, request, pid):
        teacher = get_teacher(request)
        project = self._get_group(teacher, pid)
        if not project:
            return Response({"error": "Group not found"}, status=404)

        # --- Final Submission Approval ---
        if "final_submission_approved" in request.data:
            approved = request.data.get("final_submission_approved")
            project.final_submission_approved = bool(approved)
            if approved:
                project.final_submission_date = timezone.now()
            else:
                # If rejected, we reset the submission flag so student can re-submit
                project.submitted_to_supervisor = False
                project.supervisor_feedback = request.data.get("supervisor_feedback", "")
            
            project.save()
            return Response({
                "message": "Final submission status updated",
                "final_submission_approved": project.final_submission_approved,
                "submitted_to_supervisor": project.submitted_to_supervisor
            })

        # --- github url update ---
        github_url = request.data.get("github_url")
        if github_url is not None:
            project.github_url = github_url
            project.save()
            return Response({"message": "Github URL updated", "github_url": project.github_url})

        return Response({"error": "No valid action provided"}, status=status.HTTP_400_BAD_REQUEST)


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
                {"error": "Request not found or already handled"}, status=404
            )

        if action == "accept":
            project = req.project_id

            # guard: project already has a supervisor
            if project.TID is not None:
                return Response(
                    {"error": "Project already has a supervisor"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # assign this teacher to the project
            project.TID = teacher
            project.status = Projects.StatusChoices.APPROVED
            project.save()

            # mark this request accepted
            req.status = "accepted"
            req.save()

            # Notify students
            NotificationService.notify_supervisor_request_status(req)

            # auto-reject all other pending requests for this project
            other_reqs = SupervisorRequest.objects.filter(
                project_id=project, status="pending"
            ).exclude(id=req_id)
            
            for other in other_reqs:
                other.status = "rejected"
                other.save()
                NotificationService.notify_supervisor_request_status(other)

            return Response(
                {"message": "Request accepted. You are now supervising this project."}
            )

        else:  # reject
            req.status = "rejected"
            req.save()
            NotificationService.notify_supervisor_request_status(req)
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

        meeting = Meeting.objects.create(
            PID=project,
            title=data["title"],
            date=data["date"],
            time=data["time"],
            location=data["location"],
            created_by_staff=teacher,
            status="approved",
        )

        return Response(
            TeacherMeetingSerializer(meeting).data,
            status=status.HTTP_201_CREATED,
        )


class TeacherMeetingActionView(APIView):
    """
    PATCH /api/teacher/meetings/<meeting_id>/
    body: { "action": "accept" | "reject" }

    Only for meetings created by students (status=pending).
    Teacher-created meetings are always approved and cannot be rejected here.
    """

    permission_classes = [IsStaff]

    def patch(self, request, meeting_id):
        teacher = get_teacher(request)
        action = request.data.get("action")
        reason = request.data.get("reason", "")

        if action not in ("accept", "reject", "cancel"):
            return Response(
                {"error": "action must be 'accept', 'reject', or 'cancel'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            meeting = Meeting.objects.get(
                id=meeting_id,
                PID__TID=teacher,
            )
            
            # accept/reject only for pending student meetings
            if action in ("accept", "reject"):
                if meeting.created_by_student is None or meeting.status != "pending":
                    return Response({"error": "Only pending student meetings can be accepted/rejected"}, status=400)
            
            # cancel only for approved/confirmed meetings
            if action == "cancel":
                if meeting.status not in ("approved", "confirmed"):
                    return Response({"error": "Only approved or confirmed meetings can be cancelled"}, status=400)
        except Meeting.DoesNotExist:
            return Response(
                {"error": "Meeting not found or not eligible for this action"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if action == "cancel":
            meeting.status = "cancelled"
            meeting.cancellation_reason = reason
            # Send notification
            NotificationService.notify_meeting_cancelled(meeting, reason)
        elif action == "accept":
            meeting.status = "approved"
            # Notify group members their meeting was accepted
            NotificationService.notify_meeting_accepted(meeting)
        else:  # reject
            meeting.status = "rejected"
            # Notify group members their meeting was rejected
            NotificationService.notify_meeting_rejected(meeting, reason)
        
        meeting.save()

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
        "priority": 1|2|3, "deadline": "YYYY-MM-DD",
        "student_cid": <optional — assign to a specific student>
    }

    Note: Task.created_by is a required Student FK on the model.
    Since teachers cannot create tasks directly per the model constraint,
    we create the task as if the group leader created it (on behalf of teacher).
    If you want to support teacher-created tasks properly, add:
        created_by_staff = ForeignKey(Staff, null=True, blank=True)
    to the Task model.
    """

    permission_classes = [IsStaff]

    def post(self, request, pid):
        teacher = get_teacher(request)

        # verify teacher supervises this group
        try:
            project = Projects.objects.get(PID=pid, TID=teacher, archived=False)
        except Projects.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        serializer = TeacherAssignTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = cast(Dict[str, Any], serializer.validated_data)

        # find the group leader to set as created_by
        try:
            leader_membership = SProjects.objects.get(PID=project, is_leader=True)
            leader = leader_membership.CID
        except SProjects.DoesNotExist:
            return Response(
                {"error": "Group has no leader; cannot assign task"},
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

        # optional: assign to a specific student
        student_cid = data.get("student_cid")
        if student_cid:
            from users.models import Student

            try:
                student = Student.objects.get(CID=student_cid)
                # verify student is in this project
                SProjects.objects.get(CID=student, PID=project)
                TaskAssignment.objects.create(task_id=task, CID=student)
            except (Student.DoesNotExist, SProjects.DoesNotExist):
                # task created, assignment skipped silently
                pass

        return Response(
            {"message": "Task assigned successfully", "task_id": task.id},
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
        teacher = get_teacher(request)

        juries = (
            (
                ProjectJury.objects.filter(teacher1_id=teacher)
                | ProjectJury.objects.filter(teacher2_id=teacher)
                | ProjectJury.objects.filter(teacher3_id=teacher)
            )
            .distinct()
            .select_related("PID")
        )

        graded_pids = set(Grades.objects.values_list("PID_id", flat=True))

        assigned = juries.count()
        evaluated = juries.filter(PID__in=graded_pids).count()
        to_evaluate = assigned - evaluated

        return Response(
            {
                "assignees": assigned,
                "a_evaluer": to_evaluate,
                "evaluees": evaluated,
                "defenses": TeacherJurySerializer(
                    juries, many=True, context={"graded_pids": graded_pids}
                ).data,
            }
        )


class TeacherJuryEvaluateView(APIView):
    """
    POST /api/teacher/jury/<pid>/evaluate/
    body: {
        "presentation": <float 0-20>,
        "document":     <float 0-20>,
        "demo":         <float 0-20>,
        "validate_cpi": <bool>,          (optional — "Valider pour 2 CPI")
        "comments":     "..."            (optional)
    }

    Final note = presentation*0.20 + document*0.30 + demo*0.50
    Stored in the Grades model (grade1/grade2/grade3 are for the three jury members;
    this endpoint stores for whichever slot belongs to the current teacher).
    """

    permission_classes = [IsStaff]

    def post(self, request, pid):
        teacher = get_teacher(request)

        # verify teacher is in the jury for this project
        try:
            jury = ProjectJury.objects.get(PID_id=pid)
        except ProjectJury.DoesNotExist:
            return Response({"error": "Jury not found for this project"}, status=404)

        is_member = teacher in (
            jury.teacher1_id,
            jury.teacher2_id,
            jury.teacher3_id,
        )
        if not is_member:
            return Response(
                {"error": "You are not a jury member for this project"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TeacherEvaluationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = cast(Dict[str, Any], serializer.validated_data)
        final = round(
            d["presentation"] * 0.20 + d["document"] * 0.30 + d["demo"] * 0.50,
            2,
        )

        # determine which grade slot belongs to this teacher
        grades, _ = Grades.objects.get_or_create(PID_id=pid)

        if jury.teacher1_id == teacher:
            grades.grade1 = final
        elif jury.teacher2_id == teacher:
            grades.grade2 = final
        else:
            grades.grade3 = final

        grades.comments = d.get("comments", grades.comments or "")
        grades.save()  # Grades.save() recalculates final_grade automatically

        return Response(
            {
                "message": "Evaluation submitted.",
                "your_note": final,
                "final_grade": grades.final_grade,
                "components": {
                    "presentation": d["presentation"],
                    "document": d["document"],
                    "demo": d["demo"],
                },
            }
        )
