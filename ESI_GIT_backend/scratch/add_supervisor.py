import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ESI_GIT.settings')
django.setup()

from users.models import Staff
from projects.models import Projects

def add_supervisor():
    email = "soulyman@test.com"
    first_name = "Soulyman"
    last_name = "Supervisor"
    
    # 1. Create or get the supervisor
    staff, created = Staff.objects.get_or_create(
        email=email,
        defaults={
            'first_name': first_name,
            'last_name': last_name,
            'is_teacher': True,
            'is_admin': False,
            'available': True,
        }
    )
    if created:
        staff.set_password("password123")
        staff.save()
        print(f"Created supervisor: {email}")
    else:
        print(f"Supervisor {email} already exists.")

    # 2. Assign to all projects that don't have a supervisor
    updated = Projects.objects.filter(TID__isnull=True).update(TID=staff)
    print(f"Assigned {email} to {updated} projects.")
    
    # 3. Specifically ensure it's on any project that might have been recently created
    # Just to be sure, we can also assign to all projects for the demo
    Projects.objects.all().update(TID=staff)
    print(f"Enforced {email} as supervisor for ALL projects for testing.")

if __name__ == "__main__":
    add_supervisor()
