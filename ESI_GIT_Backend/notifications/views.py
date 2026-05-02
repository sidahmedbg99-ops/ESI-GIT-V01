from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view

from users.permissions import IsAdmin, IsStaff, IsStudent
from users.models import Student, Staff
from .models import Notification
from .serializers import AdminSendNotificationSerializer, NotificationSerializer
from typing import cast, Dict, Any


# ─────────────────────────────────────────
# ADMIN
# ─────────────────────────────────────────

@api_view(["POST"])
def admin_send_notification(request):
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    serializer = AdminSendNotificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = cast(Dict[str, Any], serializer.validated_data)

    Notification.objects.create(
        recipient_type=data["recipient_type"],
        recipient_id=data.get("recipient_id"),
        title=data["title"],
        message=data["message"],
        created_by_admin=True,
    )

    return Response({"message": "Notification sent successfully"})


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
# STUDENT — list + mark read
# ─────────────────────────────────────────

class StudentNotificationListView(APIView):
    """
    GET /api/notifications/
    Returns all notifications for the logged-in student
    (personal + broadcast-to-students + broadcast-to-all).
    """
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        personal = Notification.objects.filter(
            recipient_type="student",
            recipient_id=student.CID,
        )
        broadcast = Notification.objects.filter(
            recipient_type__in=["student", "all"],
            recipient_id__isnull=True,
        )

        notifications = (personal | broadcast).distinct().order_by("-created_at")

        data = [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at,
        } for n in notifications]

        return Response(data)


class StudentMarkNotificationReadView(APIView):
    """
    PATCH /api/notifications/<id>/read/
    """
    permission_classes = [IsStudent]

    def patch(self, request, notification_id):
        student = request.user

        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient_type="student",
                recipient_id=student.CID,
            )
        except Notification.DoesNotExist:
            try:
                notification = Notification.objects.get(
                    id=notification_id,
                    recipient_type__in=["student", "all"],
                    recipient_id__isnull=True,
                )
            except Notification.DoesNotExist:
                return Response({"error": "Notification not found"}, status=404)

        notification.is_read = True
        notification.save()
        return Response({"message": "Notification marked as read"})


# ─────────────────────────────────────────
# STAFF — list + mark read
# ─────────────────────────────────────────

class StaffNotificationListView(APIView):
    """
    GET /api/notifications/staff/
    Returns all notifications for the logged-in teacher.
    """
    permission_classes = [IsStaff]

    def get(self, request):
        teacher = request.user

        personal = Notification.objects.filter(
            recipient_type="staff",
            recipient_id=teacher.TID,
        )
        broadcast = Notification.objects.filter(
            recipient_type__in=["staff", "all"],
            recipient_id__isnull=True,
        )

        notifications = (personal | broadcast).distinct().order_by("-created_at")

        data = [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at,
        } for n in notifications]

        return Response(data)


class StaffMarkNotificationReadView(APIView):
    """
    PATCH /api/notifications/staff/<id>/read/
    """
    permission_classes = [IsStaff]

    def patch(self, request, notification_id):
        teacher = request.user

        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient_type="staff",
                recipient_id=teacher.TID,
            )
        except Notification.DoesNotExist:
            try:
                notification = Notification.objects.get(
                    id=notification_id,
                    recipient_type__in=["staff", "all"],
                    recipient_id__isnull=True,
                )
            except Notification.DoesNotExist:
                return Response({"error": "Notification not found"}, status=404)

        notification.is_read = True
        notification.save()
        return Response({"message": "Notification marked as read"})
