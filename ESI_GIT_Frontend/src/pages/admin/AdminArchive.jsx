import { useState, useEffect } from 'react';
import {
  IoArchiveOutline, IoSearchOutline, IoStarOutline,
  IoPeopleOutline, IoFunnelOutline, IoGitBranchOutline, IoRefreshOutline, IoTrashOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';
import { TECH_COLORS } from '../../constants';
import ConfirmModal from '../../components/ui/ConfirmModal';

// Constants will be defined inside the component to use the translation function

function ChipBar({ values, active, onSelect, t }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <button onClick={() => onSelect('all')} style={{ padding: '6px 14px', borderRadius: '20px', border: active === 'all' ? 'none' : '1px solid var(--border)', background: active === 'all' ? 'var(--primary)' : 'var(--bg-card)', color: active === 'all' ? '#fff' : 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
        {t('All')}
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
  const { t } = useLanguage();
  const { archive, archiveLoading, restoreGroup, deleteArchiveProject, toggleProjectVisibility, updateGroup } = useAdmin();
  const [editModal, setEditModal] = useState({ isOpen: false, project: null });
  
  const FILTER_CATEGORIES = [
    { key: 'year',       label: t('AcademicYears')?.split(' ')[1] || 'Année' },
    { key: 'encadreur',  label: t('Supervisor') },
    { key: 'specialite', label: t('Specialty') },
  ];
  const { platformSettings, updatePlatformSettings } = useAdmin();
  const canSeeArchived = platformSettings?.students_can_see_archived_projects;
  const projects = archive || [];

  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState(null);
  const [filterValue, setFilterValue] = useState('all');
  const [modal, setModal] = useState({ isOpen: false, projectId: null });

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

  const avgGrade = projects.length ? (projects.reduce((a, p) => a + Number(p.grades?.final_grade ?? p.grade ?? p.final_grade ?? 0), 0) / projects.length).toFixed(1) : 0;
  const mentions = projects.filter(p => Number(p.grades?.final_grade ?? p.grade ?? p.final_grade ?? 0) >= 12).length;

  const selectCat = (cat) => { setFilterCat(cat === filterCat ? null : cat); setFilterValue('all'); };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('Archive')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ShowArchiveStudents_Desc')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '12px', background: canSeeArchived ? '#DCFCE7' : '#FEE2E2', border: `1px solid ${canSeeArchived ? '#16A34A' : '#EF4444'}`, transition: 'all 0.2s' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: canSeeArchived ? '#16A34A' : '#DC2626' }}>
              {canSeeArchived ? '🔓 Archive visible aux étudiants' : '🔒 Archive masquée aux étudiants'}
            </div>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Cette option active/désactive l'onglet Archive pour tous les étudiants.</p>
        </div>
      </div>

      {archiveLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>{t('Loading')}...</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: t('ArchivedProjects_Stat'), value: projects.length, icon: '📁', color: 'var(--primary)' },
              { label: t('AvgGrade_Stat') || 'Moyenne', value: `${avgGrade}/20`, icon: '⭐', color: '#F59E0B' },
              { label: t('Mention'), value: mentions, icon: '🏅', color: '#10B981' },
              { label: t('AcademicYears'), value: `${years.length} ${t('ActiveYear').split(' ')[0]}`, icon: '📅', color: '#8B5CF6' },
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
                <IoFunnelOutline size={14}/> {t('FilterBy')}
              </div>
              {FILTER_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => selectCat(cat.key)} style={{ padding: '7px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s', background: filterCat === cat.key ? 'var(--primary)' : 'var(--bg)', color: filterCat === cat.key ? '#fff' : 'var(--text-secondary)', border: filterCat === cat.key ? 'none' : '1px solid var(--border)' }}>
                  {cat.label}
                </button>
              ))}
              {filterCat && (
                <button onClick={() => { setFilterCat(null); setFilterValue('all'); }} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: 500, cursor: 'pointer', marginLeft: 'auto' }}>
                  ✕ {t('Reset')}
                </button>
              )}
            </div>
            {filterCat && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border)', marginBottom: '4px' }}>
                <ChipBar values={catValues[filterCat] || []} active={filterValue} onSelect={setFilterValue} t={t}/>
              </div>
            )}
          </Card>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '280px' }}>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('Search')}...`} icon={<IoSearchOutline size={16}/>}/>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {filtered.length} {t('Projects').toLowerCase()} {t('Found')}
            </p>
          </div>

          {/* Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filtered.map(p => (
              <Card key={p._id} hover style={{ padding: '22px' }}>
                {/* ── Top row: title + grade ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                      {p.group} · {p.year} · {p.specialite || p.specialty}
                    </span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3, wordBreak: 'break-word' }}>{p.name}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <IoStarOutline size={13} style={{ color: '#F59E0B' }}/>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B', whiteSpace: 'nowrap' }}>
                      {Number(p.grades?.final_grade ?? p.grade ?? p.final_grade ?? 0).toFixed(1)}/20
                    </span>
                  </div>
                </div>

                {/* ── Mention badge + actions ── */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                  {Number(p.grades?.final_grade ?? p.grade ?? p.final_grade ?? 0) >= 12 ? (
                    <Badge variant="success">🏅 {Number(p.grades?.final_grade ?? p.grade ?? p.final_grade ?? 0) >= 16 ? 'Très Bien' : Number(p.grades?.final_grade ?? p.grade ?? p.final_grade ?? 0) >= 14 ? 'Bien' : 'Assez Bien'}</Badge>
                  ) : (
                    <Badge variant="info">✓ {t('Approve')}</Badge>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>

                    <Button size="sm" variant="outline" onClick={() => setEditModal({ isOpen: true, project: p })} style={{ height: '24px', padding: '0 8px', fontSize: '10px' }}>{t('Edit')}</Button>
                    <Button size="sm" variant="danger" onClick={() => setModal({ isOpen: true, projectId: p._id })} icon={<IoTrashOutline size={12}/>} style={{ height: '24px', padding: '0 8px', fontSize: '10px' }}>{t('Delete')}</Button>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>{p.description}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {(p.tech || []).map((tech, i) => <span key={i} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: (TECH_COLORS[tech]||'#6B7280')+'18', color: TECH_COLORS[tech]||'#6B7280', fontWeight: 600 }}>{tech}</span>)}
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <IoPeopleOutline size={13}/>{(p.members || []).map(m => m.name || m).join(', ') || t('NoGroups')}
                  </div>
                  {p.jury && (
                    <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                      ⚖️ {p.jury.president || p.jury.teacher1_name || t('JuryAssigned')}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>{t('Supervisor')} : {p.encadreur || p.teacher_name || '—'}</p>
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
      <ConfirmModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, projectId: null })}
        onConfirm={() => {
          deleteArchiveProject(modal.projectId);
          setModal({ isOpen: false, projectId: null });
        }}
        title={`${t('Delete')} ${t('Projects').slice(0,-1).toLowerCase()} ?`}
        message={t('DeleteConfirmation')}
        confirmText={t('Delete')}
        type="warning"
      />

      <EditArchiveModal 
        isOpen={editModal.isOpen} 
        project={editModal.project} 
        onClose={() => setEditModal({ isOpen: false, project: null })}
        onSave={async (id, data) => {
          await updateGroup(id, data);
          setEditModal({ isOpen: false, project: null });
        }}
      />
    </DashboardLayout>
  );
}

function EditArchiveModal({ isOpen, project, onClose, onSave }) {
  const { t } = useLanguage();
  const [desc, setDesc] = useState(project?.description || '');
  const [tech, setTech] = useState(project?.tech_stack || '');
  const [isPublic, setIsPublic] = useState(project?.is_public ?? true);

  useEffect(() => {
    if (project) {
      setDesc(project.description || '');
      setTech(project.tech_stack || '');
      setIsPublic(project.is_public ?? true);
    }
  }, [project]);

  if (!isOpen) return null;

  return (
    <Modal isOpen onClose={onClose} title={t('Edit')} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>DESCRIPTION</label>
          <textarea 
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            placeholder="Résumé du projet..."
            style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>TECHNOLOGIES (séparées par des virgules)</label>
          <Input 
            value={tech} 
            onChange={e => setTech(e.target.value)} 
            placeholder="React, Django, PostgreSQL..."
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Visibilité du projet</label>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rendre le projet visible (public) ou le masquer (privé).</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: 'none',
              background: isPublic ? '#10B981' : 'var(--text-muted)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isPublic ? 'Public' : 'Privé'}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={() => onSave(project._id || project.PID, { description: desc, tech_stack: tech, is_public: isPublic })}>{t('Save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
