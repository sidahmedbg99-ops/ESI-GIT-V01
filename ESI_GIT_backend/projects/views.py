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
import random
import string


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
        CID__in=SProjects.objects.values_list("CID", flat=True)
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

    serializer = AdminGroupListSerializer(groups.order_by("-creation_date"), many=True)
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


@api_view(["POST"])
def assign_jury(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    try:
        project = Projects.objects.get(pk=pk)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    data = cast(Dict[str, Any], request.data)

    try:
        teacher1 = Staff.objects.get(TID=data.get("teacher1_id"))
        teacher2 = Staff.objects.get(TID=data.get("teacher2_id"))
        teacher3 = Staff.objects.get(TID=data.get("teacher3_id"))
    except Staff.DoesNotExist:
        return Response({"error": "Teacher not found"}, status=404)

    jury, created = ProjectJury.objects.update_or_create(
        PID=project,
        defaults={
            "teacher1_id": teacher1,
            "teacher2_id": teacher2,
            "teacher3_id": teacher3,
        },
    )

    return Response(
        {
            "message": "Jury assigned successfully",
            "created": created,
        },
        status=status.HTTP_200_OK,
    )


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
        serializer = AdminProjectSerializer(projects, many=True)
        return Response(serializer.data)

    # Student → check platform settings
    if is_student:
        settings = PlatformSettings.objects.first()

        # if settings table is empty -> hide archived by default
        if not settings or not settings.students_can_see_archived_projects:
            return Response(
                {"error": "Archived projects are hidden for students"}, status=403
            )

        projects = Projects.objects.filter(archived=True).order_by("-creation_date")
        serializer = StudentProjectSerializer(projects, many=True)
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

    project.archived = True
    project.save()

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

    settings = PlatformSettings.objects.first()

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


# ─────────────────────────────────────────
# STUDENT SIDE VIEWS
# ─────────────────────────────────────────
from users.permissions import IsStudent
from .serializers import CreateProjectSerializer, ProjectSerializer
import random
import string


def generate_invite_code():
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(chars, k=8))
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

        # business rule: one active project per student
        already_in_project = SProjects.objects.filter(
            CID=student, PID__archived=False
        ).exists()

        if already_in_project:
            return Response(
                {"error": "You are already in a project this year."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # create the project
        data = cast(Dict[str, Any], serializer.validated_data)

        project = Projects.objects.create(
            name=data["name"],
            type=data["type"],
            specialty=student.specialty,
            academic_level=student.level,
            invite_code=generate_invite_code(),
            year=student.academic_year,
        )

        # Do not assign supervisor directly here. 
        # The student will send a formal SupervisorRequest separately.
        # This ensures the teacher has a chance to Accept/Reject.
        pass
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
        try:
            invite_code = request.data.get("invite_code")
            if invite_code:
                invite_code = invite_code.strip()
            
            student = request.user

            if not invite_code:
                return Response(
                    {"error": "Invite code is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            # find the project with this invite code
            try:
                project = Projects.objects.get(invite_code__iexact=invite_code)
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

            # check student isn't already in a project (non-archived)
            already_in_project = SProjects.objects.filter(
                CID=student, PID__archived=False
            ).exists()

            if already_in_project:
                return Response(
                    {"error": "You are already in a project this year"},
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

            return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MyProjectView(APIView):
    """
    GET /api/projects/my-project/
    Returns the logged in student's current project.
    """

    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        # find student's membership in a non-archived project
        try:
            membership = SProjects.objects.filter(
                CID=student, PID__archived=False
            ).first()
            if not membership:
                raise SProjects.DoesNotExist()
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
    from rest_framework.permissions import IsAuthenticated
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        try:
            # Explicitly check if user is a student
            from users.models import Student
            try:
                student_obj = Student.objects.get(pk=request.user.pk)
            except Student.DoesNotExist:
                return Response({"error": "Only students can perform leader actions"}, status=403)

            action = request.data.get("action")

            # check student is a leader of an active project
            membership = SProjects.objects.filter(
                CID=student_obj, PID__archived=False
            ).first()
            
            if not membership:
                return Response(
                    {"error": "You are not in any active project"},
                    status=404,
                )

            if not membership.is_leader:
                return Response(
                    {"error": "You are not the leader of this project"},
                    status=403,
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
                        {"error": f"Student {target_cid} not found in this project"}, status=404
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

                return Response({"message": "Leadership transferred successfully"})

            # EDIT project info
            elif action == "edit":
                name = request.data.get("name")
                type = request.data.get("type")
                github_url = request.data.get("github_url")
                submitted = request.data.get("submitted_to_supervisor")

                if name:
                    project.name = name
                if type:
                    project.type = type
                if github_url is not None:
                    project.github_url = github_url
                if submitted is not None:
                    project.submitted_to_supervisor = submitted

                project.save()
                return Response(ProjectSerializer(project).data)

            return Response({"error": "Invalid action. Use kick, promote, or edit"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


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
                CID=student, PID__archived=False
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
            else:
                # Leader is alone, delete project completely
                project = membership.PID
                membership.delete()
                project.delete()
                return Response({"message": "You have left the project and it was deleted"})

        membership.delete()
        return Response({"message": "You have left the project"})

    # Leader can leave if he is alone , if he does the group is deleted


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
                CID=student, PID__archived=False
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
                CID=student, PID__archived=False
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

        from .serializers import SupervisorRequestSerializer

        return Response(
            SupervisorRequestSerializer(supervisor_request).data,
            status=status.HTTP_201_CREATED,
        )


class StudentAttachmentView(APIView):
    """
    POST /api/projects/attachments/
    Student uploads a file to their current project.
    """

    permission_classes = [IsStudent]

    def post(self, request):
        student = request.user
        try:
            membership = SProjects.objects.filter(
                CID=student, PID__archived=False
            ).first()
            if not membership:
                raise SProjects.DoesNotExist()
        except SProjects.DoesNotExist:
            return Response({"error": "You are not in a project"}, status=404)

        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=400)

        attachment = ProjectAttachment.objects.create(
            PID=membership.PID,
            uploaded_by=student,
            file=file,
            filename=file.name,
            file_size=file.size,
            title=request.data.get("title", file.name),
            attachment_type=request.data.get("attachment_type", "other"),
        )

        return Response({"message": "File uploaded successfully", "id": attachment.id})

    def get(self, request):
        student = request.user
        try:
            membership = SProjects.objects.filter(
                CID=student, PID__archived=False
            ).first()
            if not membership:
                raise SProjects.DoesNotExist()
        except SProjects.DoesNotExist:
            return Response({"error": "You are not in a project"}, status=404)

        attachments = ProjectAttachment.objects.filter(PID=membership.PID)
        return Response(
            [
                {
                    "id": a.id,
                    "filename": a.filename,
                    "file_size": a.file_size,
                    "uploaded_at": a.uploaded_at,
                    "url": a.file.url,
                }
                for a in attachments
            ]
        )


