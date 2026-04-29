from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ProjectJury, Schedule, Grades
from .serializers import ProjectJurySerializer, ScheduleSerializer, GradesSerializer


@api_view(["POST"])
def assign_jury(request):
    serializer = ProjectJurySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Jury assigned successfully"}, status=201)
    return Response(serializer.errors, status=400)


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


@api_view(["PUT"])
def update_grades(request, pid):
    try:
        grade = Grades.objects.get(PID=pid)
    except Grades.DoesNotExist:
        return Response({"error": "Grades not found"}, status=404)

    serializer = GradesSerializer(grade, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades updated"})
    return Response(serializer.errors, status=400)
