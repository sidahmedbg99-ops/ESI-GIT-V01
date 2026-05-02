from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsAdmin, IsStaff
from .models import ProjectJury, Schedule, Grades
from .serializers import ProjectJurySerializer, ScheduleSerializer, GradesSerializer
from notifications.utils import notify
from projects.models import SProjects


@api_view(["POST"])
def assign_jury(request):
    # Admin assigns which teachers form the jury for a project
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    serializer = ProjectJurySerializer(data=request.data)
    if serializer.is_valid():
        jury = serializer.save()

        # notify all three jury members (staff)
        for teacher in [jury.teacher1_id, jury.teacher2_id, jury.teacher3_id]:
            notify(
                recipient_type="staff",
                recipient_id=teacher.TID,
                title="Jury assignment",
                message=f'You have been assigned as a jury member for the project "{jury.PID.name}".',
            )

        # notify project members (students)
        members = SProjects.objects.filter(PID=jury.PID).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title="Jury assigned",
                message=f'A jury has been assigned to your project "{jury.PID.name}".',
            )

        return Response({"message": "Jury assigned successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_juries(request):
    # Staff (teachers) need to see jury assignments
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    juries = ProjectJury.objects.all()
    serializer = ProjectJurySerializer(juries, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def create_schedule(request):
    # Admin schedules the defense
    if not IsAdmin().has_permission(request, None):
        return Response({"error": "Admin only"}, status=403)

    serializer = ScheduleSerializer(data=request.data)
    if serializer.is_valid():
        schedule = serializer.save()

        # notify project members of their defense schedule
        members = SProjects.objects.filter(PID=schedule.PID).select_related("CID")
        for m in members:
            notify(
                recipient_type="student",
                recipient_id=m.CID.CID,
                title="Defense scheduled",
                message=(
                    f'Your project defense has been scheduled on '
                    f'{schedule.presentation_date} at {schedule.presentation_time} '
                    f'in room {schedule.room}.'
                ),
            )

        return Response({"message": "Defense scheduled successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_schedules(request):
    # Staff need to see the defense schedule
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    schedules = Schedule.objects.all().order_by("presentation_date", "presentation_time")
    serializer = ScheduleSerializer(schedules, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def create_grades(request):
    # Staff (jury members) submit grades
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    serializer = GradesSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades saved successfully"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
def list_grades(request):
    # Staff can view grades
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    grades = Grades.objects.all()
    serializer = GradesSerializer(grades, many=True)
    return Response(serializer.data)


@api_view(["PUT"])
def update_grades(request, pid):
    # Staff can update grades
    if not IsStaff().has_permission(request, None):
        return Response({"error": "Staff only"}, status=403)

    try:
        grade = Grades.objects.get(PID=pid)
    except Grades.DoesNotExist:
        return Response({"error": "Grades not found"}, status=404)

    serializer = GradesSerializer(grade, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Grades updated"})
    return Response(serializer.errors, status=400)
