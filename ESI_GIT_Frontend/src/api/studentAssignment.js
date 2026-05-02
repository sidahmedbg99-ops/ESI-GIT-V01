// ╔══════════════════════════════════════════════════════════════════╗
// ║  STUDENT ASSIGNMENT (Admin → Assign student to group)            ║
// ║  getUnassignedStudents & getAllGroups → connected to real API     ║
// ║  assignStudentToGroup → ⚠️ NO BACKEND ENDPOINT (stub only)       ║
// ╚══════════════════════════════════════════════════════════════════╝

import client from './client';
import { ENDPOINTS } from './config';

/**
 * Get all students who are NOT assigned to any group.
 * REAL: GET /api/projects/admin/students-without-group/
 */
export async function getUnassignedStudents() {
  try {
    const { data } = await client.get(ENDPOINTS.groups.studentsWithoutGroup);
    // remap to what the modal expects
    const mapped = (Array.isArray(data) ? data : []).map(s => ({
      _id: s.CID,
      name: `${s.first_name} ${s.last_name}`,
      specialite: s.specialty,
      email: s.email,
    }));
    return { success: true, data: mapped };
  } catch (err) {
    return { success: false, data: [] };
  }
}

/**
 * Get all groups (for assignment modal dropdown).
 * REAL: GET /api/projects/admin/groups/
 */
export async function getAllGroups() {
  try {
    const { data } = await client.get(ENDPOINTS.groups.all);
    // remap to what the modal expects
    const mapped = (Array.isArray(data) ? data : []).map(g => ({
      _id: g.PID,
      title: g.name,
      groupCode: g.invite_code,
      members: { length: g.Student_count || 0 },
    }));
    return { success: true, data: mapped };
  } catch (err) {
    return { success: false, data: [] };
  }
}


export async function assignStudentToGroup(studentId, groupId, roleInfo = {}) {
  try {
    const { data } = await client.post(
      `/projects/admin/groups/${groupId}/assign-student/`,
      {
        student_id: studentId,
        role: roleInfo.role || 'member',
        is_leader: roleInfo.isChef || false,
      }
    );
    return { success: true, data };
  } catch (err) {
    return { success: false, message: err?.response?.data?.error || 'Assignment failed' };
  }
}

/**
 * Remove a student from a group.
 * ⚠️  NO BACKEND ENDPOINT — stub only.
 */
export async function removeStudentFromGroup(studentId, groupId) {
  console.warn('[removeStudentFromGroup] No backend endpoint — this action is not supported yet.');
  return { success: false, message: 'Cette fonctionnalité n\'est pas encore disponible côté serveur.' };
}
