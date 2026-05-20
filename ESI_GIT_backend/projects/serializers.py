from rest_framework import serializers
from .models import Projects, SProjects, ProjectAttachment, SupervisorRequest
from users.models import Student, Staff
import random
import string
from jury.models import ProjectJury, Schedule, Grades
from typing import cast, Dict, Any
from tasks.models import Task


class AdminProjectSerializer(serializers.ModelSerializer):

    invite_code = serializers.CharField(read_only=True)
    teacher_name = serializers.SerializerMethodField()
    Student = serializers.SerializerMethodField()
    jury = serializers.SerializerMethodField()
    grades = serializers.SerializerMethodField()

    student_ids = serializers.ListField(write_only=True, required=False)

    teacher_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Projects
        fields = "__all__"

    def get_grades(self, obj):
        try:
            from jury.models import Grades
            grades = Grades.objects.filter(PID=obj).first()
            if not grades:
                return None
            return {
                "grade1": grades.grade1,
                "grade2": grades.grade2,
                "grade3": grades.grade3,
                "final_grade": grades.final_grade,
                "comments": grades.comments,
            }
        except Exception:
            return None

    def generate_invite_code(self):
        while True:
            code = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not Projects.objects.filter(invite_code=code).exists():
                return code

    def get_teacher_name(self, obj):
        if obj.TID:
            return obj.TID.full_name
        return None

    def get_Student(self, obj):
        relations = SProjects.objects.filter(PID=obj)
        return [{"id": rel.CID.CID, "name": rel.CID.full_name} for rel in relations]

    def get_jury(self, obj):
        try:
            from jury.models import ProjectJury

            jury = ProjectJury.objects.get(PID=obj)
            return {
                "supervisor": jury.supervisor_id.full_name if jury.supervisor_id else None,
                "president": jury.teacher1_id.full_name,
                "examiner1": jury.teacher2_id.full_name,
                "examiner2": jury.teacher3_id.full_name,
                "assigned_at": jury.assigned_at,
            }
        except Exception:
            return None

    def create(self, validated_data):
        student_ids = validated_data.pop("student_ids", [])
        teacher_id = validated_data.pop("teacher_id", None)
        leader_id = validated_data.pop("leader_id", None)

        if teacher_id:
            try:
                teacher = Staff.objects.get(TID=teacher_id)
                validated_data["TID"] = teacher
            except Staff.DoesNotExist:
                pass

        # Always generate a fresh invite code if not provided or even if provided (as per auto ID request)
        validated_data["invite_code"] = self.generate_invite_code()
        
        project = Projects.objects.create(**validated_data)

        for sid in student_ids:
            # handle both sid as ID or as object {cid, role}
            student_id = sid['cid'] if isinstance(sid, dict) else sid
            student_role = sid.get('role', 'fullstack') if isinstance(sid, dict) else 'fullstack'
            
            is_leader = (str(student_id) == str(leader_id))
            
            try:
                student = Student.objects.get(CID=student_id)
                SProjects.objects.create(PID=project, CID=student, role=student_role, is_leader=is_leader)
            except Student.DoesNotExist:
                pass

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
                student_id = sid['cid'] if isinstance(sid, dict) else sid
                student_role = sid.get('role', 'fullstack') if isinstance(sid, dict) else 'fullstack'
                
                student = Student.objects.get(CID=student_id)
                SProjects.objects.create(PID=instance, CID=student, role=student_role)

        return instance


class StudentWithoutGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["CID", "first_name", "last_name", "email", "specialty", "year"]


class AdminGroupListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    Student_count = serializers.SerializerMethodField()
    student_ids = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    jury = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()
    grades = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = [
            "PID",
            "name",
            "type",
            "status",
            "specialty",
            "year",
            "invite_code",
            "archived",
            "TID",
            "teacher_name",
            "Student_count",
            "student_ids",
            "members",
            "submitted_to_supervisor",
            "final_submission_approved",
            "supervisor_feedback",
            "jury",
            "schedule",
            "grades",
            "description",
            "tech_stack",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_Student_count(self, obj):
        return SProjects.objects.filter(PID=obj).count()

    def get_student_ids(self, obj):
        return list(SProjects.objects.filter(PID=obj).values_list("CID_id", flat=True))

    def get_members(self, obj):
        relations = SProjects.objects.filter(PID=obj)
        return [{"cid": rel.CID.CID, "name": rel.CID.full_name, "role": rel.role} for rel in relations]

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
            from admin_panel.models import PlatformSettings

            grades = Grades.objects.filter(PID=obj).first()
            if not grades:
                return None

            settings = PlatformSettings.objects.first()
            show_jury = settings.students_can_see_jury_column if settings else False

            data = {
                "final_grade": grades.final_grade,
                "feedback": grades.comments,
            }
            if show_jury:
                data.update({
                    "grade1": grades.grade1,
                    "grade2": grades.grade2,
                    "grade3": grades.grade3,
                })
            return data
        except Exception:
            return None


class AdminGroupDetailsSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    Student = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
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
            "TID",
            "teacher_name",
            "Student",
            "attachments_count",
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
                "grade1": grades.grade1,
                "grade2": grades.grade2,
                "grade3": grades.grade3,
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
    students = serializers.SerializerMethodField()
    grades = serializers.SerializerMethodField()
    
    # Aliases for frontend Archive.jsx compatibility
    group = serializers.CharField(source="invite_code", read_only=True)
    grade = serializers.SerializerMethodField()
    tech = serializers.SerializerMethodField()
    repo = serializers.CharField(source="github_url", read_only=True)
    members = serializers.SerializerMethodField()
    encadreur = serializers.SerializerMethodField()  # alias: teacher_name for archive
    specialite = serializers.CharField(source="specialty", read_only=True)

    class Meta:
        model = Projects
        fields = [
            "PID",
            "name",
            "type",
            "specialty",
            "specialite",
            "year",
            "teacher_name",
            "encadreur",
            "students",
            "grades",
            "group",
            "grade",
            "tech",
            "repo",
            "members",
            "description",
            "status",
            "is_public",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else "—"

    def get_encadreur(self, obj):
        return obj.TID.full_name if obj.TID else "—"

    def get_students(self, obj):
        relations = SProjects.objects.filter(PID=obj)
        return [rel.CID.full_name for rel in relations]
    
    def get_members(self, obj):
        return self.get_students(obj)

    def get_grade(self, obj):
        g = self.get_grades(obj)
        return g["final_grade"] if g else 0

    def get_tech(self, obj):
        if obj.tech_stack:
            return [t.strip() for t in obj.tech_stack.split(",")]
        return []

    def get_grades(self, obj):
        try:
            from jury.models import Grades
            from admin_panel.models import PlatformSettings

            grades = Grades.objects.filter(PID=obj).first()
            if not grades:
                return None
            
            settings = PlatformSettings.objects.first()
            show_jury = settings.students_can_see_jury_column if settings else False

            if show_jury:
                return {
                    "final_grade": grades.final_grade,
                    "grade1": grades.grade1,
                    "grade2": grades.grade2,
                    "grade3": grades.grade3,
                    "grade4": grades.grade4,
                }
            else:
                return {
                    "final_grade": grades.final_grade,
                    "grade1": None,
                    "grade2": None,
                    "grade3": None,
                    "grade4": None,
                }
        except Exception:
            return None


# ─────────────────────────────────────────
# STUDENT SIDE SERIALIZERS
# ─────────────────────────────────────────


class CreateProjectSerializer(serializers.Serializer):
    # fields the student sends when creating a project
    name = serializers.CharField(max_length=150)
    type = serializers.CharField(max_length=50)
    role = serializers.ChoiceField(choices=SProjects.RoleChoices.choices)
    description = serializers.CharField(required=False, allow_blank=True)
    tech_stack = serializers.CharField(required=False, allow_blank=True)


class SProjectSerializer(serializers.ModelSerializer):
    # shows one team member's info
    student_name = serializers.CharField(source="CID.full_name", read_only=True)
    student_email = serializers.EmailField(source="CID.email", read_only=True)
    student_id = serializers.IntegerField(source="CID.CID", read_only=True)
    isChef = serializers.BooleanField(source="is_leader", read_only=True)
    isMe = serializers.SerializerMethodField()

    class Meta:
        model = SProjects
        fields = ["student_id", "student_name", "student_email", "role", "is_leader", "isChef", "isMe", "joined_date"]

    def get_isMe(self, obj):
        request = self.context.get("request")
        if request and hasattr(request.user, 'CID'):
            return request.user.CID == obj.CID.CID
        return False


class ProjectSerializer(serializers.ModelSerializer):
    # shows full project details including all members
    members = SProjectSerializer(source="team_members", many=True, read_only=True)
    teacher_name = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
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
            "github_url",
            "submitted_to_supervisor",
            "final_submission_approved",
            "supervisor_feedback",
            "status",
            "archived",
            "creation_date",
            "finish_date",
            "members",
            "attachments",
            "teacher_name",
            "supervisor_request",
            "description",
            "tech_stack",
        ]

    def get_teacher_name(self, obj):
        return obj.TID.full_name if obj.TID else None

    def get_supervisor_request(self, obj):
        from .models import SupervisorRequest
        req = SupervisorRequest.objects.filter(project_id=obj).order_by("-created_at").first()
        if req:
            return {
                "status": req.status,
                "teacher_name": req.teacher_id.full_name if req.teacher_id else None
            }
        return None

    def get_attachments(self, obj):
        from projects.models import ProjectAttachment
        attachments = ProjectAttachment.objects.filter(PID=obj.PID)
        return [
            {
                "id": a.id,
                "filename": a.filename,
                "attachment_type": a.attachment_type,
                "is_final": a.is_final,
                "url": a.file.url if a.file else None,
                "uploaded_at": a.uploaded_at,
            }
            for a in attachments
        ]



class SupervisorRequestSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher_id.full_name", read_only=True)
    project_name = serializers.CharField(source="project_id.name", read_only=True)

    class Meta:
        model = SupervisorRequest
        fields = [
            "id",
            "project_name",
            "teacher_name",
            "status",
            "message",
            "created_at",
        ]
