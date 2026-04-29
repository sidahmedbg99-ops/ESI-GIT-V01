"""
URL patterns for the teacher-side API.
Include in ESI_GIT/urls.py:
    path("api/teacher/", include("teacher.urls")),
"""

from django.urls import path
from .views import (
    TeacherProfileView,
    TeacherDashboardView,
    TeacherGroupListView,
    TeacherGroupDetailView,
    TeacherSupervisorRequestActionView,
    TeacherMeetingListCreateView,
    TeacherMeetingActionView,
    TeacherAssignTaskView,
    TeacherJuryListView,
    TeacherJuryEvaluateView,
)

urlpatterns = [
    # ── Profile ──────────────────────────────────────
    # GET  /api/teacher/profile/   → teacher info + availability
    # PATCH /api/teacher/profile/  → toggle available: true/false
    path("profile/", TeacherProfileView.as_view(), name="teacher-profile"),

    # ── Dashboard ────────────────────────────────────
    # GET  /api/teacher/dashboard/
    path("dashboard/", TeacherDashboardView.as_view(), name="teacher-dashboard"),

    # ── Groups ───────────────────────────────────────
    # GET  /api/teacher/groups/                → supervised groups + pending requests
    path("groups/", TeacherGroupListView.as_view(), name="teacher-groups"),

    # GET   /api/teacher/groups/<pid>/         → group detail
    # PATCH /api/teacher/groups/<pid>/         → adjust progress / set github url
    path("groups/<int:pid>/", TeacherGroupDetailView.as_view(), name="teacher-group-detail"),

    # ── Supervisor Requests ──────────────────────────
    # PATCH /api/teacher/supervisor-requests/<req_id>/  → accept | reject
    path(
        "supervisor-requests/<int:req_id>/",
        TeacherSupervisorRequestActionView.as_view(),
        name="teacher-supervisor-request-action",
    ),

    # ── Meetings ─────────────────────────────────────
    # GET  /api/teacher/meetings/              → all meetings for supervised groups
    # POST /api/teacher/meetings/              → create meeting (auto-approved)
    path("meetings/", TeacherMeetingListCreateView.as_view(), name="teacher-meetings"),

    # PATCH /api/teacher/meetings/<meeting_id>/ → accept | reject student meeting
    path(
        "meetings/<int:meeting_id>/",
        TeacherMeetingActionView.as_view(),
        name="teacher-meeting-action",
    ),

    # ── Tasks ────────────────────────────────────────
    # POST /api/teacher/groups/<pid>/tasks/    → assign task to a group
    path("groups/<int:pid>/tasks/", TeacherAssignTaskView.as_view(), name="teacher-assign-task"),

    # ── Jury ─────────────────────────────────────────
    # GET  /api/teacher/jury/                  → list defenses
    path("jury/", TeacherJuryListView.as_view(), name="teacher-jury"),

    # POST /api/teacher/jury/<pid>/evaluate/   → submit evaluation
    path(
        "jury/<int:pid>/evaluate/",
        TeacherJuryEvaluateView.as_view(),
        name="teacher-jury-evaluate",
    ),
]
