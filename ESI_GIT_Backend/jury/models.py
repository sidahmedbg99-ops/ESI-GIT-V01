from django.db import models
from users.models import Staff
from projects.models import Projects


# ─────────────────────────────────────────
# Grading Formula
# ─────────────────────────────────────────

class GradingFormula(models.Model):
    """
    Admin creates grading formulas using variable names (g1, g2, ...).
    Only one formula can be active at a time.
    Labels drive the dynamic grading form on the frontend —
    the form builds itself from this, so adding g7 next year
    requires zero code change.
    """
    id          = models.AutoField(primary_key=True)
    name        = models.CharField(max_length=100)
    expression  = models.TextField()
    # e.g. "(g1*4 + g2*4 + g3*1 + g4*1 + g5*2 + g6*2) / 14"
    labels      = models.JSONField(default=dict) 
    # e.g. {"g1": "Continuous work", "g2": "Final product", ...}
    description = models.TextField(blank=True, null=True)
    is_active   = models.BooleanField(default=False)
    created_by  = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grading_formulas"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({'ACTIVE' if self.is_active else 'inactive'})"


# ─────────────────────────────────────────
# Project Jury
# ─────────────────────────────────────────

class ProjectJury(models.Model):
    """
    3 jury members for a project defense.
    teacher1 = president (fills the grades)
    teacher2 = examiner 1
    teacher3 = examiner 2
    The supervisor is always one of these 3 — enforced in assign_jury view.
    To find the supervisor: use project.TID, not this table.
    """
    PID         = models.OneToOneField(Projects, on_delete=models.CASCADE, primary_key=True)
    teacher1_id = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="jury_as_president")
    teacher2_id = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="jury_as_examiner1")
    teacher3_id = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="jury_as_examiner2")
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "project_jury"
        verbose_name_plural = "Project Juries"

    def __str__(self):
        return f"Jury for {self.PID.name}"


# ─────────────────────────────────────────
# Schedule
# ─────────────────────────────────────────

class Schedule(models.Model):
    """
    Presentation schedule for a project.
    unique_together prevents double-booking a room at the same time.
    """
    id                = models.AutoField(primary_key=True)
    PID               = models.ForeignKey(Projects, on_delete=models.CASCADE)
    presentation_date = models.DateField()
    presentation_time = models.TimeField()
    room              = models.CharField(max_length=50)
    duration_minutes  = models.IntegerField(default=60)
    department_name   = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = "schedules"
        unique_together = ["presentation_date", "presentation_time", "room"]

    def __str__(self):
        return f"{self.PID.name} - {self.presentation_date} {self.presentation_time} ({self.room})"


# ─────────────────────────────────────────
# Grades
# ─────────────────────────────────────────

class Grades(models.Model):
    """
    One row per project.
    values = {"g1": 15.0, "g2": 14.0, ...} — keys match the active formula labels.
    formula_snapshot is frozen at grading time — immutable historical record.
    final_grade is auto-computed in save() when all required variables are filled.
    Only the jury president (teacher1) submits grades.
    """
    PID              = models.OneToOneField(Projects, on_delete=models.CASCADE, primary_key=True)
    formula          = models.ForeignKey(GradingFormula, on_delete=models.SET_NULL, null=True, blank=True)
    formula_snapshot = models.JSONField(null=True, blank=True)
    # frozen copy: {"expression": "...", "labels": {...}} — never changes after grading
    values           = models.JSONField(default=dict)
    # {"g1": 15.0, "g2": 14.0, ...}
    final_grade      = models.FloatField(null=True, blank=True)
    comments         = models.TextField(blank=True)
    graded_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "grades"
        verbose_name_plural = "Grades"

    def __str__(self):
        return f"Grades for {self.PID.name}"

    def save(self, *args, **kwargs):
        from jury.services.grading_engine import calculate_final_grade
        from django.utils import timezone

        if self.values:
            result = calculate_final_grade(self.values)
            if result is not None:
                # all variables filled — compute and freeze
                self.final_grade = result
                if not self.graded_at:
                    self.graded_at = timezone.now()
                # freeze snapshot only once at first full submission
                if self.formula and not self.formula_snapshot:
                    self.formula_snapshot = {
                        "expression": self.formula.expression,
                        "labels":     self.formula.labels,
                    }

        super().save(*args, **kwargs)