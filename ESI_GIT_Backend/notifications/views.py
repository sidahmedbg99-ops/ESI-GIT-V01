from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.db.models import Exists, OuterRef

from users.permissions import IsAdmin, IsStaff, IsStudent
from users.models import Student, Staff
from .models import Notification, NotificationRead
from .serializers import AdminSendNotificationSerializer, NotificationSerializer


# ─────────────────────────────────────────
# Shared queryset helpers
# ─────────────────────────────────────────

def student_notifications_qs(student):
    personal  = Notification.objects.filter(recipient_type="student", recipient_id=student.CID)
    broadcast = Notification.objects.filter(recipient_type__in=["student", "all"], recipient_id__isnull=True)
    return (personal | broadcast).distinct()


def staff_notifications_qs(teacher):
    personal  = Notification.objects.filter(recipient_type="staff", recipient_id=teacher.TID)
    broadcast = Notification.objects.filter(recipient_type__in=["staff", "all"], recipient_id__isnull=True)
    return (personal | broadcast).distinct()


def _student_is_read(notification, student):
    """True if this student has read the notification."""
    if notification.recipient_id is not None:
        # Personal notification — use the row's flag
        return notification.is_read
    # Broadcast — per-user tracking
    return getattr(notification, 'user_is_read', False)


def _staff_is_read(notification, teacher):
    if notification.recipient_id is not None:
        return notification.is_read
    return getattr(notification, 'user_is_read', False)


# ─────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────

@api_view(["POST"])
def admin_send_notification(request):
    """
    POST /api/notifications/admin/send/
    Supports audience targeting:
      { title, message, audience: "all"|"students"|"staff" }
      Optionally narrow students: { audience:"students", level:<int>, specialty:"<str>" }
    """
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    title    = request.data.get("title", "").strip()
    message  = request.data.get("message", "").strip()
    audience = request.data.get("audience", "all")

    if not title or not message:
        return Response({"error": "title and message are required"}, status=400)
    if audience not in ("all", "students", "staff"):
        return Response({"error": "audience must be 'all', 'students', or 'staff'"}, status=400)

    if audience == "all":
        Notification.objects.create(
            recipient_type="all", recipient_id=None,
            title=title, message=message, created_by_admin=True,
        )
        return Response({"message": "Notification sent to everyone"})

    if audience == "staff":
        Notification.objects.create(
            recipient_type="staff", recipient_id=None,
            title=title, message=message, created_by_admin=True,
        )
        return Response({"message": "Notification sent to all staff"})

    # audience == "students" — optional level / specialty filter
    level     = request.data.get("level")
    specialty = request.data.get("specialty", "").strip()

    qs = Student.objects.filter(is_blocked=False)
    if level:
        try:
            qs = qs.filter(level=int(level))
        except (TypeError, ValueError):
            return Response({"error": "level must be an integer"}, status=400)
    if specialty:
        qs = qs.filter(specialty=specialty)

    if not qs.exists():
        Notification.objects.create(
            recipient_type="student", recipient_id=None,
            title=title, message=message, created_by_admin=True,
        )
    else:
        Notification.objects.bulk_create([
            Notification(
                recipient_type="student", recipient_id=s.CID,
                title=title, message=message, created_by_admin=True,
            )
            for s in qs
        ])

    count = qs.count() if qs.exists() else None
    return Response({"message": "Notification sent", "recipients": count or "all students"})


@api_view(["GET"])
def admin_notifications_list(request):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)
    notifications = Notification.objects.filter(created_by_admin=True)
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(["DELETE"])
def admin_delete_notification(request, pk):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)
    try:
        notification = Notification.objects.get(pk=pk)
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=404)
    notification.delete()
    return Response({"message": "Notification deleted"})


# ─────────────────────────────────────────
# STUDENT — list + count + mark read
# ─────────────────────────────────────────

class StudentNotificationListView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user
        # Annotate each broadcast with whether this student has already read it
        read_subquery = NotificationRead.objects.filter(
            notification=OuterRef('pk'),
            recipient_type='student',
            recipient_id=student.CID,
        )
        qs = (
            student_notifications_qs(student)
            .annotate(user_is_read=Exists(read_subquery))
            .order_by("-created_at")
        )
        data = [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": _student_is_read(n, student),
            "created_at": n.created_at,
        } for n in qs]
        return Response(data)


class StudentUnreadCountView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user
        personal_unread = Notification.objects.filter(
            recipient_type="student", recipient_id=student.CID, is_read=False,
        ).count()
        broadcast_unread = Notification.objects.filter(
            recipient_type__in=["student", "all"], recipient_id__isnull=True,
        ).exclude(
            reads__recipient_type="student",
            reads__recipient_id=student.CID,
        ).count()
        return Response({"unread": personal_unread + broadcast_unread})


class StudentMarkNotificationReadView(APIView):
    permission_classes = [IsStudent]

    def patch(self, request, notification_id):
        student = request.user
        # Personal notification
        notification = Notification.objects.filter(
            id=notification_id, recipient_type="student", recipient_id=student.CID,
        ).first()
        if notification:
            notification.is_read = True
            notification.save()
            return Response({"message": "Notification marked as read"})

        # Broadcast notification
        notification = Notification.objects.filter(
            id=notification_id,
            recipient_type__in=["student", "all"],
            recipient_id__isnull=True,
        ).first()
        if not notification:
            return Response({"error": "Notification not found"}, status=404)

        NotificationRead.objects.get_or_create(
            notification=notification,
            recipient_type="student",
            recipient_id=student.CID,
        )
        return Response({"message": "Notification marked as read"})


# ─────────────────────────────────────────
# STAFF — list + count + mark read
# ─────────────────────────────────────────

class StaffNotificationListView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        teacher = request.user
        read_subquery = NotificationRead.objects.filter(
            notification=OuterRef('pk'),
            recipient_type='staff',
            recipient_id=teacher.TID,
        )
        qs = (
            staff_notifications_qs(teacher)
            .annotate(user_is_read=Exists(read_subquery))
            .order_by("-created_at")
        )
        data = [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": _staff_is_read(n, teacher),
            "created_at": n.created_at,
        } for n in qs]
        return Response(data)


class StaffUnreadCountView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        teacher = request.user
        personal_unread = Notification.objects.filter(
            recipient_type="staff", recipient_id=teacher.TID, is_read=False,
        ).count()
        broadcast_unread = Notification.objects.filter(
            recipient_type__in=["staff", "all"], recipient_id__isnull=True,
        ).exclude(
            reads__recipient_type="staff",
            reads__recipient_id=teacher.TID,
        ).count()
        return Response({"unread": personal_unread + broadcast_unread})


class StaffMarkNotificationReadView(APIView):
    permission_classes = [IsStaff]

    def patch(self, request, notification_id):
        teacher = request.user
        # Personal notification
        notification = Notification.objects.filter(
            id=notification_id, recipient_type="staff", recipient_id=teacher.TID,
        ).first()
        if notification:
            notification.is_read = True
            notification.save()
            return Response({"message": "Notification marked as read"})

        # Broadcast notification
        notification = Notification.objects.filter(
            id=notification_id,
            recipient_type__in=["staff", "all"],
            recipient_id__isnull=True,
        ).first()
        if not notification:
            return Response({"error": "Notification not found"}, status=404)

        NotificationRead.objects.get_or_create(
            notification=notification,
            recipient_type="staff",
            recipient_id=teacher.TID,
        )
        return Response({"message": "Notification marked as read"})
