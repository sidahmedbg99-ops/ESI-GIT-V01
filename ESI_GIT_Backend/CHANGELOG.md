# Changelog — ESI GIT Backend

## [ESI_GIT_V1.10] — 2026-05-02

### New Features

#### Notification System — `notifications/utils.py`
- Added a central `notify()` helper function that creates in-app `Notification` records for targeted or broadcast delivery.
- Notifications can now target a single student, a single staff member, or be broadcast to all students, all staff, or everyone (`recipient_type = "student" | "staff" | "all"`).
- Automatic notifications are now triggered across the platform on key events (see per-module details below).

#### Project Attachments — `projects/views.py`, `projects/urls.py`
- New `AttachmentView` (`GET/POST /api/projects/attachments/`) allowing students to upload and retrieve project files.
- File uploads are stored on disk via Django's media system; the response includes an absolute URL to the file.
- Attachment metadata stored: `filename`, `title`, `attachment_type`, `file_size`, `uploaded_by`, `is_final`, `version`, `description`.

#### Admin Assign Student to Group — `projects/views.py`, `projects/urls.py`
- New `AdminAssignStudentView` (`POST /api/projects/admin/groups/<pk>/assign-student/`) lets an admin directly assign an unaffiliated student to an existing project group.
- Enforces max group size (6), prevents double-enrollment, and supports assigning the student as leader (demotes the previous leader).

#### Available Supervisors List — `projects/views.py`, `projects/urls.py`
- New `AvailableSupervisorsView` (`GET /api/projects/available-supervisors/`) returns all active, non-blocked teachers with `available=True`.
- Only accessible by students; used when selecting a supervisor to request during project creation.

#### Task Unassignment — `tasks/views.py`, `tasks/urls.py`
- New `UnassignTaskView` (`DELETE /api/tasks/<task_id>/unassign/`) allows the project leader to remove a task assignment.
- Requires `target_cid` in the request body; returns 404 if the assignment does not exist.

#### Meeting Cancellation by Supervisor — `teacher/views.py`
- The meeting action endpoint now accepts `action = "cancel"` in addition to `"accept"` and `"reject"`.
- A supervisor can cancel any meeting (pending or approved) for a group they supervise.
- Sends a cancellation notification to all project members when a meeting is cancelled.

---

### Changes & Improvements

#### Settings & CORS — `ESI_GIT/settings.py`
- Added `corsheaders` to `INSTALLED_APPS` and `CorsMiddleware` to the middleware stack.
- Added `CORS_ALLOWED_ORIGINS` allowing requests from `http://localhost:3000`.
- Switched `EMAIL_BACKEND` from `smtp` to `console` (for development/testing).
- Added `MEDIA_URL = "/media/"` and `MEDIA_ROOT` for file upload support.

#### URL Configuration — `ESI_GIT/urls.py`
- Added Django's `static()` URL helper so media files are served in development.

#### Notifications — Redesigned views (`notifications/views.py`)
- `NotificationListView` renamed to `StudentNotificationListView`; now returns personal **and** broadcast notifications for the student (deduped, ordered by `-created_at`).
- `MarkNotificationReadView` renamed to `StudentMarkNotificationReadView`; handles both personal and broadcast notification lookup.
- Added `StaffNotificationListView` (`GET /api/notifications/staff/`) for teachers to retrieve their personal and broadcast notifications.
- Added `StaffMarkNotificationReadView` (`PATCH /api/notifications/staff/<id>/read/`) for teachers to mark notifications as read.
- Notification response payload now includes a `title` field.

#### Jury — Access Control + Notifications (`jury/views.py`)
- `assign_jury` is now admin-only (returns 403 if not admin).
- `list_juries` is now staff-only.
- `schedule_defense` is now admin-only.
- `list_schedules` is now staff-only.
- `submit_grade` and `list_grades`/`update_grade` are now staff-only.
- After assigning a jury, all three jury members receive a "Jury assignment" notification, and all project members receive a "Jury assigned" notification.
- After scheduling a defense, all project members receive a "Defense scheduled" notification including date, time, and room.

