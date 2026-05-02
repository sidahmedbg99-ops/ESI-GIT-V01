from rest_framework import serializers
from .models import ProjectJury, Schedule, Grades


class ProjectJurySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectJury
        fields = "__all__"


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = "__all__"


class GradesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grades
        fields = "__all__"
