// ╔══════════════════════════════════════════════════════════════════╗
// ║              API CONFIGURATION                                    ║
// ║  All endpoints map 1-to-1 with Django urls.py                     ║
// ║  Backend is the source of truth.                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── Backend base URL from .env ──────────────────────────────────────
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ── File URL helper ──────────────────────────────────────────────────
// Resolves relative /media/ paths to absolute backend URLs
export const getFileUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  const server = BASE_URL.replace('/api', '');
  return `${server}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ── All endpoints ───────────────────────────────────────────────────
export const ENDPOINTS = {
  // ── Auth (users app, mounted at /api/) ────────────────────────────
  auth: {
    login: 'login/',                                  // POST  { email, password }
    me: 'me/',                                        // GET   → user info
    changePassword: 'change-password/',               // POST  { old_password, new_password }
    teachers: 'projects/available-supervisors/',       // GET   → list of teachers
  },

  // ── Groups / Projects ─────────────────────────────────────────────
  groups: {
    // Admin
    all: 'projects/admin/groups/',                                 // GET
    byId: (id) => `projects/admin/groups/${id}/`,                 // GET
    adminProject: (id) => `projects/admin/projects/${id}/`,       // GET/PUT/DELETE
    assignJury: (id) => `jury/admin/jury/assign/${id}/`,          // POST
    editJury:   (id) => `jury/admin/jury/edit/${id}/`,            // PATCH
    schedule: 'jury/admin/schedule/create/',                      // POST
    archive: (id) => `projects/admin/projects/${id}/archive/`,    // PATCH
    archiveAll: 'projects/admin/projects/archive-all/',            // POST
    restore: (id) => `projects/admin/projects/${id}/restore/`,    // PATCH
    archived: 'projects/projects/archived/',                      // GET (role-based)
    delete: (id) => `projects/admin/projects/${id}/`,             // DELETE
    studentsWithoutGroup: 'projects/admin/students-without-group/', // GET
    attachments: (pid) => `projects/attachments/${pid}/`,          // GET (admin/jury)
    addMember:        (id) => `projects/admin/groups/${id}/assign-student/`,  // POST
    removeMember:     (id) => `projects/admin/groups/${id}/remove-student/`,  // DELETE
    changeSupervisor: (id) => `projects/admin/groups/${id}/change-supervisor/`, // PATCH
    
    // Student
    dashboard: 'projects/student-dashboard/',      // GET → aggregated student stats
    myProject: 'projects/my-project/',             // GET
    create: 'projects/create/',                    // POST
    join: 'projects/join/',                        // POST { invite_code, role }
    leave: 'projects/leave/',                      // POST
    confirm: 'projects/confirm/',                  // POST (leader, ≥3 members → locks group)
    leader: 'projects/leader/',                    // PATCH { action, target_cid }
    supervisorRequest: 'projects/supervisor-request/', // GET/POST
    availableSupervisors: 'projects/available-supervisors/', // GET → filtered: available=True, not blocked
    studentGroupStatus: 'projects/students/status/', // GET
    publicSettings: 'projects/public-settings/',     // GET

    // Teacher
    byTeacher: () => `teacher/groups/`,            // GET
  },

  // ── Tasks ─────────────────────────────────────────────────────────
  tasks: {
    all: 'tasks/',                                 // GET / POST
    byId: (id) => `tasks/${id}/`,                  // DELETE
    updateState: (id) => `tasks/${id}/state/`,     // PATCH { state }
    assign: (id) => `tasks/${id}/assign/`,         // POST { target_cid }
    unassign: (id) => `tasks/${id}/unassign/`,     // DELETE { target_cid }
    teacherAssign: (pid) => `teacher/groups/${pid}/tasks/`, // POST (teacher)
  },

  // ── Meetings ──────────────────────────────────────────────────────
  meetings: {
    // Student
    all: 'meetings/',                              // GET / POST
    byId: (id) => `meetings/${id}/`,               // GET/PUT/DELETE
    create: 'meetings/',                           // POST
    update: (id) => `meetings/${id}/`,             // PUT
    delete: (id) => `meetings/${id}/`,             // DELETE
    attendance: (id) => `meetings/${id}/attendance/`, // GET (student read-only)
    // Teacher
    teacherAll: 'teacher/meetings/',               // GET/POST
    teacherAction: (id) => `teacher/meetings/${id}/`, // PATCH
    teacherAttendance: (id) => `teacher/meetings/${id}/attendance/`, // GET/PUT
  },

  // ── Notifications ─────────────────────────────────────────────────
  notifications: {
    list: 'notifications/',                              // GET (student, IsStudent)
    unreadCount: 'notifications/unread-count/',          // GET → { unread: int }
    markRead: (id) => `notifications/${id}/read/`,       // PATCH
    staffList: 'notifications/staff/',                   // GET (teacher/admin, IsStaff)
    staffUnreadCount: 'notifications/staff/unread-count/', // GET → { unread: int }
    staffMarkRead: (id) => `notifications/staff/${id}/read/`, // PATCH
    adminSend: 'notifications/admin/send/',              // POST (admin)
    adminList: 'notifications/admin/list/',              // GET (admin)
    adminDelete: (id) => `notifications/admin/${id}/delete/`, // DELETE (admin)
  },

  // ── Teacher ───────────────────────────────────────────────────────
  teacher: {
    dashboard: 'teacher/dashboard/',               // GET
    profile: 'teacher/profile/',                   // GET/PATCH
    groups: 'teacher/groups/',                     // GET → { groups, pending_requests }
    groupDetail: (pid) => `teacher/groups/${pid}/`, // GET/PATCH
    supervisorAction: (reqId) => `teacher/supervisor-requests/${reqId}/`, // PATCH
    assignTask: (pid) => `teacher/groups/${pid}/tasks/`, // POST
    meetings: 'teacher/meetings/',                 // GET/POST
    meetingAction: (id) => `teacher/meetings/${id}/`, // PATCH
    jury: 'teacher/jury/',                         // GET
    evaluateJury: (pid) => `teacher/jury/${pid}/evaluate/`, // POST
    juryAttachments: (pid) => `projects/attachments/${pid}/`,      // GET (jury member)
  },

  // ── Evaluations (teacher jury scoring) ────────────────────────────
  evaluations: {
    teacherJury: 'teacher/jury/',                  // GET
    teacherEvaluate: (pid) => `teacher/jury/${pid}/evaluate/`, // POST
  },

  // ── Admin Panel ───────────────────────────────────────────────────
  admin: {
    dashboard: 'projects/admin/dashboard/',        // GET → { Student, teachers, projects, defense }
    analytics: 'projects/admin/analytics/',        // GET
    users: 'admin/users/',                         // GET → paginated user list
    panelStats: 'admin/dashboard/',                // GET → { students, staff, roles }

    student: {
      create: 'admin/students/create/',
      detail: (id) => `admin/students/${id}/`,
      update: (id) => `admin/students/${id}/update/`,
      delete: (id) => `admin/students/${id}/delete/`,
      block: (id) => `admin/students/block/${id}/`,
      unblock: (id) => `admin/students/unblock/${id}/`,
      resetPassword: (id) => `admin/students/reset-password/${id}/`,
      upload: 'admin/students/upload/',
    },
    staff: {
      create: 'admin/staff/create/',
      detail: (id) => `admin/staff/${id}/`,
      update: (id) => `admin/staff/${id}/update/`,
      delete: (id) => `admin/staff/${id}/delete/`,
      block: (id) => `admin/staff/block/${id}/`,
      unblock: (id) => `admin/staff/unblock/${id}/`,
      resetPassword: (id) => `admin/staff/reset-password/${id}/`,
      upload: 'admin/staff/upload/',
    },
    academicStructure: 'admin/academic-structure/',
    specialties: 'admin/specialties/',
    specialtyDetail: (id) => `admin/specialties/${id}/`,
    departments: 'admin/departments/',
    gradeFormula: 'admin/grade-formula/',
    gradeFormulaActive: 'admin/grade-formula/active/',
    gradeFormulaActivate: (id) => `admin/grade-formula/${id}/activate/`,
    platformSettings: 'admin/platform-settings/',
    advancedAnalytics: 'admin/analytics/advanced/',
    studentsWithoutGroup: 'projects/admin/students-without-group/',
    archivedVisibility: 'projects/admin/archived-projects-visibility/',
    advanceYear: 'admin/advance-year/',
  },

  // ── Resources ─────────────────────────────────────────────────
  resources: {
    list: 'resources/',                      // GET ?type=file|link&role=staff|student
    create: 'resources/',                    // POST (multipart or json)
    detail: (id) => `resources/${id}/`,      // PATCH (admin) | DELETE (owner or admin)
  },

  // ── Archive ───────────────────────────────────────────────────────
  archive: {
    all: 'projects/projects/archived/',                     // GET (role-based)
    byId: (id) => `projects/admin/projects/${id}/`,         // GET (admin)
    update: (id) => `projects/admin/projects/${id}/`,       // PUT (admin)
    archive: (id) => `projects/admin/projects/${id}/archive/`, // PATCH
    restore: (id) => `projects/admin/projects/${id}/restore/`, // PATCH
  },
};
