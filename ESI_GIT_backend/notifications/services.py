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
    @staticmethod
    def notify_supervisor_request_status(request_obj):
        from projects.models import SProjects
        status_label = "acceptée" if request_obj.status == "accepted" else "refusée"
        title = f"Demande d'encadrement {status_label}"
        message = f"Votre demande d'encadrement à {request_obj.teacher_id.full_name} a été {status_label}."
        
        memberships = SProjects.objects.filter(PID=request_obj.project_id)
        for m in memberships:
            NotificationService.send_to_student(m.CID, title, message)

    @staticmethod
    def notify_meeting_accepted(meeting):
        """Notify all group members that their meeting request was accepted."""
        from projects.models import SProjects
        memberships = SProjects.objects.filter(PID=meeting.PID)
        for m in memberships:
            NotificationService.send_to_student(
                m.CID,
                "Réunion acceptée ✅",
                f"Votre réunion '{meeting.title}' prévue le {meeting.date} à {meeting.time} a été acceptée par votre encadreur."
            )

    @staticmethod
    def notify_meeting_rejected(meeting, reason=""):
        """Notify all group members that their meeting request was rejected."""
        from projects.models import SProjects
        memberships = SProjects.objects.filter(PID=meeting.PID)
        reason_text = f" Motif : {reason}" if reason else ""
        for m in memberships:
            NotificationService.send_to_student(
                m.CID,
                "Réunion refusée ❌",
                f"Votre réunion '{meeting.title}' du {meeting.date} a été refusée par votre encadreur.{reason_text}"
            )
