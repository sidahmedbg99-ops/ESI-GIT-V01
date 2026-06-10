import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { IoSearchOutline, IoStarOutline, IoPeopleOutline, IoGitBranchOutline, IoArchiveOutline, IoFunnelOutline, IoPersonOutline } from 'react-icons/io5';
import { archiveApi } from '../../api/archive';
import { useApi } from '../../hooks/useApi';
import { useLanguage } from '../../context/LanguageContext';
import AttachmentsPopover from '../../components/ui/AttachmentsPopover';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';

const TECH_COLORS = { Python:'#3B7ACF', React:'#61DAFB', 'Node.js':'#43A047', MongoDB:'#4CAF50', TensorFlow:'#FF6F00', FastAPI:'#009688', 'Vue.js':'#42B883', Docker:'#2496ED' };
const LEVEL_LABELS = { 1: '1CPI', 2: '2CPI', 3: '1CS', 4: '2CS', 5: '3CS' };

export default function TeacherArchive() {
  const { t } = useLanguage();
  const { data: archiveList, request: loadArchive, loading } = useApi(archiveApi.getArchive);
  useEffect(() => { loadArchive(); }, [loadArchive]);

  const [specialties, setSpecialties] = useState([]);
  useEffect(() => {
    client.get(ENDPOINTS.admin.specialties)
      .then(r => setSpecialties(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const allProjects = archiveList || [];
  const [search,           setSearch]           = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [activeFilters,    setActiveFilters]    = useState({});
  const [expandedCat,      setExpandedCat]      = useState(null);

  const years        = [...new Set(allProjects.map(p => p.year))].filter(Boolean).sort().reverse();
  const specialites  = specialties.length
    ? specialties.map(s => s.name).sort()
    : [...new Set(allProjects.map(p => p.specialite))].filter(Boolean).sort();
  const levelOptions = ['2CPI', '1CS', '2CS', '3CS'];

  const FILTER_CATEGORIES = [
    { key: 'year',       label: t('YearFilter'), values: years },
    { key: 'specialite', label: t('Specialty'),  values: specialites },
    { key: 'level',      label: t('Level'),      values: levelOptions },
  ];

  const toggleFilter = (cat, val) => {
    setActiveFilters(prev => {
      if (prev[cat] === val) { const next = { ...prev }; delete next[cat]; return next; }
      return { ...prev, [cat]: val };
    });
  };

  const clearAllFilters = () => { setActiveFilters({}); setExpandedCat(null); setSupervisorSearch(''); };

  const filtered = allProjects.filter(p => {
    for (const [cat, val] of Object.entries(activeFilters)) {
      if (cat === 'level') {
        const label = LEVEL_LABELS[p.academic_level] || LEVEL_LABELS[p.level];
        if (label !== val) return false;
      } else {
        if (p[cat] !== val) return false;
      }
    }
    const q = search.toLowerCase();
    if (search && !p.name?.toLowerCase().includes(q) && !p.encadreur?.toLowerCase().includes(q)) return false;
    if (supervisorSearch && !(p.encadreur || '').toLowerCase().includes(supervisorSearch.toLowerCase())) return false;
    return true;
  });

  const avgGrade = allProjects.length ? (allProjects.reduce((a, p) => a + Number(p.grades?.final_grade ?? p.grade ?? 0), 0) / allProjects.length).toFixed(1) : 0;
  const mentions = allProjects.filter(p => Number(p.grades?.final_grade ?? p.grade ?? 0) >= 12).length;
  const hasActiveFilters = Object.keys(activeFilters).length > 0 || supervisorSearch;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('ArchiveTitle')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ArchiveSubtitle')}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>{t('Loading')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: t('Projects'), value: allProjects.length, icon: '📁', color: 'var(--primary)' },
              { label: t('AvgGrade'), value: `${avgGrade}/20`,  icon: '⭐', color: '#F59E0B' },
              { label: t('Mentions'), value: mentions,          icon: '🏅', color: '#10B981' },
              { label: t('Years'),    value: `${years.length}`, icon: '📅', color: '#8B5CF6' },
            ].map((s, i) => (
              <Card key={i} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: s.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{s.icon}</div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom: '20px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: expandedCat ? '14px' : '0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}><IoFunnelOutline size={13}/> {t('FilterBy')}</span>
              {FILTER_CATEGORIES.map(cat => {
                const active = activeFilters[cat.key];
                return (
                  <button key={cat.key} onClick={() => setExpandedCat(expandedCat === cat.key ? null : cat.key)} style={{ padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: active ? 'var(--primary)' : expandedCat === cat.key ? 'var(--primary-subtle)' : 'var(--bg)', color: active ? '#fff' : expandedCat === cat.key ? 'var(--primary)' : 'var(--text-secondary)', border: active || expandedCat === cat.key ? 'none' : '1px solid var(--border)' }}>
                    {active ? `${cat.label}: ${active}` : cat.label}
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button onClick={clearAllFilters} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginLeft: 'auto' }}>
                  ✕ {t('Reset')}
                </button>
              )}
            </div>
            {expandedCat && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(FILTER_CATEGORIES.find(c => c.key === expandedCat)?.values || []).map(v => {
                  const isActive = activeFilters[expandedCat] === v;
                  return (
                    <button key={v} onClick={() => toggleFilter(expandedCat, v)} style={{ padding: '6px 14px', borderRadius: '20px', border: isActive ? 'none' : '1px solid var(--border)', background: isActive ? 'var(--primary)' : 'var(--bg-card)', color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      {v}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', maxWidth: '260px' }}>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search')} icon={<IoSearchOutline size={16}/>}/>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', flex: '1 1 220px', maxWidth: '260px' }}>
              <IoPersonOutline size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
              <input value={supervisorSearch} onChange={e => setSupervisorSearch(e.target.value)} placeholder={t('SearchSupervisor')} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: 'var(--text-primary)', width: '100%' }}/>
              {supervisorSearch && <button onClick={() => setSupervisorSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: 0, lineHeight: 1 }}>✕</button>}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{filtered.length} {t('Projects').toLowerCase()}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <Card key={p.PID ?? p._id} hover style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
                {/* top: subtitle + grade */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {[LEVEL_LABELS[p.academic_level] || LEVEL_LABELS[p.level], p.year, p.specialite || p.specialty].filter(Boolean).join(' · ')}
                    </p>
                    <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{p.name}</h3>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <IoStarOutline size={13} style={{ color: '#F59E0B' }}/>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>
                        {Number(p.grades?.final_grade ?? p.grade ?? 0).toFixed(1)}/20
                      </span>
                    </div>
                    {Number(p.grades?.final_grade ?? p.grade ?? 0) >= 12 ? (
                      <Badge variant="success">🏅 {Number(p.grades?.final_grade ?? p.grade ?? 0) >= 16 ? t('MentionTresBien') : Number(p.grades?.final_grade ?? p.grade ?? 0) >= 14 ? t('MentionBien') : t('MentionAssezBien')}</Badge>
                    ) : (
                      <Badge variant="info">✓ {t('Validated')}</Badge>
                    )}
                  </div>
                </div>

                {/* scrollable description */}
                <div style={{ maxHeight: '72px', overflowY: 'auto', marginBottom: '12px' }}>
                  {p.description ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.description}</p>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.5 }}>{t('NoDescription')}</p>
                  )}
                </div>

                {/* tech stack */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {(p.tech||[]).map((tValue, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: (TECH_COLORS[tValue]||'#6B7280')+'18', color: TECH_COLORS[tValue]||'#6B7280', fontWeight: 600 }}>{tValue}</span>)}
                </div>

                {/* bottom section pinned */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <IoPeopleOutline size={13}/>{(p.members || []).map(m => m.name || m).join(', ')}
                    </div>
                    {p.repo ? (
                      <a href={p.repo.startsWith('http') ? p.repo : `https://${p.repo}`} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'monospace' }}>
                        <IoGitBranchOutline size={13}/>{p.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                      </a>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        <IoGitBranchOutline size={13}/>No Repo
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Supervisor')} : {p.encadreur || '—'}</p>
                  {(p.attachments || []).length > 0 && <AttachmentsPopover attachments={p.attachments} />}
                </div>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <IoArchiveOutline size={40} style={{ marginBottom: '12px', opacity: 0.3 }}/>
                <p>{t('NoGroups')}</p>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}