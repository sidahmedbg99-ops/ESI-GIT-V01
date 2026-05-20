from django.contrib import admin
from .models import Projects, SProjects, ProjectAttachment, SupervisorRequest

@admin.register(Projects)
class ProjectsAdmin(admin.ModelAdmin):
    list_display = ('PID', 'name', 'type', 'year', 'status', 'archived')
    list_filter = ('year', 'type', 'status', 'archived')
    search_fields = ('name', 'invite_code')

@admin.register(SProjects)
class SProjectsAdmin(admin.ModelAdmin):
    list_display = ('CID', 'PID', 'role', 'is_leader')
    list_filter = ('role', 'is_leader')

@admin.register(ProjectAttachment)
class ProjectAttachmentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'PID', 'attachment_type', 'uploaded_at')

@admin.register(SupervisorRequest)
class SupervisorRequestAdmin(admin.ModelAdmin):
    list_display = ('project_id', 'teacher_id', 'status', 'created_at')
