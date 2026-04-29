from django.apps import AppConfig


class AdminConfig(AppConfig):
    name = "admin_panel"

    def ready(self):
        import admin_panel.signals
