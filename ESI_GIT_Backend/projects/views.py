from rest_framework import generics, filters
from rest_framework.views import APIView
from .models import Projects, ProjectAttachment, SupervisorRequest
from .serializers import AdminProjectSerializer
from users.permissions import IsAdmin
from rest_framework.decorators import api_view
from rest_framework.response import Response
from users.models import Student
from .models import SProjects
from .serializers import StudentWithoutGroupSerializer
from .serializers import AdminGroupListSerializer
from .serializers import AdminGroupDetailsSerializer
from typing import cast, Dict, Any
from users.models import Staff
from rest_framework import status
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from jury.models import ProjectJury, Schedule, Grades
from admin_panel.models import PlatformSettings
from users.permissions import IsAdmin, IsStaff, IsStudent
from .serializers import StudentProjectSerializer


class AdminProjectListCreateView(generics.ListCreateAPIView):
    queryset = Projects.objects.all().order_by("-creation_date")
    serializer_class = AdminProjectSerializer
    permission_classes = [IsAdmin]

    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "specialty", "year"]


class AdminProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Projects.objects.all()
    serializer_class = AdminProjectSerializer
    permission_classes = [IsAdmin]


@api_view(["GET"])
def Students_without_group(request):
    # use same admin permission system
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    students = Student.objects.exclude(
        CID__in=SProjects.objects.filter(PID__archived=False).values_list("CID", flat=True)
    )

    serializer = StudentWithoutGroupSerializer(students, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def admin_groups_list(request):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    search = request.GET.get("search", "")
    year = request.GET.get("year")
    specialty = request.GET.get("specialty")

    groups = Projects.objects.filter(archived=False)

    if search:
        groups = groups.filter(name__icontains=search)

    if year:
        groups = groups.filter(year=year)

    if specialty:
        groups = groups.filter(specialty__icontains=specialty)

    serializer = AdminGroupListSerializer(groups.order_by("-creation_date"), many=True, context={"request": request})
    return Response(serializer.data)


@api_view(["GET"])
def admin_group_details(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    try:
        group = Projects.objects.get(pk=pk)
    except Projects.DoesNotExist:
        return Response({"error": "Group not found"}, status=404)

    serializer = AdminGroupDetailsSerializer(group)
    return Response(serializer.data)





@api_view(["GET"])
def admin_projects_analytics(request):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    today = timezone.now().date()
    start_month = today.replace(day=1)

    total_archived = Projects.objects.filter(archived=True).count()

    submissions_this_month = ProjectAttachment.objects.filter(
        uploaded_at__date__gte=start_month
    ).count()

    total_projects = Projects.objects.count()
    completed_projects = Projects.objects.filter(archived=True).count()

    completion_rate = 0
    if total_projects > 0:
        completion_rate = int((completed_projects / total_projects) * 100)

    progress_by_year = (
        Projects.objects.values("year").annotate(total=Count("PID")).order_by("year")
    )

    six_months_ago = today - timedelta(days=180)

    from django.db.models.functions import TruncMonth
    monthly_submissions = (
        ProjectAttachment.objects.filter(uploaded_at__date__gte=six_months_ago)
        .annotate(month=TruncMonth("uploaded_at"))
        .values("month")
        .annotate(total=Count("id"))
        .order_by("month")
    )

    return Response(
        {
            "total_archived_projects": total_archived,
            "submissions_this_month": submissions_this_month,
            "completion_rate": completion_rate,
            "projects_progress": progress_by_year,
            "monthly_submissions": monthly_submissions,
        }
    )


@api_view(["GET"])
def archived_projects(request):
    """
    Archived projects visibility rules:

    ADMIN  -> always allowed
    STAFF  -> always allowed
    STUDENT -> allowed only if admin enabled it in PlatformSettings
    """

    # detect roles using your teammate permissions
    is_admin = IsAdmin().has_permission(request, None)
    is_staff = IsStaff().has_permission(request, None)
    is_student = IsStudent().has_permission(request, None)

    # Admin or Staff → always allowed
    if is_admin or is_staff:
        projects = Projects.objects.filter(archived=True).order_by("-creation_date")
        serializer = AdminProjectSerializer(projects, many=True, context={"request": request})
        return Response(serializer.data)

    # Student → check platform settings
    if is_student:
        settings = PlatformSettings.get_settings()

        # if settings table is empty -> hide archived by default
        if not settings or not settings.students_can_see_archived_projects:
            return Response(
                {"error": "Archived projects are hidden for students"}, status=403
            )

        projects = Projects.objects.filter(archived=True).order_by("-creation_date")
        serializer = StudentProjectSerializer(projects, many=True, context={"request": request})
        return Response(serializer.data)

    return Response({"error": "Unauthorized"}, status=403)


@api_view(["PATCH"])
def archive_project(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    try:
        project = Projects.objects.get(pk=pk)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    # business rule: minimum 2 members required before archiving
    member_count = SProjects.objects.filter(PID=project).count()
    if member_count < 2:
        return Response(
            {"error": "Cannot archive a project with fewer than 2 members."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    project.archived = True
    project.save()

    # notify all project members
    from notifications.utils import notify
    members = SProjects.objects.filter(PID=project).select_related("CID")
    for m in members:
        notify(
            recipient_type="student",
            recipient_id=m.CID.CID,
            title="Project archived",
            message=f"Your project \"{project.name}\" has been archived.",
        )

    return Response({"message": "Project archived successfully"})


@api_view(["PATCH"])
def restore_project(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    try:
        project = Projects.objects.get(pk=pk)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    project.archived = False
    project.save()

    return Response({"message": "Project restored successfully"})


@api_view(["GET"])
def admin_dashboard_stats(request):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    total_Student = Student.objects.count()
    total_teachers = Staff.objects.count()

    total_projects = Projects.objects.count()
    pending_projects = Projects.objects.filter(status="pending").count()
    approved_projects = Projects.objects.filter(status="approved").count()
    archived_projects = Projects.objects.filter(archived=True).count()

    juries_assigned = ProjectJury.objects.count()
    defenses_scheduled = Schedule.objects.count()
    graded_projects = Grades.objects.count()

    return Response(
        {
            "Student": total_Student,
            "teachers": total_teachers,
            "projects": {
                "total": total_projects,
                "pending": pending_projects,
                "approved": approved_projects,
                "archived": archived_projects,
            },
            "defense": {
                "juries_assigned": juries_assigned,
                "scheduled": defenses_scheduled,
                "graded": graded_projects,
            },
        }
    )


@api_view(["GET", "PATCH"])
def archived_projects_visibility(request):
    """
    GET  -> return current visibility
    PATCH -> admin updates visibility
    """

    settings = PlatformSettings.get_settings()

    # If settings row doesn't exist, create it automatically
    if not settings:
        settings = PlatformSettings.objects.create()

    # ---------------- GET ----------------
    if request.method == "GET":
        if not (
            IsAdmin().has_permission(request, None)
            or IsStaff().has_permission(request, None)
        ):
            return Response({"error": "Unauthorized"}, status=403)

        return Response(
            {
                "students_can_see_archived_projects": settings.students_can_see_archived_projects
            }
        )

    # ---------------- PATCH (ADMIN ONLY) ----------------
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    value = request.data.get("students_can_see_archived_projects")

    if value is None:
        return Response(
            {"error": "students_can_see_archived_projects is required"},
            status=400,
        )

    settings.students_can_see_archived_projects = value
    settings.updated_by = request.user
    settings.save()

    return Response(
        {
            "message": "Visibility updated",
            "students_can_see_archived_projects": settings.students_can_see_archived_projects,
        }
    )

class AdminAssignStudentView(APIView):
    def post(self, request, pk):
        if not IsAdmin().has_permission(request, None):
            return Response({"error": "Admin only"}, status=403)

        student_id = request.data.get("student_id")
        role = request.data.get("role", "member")
        is_leader = request.data.get("is_leader", False)

        try:
            project = Projects.objects.get(pk=pk)
        except Projects.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        try:
            student = Student.objects.get(CID=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        if SProjects.objects.filter(
            CID=student,
            PID__academic_level=student.level,
            PID__archived=False,
        ).exists():
            return Response({"error": "Student is already in an active group this year"}, status=400)

        if SProjects.objects.filter(
            CID=student,
            PID__academic_level=student.level,
            PID__archived=True,
        ).exists():
            return Response({"error": "Student already participated in a project this year"}, status=400)

        

        # If making this student leader, remove existing leader first
        if is_leader:
            SProjects.objects.filter(PID=project, is_leader=True).update(is_leader=False)

        SProjects.objects.create(
            CID=student,
            PID=project,
            role=role,
            is_leader=is_leader,
        )

        return Response({"success": True}, status=201)
    
class AdminRemoveStudentView(APIView):
    def delete(self, request, pk):
        if not IsAdmin().has_permission(request, None):
            return Response({"error": "Admin only"}, status=403)
        
        student_id = request.data.get("student_id")
        if not student_id:
            return Response({"error": "student_id is required"}, status=400)
        try:
            project = Projects.objects.get(pk=pk)
        except Projects.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)
        
        membership = SProjects.objects.filter(PID=project, CID__CID=student_id).first()
        if not membership:
            return Response({"error": "Student not in this group"}, status=404)

        if membership.is_leader:
            return Response({"error": "Cannot remove the group leader"}, status=400)

        membership.delete()
    
    
class AdminChangeSupervisorView(APIView):
    def patch(self, request, pk):
        if not IsAdmin().has_permission(request, None):
            return Response({"error": "Admin only"}, status=403)

        teacher_id = request.data.get("teacher_id")
        if not teacher_id:
            return Response({"error": "teacher_id is required"}, status=400)

        try:
            project = Projects.objects.get(pk=pk)
        except Projects.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

        try:
            teacher = Staff.objects.get(TID=teacher_id)
        except Staff.DoesNotExist:
            return Response({"error": "Teacher not found"}, status=404)

        old_supervisor = project.TID
        project.TID = teacher
        project.save()

        from notifications.utils import notify
        notify(
            recipient_type="staff",
            recipient_id=teacher.TID,
            title="Encadrement assigné",
            message=f'Un administrateur vous a assigné comme encadreur du groupe "{project.name}".',
        )
        if old_supervisor and old_supervisor.TID != teacher.TID:
            notify(
                recipient_type="staff",
                recipient_id=old_supervisor.TID,
                title="Encadrement retiré",
                message=f'Un administrateur vous a retiré comme encadreur du groupe "{project.name}".',
            )

        # Cancel all pending supervision requests for this project so teachers
        # don't see stale requests they can no longer accept
        pending_reqs = SupervisorRequest.objects.filter(
            project_id=project, status="pending"
        )
        for req in pending_reqs:
            req_teacher = req.teacher_id
            req.status = "admin_assigned"
            req.save()
            # Notify each teacher whose request is being voided
            if req_teacher.TID != teacher.TID:
                notify(
                    recipient_type="staff",
                    recipient_id=req_teacher.TID,
                    title="Demande d'encadrement annulée",
                    message=f'Un administrateur a assigné directement un encadreur au groupe "{project.name}". La demande de ce groupe vous concernant a été annulée.',
                )

        # Notify the group leader
        try:
            leader_membership = SProjects.objects.get(PID=project, is_leader=True)
            notify(
                recipient_type="student",
                recipient_id=leader_membership.CID.CID,
                title="Encadreur assigné",
                message=f'Un administrateur a assigné {teacher.full_name} comme encadreur de votre groupe "{project.name}".',
            )
        except Exception:
            pass

        return Response({"success": True, "teacher_name": teacher.full_name})

# ─────────────────────────────────────────
# STUDENT SIDE VIEWS
# ─────────────────────────────────────────
from users.permissions import IsStudent
from .serializers import CreateProjectSerializer, ProjectSerializer
import secrets
import string


def generate_invite_code():
    chars = string.ascii_uppercase + string.digits  # consistent with uppercase invite codes
    while True:
        code = "".join(secrets.choice(chars) for _ in range(8))
        if not Projects.objects.filter(invite_code=code).exists():
            return code


class CreateProjectView(APIView):
    """
    POST /api/projects/create/
    Creates a new project. Student who creates it becomes leader automatically.
    Requires: Authorization: Bearer <token> (students only)
    """

    permission_classes = [IsStudent]

    def post(self, request):
        serializer = CreateProjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        student = request.user

        # business rule: one project per student per year
        if SProjects.objects.filter(
            CID=student, PID__academic_level=student.level, PID__archived=False
        ).exists():
            return Response(
                {"error": "You are already in an active project this year."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if SProjects.objects.filter(
            CID=student, PID__academic_level=student.level, PID__archived=True
        ).exists():
            return Response(
                {"error": "You already participated in a project during this academic year. Please contact the admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # create the project
        data = cast(Dict[str, Any], serializer.validated_data)

        from admin_panel.models import PlatformSettings as PS
        ps = PS.get_settings()
        project = Projects.objects.create(
            name=data["name"],
            type=data["type"],
            specialty=student.specialty,
            academic_level=student.level,
            invite_code=generate_invite_code(),
            year=ps.current_academic_year,
        )
        # add student as leader automatically
        SProjects.objects.create(
            CID=student,
            PID=project,
            role=data["role"],
            is_leader=True,
        )

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class JoinProjectView(APIView):
    """
    POST /api/projects/join/
    { "invite_code": "abc12345" }
    Student joins a project using an invite code.
    """

    permission_classes = [IsStudent]

    def post(self, request):
        invite_code = request.data.get("invite_code")
        student = request.user

        if not invite_code:
            return Response(
                {"error": "Invite code is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # find the project with this invite code
        try:
            project = Projects.objects.get(invite_code=invite_code)
        except Projects.DoesNotExist:
            return Response(
                {"error": "Invalid invite code"}, status=status.HTTP_404_NOT_FOUND
            )

        # can't join an archived project
        if project.archived:
            return Response(
                {"error": "This project is archived"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # check student level matches project level
        if project.academic_level != student.level:
            return Response(
                {"error": "You cannot join a project outside your current level."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # check student isn't already in an active project this year
        if SProjects.objects.filter(
            CID=student, PID__academic_level=student.level, PID__archived=False
        ).exists():
            return Response(
                {"error": "You are already in an active project this year."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # check if student already participated in a project this year (e.g. redid year)
        if SProjects.objects.filter(
            CID=student, PID__academic_level=student.level, PID__archived=True
        ).exists():
            return Response(
                {"error": "You already participated in a project during this academic year. Please contact the admin."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # check team size — max 6 members
        member_count = SProjects.objects.filter(PID=project).count()
        if member_count >= 6:
            return Response(
                {"error": "This project already has the maximum number of members (6)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # add the student to the project
        SProjects.objects.create(
            CID=student,
            PID=project,
            role=request.data.get("role", "fullstack"),
            is_leader=False,
        )

        # notify the leader that a new member joined
        from notifications.utils import notify
        try:
            leader_membership = SProjects.objects.get(PID=project, is_leader=True)
            notify(
                recipient_type="student",
                recipient_id=leader_membership.CID.CID,
                title="New member joined",
                message=f"{student.full_name} has joined your project '{project.name}'.",
            )
        except SProjects.DoesNotExist:
            pass

        return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)


class MyProjectView(APIView):
    """
    GET /api/projects/my-project/
    Returns the logged in student's current project.
    """

    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        # find student's membership in a project this year
        try:
            membership = SProjects.objects.get(
                CID=student, PID__academic_level=student.level, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = membership.PID  # the actual project object
        return Response(ProjectSerializer(project).data)


class LeaderActionsView(APIView):
    """
    PATCH /api/projects/leader/
    Leader only actions: kick member, promote leader, edit project info.
    """

    permission_classes = [IsStudent]

    def patch(self, request):
        student = request.user
        action = request.data.get("action")

        # check student is a leader
        try:
            membership = SProjects.objects.get(
                CID=student, PID__academic_level=student.level, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # update_role is the only action a non-leader can call (for their own role)
        if not membership.is_leader and action != "update_role":
            return Response(
                {"error": "Only the leader can perform this action"},
                status=status.HTTP_403_FORBIDDEN,
            )

        project = membership.PID

        # KICK a member
        if action == "kick":
            target_cid = request.data.get("target_cid")
            if not target_cid:
                return Response({"error": "target_cid is required"}, status=400)

            try:
                target = SProjects.objects.get(CID__CID=target_cid, PID=project)
            except SProjects.DoesNotExist:
                return Response(
                    {"error": "Student not found in this project"}, status=404
                )

            if target.is_leader:
                return Response({"error": "Cannot kick the leader"}, status=400)

            target.delete()
            return Response({"message": "Member kicked successfully"})

        # PROMOTE a member to leader
        elif action == "promote":
            target_cid = request.data.get("target_cid")
            if not target_cid:
                return Response({"error": "target_cid is required"}, status=400)

            try:
                target = SProjects.objects.get(CID__CID=target_cid, PID=project)
            except SProjects.DoesNotExist:
                return Response(
                    {"error": "Student not found in this project"}, status=404
                )

            # remove leader from current leader
            membership.is_leader = False
            membership.save()

            # give leader to target
            target.is_leader = True
            target.save()

            return Response({"message": f"Leader transferred successfully"})

        # EDIT project info
        elif action == "edit":
            name = request.data.get("name")
            type = request.data.get("type")
            github_url = request.data.get("github_url")
            submitted = request.data.get("submitted_to_supervisor")
            description = request.data.get("description")
            tech_stack = request.data.get("tech_stack")

            if name:
                project.name = name
            if type:
                project.type = type
            if github_url is not None:
                project.github_url = github_url
            if description is not None:
                project.description = description
            if tech_stack is not None:
                project.tech_stack = tech_stack

            # final submission to supervisor
            if submitted is not None:
                # can only submit if project has a supervisor
                if not project.TID:
                    return Response(
                        {"error": "You need a supervisor before submitting"},
                        status=400
                    )
                project.submitted_to_supervisor = submitted
                # clear feedback when resubmitting
                if submitted:
                    project.supervisor_feedback = None

            project.save()
            return Response(ProjectSerializer(project).data)

        # UPDATE ROLE of a member (leader can change anyone's role, member can change their own)
        elif action == "update_role":
            target_cid = request.data.get("target_cid")
            new_role    = request.data.get("role")

            if not target_cid or not new_role:
                return Response(
                    {"error": "target_cid and role are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            valid_roles = [r.value for r in SProjects.RoleChoices]
            if new_role not in valid_roles:
                return Response(
                    {"error": f"Invalid role. Choose from: {', '.join(valid_roles)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                target = SProjects.objects.get(CID__CID=target_cid, PID=project)
            except SProjects.DoesNotExist:
                return Response(
                    {"error": "Student not found in this project"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # leader can update anyone's role; a member can only update their own
            is_own_role = str(target_cid) == str(student.CID)
            if not membership.is_leader and not is_own_role:
                return Response(
                    {"error": "You can only change your own role"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            target.role = new_role
            target.save()
            return Response({"message": "Role updated successfully"})

        else:
            return Response(
                {"error": "Invalid action. Use kick, promote, edit, or update_role"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LeaveProjectView(APIView):
    """
    POST /api/projects/leave/
    Student leaves their current project.
    Leader cannot leave unless they promote someone first.
    """

    permission_classes = [IsStudent]

    def post(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(
                CID=student, PID__academic_level=student.level, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # leader can't leave without promoting someone first
        if membership.is_leader:
            member_count = SProjects.objects.filter(PID=membership.PID).count()
            if member_count > 1:
                return Response(
                    {"error": "You must promote a new leader before leaving"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        project = membership.PID
        membership.delete()

        # if no members remain, delete the project entirely
        if not SProjects.objects.filter(PID=project).exists():
            project.delete()

        return Response({"message": "You have left the project"})

    # Leader can leave if he is alone, if he does the group is deleted


class SupervisorRequestView(APIView):
    """
    POST /api/projects/supervisor-request/
    { "teacher_id": 1, "message": "optional message" }
    Leader sends a supervision request to a teacher.

    GET /api/projects/supervisor-request/
    Leader views all supervisor requests for their project.
    """

    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        # get student's current project
        try:
            membership = SProjects.objects.get(
                CID=student, PID__academic_level=student.level, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_leader:
            return Response(
                {"error": "Only the leader can view supervisor requests"},
                status=status.HTTP_403_FORBIDDEN,
            )

        requests = SupervisorRequest.objects.filter(project_id=membership.PID)
        from .serializers import SupervisorRequestSerializer

        return Response(SupervisorRequestSerializer(requests, many=True).data)

    def post(self, request):
        student = request.user
        teacher_id = request.data.get("teacher_id")
        message = request.data.get("message", "")

        if not teacher_id:
            return Response(
                {"error": "teacher_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # get student's current project
        try:
            membership = SProjects.objects.get(
                CID=student, PID__academic_level=student.level, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_leader:
            return Response(
                {"error": "Only the leader can send supervisor requests"},
                status=status.HTTP_403_FORBIDDEN,
            )

        project = membership.PID

        # project already has a supervisor
        if project.TID is not None:
            return Response(
                {"error": "This project already has a supervisor"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # find the teacher
        try:
            from users.models import Staff

            teacher = Staff.objects.get(TID=teacher_id)
        except Staff.DoesNotExist:
            return Response(
                {"error": "Teacher not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # check teacher is available
        if not teacher.available:
            return Response(
                {"error": "This teacher is not available"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # check no duplicate request to same teacher
        already_requested = SupervisorRequest.objects.filter(
            project_id=project, teacher_id=teacher
        ).exists()

        if already_requested:
            return Response(
                {"error": "You already sent a request to this teacher"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # create the request
        supervisor_request = SupervisorRequest.objects.create(
            project_id=project, teacher_id=teacher, message=message, status="pending"
        )

        # notify the teacher
        from notifications.utils import notify
        notify(
            recipient_type="staff",
            recipient_id=teacher.TID,
            title="New supervision request",
            message=(
                f'The group "{project.name}" has requested you as their supervisor.'
                + (f' Message: {message}' if message else '')
            ),
        )

        from .serializers import SupervisorRequestSerializer

        return Response(
            SupervisorRequestSerializer(supervisor_request).data,
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────
# AVAILABLE SUPERVISORS LIST
# ─────────────────────────────────────────

class AvailableSupervisorsView(APIView):
    """
    GET /api/projects/available-supervisors/
    Returns all teachers who are available (available=True) and not blocked.
    Used by students when creating a project and selecting a supervisor to request.
    """
    permission_classes = [IsStudent]

    def get(self, request):
        supervisors = Staff.objects.filter(
            available=True,
            is_blocked=False,
            is_teacher=True,
            is_first_login=False,
        ).order_by("last_name", "first_name")

        data = [
            {
                "TID": t.TID,
                "_id": t.TID,
                "email": t.email,
                "first_name": t.first_name,
                "last_name": t.last_name,
                "name": f"{t.first_name} {t.last_name}",
                "full_name": f"{t.first_name} {t.last_name}",
                "specialty": t.specialty.name if t.specialty else "",
                "department": t.department.cycle if t.department else "",
                "available": t.available,
            }
            for t in supervisors
        ]

        return Response(data)

class AttachmentView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        try:
            membership = SProjects.objects.get(CID=request.user, PID__academic_level=request.user.level, PID__archived=False)

            attachments = ProjectAttachment.objects.filter(PID=membership.PID)
            data = [
                {
                    "id": a.id,
                    "filename": a.filename,
                    "title": a.title,
                    "attachment_type": a.attachment_type,
                    "file_size": a.file_size,
                    "uploaded_by": a.uploaded_by.full_name if a.uploaded_by else None,
                    "uploaded_at": a.uploaded_at,
                    "is_final": a.is_final,
                    "file": request.build_absolute_uri(a.file.url) if a.file else None,
                }
                for a in attachments
            ]
            return Response(data)
        except SProjects.DoesNotExist:
            return Response({"error": "You are not in a project"}, status=404)

    def post(self, request):
        try:
            membership = SProjects.objects.get(CID=request.user, PID__academic_level=request.user.level, PID__archived=False)

        except SProjects.DoesNotExist:
            return Response({"error": "You are not in a project"}, status=404)

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=400)

        attachment = ProjectAttachment.objects.create(
            PID=membership.PID,
            uploaded_by=request.user,
            file=file,
            filename=file.name,
            file_size=file.size,
            attachment_type=request.data.get("attachment_type", "other"),
            title=request.data.get("title", file.name),
            description=request.data.get("description", ""),
            version=request.data.get("version", ""),
            is_final=request.data.get("is_final", False),
        )
        return Response({"id": attachment.id, "filename": attachment.filename}, status=201)

    def delete(self, request):
        try:
            membership = SProjects.objects.get(
                CID=request.user, PID__academic_level=request.user.level, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response({"error": "You are not in a project"}, status=404)

        if not membership.is_leader:
            return Response({"error": "Only the project leader can delete attachments."}, status=403)

        if membership.PID.final_submission_approved:
            return Response({"error": "Attachments cannot be deleted after the supervisor has approved the final submission."}, status=400)

        attachment_id = request.data.get("attachment_id")
        if not attachment_id:
            return Response({"error": "attachment_id is required"}, status=400)

        try:
            attachment = ProjectAttachment.objects.get(id=attachment_id, PID=membership.PID)
        except ProjectAttachment.DoesNotExist:
            return Response({"error": "Attachment not found"}, status=404)

        attachment.file.delete(save=False)  # delete from disk too
        attachment.delete()
        return Response({"message": "Attachment deleted"})

# add after AttachmentView class:

class ProjectAttachmentsReadView(APIView):
    """Read-only attachment list for admin and jury members."""

    def get(self, request, pid):
        from users.models import Staff
        from jury.models import ProjectJury

        # allow admin
        is_admin = IsAdmin().has_permission(request, None)

        # allow jury member
        is_jury = False
        if not is_admin and request.user.is_authenticated:
            try:
                staff = Staff.objects.get(TID=request.user.id)
                jury  = ProjectJury.objects.get(PID_id=pid)
                is_jury = staff in [jury.teacher1_id, jury.teacher2_id, jury.teacher3_id]
            except (Staff.DoesNotExist, ProjectJury.DoesNotExist):
                pass

        if not is_admin and not is_jury:
            return Response({"error": "Forbidden"}, status=403)

        attachments = ProjectAttachment.objects.filter(PID_id=pid).order_by("-uploaded_at")
        data = [
            {
                "id":              a.id,
                "filename":        a.filename,
                "attachment_type": a.attachment_type,
                "uploaded_at":     a.uploaded_at,
                "file_url":        request.build_absolute_uri(a.file.url) if a.file else None,
            }
            for a in attachments
        ]
        return Response(data)
    

class StudentGroupStatusView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user
        students = Student.objects.filter(
            academic_year=student.academic_year,
            specialty=student.specialty,
            is_active=True,
            is_blocked=False,
        ).exclude(CID=student.CID)

        data = []
        for s in students:
            has_group = SProjects.objects.filter(
                CID=s, PID__archived=False
            ).exists()
            data.append({
                "CID": s.CID,
                "full_name": s.full_name,
                "has_group": has_group,
            })

        return Response(data)


class PublicSettingsView(APIView):
    permission_classes = []

    def get(self, request):
        from admin_panel.models import PlatformSettings
        settings = PlatformSettings.get_settings()
        return Response({
            "current_academic_year": settings.current_academic_year,
            "contact_email": settings.contact_email,
            "students_can_see_attachments": settings.students_can_see_attachments,
        })