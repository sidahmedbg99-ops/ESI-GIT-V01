from django.contrib import admin


class BaseAdmin(admin.ModelAdmin):
    list_per_page = 25
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    readonly_fields = ("created_at", "updated_at")
