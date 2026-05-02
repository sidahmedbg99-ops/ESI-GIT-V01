import { useState, useEffect } from 'react';
import {
  IoBarChartOutline, IoTrendingUpOutline, IoGlobeOutline,
  IoArrowBackOutline, IoSettingsOutline, IoSaveOutline,
  IoSchoolOutline, IoFolderOutline, IoPeopleOutline,
  IoMailOutline, IoCheckmarkOutline, IoDownloadOutline, IoTimeOutline,
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
    { name: 'Actifs', value: adv.student_stats?.active ?? 0 },
    { name: 'Inactifs', value: adv.student_stats?.inactive ?? 0 },
  ];

  const exportToCSV = () => {
    const headers = ["Catégorie", "Valeur"];
    const rows = [
      ["Étudiants Actifs", adv.student_stats?.active],
      ["Étudiants Inactifs", adv.student_stats?.inactive],
      ["Étudiants à Risque", adv.student_stats?.at_risk],
      ["Taux de Réussite", `${adv.performance?.pass_rate}%`],
      ["Taux d'Achèvement des Tâches", `${adv.operations?.task_completion_rate}%`],
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Analyses de la Plateforme</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Données consolidées de l'année en cours</p>
        </div>
        <Button onClick={exportToCSV} icon={<IoDownloadOutline size={18}/>}>Exporter Rapport (CSV)</Button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Projets actifs',          value: a.activeGroups || 0, icon: <IoBarChartOutline size={22}/>, color: 'var(--primary)' },
          { label: 'Taux de réussite',        value: adv.performance?.pass_rate || 0, icon: <IoTrendingUpOutline size={22}/>, color: '#10B981', suffix: '%' },
          { label: 'Complétion des tâches',    value: adv.operations?.task_completion_rate || 0,  icon: <IoGlobeOutline size={22}/>, color: '#F59E0B', suffix: '%' },
          { label: 'Étudiants à risque',      value: adv.student_stats?.at_risk || 0, icon: <IoPeopleOutline size={22}/>, color: '#EF4444' },
        ].map((s, i) => <div key={i}><StatCard {...s} /></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Tendances des Notes</h3>
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
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Activité des Étudiants</h3>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Patterns de Notation (Enseignants)</h3>
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
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Tendances d'Utilisation du Système</h3>
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
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────
// Each setting panel rendered inline when a card is clicked
// ─────────────────────────────────────────────────────────

function PanelYears({ onBack }) {
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const [year, setYear] = useState(platformSettings?.current_academic_year || '2024-2025');
  const [promos, setPromos] = useState(['ISI', 'IASD', 'GL', 'SIQ']);
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (year !== platformSettings?.current_academic_year) {
      if (!window.confirm("Changer l'année académique va ARCHIVER tous les projets actuels. Continuer ?")) return;
    }
    setLoading(true);
    await updatePlatformSettings({ current_academic_year: year });
    setLoading(false);
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>🎓 Années académiques</h2>
      </div>
      <div style={{ maxWidth: 420 }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Année active</label>
        <Input value={year} onChange={e => setYear(e.target.value)} placeholder="ex: 2024-2025" style={{ marginBottom: '16px' }} />
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Promotions actives</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {promos.map(p => (
            <div key={p} style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {p}
              <button onClick={() => setPromos(pr => pr.filter(x => x !== p))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '16px', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button onClick={() => { const v = prompt('Nouvelle promotion:'); if (v) setPromos(p => [...p, v.trim()]); }} style={{ padding: '6px 14px', borderRadius: '20px', border: '1.5px dashed var(--border)', background: 'none', fontSize: '13px', cursor: 'pointer', color: 'var(--text-muted)' }}>+ Ajouter</button>
        </div>
        <Button onClick={save} loading={loading} icon={<IoSaveOutline size={16}/>}>
          Sauvegarder
        </Button>
        <div style={{ marginTop: '16px', padding: '12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
          ⚠️ Changer l'année active archivera automatiquement tous les projets en cours pour repartir sur une nouvelle année.
        </div>
      </div>
    </Card>
  );
}

function PanelCategories() {
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
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📂 Spécialités académiques</h2>
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
          <Input id="catInput" placeholder="Nouvelle spécialité..." style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => { const el = document.getElementById('catInput'); if (el?.value.trim()) { handleAdd(el.value.trim()); el.value = ''; } }}>Ajouter</Button>
        </div>
      </div>
    </Card>
  );
}





function PanelVisibility() {
  const { t } = useLanguage();
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const [local, setLocal] = useState(platformSettings || {});

  useEffect(() => { setLocal(platformSettings || {}); }, [platformSettings]);

  const toggle = (key) => {
    const newVal = !local[key];
    const updated = { ...local, [key]: newVal };
    setLocal(updated);
    updatePlatformSettings(updated);
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
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👁️ Visibilité & Accès</h2>
      </div>
      <div style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {[
            { key: 'students_can_see_archived_projects', label: 'Afficher l\'archive aux étudiants', desc: 'Permet aux étudiants de consulter les anciens projets.' },
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
      </div>
    </Card>
  );
}

function PanelGradingFormula() {
  const { t } = useLanguage();
  const [formulas, setFormulas] = useState([]);
  const [newFormula, setNewFormula] = useState({ name: '', expression: '', description: '' });
  const [loading, setLoading] = useState(false);
  const { request: loadFormulas } = useApi(async () => {
     const { data } = await client.get(ENDPOINTS.admin.gradeFormula);
     setFormulas(Array.isArray(data) ? data : []);
  });

  useEffect(() => { loadFormulas(); }, []);

  const handleCreate = async () => {
    if (!newFormula.name || !newFormula.expression) return toast.error("Nom et expression requis");
    setLoading(true);
    try {
      await client.post(ENDPOINTS.admin.gradeFormula, {
        name: newFormula.name,
        formula_expression: newFormula.expression,
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

  return (
    <Card>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📊 Formule de calcul des moyennes</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Définissez comment la note finale est calculée à partir des notes du jury.</p>
      </div>

      {/* List of formulas */}
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Formules existantes</h4>
        {formulas.length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aucune formule définie.</p> : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {formulas.map(f => (
              <div key={f.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', background: f.is_active ? 'var(--primary-subtle)' : 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{f.name}</span>
                    {f.is_active && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>ACTIVE</span>}
                  </div>
                  <code style={{ fontSize: '13px', color: 'var(--primary)', background: '#fff', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '4px', display: 'inline-block' }}>{f.formula_expression}</code>
                </div>
                {!f.is_active && (
                  <Button size="sm" variant="outline" onClick={() => handleActivate(f.id)}>Activer</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create new */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Ajouter une nouvelle formule</h4>
        <div style={{ display: 'grid', gap: '16px', maxWidth: '500px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Nom</label>
            <Input placeholder="ex: Moyenne simple" value={newFormula.name} onChange={e => setNewFormula({...newFormula, name: e.target.value})} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Expression Python</label>
            <Input placeholder="ex: (g1 + g2 + g3) / 3" value={newFormula.expression} onChange={e => setNewFormula({...newFormula, expression: e.target.value})} />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Utilisez <code>g1</code>, <code>g2</code>, <code>g3</code> pour les notes des 3 jurés.</p>
          </div>
          <Button onClick={handleCreate} loading={loading} icon={<IoCheckmarkOutline size={16}/>}>Créer la formule</Button>
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
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </DashboardLayout>
  );
}
