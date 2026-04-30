import {
  IoPeopleOutline, IoSchoolOutline, IoCheckmarkCircleOutline,
  IoBarChartOutline, IoTimeOutline, IoTrendingUpOutline, IoCalendarOutline,
  IoDocumentOutline, IoDownloadOutline,
} from 'react-icons/io5';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';

const PIE_COLORS   = ['var(--primary)', 'var(--accent)', '#10B981'];
const PROG_COLORS  = ['#6B7280', '#F59E0B', '#10B981'];

export default function AdminDashboard() {
  const { users, groups, analytics, advancedAnalytics } = useAdmin();
  const { t } = useLanguage();
  const safeUsers  = users  || [];

  // FIX 4: all values come from computeAdminAnalytics()
  const a = analytics ?? {};

  const userPieData = [
    { name: t('Students'),   value: a.totalStudents  ?? safeUsers.filter(u => u.role === 'student').length },
    { name: t('Teachers'),   value: a.totalTeachers  ?? safeUsers.filter(u => u.role === 'teacher').length },
    { name: t('Admins'),     value: safeUsers.filter(u => u.role === 'admin').length },
  ];

  const progressPieData = [
    { name: t('NotStarted'), value: a.progressBuckets?.notStarted ?? 0 },
    { name: t('InProgress'), value: a.progressBuckets?.inProgress  ?? 0 },
    { name: t('Done'),       value: a.progressBuckets?.completed   ?? 0 },
  ];

  const teacherBarData = (a.groupsPerTeacher ?? []).map(tVal => ({
    name:       tVal.name.split(' ').slice(-1)[0],  // last name only for brevity
    groupes:    tVal.groupCount,
    avancement: tVal.avgProgress,
  }));

  const specialiteBar = a.groupsBySpecialite ?? [];

  const statCards = [
    { label: t('TotalStudents_Stat'), defaultValue: 0, value: a.totalStudents  ?? safeUsers.filter(u => u.role === 'student').length, icon: <IoSchoolOutline size={22}/>,          color: 'var(--primary)' },
    { label: t('Teachers'),         value: a.totalTeachers  ?? safeUsers.filter(u => u.role === 'teacher').length, icon: <IoPeopleOutline size={22}/>,          color: 'var(--accent)' },
    { label: t('ActiveGroups_Stat'),      value: a.activeGroups   ?? 0,   icon: <IoBarChartOutline size={22}/>,          color: '#10B981' },
    { label: t('CompletionRate_Stat'),  value: `${a.completionRate ?? 0}%`,icon: <IoTrendingUpOutline size={22}/>,    color: '#8B5CF6' },
    { label: t('PendingMeetings_Stat'), value: a.pendingMeetings ?? 0,  icon: <IoCalendarOutline size={22}/>,         color: '#F59E0B' },
    { label: t('ArchivedProjects_Stat'), value: a.archivedProjects ?? 0, icon: <IoDocumentOutline size={22}/>,         color: '#EF4444' },
    { label: 'Étudiants à risque', value: advancedAnalytics?.student_stats?.at_risk ?? 0, icon: <IoTimeOutline size={22}/>, color: '#DC2626' },
  ];

  const activeVsInactiveData = [
    { name: 'Actifs', value: advancedAnalytics?.student_stats?.active ?? 0 },
    { name: 'Inactifs', value: advancedAnalytics?.student_stats?.inactive ?? 0 },
  ];

  const gradeTrendsData = (advancedAnalytics?.performance?.grade_trends ?? []).map(item => ({
    month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short' }),
    grade: item.avg_grade,
  }));

  const usageTrendsData = (advancedAnalytics?.usage_trends ?? []).map(item => ({
    month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short' }),
    projects: item.projects,
  }));

  const teacherPatternsData = (advancedAnalytics?.teacher_patterns ?? []).map(tp => ({
    name: tp.last_name,
    grade: tp.avg_given,
  }));

  const exportToCSV = () => {
    const headers = ["Catégorie", "Valeur"];
    const rows = [
      ["Étudiants Actifs", advancedAnalytics?.student_stats?.active],
      ["Étudiants Inactifs", advancedAnalytics?.student_stats?.inactive],
      ["Étudiants à Risque", advancedAnalytics?.student_stats?.at_risk],
      ["Taux de Réussite", `${advancedAnalytics?.performance?.pass_rate}%`],
      ["Taux d'Achèvement des Tâches", `${advancedAnalytics?.operations?.task_completion_rate}%`],
    ];
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rapport_analytique_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('AdminDashboard')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('RealTimeAnalytics')}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => <div key={i}><StatCard {...s}/></div>)}
      </div>

      {/* Row 1: progress avg + user pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', marginBottom: '20px' }}>

        {/* Average progress + teacher breakdown */}
        <Card style={{ minHeight: '280px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{t('AvgProgressBySupervisor')}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {t('WeightedAvgProgress')} : <strong style={{ color: 'var(--primary)' }}>{a.avgProgress ?? 0}%</strong>
          </p>
          {teacherBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={teacherBarData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0,100]}/>
                <Tooltip formatter={(v, n) => [n === 'avancement' ? `${v}%` : v, n === 'avancement' ? t('AvgProgress_Stat') : t('Groups')]}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
                <Legend wrapperStyle={{ fontSize: '12px' }}/>
                <Bar dataKey="avancement" fill="var(--primary)" radius={[6,6,0,0]} name={`${t('OverallProgress')} (%)`}/>
                <Bar dataKey="groupes"    fill="var(--accent)"         radius={[6,6,0,0]} name={t('Groups')}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 190, color: 'var(--text-muted)', fontSize: 13 }}>
              {t('NoGroupAssigned')}
            </div>
          )}
        </Card>

        {/* User distribution pie */}
        <Card style={{ minHeight: '280px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('UserDistribution')}</h3>
          {a.totalUsers > 0 ? (
            <>
              <PieChart width={230} height={145} style={{ margin: '0 auto' }}>
                <Pie data={userPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3} dataKey="value">
                  {userPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Tooltip formatter={(v) => [v.toLocaleString(), '']}
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
              No users yet.
            </div>
          )}
        </Card>
      </div>

      {/* Row 2: tasks breakdown + specialite + progress buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>

        {/* Tasks breakdown */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('Tasks')}</h3>
          {[
            { label: t('TotalTasks_Stat'),     value: a.totalTasks           ?? 0, color: '#6B7280' },
            { label: t('Done'),              value: a.doneTasks            ?? 0, color: '#10B981' },
            { label: t('AssignedBySupervisor'),value: a.teacherAssignedTasks ?? 0, color: 'var(--primary)' },
            { label: t('CreatedByStudents'),   value: a.studentCreatedTasks  ?? 0, color: 'var(--accent)' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </Card>

        {/* Specialite bar */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('GroupsPerSpecialty')}</h3>
          {specialiteBar.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={specialiteBar} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
                <Bar dataKey="value" fill="#8B5CF6" radius={[6,6,0,0]} name={t('Groups')}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 40 }}>{t('NoGroups')}</p>
          )}
        </Card>

        {/* Progress state pie */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>{t('ProjectState')}</h3>
          {a.totalProjects > 0 ? (
            <>
              <PieChart width={200} height={130} style={{ margin: '0 auto' }}>
                <Pie data={progressPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={55} paddingAngle={3} dataKey="value">
                  {progressPieData.map((_, i) => <Cell key={i} fill={PROG_COLORS[i]}/>)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
              </PieChart>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                {progressPieData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PROG_COLORS[i] }}/>
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

      {/* Row 3: meetings + archive stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Meetings */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('Meetings')}</h3>
          {[
            { label: 'Total',              value: a.totalMeetings    ?? 0, color: '#6B7280' },
            { label: t('PendingMeetings_Stat'), value: a.pendingMeetings  ?? 0, color: '#F59E0B' },
            { label: t('Done'),            value: a.acceptedMeetings ?? 0, color: '#10B981' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </Card>

        {/* Archive / grades */}
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('Archive')}</h3>
          {[
            { label: t('ArchivedProjects_Stat'), value: a.archivedProjects ?? 0,          color: '#6B7280' },
            { label: t('OverallAverage'),        value: a.avgGrade ? `${a.avgGrade}/20` : '—', color: 'var(--primary)' },
            { label: t('Mentions_Stat'),         value: a.mentions ?? 0,                  color: '#8B5CF6' },
            { label: 'Taux de réussite',         value: `${advancedAnalytics?.performance?.pass_rate ?? 0}%`, color: '#10B981' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Advanced Analytics Section */}
      <div style={{ marginTop: '32px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IoBarChartOutline size={20} style={{ color: 'var(--primary)' }}/>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Analyses Avancées</h2>
        </div>
        <button 
          onClick={exportToCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
        >
          <IoDownloadOutline size={16}/> Exporter Rapport (CSV)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Tendances des Notes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={gradeTrendsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 20]}/>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px' }}/>
              <Line type="monotone" dataKey="grade" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} name="Moyenne"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Activité des Étudiants</h3>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PieChart width={160} height={160}>
              <Pie data={activeVsInactiveData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                <Cell fill="var(--primary)"/>
                <Cell fill="var(--border)"/>
              </Pie>
              <Tooltip/>
            </PieChart>
            <div style={{ flex: 1, paddingLeft: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Étudiants Actifs</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>{advancedAnalytics?.student_stats?.active ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Étudiants Inactifs</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-secondary)' }}>{advancedAnalytics?.student_stats?.inactive ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Patterns de Notation (Enseignants)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={teacherPatternsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/>
              <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80}/>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px' }}/>
              <Bar dataKey="grade" fill="var(--accent)" radius={[0, 4, 4, 0]} name="Moyenne donnée"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Tendances d'Utilisation du Système</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={usageTrendsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)"/>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px' }}/>
              <Bar dataKey="projects" fill="#10B981" radius={[4, 4, 0, 0]} name="Nouveaux Projets"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </DashboardLayout>
  );
}
