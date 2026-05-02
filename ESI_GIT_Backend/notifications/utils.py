"""
notifications/utils.py
----------------------
Central helper to create in-app notifications.

Usage:
    from notifications.utils import notify

    # notify a single student
    notify(recipient_id=student.CID, recipient_type="student",
           title="Request received", message="Your supervision request was sent.")

    # notify a single teacher
    notify(recipient_id=teacher.TID, recipient_type="staff",
           title="New request", message="A group has requested your supervision.")

    # broadcast to all students
    notify(recipient_type="student",
           title="Announcement", message="Archived projects are now visible.")

    # broadcast to everyone
    notify(recipient_type="all",
           title="System", message="Platform maintenance tonight.")
"""

from .models import Notification


def notify(*, recipient_type: str, title: str, message: str, recipient_id: int = None):
    """
    Create a Notification record.

    Args:
        recipient_type: "student" | "staff" | "all"
        title:          Short subject line (max 255 chars)
        message:        Body text
        recipient_id:   PK of the student (CID) or staff (TID).
                        Leave None for broadcast notifications.
    """
    Notification.objects.create(
        recipient_type=recipient_type,
        recipient_id=recipient_id,
        title=title,
        message=message,
        created_by_admin=False,
    )
