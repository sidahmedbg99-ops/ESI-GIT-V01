import {
  IoArchiveOutline, IoSearchOutline, IoPeopleOutline,
  IoStarOutline, IoGitBranchOutline, IoFunnelOutline,
  IoChevronForwardOutline, IoPersonOutline,
} from 'react-icons/io5';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { useApi } from '../../hooks/useApi';
import { archiveApi } from '../../api/archive';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { TECH_COLORS } from '../../constants';
import AttachmentsPopover from '../../components/ui/AttachmentsPopover';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';

const LEVEL_LABELS = { 1: '1CPI', 2: '2CPI', 3: '1CS', 4: '2CS', 5: '3CS' };


export function Archive() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const currentStudentName = user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.full_name || '';
  const { data: archiveItems, loading, request: loadArchive } = useApi(archiveApi.getArchive);

  const [forbidden, setForbidden] = useState(false);
  const [canSeeAttachments, setCanSeeAttachments] = useState(false);
  useEffect(() => {
    loadArchive().catch(err => {
      if (err?.response?.status === 403) setForbidden(true);
    });
  }, [loadArchive]);

  useEffect(() => {
    client.get(ENDPOINTS.groups.publicSettings)
      .then(res => setCanSeeAttachments(res.data.students_can_see_attachments ?? false))
      .catch(() => {});
  }, []);

  const projects = archiveItems || [];

  const [search,           setSearch]           = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [activeFilters,    setActiveFilters]    = useState({});
  const [expandedCat,      setExpandedCat]      = useState(null);

  const years        = [...new Set(projects.map(p => p.year))].filter(Boolean).sort().reverse();
  const specialites  = [...new Set(projects.map(p => p.specialite))].filter(Boolean).sort();
  const levelOptions = ['2CPI', '1CS', '2CS', '3CS'];

  const FILTER_CATEGORIES = [
    { key: 'year',       label: t('YearFilter'),  values: years },
    { key: 'specialite', label: t('Specialty'),   values: specialites },
    { key: 'level',      label: t('Level'),       values: levelOptions },
  ];

  const toggleFilter = (cat, val) => {
    setActiveFilters(prev => {
      if (prev[cat] === val) { const next = { ...prev }; delete next[cat]; return next; }
      return { ...prev, [cat]: val };
    });
  };

  const clearAllFilters = () => { setActiveFilters({}); setExpandedCat(null); };

  const filtered = projects.filter(p => {
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
    if (supervisorSearch && !(p.encadreur || p.teacher_name || '').toLowerCase().includes(supervisorSearch.toLowerCase())) return false;
    return true;
  });

  const avgGrade = projects.length ? (projects.reduce((a,p) => a + Number(p.grades?.final_grade ?? p.grade ?? 0), 0) / projects.length).toFixed(1) : 0;
  const mentions = projects.filter(p => Number(p.grades?.final_grade ?? p.grade ?? 0) >= 12).length;

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || supervisorSearch;

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('Archive')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ShowArchiveStudents_Desc')}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>{t('Loading')}...</div>
      ) : forbidden ? (
        <Card style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.3 }}>👁️‍🗨️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>{t('ArchiveHidden') || 'Archive masquée'}</h2>
          <p style={{ fontSize: '15px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            {t('ArchiveHiddenDesc') || "L'administration a temporairement désactivé la consultation des archives de projets pour les étudiants."}
          </p>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: t('ArchivedProjects_Stat'), value: projects.length,                                    icon: '📁', color: 'var(--primary)' },
              { label: t('AvgGrade_Stat') || 'Moyenne générale', value: `${avgGrade}/20`,                    icon: '⭐', color: '#F59E0B' },
              { label: t('Mention'),                value: mentions,                                          icon: '🏅', color: '#10B981' },
              { label: t('AcademicYears'),          value: `${years.length} ${t('ActiveYear').split(' ')[0]}`, icon: '📅', color: '#8B5CF6' },
            ].map((s,i) => (
              <Card key={i} style={{ padding:'16px', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:40, height:40, borderRadius:'10px', background:s.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>{s.icon}</div>
                <div>
                  <p style={{ fontSize:'18px', fontWeight:800, color:s.color }}>{s.value}</p>
                  <p style={{ fontSize:'11px', color:'var(--text-muted)' }}>{s.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* FILTERS */}
          <Card style={{ marginBottom: '20px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: expandedCat ? '14px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginRight: '4px' }}>
                <IoFunnelOutline size={14}/> {t('FilterBy')}
              </div>
              {FILTER_CATEGORIES.map(cat => {
                const active = activeFilters[cat.key];
                return (
                  <button key={cat.key} onClick={() => setExpandedCat(expandedCat === cat.key ? null : cat.key)} style={{ padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', background: active ? 'var(--primary)' : expandedCat === cat.key ? 'var(--primary-subtle)' : 'var(--bg)', color: active ? '#fff' : expandedCat === cat.key ? 'var(--primary)' : 'var(--text-secondary)', border: active || expandedCat === cat.key ? 'none' : '1px solid var(--border)' }}>
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
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IoChevronForwardOutline size={11}/> {FILTER_CATEGORIES.find(c => c.key === expandedCat)?.label}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(FILTER_CATEGORIES.find(c => c.key === expandedCat)?.values || []).map(v => {
                    const isActive = activeFilters[expandedCat] === v;
                    return (
                      <button key={v} onClick={() => toggleFilter(expandedCat, v)} style={{ padding: '6px 14px', borderRadius: '20px', border: isActive ? 'none' : '1px solid var(--border)', background: isActive ? 'var(--primary)' : 'var(--bg-card)', color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', maxWidth: '260px' }}>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search')} icon={<IoSearchOutline size={16}/>}/>
            </div>
            <div style={{ flex: '1 1 220px', maxWidth: '260px' }}>
              <Input value={supervisorSearch} onChange={e => setSupervisorSearch(e.target.value)} placeholder={t('SearchSupervisor')} icon={<IoPersonOutline size={16}/>}/>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filtered.length} {t('Projects').toLowerCase()} {t('Found')}
            </p>
          </div>

          {/* Results */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <Card key={p._id || p.PID} hover style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>

                {/* top: subtitle + grade */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {[LEVEL_LABELS[p.academic_level] || LEVEL_LABELS[p.level], p.year, p.specialite || p.specialty].filter(Boolean).join(' · ') || p.year || ''}
                      </span>
                      {currentStudentName && (p.members || []).some(m => (m.name || m || '').toLowerCase().includes(currentStudentName.toLowerCase())) && (
                        <span style={{ fontSize: '10px', fontWeight: 700, background: '#FEF3C7', color: '#92400E', padding: '2px 7px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <IoPersonOutline size={10}/> Mon projet
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>{p.name}</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                <div style={{ maxHeight: '72px', overflowY: 'auto', marginBottom: '14px' }}>
                  {p.description ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.description}</p>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.5 }}>{t('NoDescription')}</p>
                  )}
                </div>

                {/* tech stack */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {(p.tech || []).map((tech, i) => (
                    <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: (TECH_COLORS[tech]||'#6B7280')+'18', color: TECH_COLORS[tech]||'#6B7280', fontWeight: 600 }}>{tech}</span>
                  ))}
                </div>

                {/* bottom section pinned */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>

                  {/* members — full width */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <IoPeopleOutline size={13} style={{ flexShrink: 0 }}/>
                    <span>{(p.members || []).map(m => m.name || m).join(', ') || '—'}</span>
                  </div>

                  {/* supervisor — full width */}
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {t('Supervisor')} : {p.encadreur || p.teacher_name || '—'}
                  </p>

                  {/* github left, attachments right */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    {p.repo ? (
                      <a
                        href={p.repo.startsWith('http') ? p.repo : `https://${p.repo}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'monospace', minWidth: 0, overflow: 'hidden' }}
                      >
                        <IoGitBranchOutline size={13} style={{ flexShrink: 0 }}/>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
                        </span>
                      </a>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        <IoGitBranchOutline size={13}/>No Repo
                      </span>
                    )}
                    {canSeeAttachments && (p.attachments || []).length > 0 && (
                      <div style={{ flexShrink: 0 }}>
                        <AttachmentsPopover attachments={p.attachments} />
                      </div>
                    )}
                  </div>

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