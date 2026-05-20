import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth }        from './AuthContext';
import { groupApi }       from '../api/groups';
import { usersApi }       from '../api/users';
import { meetingsApi }    from '../api/meetings';
import { archiveApi }     from '../api/archive';
import { messagesApi }    from '../api/messages';
import { useApi }         from '../hooks/useApi';
import client             from '../api/client';
import { ENDPOINTS }      from '../api/config';
import { toast } from 'react-hot-toast';


// ─── helpers ──────────────────────────────────────────────────────
const makeId  = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const nowLabel = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1)
    .toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours()
    .toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const { user } = useAuth();

  const [users,          setUsers]          = useState(null);
  const [groups,         setGroups]         = useState(null);
  const [meetings,       setMeetings]       = useState(null);
  const [archive,        setArchive]        = useState(null);
  const [messages,       setMessages]       = useState({});
  const [activeContact,  setActiveContact]  = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [platformSettings, setPlatformSettings] = useState({
    students_can_see_archived_projects: false,
    current_academic_year: '2024-2025',
    project_types: 'PFE,Stage,Projet',
    presentation_weight: 20,
    document_weight: 30,
    demo_weight: 50
  });

  const [stats,          setStats]          = useState(null);
  const [evaluationFormula, setEvaluationFormula] = useState({
    presentationWeight: 20,
    documentWeight: 30,
    demoWeight: 50
  });

  // ── API hooks ────────────────────────────────────────────────────
  const { request: loadUsers,    loading: usersLoading    } = useApi(usersApi.getAll);
  const { request: loadGroups,   loading: groupsLoading   } = useApi(groupApi.getAll);
  const { request: loadArchive,  loading: archiveLoading  } = useApi(groupApi.getArchived);

  // ── Bootstrap on login ───────────────────────────────────────────
  useEffect(() => {
    if (!user?._id || user.role !== 'admin') return;

    // GET /api/projects/admin/dashboard/
    // Returns: { Student, teachers, projects: { total, pending, approved, archived }, defense: {...} }
    client.get(ENDPOINTS.admin.dashboard).then(res => {
      const data = res.data;
      setStats({
        totalStudents:    data.Student        ?? 0,
        totalTeachers:    data.teachers       ?? 0,
        activeGroups:     data.projects?.approved  ?? 0,
        pendingGroups:    data.projects?.pending   ?? 0,
        archivedProjects: data.projects?.archived  ?? 0,
        totalProjects:    data.projects?.total     ?? 0,
        pendingMeetings:  data.defense?.scheduled  ?? 0,
        juriesAssigned:   data.defense?.juries_assigned ?? 0,
        gradedProjects:   data.defense?.graded     ?? 0,
        completionRate:   data.projects?.total > 0
          ? Math.round((data.projects.archived / data.projects.total) * 100)
          : 0,
      });
    }).catch(err => console.error('Stats load failed', err));

    // GET /api/admin/users/ → { page, limit, total_users, users: [...] }
    loadUsers(1000).then(res => {
      const raw = Array.isArray(res) ? res : [];
      setUsers(raw.map(u => {
        const levelMapInv = { 1: 'L1', 2: 'L2', 3: 'L3', 4: 'M1', 5: 'M2' };
        return {
          ...u,
          _id:    u.id || u.CID || u.TID,
          name:   u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim(),
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          role:   u.type === 'staff' ? (u.is_admin ? 'admin' : 'teacher') : (u.type || 'student'),
          avatar: (u.full_name || u.first_name || 'U')[0].toUpperCase(),
          status: u.is_blocked ? 'blocked' : (u.is_active ? 'active' : 'pending'),
          // Field normalization for the form
          specialite: u.specialty,
          promo:      u.academic_year,
          year:       levelMapInv[u.level] || 'L3',
          department: u.department,
          available:  u.available ?? true,
          type:       u.type,
        };
      }));
    }).catch(() => setUsers([]));

    // GET /api/projects/admin/groups/
    loadGroups().then(res => {
      const all = (Array.isArray(res) ? res : []).map(g => ({
        ...g,
        _id:      g.PID,
        title:    g.name,
        teacherId: g.TID,
        groupCode: g.invite_code,
        supervisorApproved: g.status === 'approved',
      }));
      setGroups(all.filter(g => !g.archived));
    }).catch(() => setGroups([]));

    // GET /api/projects/projects/archived/ (role-based)
    loadArchive().then(res => {
      const archived = (Array.isArray(res) ? res : []).map(p => ({
        ...p,
        _id:       p.PID || p.id,
        name:      p.name,
        group:     p.invite_code,
        year:      p.year || new Date().getFullYear().toString(),
        specialite: p.specialty,
        encadreur: p.teacher_name,
        members:   (p.members || []).map(m => typeof m === 'object' ? (m.name || m.student_name) : m),
        grade:     p.grade ?? p.grades?.final_grade ?? null,
        archived:  true,
      }));
      setArchive(archived);
    }).catch(() => setArchive([]));

    // GET /api/admin/platform-settings/
    client.get(ENDPOINTS.admin.platformSettings).then(res => {
      setPlatformSettings(res.data);
    }).catch(err => console.error('Settings load failed', err));

    // GET /api/admin/specialties/
    client.get(ENDPOINTS.admin.specialties).then(res => {
      setSpecialties(Array.isArray(res.data) ? res.data : []);
    }).catch(err => console.error('Specialties load failed', err));

    // GET /api/admin/departments/
    client.get(ENDPOINTS.admin.departments).then(res => {
      setDepartments(Array.isArray(res.data) ? res.data : []);
    }).catch(err => console.error('Departments load failed', err));

    setMeetings([]);
  }, [user]);

  const pushActivity = useCallback((entry) => {
    setRecentActivity(prev => [{ _id: makeId(), timestamp: nowLabel(), ...entry }, ...prev].slice(0, 20));
  }, []);

  // ── USERS ─────────────────────────────────────────────────────────
  const addUser = useCallback(async (userData) => {
    try {
      const res = await usersApi.create(userData);
      const normalized = {
        ...userData,
        ...res,
        _id:    res.id || res.student_id || res.staff_id || userData.id,
        name:   res.full_name || userData.name,
        role:   userData.role,
        avatar: (userData.name || 'U')[0].toUpperCase(),
        status: 'active',
      };
      setUsers(prev => [...(prev ?? []), normalized]);
      pushActivity({ type: 'user_created', action: 'Utilisateur ajouté', desc: normalized.name, color: 'var(--primary)' });
      toast.success(`Utilisateur créé ! Password: ${normalized.password}`);
      return normalized;
    } catch (e) {
      console.error(e);
      const data = e?.response?.data;
      let msg = 'Erreur lors de la création';
      if (data) {
        // Try to get the first error message from any field
        const firstErr = Object.values(data)[0];
        msg = Array.isArray(firstErr) ? firstErr[0] : (data.error || data.detail || msg);
      }
      toast.error(msg);
    }
  }, [pushActivity]);

  const updateUser = useCallback(async (userId, patch, passedRole) => {
    try {
      const u = users?.find(usr => usr.id === userId || usr._id === userId);
      const role = passedRole || patch.role || u?.type || u?.role;
      await usersApi.update(userId, { ...patch, role });
      
      setUsers(prev => prev?.map(usr => (usr._id === userId || usr.id === userId)
        ? { 
            ...usr, 
            ...patch, 
            name: patch.name || usr.name,
            is_blocked: patch.status === 'blocked' ? true : (patch.status === 'active' ? false : usr.is_blocked),
            is_active: patch.status === 'active' ? true : (patch.status === 'blocked' ? false : usr.is_active),
            status: (patch.status === 'blocked' || (patch.status === undefined && usr.is_blocked)) ? 'blocked' : 
                    ((patch.status === 'active' || (patch.status === undefined && usr.is_active)) ? 'active' : 'pending')
          }
        : usr) ?? prev);
      
      toast.success('Utilisateur mis à jour');
    } catch (e) { console.error(e); toast.error('Erreur lors de la mise à jour'); }
  }, [users]);

  const removeUser = useCallback(async (userId) => {
    try {
      const u = users?.find(u => u._id === userId || u.id === userId);
      if (!u) return;
      await usersApi.delete(userId, u.type || u.role);
      setUsers(prev => prev?.filter(usr => usr.id !== userId && usr._id !== userId) ?? prev);
      pushActivity({ type: 'user_removed', action: 'Utilisateur supprimé', desc: u.name, color: '#EF4444' });
      toast.success('Utilisateur supprimé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    }
  }, [users, pushActivity]);

  const blockUser = useCallback(async (userId) => {
    try {
      const u = users?.find(u => u._id === userId || u.id === userId);
      if (!u) return;
      await usersApi.block(userId, u.type || u.role);
      setUsers(prev => prev?.map(usr => (usr._id === userId || usr.id === userId)
        ? { ...usr, status: 'blocked', is_blocked: true }
        : usr) ?? prev);
      toast.success('Utilisateur bloqué');
    } catch (e) { console.error(e); toast.error('Erreur lors du blocage'); }
  }, [users]);

  const unblockUser = useCallback(async (userId) => {
    try {
      const u = users?.find(u => u._id === userId || u.id === userId);
      if (!u) return;
      await usersApi.unblock(userId, u.type || u.role);
      setUsers(prev => prev?.map(usr => (usr._id === userId || usr.id === userId)
        ? { ...usr, status: 'active', is_blocked: false }
        : usr) ?? prev);
      toast.success('Utilisateur débloqué');
    } catch (e) { console.error(e); toast.error('Erreur lors du déblocage'); }
  }, [users]);

  // ── GROUPS ────────────────────────────────────────────────────────
  const addGroup = useCallback(async (groupData) => {
    try {
      const newGroup = await groupApi.adminCreateGroup(groupData);
      const normalized = {
        ...newGroup,
        _id: newGroup.PID || newGroup.id,
        title: newGroup.name,
        teacherId: newGroup.TID,
        groupCode: newGroup.invite_code,
        supervisorApproved: newGroup.status === 'approved',
        Student_count: (groupData.studentIds || []).length,
      };
      setGroups(prev => [...(prev ?? []), normalized]);
      pushActivity({ type: 'group_created', action: 'Groupe créé', desc: normalized.title, color: '#F59E0B' });
      toast.success('Groupe créé avec succès !');
      return normalized;
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.response?.data?.detail || 'Erreur lors de la création';
      toast.error(msg);
    }
  }, [pushActivity]);

  const updateGroup = useCallback(async (groupId, patch) => {
    try {
      const updated = await groupApi.updateGroup(groupId, patch);
      // Sync with active groups
      setGroups(prev => prev?.map(g => (g._id === groupId || g.id === groupId) ? { ...g, ...updated, _id: updated.PID || updated.id } : g) ?? prev);
      // Sync with archive
      setArchive(prev => prev?.map(g => (g._id === groupId || g.id === groupId) ? { ...g, ...updated, _id: updated.PID || updated.id } : g) ?? prev);
      return updated;
    } catch (e) { console.error(e); }
  }, []);

  const archiveGroup = useCallback(async (groupId) => {
    try {
      await groupApi.archiveProject(groupId);
      const project = groups?.find(g => g._id === groupId);
      setGroups(prev => prev?.filter(g => g._id !== groupId));
      if (project) {
        setArchive(prev => [{ ...project, archived: true }, ...(prev ?? [])]);
      }
      pushActivity({ type: 'group_archived', action: 'Groupe archivé', desc: project?.name, color: '#6B7280' });
      toast.success('Groupe archivé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'archivage');
    }
  }, [groups, pushActivity]);

  const assignJury = useCallback(async (groupId, selection) => {
    try {
      // selection = [{teacherId, role}, ...] — 3 teachers, supervisor auto-added by backend
      const president = selection.find(x => x.role === 'president')?.teacherId
        || selection[0]?.teacherId;
      const members = selection.filter(x => x.teacherId !== president);
      const examiner1 = members[0]?.teacherId;
      const examiner2 = members[1]?.teacherId;

      if (!president || !examiner1 || !examiner2) {
        toast.error("Veuillez sélectionner exactement 3 membres de jury");
        return false;
      }

      await groupApi.assignJury(groupId, {
        teacher1_id: parseInt(president),
        teacher2_id: parseInt(examiner1),
        teacher3_id: parseInt(examiner2),
      });

      setGroups(prev => prev?.map(g => {
        if (g._id !== groupId) return g;
        const pres  = users?.find(u => u._id === president  || u.id === president);
        const ex1   = users?.find(u => u._id === examiner1  || u.id === examiner1);
        const ex2   = users?.find(u => u._id === examiner2  || u.id === examiner2);
        const sup   = users?.find(u => u._id === g.teacherId || u.id === g.teacherId);

        return {
          ...g,
          jury: {
            supervisor: sup?.name || sup?.full_name || '—',
            president: pres?.name || pres?.full_name || '—',
            examiner1: ex1?.name  || ex1?.full_name  || '—',
            examiner2: ex2?.name  || ex2?.full_name  || '—',
          }
        };
      }));

      pushActivity({ type: 'jury_assigned', action: 'Jury assigné', desc: groupId, color: '#8B5CF6' });
      toast.success('Jury assigné (4 membres)');
      return true;
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || 'Erreur lors de l\'assignation');
      return false;
    }
  }, [pushActivity, users]);

  const restoreGroup = useCallback(async (groupId) => {
    try {
      await groupApi.restoreProject(groupId);
      const project = archive?.find(g => g._id === groupId);
      setArchive(prev => prev?.filter(g => g._id !== groupId));
      if (project) {
        setGroups(prev => [{ ...project, archived: false }, ...(prev ?? [])]);
      }
      pushActivity({ type: 'group_restored', action: 'Groupe restauré', desc: groupId, color: '#10B981' });
      toast.success('Groupe restauré');
    } catch (e) { console.error(e); }
  }, [archive, pushActivity]);

  const deleteGroup = useCallback(async (groupId) => {
    try {
      await groupApi.deleteGroup(groupId);
      setGroups(prev => prev?.filter(g => g._id !== groupId) ?? prev);
      pushActivity({ type: 'group_deleted', action: 'Groupe supprimé', desc: groupId, color: '#EF4444' });
      toast.success('Groupe supprimé');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    }
  }, [pushActivity]);

  const deleteArchiveProject = useCallback(async (projectId) => {
    try {
      const proj = archive?.find(p => p._id === projectId);
      await archiveApi.deleteArchiveEntry(projectId);
      setArchive(prev => prev?.filter(p => p._id !== projectId));
      pushActivity({ type: 'archive_deleted', action: 'Projet supprimé (Archive)', desc: proj?.name || projectId, color: '#EF4444' });
      toast.success('Projet supprimé définitivement');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la suppression');
    }
  }, [archive, pushActivity]);

  const updatePlatformSettings = useCallback(async (patch) => {
    try {
      const res = await client.patch(ENDPOINTS.admin.platformSettings, patch);
      const updatedFields = res.data.data || res.data; // Handle nested or flat response
      setPlatformSettings(prev => ({ ...prev, ...updatedFields }));
      if (patch.current_academic_year) {
        // Refresh groups and archive if year changed as many projects might have been archived
        loadGroups().then(res => {
          const all = (Array.isArray(res) ? res : []).map(g => ({
            ...g,
            _id:      g.PID,
            title:    g.name,
            teacherId: g.TID,
            groupCode: g.invite_code,
            supervisorApproved: g.status === 'approved',
          }));
          setGroups(all.filter(g => !g.archived));
        });
        loadArchive().then(res => {
          const archived = (Array.isArray(res) ? res : []).map(p => ({
            ...p,
            _id:       p.PID || p.id,
            name:      p.name,
            group:     p.invite_code,
            year:      p.year || new Date().getFullYear().toString(),
            specialite: p.specialty,
            encadreur: p.teacher_name,
            members:   (p.members || []).map(m => m.student_name || m.name),
            grade:     p.grades?.final_grade || null,
            archived:  true,
          }));
          setArchive(archived);
        });
      }
      toast.success('Paramètres mis à jour');
      return res.data.data;
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la mise à jour des paramètres');
    }
  }, [loadGroups, loadArchive]);

  // ── MEETINGS ──────────────────────────────────────────────────────
  const addMeeting = useCallback(async (meetingData) => {
    try {
      const newMeeting = await meetingsApi.createMeeting(meetingData);
      setMeetings(prev => [...(prev ?? []), newMeeting]);
      pushActivity({ type: 'meeting_created', action: 'Réunion créée', desc: newMeeting.title, color: 'var(--accent)' });
      return newMeeting;
    } catch (e) { console.error(e); }
  }, [pushActivity]);

  const updateMeetingStatus = useCallback(async (meetingId, newStatus) => {
    try {
      const updated = await meetingsApi.updateMeeting(meetingId, { status: newStatus });
      setMeetings(prev => prev?.map(m => m._id === meetingId ? updated : m) ?? prev);
      return updated;
    } catch (e) { console.error(e); }
  }, []);

  // ── MESSAGES ──────────────────────────────────────────────────────
  const loadThread = useCallback(async (contactId) => {
    if (!user?._id) return;
    try {
      const msgs = await messagesApi.getThread(user._id, contactId);
      const key = [user._id, contactId].sort().join('_');
      setMessages(prev => ({ ...prev, [key]: msgs }));
      return msgs;
    } catch (e) { console.error(e); return []; }
  }, [user]);

  const sendMessage = useCallback(async (contactId, text) => {
    if (!user?._id || !text?.trim()) return;
    try {
      const msg = await messagesApi.sendMessage({ from: user._id, to: contactId, text });
      const key = [user._id, contactId].sort().join('_');
      setMessages(prev => ({ ...prev, [key]: [...(prev[key] ?? []), msg] }));
      return msg;
    } catch (e) { console.error(e); }
  }, [user]);

  const receiveMessage = useCallback(async (contactId, text) => {
    const msg = {
      _id: makeId(), from: contactId, to: user?._id, text,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      read: true, createdAt: new Date().toISOString(),
    };
    const key = [user?._id, contactId].sort().join('_');
    setMessages(prev => ({ ...prev, [key]: [...(prev[key] ?? []), msg] }));
    return msg;
  }, [user]);

  const markThreadRead = useCallback(async (contactId) => {
    if (!user?._id) return;
    try {
      await messagesApi.markThreadRead(user._id, contactId);
      const key = [user._id, contactId].sort().join('_');
      setMessages(prev => ({
        ...prev,
        [key]: (prev[key] ?? []).map(m => ({ ...m, read: true })),
      }));
    } catch (e) { console.error(e); }
  }, [user]);

  // ── Analytics (real backend dashboard) ───────────────────────────
  const { request: fetchAnalytics, data: analytics } = useApi(async () => {
    const { data } = await client.get(ENDPOINTS.admin.dashboard);
    return {
      totalStudents:    data.Student        ?? 0,
      totalTeachers:    data.teachers       ?? 0,
      activeGroups:     data.projects?.approved  ?? 0,
      pendingGroups:    data.projects?.pending   ?? 0,
      archivedProjects: data.projects?.archived  ?? 0,
      totalProjects:    data.projects?.total     ?? 0,
      pendingMeetings:  data.defense?.scheduled  ?? 0,
      juriesAssigned:   data.defense?.juries_assigned ?? 0,
      gradedProjects:   data.defense?.graded     ?? 0,
      completionRate:   data.projects?.total > 0
        ? Math.round((data.projects.archived / data.projects.total) * 100)
        : 0,
    };
  });

  const { request: fetchAdvancedAnalytics, data: advAnalytics } = useApi(async () => {
    const { data } = await client.get(ENDPOINTS.admin.advancedAnalytics);
    return data;
  });

  const toggleProjectVisibility = useCallback(async (id, isPublic) => {
    try {
      await archiveApi.updateArchiveEntry(id, { is_public: isPublic });
      setArchive(p => p?.map(g => (g._id === id || g.PID === id) ? { ...g, is_public: isPublic } : g) ?? p);
      toast.success(isPublic ? 'Projet rendu public' : 'Projet rendu privé');
    } catch (e) { toast.error("Erreur de visibilité"); }
  }, []);

  useEffect(() => {
    if (user?._id && user.role === 'admin') {
      fetchAnalytics();
      fetchAdvancedAnalytics().then(data => setAdvancedAnalytics(data));
    }
  }, [user]);

  // ── Derived stats ─────────────────────────────────────────────────
  const currentStats = stats || {
    usersTotal:      users?.length                                        ?? 0,
    studentsCount:   users?.filter(u => u.type === 'student' || u.role === 'student').length ?? 0,
    teachersCount:   users?.filter(u => u.type === 'staff' || u.role === 'teacher').length   ?? 0,
    groupsActive:    groups?.filter(g => !g.archived).length             ?? 0,
    groupsTotal:     groups?.length                                       ?? 0,
    meetingsPending: meetings?.filter(m => m.status === 'pending').length ?? 0,
    archiveCount:    archive?.length                                      ?? 0,
  };

  const value = {
    users, groups, meetings, archive, messages, activeContact, recentActivity,
    platformSettings, advancedAnalytics, specialties, departments,
    stats: currentStats, analytics,
    usersLoading, groupsLoading, archiveLoading,
    addUser, updateUser, removeUser, blockUser, unblockUser,
    addGroup, updateGroup, archiveGroup, restoreGroup, deleteGroup, deleteArchiveProject, toggleProjectVisibility,
    updatePlatformSettings, fetchAdvancedAnalytics,
    assignJury,
    addMeeting, updateMeetingStatus,
    loadThread, sendMessage, receiveMessage, markThreadRead,
    setActiveContact, pushActivity,
    setUsers, setGroups, setMeetings, setArchive, setMessages, setRecentActivity,
    evaluationFormula, setEvaluationFormula,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
};
