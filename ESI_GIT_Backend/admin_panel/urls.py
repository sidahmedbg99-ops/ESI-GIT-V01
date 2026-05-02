"""
admin_panel/urls.py
===================
All admin-panel URL patterns, importing from the merged admin_panel/views.py.

Every route requires IsAdmin permission (enforced inside each view).
Mounted under /api/admin/ in ESI_GIT/urls.py.
"""

from django.urls import path

from admin_panel.views import (
    # Dashboard
    dashboard_stats,
    # User listing
    list_users,
    # Students
    create_student, get_student, update_student, delete_student,
    block_student, unblock_student, reset_password_student, upload_students,
    # Staff
    create_staff, get_staff, update_staff, delete_staff,
    block_staff, unblock_staff, reset_password_staff, upload_staff,
    # Academic structure
    AcademicStructureAPI, DepartmentListAPI,
    SpecialtyListCreateAPI, SpecialtyDetailAPI,
    # Grade formulas
    GradeFormulaView, ActiveFormulaView, ActivateFormulaView,
    # Platform settings
    PlatformSettingsAPI,
)

urlpatterns = [

    # ── Dashboard ──────────────────────────────────────────────────────────────
    path("dashboard/", dashboard_stats),

    # ── User listing (search + filter + pagination) ────────────────────────────
    path("users/", list_users),

    # ── Students ───────────────────────────────────────────────────────────────
    path("students/create/",                          create_student),
    path("students/<int:student_id>/",                get_student),
    path("students/<int:student_id>/update/",         update_student),
    path("students/<int:student_id>/delete/",         delete_student),
    path("students/block/<int:student_id>/",          block_student),
    path("students/unblock/<int:student_id>/",        unblock_student),
    path("students/reset-password/<int:student_id>/", reset_password_student),
    path("students/upload/",                          upload_students),

    # ── Staff ──────────────────────────────────────────────────────────────────
    path("staff/create/",                          create_staff),
    path("staff/<int:staff_id>/",                  get_staff),
    path("staff/<int:staff_id>/update/",           update_staff),
    path("staff/<int:staff_id>/delete/",           delete_staff),
    path("staff/block/<int:staff_id>/",            block_staff),
    path("staff/unblock/<int:staff_id>/",          unblock_staff),
    path("staff/reset-password/<int:staff_id>/",   reset_password_staff),
    path("staff/upload/",                          upload_staff),

    # ── Academic structure ─────────────────────────────────────────────────────
    path("academic-structure/",      AcademicStructureAPI.as_view()),
    path("departments/",             DepartmentListAPI.as_view()),
    path("specialties/",             SpecialtyListCreateAPI.as_view()),
    path("specialties/<int:id>/",    SpecialtyDetailAPI.as_view()),

    # ── Grading formulas ───────────────────────────────────────────────────────
    path("grade-formula/",                           GradeFormulaView.as_view()),
    path("grade-formula/active/",                    ActiveFormulaView.as_view()),
    path("grade-formula/<int:formula_id>/activate/", ActivateFormulaView.as_view()),

    # ── Platform settings ──────────────────────────────────────────────────────
    path("platform-settings/", PlatformSettingsAPI.as_view()),
]
