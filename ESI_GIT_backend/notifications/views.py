from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from users.models import Student

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsAdmin
from .models import Notification
from .serializers import (
    AdminSendNotificationSerializer,
    NotificationSerializer,
)
from typing import cast, Dict, Any


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

class NotificationListView(APIView):
    """
    GET /api/notifications/  → list all notifications for logged in user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        is_staff = hasattr(user, 'TID')
        
        notifications = Notification.objects.filter(
            recipient_id=user.TID if is_staff else user.CID,
            recipient_type='staff' if is_staff else 'student'
        ) | Notification.objects.filter(recipient_type='all')

        data = [{
            'id': n.id,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at,
        } for n in notifications]

        return Response(data)


class MarkNotificationReadView(APIView):
    """
    PATCH /api/notifications/<id>/read/
    Marks a notification as read.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_id):
        user = request.user
        is_staff = hasattr(user, 'TID')

        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient_id=user.TID if is_staff else user.CID,
                recipient_type='staff' if is_staff else 'student'
            )
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.save()

        return Response({'message': 'Notification marked as read'})
