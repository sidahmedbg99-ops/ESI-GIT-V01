from django.urls import path
from .views import (
    AdminProjectListCreateView,
    AdminProjectDetailView,
    PublicSettingsView,
    StudentGroupStatusView,
    Students_without_group,
    admin_groups_list,
    admin_group_details,
    admin_projects_analytics,
    admin_dashboard_stats,
    archived_projects,
    archive_project,
    restore_project,
    archived_projects_visibility,
    AdminAssignStudentView,
)
from .views import (
    CreateProjectView,
    JoinProjectView,
    MyProjectView,
    LeaderActionsView,
    LeaveProjectView,
    SupervisorRequestView,
    AvailableSupervisorsView,
)

from .views import AttachmentView
from jury.views import assign_jury


urlpatterns = [
    # ================= ADMIN PROJECT MANAGEMENT =================
    path("admin/projects/", AdminProjectListCreateView.as_view()),
    path("admin/projects/<int:pk>/", AdminProjectDetailView.as_view()),
    path("admin/projects/<int:pk>/archive/", archive_project),
    path("admin/projects/<int:pk>/restore/", restore_project),
    # ================= ADMIN GROUP MANAGEMENT =================
    path("admin/students-without-group/", Students_without_group),
    path("admin/groups/<int:pk>/assign-student/", AdminAssignStudentView.as_view()),
    path("admin/groups/", admin_groups_list),
    path("admin/groups/<int:pk>/", admin_group_details),
    path("admin/groups/<int:pk>/assign-jury/", assign_jury),
    # ================= ADMIN DASHBOARD =================
    path("admin/analytics/", admin_projects_analytics),
    path("admin/dashboard/", admin_dashboard_stats),
    # ================= ARCHIVED PROJECTS (ROLE BASED) =================
    path("projects/archived/", archived_projects),
    # ================= PLATFORM SETTINGS =================
    path("admin/archived-projects-visibility/", archived_projects_visibility),
    path("create/", CreateProjectView.as_view(), name="create-project"),
    path("join/", JoinProjectView.as_view(), name="join-project"),
    path("my-project/", MyProjectView.as_view(), name="my-project"),
    path("leader/", LeaderActionsView.as_view(), name="leader-actions"),
    path("leave/", LeaveProjectView.as_view(), name="leave-project"),
    path(
        "supervisor-request/",
        SupervisorRequestView.as_view(),
        name="supervisor-request",
    ),
    path(
        "available-supervisors/",
        AvailableSupervisorsView.as_view(),
        name="available-supervisors",
    ),
    path("attachments/", AttachmentView.as_view(), name="attachments"),
    path("projects/group-status/", StudentGroupStatusView.as_view()),
    path("public-settings/", PublicSettingsView.as_view()),
]

