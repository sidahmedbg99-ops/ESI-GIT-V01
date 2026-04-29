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
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (err) {
    console.error('[getUnassignedStudents]', err);
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
    return { success: true, data: Array.isArray(data) ? data : [] };
  } catch (err) {
    console.error('[getAllGroups]', err);
    return { success: false, data: [] };
  }
}

/**
 * Assign a student to a group.
 * ⚠️  NO BACKEND ENDPOINT — this is a stub.
 * The Django backend has no admin endpoint for manually assigning a student to a group.
 * Students join via invite code. This function is kept to avoid breaking the UI.
 */
export async function assignStudentToGroup(studentId, groupId, roleInfo = {}) {
  console.warn('[assignStudentToGroup] No backend endpoint — this action is not supported yet.');
  return { success: false, message: 'Cette fonctionnalité n\'est pas encore disponible côté serveur.' };
}

/**
 * Remove a student from a group.
 * ⚠️  NO BACKEND ENDPOINT — stub only.
 */
export async function removeStudentFromGroup(studentId, groupId) {
  console.warn('[removeStudentFromGroup] No backend endpoint — this action is not supported yet.');
  return { success: false, message: 'Cette fonctionnalité n\'est pas encore disponible côté serveur.' };
}
