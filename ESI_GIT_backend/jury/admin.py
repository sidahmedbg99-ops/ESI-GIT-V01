from django.contrib import admin
from .models import ProjectJury, Schedule, Grades, GradingFormula

@admin.register(ProjectJury)
class ProjectJuryAdmin(admin.ModelAdmin):
    list_display = ('PID', 'supervisor_id', 'teacher1_id', 'teacher2_id')

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('PID', 'presentation_date', 'presentation_time', 'room')

@admin.register(Grades)
class GradesAdmin(admin.ModelAdmin):
    list_display = ('PID', 'final_grade')

@admin.register(GradingFormula)
class GradingFormulaAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
