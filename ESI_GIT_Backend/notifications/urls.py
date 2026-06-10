from django.urls import path
from .views import (
    admin_send_notification,
    admin_notifications_list,
    admin_delete_notification,
    StudentNotificationListView,
    StudentUnreadCountView,
    StudentMarkNotificationReadView,
    StaffNotificationListView,
    StaffUnreadCountView,
    StaffMarkNotificationReadView,
)

urlpatterns = [
    # Admin
    path("admin/send/",           admin_send_notification),
    path("admin/list/",           admin_notifications_list),
    path("admin/<int:pk>/delete/", admin_delete_notification),

    # Student
    path("",                            StudentNotificationListView.as_view()),
    path("unread-count/",               StudentUnreadCountView.as_view()),
    path("<int:notification_id>/read/", StudentMarkNotificationReadView.as_view()),

    # Staff / Teacher
    path("staff/",                           StaffNotificationListView.as_view()),
    path("staff/unread-count/",              StaffUnreadCountView.as_view()),
    path("staff/<int:notification_id>/read/", StaffMarkNotificationReadView.as_view()),
]
