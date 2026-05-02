import { useState } from 'react';
import { IoTimeOutline } from 'react-icons/io5';
import Badge from './Badge';

const PRIORITY_COLORS = {
  high: { bg: '#FEE2E2', color: '#DC2626', label: 'Haute' },
  medium: { bg: '#FEF9C3', color: '#CA8A04', label: 'Moyenne' },
  low: { bg: '#DCFCE7', color: '#16A34A', label: 'Basse' },
};

export default function KanbanBoard({ columns, onMoveTask }) {
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, taskId, fromColumn) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('fromColumn', fromColumn);
  };

  const handleDrop = (e, toColumn) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const fromColumn = e.dataTransfer.getData('fromColumn');
    if (fromColumn !== toColumn) onMoveTask?.(taskId, fromColumn, toColumn);
    setDragOver(null);
  };

  const COLUMN_COLORS = {
    todo: { header: '#6B7280', bg: 'var(--bg)' },
    inprogress: { header: 'var(--primary)', bg: 'rgba(79,70,229,0.03)' },
    done: { header: '#10B981', bg: 'rgba(16,185,129,0.03)' },
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', overflowX: 'auto' }}>
      {columns.map((col) => {
        const cfg = COLUMN_COLORS[col.id] || COLUMN_COLORS.todo;
        const isOver = dragOver === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              background: isOver ? 'var(--primary-subtle)' : cfg.bg,
              borderRadius: 'var(--radius-xl)',
              border: `1.5px solid ${isOver ? 'var(--primary)' : 'var(--border)'}`,
              padding: '16px', minHeight: '400px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.header }} />
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{col.label}</span>
                <span style={{
                  fontSize: '12px', fontWeight: 600, padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: cfg.header + '18', color: cfg.header,
                }}>
                  {col.tasks.length}
                </span>
              </div>
            </div>

            {col.tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id, col.id)}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px', marginBottom: '10px',
                  border: '1px solid var(--border)',
                  cursor: 'grab', boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  {task.priority && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                      background: PRIORITY_COLORS[task.priority]?.bg,
                      color: PRIORITY_COLORS[task.priority]?.color,
                    }}>
                      {PRIORITY_COLORS[task.priority]?.label}
                    </span>
                  )}
                  {task.tag && (
                    <span style={{
                      fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px',
                      background: 'var(--primary-subtle)', color: 'var(--primary)',
                    }}>
                      {task.tag}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', lineHeight: 1.4 }}>{task.title}</h4>

                {task.desc && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>{task.desc}</p>
                )}

                {task.progress !== undefined && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Avancement</span>
                      <span style={{ fontWeight: 600 }}>{task.progress}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ width: `${task.progress}%`, height: '100%', borderRadius: 3, background: 'var(--primary)' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {task.deadline && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <IoTimeOutline size={12} /> {task.deadline}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {task.assignees?.map((a, i) => (
                      <div key={i} style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: `hsl(${i * 90 + 200}, 65%, 55%)`,
                        border: '2px solid var(--bg-card)',
                        marginLeft: i > 0 ? -8 : 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', fontWeight: 700, color: '#fff',
                      }}>
                        {a.charAt(0)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {col.tasks.length === 0 && (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-lg)',
                color: 'var(--text-muted)', fontSize: '13px',
              }}>
                Déposer ici
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
