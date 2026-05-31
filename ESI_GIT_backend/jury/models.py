from django.db import models

from django.db import models
from users.models import Staff
from projects.models import Projects


class ProjectJury(models.Model):

    PID = models.OneToOneField(Projects, on_delete=models.CASCADE, primary_key=True)
    # Supervisor is auto-added from the project's TID
    supervisor_id = models.ForeignKey(
        Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name="jury_as_supervisor"
    )
    teacher1_id = models.ForeignKey(
        Staff, on_delete=models.CASCADE, related_name="jury_as_president"
    )
    teacher2_id = models.ForeignKey(
        Staff, on_delete=models.CASCADE, related_name="jury_as_examiner"
    )
    
    presentation_date = models.DateField(null=True, blank=True)
    presentation_time = models.TimeField(null=True, blank=True)
    room = models.CharField(max_length=50, null=True, blank=True)
    
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_jury"
        verbose_name_plural = "Project Juries"

    def __str__(self):
        return f"Jury for {self.PID.name}"


class Schedule(models.Model):

    id = models.AutoField(primary_key=True)
    PID = models.ForeignKey(Projects, on_delete=models.CASCADE)
    presentation_date = models.DateField()
    presentation_time = models.TimeField()
    room = models.CharField(max_length=50)
    duration_minutes = models.IntegerField(default=30)

    class Meta:
        db_table = "schedules"
        unique_together = ["presentation_date", "presentation_time", "room"]

    def __str__(self):
        return f"{self.PID.name} - {self.presentation_date} {self.presentation_time} ({self.room})"


class Grades(models.Model):

    PID = models.OneToOneField(Projects, on_delete=models.CASCADE, primary_key=True)
    grade1 = models.FloatField(null=True, blank=True)  # president
    grade2 = models.FloatField(null=True, blank=True)  # examiner
    grade4 = models.FloatField(null=True, blank=True)  # supervisor
    final_grade = models.FloatField(null=True, blank=True)
    comments = models.TextField(blank=True)

    class Meta:
        db_table = "grades"
        verbose_name_plural = "Grades"

    def __str__(self):
        return f"Grades for {self.PID.name}"

    def save(self, *args, **kwargs):
        """
        When jury submits grades:
        - Pull active formula
        - Calculate final grade using g1/g2/g4
        - Save result permanently
        """

        # 👇 Lazy import to avoid circular import
        from jury.services.grading_engine import calculate_final_grade

        grades_ready = (
            self.grade1 is not None
            and self.grade2 is not None
        )
        if grades_ready:
            grades_dict = {
                "g1": float(self.grade1),
                "g2": float(self.grade2),
                "g4": float(self.grade4) if self.grade4 is not None else None,
            }
            final, formula = calculate_final_grade(grades_dict)
            self.final_grade = final

        super().save(*args, **kwargs)


class GradingFormula(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    # admin writes python expression here
    # examples:
    # "g1*0.4 + g2*0.3 + g3*0.3"
    # "max(g1,g2,g3)"
    # "round((g1+g2+g3)/3,2)"
    formula_expression = models.TextField()

    description = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=False)

    created_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grading_formulas"
        ordering = ["-created_at"]

    def __str__(self):
        status = "ACTIVE" if self.is_active else "inactive"
        return f"{self.name} [{status}]"
