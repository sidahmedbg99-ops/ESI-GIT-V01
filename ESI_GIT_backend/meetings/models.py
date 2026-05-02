from django.db import models

from django.db import models
from users.models import Student, Staff
from projects.models import Projects


class Meeting(models.Model):

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending Approval"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    id = models.AutoField(primary_key=True)
    PID = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name="meetings")
    title = models.CharField(max_length=200)
    date = models.DateField()
    time = models.TimeField()
    location = models.CharField(max_length=200)
    created_by_student = models.ForeignKey(
        Student, on_delete=models.CASCADE, null=True, blank=True
    )
    created_by_staff = models.ForeignKey(
        Staff, on_delete=models.CASCADE, null=True, blank=True
    )
    status = models.CharField(
        max_length=20, choices=StatusChoices.choices, default="pending"
    )
    cancellation_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "meetings"
        ordering = ["date", "time"]

    def __str__(self):
        return f"{self.title} - {self.date} {self.time}"


class MeetingAttendance(models.Model):
    """Attendance tracking for meetings"""

    meeting_id = models.ForeignKey(
        Meeting, on_delete=models.CASCADE, related_name="attendances"
    )
    CID = models.ForeignKey(Student, on_delete=models.CASCADE)
    attended = models.BooleanField(default=False)

    class Meta:
        db_table = "meeting_attendance"
        unique_together = ["meeting_id", "CID"]
        verbose_name_plural = "Meeting Attendances"

    def __str__(self):
        return f"{self.CID.full_name} - {self.meeting_id.title} ({'Present' if self.attended else 'Absent'})"
