from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsStudent
from projects.models import SProjects
from .models import Meeting, MeetingAttendance
from .serializers import MeetingSerializer, CreateMeetingSerializer
from notifications.utils import notify


class MeetingListCreateView(APIView):
    """
    GET  /api/meetings/  → list all meetings for student's project
    POST /api/meetings/  → student requests a meeting (always starts as pending)
    """
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(CID=student, PID__year=student.academic_year, PID__archived=False)
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        meetings = Meeting.objects.filter(PID=membership.PID)
        return Response(MeetingSerializer(meetings, many=True).data)

    def post(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(CID=student, PID__year=student.academic_year, PID__archived=False)
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # project must have a supervisor to request a meeting
        if membership.PID.TID is None:
            return Response(
                {"error": "Your project does not have a supervisor yet"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CreateMeetingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        meeting = Meeting.objects.create(
            PID=membership.PID,
            title=serializer.validated_data["title"],
            date=serializer.validated_data["date"],
            time=serializer.validated_data["time"],
            location=serializer.validated_data["location"],
            created_by_student=student,
            status="pending",   # always pending — supervisor must approve
        )

        # notify the supervisor
        supervisor = membership.PID.TID
        notify(
            recipient_type="staff",
            recipient_id=supervisor.TID,
            title="New meeting request",
            message=(
                f"The group \"{membership.PID.name}\" has requested a meeting: "
                f"\"{meeting.title}\" on {meeting.date} at {meeting.time}."
            ),
        )

        return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)


class MeetingDetailView(APIView):
    """
    GET    /api/meetings/<meeting_id>/  → get a specific meeting
    PUT    /api/meetings/<meeting_id>/  → update a meeting
                                          - only leader can edit
                                          - only pending meetings can be edited
    DELETE /api/meetings/<meeting_id>/  → delete a meeting
                                          - only leader can delete
                                          - cannot delete an approved meeting
    """
    permission_classes = [IsStudent]

    def _get_meeting_and_membership(self, student, meeting_id):
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            return None, None, Response({"error": "Meeting not found"}, status=404)

        try:
            membership = SProjects.objects.get(CID=student, PID=meeting.PID)
        except SProjects.DoesNotExist:
            return None, None, Response({"error": "Not authorized"}, status=403)

        return meeting, membership, None

    def get(self, request, meeting_id):
        student = request.user
        meeting, membership, err = self._get_meeting_and_membership(student, meeting_id)
        if err:
            return err
        return Response(MeetingSerializer(meeting).data)

    def put(self, request, meeting_id):
        student = request.user
        meeting, membership, err = self._get_meeting_and_membership(student, meeting_id)
        if err:
            return err

        # only the leader can edit meetings
        if not membership.is_leader:
            return Response(
                {"error": "Only the project leader can edit meetings"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # cannot edit a meeting that is already approved or rejected
        if meeting.status != "pending":
            return Response(
                {"error": "Only pending meetings can be edited"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CreateMeetingSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        for attr, value in serializer.validated_data.items():
            setattr(meeting, attr, value)
        meeting.save()

        return Response(MeetingSerializer(meeting).data)

    def delete(self, request, meeting_id):
        # Meetings cannot be deleted by anyone once created.
        # The frontend should show a warning instead of offering a delete button.
        return Response(
            {"error": "Meetings cannot be deleted once created."},
            status=status.HTTP_403_FORBIDDEN,
        )
