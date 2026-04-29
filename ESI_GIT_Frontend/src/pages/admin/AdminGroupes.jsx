import { useState } from 'react';
import {
  IoPeopleOutline, IoSearchOutline, IoAddOutline, IoEyeOutline,
  IoTrashOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoPersonOutline, IoRibbonOutline, IoSchoolOutline, IoTimeOutline,
  IoArrowBackOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';

// ── Jury assign modal ──────────────────────────────────────────────
function JuryModal({ group, users, onClose, onAssign }) {
  const { t } = useLanguage();
  const teachers = (users || []).filter(u => u.role === 'teacher');
  const [selected, setSelected] = useState(() => {
    const initial = [];
    if (group?.teacherId) {
      initial.push({ teacherId: group.teacherId, role: 'supervisor' });
    }
    return initial;
  });

  const isSupervisor = (id) => id === group?.teacherId;

  const toggle = (id) => {
    if (isSupervisor(id)) return; // prevent toggling supervisor
    setSelected(prev => {
      const exists = prev.find(x => x.teacherId === id);
      if (exists) return prev.filter(x => x.teacherId !== id);
      if (prev.length < 4) return [...prev, { teacherId: id, role: 'member' }];
      return prev;
    });
  };

  const changeRole = (e, id) => {
    e.stopPropagation();
    const role = e.target.value;
    setSelected(prev => prev.map(x => x.teacherId === id ? { ...x, role } : x));
  };

  return (
    <Modal isOpen onClose={onClose} title={`${t('AssignJury')} — ${group?.title || group?.groupCode}`} size="md">
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {t('ValidationRequestSub')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '320px', overflowY: 'auto' }}>
        {teachers.map(tVal => {
          const selection = selected.find(x => x.teacherId === tVal._id);
          const isSelected = !!selection;
          const isSup = isSupervisor(tVal._id);
          return (
            <div key={tVal._id} onClick={() => toggle(tVal._id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: isSelected ? 'var(--primary-subtle)' : 'var(--bg)', border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, cursor: isSup ? 'default' : 'pointer', transition: 'all 0.15s' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {tVal.name?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{tVal.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tVal.specialty || tVal.department || '—'}</p>
              </div>
              {isSelected && (
                <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <select value={selection.role} onChange={e => changeRole(e, tVal._id)} disabled={isSup}
                    style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)', background: '#fff', outline: 'none' }}>
                    {isSup && <option value="supervisor">{t('JuryRoles').supervisor}</option>}
                    {!isSup && <>
                      <option value="president">{t('JuryRoles').president}</option>
                      <option value="member">{t('JuryRoles').member}</option>
                    </>}
                  </select>
                </div>
              )}
            </div>
          );
        })}
        {teachers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>{t('NoGroupYet')}</p>}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selected.length} {t('Evaluated').toLowerCase()}</span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={() => { onAssign(group._id, selected); onClose(); }} icon={<IoRibbonOutline size={16}/>} disabled={selected.length === 0}>
            {t('AssignJury')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Group detail modal ─────────────────────────────────────────────
function GroupDetailModal({ group: g, users, onClose, onAssignJury }) {
  const { t } = useLanguage();
  if (!g) return null;
  const teacher = (users || []).find(u => u._id === g.teacherId);
  let juryMembers = [];
  if (Array.isArray(g.jury)) {
    // Fallback for legacy mock data arrays
    juryMembers = g.jury.map(j => {
      const isObj = typeof j === 'object';
      const id = isObj ? j.teacherId : j;
      const roleKey = isObj ? j.role : '';
      const user = (users || []).find(u => u._id === id);
      const roleName = t('JuryRoles')[roleKey] || roleKey;
      return { name: user?.name || id, role: roleName };
    });
  } else if (g.jury && typeof g.jury === 'object') {
    // Handle real backend object format
    if (g.jury.president) juryMembers.push({ name: g.jury.president, role: t('JuryRoles')?.president || 'Président' });
    if (g.jury.examiner1) juryMembers.push({ name: g.jury.examiner1, role: t('JuryRoles')?.member || 'Examinateur' });
    if (g.jury.examiner2) juryMembers.push({ name: g.jury.examiner2, role: t('JuryRoles')?.member || 'Examinateur' });
  }

  return (
    <Modal isOpen onClose={onClose} title={g.groupCode ?? g.title} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{t('Projects').slice(0,-1)}</p>
          <p style={{ fontSize: '15px', fontWeight: 700 }}>{g.title || '—'}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: t('Supervisor'), value: teacher?.name || g.encadreur || '—' },
            { label: t('Status'),    value: g.status === 'active' ? t('Active_Stat') : t('Archive') },
            { label: t('Members'),   value: (g.members || g.studentIds || []).length + ' ' + t('Students').toLowerCase() },
            { label: 'Approbation', value: g.supervisorApproved ? t('Approve') : t('InProgress') },
          ].map((f, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>{f.label}</p>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>{f.value}</p>
            </div>
          ))}
        </div>

        {(g.members || []).length > 0 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>{t('Members')}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {g.members.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '12px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>
                    {(m.name || m)?.charAt(0)}
                  </div>
                  {m.name || m}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '14px', borderRadius: '10px', background: juryMembers.length ? 'var(--primary-subtle)' : 'var(--bg)', border: `1px solid ${juryMembers.length ? 'var(--primary)' : 'var(--border)'}` }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>{t('JuryAssigned')}</p>
          {juryMembers.length > 0 ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {juryMembers.map((member, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: '20px', background: 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: 600 }}>
                  {member.name} {member.role ? `(${member.role})` : ''}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('NoJuryAssigned')}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={() => { onClose(); onAssignJury(g); }} icon={<IoRibbonOutline size={16}/>}>
            {juryMembers.length ? t('EditJury') : t('AssignJury')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Create group modal ─────────────────────────────────────────────
function CreateGroupModal({ withoutGroup, onClose, onSubmit }) {
  const { t } = useLanguage();
  const { users } = useAdmin();
  const teachers = (users || []).filter(u => u.role === 'teacher' && u.available !== false);
  const [groupCode, setGroupCode] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);

  const toggleStudent = (s) => {
    setSelectedStudents(prev => {
      if (prev.find(x => x.cid === s._id)) return prev.filter(x => x.cid !== s._id);
      if (prev.length < 6) return [...prev, { cid: s._id, name: s.name, role: 'développeur' }];
      return prev;
    });
  };

  const updateRole = (cid, role) => {
    setSelectedStudents(prev => prev.map(x => x.cid === cid ? { ...x, role } : x));
  };

  const handleSubmit = () => {
    onSubmit({
      Name: projectTitle,
      title: projectTitle,
      groupCode: groupCode,
      teacherId: selectedTeacher,
      TID: selectedTeacher,
      supervisorApproved: true,
      members: selectedStudents,
      studentIds: selectedStudents.map(s => s.cid)
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={t('CreateGroupTitle')} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('ProjectTitle')} *</label>
          <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Ex: E-learning platform"
                 style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }}/>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('GroupCode')} *</label>
          <input value={groupCode} onChange={e => setGroupCode(e.target.value)} placeholder="Ex: ISI-24-01"
                 style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }}/>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Supervisor')} *</label>
          <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)' }}>
            <option value="">-- {t('Select')} --</option>
            {teachers.map(tr => <option key={tr._id} value={tr._id}>{tr.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Students')} (max 6) *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
            {withoutGroup.map(s => {
              const sel = selectedStudents.find(x => x.cid === s._id);
              return (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" checked={!!sel} onChange={() => toggleStudent(s)} />
                  <span style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>{s.name}</span>
                  {sel && (
                    <select value={sel.role} onChange={e => updateRole(s._id, e.target.value)} style={{ fontSize: '12px', padding: '4px', borderRadius: '4px' }}>
                      <option value="développeur">Développeur</option>
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
                      <option value="designer">Designer</option>
                      <option value="chef">Chef de projet</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!projectTitle.trim() || !groupCode.trim() || !selectedTeacher || selectedStudents.length === 0}>{t('CreateGroup')} ({selectedStudents.length})</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function AdminGroupes() {
  const { t } = useLanguage();
  const { groups, users, updateGroup, addGroup, assignJury } = useAdmin();
  const safeGroups = groups || [];
  const safeUsers  = users  || [];

  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [detailGrp,  setDetailGrp]  = useState(null);
  const [juryGrp,    setJuryGrp]    = useState(null);
  const [createGrp,  setCreateGrp]  = useState(false);

  const realGroups = safeGroups.filter(g => (g.Student_count > 0));
  
  const filtered = realGroups.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = (g.groupCode?.toLowerCase().includes(q) ?? false) || (g.title?.toLowerCase().includes(q) ?? false);
    const matchFilter = filter === 'all' || (filter === 'active' && g.status === 'active') || (filter === 'pending' && !g.supervisorApproved);
    return matchSearch && matchFilter;
  });

  const handleAssignJury = (groupId, selection) => {
    assignJury(groupId, selection);
  };

  const students = safeUsers.filter(u => u.role === 'student');
  const studentIds = new Set(realGroups.flatMap(g => g.student_ids || []));
  const withGroup    = students.filter(s => studentIds.has(s._id));
  const withoutGroup = students.filter(s => !studentIds.has(s._id));

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('Groups')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('GroupManagement')}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: t('TotalGroups_Stat'),    value: realGroups.length,                                    color: 'var(--primary)' },
          { label: t('Active_Stat'),           value: realGroups.filter(g=>g.status==='active').length,      color: '#10B981' },
          { label: t('NonApproved_Stat'),    value: realGroups.filter(g=>!g.supervisorApproved).length,    color: '#F59E0B' },
          { label: t('StudentsWithoutGroup'), value: withoutGroup.length,                             color: '#EF4444' },
        ].map((c, i) => (
          <div key={i} style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.label}</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: c.color }}>{c.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

        <div>
          <Card>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search')} icon={<IoSearchOutline size={14}/>}/>
              </div>
              {['all','active','pending'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 14px', borderRadius: '20px', border: filter === f ? 'none' : '1px solid var(--border)', background: filter === f ? 'var(--primary)' : 'var(--bg)', color: filter === f ? '#fff' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  {f === 'all' ? t('All') : f === 'active' ? t('Active_Stat') : t('NonApproved_Stat')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(g => {
                const teacher = safeUsers.find(u => u._id === g.teacherId);
                const hasJury = (g.jury || []).length > 0;
                return (
                  <div key={g._id} style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '14px', fontWeight: 700 }}>{g.groupCode ?? g.title}</p>
                        <Badge variant={g.status === 'active' ? 'success' : 'warning'}>{g.status === 'active' ? t('Active_Stat') : 'Inactif'}</Badge>
                        {!g.supervisorApproved && <Badge variant="warning">{t('NonApproved_Stat')}</Badge>}
                        {g.final_submission_approved && <Badge variant="success">Prêt pour Soutenance ✓</Badge>}
                        {hasJury && <Badge variant="primary">Jury ✓</Badge>}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        👤 {teacher?.name || g.encadreur || '—'} · {g.Student_count || 0} {t('Members').toLowerCase()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => setDetailGrp(g)} style={{ width: 30, height: 30, borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <IoEyeOutline size={14}/>
                      </button>
                      <button 
                        disabled={!g.final_submission_approved}
                        onClick={() => setJuryGrp(g)} 
                        title={!g.final_submission_approved ? "Attente validation finale du superviseur" : "Assigner Jury"}
                        style={{ 
                          width: 30, height: 30, borderRadius: '8px', 
                          background: !g.final_submission_approved ? '#F3F4F6' : (hasJury ? 'var(--primary-subtle)' : 'var(--bg-card)'), 
                          border: `1px solid ${!g.final_submission_approved ? '#E5E7EB' : (hasJury ? 'var(--primary)' : 'var(--border)')}`, 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          cursor: !g.final_submission_approved ? 'not-allowed' : 'pointer', 
                          color: !g.final_submission_approved ? '#9CA3AF' : (hasJury ? 'var(--primary)' : 'var(--text-muted)') 
                        }}
                      >
                        <IoRibbonOutline size={14}/>
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <IoPeopleOutline size={36} style={{ marginBottom: '10px', opacity: 0.3 }}/>
                  <p>{t('NoGroups')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ border: withoutGroup.length > 0 ? '1.5px solid #FCA5A5' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }}/>
                <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{t('StudentsWithoutGroup')} ({withoutGroup.length})</h3>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin/users'} icon={<IoPersonOutline size={14}/>}>{t('AddUser').split(' ')[0]}</Button>
                <Button onClick={() => setCreateGrp(true)} icon={<IoAddOutline size={14}/>}>{t('CreateGroup').split(' ')[0]}</Button>
              </div>
            </div>
            {withoutGroup.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>{t('AllStudentsInGroup')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {withoutGroup.map(s => (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {s.name?.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.specialite} · {s.promo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}/>
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{t('Members')} ({withGroup.length})</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
              {withGroup.map(s => {
                const grp = safeGroups.find(g => (g.studentIds || g.members?.map(m => m.cid || m._id) || []).includes(s._id));
                return (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {s.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{grp?.name || grp?.groupCode || '—'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <GroupDetailModal group={detailGrp} users={safeUsers} onClose={() => setDetailGrp(null)} onAssignJury={g => { setDetailGrp(null); setJuryGrp(g); }}/>
      {juryGrp && <JuryModal group={juryGrp} users={safeUsers} onClose={() => setJuryGrp(null)} onAssign={handleAssignJury}/>}
      {createGrp && <CreateGroupModal withoutGroup={withoutGroup} onClose={() => setCreateGrp(false)} onSubmit={addGroup} />}
    </DashboardLayout>
  );
}
