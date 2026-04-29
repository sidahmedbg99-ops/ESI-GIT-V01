# Implementation Plan - Final Platform Integration

This is the final phase of the ESI-GIT platform integration. It focuses on replacing the remaining mock logic with real-time backend API calls for specialized modules.

## User Review Required

> [!IMPORTANT]
> **Data Model Consolidation**: I will align the frontend "Archive" logic to use the backend's `archived` boolean on the Project model. This simplifies the workflow and ensures data integrity.

> [!NOTE]
> **Role Mapping**: I will ensure that the `teacher` and `admin` roles are consistently handled across the Jury and Defense modules.

## Proposed Changes

### 1. Jury & Defense Management (Admin)
#### [MODIFY] [AdminContext.jsx](file:///c:/Users/RAM%20Tech/Desktop/ESI-Git/ESI_GIT_Frontend/src/context/AdminContext.jsx)
- Link `assignJury` to `POST /api/projects/admin/groups/{pk}/assign-jury/`.
- Link Defense scheduling (if used) to the backend `jury` app.

### 2. Project Archiving & Restoration
#### [MODIFY] [AdminContext.jsx](file:///c:/Users/RAM%20Tech/Desktop/ESI-Git/ESI_GIT_Frontend/src/context/AdminContext.jsx)
- Refactor `archiveGroup` to call `PATCH /api/projects/admin/projects/{id}/archive/`.
- Refactor `loadArchive` to fetch from `GET /api/projects/admin/projects/archived/`.
- Remove dependency on the mock `archiveApi.createArchiveEntry`.

### 3. Real-Time Tasks & Meetings (All Roles)
#### [MODIFY] [StudentContext.jsx](file:///c:/Users/RAM%20Tech/Desktop/ESI-Git/ESI_GIT_Frontend/src/context/StudentContext.jsx)
#### [MODIFY] [TeacherContext.jsx](file:///c:/Users/RAM%20Tech/Desktop/ESI-Git/ESI_GIT_Frontend/src/context/TeacherContext.jsx)
- Sync `addTaskObject`, `moveTask`, and `deleteTask` with the backend `tasks` app.
- Sync `addMeeting`, `acceptMeeting`, and `rejectMeeting` with the backend `meetings` app.
- Replace remaining mock analytics with the real backend stats objects.

### 4. Admin Users & System Settings
#### [MODIFY] [users.js](file:///c:/Users/RAM%20Tech/Desktop/ESI-Git/ESI_GIT_Frontend/src/api/users.js)
- Ensure all CRUD actions (Reset Password, Block, Delete) are hitting the Django `admin_panel` routes.

---

## Verification Plan

### Automated Tests
- Run `npm run dev`.
- **Admin**: Move a project to the archive and verify it appears in the Archive tab.
- **Teacher**: Assign a task to a supervised group and verify it appears in the student dashboard.
- **Student**: Change a task status to "Done" and verify the project progress bar updates in the Admin dashboard.

### Manual Verification
1.  **Jury Check**: Assign 3 teachers to a jury and verify the `ProjectJury` table in the DB.
2.  **Archive Check**: Verify that "Archived" projects are no longer visible in the "Active Groups" list.
3.  **Cross-Role Sync**: Log in as a Student, create a task, log in as Teacher, and verify the task is visible in the group evaluation panel.
