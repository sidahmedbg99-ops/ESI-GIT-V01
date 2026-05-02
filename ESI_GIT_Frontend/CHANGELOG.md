# Changelog — ESI GIT Frontend

## [ESI-GIT-V1.1] — 2026-05-02

### New Features

#### Admin Dashboard — Live Analytics (`src/pages/admin/AdminPages.jsx`)
- The analytics dashboard now fetches **real data from the backend** (`ENDPOINTS.admin.analytics`) instead of using hardcoded mock values.
- Stat cards now display: total archived projects, submissions this month, and the platform completion rate — all pulled live.
- The line chart has been replaced with a **bar chart** showing monthly submissions over the last 6 months, with ISO date strings formatted to short month labels (e.g. "jan. 25").
- Added a new **"Projets par année"** side panel showing a progress-bar breakdown of project counts by academic year.
- Loading and empty states are handled gracefully ("Chargement…" / "Aucune soumission sur les 6 derniers mois").

#### Admin Platform Settings — Persisted to Backend (`src/pages/admin/AdminPages.jsx`)
- The "hide archived projects from students" toggle now **reads its initial state from the API** (`ENDPOINTS.admin.platformSettings`) on mount instead of relying on `localStorage` alone.
- Saving the setting now **PATCHes the backend** before updating `localStorage`; a toast error is shown if the API call fails.

#### Meeting Cancellation — Teacher (`src/pages/teacher/TeacherMeetings.jsx`, `src/api/meetings.js`)
- Teachers can now **cancel approved meetings** via a new "Annuler" button shown on approved meeting rows.
- New `cancelMeeting(id)` API function sends `PATCH` with `{ action: 'cancel' }` to the teacher meeting action endpoint.
- The local meetings list is updated optimistically on cancellation (status flipped to `'cancelled'`).
- Cancelled meetings now display an **"Annulée"** badge.

#### Task Unassignment (`src/api/tasks.js`, `src/api/config.js`)
- New `unassignTask(id, target_cid)` API function sends `DELETE` to `/api/tasks/<id>/unassign/` with `{ target_cid }` in the request body.
- New endpoint added to `ENDPOINTS.tasks.unassign`.

#### Admin Assign Student to Group — Now Functional (`src/api/studentAssignment.js`)
- `assignStudentToGroup()` was previously a stub returning a "not available" error. It now **calls the real backend endpoint** (`POST /projects/admin/groups/<id>/assign-student/`) with `student_id`, `role`, and `is_leader`.

#### Available Supervisors (`src/api/users.js`, `src/pages/student/Groupe.jsx`)
- New `getAvailableSupervisors()` API function fetches from `GET /api/projects/available-supervisors/` and normalises the response (`_id`, `name` fields).
- `Groupe.jsx` now uses `getAvailableSupervisors` instead of `getTeachers` when loading the supervisor picker, ensuring only available, non-blocked teachers are shown.

#### Staff Notifications (`src/api/config.js`, `src/components/layout/Navbar.jsx`)
- Added `ENDPOINTS.notifications.staffList` (`/notifications/staff/`) and `ENDPOINTS.notifications.staffMarkRead(id)` to the API config.
- The Navbar notification bell now uses the **correct endpoint per role**: `notifications/` for students, `notifications/staff/` for teachers and admins.

---

### Changes & Improvements

#### Meetings Page — Fully Wired to Backend (`src/pages/student/Reunions.jsx`)
- Meeting creation was previously simulated via context. It now **POSTs to the real API** (`meetingsApi.createMeeting`) and shows a success toast on completion.
- Added **live polling**: meetings are re-fetched from the API every 30 seconds using `setInterval`, keeping the list in sync without a page reload.
- Added support for the `cancelled` meeting status: cancelled meetings are excluded from the "upcoming" list and appear in history with an "Annulée" label.
- Status map key corrected from `'accepted'` to `'approved'` to match the backend's actual values.
- Error messages from the API are surfaced in the form on creation failure.

#### Admin Student Assignment Modal (`src/components/ui/AssignStudentModal.jsx`)
- When all groups are full (6/6 members), the group selector is now **replaced with a warning banner** ("Tous les groupes sont complets") instead of showing an empty dropdown.
- The warning banner uses amber styling for clear visual feedback.

#### Admin Student/Group Data Mapping (`src/api/studentAssignment.js`)
- `getUnassignedStudents()` and `getAllGroups()` responses are now **remapped** to the shape the modal expects (`_id`, `name`, `specialite`, `email` for students; `_id`, `title`, `groupCode`, `members.length` for groups) so the modal renders correctly with real API data.

#### Auth Context — Role Flags (`src/context/AuthContext.jsx`)
- `isAdmin` and `isTeacher` boolean flags from the backend are now stored in the auth context user object on both initial login and token refresh/rehydration.

---

### Removed
- `admin_status.json`, `implementation_plan_final.md`, and the `dist/` build folder removed from the repository root.
