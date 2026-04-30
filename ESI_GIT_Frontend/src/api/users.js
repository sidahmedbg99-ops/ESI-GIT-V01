import client from './client';
import { ENDPOINTS } from './config';

export const usersApi = {
  // GET /api/admin/users/
  // Backend returns: { page, limit, total_users, total_students, total_staff, filters, users: [...] }
  getAll: async () => {
    const { data } = await client.get(ENDPOINTS.admin.users);
    return data.users || [];
  },

  // GET /api/teachers/ — available to all authenticated users
  getTeachers: async () => {
    const { data } = await client.get(ENDPOINTS.auth.teachers);
    return data.map(t => ({
      ...t,
      _id:  t._id  ?? t.TID,   // UI uses t._id for selection
      name: t.name ?? t.full_name,       // UI renders t.name
    }));
  },

  // GET /api/admin/users/ with pagination params
  getAllPaginated: async (params = {}) => {
    const { data } = await client.get(ENDPOINTS.admin.users, { params });
    return data;
  },

  // POST /api/admin/students/create/ or /api/admin/staff/create/
  create: async (userData) => {
    const isStudent = userData.role === 'student';
    const endpoint = isStudent ? ENDPOINTS.admin.student.create : ENDPOINTS.admin.staff.create;

    const nameParts = (userData.name || '').trim().split(' ');
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || nameParts[0] || '';

    let payload;
    if (isStudent) {
      // Map year (L3, M1...) to numeric level
      const levelMap = { 'L1': 1, 'L2': 2, 'L3': 3, 'M1': 4, 'M2': 5 };
      payload = {
        CID: userData.cid || userData.id,
        email: userData.email,
        first_name,
        last_name,
        specialty: userData.specialite || userData.specialty || 'ISI',
        academic_year: userData.promo || userData.academic_year || '2024/2025',
        level: levelMap[userData.year] || 3,
        password: userData.password,
        is_active: true,
      };
    } else {
      payload = {
        TID: userData.tid || userData.id,
        email: userData.email,
        first_name,
        last_name,
        is_admin: userData.is_admin !== undefined ? userData.is_admin : (userData.role === 'admin'),
        is_teacher: userData.is_teacher !== undefined ? userData.is_teacher : (userData.role === 'teacher' || userData.role === 'staff'),
        department: userData.department,
        specialty: userData.specialty,
        password: userData.password,
        is_active: true,
      };
    }

    const { data } = await client.post(endpoint, payload);
    return data;
  },

  // PUT /api/admin/students/<id>/update/ or /api/admin/staff/<id>/update/
  update: async (id, patch) => {
    const isStudent = patch.role === 'student' || patch.type === 'student';
    const endpoint = isStudent ? ENDPOINTS.admin.student.update(id) : ENDPOINTS.admin.staff.update(id);
    
    let payload = { ...patch };
    if (isStudent) {
      const levelMap = { 'L1': 1, 'L2': 2, 'L3': 3, 'M1': 4, 'M2': 5 };
      if (patch.specialite) payload.specialty = patch.specialite;
      if (patch.promo)      payload.academic_year = patch.promo;
      if (patch.year)       payload.level = levelMap[patch.year] || 3;
    }
    
    const { data } = await client.put(endpoint, payload);
    return data;
  },

  // DELETE /api/admin/students/<id>/delete/ or /api/admin/staff/<id>/delete/
  delete: async (id, role) => {
    const endpoint = (role === 'student') ? ENDPOINTS.admin.student.delete(id) : ENDPOINTS.admin.staff.delete(id);
    const { data } = await client.delete(endpoint);
    return data;
  },

  // PATCH /api/admin/students|staff/block/<id>/
  block: async (id, role) => {
    const endpoint = (role === 'student') ? ENDPOINTS.admin.student.block(id) : ENDPOINTS.admin.staff.block(id);
    const { data } = await client.patch(endpoint);
    return data;
  },

  // PATCH /api/admin/students|staff/unblock/<id>/
  unblock: async (id, role) => {
    const endpoint = (role === 'student') ? ENDPOINTS.admin.student.unblock(id) : ENDPOINTS.admin.staff.unblock(id);
    const { data } = await client.patch(endpoint);
    return data;
  },

  // POST /api/admin/students|staff/reset-password/<id>/
  resetPassword: async (id, role) => {
    const endpoint = (role === 'student') ? ENDPOINTS.admin.student.resetPassword(id) : ENDPOINTS.admin.staff.resetPassword(id);
    const { data } = await client.post(endpoint);
    return data;
  },
};
