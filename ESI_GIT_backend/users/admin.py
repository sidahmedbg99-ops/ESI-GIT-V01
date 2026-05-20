from django.contrib import admin
from .models import Student, Staff

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('CID', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser')
    search_fields = ('email', 'first_name', 'last_name', 'CID')

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('TID', 'email', 'first_name', 'last_name', 'is_admin', 'is_teacher')
    search_fields = ('email', 'first_name', 'last_name', 'TID')
