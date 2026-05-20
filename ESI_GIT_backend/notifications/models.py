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
    recipient_id = models.BigIntegerField(null=True, blank=True)

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