#### Meetings — Rule Enforcement + Notifications (`meetings/views.py`, `meetings/models.py`)
- Student meeting creation now notifies the group's supervisor of the new meeting request.
- Extracted `_get_meeting_and_membership()` helper to de-duplicate lookup logic.
- Meeting editing is now restricted to the **project leader** only (previously any member).
- Only **pending** meetings can be edited; approved/rejected meetings are locked.
- Meeting **deletion by students is no longer allowed**; the endpoint returns 403 with a clear error message.
- Added `CANCELLED = "cancelled"` status to the `Meeting` model.

#### Tasks — Permissions Relaxed + Notifications (`tasks/views.py`)
- Task creation is now allowed for **any project member** (previously leader-only).
- When a task is assigned, the assignee now receives a "New task assigned" notification.
- Minor refactor: `Student` model imported as `StudentModel` to avoid name collision; response formatting cleaned up.

#### Projects — Notifications on Key Events (`projects/views.py`)
- Archiving a project now enforces a **minimum of 2 members** before allowing the action.
- Archive action now sends a "Project archived" notification to all project members.
- When a student joins a project, the project leader receives a "New member joined" notification.
- When a supervision request is sent, the target teacher receives a "New supervision request" notification.
- The student's role is now taken from `request.data.get("role", "fullstack")` instead of being hardcoded to `"fullstack"`.

#### Teacher Views — `github_url` Support + Notifications (`teacher/views.py`)
- The `PATCH /api/teacher/groups/<pid>/` endpoint previously returned `501 Not Implemented` for `github_url` updates and for progress adjustments. It now **correctly saves `github_url`** to the project and returns it.
- The stubbed progress-bonus logic (increase/decrease action) has been removed; the endpoint now returns 400 for unrecognized fields.
- Accepting a supervision request sends a "Supervision request accepted" notification to the project leader.
- Rejecting a supervision request sends a "Supervision request rejected" notification to the project leader.
- When a teacher schedules a meeting, all project members receive a "New meeting scheduled" notification.
- When a teacher accepts or rejects a student meeting request, all project members receive a "Meeting approved/rejected" notification.

---

### Developer Tooling

#### Database Seed Script — `seed_data.py`
- Added `seed_data.py` to populate the database with test data for development.
- Run with: `python manage.py shell < seed_data.py`
- Creates the following out of the box:
  - **2 departments**: Preparatory Class, Second Cycle
  - **4 specialties**: SIW, ISI, IASD, CYS
  - **1 admin**: `admin@esi.dz`
  - **3 teachers**: `karim@esi.dz`, `sara@esi.dz`, `youcef@esi.dz`
  - **8 students** across ISI, SIW, and IASD specialties
- Passwords are auto-generated and printed to the console at the end — they are not stored anywhere else, so save them.
- All created users have `is_first_login=True` and will be prompted to change their password on first login.
- Safe to re-run: already-existing users are skipped without error.

---

### Known Bugs (to be fixed)

#### Bug 1 — Archived project permanently blocks student from creating or joining a new one (`projects/views.py`)
- When a project is archived, the `SProjects` memberships are not deleted — students remain linked to it in the database.
- Both `CreateProjectView` and `JoinProjectView` check `already_in_project` using `SProjects.objects.filter(CID=student, PID__year=student.academic_year)` with no `PID__archived=False` filter.
- As a result, any student whose project gets archived is **blocked from creating or joining another project** for the rest of the year.
- **Fix:** Add `PID__archived=False` to the `already_in_project` query in both views. Memberships should be preserved for history — do not delete them on archive.


