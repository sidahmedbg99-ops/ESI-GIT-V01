from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsStudent, IsStaff
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
            membership = SProjects.objects.get(CID=student, PID__academic_level=student.level, PID__archived=False)
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
            membership = SProjects.objects.get(CID=student, PID__academic_level=student.level, PID__archived=False)
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
        student = request.user
        meeting, membership, err = self._get_meeting_and_membership(student, meeting_id)
        if err:
            return err

        # only the leader can delete meetings
        if not membership.is_leader:
            return Response(
                {"error": "Only the project leader can delete meetings"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # cannot delete an approved meeting
        if meeting.status == "approved":
            return Response(
                {"error": "Cannot delete an approved meeting"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meeting.delete()
        return Response({"message": "Meeting deleted successfully."})


# ─────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────

class MeetingAttendanceView(APIView):
    """
    Supervisor:
      GET  /api/teacher/meetings/<meeting_id>/attendance/ → roster with attended flags
      PUT  /api/teacher/meetings/<meeting_id>/attendance/ → save attendance

    Student (read-only):
      GET  /api/meetings/<meeting_id>/attendance/ → same roster, no editing
    """

    def _get_meeting(self, meeting_id):
        try:
            return Meeting.objects.select_related('PID').get(id=meeting_id)
        except Meeting.DoesNotExist:
            return None

    def _build_roster(self, meeting):
        """Return attendance rows for every current project member, creating missing rows."""
        members = SProjects.objects.filter(PID=meeting.PID).select_related('CID')
        rows = []
        for m in members:
            row, _ = MeetingAttendance.objects.get_or_create(
                meeting_id=meeting,
                CID=m.CID,
                defaults={'attended': False},
            )
            rows.append(row)
        return rows

    def _get_as_teacher(self, request, meeting_id):
        """Verify the requesting teacher supervises this meeting's project."""
        if not IsStaff().has_permission(request, None):
            return None, Response({"error": "Staff only"}, status=403)
        meeting = self._get_meeting(meeting_id)
        if not meeting:
            return None, Response({"error": "Meeting not found"}, status=404)
        if meeting.PID.TID != request.user:
            return None, Response({"error": "Not your project"}, status=403)
        return meeting, None

    def get_teacher(self, request, meeting_id):
        meeting, err = self._get_as_teacher(request, meeting_id)
        if err:
            return err
        from .serializers import AttendanceSerializer
        rows = self._build_roster(meeting)
        return Response(AttendanceSerializer(rows, many=True).data)

    def put_teacher(self, request, meeting_id):
        meeting, err = self._get_as_teacher(request, meeting_id)
        if err:
            return err
        if meeting.status not in ('approved', 'confirmed'):
            return Response({"error": "Can only record attendance for approved meetings"}, status=400)

        items = request.data if isinstance(request.data, list) else []
        if not items:
            return Response({"error": "Expected a list of {cid, attended} objects"}, status=400)

        updated = []
        for item in items:
            cid_val = item.get('cid')
            attended = item.get('attended', False)
            try:
                member = SProjects.objects.get(PID=meeting.PID, CID__CID=cid_val)
            except SProjects.DoesNotExist:
                continue
            row, _ = MeetingAttendance.objects.get_or_create(
                meeting_id=meeting, CID=member.CID, defaults={'attended': False}
            )
            row.attended = bool(attended)
            row.save(update_fields=['attended'])
            updated.append(row)

        from .serializers import AttendanceSerializer
        return Response(AttendanceSerializer(updated, many=True).data)

    def get_student(self, request, meeting_id):
        """Student read-only: must be a member of the meeting's project."""
        if not IsStudent().has_permission(request, None):
            return Response({"error": "Student only"}, status=403)
        meeting = self._get_meeting(meeting_id)
        if not meeting:
            return Response({"error": "Meeting not found"}, status=404)
        if not SProjects.objects.filter(PID=meeting.PID, CID=request.user).exists():
            return Response({"error": "Not your project"}, status=403)
        from .serializers import AttendanceSerializer
        rows = self._build_roster(meeting)
        return Response(AttendanceSerializer(rows, many=True).data)


class TeacherAttendanceView(APIView):
    """Adapter: GET/PUT /api/teacher/meetings/<id>/attendance/ (IsStaff)"""
    permission_classes = [IsStaff]

    def get(self, request, meeting_id):
        return MeetingAttendanceView().get_teacher(request, meeting_id)

    def put(self, request, meeting_id):
        return MeetingAttendanceView().put_teacher(request, meeting_id)


class StudentAttendanceView(APIView):
    """Adapter: GET /api/meetings/<id>/attendance/ (IsStudent, read-only)"""
    permission_classes = [IsStudent]

    def get(self, request, meeting_id):
        return MeetingAttendanceView().get_student(request, meeting_id)
