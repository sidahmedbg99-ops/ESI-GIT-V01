import { useState } from 'react';
import {
  IoBarChartOutline, IoTrendingUpOutline, IoGlobeOutline,
  IoArrowBackOutline, IoSettingsOutline, IoSaveOutline,
  IoSchoolOutline, IoFolderOutline, IoPeopleOutline,
  IoMailOutline, IoCheckmarkOutline,
} from 'react-icons/io5';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useLanguage } from '../../context/LanguageContext';
import { useAdmin } from '../../context/AdminContext';
import toast from 'react-hot-toast';

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

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Analyses de la Plateforme</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Données consolidées de l'année en cours</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Projets actifs',          value: a.activeGroups || 0, icon: <IoBarChartOutline size={22}/>, color: 'var(--primary)' },
          { label: 'Taux de réussite',        value: adv.performance?.pass_rate || 0, icon: <IoTrendingUpOutline size={22}/>, color: '#10B981', suffix: '%' },
          { label: 'Complétion des tâches',    value: adv.operations?.task_completion_rate || 0,  icon: <IoGlobeOutline size={22}/>, color: '#F59E0B', suffix: '%' },
          { label: 'Étudiants à risque',      value: adv.student_stats?.at_risk || 0, icon: <IoPeopleOutline size={22}/>, color: '#EF4444' },
        ].map((s, i) => <div key={i}><StatCard {...s} /></div>)}
      </div>
      <Card style={{ height: '380px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Évolution des Performances & Activité</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 20]} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="grade" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)' }} name="Moyenne des Notes" />
            <Line yAxisId="right" type="monotone" dataKey="projects" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} name="Nouveaux Projets" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
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

function PanelCategories({ onBack }) {
  const [cats, setCats] = useState(['IA & ML', 'Réseaux', 'Génie Logiciel', 'Base de données', 'Vision par ordi.']);
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📂 Catégories de projets</h2>
      </div>
      <div style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {cats.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{c}</span>
              <button onClick={() => setCats(prev => prev.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <Input id="catInput" placeholder="Nouvelle catégorie..." style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => { const el = document.getElementById('catInput'); if (el?.value.trim()) { setCats(p => [...p, el.value.trim()]); el.value = ''; } }}>Ajouter</Button>
        </div>
        <Button onClick={save} icon={saved ? <IoCheckmarkOutline size={16}/> : <IoSaveOutline size={16}/>}>
          {saved ? 'Enregistré !' : 'Sauvegarder'}
        </Button>
      </div>
    </Card>
  );
}

function PanelAssignments({ onBack }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👥 Attribution encadreurs</h2>
      </div>
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>👥</div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Assignation automatique</p>
        <p style={{ fontSize: '14px' }}>Sera connecté à l'API Django — endpoint <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>/api/groups/assign/</code></p>
      </div>
    </Card>
  );
}

function PanelEmails({ onBack }) {
  const [smtp,    setSmtp]    = useState('smtp.esi.dz');
  const [port,    setPort]    = useState('587');
  const [sender,  setSender]  = useState('noreply@esi.dz');
  const [saved,   setSaved]   = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>📧 Notifications email</h2>
      </div>
      <div style={{ maxWidth: 420 }}>
        {[
          { label: 'Serveur SMTP', value: smtp, set: setSmtp },
          { label: 'Port',         value: port, set: setPort },
          { label: 'Expéditeur',   value: sender, set: setSender },
        ].map((f, i) => (
          <div key={i} style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>{f.label}</label>
            <Input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.label} />
          </div>
        ))}
        <Button onClick={save} icon={saved ? <IoCheckmarkOutline size={16}/> : <IoSaveOutline size={16}/>} style={{ marginTop: '6px' }}>
          {saved ? 'Enregistré !' : 'Sauvegarder'}
        </Button>
      </div>
    </Card>
  );
}

function PanelVisibility({ onBack }) {
  const { t } = useLanguage();
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const [studentArchive, setStudentArchive] = useState(platformSettings?.students_can_see_archived_projects);
  const [teacherJury, setTeacherJury] = useState(false); // Placeholder for now

  const save = () => {
    updatePlatformSettings({ students_can_see_archived_projects: studentArchive });
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
    left: active ? '23px' : '3px',
    transition: 'all 0.2s'
  });

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👁️ {t('Settings')}</h2>
      </div>
      <div style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>{t('HideArchiveStudent') || 'Masquer l\'Archive (Étudiants)'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('HideArchiveStudent_Desc') || 'Les étudiants ne pourront plus voir l\'archive des projets.'}</p>
            </div>
            <div onClick={() => setStudentArchive(!studentArchive)} style={toggleStyle(studentArchive)}>
              <div style={circleStyle(studentArchive)} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600 }}>{t('HideJuryTeacher') || 'Masquer les Jurys (Enseignants)'}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('HideJuryTeacher_Desc') || 'Les enseignants ne pourront plus accéder à l\'évaluation des jurys.'}</p>
            </div>
            <div onClick={() => setTeacherJury(!teacherJury)} style={toggleStyle(teacherJury)}>
              <div style={circleStyle(teacherJury)} />
            </div>
          </div>
        </div>
        <Button onClick={save} icon={<IoSaveOutline size={16}/>}>{t('Save')}</Button>
      </div>
    </Card>
  );
}

const PANELS = { years: PanelYears, categories: PanelCategories, assignments: PanelAssignments, emails: PanelEmails, visibility: PanelVisibility };

const MENUS = [
  { id: 'years',       title: '🎓 Années académiques',      desc: 'Gérer les années et promotions actives',    icon: <IoSchoolOutline size={22}/> },
  { id: 'categories',  title: '📂 Catégories de projets',   desc: 'Gérer les thèmes et spécialités',           icon: <IoFolderOutline size={22}/> },
  { id: 'assignments', title: '👥 Attribution encadreurs',  desc: 'Assigner des enseignants aux groupes',      icon: <IoPeopleOutline size={22}/> },
  { id: 'emails',      title: '📧 Notifications email',     desc: 'Configurer les emails automatiques',        icon: <IoMailOutline size={22}/> },
  { id: 'visibility',  title: '👁️ Visibilité des modules',   desc: 'Contrôler l\'affichage des archives et jurys', icon: <IoSettingsOutline size={22}/> },
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
