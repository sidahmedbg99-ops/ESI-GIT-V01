import client from './client';
import { ENDPOINTS } from './config';

export const tasksApi = {
  // ── Student side ───────────────────────────────────────────────
  // GET /api/tasks/ → all tasks for the student's current project (IsStudent)
  getGroupTasks: async () => {
    const { data } = await client.get(ENDPOINTS.tasks.all);
    return data;
  },

  // GET /api/tasks/<id>/
  getById: async (id) => {
    const { data } = await client.get(ENDPOINTS.tasks.byId(id));
    return data;
  },

  // POST /api/tasks/ → create task (leader only, IsStudent)
  // Backend expects: { title, description, type, priority, deadline }
  createTask: async (taskData) => {
    // Default deadline to 7 days from now if not provided
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const defaultDeadline = nextWeek.toISOString().split('T')[0];

    const payload = {
      title:       taskData.title || taskData.Name || 'Nouvelle Tâche',
      description: taskData.description || taskData.Description || taskData.desc || '',
      type:        taskData.type || 'task',
      priority:    taskData.priority || taskData.Priority || 2,
      deadline:    taskData.deadline || taskData.Deadline || defaultDeadline,
    };

    const { data } = await client.post(ENDPOINTS.tasks.all, payload);
    return data;
  },

  // PATCH /api/tasks/<id>/state/ → update state (any member, IsStudent)
  // Backend expects: { state: 'todo'|'inprogress'|'done' }
  updateTaskState: async (id, state) => {
    const backendState = state === 'inprogress' ? 'in_progress' : state;
    const { data } = await client.patch(ENDPOINTS.tasks.updateState(id), { state: backendState });
    return data;
  },

  // POST /api/tasks/<id>/assign/ → assign task to a team member (leader only)
  // Backend expects: { target_cid: <int> }
  assignTask: async (id, target_cid) => {
    const { data } = await client.post(ENDPOINTS.tasks.assign(id), { target_cid });
    return data;
  },

  // DELETE /api/tasks/<id>/ → delete task (leader only)
  deleteTask: async (id) => {
    const { data } = await client.delete(ENDPOINTS.tasks.byId(id));
    return data;
  },

  // ── Teacher side ───────────────────────────────────────────────
  // POST /api/teacher/groups/<pid>/tasks/ → teacher assigns a task to a group
  assignTaskByTeacher: async (pid, taskData) => {
    // Map string priority to integer for backend
    const priorityMap = { high: 3, medium: 2, low: 1 };
    const priorityValue = typeof taskData.priority === 'string' 
      ? (priorityMap[taskData.priority.toLowerCase()] || 2) 
      : (taskData.priority || 2);

    const payload = {
      title:       taskData.title || taskData.Name,
      description: taskData.description || taskData.Description || taskData.desc || '',
      type:        taskData.type || 'task',
      priority:    priorityValue,
      deadline:    taskData.deadline || taskData.Deadline,
    };
    const { data } = await client.post(ENDPOINTS.tasks.teacherAssign(pid), payload);
    return data;
  },
};
