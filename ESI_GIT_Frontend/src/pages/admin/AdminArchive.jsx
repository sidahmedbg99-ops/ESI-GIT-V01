import { useState } from 'react';
import {
  IoArchiveOutline, IoSearchOutline, IoStarOutline,
  IoPeopleOutline, IoFunnelOutline, IoGitBranchOutline, IoRefreshOutline, IoTrashOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAdmin } from '../../context/AdminContext';
import { TECH_COLORS } from '../../constants';

const FILTER_CATEGORIES = [
  { key: 'year',       label: 'Année' },
  { key: 'encadreur',  label: 'Encadreur' },
  { key: 'specialite', label: 'Spécialité' },
];

function ChipBar({ values, active, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button onClick={() => onSelect('all')} style={{ padding: '6px 14px', borderRadius: '20px', border: active === 'all' ? 'none' : '1px solid var(--border)', background: active === 'all' ? 'var(--primary)' : 'var(--bg-card)', color: active === 'all' ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
        Tous
      </button>
      {values.map(v => (
        <button key={v} onClick={() => onSelect(v)} style={{ padding: '6px 14px', borderRadius: '20px', border: active === v ? 'none' : '1px solid var(--border)', background: active === v ? 'var(--primary)' : 'var(--bg-card)', color: active === v ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
          {v}
        </button>
      ))}
    </div>
  );
}

export default function AdminArchive() {
  const { archive, archiveLoading, restoreGroup, deleteArchiveProject } = useAdmin();
  const projects = archive || [];

  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState(null);
  const [filterValue, setFilterValue] = useState('all');

  const years      = [...new Set(projects.map(p => p.year))].filter(Boolean).sort().reverse();
  const encadreurs = [...new Set(projects.map(p => p.encadreur))].filter(Boolean).sort();
  const specialites= [...new Set(projects.map(p => p.specialite))].filter(Boolean).sort();
  const catValues  = { year: years, encadreur: encadreurs, specialite: specialites };

  const firstFiltered = projects.filter(p => {
    if (!filterCat || filterValue === 'all') return true;
    return p[filterCat] === filterValue;
  });

  const filtered = firstFiltered.filter(p => {
    const q = search.toLowerCase();
    return !search || p.name?.toLowerCase().includes(q) || p.group?.toLowerCase().includes(q) || p.encadreur?.toLowerCase().includes(q);
  });

  const avgGrade = projects.length ? (projects.reduce((a, p) => a + (p.grade || 0), 0) / projects.length).toFixed(1) : 0;
  const mentions = projects.filter(p => p.status === 'mention').length;

  const selectCat = (cat) => { setFilterCat(cat === filterCat ? null : cat); setFilterValue('all'); };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>Archive</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tous les projets validés et archivés de la plateforme</p>
      </div>

      {archiveLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement de l'archive...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Projets archivés', value: projects.length, icon: '📁', color: 'var(--primary)' },
              { label: 'Moyenne générale', value: `${avgGrade}/20`, icon: '⭐', color: '#F59E0B' },
              { label: 'Avec mention', value: mentions, icon: '🏅', color: '#10B981' },
              { label: 'Années couvertes', value: `${years.length} ans`, icon: '📅', color: '#8B5CF6' },
            ].map((s, i) => (
              <Card key={i} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: s.color+'18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: s.color }}>{s.value}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* CASCADE FILTER */}
          <Card style={{ marginBottom: '20px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: filterCat ? '14px' : '0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginRight: '4px' }}>
                <IoFunnelOutline size={14}/> Filtrer par
              </div>
              {FILTER_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => selectCat(cat.key)} style={{ padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', background: filterCat === cat.key ? 'var(--primary)' : 'var(--bg)', color: filterCat === cat.key ? '#fff' : 'var(--text-secondary)', border: filterCat === cat.key ? 'none' : '1px solid var(--border)' }}>
                  {cat.label}
                </button>
              ))}
              {filterCat && (
                <button onClick={() => { setFilterCat(null); setFilterValue('all'); }} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginLeft: 'auto' }}>
                  ✕ Réinitialiser
                </button>
              )}
            </div>
            {filterCat && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)', marginBottom: '4px' }}>
                <ChipBar values={catValues[filterCat] || []} active={filterValue} onSelect={setFilterValue}/>
              </div>
            )}
          </Card>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '280px' }}>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un projet..." icon={<IoSearchOutline size={16}/>}/>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {filtered.length} projet{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <Card key={p._id} hover style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.group} · {p.year} · {p.specialite}</span>
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>{p.name}</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IoStarOutline size={13} style={{ color: '#F59E0B' }}/>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>{p.grade || p.final_grade || 0}/20</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <Badge variant={p.status === 'mention' ? 'success' : 'info'}>{p.status === 'mention' ? '🏅 Mention' : '✓ Validé'}</Badge>
                      <Button size="sm" variant="outline" onClick={() => { if(window.confirm('Supprimer définitivement ce projet ?')) deleteArchiveProject(p._id); }} icon={<IoTrashOutline size={12}/>} style={{ height: '24px', padding: '0 8px', fontSize: '10px', borderColor: '#FCA5A5', color: '#DC2626' }}>Supprimer</Button>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{p.description}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {(p.tech || []).map((t, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: (TECH_COLORS[t]||'#6B7280')+'18', color: TECH_COLORS[t]||'#6B7280', fontWeight: 600 }}>{t}</span>)}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <IoPeopleOutline size={13}/>{(p.members || []).map(m => m.name || m).join(', ') || 'Aucun membre'}
                  </div>
                  {p.jury && (
                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                      ⚖️ {p.jury.president || p.jury.teacher1_name || 'Jury assigné'}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Encadreur : {p.encadreur || p.teacher_name || '—'}</p>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <IoArchiveOutline size={40} style={{ marginBottom: '12px', opacity: 0.3 }}/>
                <p>Aucun projet ne correspond à ces filtres</p>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
