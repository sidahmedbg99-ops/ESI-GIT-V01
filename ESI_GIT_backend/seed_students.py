import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ESI_GIT.settings')
django.setup()

from users.models import Student

students_data = [
    ("kb_mezhoud@esi.dz", "MEZHOUD", "Koceila Billal", "SIW", 202031043743),
    ("am_abdad@esi.dz", "ABDAD", "Aimene", "SIW", 202031043734),
    ("ms_belkheir@esi.dz", "BELKHEIR", "Mohamed Sabri", "SIW", 202031040854),
    ("ia_bensalem@esi.dz", "BENSALEM", "Islam Abderrahman", "SIW", 202031080036),
    ("ma_boukhetala@esi.dz", "BOUKHETALA", "Mohamed Amine", "SIW", 202031043940),
    ("my_djebarri@esi.dz", "DJEBARRI", "Mohamed Yanis", "SIW", 202031043942),
    ("la_hachi@esi.dz", "HACHI", "Lina Amel", "SIW", 202031040794),
    ("my_hamitouche@esi.dz", "HAMITOUCHE", "Mohamed Yanis", "SIW", 202031043943),
    ("ma_hellal@esi.dz", "HELLAL", "Mohamed Abdallah", "SIW", 202031043936),
    ("ay_kacimi@esi.dz", "KACIMI", "Ahmed Yanis", "SIW", 202031043733),
    ("ah_kaci_chaouche@esi.dz", "KACI CHAOUCHE", "Abdelhakim", "SIW", 202031043881),
    ("ka_kermouche@esi.dz", "KERMOUCHE", "Kamel Amine", "SIW", 202031040751),
]

for email, last, first, spec, cid in students_data:
    student, created = Student.objects.get_or_create(
        CID=cid,
        defaults={
            'email': email,
            'first_name': first,
            'last_name': last,
            'specialty': spec,
            'academic_year': '2023/2024',
            'is_active': True
        }
    )
    if created:
        student.set_password('password123')
        student.save()
        print(f"Created student: {first} {last}")
    else:
        print(f"Student already exists: {first} {last}")

print("Done seeding students.")
