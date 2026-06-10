import {
  IoCalendarOutline, IoCheckboxOutline,
  IoTrendingUpOutline, IoTimeOutline,
  IoGitBranchOutline, IoPeopleOutline,
  IoDocumentOutline, IoAddCircleOutline,
  IoRibbonOutline, IoAlertCircleOutline,
  IoCheckmarkCircleOutline, IoPersonOutline,
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

const SUBMISSION_CONFIG = {
  approved:           { label: 'Soumission approuvée', color: '#10B981', icon: <IoCheckmarkCircleOutline size={16}/>, variant: 'success' },
  pending_validation: { label: 'En attente de validation', color: '#F59E0B', icon: <IoTimeOutline size={16}/>, variant: 'warning' },
  not_submitted:      { label: 'Non soumis', color: '#6B7280', icon: <IoDocumentOutline size={16}/>, variant: 'default' },
  no_group:           { label: 'Pas de groupe', color: '#6B7280', icon: <IoPeopleOutline size={16}/>, variant: 'default' },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { stats, dashboardStats, tasks, meetings, group, recentActivity, upcomingDeadlines } = useStudent();
  const { t } = useLanguage();

  const ds = dashboardStats || {};

  // Prefer backend counts (accurate); fall back to local state while loading
  const tasksDone  = ds.tasks_done  ?? stats.tasksCompleted;
  const tasksTotal = ds.tasks_total ?? stats.tasksTotal;
  const teacherDone  = ds.teacher_tasks_done  ?? stats.teacherTasksCompleted;
  const teacherTotal = ds.teacher_tasks_total ?? stats.teacherTasksCount;

  const submissionCfg = SUBMISSION_CONFIG[ds.submission_status || (group ? 'not_submitted' : 'no_group')];

  /* ── stat cards ──────────────────────────────────────────────── */
  const statCards = [
    {
      label: t('TasksDone'),
      value: `${tasksDone}/${tasksTotal}`,
      icon: <IoCheckboxOutline size={22}/>,
      color: 'var(--primary)',
    },
    {
      label: t('PlannedMeetings'),
      value: ds.meetings_upcoming ?? stats.meetingsCount,
      icon: <IoCalendarOutline size={22}/>,
      color: 'var(--accent)',
    },
    {
      label: ds.overdue_tasks > 0 ? `${ds.overdue_tasks} ${t('OverdueTasks')}` : t('NoOverdue'),
      value: ds.overdue_tasks ?? 0,
      icon: <IoAlertCircleOutline size={22}/>,
      color: (ds.overdue_tasks ?? 0) > 0 ? '#EF4444' : '#10B981',
    },
    {
      label: t('TeacherTasks'),
      value: `${teacherDone}/${teacherTotal}`,
      icon: <IoPersonOutline size={22}/>,
      color: '#8B5CF6',
    },
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

        {/* Task board summary */}
        <Card style={{ minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('TaskProgress')}</h3>
            <Badge variant={submissionCfg.variant} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              {submissionCfg.icon} {submissionCfg.label}
            </Badge>
          </div>

          {/* Honest tasks done X/Y */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('TasksDone')}</span>
              <span style={{ fontSize: '30px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
                {tasksDone}<span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/{tasksTotal}</span>
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ width: tasksTotal > 0 ? `${Math.round(tasksDone/tasksTotal*100)}%` : '0%', height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, var(--primary), var(--primary-light))', transition: 'width 0.4s' }}/>
            </div>
            {(ds.overdue_tasks ?? 0) > 0 && (
              <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoAlertCircleOutline size={13}/> {ds.overdue_tasks} {t('OverdueTasks')}
              </p>
            )}
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
                  Code d'invitation : {group.groupCode || group.joinCode || group.InviteCode || '—'}
                </p>
                {group.encadreur && group.encadreur !== '—' ? (
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Encadrant : {group.encadreur}
                  </p>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Sans encadrant
                  </p>
                )}
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

      {/* Academic info row — backend-driven */}
      {ds.has_group && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px' }}>

          {/* Submission status */}
          <Card style={{ padding: '18px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>{t('FinalSubmission')}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: submissionCfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: submissionCfg.color, fontSize: '20px' }}>
                {submissionCfg.icon}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: submissionCfg.color }}>{submissionCfg.label}</span>
            </div>
          </Card>

          {/* Attendance rate */}
          {ds.attendance_rate !== null && ds.attendance_rate !== undefined && (
            <Card style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>{t('AttendanceRate')}</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '30px', fontWeight: 800, color: ds.attendance_rate >= 75 ? '#10B981' : ds.attendance_rate >= 50 ? '#F59E0B' : '#EF4444', letterSpacing: '-0.02em' }}>{ds.attendance_rate}%</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>{t('Meetings_label')}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${ds.attendance_rate}%`, height: '100%', borderRadius: 3, background: ds.attendance_rate >= 75 ? '#10B981' : ds.attendance_rate >= 50 ? '#F59E0B' : '#EF4444', transition: 'width 0.4s' }}/>
              </div>
            </Card>
          )}

          {/* Final grade — shown only once graded */}
          {ds.final_grade !== null && ds.final_grade !== undefined && (
            <Card style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>{t('FinalGrade')}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <IoRibbonOutline size={22}/>
                </div>
                <div>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: ds.final_grade >= 10 ? '#10B981' : '#EF4444', letterSpacing: '-0.02em' }}>{parseFloat(ds.final_grade).toFixed(2)}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>/20</span>
                </div>
              </div>
            </Card>
          )}

          {/* Next meeting */}
          {ds.next_meeting && (
            <Card style={{ padding: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>{t('NextMeeting')}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(46,196,182,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <IoCalendarOutline size={20}/>
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600 }}>{ds.next_meeting.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ds.next_meeting.date} à {ds.next_meeting.time}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
