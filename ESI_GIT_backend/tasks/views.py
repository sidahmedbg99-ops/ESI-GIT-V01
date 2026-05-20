from typing import Any, Dict, cast

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from users.permissions import IsStudent
from projects.models import SProjects
from .models import Task, TaskAssignment
from .serializers import (
    TaskSerializer,
    CreateTaskSerializer,
    UpdateTaskStateSerializer,
    AssignTaskSerializer,
)


class TaskListCreateView(APIView):
    """
    GET  /api/tasks/         → list all tasks for student's current project
    POST /api/tasks/         → create a new task (leader only)
    """

    permission_classes = [IsStudent]

    def get(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(
                CID=student, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # get all tasks for this project
        tasks = Task.objects.filter(PID=membership.PID)
        return Response(TaskSerializer(tasks, many=True).data)
        # many=True means "serialize a list, not just one object"

    def post(self, request):
        student = request.user

        try:
            membership = SProjects.objects.get(
                CID=student, PID__archived=False
            )
        except SProjects.DoesNotExist:
            return Response(
                {"error": "You are not in any project this year"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not membership.is_leader:
            return Response(
                {"error": "Only the leader can create tasks"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CreateTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = cast(Dict[str, Any], serializer.validated_data)

        task = Task.objects.create(
            PID=membership.PID,
            created_by=student,
            title=data["title"],
            description=data["description"],
            type=data["type"],
            priority=data["priority"],
            deadline=data["deadline"],
        )

        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    """
    PATCH  /api/tasks/<task_id>/state/  → update task state
    DELETE /api/tasks/<task_id>/        → delete task (leader only)
    """

    permission_classes = [IsStudent]

    def patch(self, request, task_id):
        student = request.user

        # verify student is in the project this task belongs to
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )

        is_member = SProjects.objects.filter(CID=student, PID=task.PID).exists()

        if not is_member:
            return Response(
                {"error": "You are not a member of this project"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UpdateTaskStateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = cast(Dict[str, Any], serializer.validated_data)
        task.state = data["state"]
        task.save()

        return Response(TaskSerializer(task).data)

    def delete(self, request, task_id):
        student = request.user

        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # only leader can delete tasks
        membership = SProjects.objects.filter(
            CID=student, PID=task.PID, is_leader=True
        ).exists()

        if not membership:
            return Response(
                {"error": "Only the leader can delete tasks"},
                status=status.HTTP_403_FORBIDDEN,
            )

        task.delete()
        return Response({"message": "Task deleted successfully"})


class AssignTaskView(APIView):
    """
    POST   /api/tasks/<task_id>/assign/  { "target_cid": 1003 }  – assign a member
    DELETE /api/tasks/<task_id>/assign/  { "target_cid": 1003 }  – unassign a member
    Leader only.
    """

    permission_classes = [IsStudent]

    def _get_task_and_check_leader(self, request, task_id):
        """Shared guard: returns (task, error_response). One of them will be None."""
        student = request.user
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return None, Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

        is_leader = SProjects.objects.filter(CID=student, PID=task.PID, is_leader=True).exists()
        if not is_leader:
            return None, Response({"error": "Only the leader can modify task assignments"}, status=status.HTTP_403_FORBIDDEN)

        return task, None

    def post(self, request, task_id):
        task, err = self._get_task_and_check_leader(request, task_id)
        if err:
            return err

        serializer = AssignTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = cast(Dict[str, Any], serializer.validated_data)
        target_cid = data["target_cid"]

        from users.models import Student
        try:
            target = Student.objects.get(CID=target_cid)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        is_member = SProjects.objects.filter(CID=target, PID=task.PID).exists()
        if not is_member:
            return Response({"error": "This student is not in your project"}, status=status.HTTP_400_BAD_REQUEST)

        already_assigned = TaskAssignment.objects.filter(task_id=task, CID=target).exists()
        if already_assigned:
            return Response({"error": "This student is already assigned to this task"}, status=status.HTTP_400_BAD_REQUEST)

        TaskAssignment.objects.create(task_id=task, CID=target)
        return Response({"message": f"Task assigned to {target.full_name} successfully"})

    def delete(self, request, task_id):
        task, err = self._get_task_and_check_leader(request, task_id)
        if err:
            return err

        target_cid = request.data.get("target_cid")
        if not target_cid:
            return Response({"error": "target_cid is required"}, status=status.HTTP_400_BAD_REQUEST)

        from users.models import Student
        try:
            target = Student.objects.get(CID=target_cid)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        deleted, _ = TaskAssignment.objects.filter(task_id=task, CID=target).delete()
        if not deleted:
            return Response({"error": "This student was not assigned to this task"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"message": f"Assignment removed for {target.full_name}"})
