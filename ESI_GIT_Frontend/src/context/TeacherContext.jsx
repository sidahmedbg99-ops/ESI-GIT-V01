import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { groupApi } from '../api/groups';
import { tasksApi } from '../api/tasks';
import { meetingsApi } from '../api/meetings';
import { evaluationsApi } from '../api/evaluations';
import { archiveApi } from '../api/archive';
import { messagesApi } from '../api/messages';
import { useApi } from '../hooks/useApi';
import client from '../api/client';
import { ENDPOINTS } from '../api/config';
import { toast } from 'react-hot-toast';

const makeId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const nowLabel = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const TeacherContext = createContext(null);

export function TeacherProvider({ children }) {
  const { user } = useAuth();

  const [groups, setGroups] = useState(null);
  const [meetings, setMeetings] = useState(null);
  const [evaluations, setEvaluations] = useState(null);
  const [archive, setArchive] = useState(null);
  const [messages, setMessages] = useState({});
  const [activeContact, setActiveContact] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [supervisorRequests, setSupervisorRequests] = useState(null);

  const { request: loadGroups, loading: groupsLoading } = useApi(groupApi.getTeacherGroups);
  const { request: loadMeetings, loading: meetingsLoading } = useApi(meetingsApi.getTeacherMeetings);
  const { request: loadEvaluations, loading: evaluationsLoading } = useApi(evaluationsApi.getTeacherEvaluations);
  const { request: loadArchive, loading: archiveLoading } = useApi(archiveApi.getArchive);

  const isTeacher = user?.role === 'teacher' || user?.role === 'staff' || user?.is_teacher;

  const normalizeGroups = (res) => {
    const list = res?.groups ?? (Array.isArray(res) ? res : []);
    return list.map(g => ({
      ...g, _id: g.PID,
      members: (g.members || []).map(m => ({
        ...m, _id: m.CID,
        name: m.name || m.student_name,
        avatar: (m.name || m.student_name || 'S')[0]
      })),
    }));
  };

  const normalizeRequests = (res) => {
    return (res?.pending_requests ?? []).map(req => ({
      ...req,
      PID: req.project_pid,
      projectTitle: req.project_name,
      Message: req.message,
      groupCode: req.invite_code || `PRJ-${req.project_pid}`,
      Status: req.status
    }));
  };

  useEffect(() => {
    if (!user?._id || !isTeacher) return;

    loadGroups().then(res => {
      setGroups(normalizeGroups(res));
      setSupervisorRequests(normalizeRequests(res));
    }).catch(() => { setGroups([]); setSupervisorRequests([]); });

    loadMeetings().then(m => setMeetings(Array.isArray(m) ? m : [])).catch(() => setMeetings([]));
    loadEvaluations().then(e => setEvaluations(e)).catch(() => setEvaluations({ assignees: 0, defenses: [] }));
    loadArchive().then(a => setArchive(Array.isArray(a) ? a : [])).catch(() => setArchive([]));
  }, [user, isTeacher]);

  const pushActivity = useCallback((entry) => {
    setRecentActivity(prev => [{ _id: makeId(), timestamp: nowLabel(), ...entry }, ...prev].slice(0, 20));
  }, []);

  // ── Groups ─────────────────────────────────────────────────────────
  const addGroup = useCallback(async (groupData) => {
    try {
      const g = await groupApi.createGroup({ ...groupData, TID: user._id, teacherId: user._id });
      setGroups(p => [...(p ?? []), { ...g, _id: g.PID }]);
      pushActivity({ type: 'group_added', action: 'Groupe ajouté', desc: g.Name || g.title, color: '#F59E0B' });
      toast.success('Groupe créé'); return g;
    } catch (e) { console.error(e); toast.error('Erreur création groupe'); }
  }, [user, pushActivity]);

  const updateGroup = useCallback(async (groupId, patch) => {
    try {
      const u = await groupApi.updateGroup(groupId, patch);
      setGroups(p => p?.map(g => (g._id === groupId || g.PID === groupId) ? { ...u, _id: u.PID } : g) ?? p);
      return u;
    } catch (e) { console.error(e); }
  }, []);

  const archiveGroup = useCallback(async (groupId) => {
    try {
      const group = groups?.find(g => g._id === groupId || g.PID === groupId);
      if (!group) return;
      // Use the real archive endpoint: PATCH /api/projects/admin/projects/<id>/archive/
      await groupApi.archiveProject(groupId);
      setGroups(p => p?.filter(g => (g._id !== groupId && g.PID !== groupId)) ?? p);
      setArchive(a => [...(a ?? []), { ...group, archived: true }]);
      pushActivity({ type: 'group_archived', action: 'Groupe archivé', desc: group.Name || group.title || group.name, color: '#6B7280' });
      toast.success('Projet archivé');
    } catch (e) { console.error(e); toast.error("Erreur archivage"); }
  }, [groups, pushActivity]);

  const respondToSupervisorRequest = useCallback(async (reqId, status) => {
    try {
      // PATCH /api/teacher/supervisor-requests/<reqId>/
      await groupApi.respondToSupervisorRequest(reqId, status);
      const res = await groupApi.getTeacherGroups();
      setGroups(normalizeGroups(res));
      setSupervisorRequests(normalizeRequests(res));
      toast.success(status === 'approved' ? 'Requête acceptée !' : 'Requête refusée');
    } catch (e) { console.error(e); toast.error('Erreur réponse'); }
  }, []);

  // ── Tasks ──────────────────────────────────────────────────────────
  // POST /api/teacher/groups/<pid>/tasks/
  const assignTask = useCallback(async (groupId, taskData) => {
    try {
      const t = await tasksApi.assignTaskByTeacher(groupId, taskData);
      setAssignedTasks(p => [...p, t]);
      pushActivity({ type: 'task_assigned', action: 'Tâche assignée', desc: `${t.title || taskData.title} → ${groupId}`, color: 'var(--primary)' });
      toast.success('Tâche assignée au groupe'); return t;
    } catch (e) { console.error(e); toast.error("Erreur assignation tâche"); }
  }, [user, pushActivity]);

  // ── Meetings ───────────────────────────────────────────────────────
  // POST /api/teacher/meetings/ (teacher-initiated, auto-approved)
  const scheduleMeeting = useCallback(async (groupId, meetingData) => {
    try {
      const m = await meetingsApi.createTeacherMeeting({ ...meetingData, groupId, PID: groupId, teacherId: user._id, status: 'accepted' });
      setMeetings(p => [...(p ?? []), m]);
      pushActivity({ type: 'meeting_scheduled', action: 'Réunion planifiée', desc: m.title || meetingData.title, color: 'var(--accent)' });
      toast.success('Réunion programmée'); return m;
    } catch (e) { console.error(e); toast.error("Erreur planification"); }
  }, [user, pushActivity]);

  const addMeeting = useCallback(async (meetingData) => {
    try {
      const m = await meetingsApi.createTeacherMeeting({ ...meetingData, teacherId: user._id });
      setMeetings(p => [...(p ?? []), m]); return m;
    } catch (e) { console.error(e); }
  }, [user]);

  // PATCH /api/teacher/meetings/<id>/
  const acceptMeeting = useCallback(async (id) => {
    try {
      const u = await meetingsApi.acceptMeeting(id);
      setMeetings(p => p?.map(m => (m._id === id || m.id === id) ? { ...m, ...u, status: 'approved' } : m) ?? p);
      pushActivity({ type: 'meeting_accepted', action: 'Réunion acceptée', desc: id, color: '#10B981' });
      toast.success('Réunion acceptée');
    } catch (e) { console.error(e); toast.error("Erreur acceptation"); }
  }, [pushActivity]);

  const rejectMeeting = useCallback(async (id) => {
    try {
      const u = await meetingsApi.rejectMeeting(id);
      setMeetings(p => p?.map(m => (m._id === id || m.id === id) ? { ...m, ...u, status: 'rejected' } : m) ?? p);
      pushActivity({ type: 'meeting_rejected', action: 'Réunion refusée', desc: id, color: '#EF4444' });
      toast.success('Réunion refusée');
    } catch (e) { console.error(e); toast.error("Erreur refus"); }
  }, [pushActivity]);

  const cancelMeeting = useCallback(async (id, reason) => {
    try {
      const u = await meetingsApi.cancelMeeting(id, reason);
      setMeetings(p => p?.map(m => (m._id === id || m.id === id) ? { ...m, ...u, status: 'cancelled', cancellation_reason: reason } : m) ?? p);
      pushActivity({ type: 'meeting_cancelled', action: 'Réunion annulée', desc: id, color: '#6B7280' });
      toast.success('Réunion annulée');
    } catch (e) { console.error(e); toast.error("Erreur annulation"); }
  }, [pushActivity]);

  // ── Evaluations ────────────────────────────────────────────────────
  // POST /api/teacher/jury/<pid>/evaluate/
  const gradeEvaluation = useCallback(async (pid, data) => {
    try {
      // data is { presentation, document, demo, validate_cpi, comments }
      const u = await evaluationsApi.gradeEvaluation(pid, data);
      
      // Update local state: find the defense in evaluations and update it
      setEvaluations(p => {
        if (!p?.defenses) return p;
        return {
          ...p,
          defenses: p.defenses.map(d => (d.PID_id === pid || d.id === pid) ? { ...d, is_evaluated: true } : d),
          evaluees: (p.evaluees || 0) + 1,
          a_evaluer: Math.max(0, (p.a_evaluer || 0) - 1)
        };
      });

      pushActivity({ type: 'livrable_graded', action: 'Livrable noté', desc: pid, color: '#10B981' });
      toast.success('Note enregistrée !');
      return u;
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || e?.response?.data?.error || "Erreur notation";
      toast.error(msg);
    }
  }, [pushActivity]);

  const gradeArchivedProject = useCallback(async (archiveId, grade, feedback) => {
    try {
      const u = await archiveApi.updateArchiveEntry(archiveId, { grade, feedback });
      setArchive(p => p?.map(a => a._id === archiveId ? u : a) ?? p); return u;
    } catch (e) { console.error(e); }
  }, []);

  // ── Messages (mock-only) ───────────────────────────────────────────
  const loadThread = useCallback(async (contactId) => {
    if (!user?._id) return;
    try {
      const msgs = await messagesApi.getThread(user._id, contactId);
      const key = [user._id, contactId].sort().join('_');
      setMessages(p => ({ ...p, [key]: msgs })); return msgs;
    } catch (e) { console.error(e); return []; }
  }, [user]);

  const sendMessage = useCallback(async (contactId, text) => {
    if (!user?._id || !text?.trim()) return;
    try {
      const msg = await messagesApi.sendMessage({ from: user._id, to: contactId, text });
      const key = [user._id, contactId].sort().join('_');
      setMessages(p => ({ ...p, [key]: [...(p[key] ?? []), msg] })); return msg;
    } catch (e) { console.error(e); }
  }, [user]);

  const markThreadRead = useCallback(async (contactId) => {
    if (!user?._id) return;
    try {
      await messagesApi.markThreadRead(user._id, contactId);
      const key = [user._id, contactId].sort().join('_');
      setMessages(p => ({ ...p, [key]: (p[key] ?? []).map(m => ({ ...m, read: true })) }));
    } catch (e) { console.error(e); }
  }, [user]);

  // ── Analytics: real backend dashboard ─────────────────────────────
  const { request: fetchDashboard, data: backendAnalytics } = useApi(async () => {
    const { data } = await client.get(ENDPOINTS.teacher.dashboard);
    return {
      totalGroups: data.groups_encadres ?? 0, activeGroups: data.groups_actifs ?? 0,
      avgProgress: data.avancement_moyen ?? 0, completionRate: data.taux_completion ?? 0,
      pendingMeetings: data.reunions_en_attente ?? 0, pendingEvals: data.evaluations_en_attente ?? 0,
      totalTasks: data.task_stats?.total ?? 0, doneTasks: data.task_stats?.done ?? 0,
      tasksByPriority: { high: data.task_stats?.high_priority ?? 0, medium: data.task_stats?.medium_priority ?? 0, low: data.task_stats?.low_priority ?? 0 },
      ...data,
    };
  });

  useEffect(() => {
    if (user?._id && isTeacher) fetchDashboard();
  }, [user]);

  const stats = {
    groupsActive: groups?.filter(g => g.status === 'active').length ?? null,
    groupsTotal: groups?.length ?? null,
    meetingsPending: meetings?.filter(m => m.status === 'pending').length ?? null,
    evalsPending: evaluations?.a_evaluer ?? 0,
    archiveCount: archive?.length ?? null,
  };

  const value = {
    groups, meetings, evaluations, archive, messages, activeContact, recentActivity,
    assignedTasks, stats, analytics: backendAnalytics, supervisorRequests,
    groupsLoading, meetingsLoading, evaluationsLoading, archiveLoading,
    addGroup, updateGroup, archiveGroup, respondToSupervisorRequest,
    assignTask, scheduleMeeting,
    addMeeting, acceptMeeting, rejectMeeting, cancelMeeting,
    gradeEvaluation, gradeArchivedProject,
    loadThread, sendMessage, markThreadRead,
    setActiveContact, pushActivity,
    setGroups, setMeetings, setEvaluations, setArchive, setMessages, setRecentActivity,
  };

  return <TeacherContext.Provider value={value}>{children}</TeacherContext.Provider>;
}

export const useTeacher = () => {
  const ctx = useContext(TeacherContext);
  if (!ctx) throw new Error('useTeacher must be used inside <TeacherProvider>');
  return ctx;
};
