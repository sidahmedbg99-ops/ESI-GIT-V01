import { useState, useEffect } from 'react';
import {
  IoBarChartOutline, IoTrendingUpOutline, IoGlobeOutline,
  IoArrowBackOutline, IoSettingsOutline, IoSaveOutline,
  IoSchoolOutline, IoFolderOutline, IoPeopleOutline,
  IoMailOutline, IoCheckmarkOutline, IoDownloadOutline, IoTimeOutline,
  IoCloudDownloadOutline, IoSearchOutline,
  IoAddOutline, IoTrashOutline, IoFlashOutline, IoCheckmarkCircleOutline,
  IoArrowForwardOutline,
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
  const { advancedAnalytics, analytics } = useAdmin();
  const a = analytics || {};
  const adv = advancedAnalytics || {};

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

  const activeVsInactiveData = [
    { name: t('ActiveStudentsChart'), value: adv.student_stats?.active ?? 0 },
    { name: t('InactiveStudentsChart'), value: adv.student_stats?.inactive ?? 0 },
  ];

  const [studentSearch, setStudentSearch] = useState('');
  const [studentLevel, setStudentLevel] = useState('');

  const exportToCSV = (type = 'summary') => {
    let headers, rows, filename;
    
    if (type === 'summary') {
      headers = ["Catégorie", "Valeur"];
      rows = [
        ["Étudiants Actifs", adv.student_stats?.active],
        ["Étudiants Inactifs", adv.student_stats?.inactive],
        ["Étudiants à Risque", adv.student_stats?.at_risk],
        [t('SuccessRate'), `${adv.performance?.pass_rate}%`],
        [t('FailRate'), `${adv.performance?.fail_rate}%`],
      ];
      filename = `rapport_analytique_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ["Matricule", "Nom Étudiant", "Email", "Niveau", "Projet", "Encadreur", "Note"];
      rows = (adv.student_list || []).filter(s => !currentYear || s.academic_year === currentYear).map(s => [
        s.cid || '—',
        s.student_name,
        s.email || '—',
        levelLabelMap[s.level] || '—',
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

  const { platformSettings } = useAdmin();
  const currentYear = platformSettings?.current_academic_year || '';
  const levelLabelMap = { 2:'2CPI', 3:'1CS', 4:'2CS', 5:'3CS' };
  const filteredStudents = (adv.student_list || []).filter(s => {
    const matchSearch = s.student_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.project_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.supervisor?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchYear = !currentYear || s.academic_year === currentYear;
    const matchLevel = !studentLevel || String(s.level) === studentLevel;
    return matchSearch && matchYear && matchLevel;
  });


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
          { label: t('Active_Stat'),     value: a.activeGroups || 0,                icon: <IoBarChartOutline size={22}/>,  color: 'var(--primary)' },
          { label: t('SuccessRate'),     value: adv.performance?.pass_rate || 0,   icon: <IoTrendingUpOutline size={22}/>, color: '#10B981', suffix: '%' },
          { label: t('FailRate'),        value: adv.performance?.fail_rate || 0,   icon: <IoGlobeOutline size={22}/>,     color: '#F59E0B', suffix: '%' },
          { label: t('StudentsAtRisk'), value: adv.student_stats?.at_risk || 0,   icon: <IoPeopleOutline size={22}/>,    color: '#EF4444' },
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
              <Line type="monotone" dataKey="grade" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} name={t('AverageLabel')}/>
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
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('ActiveStudents_label')}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{adv.student_stats?.active ?? 0}</p>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('InactiveStudents_label')}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-secondary)' }}>{adv.student_stats?.inactive ?? 0}</p>
              </div>
            </div>
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
              <Bar dataKey="grade" fill="var(--accent)" radius={[0, 4, 4, 0]} name={t('AvgGradeGiven')}/>
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
              <Bar dataKey="projects" fill="#10B981" radius={[4, 4, 0, 0]} name={t('NewProjects')}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card style={{ marginTop: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{t('StudentList')} & {t('Grades')} {currentYear && <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>— {currentYear}</span>}</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={studentLevel} onChange={e => setStudentLevel(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1.5px solid var(--border)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="">Tous les niveaux</option>
              <option value="2">2CPI</option>
              <option value="3">1CS</option>
              <option value="4">2CS</option>
              <option value="5">3CS</option>
            </select>
            <div style={{ width: '240px' }}>
              <Input 
                placeholder={t('Search') + "..."}
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                icon={<IoSearchOutline size={18}/>}
              />
            </div>
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Student')}</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Level')}</th>
                {studentLevel !== '2' && <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Specialite')}</th>}
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Project')}</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{t('Supervisor')}</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>{t('Grade')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? filteredStudents.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{s.student_name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{levelLabelMap[s.level] || '—'}</td>
                  {studentLevel !== '2' && <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{s.level === 2 ? '—' : (s.specialty || '—')}</td>}
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{s.project_name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{s.supervisor}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: s.grade !== '—' ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {s.grade !== '—' ? (typeof s.grade === 'number' ? s.grade.toFixed(2) : s.grade) : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('NoResults')}</td>
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
      handleYearChange();
      return;
    }
    setLoading(true);
    await updatePlatformSettings({ current_academic_year: year, project_types: types.join(',') });
    setLoading(false);
  };

  const handleYearChange = () => {
    window.showConfirm({
      title: t('ChangeYearTitle'),
      message: t('ChangeYearMsg'),
      confirmText: t('ChangeAndArchive'),
      type: "warning",
      onConfirm: async () => {
        setLoading(true);
        await updatePlatformSettings({ current_academic_year: year, project_types: types.join(',') });
        setLoading(false);
      }
    });
  };

  const handleAdvanceYear = () => {
    window.showConfirm({
      title: t('CloseYearAdvance'),
      message: `${t('AdvanceYearConfirmPre')} ${platformSettings?.current_academic_year} ${t('AdvanceYearConfirmPost')}`,
      confirmText: t('Confirm'),
      type: 'warning',
      onConfirm: () => {
        setLoading(true);
        client.post(ENDPOINTS.admin.advanceYear)
          .then(res => {
            toast.success(res.data.message);
            updatePlatformSettings({});
          })
          .catch(e => toast.error(e?.response?.data?.error || t('Error')))
          .finally(() => setLoading(false));
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
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
          {platformSettings?.current_academic_year || '—'}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>🔁 {t('CloseYearAdvance')}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {t('CloseYearDesc')}
          </p>
          <Button variant="danger" loading={loading} icon={<IoArrowForwardOutline size={16}/>} onClick={handleAdvanceYear}>
            {t('CloseYearAdvance')}
          </Button>
        </div>

      </div>
    </Card>
  );
}

function PanelCategories() {
  const { t } = useLanguage();
  const { reloadSpecialties } = useAdmin();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const loadCats = async () => {
    try {
      const { data } = await client.get(ENDPOINTS.admin.specialties);
      setCats(Array.isArray(data) ? data : []);
    } catch (e) { console.error('loadCats failed', e); }
  };

  useEffect(() => { loadCats(); }, []);

  const handleAdd = async (name, full_name) => {
    try {
      await client.post(ENDPOINTS.admin.specialties, { name, full_name: full_name || name });
      await loadCats();
      reloadSpecialties();
      toast.success(t('SpecialtyAdded'));
    } catch (e) {
    console.error('FULL ERROR:', e?.response?.status, e?.response?.data);
    toast.error(e?.response?.data?.error || "Erreur lors de l'ajout");
  }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(ENDPOINTS.admin.specialtyDetail(id));
      await loadCats();
      reloadSpecialties();
      toast.success(t('SpecialtyDeleted'));
    } catch (e) {
    console.error('FULL ERROR:', e?.response?.status, e?.response?.data);
    toast.error(e?.response?.data?.error || "Erreur lors de la suppression");
  }
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
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{c.name}</span>
                {c.full_name && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>{c.full_name}</span>}
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <Input id="catInputName" placeholder={t('AbbrevPlaceholder')} style={{ flex: 1 }} />
          <Input id="catInputFull" placeholder={t('FullNamePlaceholder')} style={{ flex: 2 }} />
          <Button variant="ghost" onClick={() => { 
            const nameEl = document.getElementById('catInputName');
            const fullEl = document.getElementById('catInputFull');
            if (nameEl?.value.trim() && fullEl?.value.trim()) { 
              handleAdd(nameEl.value.trim(), fullEl.value.trim()); 
              nameEl.value = ''; 
              fullEl.value = ''; 
            } else if (nameEl?.value.trim()) {
              handleAdd(nameEl.value.trim(), '');
              nameEl.value = '';
            }
          }}>{t('AddUser').split(' ')[0]}</Button>
        </div>
      </div>
    </Card>
  );
}





function PanelVisibility() {
  const { t } = useLanguage();
  const { platformSettings, updatePlatformSettings, reloadSpecialties } = useAdmin();
  const [local, setLocal] = useState(platformSettings || {});

  useEffect(() => { setLocal(platformSettings || {}); }, [platformSettings]);

  const toggle = (key) => {
    const newVal = !local[key];
    setLocal(prev => ({ ...prev, [key]: newVal }));
    updatePlatformSettings({ [key]: newVal });
  };

  const toggleStyle = (active) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: active ? 'var(--primary)' : 'var(--border)',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s'
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

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👁️ {t('VisibilityAccess')}</h2>
      </div>
      <div style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { key: 'students_can_see_archived_projects', label: t('ShowArchiveStudents'), desc: t('ShowArchiveStudents_Desc') },
            { key: 'students_can_see_attachments', label: t('DeliverableVisible'), desc: t('DeliverableVisible_Desc') },
            { key: 'jury_page_visible', label: t('JuryPageVisible') || 'Enable jury page for teachers', desc: 'Teachers can access the jury grading page' },
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

        {/* Email de contact pour mot de passe oublié */}
        <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', marginTop: '8px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
            {t('SystemEmail') || 'System Email'}
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {t('SystemEmailDesc') || 'Used as the sender address for account credentials, password resets and system notifications'}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="email"
              value={local.contact_email || ''}
              onChange={(e) => setLocal({ ...local, contact_email: e.target.value })}
              placeholder="Ex: aced@esi-sba.dz"
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

        {/* Group lock deadline */}
        <div style={{ padding: '16px', borderRadius: '12px', border: '1.5px solid #F59E0B', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', marginTop: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: '#92400E' }}>
            {t('GroupLockDeadline')}
          </label>
          <p style={{ fontSize: '12px', color: '#78350F', marginBottom: '12px' }}>
            {t('GroupLockDeadlineDesc')}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={local.group_lock_deadline || ''}
              onChange={(e) => setLocal(prev => ({ ...prev, group_lock_deadline: e.target.value }))}
              style={{
                flex: 1,
                minWidth: '160px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #F59E0B',
                background: '#fff',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => updatePlatformSettings({ group_lock_deadline: local.group_lock_deadline || null })}
              style={{ padding: '10px 16px', borderRadius: '10px', background: '#F59E0B', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              {t('Save')}
            </button>
            {local.group_lock_deadline && (
              <button
                onClick={() => {
                  setLocal(prev => ({ ...prev, group_lock_deadline: '' }));
                  updatePlatformSettings({ group_lock_deadline: null });
                }}
                style={{ padding: '10px 14px', borderRadius: '10px', background: 'transparent', color: '#92400E', border: '1px solid #F59E0B', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                {t('Delete')}
              </button>
            )}
          </div>
          {local.group_lock_deadline && (
            <p style={{ fontSize: '11px', color: '#92400E', marginTop: '8px', fontWeight: 600 }}>
              {t('LockActiveFrom')} {new Date(local.group_lock_deadline + 'T00:00:00').toLocaleDateString('fr-DZ')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function PanelGradingFormula() {
  const { t } = useLanguage();
  const [formulas, setFormulas]       = useState([]);
  const [loadError, setLoadError]     = useState('');
  const [saving, setSaving]           = useState(false);

  // --- create form state ---
  const [formulaName, setFormulaName]         = useState('');
  const [formulaDesc, setFormulaDesc]         = useState('');
  const [components, setComponents]           = useState([{ label: '', coef: 1 }]);
  const [expression, setExpression]           = useState('');
  const [exprManuallyEdited, setExprManuallyEdited] = useState(false);

  // auto-generate expression from components whenever they change
  useEffect(() => {
    if (exprManuallyEdited) return;
    const valid = components.filter(c => c.label.trim() && Number(c.coef) > 0);
    if (valid.length === 0) { setExpression(''); return; }
    const totalCoef = valid.reduce((s, c) => s + Number(c.coef), 0);
    const terms = valid.map((c, i) => `g${i + 1}*${c.coef}`).join(' + ');
    setExpression(`(${terms}) / ${totalCoef}`);
  }, [components, exprManuallyEdited]);

  const addComponent    = () => setComponents(p => [...p, { label: '', coef: 1 }]);
  const removeComponent = (i) => setComponents(p => p.filter((_, idx) => idx !== i));
  const updateComponent = (i, field, val) => {
    setComponents(p => p.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
    setExprManuallyEdited(false); // re-trigger auto-gen on component change
  };

  const loadFormulas = async () => {
    try {
      const { data } = await client.get(ENDPOINTS.admin.gradeFormula);
      setFormulas(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch {
      setLoadError(t('Error'));
    }
  };
  useEffect(() => { loadFormulas(); }, []);

  const handleCreate = async () => {
    if (!formulaName.trim()) return toast.error(t('fieldsRequired'));
    if (!expression.trim())  return toast.error(t('fieldsRequired'));
    const validComponents = components.filter(c => c.label.trim());
    if (validComponents.length === 0) return toast.error(t('fieldsRequired'));

    const labels = {};
    validComponents.forEach((c, i) => { labels[`g${i + 1}`] = c.label.trim(); });

    setSaving(true);
    try {
      await client.post(ENDPOINTS.admin.gradeFormula, {
        name: formulaName.trim(),
        expression: expression.trim(),
        labels,
        description: formulaDesc.trim(),
      });
      toast.success(t('Saved'));
      setFormulaName(''); setFormulaDesc('');
      setComponents([{ label: '', coef: 1 }]);
      setExpression(''); setExprManuallyEdited(false);
      loadFormulas();
    } catch (err) {
      toast.error(err.response?.data?.error || t('Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await client.patch(ENDPOINTS.admin.gradeFormulaActivate(id));
      toast.success(t('Saved'));
      loadFormulas();
    } catch {
      toast.error(t('Error'));
    }
  };

  const ROW = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' };
  const LABEL_STYLE = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' };

  return (
    <Card>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>📊 {t('GradingFormula')}</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>{t('FeaturesSubtitle')}</p>

      {/* ── Create formula ── */}
      <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: '32px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '18px' }}>➕ {t('AddUser').replace('User','Formula') || 'New formula'}</h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={LABEL_STYLE}>{t('Name') || 'Name'}</label>
            <Input value={formulaName} onChange={e => setFormulaName(e.target.value)} placeholder="e.g. PFE 2025" />
          </div>
          <div>
            <label style={LABEL_STYLE}>{t('Description') || 'Description'} ({t('Optional') || 'optional'})</label>
            <Input value={formulaDesc} onChange={e => setFormulaDesc(e.target.value)} placeholder="e.g. Final year formula" />
          </div>
        </div>

        {/* Components */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...LABEL_STYLE, marginBottom: '10px' }}>{t('Components') || 'Grade components'}</label>
          {components.map((c, i) => (
            <div key={i} style={ROW}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                g{i + 1}
              </div>
              <Input
                value={c.label}
                onChange={e => updateComponent(i, 'label', e.target.value)}
                placeholder={`e.g. Oral defense`}
                style={{ flex: 2 }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('Coefficient') || 'Coef.'}</label>
                <input
                  type="number" min="0" step="0.1"
                  value={c.coef}
                  onChange={e => updateComponent(i, 'coef', e.target.value)}
                  style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'center' }}
                />
              </div>
              {components.length > 1 && (
                <button onClick={() => removeComponent(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px', borderRadius: '6px', flexShrink: 0 }}>
                  <IoTrashOutline size={16} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addComponent} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px dashed var(--border)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
            <IoAddOutline size={16} /> {t('Add') || 'Add component'}
          </button>
        </div>

        {/* Expression */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <label style={LABEL_STYLE}>{t('Expression') || 'Expression'}</label>
            {exprManuallyEdited && (
              <button onClick={() => setExprManuallyEdited(false)} style={{ fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                ↺ {t('Reset') || 'Auto-generate'}
              </button>
            )}
          </div>
          <input
            value={expression}
            onChange={e => { setExpression(e.target.value); setExprManuallyEdited(true); }}
            placeholder="e.g. (g1*4 + g2*3 + g3*3) / 10"
            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${exprManuallyEdited ? 'var(--accent)' : 'var(--border)'}`, background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
            {exprManuallyEdited ? '✏️ Manually edited' : '⚡ Auto-generated from components'}
          </p>
        </div>

        <Button onClick={handleCreate} loading={saving} icon={<IoSaveOutline size={14}/>}>{t('Save')}</Button>
      </div>

      {/* ── Saved formulas ── */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>📋 {t('SavedFormulas') || 'Saved formulas'}</h4>
        {loadError && <p style={{ color: '#EF4444', fontSize: '13px' }}>{loadError}</p>}
        {formulas.length === 0 && !loadError && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '16px', borderRadius: '10px', background: 'var(--bg)', border: '1px dashed var(--border)', textAlign: 'center' }}>
            {t('NoFormulas') || 'No formulas yet'}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {formulas.map(f => (
            <div key={f.id} style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg)', border: `1.5px solid ${f.is_active ? 'var(--primary)' : 'var(--border)'}`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700 }}>{f.name}</span>
                  {f.is_active && (
                    <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-subtle)', padding: '2px 8px', borderRadius: '20px' }}>
                      <IoFlashOutline size={10} style={{ marginRight: '3px' }} />{t('Active') || 'ACTIVE'}
                    </span>
                  )}
                </div>
                {!f.is_active && (
                  <Button size="sm" variant="ghost" onClick={() => handleActivate(f.id)} icon={<IoCheckmarkCircleOutline size={14}/>}>
                    {t('Activate') || 'Activate'}
                  </Button>
                )}
              </div>
              <code style={{ display: 'block', fontSize: '12px', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--accent)', marginBottom: '10px', fontFamily: 'monospace' }}>
                {f.expression}
              </code>
              {f.labels && Object.keys(f.labels).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(f.labels).map(([key, label]) => (
                    <span key={key} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontWeight: 600 }}>
                      {key}: {label}
                    </span>
                  ))}
                </div>
              )}
              {f.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>{f.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

const PANELS = { years: PanelYears, categories: PanelCategories, grading: PanelGradingFormula, visibility: PanelVisibility };

export function AdminSettings() {
  const { t } = useLanguage();
  const MENUS = [
    { id: 'years',       label: t('AcademicYears'),      icon: <IoSchoolOutline size={22}/> },
    { id: 'categories',  label: t('SpecialtiesThemes'),  icon: <IoFolderOutline size={22}/> },
    { id: 'grading',     label: t('GradingFormula'),     icon: <IoBarChartOutline size={22}/> },
    { id: 'visibility',  label: t('VisibilityAccess'),   icon: <IoSettingsOutline size={22}/> },
  ];
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
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('PlatformConfig')}</p>
          </div>
          
          <nav>
            {MENUS.map(m => (
              <button key={m.id} onClick={() => setActiveMenu(m.id)} style={menuStyle(m.id)}>
                <span style={{ display: 'flex', opacity: activeMenu === m.id ? 1 : 0.7 }}>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: '40px', padding: '16px', borderRadius: '16px', background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', textTransform: 'uppercase' }}>{t('NeedHelp')}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('HelpDesc')}
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