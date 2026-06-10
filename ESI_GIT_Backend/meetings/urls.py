from django.urls import path
from .views import MeetingListCreateView, MeetingDetailView, StudentAttendanceView

urlpatterns = [
    path('', MeetingListCreateView.as_view(), name='meeting-list-create'),
    path('<int:meeting_id>/', MeetingDetailView.as_view(), name='meeting-detail'),
    path('<int:meeting_id>/attendance/', StudentAttendanceView.as_view(), name='meeting-attendance-student'),
]