from django.db import models
from users.models import Student, Staff
from django.utils import timezone


class Projects(models.Model):

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    PID = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=50)
    specialty = models.CharField(max_length=100, null=True, blank=True)
    year = models.CharField(max_length=9, null=True, blank=True)  
    # auto sets to current year ex: 2025
    academic_level = models.IntegerField(null=True, blank=True)  
    # taken from student.level
    TID = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True)
    github_url = models.URLField(max_length=300, blank=True, null=True)

    status = models.CharField(
        max_length=10, choices=StatusChoices.choices, default=StatusChoices.PENDING
    )

    creation_date = models.DateField(auto_now_add=True)
    finish_date = models.DateField(null=True, blank=True)
    archived = models.BooleanField(default=False)
    invite_code = models.CharField(max_length=8, unique=True)

    submitted_to_supervisor = models.BooleanField(default=False)
    supervisor_feedback = models.TextField(null=True, blank=True)
    final_submission_approved = models.BooleanField(default=False)
    final_submission_date = models.DateTimeField(null=True, blank=True)
    is_public = models.BooleanField(default=True)


class SProjects(models.Model):

    class RoleChoices(models.TextChoices):
        FRONTEND = "frontend", "Frontend"
        BACKEND = "backend", "Backend"
        DESIGN = "design", "Design"
        FULLSTACK = "fullstack", "Fullstack"

    CID = models.ForeignKey(Student, on_delete=models.CASCADE)
    PID = models.ForeignKey(
        Projects, on_delete=models.CASCADE, related_name="team_members"
    )
    role = models.CharField(max_length=20, choices=RoleChoices.choices)
    is_leader = models.BooleanField(default=False)
    joined_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sprojects"
        unique_together = ["CID", "PID"]
        verbose_name = "Student Project"
        verbose_name_plural = "Student Projects"

    def __str__(self):
        return f"{self.CID.full_name} in {self.PID.name}"


class SupervisorRequest(models.Model):

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    project_id = models.ForeignKey(Projects, on_delete=models.CASCADE)
    teacher_id = models.ForeignKey(Staff, on_delete=models.CASCADE)
    status = models.CharField(
        max_length=10, choices=StatusChoices.choices, default="pending"
    )
    message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "supervisor_requests"
        unique_together = ["project_id", "teacher_id"]

    def __str__(self):
        return f"{self.project_id.name} → {self.teacher_id.full_name} ({self.status})"


class ProjectAttachment(models.Model):

    class AttachmentTypeChoices(models.TextChoices):
        REPORT = "report", "Project Report"
        PRESENTATION = "presentation", "Presentation Slides"
        DELIVERABLE = "deliverable", "Project Deliverable"
        DOCUMENTATION = "documentation", "Documentation"
        OTHER = "other", "Other"

    id = models.AutoField(primary_key=True)
    PID = models.ForeignKey(
        Projects, on_delete=models.CASCADE, related_name="attachments"
    )
    uploaded_by = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True)
    file = models.FileField(upload_to="project_attachments/%Y/%m/")
    filename = models.CharField(max_length=255)
    file_size = models.IntegerField(null=True, blank=True)
    attachment_type = models.CharField(
        max_length=20, choices=AttachmentTypeChoices.choices, default="other"
    )
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=20, blank=True)
    is_final = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "project_attachments"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.filename} - {self.PID.name}"
