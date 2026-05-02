from .models import Notification

class NotificationService:
    @staticmethod
    def send_to_student(student, title, message):
        return Notification.objects.create(
            recipient_id=student.CID,
            recipient_type='student',
            title=title,
            message=message
        )

    @staticmethod
    def send_to_staff(staff, title, message):
        return Notification.objects.create(
            recipient_id=staff.TID,
            recipient_type='staff',
            title=title,
            message=message
        )

    @staticmethod
    def send_to_all(title, message):
        return Notification.objects.create(
            recipient_type='all',
            title=title,
            message=message
        )

    @staticmethod
    def notify_meeting_cancelled(meeting, reason):
        # Notify student who created it
        if meeting.created_by_student:
            NotificationService.send_to_student(
                meeting.created_by_student,
                "Réunion annulée",
                f"La réunion '{meeting.title}' du {meeting.date} a été annulée. Motif: {reason}"
            )
        # Notify group leader or all members? Let's do all members.
        from projects.models import SProjects
        memberships = SProjects.objects.filter(PID=meeting.PID)
        for m in memberships:
            NotificationService.send_to_student(
                m.CID,
                "Réunion annulée",
                f"Votre réunion '{meeting.title}' prévue le {meeting.date} a été annulée par l'encadreur. Motif: {reason}"
            )
