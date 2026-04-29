import client from './client';
import { ENDPOINTS } from './config';

export const meetingsApi = {
  // ── Student side ───────────────────────────────────────────────
  // GET /api/meetings/ → meetings for the student's current project (IsStudent)
  getGroupMeetings: async () => {
    const { data } = await client.get(ENDPOINTS.meetings.all);
    return data;
  },

  // POST /api/meetings/ → student requests a meeting (IsStudent)
  createMeeting: async (meeting) => {
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      title: meeting.title || meeting.Object || 'Nouvelle Réunion',
      location: meeting.location || meeting.desc || 'À définir',
      date: meeting.date || today,
      time: meeting.time || meeting.Hour || '10:00',
    };
    
    const { data } = await client.post(ENDPOINTS.meetings.create, payload);
    return data;
  },

  // PUT /api/meetings/<id>/ → student edits a meeting
  updateMeeting: async (id, patch) => {
    const { data } = await client.put(ENDPOINTS.meetings.update(id), patch);
    return data;
  },

  // DELETE /api/meetings/<id>/
  deleteMeeting: async (id) => {
    const { data } = await client.delete(ENDPOINTS.meetings.delete(id));
    return data;
  },

  // ── Teacher side ───────────────────────────────────────────────
  // GET /api/teacher/meetings/ → all meetings for supervised groups (IsStaff)
  getTeacherMeetings: async () => {
    const { data } = await client.get(ENDPOINTS.meetings.teacherAll);
    return data;
  },

  // POST /api/teacher/meetings/ → teacher schedules a meeting (auto-approved)
  createTeacherMeeting: async (meeting) => {
    const payload = {
      project_id: meeting.project_id || meeting.groupId || meeting.PID,
      title: meeting.title || meeting.Object,
      date: meeting.date,
      time: meeting.time || meeting.Hour,
      location: meeting.location || meeting.desc || 'À définir',
    };
    const { data } = await client.post(ENDPOINTS.meetings.teacherAll, payload);
    return data;
  },

  // PATCH /api/teacher/meetings/<id>/ → accept or reject a student meeting request
  acceptMeeting: async (id) => {
    const { data } = await client.patch(ENDPOINTS.meetings.teacherAction(id), { action: 'accept' });
    return data;
  },
  rejectMeeting: async (id) => {
    const { data } = await client.patch(ENDPOINTS.meetings.teacherAction(id), { action: 'reject' });
    return data;
  },
};
