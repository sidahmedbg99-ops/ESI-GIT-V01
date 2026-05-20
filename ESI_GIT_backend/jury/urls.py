from django.urls import path
from .views import (
    assign_jury,
    list_juries,
    create_schedule,
    list_schedules,
    create_grades,
    list_grades,
    update_grades,
    TeacherSubmitGradeView,
)

urlpatterns = [
    path("admin/jury/assign/", assign_jury),
    path("admin/jury/", list_juries),
    path("admin/schedule/create/", create_schedule),
    path("admin/schedule/", list_schedules),
    path("admin/grades/create/", create_grades),
    path("admin/grades/", list_grades),
    path("admin/grades/<int:pid>/", update_grades),
    # Teacher submits their own grade for a project
    path("teacher/grades/<int:pid>/", TeacherSubmitGradeView.as_view()),
]
