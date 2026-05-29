import { useState } from 'react';
import {
  IoPeopleOutline, IoSearchOutline, IoSchoolOutline, 
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoAlertCircleOutline
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';
import Table from '../../components/ui/Table';

export default function AdminStudents() {
  const { t } = useLanguage();
  const { groups, users } = useAdmin();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, with_group, without_group

  const safeGroups = groups || [];
  const safeUsers = users || [];
  
  const students = safeUsers.filter(u => u.role === 'student');
  const studentIdsInGroups = new Set(safeGroups.flatMap(g => g.student_ids || []));

  const data = students.map(s => {
    const group = safeGroups.find(g => (g.student_ids || []).includes(s._id));
    return {
      ...s,
      hasGroup: !!group,
      groupName: group?.title || group?.groupCode || '—',
      groupId: group?._id
    };
  });

  const filtered = data.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = (s.name?.toLowerCase().includes(q)) || (s.email?.toLowerCase().includes(q));
    const matchFilter = filter === 'all' || (filter === 'with_group' ? s.hasGroup : !s.hasGroup);
    return matchSearch && matchFilter;
  });

  const columns = [
    {
      key: 'name', label: t('Students').slice(0,-1),
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>
            {v?.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '13px' }}>{v}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.specialite} · {row.promo}</p>
          </div>
        </div>
      )
    },
    {
      key: 'email', label: 'Email',
      render: v => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v}</span>
    },
    {
      key: 'groupName', label: t('Projects').slice(0,-1),
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {row.hasGroup ? (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
            </>
          ) : (
            <>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
              <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 500 }}>{t('NoGroupYet')}</span>
            </>
          )}
        </div>
      )
    },
    {
      key: 'hasGroup', label: t('Status'),
      render: v => <Badge variant={v ? 'success' : 'danger'}>{v ? t('Assigned') : t('NotAssigned') || 'Non assigné'}</Badge>
    }
  ];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('StudentAssignments') || 'Affectations des Étudiants'}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('StudentAssignmentsSub') || "Visualisez et gérez le statut d'adhésion des étudiants aux groupes."}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ borderLeft: '4px solid var(--primary)' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{t('TotalStudents_Stat')}</p>
          <p style={{ fontSize: '24px', fontWeight: 800 }}>{students.length}</p>
        </Card>
        <Card style={{ borderLeft: '4px solid #10B981' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{t('WithGroup') || 'Avec Groupe'}</p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{data.filter(d => d.hasGroup).length}</p>
        </Card>
        <Card style={{ borderLeft: '4px solid #EF4444' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{t('WithoutGroup') || 'Sans Groupe'}</p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444' }}>{data.filter(d => !d.hasGroup).length}</p>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ width: '300px' }}>
            <Input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder={`${t('Search')}...`} icon={<IoSearchOutline size={16}/>} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: t('All') },
              { id: 'with_group', label: t('Assigned') },
              { id: 'without_group', label: t('NotAssigned') || 'Non assignés' },
            ].map(f => (
              <button 
                key={f.id} 
                onClick={() => { setFilter(f.id); setCurrentPage(1); }} 
                style={{ 
                  padding: '8px 16px', borderRadius: '20px', border: filter === f.id ? 'none' : '1px solid var(--border)', 
                  background: filter === f.id ? 'var(--primary)' : 'var(--bg)', color: filter === f.id ? '#fff' : 'var(--text-secondary)', 
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' 
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Table columns={columns} data={paginatedData} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('Displaying')} {filtered.length === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1} {t('To')} {Math.min(validCurrentPage * itemsPerPage, filtered.length)} {t('Of')} {filtered.length} {t('Students').toLowerCase()}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={validCurrentPage === 1} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', cursor: validCurrentPage === 1 ? 'not-allowed' : 'pointer', opacity: validCurrentPage === 1 ? 0.5 : 1 }}>{t('Previous') || 'Précédent'}</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} style={{ width: 34, height: 34, borderRadius: '8px', border: validCurrentPage === page ? '1px solid var(--primary)' : '1px solid var(--border)', background: validCurrentPage === page ? 'var(--primary)' : 'var(--bg)', color: validCurrentPage === page ? '#fff' : 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>
                {page}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={validCurrentPage === totalPages || totalPages === 0} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', cursor: (validCurrentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (validCurrentPage === totalPages || totalPages === 0) ? 0.5 : 1 }}>{t('Next') || 'Suivant'}</button>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
