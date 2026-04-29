import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth }        from './AuthContext';
import { tasksApi }       from '../api/tasks';
import { groupApi }       from '../api/groups';
import { meetingsApi }    from '../api/meetings';
import { livrablesApi }   from '../api/livrables';
import { messagesApi }    from '../api/messages';
import { useApi }         from '../hooks/useApi';
import { toast } from 'react-hot-toast';


const makeId  = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const nowLabel = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1)
    .toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours()
    .toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const { user } = useAuth();

  const [group,          setGroup]          = useState(null);
  const [tasks,          setTasks]          = useState({ todo: [], inprogress: [], done: [] });
  const [meetings,       setMeetings]       = useState([]);
  const [livrables,      setLivrables]      = useState([]);
  const [messages,       setMessages]       = useState({});
  const [recentActivity, setRecentActivity] = useState([]);

  const { request: fetchAllGroups, loading: groupLoading      } = useApi(groupApi.getAll);
  const { request: loadTasks,      loading: tasksLoading      } = useApi(tasksApi.getGroupTasks);
  const { request: loadMeetings,   loading: meetingsLoading   } = useApi(meetingsApi.getGroupMeetings);
  const { request: loadLivrables,  loading: livrablesLoading  } = useApi(livrablesApi.getGroupLivrables);

  const normalizeGroup = useCallback((myGroup) => {
    if (!myGroup) return null;
    return {
      ...myGroup,
      _id: myGroup.PID,
      Name: myGroup.name,
      title: myGroup.name,
      InviteCode: myGroup.invite_code,
      joinCode: myGroup.invite_code,
      members: (myGroup.members || []).map(m => ({
        ...m,
        _id: m.student_id || m.CID || m.id || m.student_email,
        name: m.student_name,
        role: m.role,
        isChef: m.is_leader,
        IsLeader: m.is_leader,
        isMe: m.student_email === user?.email,
        avatar: m.student_name?.charAt(0) || '?',
      })),
      encadreur: myGroup.teacher_name || '—',
      supervisorApproved: myGroup.status === 'approved',
      github_url: myGroup.github_url,
      github: myGroup.github_url,
      submittedToSupervisor: myGroup.submitted_to_supervisor,
      submitted_to_supervisor: myGroup.submitted_to_supervisor,
      final_submission_approved: myGroup.final_submission_approved,
      supervisorFeedback: myGroup.supervisor_feedback,
      supervisor_feedback: myGroup.supervisor_feedback,
    };
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;
    
    groupApi.getStudentGroup().then(myGroup => {
      if (!myGroup) return;
      
      const normalizedGroup = normalizeGroup(myGroup);
      setGroup(normalizedGroup);

      loadTasks().then(fetchedTasks => {
        const arr = Array.isArray(fetchedTasks) ? fetchedTasks : [];
        const mapped = { todo: [], inprogress: [], done: [] };
        arr.forEach(t => {
          const state = (t.state || t.status)?.toLowerCase();
          const normalizedTask = {
            ...t,
            _id: t.id || t._id,
            title: t.title,
            desc: t.description,
            priority: (() => {
              const p = t.priority;
              if (typeof p === 'number') return p >= 3 ? 'high' : p === 2 ? 'medium' : 'low';
              return (typeof p === 'string' ? p : 'medium').toLowerCase();
            })(),
            deadline: t.deadline,
            assigneeIds: (t.assigned_to || []).map(a => a.CID),
            assignedByTeacher: t.created_by_supervisor ?? false,
            progress: state === 'done' ? 100 : state === 'inprogress' ? 50 : 0,
          };
          if (state === 'done') mapped.done.push(normalizedTask);
          else if (state === 'inprogress') mapped.inprogress.push(normalizedTask);
          else mapped.todo.push(normalizedTask);
        });
        setTasks(mapped);
      }).catch(console.error);

      loadMeetings().then(m => setMeetings(Array.isArray(m) ? m : [])).catch(console.error);
      loadLivrables(normalizedGroup._id).then(setLivrables).catch(console.error);
    }).catch(() => {
      setGroup(null);
    });
  }, [user, normalizeGroup, loadTasks, loadMeetings, loadLivrables]);

  const pushActivity = useCallback((entry) => {
    setRecentActivity(prev => [{ _id: makeId(), timestamp: nowLabel(), ...entry }, ...prev].slice(0, 20));
  }, []);

  const addTaskObject = useCallback(async (taskData, column = 'todo') => {
    if (!group) return;
    try {
      const PRIORITY_MAP = { low: 1, medium: 2, high: 3 };
      const newTask = await tasksApi.createTask({
        title:       taskData.title,
        description: taskData.desc || taskData.description || '',
        type:        taskData.type || 'task',
        priority:    PRIORITY_MAP[taskData.priority?.toLowerCase()] ?? 2,
        deadline:    taskData.deadline,
      });

      const assignees = taskData.assigneeIds || [];
      for (const cid of assignees) {
        try {
          await tasksApi.assign(newTask.id || newTask._id, cid);
        } catch(e) { console.error('Failed to assign', cid); }
      }

      const p = newTask.priority;
      const priorityStr = typeof p === 'number' ? (p >= 3 ? 'high' : p === 2 ? 'medium' : 'low') : (typeof p === 'string' ? p.toLowerCase() : 'medium');

      const normalized = {
        ...newTask,
        _id: newTask.id || newTask._id,
        desc: newTask.description || newTask.desc,
        assigneeIds: assignees,
        priority: priorityStr,
        progress: (newTask.state || column) === 'done' ? 100 : (newTask.state || column) === 'inprogress' ? 50 : 0,
        assignedByTeacher: newTask.created_by_supervisor ?? false,
      };
      setTasks(prev => ({ ...prev, [column]: [...(prev[column] || []), normalized] }));
      pushActivity({ type: 'task_created', action: 'Tâche créée', desc: newTask.title, color: 'var(--primary)' });
      toast.success('Tâche créée !');
    } catch (e) { 
      console.error(e); 
      toast.error('Erreur lors de la création');
    }
  }, [group, pushActivity]);

  const moveTask = useCallback(async (taskId, fromCol, toCol) => {
    if (fromCol === toCol) return;
    setTasks(prev => {
      const task = prev[fromCol]?.find(t => (t.id || t._id) === taskId);
      if (!task) return prev;
      const updated = { ...task, state: toCol };
      return {
        ...prev,
        [fromCol]: prev[fromCol].filter(t => (t.id || t._id) !== taskId),
        [toCol]:   [...prev[toCol], updated],
      };
    });
    try {
      await tasksApi.updateTaskState(taskId, toCol);
      toast.success(toCol === 'done' ? 'Tâche terminée !' : 'Tâche déplacée');
    } catch (e) { 
      console.error('Failed to sync task move', e); 
      toast.error('Erreur de synchronisation');
    }
    if (toCol === 'done') {
      pushActivity({ type: 'task_done', action: 'Tâche terminée', desc: taskId, color: '#10B981' });
    }
  }, [pushActivity]);

  const deleteTask = useCallback(async (taskId, column) => {
    try {
      await tasksApi.deleteTask(taskId);
      setTasks(prev => ({ ...prev, [column]: prev[column].filter(t => t._id !== taskId) }));
      pushActivity({ type: 'task_deleted', action: 'Tâche supprimée', desc: taskId, color: '#EF4444' });
      toast.success('Tâche supprimée');
    } catch (e) { 
      console.error(e); 
      toast.error('Erreur lors de la suppression');
    }
  }, [pushActivity]);

  const addMeeting = useCallback(async (meetingData) => {
    if (!group) return;
    try {
      const newMeeting = await meetingsApi.createMeeting({
        ...meetingData,
        groupId:   group._id,
        PID:       group.PID || group._id,
        teacherId: group.TID || group.teacherId,
        createdBy: user._id,
      });
      setMeetings(prev => [...prev, newMeeting]);
      pushActivity({ type: 'meeting_scheduled', action: 'Réunion planifiée', desc: newMeeting.Object || newMeeting.title, color: 'var(--accent)' });
      toast.success('Réunion envoyée à l\'encadreur');
      return newMeeting;
    } catch (e) { 
      console.error(e); 
      toast.error('Erreur lors de la planification');
    }
  }, [group, user, pushActivity]);

  const updateMeetingStatus = useCallback(async (meetingId, status) => {
    try {
      const updated = await meetingsApi.updateMeeting(meetingId, { status });
      setMeetings(prev => prev.map(m => m._id === meetingId ? updated : m));
    } catch (e) { console.error(e); }
  }, []);

  const addLivrable = useCallback(async (livrableData) => {
    if (!group) return;
    try {
      const newLivrable = await livrablesApi.submitLivrable({ ...livrableData, groupId: group._id });
      setLivrables(prev => [...prev, newLivrable]);
      pushActivity({ type: 'livrable_submitted', action: 'Livrable soumis', desc: newLivrable.title, color: '#8B5CF6' });
      toast.success('Document soumis avec succès');
      return newLivrable;
    } catch (e) { 
      console.error(e); 
      toast.error('Erreur lors de l\'upload');
    }
  }, [group, pushActivity]);

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

  const updateGroup = useCallback(async (groupData) => {
    try {
      if (!groupData) { setGroup(null); return; }
      if (!groupData._id) {
        const serverGroup = await groupApi.createGroup({
          Name:       groupData.Name ?? groupData.title ?? groupData.project ?? 'Projet PFE',
          TID:        groupData.TID ?? groupData.teacherId ?? null,
          studentIds: [user._id],
          members:    groupData.members ?? [],
          Specialty:  groupData.Specialty ?? groupData.specialite ?? null,
          academic_level: user.level || 3,
        });
        setGroup(normalizeGroup(serverGroup));
        pushActivity({ type: 'group_created', action: 'Groupe créé', desc: serverGroup.name || serverGroup.Name, color: '#F59E0B' });
      } else {
        setGroup(normalizeGroup(groupData));
        pushActivity({ type: 'group_joined', action: 'Groupe rejoint', desc: groupData.name || groupData.Name, color: '#F59E0B' });
      }
    } catch (e) { console.error('Could not complete group action', e); }
  }, [pushActivity, user, normalizeGroup]);

  const allTasks   = Object.values(tasks).flat();
  const stats = {
    tasksCompleted:  tasks.done.length,
    tasksTotal:      allTasks.length,
    globalProgress:  allTasks.length > 0 ? Math.round((tasks.done.length / allTasks.length) * 100) : 0,
    meetingsCount:   meetings.filter(m => m.status !== 'rejected').length,
    livrablesCount:  livrables.length,
    teacherTasksCount: allTasks.filter(t => t.assignedByTeacher).length,
  };

  const upcomingDeadlines = allTasks
    .filter(t => t.deadline && (t.progress ?? 0) < 100)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5)
    .map(t => ({
      _id: t._id, title: t.title, date: t.deadline,
      priority: t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'info',
      assignedByTeacher: t.assignedByTeacher ?? false,
    }));

  const value = {
    group, tasks, meetings, livrables, messages, recentActivity,
    stats, upcomingDeadlines,
    groupLoading, tasksLoading, meetingsLoading, livrablesLoading,
    addTaskObject, moveTask, deleteTask,
    addMeeting, updateMeetingStatus,
    addLivrable,
    loadThread, sendMessage, markThreadRead,
    updateGroup, pushActivity,
    setGroup, setTasks, setMeetings, setLivrables, setMessages, setRecentActivity,
  };

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export const useStudent = () => {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used inside <StudentProvider>');
  return ctx;
};
