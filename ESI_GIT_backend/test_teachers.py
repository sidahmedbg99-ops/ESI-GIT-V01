import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ESI_GIT.settings')
django.setup()

from users.models import Staff
teachers = Staff.objects.filter(is_teacher=True, is_active=True)
data = [
    {
        "TID": t.TID,
        "_id": t.TID,
        "email": t.email,
        "first_name": t.first_name,
        "last_name": t.last_name,
        "name": f"{t.first_name} {t.last_name}",
        "full_name": f"{t.first_name} {t.last_name}",
        "specialty": t.specialty or "PFE",
        "department": t.department or "Informatique",
        "available": t.available,
    }
    for t in teachers
]
print(data)
