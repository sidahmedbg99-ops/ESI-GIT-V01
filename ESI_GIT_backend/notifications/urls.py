from django.urls import path
from .views import NotificationListView, MarkNotificationReadView
from .views import (
    admin_send_notification,
    admin_notifications_list,
    admin_delete_notification,
)

urlpatterns = [
    path("admin/send/", admin_send_notification),
    path("admin/list/", admin_notifications_list),
    path("admin/<int:pk>/delete/", admin_delete_notification),
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:notification_id>/read/', MarkNotificationReadView.as_view(), name='notification-read'),
]
