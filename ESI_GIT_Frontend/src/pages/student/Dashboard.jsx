import {
  IoCalendarOutline, IoCheckboxOutline,
  IoTrendingUpOutline, IoTimeOutline,
  IoGitBranchOutline, IoPeopleOutline,
  IoDocumentOutline, IoAddCircleOutline,
} from 'react-icons/io5';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';

/* ── icon map for the activity feed ─────────────────────────── */
const ACTIVITY_ICONS = {
  task_created:       <IoCheckboxOutline  size={16}/>,
  task_done:          <IoCheckboxOutline  size={16}/>,
  meeting_scheduled:  <IoCalendarOutline  size={16}/>,
  livrable_submitted: <IoDocumentOutline  size={16}/>,
  group_joined:       <IoPeopleOutline    size={16}/>,
  group_created:      <IoPeopleOutline    size={16}/>,
  default:            <IoGitBranchOutline size={16}/>,
};

/* ── milestones derived from tasks columns ───────────────────── */
function Milestones({ tasks }) {
  const total = Object.values(tasks).flat().length;
  if (total === 0) return (
    <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
      Aucune tâche pour l'instant —{' '}
      <Link to="/student/taches" style={{ color: 'var(--primary)', fontWeight: 600 }}>créer une tâche</Link>
    </p>
  );

  const cols = [
    { label: 'À faire',   count: tasks.todo.length,       color: '#6B7280' },
    { label: 'En cours',  count: tasks.inprogress.length, color: 'var(--primary)' },
    { label: 'Terminées', count: tasks.done.length,        color: '#10B981' },
  ];

  return cols.map((c, i) => (
    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '90px', flexShrink: 0 }}>{c.label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: total > 0 ? `${Math.round((c.count / total) * 100)}%` : '0%', height: '100%', borderRadius: 3, background: c.color }}/>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: c.color, width: '28px', textAlign: 'right', flexShrink: 0 }}>{c.count}</span>
    </div>
  ));
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { stats, analytics, tasks, meetings, group, recentActivity, upcomingDeadlines } = useStudent();
  const { t } = useLanguage();

  /* ── stat cards ──────────────────────────────────────────────── */
  const statCards = [
    {
      label: t('TasksCompleted'),
      value: stats.tasksTotal > 0 ? `${stats.tasksCompleted}/${stats.tasksTotal}` : '0/0',
      icon: <IoCheckboxOutline size={22}/>,
      color: 'var(--primary)',
    },
    {
      label: t('PlannedMeetings'),
      value: stats.meetingsCount,
      icon: <IoCalendarOutline size={22}/>,
      color: 'var(--accent)',
    },
    {
      label: t('OverallProgress'),
      value: stats.tasksTotal > 0 ? `${stats.globalProgress}%` : '0%',
      icon: <IoTrendingUpOutline size={22}/>,
      color: '#10B981',
    },
    ...(stats.teacherTasksCount > 0 ? [{
      label: t('TeacherTasks'),
      value: stats.teacherTasksCount,
      icon: <IoAddCircleOutline size={22}/>,
      color: '#8B5CF6',
    }] : []),
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('DashboardGreeting')} 👋</p>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' }}>{user?.name}</h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => <div key={i}><StatCard {...s}/></div>)}
      </div>

      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '20px' }}>

        {/* Project progress */}
        <Card style={{ minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('ProjectProgress')}</h3>
            <Badge variant={stats.globalProgress > 0 ? 'success' : 'default'}>
              {stats.globalProgress > 0 ? t('InProgress') : t('NotStarted')}
            </Badge>
          </div>

          {/* Big % */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('TasksCompleted')}</span>
              <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Syne', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                {stats.tasksTotal > 0 ? `${stats.globalProgress}%` : '—'}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ width: `${stats.globalProgress}%`, height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, var(--primary), var(--primary-light))' }}/>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {stats.tasksTotal > 0
                ? `${stats.tasksCompleted} sur ${stats.tasksTotal} tâches`
                : 'Aucune tâche créée'}
            </p>
          </div>

          <Milestones tasks={tasks}/>
        </Card>

        {/* Activity feed */}
        <Card style={{ minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('RecentActivity')}</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
                {t('NoActivity')}
              </p>
            ) : recentActivity.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: (a.color ?? '#6B7280') + '18', color: a.color ?? '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ACTIVITY_ICONS[a.type] ?? ACTIVITY_ICONS.default}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>{a.action}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</p>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{a.timestamp}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Upcoming deadlines */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('UpcomingDeadlines')}</h3>
          {upcomingDeadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Aucune deadline à venir</p>
              <Link to="/student/taches">
                <Badge variant="info" style={{ cursor: 'pointer' }}>
                  <IoAddCircleOutline size={13} style={{ marginRight: 4 }}/> Créer une tâche
                </Badge>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingDeadlines.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <IoTimeOutline size={16} style={{ color: 'var(--text-muted)' }}/>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{d.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{d.date}</span>
                    <Badge variant={d.priority}>{d.priority === 'danger' ? 'Urgent' : d.priority === 'warning' ? 'Proche' : 'Normal'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Group card */}
        <Card>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('MyGroup')}</h3>
          {group === null ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>{t('NoGroupDetails')}</p>
              <Link to="/student/groupe">
                <Badge variant="info" style={{ cursor: 'pointer' }}>
                  <IoPeopleOutline size={13} style={{ marginRight: 4 }}/> {t('CreateJoinGroup')}
                </Badge>
              </Link>
            </div>
          ) : (
            <>
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--primary-subtle)', border: '1px solid rgba(79,70,229,0.2)', marginBottom: '14px' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>{group.title ?? 'Projet non défini'}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {group.groupCode}{group.encadreur ? ` · ${group.encadreur}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(group.members ?? []).map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${i * 80 + 230},70%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      {m.avatar ?? m.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500 }}>{m.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Analytics row — FIX 4: real computed data */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>

          {/* Task origin */}
          <Card style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>{t('TaskOrigin')}</h4>
            {[
              { label: 'Créées par vous', value: analytics.studentTasks ?? 0,  color: 'var(--accent)' },
              { label: 'Assignées par l\'encadreur', value: analytics.teacherTasks ?? 0, color: 'var(--primary)' },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: i === 0 ? '10px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: analytics.totalTasks > 0 ? `${Math.round((item.value / analytics.totalTasks) * 100)}%` : '0%', height: '100%', borderRadius: 3, background: item.color }}/>
                </div>
              </div>
            ))}
          </Card>

          {/* Task status breakdown */}
          <Card style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>{t('TaskStatus')}</h4>
            {(analytics.tasksByStatus ?? []).map((item, i) => (
              <div key={i} style={{ marginBottom: i < 2 ? '10px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ fontWeight: 700, color: item.color }}>{item.value}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: analytics.totalTasks > 0 ? `${Math.round((item.value / analytics.totalTasks) * 100)}%` : '0%', height: '100%', borderRadius: 3, background: item.color }}/>
                </div>
              </div>
            ))}
          </Card>

          {/* Livrables */}
          <Card style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>{t('Deliverables')}</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Soumis</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#8B5CF6' }}>{analytics.totalLivrables ?? 0}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginTop: '6px' }}>
              <div style={{ width: analytics.totalLivrables > 0 ? '100%' : '0%', height: '100%', borderRadius: 3, background: '#8B5CF6' }} />
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
