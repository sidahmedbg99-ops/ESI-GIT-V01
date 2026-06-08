from rest_framework import serializers
from .models import Projects, SProjects, ProjectAttachment, SupervisorRequest
from users.models import Student, Staff
import secrets
import string
from jury.models import ProjectJury, Schedule, Grades
from typing import cast, Dict, Any
from tasks.models import Task


class AdminProjectSerializer(serializers.ModelSerializer):

    invite_code = serializers.CharField(read_only=True)
    teacher_name = serializers.SerializerMethodField()
    Student = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    jury = serializers.SerializerMethodField()
    grades = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    student_ids = serializers.ListField(write_only=True, required=False)

    teacher_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Projects
        fields = "__all__"

    def generate_invite_code(self):
        while True:
            code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            if not Projects.objects.filter(invite_code=code).exists():
                return code

    def get_teacher_name(self, obj):
        if obj.TID:
            return obj.TID.full_name
        return None

    def get_Student(self, obj):
        relations = SProjects.objects.filter(PID=obj)
        return [{"id": rel.CID.CID, "name": rel.CID.full_name} for rel in relations]

    def get_members(self, obj):
        return self.get_Student(obj)

    def get_jury(self, obj):
        try:
            from jury.models import ProjectJury

            jury = ProjectJury.objects.get(PID=obj)
            return {
                "president": jury.teacher1_id.full_name,
                "examiner1": jury.teacher2_id.full_name,
                "examiner2": jury.teacher3_id.full_name,
                "assigned_at": jury.assigned_at,
            }
        except Exception:
            return None

    def get_grades(self, obj):
        try:
            from jury.models import Grades

            grades = Grades.objects.filter(PID=obj).first()
            if not grades:
                return None

            return {
                "final_grade": grades.final_grade,
                "feedback": grades.comments,
            }
        except Exception:
            return None
    def get_attachments(self, obj):
        request = self.context.get("request")
        return [
            {
                "id":              a.id,
                "filename":        a.filename,
                "attachment_type": a.attachment_type,
                "uploaded_at":     str(a.uploaded_at),
                "file_url":        request.build_absolute_uri(a.file.url) if (request and a.file) else None,
            }
            for a in obj.attachments.order_by("-uploaded_at")
        ]
    
    def create(self, validated_data):
        student_ids = validated_data.pop("student_ids", [])
        teacher_id = validated_data.pop("teacher_id", None)

        if teacher_id:
            teacher = Staff.objects.get(TID=teacher_id)
            validated_data["TID"] = teacher

        # Always use the active academic year from platform settings
        from admin_panel.models import PlatformSettings
        ps = PlatformSettings.get_settings()
        validated_data["year"] = ps.current_academic_year

        validated_data["invite_code"] = self.generate_invite_code()
        project = Projects.objects.create(**validated_data)

        for sid in student_ids:
            student = Student.objects.get(CID=sid)
            SProjects.objects.create(PID=project, CID=student)

        return project

    def update(self, instance, validated_data):
        student_ids = validated_data.pop("student_ids", None)
        teacher_id = validated_data.pop("teacher_id", None)

        if teacher_id:
            instance.TID = Staff.objects.get(TID=teacher_id)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if student_ids is not None:
            SProjects.objects.filter(PID=instance).delete()
            for sid in student_ids:
                student = Student.objects.get(CID=sid)
                SProjects.objects.create(PID=instance, CID=student)

        return instance


class StudentWithoutGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["CID", "first_name", "last_name", "email", "specialty", "year"]


class AdminGroupListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    Student_count = serializers.SerializerMethodField()
    jury = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()
    grades = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = [
            "PID",
            "name",
            "specialty",
            "year",
            "archived",
            "TID",
            "teacher_name",
            "Student_count",
            "jury",
            "schedule",
            "grades",
            "final_submission_approved",
            "submitted_to_supervisor",
            "attachments",
            "academic_level",
            "members",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_Student_count(self, obj):
        return SProjects.objects.filter(PID=obj).count()
    
    def get_members(self, obj):
        return [
            {"id": rel.CID.CID, "name": rel.CID.full_name, "email": rel.CID.email, "is_leader": rel.is_leader}
            for rel in SProjects.objects.filter(PID=obj).select_related("CID")
        ]

    def get_jury(self, obj):
        try:
            from jury.models import ProjectJury

            jury = ProjectJury.objects.get(PID=obj)
            return {
                "president": jury.teacher1_id.full_name,
                "examiner1": jury.teacher2_id.full_name,
                "examiner2": jury.teacher3_id.full_name,
                "assigned_at": jury.assigned_at,
                "teacher1_id": jury.teacher1_id.TID,
                "teacher2_id": jury.teacher2_id.TID,
                "teacher3_id": jury.teacher3_id.TID,
            }
        except Exception:
            return None

    def get_schedule(self, obj):
        try:
            from jury.models import Schedule

            schedule = Schedule.objects.filter(PID=obj).first()
            if not schedule:
                return None

            return {
                "presentation_date": schedule.presentation_date,
                "presentation_time": schedule.presentation_time,
                "room": schedule.room,
                "duration_minutes": schedule.duration_minutes,
            }
        except Exception:
            return None

    def get_grades(self, obj):
        try:
            from jury.models import Grades

            grades = Grades.objects.filter(PID=obj).first()
            if not grades:
                return None

            return {
                "final_grade": grades.final_grade,
                "feedback": grades.comments,
            }
        except Exception:
            return None
        
    def get_attachments(self, obj):
        from .models import ProjectAttachment
        request = self.context.get("request")
        attachments = ProjectAttachment.objects.filter(PID=obj).order_by("-uploaded_at")
        return [
            {
                "id":              a.id,
                "filename":        a.filename,
                "attachment_type": a.attachment_type,
                "uploaded_at":     str(a.uploaded_at),
                "file_url":        request.build_absolute_uri(a.file.url) if (request and a.file) else None,
            }
            for a in attachments
        ]


class AdminGroupDetailsSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    Student = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
    attachments       = serializers.SerializerMethodField()
    supervisor_requests = serializers.SerializerMethodField()
    meetings_stats = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = [
            "PID",
            "name",
            "type",
            "specialty",
            "year",
            "archived",
            "teacher_name",
            "Student",
            "attachments_count",
            "attachments",
            "supervisor_requests",
            "meetings_stats",
            "jury",
            "schedule",
            "grades",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_Student(self, obj):
        relations = SProjects.objects.filter(PID=obj)

        return [
            {
                "id": rel.CID.CID,
                "name": rel.CID.full_name,
                "role": rel.role,
                "is_leader": rel.is_leader,
            }
            for rel in relations
        ]

    def get_attachments_count(self, obj):
        return obj.attachments.count()
    
    def get_attachments(self, obj):
        request = self.context.get("request")
        return [
            {
                "id":              a.id,
                "filename":        a.filename,
                "attachment_type": a.attachment_type,
                "uploaded_at":     str(a.uploaded_at),
                "file_url":        request.build_absolute_uri(a.file.url) if (request and a.file) else None,
            }
            for a in obj.attachments.order_by("-uploaded_at")
        ]

    def get_supervisor_requests(self, obj):
        from .models import SupervisorRequest

        requests = SupervisorRequest.objects.filter(project_id=obj)

        return [
            {
                "teacher": r.teacher_id.full_name,
                "status": r.status,
                "message": r.message,
                "date": r.created_at,
            }
            for r in requests
        ]

    def get_meetings_stats(self, obj):
        from meetings.models import Meeting

        meetings = Meeting.objects.filter(PID=obj)

        return {
            "total_meetings": meetings.count(),
            "pending_meetings": meetings.filter(status="pending").count(),
            "approved_meetings": meetings.filter(status="approved").count(),
            "confirmed_meetings": meetings.filter(status="confirmed").count(),
            "rejected_meetings": meetings.filter(status="rejected").count(),
        }

    def get_jury(self, obj):
        try:
            jury = ProjectJury.objects.get(PID=obj)
            return {
                "president": jury.teacher1_id.full_name,
                "examiner1": jury.teacher2_id.full_name,
                "examiner2": jury.teacher3_id.full_name,
                "assigned_at": jury.assigned_at,
            }
        except ProjectJury.DoesNotExist:
            return None

    def get_schedule(self, obj):
        schedule = Schedule.objects.filter(PID=obj).first()

        if not schedule:
            return None

        return {
            "presentation_date": schedule.presentation_date,
            "presentation_time": schedule.presentation_time,
            "room": schedule.room,
            "duration_minutes": schedule.duration_minutes,
        }

    def get_grades(self, obj):
        try:
            grades = Grades.objects.get(PID=obj)

            return {
                "final_grade": grades.final_grade,
                "comments": grades.comments,
            }
        except Grades.DoesNotExist:
            return None


class AssignJurySerializer(serializers.Serializer):
    teacher1_id = serializers.IntegerField()
    teacher2_id = serializers.IntegerField()
    teacher3_id = serializers.IntegerField()

    def validate(self, data):
        if len({data["teacher1_id"], data["teacher2_id"], data["teacher3_id"]}) != 3:
            raise serializers.ValidationError("Teachers must be different")
        return data

    def save(self, project):
        data = cast(Dict[str, Any], self.validated_data)

        teacher1 = Staff.objects.get(TID=data["teacher1_id"])
        teacher2 = Staff.objects.get(TID=data["teacher2_id"])
        teacher3 = Staff.objects.get(TID=data["teacher3_id"])

        jury, created = ProjectJury.objects.update_or_create(
            PID=project,
            defaults={
                "teacher1_id": teacher1,
                "teacher2_id": teacher2,
                "teacher3_id": teacher3,
            },
        )

        return jury


class AdminAttachmentSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAttachment
        fields = "__all__"

    def get_project_name(self, obj):
        return obj.PID.name

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.full_name if obj.uploaded_by else None


class AssignSupervisorSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()

    def update(self, instance, validated_data):
        from users.models import Staff

        teacher = Staff.objects.get(TID=validated_data["teacher_id"])
        instance.TID = teacher
        instance.save()

        return instance


class AdminTaskSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = "__all__"

    def get_project_name(self, obj):
        return obj.PID.name

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.full_name if obj.assigned_to else None


class StudentProjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    encadreur = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    grades = serializers.SerializerMethodField()
    group = serializers.CharField(source="invite_code", read_only=True)
    specialite = serializers.CharField(source="specialty", read_only=True)
    repo = serializers.CharField(source="github_url", read_only=True)
    attachments = serializers.SerializerMethodField()
    class Meta:
        model = Projects
        fields = [
            "PID",
            "name",
            "description",
            "specialite",
            "year",
            "group",
            "repo",
            "teacher_name",
            "encadreur",
            "members",
            "grades",
            "tech_stack",
            "attachments",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_encadreur(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_members(self, obj):
        return [m.CID.full_name for m in SProjects.objects.filter(PID=obj).select_related("CID")]

    def get_grades(self, obj):
        try:
            grades = Grades.objects.get(PID=obj)
            return {
                "final_grade": grades.final_grade,
                "comments": grades.comments,
            }
        except Grades.DoesNotExist:
            return None
        
    def get_attachments(self, obj):
        request = self.context.get("request")
        return [
            {
                "id":              a.id,
                "filename":        a.filename,
                "attachment_type": a.attachment_type,
                "uploaded_at":     str(a.uploaded_at),
                "file_url":        request.build_absolute_uri(a.file.url) if (request and a.file) else None,
            }
            for a in obj.attachments.order_by("-uploaded_at")
        ]

# ─────────────────────────────────────────
# STUDENT SIDE SERIALIZERS
# ─────────────────────────────────────────


class CreateProjectSerializer(serializers.Serializer):
    # fields the student sends when creating a project
    name = serializers.CharField(max_length=150)
    type = serializers.CharField(max_length=50)
    role = serializers.ChoiceField(choices=SProjects.RoleChoices.choices)


class SProjectSerializer(serializers.ModelSerializer):
    # shows one team member's info
    student_name  = serializers.CharField(source="CID.full_name", read_only=True)
    student_email = serializers.CharField(source="CID.email", read_only=True)
    student_id    = serializers.CharField(source="CID.CID", read_only=True)

    class Meta:
        model = SProjects
        fields = ["student_id", "student_name", "student_email", "role", "is_leader", "joined_date"]


class ProjectSerializer(serializers.ModelSerializer):
    # shows full project details including all members
    members       = SProjectSerializer(source="team_members", many=True, read_only=True)
    teacher_name  = serializers.SerializerMethodField()
    teacher_email = serializers.SerializerMethodField()
    jury          = serializers.SerializerMethodField()
    schedule      = serializers.SerializerMethodField()
    grades        = serializers.SerializerMethodField()
    supervisor_request = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = [
            "PID",
            "name",
            "type",
            "specialty",
            "academic_level",
            "year",
            "invite_code",
            "status",
            "archived",
            "creation_date",
            "finish_date",
            # student-facing extra fields
            "description",
            "github_url",
            "tech_stack",
            "submitted_to_supervisor",
            "supervisor_feedback",
            "final_submission_approved",
            # relations
            "members",
            "teacher_name",
            "teacher_email",
            "supervisor_request",
            "jury",
            "schedule",
            "grades",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_teacher_email(self, obj):
        return obj.TID.email if obj.TID else None

    def get_supervisor_request(self, obj):
        """Returns the most recent supervisor request for this project."""
        try:
            from projects.models import SupervisorRequest
            req = SupervisorRequest.objects.filter(project_id=obj).order_by("-created_at").first()
            if not req:
                return None
            return {
                "id": req.id,
                "status": req.status,
                "teacher_id": req.teacher_id.id if req.teacher_id else None,
                "teacher_name": req.teacher_id.full_name if req.teacher_id else None,
                "message": req.message,
                "created_at": req.created_at,
            }
        except Exception:
            return None

    def get_jury(self, obj):
        try:
            from jury.models import ProjectJury

            jury = ProjectJury.objects.get(PID=obj)
            return {
                "president": jury.teacher1_id.full_name,
                "examiner1": jury.teacher2_id.full_name,
                "examiner2": jury.teacher3_id.full_name,
                "assigned_at": jury.assigned_at,
            }
        except Exception:
            return None

    def get_schedule(self, obj):
        try:
            from jury.models import Schedule

            schedule = Schedule.objects.filter(PID=obj).first()
            if not schedule:
                return None

            return {
                "presentation_date": schedule.presentation_date,
                "presentation_time": schedule.presentation_time,
                "room": schedule.room,
                "duration_minutes": schedule.duration_minutes,
            }
        except Exception:
            return None

    def get_grades(self, obj):
        try:
            from jury.models import Grades

            grades = Grades.objects.filter(PID=obj).first()
            if not grades:
                return None

            return {
                "final_grade": grades.final_grade,
                "feedback": grades.comments,
            }
        except Exception:
            return None


class SupervisorRequestSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher_id.full_name", read_only=True)
    project_name = serializers.CharField(source="project_id.name", read_only=True)

    class Meta:
        model = SupervisorRequest
        fields = [
            "id",
            "project_name",
            "teacher_id",
            "teacher_name",
            "status",
            "message",
            "created_at",
        ]