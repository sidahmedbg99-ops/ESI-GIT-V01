from rest_framework import serializers
from .models import Task, TaskAssignment
from users.models import Student


class TaskSerializer(serializers.ModelSerializer):
    assigned_to = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'type',
            'priority', 'state', 'deadline',
            'created_by_supervisor', 'assigned_to', 'created_at'
        ]

    def get_assigned_to(self, obj):
        return [
            {'CID': a.CID.CID, 'name': a.CID.full_name}
            for a in obj.assignments.select_related('CID')
        ]


class CreateTaskSerializer(serializers.Serializer):
    # fields the student provides when creating a task
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    type = serializers.CharField(max_length=50)
    priority = serializers.ChoiceField(choices=Task.PriorityChoices.choices, default=2)
    deadline = serializers.DateField()


class UpdateTaskStateSerializer(serializers.Serializer):
    # only the state can be updated by members
    state = serializers.ChoiceField(choices=Task.StateChoices.choices)


class AssignTaskSerializer(serializers.Serializer):
    # leader assigns a task to a student
    target_cid = serializers.IntegerField()