# Teacher API — Integration Guide

## 1. Copy the `teacher/` folder

Place the `teacher/` folder at the root of your Django project, alongside
`meetings/`, `projects/`, etc.

```
ESI_GIT_backend/
├── teacher/          ← add this
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py
│   ├── serializers.py
│   └── urls.py
├── meetings/
├── projects/
...
```

---

## 2. Register the app — `ESI_GIT/settings.py`

```python
INSTALLED_APPS = [
    ...
    "teacher",   # ← add
]
```

---

## 3. Wire the URLs — `ESI_GIT/urls.py`

```python
urlpatterns = [
    ...
    path("api/teacher/", include("teacher.urls")),   # ← add
]
```

---

## 4. Two small model changes (recommended)

### A. `Projects` — add `progress_bonus` and `github_url`

The dashboard shows +10 / -10 progress buttons and a GitHub repo field.
The base model has no field for either. Add them:

```python
# projects/models.py  →  class Projects
github_url     = models.URLField(max_length=300, blank=True, null=True)
progress_bonus = models.IntegerField(default=0)   # teacher manual offset
```

Then generate and run the migration:
```bash
python manage.py makemigrations projects
python manage.py migrate
```

After adding `progress_bonus`, replace the 501 stub in
`teacher/views.py → TeacherGroupDetailView.patch()` with:

```python
if action == "increase":
    project.progress_bonus = min(100, project.progress_bonus + 10)
else:
    project.progress_bonus = max(-100, project.progress_bonus - 10)
project.save()
return Response({"progress_bonus": project.progress_bonus})
```

And in `TeacherGroupDetailSerializer.get_progress()` factor it in:
```python
base = round(done / total * 100) if total else 0
return max(0, min(100, base + obj.progress_bonus))
```

### B. `Task` — teacher-created tasks

The current `Task.created_by` is a required `Student` FK.
The teacher API currently proxies the group leader as creator.
If you want first-class teacher task creation, add:

```python
# tasks/models.py  →  class Task
created_by_staff = models.ForeignKey(
    "users.Staff", on_delete=models.SET_NULL,
    null=True, blank=True, related_name="created_tasks"
)
```

Then make `created_by` nullable and update the teacher assign-task view.

---

## 5. Complete API reference

All endpoints require:  `Authorization: Bearer <access_token>`  (Staff JWT)

### Profile
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET    | `/api/teacher/profile/` | — | Teacher info + availability |
| PATCH  | `/api/teacher/profile/` | `{"available": true\|false}` | Toggle availability |

### Dashboard
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/teacher/dashboard/` | All stats: groups, progress, tasks, meetings, jury |

### Groups
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET  | `/api/teacher/groups/` | — | Supervised groups + pending supervisor requests |
| GET  | `/api/teacher/groups/<pid>/` | — | Full group detail |
| PATCH | `/api/teacher/groups/<pid>/` | `{"action": "increase"\|"decrease"}` | Adjust progress |

### Supervisor Requests
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| PATCH | `/api/teacher/supervisor-requests/<req_id>/` | `{"action": "accept"\|"reject"}` | Accept/reject a student's supervision request |

Accepting will:
- Set `project.TID = teacher` and `project.status = approved`
- Mark the request `accepted`
- Auto-reject all other pending requests for the same project

### Meetings
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET  | `/api/teacher/meetings/` | — | All meetings across supervised groups |
| POST | `/api/teacher/meetings/` | `{project_id, title, date, time, location}` | Create meeting — **auto-approved** |
| PATCH | `/api/teacher/meetings/<id>/` | `{"action": "accept"\|"reject"}` | Accept or reject a student-created meeting |

### Tasks
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| POST | `/api/teacher/groups/<pid>/tasks/` | `{title, description, type, priority, deadline, student_cid?}` | Assign a task to the group |

### Jury
| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET  | `/api/teacher/jury/` | — | All defenses where teacher is a jury member |
| POST | `/api/teacher/jury/<pid>/evaluate/` | `{presentation, document, demo, validate_cpi?, comments?}` | Submit evaluation |

Evaluation formula: `final = presentation×0.20 + document×0.30 + demo×0.50`

The grade is stored in the teacher's slot in the `Grades` model
(grade1 = president, grade2 = examiner1, grade3 = examiner2).
`Grades.save()` automatically recalculates `final_grade` as the average of all three.
