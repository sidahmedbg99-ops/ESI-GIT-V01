from django.db import models

from django.db import models
from users.models import Student
from projects.models import Projects


class Task(models.Model):

    class PriorityChoices(models.IntegerChoices):
        LOW = 1, "Low"
        MEDIUM = 2, "Medium"
        HIGH = 3, "High"

    class StateChoices(models.TextChoices):
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    id = models.AutoField(primary_key=True)
    PID = models.ForeignKey(Projects, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField()
    type = models.CharField(max_length=50)
    priority = models.IntegerField(
        choices=PriorityChoices.choices, default=PriorityChoices.MEDIUM
    )
    state = models.CharField(
        max_length=20, choices=StateChoices.choices, default=StateChoices.TODO
    )
    deadline = models.DateField()
    created_by = models.ForeignKey(
        Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_tasks"
    )
    created_by_supervisor = models.BooleanField(default=False)    # Supervisor cant create tasks
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tasks"
        ordering = ["deadline", "-priority"]

    def __str__(self):
        return f"{self.title} - {self.PID.name}"


class TaskAssignment(models.Model):

    task_id = models.ForeignKey(
        Task, on_delete=models.CASCADE, related_name="assignments"
    )
    CID = models.ForeignKey(Student, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "task_assignments"
        unique_together = ["task_id", "CID"]

    def __str__(self):
        return f"{self.CID.full_name} assigned to {self.task_id.title}"
