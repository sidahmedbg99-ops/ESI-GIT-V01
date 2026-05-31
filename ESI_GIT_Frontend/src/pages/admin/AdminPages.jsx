import { useState, useEffect } from 'react';
import {
  IoBarChartOutline, IoTrendingUpOutline, IoGlobeOutline,
  IoArrowBackOutline, IoSettingsOutline, IoSaveOutline,
  IoSchoolOutline, IoFolderOutline, IoPeopleOutline,
  IoMailOutline, IoCheckmarkOutline, IoDownloadOutline, IoTimeOutline,
  IoCloudDownloadOutline, IoSearchOutline, IoTrashOutline, IoAddOutline,
  IoRibbonOutline,
} from 'react-icons/io5';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import { useApi } from '../../hooks/useApi';
import ConfirmModal from '../../components/ui/ConfirmModal';

const data = [
  { month: 'Sep', projects: 120, submissions: 340 },
  { month: 'Oct', projects: 145, submissions: 420 },
  { month: 'Nov', projects: 162, submissions: 390 },
  { month: 'Déc', projects: 140, submissions: 280 },
  { month: 'Jan', projects: 170, submissions: 510 },
  { month: 'Fév', projects: 180, submissions: 620 },
];

export function AdminAnalytics() {
  const { t } = useLanguage();
  const { advancedAnalytics, analytics, groups, platformSettings } = useAdmin();
  const a = analytics || {};
  const adv = advancedAnalytics || {};
  const activeGroupsCount = groups?.filter(g => !g.archived && (g.status === 'active' || g.status === 'approved')).length ?? a.activeGroups ?? 0;
  const currentAcademicYear = platformSettings?.current_academic_year || '';
  const previousAcademicYear = (() => {
    if (!currentAcademicYear) return '';
    if (currentAcademicYear.includes('-')) {
      const [start] = currentAcademicYear.split('-', 1);
      const year = parseInt(start, 10);
      return Number.isNaN(year) ? '' : `${year - 1}-${year}`;
    }
    if (currentAcademicYear.includes('/')) {
      const [start] = currentAcademicYear.split('/', 1);
      const year = parseInt(start, 10);
      return Number.isNaN(year) ? '' : `${year - 1}/${year}`;
    }
    return '';
  })();

  const chartData = (adv.performance?.grade_trends ?? []).map(item => ({
    month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short' }),
    grade: item.avg_grade,
    projects: adv.usage_trends?.find(u => u.month === item.month)?.projects || 0
  }));

  const gradeTrendsData = (adv.performance?.grade_trends ?? []).map(item => ({
    month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short' }),
    grade: item.avg_grade,
  }));

  const usageTrendsData = (adv.usage_trends ?? []).map(item => ({
    month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short' }),
    projects: item.projects,
  }));

  const teacherPatternsData = (adv.teacher_patterns ?? []).map(tp => ({
    name: tp.last_name,
    grade: tp.avg_given,
  }));

  const groupsBySpecialtyData = (adv.specialty_groups ?? []).map(item => ({
    specialty: item.specialty || 'Autre',
    count: item.count,
  }));

  const statusLabelMap = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Refusé'
  };

  const projectStatusData = (adv.projects_by_status ?? []).map(item => ({
    status: item.status,
    name: statusLabelMap[item.status] || item.status,
    count: item.count,
  }));

  const activeVsInactiveData = [
    { name: 'Actifs', value: adv.student_stats?.active ?? 0 },
    { name: 'Inactifs', value: adv.student_stats?.inactive ?? 0 },
  ];

  const [studentSearch, setStudentSearch] = useState('');

  const exportToCSV = (type = 'summary') => {
    let headers, rows, filename;
    const studentsForYear = previousAcademicYear
      ? (adv.student_list || []).filter(s => s.academic_year === previousAcademicYear)
      : (adv.student_list || []);
    
    if (type === 'summary') {
      headers = ["Catégorie", "Valeur"];
      rows = [
        ["Étudiants Actifs", adv.student_stats?.active],
        ["Étudiants Inactifs", adv.student_stats?.inactive],
        ["Étudiants à Risque", adv.student_stats?.at_risk],
      ];
      filename = `rapport_analytique_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ["Nom Étudiant", "Projet", "Encadreur", "Note"];
      rows = studentsForYear.map(s => [
        s.student_name,
        s.project_name,
        s.supervisor,
        s.grade
      ]);
      filename = `liste_etudiants_notes_${new Date().toISOString().split('T')[0]}.csv`;
    }

    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const yearAlternatives = previousAcademicYear
    ? [
        previousAcademicYear,
        previousAcademicYear.includes('-')
          ? previousAcademicYear.replace('-', '/')
          : previousAcademicYear.replace('/', '-')
      ]
    : [];

  const studentsForPreviousYear = previousAcademicYear
    ? (adv.student_list || []).filter(s => yearAlternatives.includes(s.academic_year))
    : (adv.student_list || []);

  const filteredStudents = studentsForPreviousYear.filter(s => 
    s.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.project_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.supervisor?.toLowerCase().includes(studentSearch.toLowerCase())
  );


  return (
    <DashboardLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('PlatformAnalytics')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ConsolidatedData')}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="outline" onClick={() => exportToCSV('summary')} icon={<IoDownloadOutline size={18}/>}>{t('Summary')}</Button>
          <Button onClick={() => exportToCSV('students')} icon={<IoCloudDownloadOutline size={18}/>}>{t('StudentList')}</Button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: t('Active_Stat'),          value: activeGroupsCount, icon: <IoBarChartOutline size={22}/>, color: 'var(--primary)' },
          { label: t('StudentsAtRisk'),      value: adv.student_stats?.at_risk || 0, icon: <IoPeopleOutline size={22}/>, color: '#EF4444' },
        ].map((s, i) => <div key={i}><StatCard {...s} /></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('GradeTrends')}</h3>
          <ResponsiveContainer width="100%" height={250}>
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
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('StudentActivity')}</h3>
          <div style={{ display: 'flex', alignItems: 'center', height: '250px' }}>
            <PieChart width={200} height={200}>
              <Pie data={activeVsInactiveData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                <Cell fill="var(--primary)"/>
                <Cell fill="var(--border)"/>
              </Pie>
              <Tooltip/>
            </PieChart>
            <div style={{ flex: 1, paddingLeft: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Étudiants Actifs</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{adv.student_stats?.active ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Étudiants Inactifs</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-secondary)' }}>{adv.student_stats?.inactive ?? 0}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('GroupesPerSpecialty') || 'Groupes par spécialité'}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={groupsBySpecialtyData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)"/>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis dataKey="specialty" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120}/>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px' }}/>
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Groupes"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('ProjectStatus') || 'État des projets'}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={projectStatusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}>
                {projectStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B'][index % 3]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px' }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {projectStatusData.map((item) => (
              <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>{item.name}</span>
                <span>{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('NotationPatterns')}</h3>
          <ResponsiveContainer width="100%" height={250}>
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
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('UsageTrends')}</h3>
          <ResponsiveContainer width="100%" height={250}>
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

      <Card style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('StudentList')} & {t('Grades')}</h3>
          <div style={{ width: '300px' }}>
            <Input 
              placeholder={t('Search') + "..."} 
              value={studentSearch} 
              onChange={e => setStudentSearch(e.target.value)}
              icon={<IoSearchOutline size={18}/>}
            />
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Student')}</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Project')}</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Supervisor')}</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>{t('Grade')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? filteredStudents.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{s.student_name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{s.project_name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{s.supervisor}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: s.grade !== '—' ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {s.grade !== '—' ? (typeof s.grade === 'number' ? s.grade.toFixed(2) : s.grade) : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('NoResults')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}


// ─────────────────────────────────────────────────────────
// Each setting panel rendered inline when a card is clicked
// ─────────────────────────────────────────────────────────

function PanelYears({ onBack }) {
  const { t } = useLanguage();
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const [year, setYear] = useState(platformSettings?.current_academic_year || '2024-2025');
  const [types, setTypes] = useState(platformSettings?.project_types ? platformSettings.project_types.split(',') : ['PFE', 'Stage', 'Projet']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (platformSettings) {
      setYear(platformSettings.current_academic_year);
      setTypes(platformSettings.project_types ? platformSettings.project_types.split(',') : ['PFE', 'Stage', 'Projet']);
    }
  }, [platformSettings]);

  const save = async () => {
    if (year !== platformSettings?.current_academic_year) {
      // Logic handled via handleYearChange
      handleYearChange();
      return;
    }
    setLoading(true);
    await updatePlatformSettings({ current_academic_year: year, project_types: types.join(',') });
    setLoading(false);
  };

  const handleYearChange = () => {
    window.showConfirm({
      title: "Changer l'année ?",
      message: "Changer l'année académique va ARCHIVER tous les projets actuels. Cette action est irréversible.",
      confirmText: "Changer & Archiver",
      type: "warning",
      onConfirm: async () => {
        setLoading(true);
        await updatePlatformSettings({ current_academic_year: year, project_types: types.join(',') });
        setLoading(false);
      }
    });
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>🎓 {t('AcademicYears')} & Types</h2>
      </div>
      <div style={{ maxWidth: 420 }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{t('ActiveYear')}</label>
        <Input value={year} onChange={e => setYear(e.target.value)} placeholder="ex: 2024-2025" style={{ marginBottom: '16px' }} />
        
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Types de Projet</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {types.map(p => (
            <div key={p} style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {p}
              <button onClick={() => setTypes(pr => pr.filter(x => x !== p))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button onClick={() => { 
            window.showPrompt({
              title: "Nouveau type",
              message: "Entrez le nom du type (ex: Master)",
              onConfirm: (v) => { if (v) setTypes(p => [...p, v.trim()]); }
            });
          }} style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px dashed var(--border)', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--text-muted)' }}>+ Ajouter</button>
        </div>
        
        <Button onClick={save} loading={loading} icon={<IoSaveOutline size={16}/>}>
          {t('Save')}
        </Button>
        <div style={{ marginTop: '16px', padding: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
          {t('ChangeYearWarning')}
        </div>
      </div>
    </Card>
  );
}

function PanelCategories() {
  const { t } = useLanguage();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const loadCats = async () => {
    try {
      const { data } = await client.get(ENDPOINTS.admin.specialties);
      setCats(Array.isArray(data) ? data : []);
    } catch (e) { toast.error("Erreur chargement spécialités"); }
  };

  useEffect(() => { loadCats(); }, []);

  const handleAdd = async (name) => {
    try {
      await client.post(ENDPOINTS.admin.specialties, { name });
      loadCats();
      toast.success("Spécialité ajoutée");
    } catch (e) { toast.error("Erreur lors de l'ajout"); }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(ENDPOINTS.admin.specialtyDetail(id));
      loadCats();
      toast.success("Supprimée");
    } catch (e) { toast.error("Erreur lors de la suppression"); }
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📂 {t('SpecialtiesThemes')}</h2>
      </div>
      <div style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {cats.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
              <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <Input id="catInput" placeholder={`${t('NewTask').split(' ')[1]}...`} style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => { const el = document.getElementById('catInput'); if (el?.value.trim()) { handleAdd(el.value.trim()); el.value = ''; } }}>{t('AddUser').split(' ')[0]}</Button>
        </div>
      </div>
    </Card>
  );
}





function PanelVisibility() {
  const { t } = useLanguage();
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const [local, setLocal] = useState({});

  useEffect(() => { 
    if (platformSettings) setLocal(platformSettings); 
  }, [platformSettings]);

  const toggle = (key) => {
    const newVal = !local[key];
    const updated = { ...local, [key]: newVal };
    setLocal(updated);
    updatePlatformSettings({ [key]: newVal });
  };

  const toggleStyle = (active) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: active ? 'var(--primary)' : 'var(--border)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  });

  const circleStyle = (active) => ({
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: '3px',
    left: active ? '22px' : '3px',
    transition: 'all 0.2s'
  });

  const getCriteria = (role) => {
    try {
      const raw = local?.evaluation_criteria;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const res = parsed?.[role] || [];
      return Array.isArray(res) ? res : [];
    } catch(e) { return []; }
  };

  const updateRoleCriteria = (role, newCriteria) => {
    try {
      const raw = local?.evaluation_criteria;
      const allCriteria = typeof raw === 'string' ? JSON.parse(raw) : { ...(raw || {}) };
      allCriteria[role] = newCriteria;
      const jsonStr = JSON.stringify(allCriteria);
      setLocal({ ...local, evaluation_criteria: jsonStr });
      updatePlatformSettings({ evaluation_criteria: jsonStr });
    } catch(e) { console.error(e); }
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👁️ {t('VisibilityAccess')}</h2>
      </div>
      <div style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          {[
            { key: 'students_can_see_archived_projects', label: t('ShowArchiveStudents'), desc: t('ShowArchiveStudents_Desc') },
            { key: 'hide_jury_from_jury', label: 'Masquer les informations du jury pour les jurés', desc: 'Les membres du jury ne verront pas les notes des autres jurés' },
          ].map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
              <div style={{ flex: 1, marginRight: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{s.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.desc}</p>
              </div>
              <div onClick={() => toggle(s.key)} style={toggleStyle(local[s.key])}>
                <div style={circleStyle(local[s.key])} />
              </div>
            </div>
          ))}
        </div>

        {/* Email de contact */}
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
            E-mail de contact (Mot de passe oublié)
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Cette adresse sera affichée dans la boîte de dialogue d'aide.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="email"
              value={local.contact_email || ''}
              onChange={(e) => setLocal({ ...local, contact_email: e.target.value })}
              placeholder="Ex: aced@esi.dz"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => updatePlatformSettings({ contact_email: local.contact_email })}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              {t('Save') || 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PanelGradingFormula() {
  const { t } = useLanguage();
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const [formulas, setFormulas] = useState([]);
  const [newFormula, setNewFormula] = useState({ name: '', expression: '', description: '' });
  const [weights, setWeights] = useState({
    presentation: platformSettings?.presentation_weight || 20,
    document: platformSettings?.document_weight || 30,
    demo: platformSettings?.demo_weight || 50
  });
  const [roleWeights, setRoleWeights] = useState({
    president: platformSettings?.president_weight || 40,
    supervisor: platformSettings?.supervisor_weight || 40,
    other: platformSettings?.other_weight || 20
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (platformSettings) {
      setWeights({
        presentation: platformSettings.presentation_weight,
        document: platformSettings.document_weight,
        demo: platformSettings.demo_weight
      });
      setRoleWeights({
        president: platformSettings.president_weight || 0,
        supervisor: platformSettings.supervisor_weight || 0,
        other: platformSettings.other_weight || 0
      });
    }
  }, [platformSettings]);

  const loadFormulas = async () => {
    try {
      const { data } = await client.get(ENDPOINTS.admin.gradeFormula);
      setFormulas(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (e) {
      setLoadError('Impossible de charger les formules. Vérifiez la connexion au serveur.');
    }
  };

  useEffect(() => { loadFormulas(); }, []);

  const handleCreate = async () => {
    if (!newFormula.name || !newFormula.expression) return toast.error("Nom et expression requis");
    setLoading(true);
    try {
      await client.post(ENDPOINTS.admin.gradeFormula, {
        name: newFormula.name,
        expression: newFormula.expression,
        description: newFormula.description
      });
      toast.success("Formule ajoutée");
      setNewFormula({ name: '', expression: '', description: '' });
      loadFormulas();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur de création");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await client.patch(ENDPOINTS.admin.gradeFormulaActivate(id));
      toast.success("Formule activée");
      loadFormulas();
    } catch (err) {
      toast.error("Erreur d'activation");
    }
  };

  const saveWeights = async () => {
    const total = parseInt(weights.presentation) + parseInt(weights.document) + parseInt(weights.demo);
    if (total !== 100) return toast.error(`Le total doit être 100% (actuel: ${total}%)`);
    
    setLoading(true);
    await updatePlatformSettings({
      presentation_weight: parseInt(weights.presentation),
      document_weight: parseInt(weights.document),
      demo_weight: parseInt(weights.demo)
    });
    setLoading(false);
  };

  const getCriteria = (role) => {
    try {
      const raw = platformSettings?.evaluation_criteria;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const res = parsed?.[role] || [];
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  };

  const updateRoleCriteria = async (role, newCriteria) => {
    try {
      const raw = platformSettings?.evaluation_criteria;
      const allCriteria = typeof raw === 'string' ? JSON.parse(raw) : { ...(raw || {}) };
      allCriteria[role] = newCriteria;
      const jsonStr = JSON.stringify(allCriteria);
      await updatePlatformSettings({ evaluation_criteria: jsonStr });
    } catch (e) {
      console.error(e);
    }
  };

  const saveRoleWeights = async () => {
    const total = parseInt(roleWeights.president) + parseInt(roleWeights.supervisor) + parseInt(roleWeights.other);
    if (total !== 100) return toast.error(`Le total doit être 100% (actuel: ${total}%)`);
    
    setLoading(true);
    await updatePlatformSettings({
      president_weight: parseInt(roleWeights.president),
      supervisor_weight: parseInt(roleWeights.supervisor),
      other_weight: parseInt(roleWeights.other)
    });
    setLoading(false);
  };

  return (
    <Card>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📊 {t('GradingFormula')}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('FeaturesSubtitle')}</p>
      </div>

      {/* Role-Based Evaluation Criteria */}
      <div style={{ marginBottom: '32px', padding: '20px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
          📋 Critères d'évaluation par rôle du jury
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {['president', 'supervisor', 'examiner'].map((role) => {
            const criteria = getCriteria(role);
            return (
              <div key={role} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'capitalize' }}>
                    {role === 'president' ? 'Président' : role === 'supervisor' ? 'Encadreur' : 'Examinateur'}
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                    Total: {criteria.reduce((sum, c) => sum + (parseInt(c.weight) || 0), 0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {criteria.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={c.name || ''}
                        onChange={(e) => {
                          const next = [...criteria];
                          next[i] = { ...next[i], name: e.target.value };
                          updateRoleCriteria(role, next);
                        }}
                        placeholder="Nom du critère"
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'var(--bg)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="number"
                        value={c.weight || 0}
                        onChange={(e) => {
                          const next = [...criteria];
                          next[i] = { ...next[i], weight: parseInt(e.target.value, 10) || 0 };
                          updateRoleCriteria(role, next);
                        }}
                        style={{ width: '75px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', textAlign: 'center', background: 'var(--bg)', color: 'var(--text-primary)' }}
                      />
                      <button
                        onClick={() => updateRoleCriteria(role, criteria.filter((_, idx) => idx !== i))}
                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateRoleCriteria(role, [...criteria, { name: 'Nouveau critère', weight: 0 }])}
                    style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '8px', padding: '10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    + Ajouter un critère
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Weights */}
      <div style={{ marginBottom: '32px', padding: '20px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚖️ Pondération par rôle du jury
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Président (%)</label>
            <Input type="number" value={roleWeights.president} onChange={e => setRoleWeights({...roleWeights, president: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Encadreur (%)</label>
            <Input type="number" value={roleWeights.supervisor} onChange={e => setRoleWeights({...roleWeights, supervisor: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Autre membre (%)</label>
            <Input type="number" value={roleWeights.other} onChange={e => setRoleWeights({...roleWeights, other: e.target.value})} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: (parseInt(roleWeights.president)+parseInt(roleWeights.supervisor)+parseInt(roleWeights.other)) === 100 ? 'var(--success)' : '#EF4444', fontWeight: 600 }}>
            Total: {parseInt(roleWeights.president || 0) + parseInt(roleWeights.supervisor || 0) + parseInt(roleWeights.other || 0)}%
          </p>
          <Button size="sm" onClick={saveRoleWeights} loading={loading} icon={<IoSaveOutline size={14}/>}>Sauvegarder pondération rôles</Button>
        </div>
      </div>
    </Card>
  );
}

const PANELS = { years: PanelYears, categories: PanelCategories, grading: PanelGradingFormula, visibility: PanelVisibility };

const MENUS = [
  { id: 'years',       title: '🎓 Années académiques',      desc: 'Gérer les années et promotions actives',    icon: <IoSchoolOutline size={22}/> },
  { id: 'categories',  title: '📂 Spécialités & Thèmes',    desc: 'Gérer les spécialités académiques',         icon: <IoFolderOutline size={22}/> },
  { id: 'grading',     title: '📊 Formule de calcul',       desc: 'Définir la formule de calcul des moyennes', icon: <IoBarChartOutline size={22}/> },
  { id: 'visibility',  title: '👁️ Visibilité',              desc: 'Contrôler l\'affichage des archives et jurys', icon: <IoSettingsOutline size={22}/> },
];

export function AdminSettings() {
  const { t } = useLanguage();
  const [activeMenu, setActiveMenu] = useState('years');
  const [modal, setModal] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: () => {}, initialValue: '' });

  // Expose modal globally for child panels
  useEffect(() => {
    window.showConfirm = (cfg) => setModal({ ...cfg, isOpen: true, type: cfg.type || 'warning' });
    window.showPrompt = (cfg) => setModal({ ...cfg, isOpen: true, type: 'prompt' });
    return () => { delete window.showConfirm; delete window.showPrompt; };
  }, []);

  const Panel = PANELS[activeMenu];

  const menuStyle = (id) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: activeMenu === id ? 'var(--primary)' : 'transparent',
    color: activeMenu === id ? '#fff' : 'var(--text-secondary)',
    marginBottom: '4px',
    fontWeight: activeMenu === id ? 600 : 500,
    fontSize: '14px',
    border: 'none',
    width: '100%',
    textAlign: 'left'
  });

  return (
    <DashboardLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Sidebar */}
        <aside style={{ position: 'sticky', top: '20px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>{t('Settings')}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configuration plateforme</p>
          </div>
          
          <nav>
            {MENUS.map(m => (
              <button key={m.id} onClick={() => setActiveMenu(m.id)} style={menuStyle(m.id)}>
                <span style={{ display: 'flex', opacity: activeMenu === m.id ? 1 : 0.7 }}>{m.icon}</span>
                {m.title.split(' ').slice(1).join(' ')}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: '40px', padding: '16px', borderRadius: '16px', background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', textTransform: 'uppercase' }}>Besoin d'aide ?</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Consultez la documentation pour configurer les paramètres avancés de la plateforme.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ minHeight: '600px', animation: 'fadeIn 0.3s ease-out' }}>
          <Panel onBack={() => {}} />
        </main>

      </div>

      <ConfirmModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={(val) => {
          modal.onConfirm(val);
          setModal({ ...modal, isOpen: false });
        }}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        confirmText={modal.confirmText}
        initialValue={modal.initialValue}
        loading={modal.loading}
      />
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardLayout>
  );
}
