from rest_framework import serializers
from .models import GradingFormula, ProjectJury, Schedule, Grades


class ProjectJurySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProjectJury
        fields = "__all__"


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Schedule
        fields = "__all__"


class GradingFormulaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = GradingFormula
        fields = "__all__"


class GradesSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Grades
        fields = "__all__"
        read_only_fields = ["final_grade", "graded_at", "formula_snapshot"]
        # final_grade, graded_at, formula_snapshot are all auto-set in Grades.save()
        # nobody submits these manually