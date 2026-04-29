from .models import Student, Staff


class StudentBackend:
    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None or password is None:
            return None

        try:
            student = Student.objects.get(email=email)

            if (
                student.check_password(password)
                and student.is_active
                and not student.is_blocked
            ):
                return student

        except Student.DoesNotExist:
            return None


class StaffBackend:
    def authenticate(self, request, email=None, password=None, **kwargs):
        if email is None or password is None:
            return None

        try:
            staff = Staff.objects.get(email=email)

            if (
                staff.check_password(password)
                and staff.is_active
                and not staff.is_blocked
            ):
                return staff

        except Staff.DoesNotExist:
            return None
