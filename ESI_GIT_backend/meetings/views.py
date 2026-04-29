from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsStudent
from projects.models import SProjects
from .models import Meeting, MeetingAttendance
from .serializers import MeetingSerializer, CreateMeetingSerializer


class MeetingListCreateView(APIView):
    """
    GET  /api/meetings/  → list all meetings for student's project
    POST /api/meetings/  → student requests a meeting (goes to supervisor for approval)
    """
    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(
                CID=student,
                PID__year=student.academic_year
            )
        except SProjects.DoesNotExist:
            return Response(
                {'error': 'You are not in any project this year'},
                status=status.HTTP_404_NOT_FOUND
            )

        meetings = Meeting.objects.filter(PID=membership.PID)
        return Response(MeetingSerializer(meetings, many=True).data)

    def post(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(
                CID=student,
                PID__year=student.academic_year
            )
        except SProjects.DoesNotExist:
            return Response(
                {'error': 'You are not in any project this year'},
                status=status.HTTP_404_NOT_FOUND
            )

        # project must have a supervisor to request a meeting
        if membership.PID.TID is None:
            return Response(
                {'error': 'Your project does not have a supervisor yet'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreateMeetingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        meeting = Meeting.objects.create(
            PID=membership.PID,
            title=serializer.validated_data['title'],
            date=serializer.validated_data['date'],
            time=serializer.validated_data['time'],
            location=serializer.validated_data['location'],
            created_by_student=student,
            status='pending',  # supervisor must approve
        )

        return Response(MeetingSerializer(meeting).data, status=status.HTTP_201_CREATED)

class MeetingDetailView(APIView):
    """
    GET    /api/meetings/<meeting_id>/  → get a specific meeting
    PUT    /api/meetings/<meeting_id>/  → update a meeting
    DELETE /api/meetings/<meeting_id>/  → delete a meeting
    """
    permission_classes = [IsStudent]

    def get(self, request, meeting_id):
        student = request.user
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

        is_member = SProjects.objects.filter(CID=student, PID=meeting.PID).exists()
        if not is_member:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        return Response(MeetingSerializer(meeting).data)

    def put(self, request, meeting_id):
        student = request.user
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

        is_member = SProjects.objects.filter(CID=student, PID=meeting.PID).exists()
        if not is_member:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = CreateMeetingSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        for attr, value in serializer.validated_data.items():
            setattr(meeting, attr, value)
        meeting.save()

        return Response(MeetingSerializer(meeting).data)

    def delete(self, request, meeting_id):
        student = request.user
        try:
            meeting = Meeting.objects.get(id=meeting_id)
        except Meeting.DoesNotExist:
            return Response({'error': 'Meeting not found'}, status=status.HTTP_404_NOT_FOUND)

        is_member = SProjects.objects.filter(CID=student, PID=meeting.PID).exists()
        if not is_member:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        meeting.delete()
        return Response({'message': 'Meeting deleted successfully'})
