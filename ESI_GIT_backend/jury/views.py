from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from .models import ProjectJury, Schedule, Grades
from .serializers import ProjectJurySerializer, ScheduleSerializer, GradesSerializer
from projects.models import Projects
from users.models import Staff
from users.permissions import IsAdmin, IsStaff, IsStudent


@api_view(["POST"])
def assign_jury(request):
    """
    POST /api/jury/admin/jury/assign/
    Body: { PID, teacher1_id, teacher2_id }
    The supervisor (project.TID) is automatically added as the jury supervisor.
    """
    pid = request.data.get("PID")
    t1 = request.data.get("teacher1_id")
    t2 = request.data.get("teacher2_id")

    if not all([pid, t1, t2]):
        return Response({"error": "PID, teacher1_id, teacher2_id are required"}, status=400)

    try:
        project = Projects.objects.get(pk=pid)
    except Projects.DoesNotExist:
        return Response({"error": "Project not found"}, status=404)

    # Validate the two jury teachers are distinct
    if int(t1) == int(t2):
        return Response({"error": "The 2 jury teachers must be different"}, status=400)

    try:
        teacher1 = Staff.objects.get(TID=t1)
        teacher2 = Staff.objects.get(TID=t2)
    except Staff.DoesNotExist as e:
        return Response({"error": f"Teacher not found: {e}"}, status=404)

    # Auto-assign supervisor from project.TID
    supervisor = project.TID  # may be None if no supervisor yet

    jury, created = ProjectJury.objects.update_or_create(
        PID=project,
        defaults={
            "supervisor_id": supervisor,
            "teacher1_id": teacher1,
            "teacher2_id": teacher2,
        },
    )
    # Ensure a Grades row exists
    Grades.objects.get_or_create(PID=project)

    return Response({
        "message": "Jury assigned successfully",
        "jury": {
            "supervisor": supervisor.full_name if supervisor else None,
            "president": teacher1.full_name,
            "examiner": teacher2.full_name,
        }
    }, status=201 if created else 200)


@api_view(["GET"])
def list_juries(request):
    juries = ProjectJury.objects.all()
    serializer = ProjectJurySerializer(juries, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def create_schedule(request):
    serializer = ScheduleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Defense scheduled successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_schedules(request):
    schedules = Schedule.objects.all().order_by(
        "presentation_date", "presentation_time"
    )
    serializer = ScheduleSerializer(schedules, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def create_grades(request):
    serializer = GradesSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades saved successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_grades(request):
    grades = Grades.objects.all()
    serializer = GradesSerializer(grades, many=True)
    return Response(serializer.data)


@api_view(["PUT", "PATCH"])
def update_grades(request, pid):
    try:
        grade = Grades.objects.get(PID=pid)
    except Grades.DoesNotExist:
        return Response({"error": "Grades not found"}, status=404)

    serializer = GradesSerializer(grade, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades updated", "data": serializer.data})
    return Response(serializer.errors, status=400)


class TeacherSubmitGradeView(APIView):
    """
    POST /api/jury/teacher/grades/<pid>/
    A jury teacher submits their individual mark for a project.
    The system determines which grade slot (1-4) to fill based on their role.
    Body: { grade: float, comments?: str }
    """

    def post(self, request, pid):
        try:
            project = Projects.objects.get(pk=pid)
        except Projects.DoesNotExist:
            return Response({"error": "Project not found"}, status=404)

        try:
            jury = ProjectJury.objects.get(PID=project)
        except ProjectJury.DoesNotExist:
            return Response({"error": "No jury assigned to this project"}, status=404)

        teacher = request.user
        grade_value = request.data.get("grade")
        comments = request.data.get("comments", "")

        if grade_value is None:
            return Response({"error": "grade is required"}, status=400)

        try:
            grade_value = float(grade_value)
            if not (0 <= grade_value <= 20):
                raise ValueError()
        except (ValueError, TypeError):
            return Response({"error": "grade must be a number between 0 and 20"}, status=400)

        # Determine this teacher's slot
        grades_obj, _ = Grades.objects.get_or_create(PID=project)

        if jury.teacher1_id_id == teacher.pk:
            grades_obj.grade1 = grade_value
        elif jury.teacher2_id_id == teacher.pk:
            grades_obj.grade2 = grade_value
        elif jury.supervisor_id_id == teacher.pk:
            grades_obj.grade4 = grade_value
        else:
            return Response({"error": "You are not a member of the jury for this project"}, status=403)

        if comments:
            grades_obj.comments = comments

        grades_obj.save()  # triggers final_grade calculation in model.save()

        return Response({
            "message": "Grade submitted successfully",
            "final_grade": grades_obj.final_grade,
            "all_grades_in": all([
                grades_obj.grade1, grades_obj.grade2, grades_obj.grade4
            ])
        })
