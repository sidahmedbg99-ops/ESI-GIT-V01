import {
  IoPeopleOutline, IoCalendarOutline,
  IoCheckmarkCircleOutline, IoStarOutline,
  IoTimeOutline, IoTrendingUpOutline,
  IoDocumentTextOutline,
} from 'react-icons/io5';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';

const PRIORITY_COLORS = ['#EF4444', '#F59E0B', '#10B981'];

export default function TeacherDashboard() {
  const { groups, meetings, evaluations, analytics, groupsLoading, acceptMeeting, rejectMeeting, updateGroup, supervisorRequests, respondToSupervisorRequest } = useTeacher();
  const { t } = useLanguage();

  const safeGroups   = groups   || [];
  const safeMeetings = meetings || [];

  // FIX 4: use real computed analytics
  const a = analytics ?? {};

  const statCards = [
    { label: t('SupervisedGroups_Stat'), value: a.totalGroups      ?? safeGroups.length,  icon: <IoPeopleOutline size={22}/>,          color: 'var(--primary)' },
    { label: t('ActiveGroups_Stat'),     value: a.activeGroups     ?? 0,                  icon: <IoTimeOutline size={22}/>,            color: 'var(--accent)' },
    { label: t('AvgProgress_Stat'),      value: `${a.avgProgress   ?? 0}%`,               icon: <IoTrendingUpOutline size={22}/>,      color: '#10B981' },
    { label: t('CompletionRate_Stat'),    value: `${a.completionRate ?? 0}%`,              icon: <IoCheckmarkCircleOutline size={22}/>, color: '#8B5CF6' },
    { label: t('PendingMeetings_Stat'),   value: a.pendingMeetings  ?? 0,                  icon: <IoCalendarOutline size={22}/>,        color: '#F59E0B' },
    { label: t('PendingEvals_Stat'),     value: a.pendingEvals     ?? 0,                  icon: <IoStarOutline size={22}/>,            color: '#EF4444' },
  ];

  const taskStatusData = [
    { name: t('Todo'),       value: a.todoTasks      ?? 0, color: '#6B7280' },
    { name: t('InProgress'), value: a.inProgressTasks ?? 0, color: 'var(--primary)' },
    { name: t('Done'),       value: a.doneTasks       ?? 0, color: '#10B981' },
  ];

  const priorityData = [
    { name: t('High'),   value: a.tasksByPriority?.high   ?? 0 },
    { name: t('Medium'), value: a.tasksByPriority?.medium ?? 0 },
    { name: t('Low'),    value: a.tasksByPriority?.low    ?? 0 },
  ];

  const groupBreakdown = a.groupBreakdown ?? safeGroups.map(g => ({
    name: g.groupCode || g.title,
    progress: g.progress || 0,
    tasks: 0, done: 0,
  }));

  const columns = [
    { key: 'title',     label: 'Projet',   render: v => <span style={{ fontSize: '13px', fontWeight: 600 }}>{v}</span> },
    { key: 'groupCode', label: 'Groupe' },
    { key: 'members',   label: t('Members').split(' ')[0], align: 'center', render: (_, row) => <span style={{ fontWeight: 600 }}>{row?.members?.length || row?.studentIds?.length || 0}</span> },
    { key: 'progress',  label: t('OverallProgress'), render: v => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', minWidth: 80 }}>
          <div style={{ width: `${v || 0}%`, height: '100%', background: (v||0) >= 60 ? '#10B981' : (v||0) >= 40 ? '#F59E0B' : '#EF4444', borderRadius: 3 }}/>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, minWidth: 30 }}>{v || 0}%</span>
      </div>
    )},
    { key: 'supervisorApproved', label: 'Approbation', render: v => <Badge variant={v ? 'success' : 'warning'}>{v ? t('Approve') : t('InProgress')}</Badge> },
    { key: 'status', label: 'Statut', render: v => <Badge variant={v === 'active' ? 'info' : 'secondary'}>{v === 'active' ? 'Actif' : v}</Badge> },
  ];

  const pendingMeetings = safeMeetings.filter(m => m.status === 'pending');

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('TeacherDashboard')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('RealDataAnalytics')}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => <div key={i}><StatCard {...s}/></div>)}
      </div>

      {/* Row 1: group progress bar + tasks status pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ minHeight: '270px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('ProgressByGroup')}</h3>
          {groupBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={groupBreakdown} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0,100]}/>
                <Tooltip formatter={v => [`${v}%`, t('OverallProgress')]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
                <Bar dataKey="progress" fill="var(--primary)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 60 }}>{t('NoGroups')}</p>
          )}
        </Card>

        <Card style={{ minHeight: '270px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>{t('TaskState')}</h3>
          <PieChart width={210} height={150} style={{ margin: '0 auto' }}>
            <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={3} dataKey="value">
              {taskStatusData.map((d, i) => <Cell key={i} fill={d.color}/>)}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
          </PieChart>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
            {taskStatusData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }}/>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <strong>{d.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: priority breakdown + pending meetings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('TasksByPriority')}</h3>
          {[...priorityData].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '60px' }}>{p.name}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: a.totalTasks > 0 ? `${Math.round((p.value / (a.totalTasks||1)) * 100)}%` : '0%', height: '100%', borderRadius: 4, background: PRIORITY_COLORS[i] }}/>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: PRIORITY_COLORS[i], width: 20, textAlign: 'right' }}>{p.value}</span>
            </div>
          ))}

        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            {t('PendingMeetings_Stat')}
            {pendingMeetings.length > 0 && <Badge variant="warning" style={{ marginLeft: 8 }}>{pendingMeetings.length}</Badge>}
          </h3>
          {pendingMeetings.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 30 }}>{t('NoPendingRequests')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingMeetings.slice(0, 4).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{m.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {m.date} à {m.time}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => acceptMeeting(m.id)} style={{ padding: '5px 10px', borderRadius: '8px', background: 'var(--primary-subtle)', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>✓</button>
                    <button onClick={() => rejectMeeting(m.id)} style={{ padding: '5px 10px', borderRadius: '8px', background: '#FEE2E2', border: 'none', color: '#DC2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3 removed: now on dedicated Requests page */}
      {/* Groups table */}
      <Card style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('MyGroups')}</h3>
        {groupsLoading ? (
          <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>{t('Loading')}</p>
        ) : safeGroups.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <IoPeopleOutline size={36} style={{ marginBottom: '12px', opacity: 0.3 }}/>
            <p>{t('NoSupervisedGroups')}</p>
          </div>
        ) : (
          <Table columns={columns} data={safeGroups}/>
        )}
      </Card>

      {/* Jury Assignments table */}
      {(evaluations?.defenses || []).length > 0 && (
        <Card style={{ marginTop: '20px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('DefenseJury')}</h3>
          <Table 
            columns={[
              { key: 'project_name', label: 'Projet', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
              { key: 'group_code',   label: 'Groupe' },
              { key: 'specialty',    label: 'Spécialité' },
              { key: 'schedule',     label: 'Soutenance', render: s => s ? `${s.date} ${s.time}` : 'Non planifiée' },
              { key: 'is_evaluated', label: 'Statut', render: v => <Badge variant={v ? 'success' : 'warning'}>{v ? t('Evaluated') : t('ToEvaluate')}</Badge> },
              { key: 'PID_id',       label: 'Action', align: 'right', render: (id) => (
                <a href="/teacher/jury" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}>
                  {t('ViewDetails')} →
                </a>
              )}
            ]} 
            data={evaluations.defenses}
          />
        </Card>
      )}
    </DashboardLayout>
  );
}
