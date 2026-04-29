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
  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('AdminDashboard')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('RealTimeAnalytics')}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: t('ActiveProjects') || 'Projets actifs',       value: 180, icon: <IoBarChartOutline size={22}/>, change: 8,  color: 'var(--primary)' },
          { label: t('SubmissionsThisMonth') || 'Soumissions ce mois',  value: 620, icon: <IoTrendingUpOutline size={22}/>, change: 22, color: '#10B981' },
          { label: t('AvgCompletionRate') || 'Taux de complétion',   value: 78,  icon: <IoGlobeOutline size={22}/>,    color: '#F59E0B', suffix: '%' },
        ].map((s, i) => <div key={i}><StatCard {...s} /></div>)}
      </div>
      <Card style={{ height: '320px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('ProjectState')}</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }} />
            <Legend />
            <Line type="monotone" dataKey="projects"    stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name={t('Projects')} />
            <Line type="monotone" dataKey="submissions" stroke="#10B981"        strokeWidth={2.5} dot={{ r: 4 }} name={t('Deliverables')} />
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
  const [year, setYear] = useState('2024-2025');
  const [promos, setPromos] = useState(['ISI', 'IASD', 'GL', 'SIQ']);
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{ padding: '6px', border: 'none', background: 'var(--bg)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><IoArrowBackOutline size={18}/></button>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>🎓 Années académiques</h2>
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
        <Button onClick={save} icon={saved ? <IoCheckmarkOutline size={16}/> : <IoSaveOutline size={16}/>}>
          {saved ? 'Enregistré !' : 'Sauvegarder'}
        </Button>
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
        <button onClick={onBack} style={{ padding: '6px', border: 'none', background: 'var(--bg)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><IoArrowBackOutline size={18}/></button>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📂 Catégories de projets</h2>
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
        <button onClick={onBack} style={{ padding: '6px', border: 'none', background: 'var(--bg)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><IoArrowBackOutline size={18}/></button>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>👥 Attribution encadreurs</h2>
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
        <button onClick={onBack} style={{ padding: '6px', border: 'none', background: 'var(--bg)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><IoArrowBackOutline size={18}/></button>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📧 Notifications email</h2>
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
  // Using localStorage to simulate global settings for now
  const [studentArchive, setStudentArchive] = useState(() => localStorage.getItem('hideStudentArchive') === 'true');
  const [teacherJury, setTeacherJury] = useState(() => localStorage.getItem('hideTeacherJury') === 'true');

  const save = () => {
    localStorage.setItem('hideStudentArchive', studentArchive);
    localStorage.setItem('hideTeacherJury', teacherJury);
    toast.success(t('Success'));
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
        <button onClick={onBack} style={{ padding: '6px', border: 'none', background: 'var(--bg)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><IoArrowBackOutline size={18}/></button>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>👁️ {t('Settings')}</h2>
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
  const [activeMenu, setActiveMenu] = useState(null);
  const Panel = activeMenu ? PANELS[activeMenu] : null;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('Settings')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('FeaturesSubtitle')}</p>
      </div>

      {!activeMenu ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', maxWidth: '860px' }}>
          {MENUS.map((s) => (
            <div key={s.id} onClick={() => setActiveMenu(s.id)} style={{ padding: '22px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', border: '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '14px' }}>
                {s.icon}
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{s.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.desc}</p>
              <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>Configurer →</div>
            </div>
          ))}
        </div>
      ) : (
        <Panel onBack={() => setActiveMenu(null)} />
      )}
    </DashboardLayout>
  );
}
