from django.urls import path
from .views import (
    AdminProjectListCreateView,
    AdminProjectDetailView,
    Students_without_group,
    admin_groups_list,
    admin_group_details,
    assign_jury,
    admin_projects_analytics,
    admin_dashboard_stats,
    archived_projects,
    archive_project,
    restore_project,
    archived_projects_visibility,
)
from .views import (
    CreateProjectView,
    JoinProjectView,
    MyProjectView,
    LeaderActionsView,
    LeaveProjectView,
    SupervisorRequestView,
    StudentAttachmentView,
    StudentGroupStatusView,
)

urlpatterns = [
    # ================= ADMIN PROJECT MANAGEMENT =================
    path("admin/projects/", AdminProjectListCreateView.as_view()),
    path("admin/projects/<int:pk>/", AdminProjectDetailView.as_view()),
    path("admin/projects/<int:pk>/archive/", archive_project),
    path("admin/projects/<int:pk>/restore/", restore_project),
    # ================= ADMIN GROUP MANAGEMENT =================
    path("admin/students-without-group/", Students_without_group),
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
    path("attachments/", StudentAttachmentView.as_view(), name="project-attachments"),
    path("students/status/", StudentGroupStatusView.as_view(), name="students-status"),
]
