import {
  IoPeopleOutline, IoSchoolOutline,
  IoBarChartOutline, IoDocumentOutline,
  IoAlertCircleOutline, IoPersonOutline,
} from 'react-icons/io5';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';

const PIE_COLORS  = ['var(--primary)', 'var(--accent)', '#10B981'];
const PROJ_COLORS = ['#6B7280', '#F59E0B', '#10B981'];

export default function AdminDashboard() {
  // analytics        → projects/admin/dashboard/ → { Student, teachers, projects:{total,pending,approved,archived}, defense }
  // advancedAnalytics → admin/analytics/advanced/  → { student_stats, operations, teacher_patterns, ... }
  const { users, analytics, advancedAnalytics } = useAdmin();
  const { t } = useLanguage();
  const safeUsers = users || [];

  // ── Basic stats from projects dashboard ────────────────────
  const a = analytics ?? {};
  const totalStudents        = a.totalStudents        ?? safeUsers.filter(u => u.role === 'student').length;
  const totalTeachers        = a.totalTeachers        ?? safeUsers.filter(u => u.role === 'teacher' || u.type === 'staff').length;
  const activeGroups         = a.activeGroups         ?? 0;
  const archivedProj         = a.archivedProjects     ?? 0;
  const pendingGroups        = a.pendingGroups        ?? 0;
  const studentsWithoutGroup = a.studentsWithoutGroup ?? 0;
  const totalProjects        = a.totalProjects        ?? 0;
  const gradedProjects       = a.gradedProjects       ?? 0;
  const readyToArchive       = a.readyToArchive       ?? 0;
  const juriesAssigned       = a.juriesAssigned       ?? 0;
  const defensesScheduled    = a.defensesScheduled    ?? 0;
  const levelFunnel          = a.levelFunnel          ?? [];

  // ── Advanced analytics (charts) ────────────────────────────
  const adv = advancedAnalytics ?? {};
  const ops = adv.operations    ?? {};
  const stu = adv.student_stats ?? {};

  // Teacher grading bar
  const teacherBarData = (adv.teacher_patterns ?? []).map(tp => ({
    name:     tp.last_name || (tp.name ?? '').split(' ').slice(-1)[0] || '—',
    note:     tp.avg_given ?? 0,
  }));

  // Specialty distribution (computed from loaded users list)
  const specialiteBar = (() => {
    const map = {};
    safeUsers.filter(u => u.role === 'student').forEach(u => {
      const s = u.specialite || u.specialty || 'Autre';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Pie charts
  const userPieData = [
    { name: t('Students'), value: totalStudents },
    { name: t('Teachers'), value: totalTeachers },
    { name: t('Admins'),   value: safeUsers.filter(u => u.role === 'admin').length },
  ];
  const projPieData = [
    { name: t('Pending_label'), value: pendingGroups },
    { name: t('Approved_label'), value: activeGroups  },
    { name: t('Archived_label'), value: archivedProj  },
  ];
  const hasUsers = userPieData.some(p => p.value > 0);

  // Stat cards — admin-appropriate platform metrics only
  const statCards = [
    { label: t('TotalStudents_Stat'),    value: totalStudents,         icon: <IoSchoolOutline size={22}/>,          color: 'var(--primary)' },
    { label: t('Teachers'),              value: totalTeachers,         icon: <IoPeopleOutline size={22}/>,          color: 'var(--accent)'  },
    { label: t('ActiveGroups_Stat'),     value: activeGroups,          icon: <IoBarChartOutline size={22}/>,        color: '#10B981'        },
    { label: t('NoGroup_Stat'),          value: studentsWithoutGroup,  icon: <IoAlertCircleOutline size={22}/>,     color: studentsWithoutGroup > 0 ? '#F59E0B' : '#6B7280' },
    { label: t('PendingApprovals_Stat'), value: pendingGroups,         icon: <IoPersonOutline size={22}/>,          color: pendingGroups > 0 ? '#8B5CF6' : '#6B7280' },
    { label: t('ArchivedProjects_Stat'), value: archivedProj,          icon: <IoDocumentOutline size={22}/>,        color: '#EF4444'        },
  ];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('AdminDashboard')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('RealTimeAnalytics')}</p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => <div key={i}><StatCard {...s}/></div>)}
      </div>

      {/* ── Row 1: teacher bar + user pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>

        <Card style={{ minHeight: '280px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('AvgNotesByTeacher')}</h3>
          {teacherBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={teacherBarData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 20]}/>
                <Tooltip formatter={v => [`${v}/20`, t('AvgGrade')]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
                <Legend wrapperStyle={{ fontSize: '12px' }}/>
                <Bar dataKey="note" fill="var(--primary)" radius={[6,6,0,0]} name={`${t('AvgGrade')} (/20)`}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 190, color: 'var(--text-muted)', fontSize: 13 }}>
              {t('NoGradesYet')}
            </div>
          )}
        </Card>

        <Card style={{ minHeight: '280px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('UserDistribution')}</h3>
          {hasUsers ? (
            <>
              <PieChart width={230} height={145} style={{ margin: '0 auto' }}>
                <Pie data={userPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                  {userPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Tooltip formatter={v => [v.toLocaleString(), '']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {userPieData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i] }}/>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    </div>
                    <strong>{p.value.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 190, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              {t('NoUsersYet')}
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 2: readiness funnel + specialite + project state ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>

        {/* Defense & archival readiness funnel */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{t('DefenseReadiness')}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>{t('DefenseSubtitle')}</p>
          {[
            { label: t('ActiveProjects_label'),     value: activeGroups,      color: 'var(--primary)', pct: 100 },
            { label: t('JuriesAssigned_label'),     value: juriesAssigned,    color: '#8B5CF6',         pct: activeGroups > 0 ? Math.round(juriesAssigned / activeGroups * 100) : 0 },
            { label: t('DefensesScheduled_label'),  value: defensesScheduled, color: '#F59E0B',         pct: activeGroups > 0 ? Math.round(defensesScheduled / activeGroups * 100) : 0 },
            { label: t('Graded_label'),             value: gradedProjects,    color: '#10B981',         pct: activeGroups > 0 ? Math.round(gradedProjects / activeGroups * 100) : 0 },
            { label: t('ReadyToArchive_label'),     value: readyToArchive,    color: '#EF4444',         pct: activeGroups > 0 ? Math.round(readyToArchive / activeGroups * 100) : 0 },
          ].map((step, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{step.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: step.color }}>{step.value}</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${step.pct}%`, height: '100%', borderRadius: 3, background: step.color, transition: 'width 0.4s' }}/>
              </div>
            </div>
          ))}

          {/* Per-level breakdown */}
          {levelFunnel.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }}/>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t('ByLevel')}</p>
              {levelFunnel.map((lf, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', flexShrink: 0, minWidth: 34, textAlign: 'center' }}>{lf.label}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ width: lf.active > 0 ? `${Math.round(lf.graded / lf.active * 100)}%` : '0%', height: '100%', borderRadius: 3, background: '#10B981' }}/>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{lf.graded}/{lf.active} {t('Graded_count')}</span>
                </div>
              ))}
            </>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('GroupsPerSpecialty')}</h3>
          {specialiteBar.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={specialiteBar} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
                <Bar dataKey="value" fill="#8B5CF6" radius={[6,6,0,0]} name={t('Students')}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>
              {safeUsers.length === 0 ? t('Loading') : t('NoGroups')}
            </p>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>{t('ProjectState')}</h3>
          {totalProjects > 0 ? (
            <>
              <PieChart width={200} height={130} style={{ margin: '0 auto' }}>
                <Pie data={projPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={3} dataKey="value">
                  {PROJ_COLORS.map((c, i) => <Cell key={i} fill={c}/>)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                {projPieData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PROJ_COLORS[i] }}/>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                    </div>
                    <strong>{p.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '0 20px' }}>
              {t('NoGroups')}
            </div>
          )}
        </Card>
      </div>

    </DashboardLayout>
  );
}
