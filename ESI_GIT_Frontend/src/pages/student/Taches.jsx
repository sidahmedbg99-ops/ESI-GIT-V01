import { useState } from 'react';
import { IoAddOutline, IoTimeOutline, IoPersonOutline, IoCheckmarkOutline, IoAlertCircleOutline } from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { useStudent } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { tasksApi } from '../../api/tasks';
import { PRIORITY_COLORS } from '../../constants';

const EMPTY_FORM = { title: '', desc: '', priority: 'medium', deadline: '', tag: '', assignees: [] };

/* ── Compact task card with per-member reassign ─────────────── */
function TaskCard({ task, colId, group, onMove, onDelete, onReassign }) {
  const members = group?.members ?? [];
  const [showMembers, setShowMembers] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const myId = String(user?._id || user?.id || user?.CID);
  const isMe = task.assigneeIds?.map(String).includes(myId);
  const isChef = members.find(m => String(m._id) === myId)?.isChef;

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '14px', marginBottom: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {task.priority && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: PRIORITY_COLORS[task.priority]?.bg, color: PRIORITY_COLORS[task.priority]?.color }}>
              {t(task.priority.charAt(0).toUpperCase() + task.priority.slice(1))}
            </span>
          )}
          {task.assignedByTeacher && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#EEF2FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              👨‍🏫 {t('Teachers')}
            </span>
          )}
        </div>
        {task.tag && (
          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
            {task.tag}
          </span>
        )}
      </div>

      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: task.desc ? '6px' : '10px', lineHeight: 1.4 }}>{task.title}</h4>
      {task.desc && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>{task.desc}</p>}

      {/* Progress bar */}
      {task.progress > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{t('OverallProgress')}</span>
            <span style={{ fontWeight: 600 }}>{task.progress}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${task.progress}%`, height: '100%', borderRadius: 3, background: 'var(--primary)' }} />
          </div>
        </div>
      )}

      {/* Deadline + assignee avatars */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {task.deadline && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <IoTimeOutline size={12} /> {task.deadline}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(task.assigneeIds ?? []).map((id, i) => {
            const m = members.find(mb => mb._id === id || mb.name === id);
            const lbl = (m?.name || id?.toString() || '?').charAt(0).toUpperCase();
            return (
              <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: `hsl(${i * 90 + 200},65%,55%)`, border: '2px solid var(--bg-card)', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', title: m?.name ?? id }}>
                {lbl}
              </div>
            );
          })}
          {task.assigneeIds?.length > 0 && (
            <button onClick={() => setShowMembers(v => !v)} style={{ marginLeft: 6, fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              {showMembers ? t('Hide') : t('Actions')}
            </button>
          )}
        </div>
      </div>

      {/* Per-member panel: shows assigned person + reassign button */}
      {showMembers && task.assigneeIds?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {task.assigneeIds.map(id => {
            const m = members.find(mb => mb._id === id || mb.name === id);
            const name = m?.name ?? id;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IoPersonOutline size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{name}</span>
                </div>
                {isChef && (
                  <button
                    onClick={() => onReassign && onReassign(task)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'rgba(79,70,229,0.12)', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    title="Changer de responsable"
                  >
                    <IoPersonOutline size={11} /> Changer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick column move buttons */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px', borderTop: 'none', paddingTop: '0' }}>
         {/* Universal Move Button */}
         {colId === 'todo' && (
           <Button 
             size="sm" 
             variant="primary" 
             onClick={() => onMove(task._id, colId, 'inprogress')}
             style={{ fontSize: '11px', height: '28px' }}
           >
             ▶ {t('Start') || 'Commencer'}
           </Button>
         )}
         {colId === 'inprogress' && (
           <Button 
             size="sm" 
             variant="success" 
             onClick={() => onMove(task._id, colId, 'done')}
             style={{ fontSize: '11px', height: '28px' }}
           >
             ✓ {t('Finish') || 'Terminer'}
           </Button>
         )}
         {colId === 'done' && (
            <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IoCheckmarkOutline size={14} /> {t('Completed') || 'Terminé'}
            </span>
         )}
         <button onClick={() => onDelete(task._id, colId)} style={{ padding: '5px 8px', borderRadius: 'var(--radius-md)', border: '1px solid #FCA5A533', background: '#FEF2F2', color: '#DC2626', fontSize: '11px', cursor: 'pointer', marginLeft: 'auto' }}>✕ {t('Delete')}</button>
      </div>

    </div>
  );
}

export default function Taches() {
  const { tasks, addTaskObject, moveTask, setTasks, group } = useStudent();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [newTask, setNewTask] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [reassignTask, setReassignTask] = useState(null); // task being reassigned
  const members = group?.members ?? [];

  const totalTasks = Object.values(tasks).flat().length;
  const doneTasks = (tasks.done || []).length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const COLS = [
    { id: 'todo', label: t('Todo'), color: '#6B7280', bg: 'var(--bg)' },
    { id: 'inprogress', label: t('InProgress'), color: 'var(--primary)', bg: 'rgba(79,70,229,0.03)' },
    { id: 'done', label: t('Done'), color: '#10B981', bg: 'rgba(16,185,129,0.03)' },
  ];

  const handleDelete = async (taskId, colId) => {
    try {
      await tasksApi.deleteTask(taskId);
      setTasks(prev => ({ ...prev, [colId]: prev[colId].filter(t => t._id !== taskId) }));
    } catch(err) {}
  };

  const toggleAssignee = (memberId) => {
    setNewTask(f => ({
      ...f,
      assignees: f.assignees.includes(memberId)
        ? f.assignees.filter(id => id !== memberId)
        : [...f.assignees, memberId],
    }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    // Validate required fields
    if (!newTask.title.trim()) { setFormError('Veuillez saisir un titre pour la tâche.'); return; }
    if (!newTask.deadline)    { setFormError('Veuillez choisir une date limite.'); return; }

    const col = newTask.column ?? 'todo';
    const taskData = {
      title: newTask.title,
      desc: newTask.desc,
      priority: newTask.priority,
      deadline: newTask.deadline,
      tag: newTask.tag,
      assigneeIds: newTask.assignees,
    };
    addTaskObject(taskData, col);
    setModalOpen(false);
    setNewTask(EMPTY_FORM);
    setFormError('');
  };

  if (!group) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <IoCheckmarkOutline size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('TaskManagement')}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '24px' }}>
            Vous devez rejoindre ou créer un groupe avant de pouvoir gérer des tâches.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('TaskManagement')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{doneTasks}/{totalTasks} {t('TasksCompleted_Subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {COLS.map(c => (
            <span key={c.id} style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--radius-full)', background: c.color + '18', color: c.color }}>
              {tasks[c.id]?.length ?? 0}
            </span>
          ))}
          <Button icon={<IoAddOutline size={18} />} onClick={() => setModalOpen(true)}>{t('NewTask')}</Button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
          <span>{t('GlobalProgress')}</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--primary), var(--primary-light))' }} />
        </div>
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {COLS.map(col => (
          <div key={col.id} style={{ background: col.bg, borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--border)', padding: '16px', minHeight: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: '14px', fontWeight: 700 }}>{col.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: col.color + '18', color: col.color }}>
                {tasks[col.id]?.length ?? 0}
              </span>
            </div>

            {tasks[col.id]?.map(task => (
              <TaskCard
                key={task._id || `tmp-${Math.random()}`}
                task={task}
                colId={col.id}
                group={group}
                onMove={moveTask}
                onDelete={handleDelete}
                onReassign={(t) => setReassignTask(t)}
              />
            ))}

            {tasks[col.id]?.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: '13px' }}>
                {t('DropHere')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setNewTask(EMPTY_FORM); setFormError(''); }} title={t('CreateTask')} size="md">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Validation error banner */}
          {formError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px' }}>
              <IoAlertCircleOutline size={16} />
              {formError}
            </div>
          )}

          <Input label={`${t('TaskTitle')} *`} value={newTask.title} onChange={e => { setNewTask(f => ({ ...f, title: e.target.value })); setFormError(''); }} placeholder="..." />

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Description')}</label>
            <textarea value={newTask.desc} onChange={e => setNewTask(f => ({ ...f, desc: e.target.value }))} rows={3} placeholder="..." style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Priority')}</label>
              <select value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="high">🔴 {t('High')}</option>
                <option value="medium">🟡 {t('Medium')}</option>
                <option value="low">🟢 {t('Low')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Column')}</label>
              <select value={newTask.column ?? 'todo'} onChange={e => setNewTask(f => ({ ...f, column: e.target.value }))} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="todo">{t('Todo')}</option>
                <option value="inprogress">{t('InProgress')}</option>
                <option value="done">{t('Done')}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label={`${t('Deadline')} *`} type="date" value={newTask.deadline} onChange={e => { setNewTask(f => ({ ...f, deadline: e.target.value })); setFormError(''); }} />
            <Input label={t('Tag')} value={newTask.tag} onChange={e => setNewTask(f => ({ ...f, tag: e.target.value }))} placeholder="..." />
          </div>

          {/* Member assignment */}
          {members.length > 0 ? (
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                👥 {t('AssignMembers')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map((m, i) => {
                  const id = m._id ?? m.name;
                  const selected = newTask.assignees.includes(id);
                  return (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: selected ? '2px solid var(--primary)' : '1px solid var(--border)', background: selected ? 'var(--primary-subtle)' : 'var(--bg)', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={selected} onChange={() => toggleAssignee(id)} style={{ accentColor: 'var(--primary)' }} />
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${i * 80 + 230},65%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(m.name || '?').charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.role}</p>
                      </div>
                      {selected && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-muted)' }}>
              💡 {t('NoGroupDetails')}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => { setModalOpen(false); setNewTask(EMPTY_FORM); setFormError(''); }} type="button">{t('Cancel')}</Button>
            <Button type="submit">{t('Save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Reassign modal */}
      {reassignTask && (
        <Modal isOpen={!!reassignTask} onClose={() => setReassignTask(null)} title="Changer le responsable" size="sm">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Tâche : <strong>{reassignTask.title}</strong>
            </p>
            {members.map((m, i) => {
              const id = m._id ?? m.name;
              const isCurrentAssignee = reassignTask.assigneeIds?.map(String).includes(String(id));
              return (
                <button
                  key={i}
                  onClick={async () => {
                    try {
                      // 1. Remove all existing assignees
                      for (const oldId of (reassignTask.assigneeIds || [])) {
                        await tasksApi.unassignTask(reassignTask._id, oldId).catch(() => {});
                      }
                      // 2. Assign the newly chosen member
                      await tasksApi.assignTask(reassignTask._id, id);
                      // 3. Update local state immediately — no refresh needed
                      setTasks(prev => {
                        const updated = { ...prev };
                        for (const col of Object.keys(updated)) {
                          updated[col] = updated[col].map(t =>
                            (t._id === reassignTask._id || t.id === reassignTask._id)
                              ? { ...t, assigneeIds: [id] }
                              : t
                          );
                        }
                        return updated;
                      });
                      setReassignTask(null);
                    } catch(e) {
                      console.error('Reassign failed', e);
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: isCurrentAssignee ? '2px solid var(--primary)' : '1px solid var(--border)', background: isCurrentAssignee ? 'var(--primary-subtle)' : 'var(--bg)', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${i * 80 + 230},65%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    {(m.name || '?').charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.role}</p>
                  </div>
                  {isCurrentAssignee && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700 }}>✓ Actuel</span>}
                </button>
              );
            })}
            <Button variant="outline" onClick={() => setReassignTask(null)} style={{ marginTop: '6px' }}>Fermer</Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
