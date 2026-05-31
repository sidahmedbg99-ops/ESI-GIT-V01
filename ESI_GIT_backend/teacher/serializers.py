"""
Serializers for the teacher-side API.
"""

from rest_framework import serializers
from projects.models import Projects, SProjects, SupervisorRequest
from meetings.models import Meeting
from tasks.models import Task
from jury.models import ProjectJury, Schedule, Grades


# ─────────────────────────────────────────────────────────────
# GROUPS
# ─────────────────────────────────────────────────────────────

class TeacherMemberSerializer(serializers.Serializer):
    """One member inside a group."""
    CID = serializers.IntegerField(source="CID.CID")
    name = serializers.CharField(source="CID.full_name")
    role = serializers.CharField()
    is_leader = serializers.BooleanField()

    class Meta:
        fields = ["CID", "name", "role", "is_leader"]


class TeacherGroupListSerializer(serializers.ModelSerializer):
    """Compact view used in the groups list page."""
    member_count = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    final_report_url = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = [
            "PID", "name", "invite_code", "specialty", "year",
            "status", "member_count", "progress", "members",
            "submitted_to_supervisor", "final_submission_approved",
            "final_report_url", "github_url", "attachments",
        ]

    def get_final_report_url(self, obj):
        from projects.models import ProjectAttachment
        att = ProjectAttachment.objects.filter(PID=obj, is_final=True).first()
        if att:
            return att.file.url if att.file else None
        return None

    def get_member_count(self, obj):
        return SProjects.objects.filter(PID=obj).count()

    def get_progress(self, obj):
        from tasks.models import Task
        tasks = Task.objects.filter(PID=obj)
        total = tasks.count()
        done = tasks.filter(state="done").count()
        return round(done / total * 100) if total else 0

    def get_members(self, obj):
        memberships = SProjects.objects.filter(PID=obj).select_related("CID")
        return [
            {"CID": m.CID.CID, "name": m.CID.full_name, "role": m.role, "is_leader": m.is_leader}
            for m in memberships
        ]


    def get_attachments(self, obj):
        from projects.models import ProjectAttachment
        attachments = ProjectAttachment.objects.filter(PID=obj)
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


class TeacherGroupDetailSerializer(serializers.ModelSerializer):
    """Full group detail used on the group detail page."""
    members = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    meetings = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()

    class Meta:
        model = Projects
        fields = [
            "PID", "name", "invite_code", "type", "specialty",
            "academic_level", "year", "status", "archived",
            "creation_date", "finish_date", "github_url",
            "submitted_to_supervisor", "final_submission_approved",
            "members", "progress", "tasks", "meetings", "attachments",
        ]

    def get_members(self, obj):
        memberships = SProjects.objects.filter(PID=obj).select_related("CID")
        return [
            {
                "CID": m.CID.CID,
                "name": m.CID.full_name,
                "role": m.role,
                "is_leader": m.is_leader,
                "joined_date": m.joined_date,
            }
            for m in memberships
        ]

    def get_progress(self, obj):
        from tasks.models import Task
        tasks = Task.objects.filter(PID=obj)
        total = tasks.count()
        done = tasks.filter(state="done").count()
        return round(done / total * 100) if total else 0

    def get_tasks(self, obj):
        from tasks.models import Task
        tasks = Task.objects.filter(PID=obj)
        return [
            {
                "id": t.id,
                "title": t.title,
                "state": t.state,
                "priority": t.priority,
                "deadline": t.deadline,
            }
            for t in tasks
        ]

    def get_meetings(self, obj):
        from meetings.models import Meeting
        meetings = Meeting.objects.filter(PID=obj).order_by("-date", "-time")
        return [
            {
                "id": m.id,
                "title": m.title,
                "date": m.date,
                "time": m.time,
                "status": m.status,
                "created_by_student": m.created_by_student is not None,
            }
            for m in meetings
        ]

    def get_attachments(self, obj):
        from projects.models import ProjectAttachment
        attachments = ProjectAttachment.objects.filter(PID=obj)
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


# ─────────────────────────────────────────────────────────────
# SUPERVISOR REQUESTS
# ─────────────────────────────────────────────────────────────

class TeacherSupervisorRequestSerializer(serializers.ModelSerializer):
    """Pending supervisor request shown alongside groups list."""
    project_name = serializers.CharField(source="project_id.name")
    project_pid = serializers.IntegerField(source="project_id.PID")
    specialty = serializers.CharField(source="project_id.specialty")
    invite_code = serializers.CharField(source="project_id.invite_code")
    year = serializers.CharField(source="project_id.year")
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()

    class Meta:
        model = SupervisorRequest
        fields = [
            "id", "project_name", "project_pid", "specialty", "year", "invite_code",
            "member_count", "members", "message", "status", "created_at",
        ]

    def get_member_count(self, obj):
        return SProjects.objects.filter(PID=obj.project_id).count()

    def get_members(self, obj):
        memberships = SProjects.objects.filter(PID=obj.project_id).select_related("CID")
        return [{"name": m.CID.full_name, "is_leader": m.is_leader} for m in memberships]


# ─────────────────────────────────────────────────────────────
# MEETINGS
# ─────────────────────────────────────────────────────────────

class TeacherMeetingSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    project_name = serializers.CharField(source="PID.name", read_only=True)
    group_code = serializers.CharField(source="PID.invite_code", read_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id", "title", "date", "time", "location",
            "status", "created_by", "project_name", "group_code", "created_at",
        ]

    def get_created_by(self, obj):
        if obj.created_by_student:
            return {"type": "student", "name": obj.created_by_student.full_name}
        elif obj.created_by_staff:
            return {"type": "staff", "name": obj.created_by_staff.full_name}
        return None


class TeacherCreateMeetingSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    title = serializers.CharField(max_length=200)
    date = serializers.DateField()
    time = serializers.TimeField()
    location = serializers.CharField(max_length=200)


# ─────────────────────────────────────────────────────────────
# TASKS
# ─────────────────────────────────────────────────────────────

class TeacherAssignTaskSerializer(serializers.Serializer):
    # Accept spec PascalCase names with lowercase aliases
    title = serializers.CharField(max_length=200, required=False)
    Name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False)
    Description = serializers.CharField(required=False)
    type = serializers.CharField(max_length=50, required=False, default="feature")
    priority = serializers.ChoiceField(choices=[(1, "Low"), (2, "Medium"), (3, "High")], default=2, required=False)
    Priority = serializers.ChoiceField(choices=[(1, "Low"), (2, "Medium"), (3, "High")], default=2, required=False)
    deadline = serializers.DateField(required=False)
    Deadline = serializers.DateField(required=False)
    State = serializers.CharField(required=False)
    student_cid = serializers.IntegerField(required=False)

    def validate(self, data):
        # Normalize PascalCase → lowercase
        data["title"] = data.get("title") or data.get("Name", "")
        data["description"] = data.get("description") or data.get("Description", "")
        data["priority"] = data.get("priority") or data.get("Priority", 2)
        data["deadline"] = data.get("deadline") or data.get("Deadline")
        if not data["title"]:
            raise serializers.ValidationError({"title": "This field is required."})
        if not data["deadline"]:
            raise serializers.ValidationError({"deadline": "This field is required."})
        return data


# ─────────────────────────────────────────────────────────────
# JURY
# ─────────────────────────────────────────────────────────────

class TeacherJurySerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="PID.name")
    group_code = serializers.CharField(source="PID.invite_code")
    specialty = serializers.CharField(source="PID.specialty")
    schedule = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    is_evaluated = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    jury_role = serializers.SerializerMethodField()
    jury_members = serializers.SerializerMethodField()

    class Meta:
        model = ProjectJury
        fields = [
            "PID_id", "project_name", "group_code", "specialty",
            "schedule", "members", "is_evaluated", "attachments",
            "jury_role", "jury_members",
        ]

    def _hide_jury_info(self):
        """Return True if the hide_jury_from_jury platform setting is active."""
        from admin_panel.models import PlatformSettings
        try:
            settings = PlatformSettings.objects.first()
            return settings.hide_jury_from_jury if settings else False
        except Exception:
            return False

    def get_schedule(self, obj):
        try:
            s = Schedule.objects.get(PID=obj.PID)
            return {
                "date": s.presentation_date,
                "time": s.presentation_time,
                "room": s.room,
            }
        except Schedule.DoesNotExist:
            return None

    def get_members(self, obj):
        memberships = SProjects.objects.filter(PID=obj.PID).select_related("CID")
        return [
            {"name": m.CID.full_name, "CID": m.CID.CID}
            for m in memberships
        ]

    def get_jury_members(self, obj):
        """
        Returns the other jury members' info.
        If hide_jury_from_jury is enabled, returns None so jury members
        cannot see who else is on the jury panel.
        """
        if self._hide_jury_info():
            return None
        result = []
        roles = [
            ("president", obj.teacher1_id),
            ("examiner", obj.teacher2_id),
            ("supervisor", obj.supervisor_id),
        ]
        for role_label, teacher in roles:
            if teacher:
                result.append({
                    "role": role_label,
                    "name": teacher.full_name,
                    "TID": teacher.TID,
                })
        return result

    def get_is_evaluated(self, obj):
        teacher = self.context.get("teacher")
        if not teacher:
            return False

        try:
            grades = Grades.objects.get(PID=obj.PID)
            if obj.teacher1_id == teacher:
                return grades.grade1 is not None
            elif obj.teacher2_id == teacher:
                return grades.grade2 is not None
            elif obj.supervisor_id == teacher:
                return grades.grade4 is not None
        except Grades.DoesNotExist:
            return False
        return False

    def get_jury_role(self, obj):
        teacher = self.context.get("teacher")
        if not teacher:
            return None
        if obj.teacher1_id == teacher:
            return "president"
        elif obj.supervisor_id == teacher:
            return "supervisor"
        elif obj.teacher2_id == teacher:
            return "examiner"
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


class TeacherEvaluationSerializer(serializers.Serializer):
    # President fields
    produit_final = serializers.FloatField(min_value=0, max_value=20, required=False)
    manuel_installation = serializers.FloatField(min_value=0, max_value=20, required=False)
    rapport = serializers.FloatField(min_value=0, max_value=20, required=False)
    # Supervisor fields
    travail_continu = serializers.FloatField(min_value=0, max_value=20, required=False)
    # Shared field (all roles)
    soutenance = serializers.FloatField(min_value=0, max_value=20, required=False)
    # Legacy fields kept for backwards compatibility
    presentation = serializers.FloatField(min_value=0, max_value=20, required=False)
    document = serializers.FloatField(min_value=0, max_value=20, required=False)
    demo = serializers.FloatField(min_value=0, max_value=20, required=False)
    validate_cpi = serializers.BooleanField(required=False, default=False)
    comments = serializers.CharField(required=False, allow_blank=True, default="")


# ─────────────────────────────────────────────────────────────
# DASHBOARD (lightweight re-use)
# ─────────────────────────────────────────────────────────────

class TeacherDashboardSerializer(serializers.Serializer):
    """Not used directly — dashboard view builds the response manually."""
    pass
