from rest_framework import serializers
from .models import Meeting, MeetingAttendance


class MeetingSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    # SerializerMethodField lets you write custom logic to build a field value

    class Meta:
        model = Meeting
        fields = [
            'id', 'title', 'date', 'time', 'location',
            'status', 'created_by', 'created_at'
        ]

    def get_created_by(self, obj):
        # meeting can be created by student or staff
        if obj.created_by_student:
            return {'type': 'student', 'name': obj.created_by_student.full_name}
        elif obj.created_by_staff:
            return {'type': 'staff', 'name': obj.created_by_staff.full_name}
        return None


class CreateMeetingSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    date = serializers.DateField()
    time = serializers.TimeField()
    location = serializers.CharField(max_length=200)