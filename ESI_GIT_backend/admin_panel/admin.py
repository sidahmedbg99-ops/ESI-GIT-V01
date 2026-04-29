from django.contrib import admin
from django.apps import apps
from users.models import *
from projects.models import *
from meetings.models import *
from tasks.models import *
from jury.models import *
from notifications.models import *

models = apps.get_models()

for model in models:
    try:
        admin.site.register(model)
    except Exception:
        pass

from django.contrib import admin

admin.site.site_header = "ESI GIT Administration"
admin.site.site_title = "ESI GIT Admin Portal"
admin.site.index_title = "Welcome to ESI GIT Dashboard"