#### Bug 2 — Repeating student gets a misleading error when trying to create or join a project (`projects/views.py`)
- A student who redid a year and already had a project during that `academic_year` in a previous attempt hits the generic `"You are already in a project this year"` error, with no indication that the block comes from an archived past project.
- This is confusing for both the student and the admin trying to diagnose the issue.
- **Fix:** Split the `already_in_project` check into two sequential checks — first for active projects, then for archived ones — and return a distinct error for each:
  ```python
  # active project check
  if SProjects.objects.filter(CID=student, PID__year=student.academic_year, PID__archived=False).exists():
      return Response({"error": "You are already in an active project this year."}, status=400)

  # archived project check (student redid their year)
  if SProjects.objects.filter(CID=student, PID__year=student.academic_year, PID__archived=True).exists():
      return Response({"error": "You already participated in a project during this academic year. Please contact the admin."}, status=400)
  ```

#### Bug 3 — `Students_without_group` ignores archived projects (`projects/views.py`)
- `Students_without_group` excludes any student who has **any** `SProjects` entry, including archived ones.
- A student whose only project was archived will never appear in the unassigned students list, so the admin can't assign them to a new group manually either.
- **Fix:** Filter out archived memberships: `SProjects.objects.filter(PID__archived=False).values_list("CID", flat=True)`.

#### Bug 4 — `MyProjectView` and `LeaderActionsView` can return archived projects (`projects/views.py`)
- Both views look up the student's project using `PID__year=student.academic_year` with no `PID__archived=False` filter.
- If a student's project was archived, these views will still return it as their "current project", allowing them to perform leader actions (kick, promote, edit) on an archived project.
- **Fix:** Add `PID__archived=False` to the `SProjects.objects.get(...)` call in both views.

#### Bug 5 — Leader can leave a solo project but the project is never deleted (`projects/views.py`)
- The comment in `LeaveProjectView` says *"Leader can leave if he is alone, if he does the group is deleted"* but the code only calls `membership.delete()` — it never deletes the `Projects` object itself.
- This leaves orphaned projects in the database with no members and no leader.
- **Fix:** After `membership.delete()`, check if the project has zero remaining members and delete the project if so:
  ```python
  membership.delete()
  if not SProjects.objects.filter(PID=project).exists():
      project.delete()
  ```

#### Bug 6 — Teacher task creation silently skips the student assignment on error (`teacher/views.py`)
- In `TeacherAssignTaskView`, if `student_cid` is provided but the student doesn't exist or isn't in the project, the task is still created but the assignment is silently skipped with a bare `pass`.
- The teacher gets back a `201 Created` with no indication that the assignment failed.
- **Fix:** Remove the silent `except` pass and return a `400` error if the student lookup fails, or at minimum include a warning field in the response.

#### Bug 7 — `AdminAssignStudentView` double-enrollment check ignores academic year (`projects/views.py`)
- The check `SProjects.objects.filter(CID=student).exists()` looks across **all years and all projects** — including archived ones from previous years.
- A 5th year student who was in a project last year would be blocked from being assigned to a new group this year by the admin.
- **Fix:** Scope the check to active projects in the current academic year: `SProjects.objects.filter(CID=student, PID__year=student.academic_year, PID__archived=False).exists()`.

#### Known Limitation — No end-of-year automation (`projects/views.py`)
- There is no bulk archive, end-of-year rollover, or automation of any kind.
- At the end of the year, an admin must manually archive every project one by one.
- New 2nd year students **can** be onboarded in bulk via `POST /api/admin/students/upload/` (CSV or XLSX with columns: `CID, email, first_name, last_name, specialty, academic_year`). Each valid row creates an account and emails credentials; invalid rows are skipped and reported without stopping the import.
- However, there is no mechanism to increment existing student levels or assign specialties to incoming 4th year students at the start of a new academic year.
- **Recommendation:** Add a dedicated admin endpoint (e.g. `POST /api/admin/year-rollover/`) that bulk-archives all active projects for a given `academic_year` and optionally increments all student levels.

---

### Dependencies Added — `requirements.txt`
- `django-extensions==4.1`

---

### Removed
- `INTEGRATION.md` — removed from the project root.
