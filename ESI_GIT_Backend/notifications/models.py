from django.db import models


class Notification(models.Model):
    """
    System notifications for students & staff.
    Can be personal OR broadcast.
    """

    class RecipientTypeChoices(models.TextChoices):
        STUDENT = "student", "Student"
        STAFF = "staff", "Staff"
        ALL = "all", "All Users"

    id = models.AutoField(primary_key=True)

    # null=True means broadcast notification
    recipient_id = models.IntegerField(null=True, blank=True)

    recipient_type = models.CharField(
        max_length=10, choices=RecipientTypeChoices.choices
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    is_read = models.BooleanField(default=False)

    created_by_admin = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.recipient_type}"


class NotificationRead(models.Model):
    """
    Per-user read tracking for broadcast notifications.
    Personal notifications (recipient_id IS NOT NULL) use is_read on the Notification row.
    Broadcast notifications (recipient_id IS NULL) use this table.
    """
    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name='reads'
    )
    recipient_type = models.CharField(max_length=10)  # 'student' or 'staff'
    recipient_id   = models.BigIntegerField()

    class Meta:
        db_table = 'notification_reads'
        unique_together = ['notification', 'recipient_type', 'recipient_id']
