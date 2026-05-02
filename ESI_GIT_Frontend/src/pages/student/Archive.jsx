import {
  IoArchiveOutline, IoSearchOutline, IoPeopleOutline,
  IoStarOutline, IoGitBranchOutline, IoFunnelOutline,
  IoChevronForwardOutline,
} from 'react-icons/io5';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { useApi } from '../../hooks/useApi';
import { archiveApi } from '../../api/archive';
import { TECH_COLORS } from '../../constants';

let FILTER_CATEGORIES = [
  { key: 'year',      label: 'Année',       field: 'year' },
  { key: 'encadreur', label: 'Encadreur',   field: 'encadreur' },
  { key: 'specialite',label: 'Spécialité',  field: 'specialite' },
];

function ChipBar({ values, active, onSelect, colorMap }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button onClick={() => onSelect('all')} style={{ padding: '6px 14px', borderRadius: '20px', border: active === 'all' ? 'none' : '1px solid var(--border)', background: active === 'all' ? 'var(--primary)' : 'var(--bg-card)', color: active === 'all' ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
        Tous
      </button>
      {values.map(v => {
        const col = colorMap?.[v];
        const isActive = active === v;
        return (
          <button key={v} onClick={() => onSelect(v)} style={{ padding: '6px 14px', borderRadius: '20px', border: isActive ? 'none' : '1px solid var(--border)', background: isActive ? (col ?? 'var(--primary)') : 'var(--bg-card)', color: isActive ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
            {v}
          </button>
        );
      })}
    </div>
  );
}

export function Archive() {
  const { data: archiveItems, loading, request: loadArchive } = useApi(archiveApi.getArchive);
  
  useEffect(() => {
    loadArchive();
  }, [loadArchive]);

  const projects = archiveItems || [];

  const [search,        setSearch]        = useState('');
  const [filterCat,     setFilterCat]     = useState(null);   // 'year' | 'encadreur' | 'specialite'
  const [filterValue,   setFilterValue]   = useState('all');  // selected value in that category

  /* derived unique lists */
  const years      = [...new Set(projects.map(p => p.year))].sort().reverse();
  const encadreurs = [...new Set(projects.map(p => p.encadreur))].sort();
  const specialites= [...new Set(projects.map(p => p.specialite))].sort();

  const catValues = { year: years, encadreur: encadreurs, specialite: specialites };

  /* first-level filter */
  const firstFiltered = projects.filter(p => {
    if (!filterCat || filterValue === 'all') return true;
    return p[filterCat] === filterValue || p[FILTER_CATEGORIES.find(c=>c.key===filterCat)?.field] === filterValue;
  });

  const filtered = firstFiltered.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.group.toLowerCase().includes(search.toLowerCase()) ||
      p.encadreur.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const avgGrade = projects.length ? (projects.reduce((a,p) => a+p.grade, 0) / projects.length).toFixed(1) : 0;
  const mentions = projects.filter(p => p.status === 'mention').length;

  const selectCat = (cat) => {
    setFilterCat(cat === filterCat ? null : cat);
    setFilterValue('all');
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>Archive</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Projets de fin d'études des années précédentes</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Chargement de l'archive...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label:'Projets archivés', value:projects.length, icon:'📁', color:'var(--primary)' },
              { label:'Moyenne générale', value:`${avgGrade}/20`, icon:'⭐', color:'#F59E0B' },
              { label:'Avec mention', value:mentions, icon:'🏅', color:'#10B981' },
              { label:'Années couvertes', value:`${years.length} ans`, icon:'📅', color:'#8B5CF6' },
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

          {/* ── CASCADE FILTER ──────────────────────────────────────── */}
          <Card style={{ marginBottom: '20px', padding: '18px 20px' }}>
            {/* Level 1 — category selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: filterCat ? '14px' : '0', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, marginRight: '4px' }}>
                <IoFunnelOutline size={14}/> Filtrer par
              </div>
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => selectCat(cat.key)}
                  style={{
                    padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                    background: filterCat === cat.key ? 'var(--primary)' : 'var(--bg)',
                    color: filterCat === cat.key ? '#fff' : 'var(--text-secondary)',
                    border: filterCat === cat.key ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
              {filterCat && (
                <button onClick={() => { setFilterCat(null); setFilterValue('all'); }} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginLeft: 'auto' }}>
                  ✕ Réinitialiser
                </button>
              )}
            </div>

            {/* Level 2 — values for selected category */}
            {filterCat && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)', marginBottom: '14px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IoChevronForwardOutline size={11}/> {FILTER_CATEGORIES.find(c=>c.key===filterCat)?.label}
                </p>
                <ChipBar values={catValues[filterCat]} active={filterValue} onSelect={setFilterValue}/>
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

          {/* Results */}
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
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#F59E0B' }}>{p.grade}/20</span>
                    </div>
                    <Badge variant={p.status === 'mention' ? 'success' : 'info'}>{p.status === 'mention' ? '🏅 Mention' : '✓ Validé'}</Badge>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>{p.description}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {p.tech.map((t,i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: (TECH_COLORS[t]||'#6B7280')+'18', color: TECH_COLORS[t]||'#6B7280', fontWeight: 600 }}>{t}</span>)}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <IoPeopleOutline size={13}/>{p.members.join(', ')}
                  </div>
                  <a href={`https://${p.repo}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'monospace' }}>
                    <IoGitBranchOutline size={13}/>{p.repo.split('/').slice(-1)[0]}
                  </a>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Encadreur : {p.encadreur}</p>
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
