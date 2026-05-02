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
      key: 'name', label: 'Étudiant',
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
      key: 'groupName', label: 'Groupe / Projet',
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
              <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 500 }}>Sans groupe</span>
            </>
          )}
        </div>
      )
    },
    {
      key: 'hasGroup', label: 'Statut',
      render: v => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Assigné' : 'Non assigné'}</Badge>
    }
  ];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>Affectations des Étudiants</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Visualisez et gérez le statut d'adhésion des étudiants aux groupes.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Card style={{ borderLeft: '4px solid var(--primary)' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Étudiants</p>
          <p style={{ fontSize: '24px', fontWeight: 800 }}>{students.length}</p>
        </Card>
        <Card style={{ borderLeft: '4px solid #10B981' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Avec Groupe</p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{data.filter(d => d.hasGroup).length}</p>
        </Card>
        <Card style={{ borderLeft: '4px solid #EF4444' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Sans Groupe</p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444' }}>{data.filter(d => !d.hasGroup).length}</p>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ width: '300px' }}>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un étudiant..." icon={<IoSearchOutline size={16}/>} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: 'Tous' },
              { id: 'with_group', label: 'Assignés' },
              { id: 'without_group', label: 'Non assignés' },
            ].map(f => (
              <button 
                key={f.id} 
                onClick={() => setFilter(f.id)} 
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

        <Table columns={columns} data={filtered} />
      </Card>
    </DashboardLayout>
  );
}
