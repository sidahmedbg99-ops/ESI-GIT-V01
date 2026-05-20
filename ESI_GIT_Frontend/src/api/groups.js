import client from './client';
import { ENDPOINTS } from './config';

export const groupApi = {
  // ── Admin side ─────────────────────────────────────────────────
  getAll:           async ()          => { const { data } = await client.get(ENDPOINTS.groups.all);                   return data; },
  getById:          async (id)        => { const { data } = await client.get(ENDPOINTS.groups.byId(id));              return data; },
  deleteGroup:      async (id)        => { const { data } = await client.delete(ENDPOINTS.groups.delete(id));         return data; },
  assignJury:       async (id, body)  => { const { data } = await client.post(ENDPOINTS.groups.assignJury(id), body); return data; },
  archiveProject:   async (id)        => { const { data } = await client.patch(ENDPOINTS.groups.archive(id));         return data; },
  restoreProject:   async (id)        => { const { data } = await client.patch(ENDPOINTS.groups.restore(id));         return data; },
  getArchived:      async ()          => { const { data } = await client.get(ENDPOINTS.groups.archived);              return data; },

  // ── Admin: create a group directly (bypasses student flow) ────
  adminCreateGroup: async (groupData) => {
    // POST /api/projects/admin/projects/
    const payload = {
      name:        groupData.name || groupData.title || groupData.Name,
      teacher_id:  groupData.teacher_id,
      student_ids: groupData.student_ids,
      leader_id:   groupData.leader_id,
      type:        groupData.type || 'PFE',
      specialty:   groupData.specialty || 'Informatique',
      year:        groupData.year || new Date().getFullYear().toString(),
      status:      groupData.status || 'approved',
    };
    const { data } = await client.post('/projects/admin/projects/', payload);
    return data;
  },

  // ── Student side ───────────────────────────────────────────────
  getStudentGroup:  async ()          => { const { data } = await client.get(ENDPOINTS.groups.myProject);             return data; },
  getPublicSettings: async ()          => { const { data } = await client.get(ENDPOINTS.groups.publicSettings);         return data; },
  
  createGroup:      async (groupData) => { 
    const { data: project } = await client.post(ENDPOINTS.groups.create, groupData);
    // If a teacher was selected during creation, send the supervisor request automatically
    if (groupData.teacherId) {
      try {
        await client.post(ENDPOINTS.groups.supervisorRequest, { 
          teacher_id: groupData.teacherId, 
          message: groupData.requestMessage || '' 
        });
      } catch (e) {
        console.error("Failed to send initial supervisor request:", e);
        toast.error("Erreur lors de l'envoi de la demande à l'encadreur");
      }
    }
    return project; 
  },

  joinProject:      async (code, role) => { const { data } = await client.post(ENDPOINTS.groups.join, { invite_code: code, role: role }); return data; },
  leaveProject:     async ()          => { const { data } = await client.post(ENDPOINTS.groups.leave);              return data; },
  leaderAction:     async (patch)     => { const { data } = await client.patch(ENDPOINTS.groups.leader, patch);     return data; },
  
  // Supervisor Requests (Student side)
  getSupervisorRequests: async ()      => { const { data } = await client.get(ENDPOINTS.groups.supervisorRequest);  return data; },
  sendSupervisorRequest: async (TID, msg) => { const { data } = await client.post(ENDPOINTS.groups.supervisorRequest, { teacher_id: parseInt(TID), message: msg }); return data; },

  // Project Attachments
  uploadAttachment: async (formData) => { const { data } = await client.post('/projects/attachments/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data; },
  getAttachments:    async ()         => { const { data } = await client.get('/projects/attachments/'); return data; },
  deleteAttachment:  async (id)         => { const { data } = await client.delete('/projects/attachments/', { data: { attachment_id: id } }); return data; },
  getStudentsStatus: async ()         => { const { data } = await client.get(ENDPOINTS.groups.studentGroupStatus); return data; },

  // ── Teacher side ───────────────────────────────────────────────
  getTeacherGroups: async ()          => { const { data } = await client.get(ENDPOINTS.teacher.groups);              return data; },
  respondToSupervisorRequest: async (reqId, status) => { 
    const action = status === 'approved' ? 'accept' : (status === 'rejected' ? 'reject' : status);
    const { data } = await client.patch(ENDPOINTS.teacher.supervisorAction(reqId), { action }); 
    return data; 
  },

  updateGroup: async (pid, patch) => {
    const { data } = await client.patch(ENDPOINTS.teacher.groupDetail(pid), patch);
    return data;
  },
};
