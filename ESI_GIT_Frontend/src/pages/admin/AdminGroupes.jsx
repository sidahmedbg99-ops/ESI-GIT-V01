import { useState, useEffect } from 'react';
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
import AttachmentsPopover from '../../components/ui/AttachmentsPopover';

// ── Jury assign modal ──────────────────────────────────────────────
function JuryModal({ group, users, onClose, onAssign, isEdit}) {
  const { t } = useLanguage();
  const supervisorId = group?.teacherId;

  // All teachers (include admin-teachers, include the supervisor)
  const allTeachers = (users || [])
    .filter(u => u.role === 'teacher' || u.role === 'admin' || u.type === 'staff')
    .sort((a, b) => {
      const aId = a._id ?? a.id;
      const bId = b._id ?? b.id;
      if (aId === supervisorId) return -1;
      if (bId === supervisorId) return 1;
      return 0;
    });

  // Pre-select supervisor as president
  const [selected, setSelected] = useState(() => {
    if (isEdit && group.jury?.teacher1_id) {
      return [
        { teacherId: group.jury.teacher1_id, role: 'president' },
        { teacherId: group.jury.teacher2_id, role: 'examiner' },
        { teacherId: group.jury.teacher3_id, role: 'examiner' },
      ];
    }
    if (!supervisorId) return [];
    return [{ teacherId: supervisorId, role: 'president' }];
  });

  const toggle = (id) => {
    setSelected(prev => {
      const exists = prev.find(x => x.teacherId === id);
      if (exists) {
        // Don't allow deselecting supervisor
        if (id === supervisorId) return prev;
        return prev.filter(x => x.teacherId !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, { teacherId: id, role: 'examiner' }];
    });
  };

  const changeRole = (e, id) => {
    e.stopPropagation();
    setSelected(prev => prev.map(x => x.teacherId === id ? { ...x, role: e.target.value } : x));
  };

  const supervisorIncluded = selected.some(x => x.teacherId === supervisorId);
  const presidentCount = selected.filter(x => x.role === 'president').length;

  const originalMap = isEdit && group.jury?.teacher1_id
    ? {
        [group.jury.teacher1_id]: 'president',
        [group.jury.teacher2_id]: 'examiner',
        [group.jury.teacher3_id]: 'examiner',
      }
    : null;
  const hasChanges = !isEdit || !originalMap ||
    selected.some(x => !(x.teacherId in originalMap)) ||
    selected.some(x => x.teacherId in originalMap && x.role !== originalMap[x.teacherId]) ||
    Object.keys(originalMap).some(id => !selected.find(x => String(x.teacherId) === String(id)));

  const canSubmit = selected.length === 3 && supervisorIncluded && presidentCount === 1 && hasChanges;

  const handleSubmit = () => {
    const pres = selected.find(x => x.role === 'president') || selected[0];
    const rest = selected.filter(x => x.teacherId !== pres.teacherId);
    onAssign(group._id ?? group.PID, {
      teacher1: pres.teacherId,
      teacher2: rest[0]?.teacherId,
      teacher3: rest[1]?.teacherId,
    }, isEdit);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`${t('AssignJury')} — ${group?.title || group?.groupCode}`} size="md">
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Sélectionnez 3 enseignants. L'encadreur est pré-sélectionné et obligatoire.
      </p>

      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.06em' }}>
        {selected.length}/3 sélectionnés
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px', maxHeight: '340px', overflowY: 'auto' }}>
        {allTeachers.map(tVal => {
          const id = tVal._id ?? tVal.id;
          const sel = selected.find(x => x.teacherId === id);
          const isSelected = !!sel;
          const isSupervisor = id === supervisorId;
          const disabled = !isSelected && selected.length >= 3;

          return (
            <div key={id} onClick={() => !disabled && toggle(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', borderRadius: '10px',
                background: isSelected ? 'var(--primary-subtle)' : 'var(--bg)',
                border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                cursor: isSupervisor ? 'default' : (disabled ? 'not-allowed' : 'pointer'),
                opacity: disabled ? 0.45 : 1,
                transition: 'all 0.15s',
              }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSupervisor ? 'var(--primary)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {tVal.name?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600 }}>{tVal.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tVal.specialty || tVal.department || '—'}</p>
              </div>
              {isSupervisor && (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#10B98120', color: '#10B981', flexShrink: 0 }}>
                  Encadreur
                </span>
              )}
              {isSelected && (
                <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <select value={sel.role} onChange={e => changeRole(e, id)}
                    style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)', background: '#fff', outline: 'none' }}>
                    <option value="president">Président</option>
                    <option value="examiner">Examinateur</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
        {allTeachers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>{t('NoGroupYet')}</p>}
      </div>

      {selected.length === 3 && !supervisorIncluded && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
          ⚠️ L'encadreur doit faire partie des 3 membres du jury.
        </div>
      )}

      {selected.length === 3 && presidentCount !== 1 && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
          ⚠️ Le jury doit avoir exactement 1 président.
        </div>
      )}

      {isEdit && selected.length === 3 && !hasChanges && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', fontSize: '12px', fontWeight: 600, marginBottom: '12px' }}>
          ℹ️ Aucune modification détectée.
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: canSubmit ? 'var(--success)' : 'var(--text-muted)' }}>
          {canSubmit ? '✅ Jury complet' : presidentCount !== 1 ? `${presidentCount} président(s) — 1 requis` : `${selected.length}/3 membres`}
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSubmit} icon={<IoRibbonOutline size={16}/>} disabled={!canSubmit}>
            {t('AssignJury')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


// ── Schedule modal ─────────────────────────────────────────────────
function ScheduleModal({ group, onClose, onSchedule }) {
  const { t } = useLanguage();
  const [date, setDate]     = useState('');
  const [time, setTime]     = useState('');
  const [room, setRoom]     = useState('');
  const [dept, setDept]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');

  const today = new Date().toISOString().split('T')[0];
  const canSubmit = date && time && room.trim() && dept && date >= today;

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onSchedule(group._id ?? group.PID, { date, time, room: room.trim(), department: dept });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || t('Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' };

  return (
    <Modal isOpen onClose={onClose} title={`Planifier la soutenance — ${group?.title || group?.groupCode}`} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Date *</label>
          <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} style={inputStyle}/>
          {date && date < today && (
            <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>La date ne peut pas être dans le passé.</p>
          )}
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Heure *</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle}/>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Salle *</label>
          <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="ex: Salle A1" style={inputStyle}/>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Département *</label>
          <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
            <option value="" disabled hidden>— Sélectionner —</option>
            <option value="PREP">PREP</option>
            <option value="SUP">SUP</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} icon={<IoTimeOutline size={16}/>}>
            {submitting ? t('Loading') : 'Planifier'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
// ── Group detail modal ─────────────────────────────────────────────
function GroupDetailModal({ group: g, users, onClose, onAssignJury, onSchedule }) {
  const { t } = useLanguage();
  if (!g) return null;
  const finalGrade  = g.grades?.final_grade ?? null;
  const attachments = g.attachments ?? [];
  
  const teacher = (users || []).find(u => u._id === g.teacherId);
  let juryMembers = [];
  if (Array.isArray(g.jury)) {
    // Fallback for legacy mock data arrays
    juryMembers = g.jury.map(j => {
      const isObj = typeof j === 'object';
      const id = isObj ? j.teacherId : j;
      const roleKey = isObj ? j.role : '';
      const user = (users || []).find(u => u._id === id);
      const roleName = t(`JuryRoles.${roleKey}`) || roleKey;
      return { name: user?.name || id, role: roleName };
    });
  } else if (g.jury && typeof g.jury === 'object') {
    // Handle real backend object format
    if (g.jury.president) juryMembers.push({ name: g.jury.president, role: 'Président', grade: g.grades?.grade1 });
    if (g.jury.examiner1) juryMembers.push({ name: g.jury.examiner1, role: 'Examinateur', grade: g.grades?.grade2 });
    if (g.jury.examiner2) juryMembers.push({ name: g.jury.examiner2, role: 'Examinateur', grade: g.grades?.grade3 });
  }
    

  return (
    <Modal isOpen onClose={onClose} title={g.groupCode ?? g.title} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{t('Projects').slice(0,-1)}</p>
          <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>{g.title || '—'}</p>
          {g.description && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontStyle: 'italic' }}>{g.description}</p>}
          {g.tech_stack && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {g.tech_stack.split(',').map((t, i) => <span key={i} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{t.trim()}</span>)}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { label: t('Supervisor'), value: teacher?.name || g.teacher_name || g.encadreur || '—' },
            { label: t('Status'),    value: g.archived ? t('Archive') : t('Active_Stat') },
            { label: t('Members'),   value: (g.Student_count || (g.members || g.studentIds || []).length) + ' ' + t('Students').toLowerCase() },
            { label: t('Approve'), value: g.final_submission_approved ? t('Approve') : t('InProgress') },
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {juryMembers.map((member, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{member.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({member.role})</span>
                  </div>
                  {member.grade !== undefined && member.grade !== null ? (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>{member.grade}/20</span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('NonGraded')}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('NoJuryAssigned')}</p>
          )}
        </div>
        
        {/* Final grade */}
        {finalGrade !== null && (
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--primary-subtle)', border: '1px solid var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Note finale</p>
            <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{finalGrade}<span style={{ fontSize: '14px', fontWeight: 500 }}>/20</span></span>
          </div>
        )}

        {/* Presentation */}
        <div style={{ padding: '14px', borderRadius: '10px', background: g.schedule ? 'var(--primary-subtle)' : 'var(--bg)', border: `1px solid ${g.schedule ? '#10B981' : 'var(--border)'}` }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Soutenance</p>
          {g.schedule ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700 }}>
                📅 {g.schedule.presentation_date} &nbsp;🕐 {g.schedule.presentation_time}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                🚪 {g.schedule.room}{g.schedule.department_name ? ` — ${g.schedule.department_name}` : ''}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Non planifiée</p>
          )}
        </div>

        {/* Attachments */}
        <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Livrables {attachments.length > 0 && `(${attachments.length})`}
            </p>
            {attachments.length > 0 && (
              <button
                onClick={async () => {
                  const JSZip = (await import('jszip')).default;
                  const { saveAs } = await import('file-saver');
                  const zip = new JSZip();
                  await Promise.all(attachments.map(async a => {
                    if (!a.file_url) return;
                    try {
                      const res = await fetch(a.file_url);
                      const blob = await res.blob();
                      zip.file(a.filename, blob);
                    } catch {}
                  }));
                  const content = await zip.generateAsync({ type: 'blob' });
                  saveAs(content, 'livrables.zip');
                }}
                style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-subtle)', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
              >
                ⬇ Tout télécharger
              </button>
            )}
          </div>
          {attachments.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aucun livrable soumis.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '168px', overflowY: 'auto' }}>
              {attachments.map(a => (
                <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>📎 {a.filename}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{a.attachment_type} · {new Date(a.uploaded_at).toLocaleDateString()}</span>
                </a>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <div title={!g.final_submission_approved ? t('WaitSupervisorValidation') : ''}>
            <Button
              variant="secondary"
              onClick={() => { onClose(); onSchedule(g); }}
              disabled={!g.final_submission_approved}
              icon={<IoTimeOutline size={16}/>}
            >
              Planifier
            </Button>
          </div>
          <div title={!g.final_submission_approved ? t('WaitSupervisorValidation') : ''}>
            <Button
              onClick={() => { onClose(); onAssignJury(g); }}
              disabled={!g.final_submission_approved}
              icon={<IoRibbonOutline size={16}/>}
            >
              {juryMembers.length ? t('EditJury') : t('AssignJury')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Create group modal ─────────────────────────────────────────────
function CreateGroupModal({ withoutGroup, onClose, onSubmit }) {
  const { t } = useLanguage();
  const { users, platformSettings } = useAdmin();
  const teachers = (users || []).filter(u => u.role === 'teacher' && u.available !== false);
  const types = platformSettings?.project_types ? platformSettings.project_types.split(',') : ['PFE', 'Stage', 'Projet'];
  
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedType, setSelectedType] = useState(types[0] || 'PFE');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [leaderId, setLeaderId] = useState(null);
  const [levelFilter, setLevelFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleStudent = (s) => {
    setSelectedStudents(prev => {
      const exists = prev.find(x => x.cid === s._id);
      if (exists) {
        if (leaderId === s._id) setLeaderId(null);
        return prev.filter(x => x.cid !== s._id);
      }
      if (prev.length < 6) {
        if (prev.length === 0) setLeaderId(s._id); // First student becomes default leader
        return [...prev, { cid: s._id, name: s.name, role: 'fullstack', specialite: s.specialite }];
      }
      return prev;
    });
  };

  const updateRole = (cid, role) => {
    setSelectedStudents(prev => prev.map(x => x.cid === cid ? { ...x, role } : x));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({
        name: 'temp',
        type: selectedType,
        specialty: selectedStudents[0]?.specialite || 'Informatique',
        year: platformSettings?.current_academic_year || new Date().getFullYear().toString(),
        teacher_id: selectedTeacher || null,
        status: 'approved',
        final_submission_approved: true,
        student_ids: selectedStudents.map(s => s.cid),
        leader_id: leaderId,
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || e?.response?.data?.detail || t('Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = selectedStudents.length > 0 && leaderId;

  return (
    <Modal isOpen onClose={onClose} title={t('CreateGroupTitle')} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Project title defaults to temp — notice only */}
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)', fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
          📌 Le titre du projet sera automatiquement mis à <strong>"temp"</strong>. Le chef de groupe devra le modifier après création.
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type de Projet *</label>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
            {types.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Supervisor')} *</label>
          <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
            <option value="">-- {t('Optional')} --</option>
            {teachers.map(tr => <option key={tr._id} value={tr._id}>{tr.name}</option>)}
          </select>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Laissez vide pour laisser le groupe choisir plus tard.</p>
        </div>

        {/* Level filter + Students */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('Students')} (max 6) * — {selectedStudents.length} {t('Assigned')}</label>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="all">{t('All')}</option>
              <option value="L1">L1 (1CPI)</option>
              <option value="L2">L2 (2CPI)</option>
              <option value="L3">L3 (1CS)</option>
              <option value="M1">M1 (2CS)</option>
              <option value="M2">M2 (3CS)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
            {(() => {
              const levelMap = { L1: 1, L2: 2, L3: 3, M1: 4, M2: 5 };
              const visible = levelFilter === 'all'
                ? withoutGroup
                : withoutGroup.filter(s => (s.level === levelMap[levelFilter]) || (s.year === levelFilter));
              if (visible.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>{t('AllStudentsHaveGroup')}</p>;
              return visible.map(s => {
                const sel = selectedStudents.find(x => x.cid === s._id);
                return (
                  <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px', borderRadius: '8px', background: sel ? 'var(--primary-subtle)' : 'transparent', border: sel ? '1px solid var(--primary)' : '1px solid transparent' }}>
                    <input type="checkbox" checked={!!sel} onChange={() => toggleStudent(s)} style={{ cursor: 'pointer' }}/>
                    <span style={{ fontSize: '13px', fontWeight: 600, flex: 1 }}>{s.name} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>— {s.year || ''} {s.specialite || ''}</span></span>
                    {sel && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: leaderId === s._id ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input type="radio" name="leader" checked={leaderId === s._id} onChange={() => setLeaderId(s._id)} style={{ margin: 0 }}/>
                          CHEF
                        </label>
                        <select value={sel.role} onChange={e => updateRole(s._id, e.target.value)} style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--border)', background: '#fff' }}>
                          <option value="fullstack">Fullstack</option>
                          <option value="frontend">Frontend</option>
                          <option value="backend">Backend</option>
                          <option value="design">Design</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting ? t('Loading') : `${t('CreateGroup')} (${selectedStudents.length})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function AdminGroupes() {
  const { t } = useLanguage();
  const { groups, users, departments, updateGroup, addGroup, assignJury, editJury, scheduleDefense, reloadGroups } = useAdmin();
  const safeGroups = groups || [];
  const safeUsers  = users  || [];

  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [detailGrp,    setDetailGrp]    = useState(null);
  const [juryGrp,      setJuryGrp]      = useState(null);
  const [scheduleGrp,  setScheduleGrp]  = useState(null);
  const [createGrp,    setCreateGrp]    = useState(false);

  useEffect(() => { reloadGroups(); }, []);

  const realGroups = safeGroups.filter(g => (g.Student_count > 0));
  
  const filtered = realGroups.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = (g.groupCode?.toLowerCase().includes(q) ?? false) || (g.title?.toLowerCase().includes(q) ?? false);
    const matchFilter = filter === 'all' || (filter === 'approved' && g.final_submission_approved) || (filter === 'pending' && !g.final_submission_approved);
    return matchSearch && matchFilter;
  });

  const handleAssignJury = (groupId, slots, isEdit) => {
    if (isEdit) {
      editJury(groupId, slots);
    } else {
      assignJury(groupId, slots);
    }
  };

  const handleSchedule = async (groupId, payload) => {
    await scheduleDefense(groupId, payload);
    reloadGroups();
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: t('TotalGroups_Stat'),    value: realGroups.length,                                    icon: <IoPeopleOutline size={22}/>, color: 'var(--primary)' },
          { label: t('Approved_Stat') || 'Approuvés', value: realGroups.filter(g => g.final_submission_approved).length,      icon: <IoCheckmarkCircleOutline size={22}/>, color: '#10B981' },
          { label: t('NonApproved_Stat'),    value: realGroups.filter(g => !g.final_submission_approved).length,    icon: <IoTimeOutline size={22}/>, color: '#F59E0B' },
          { label: t('StudentsWithoutGroup'), value: withoutGroup.length,                             icon: <IoSchoolOutline size={22}/>, color: '#EF4444' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '10px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div>

        <div>
          <Card>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search')} icon={<IoSearchOutline size={14}/>}/>
              </div>
              {['all','approved','pending'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 14px', borderRadius: '20px', border: filter === f ? 'none' : '1px solid var(--border)', background: filter === f ? 'var(--primary)' : 'var(--bg)', color: filter === f ? '#fff' : 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  {f === 'all' ? t('All') : f === 'approved' ? (t('Approved_Stat') || 'Approuvés') : t('NonApproved_Stat')}
                </button>
              ))}                
              <Button onClick={() => setCreateGrp(true)} icon={<IoAddOutline size={16}/>} style={{ marginLeft: 'auto' }}>{t('CreateGroup')}</Button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {filtered.map(g => {
                const teacher = safeUsers.find(u => u._id === g.teacherId);
                const hasJury = g.jury && (Array.isArray(g.jury) ? g.jury.length > 0 : Object.keys(g.jury).length > 0);
                return (
                  <div key={g._id} style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'pointer' }} 
                       onClick={() => setDetailGrp(g)}
                       onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                       onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{g.groupCode ?? g.title}</h3>
                          <Badge variant={g.archived ? 'warning' : 'success'}>{g.archived ? t('Archive') : t('Active_Stat')}</Badge>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{g.title}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <button 
                          disabled={!g.final_submission_approved}
                          onClick={() => setJuryGrp(g)} 
                          title={!g.final_submission_approved ? t('WaitSupervisorValidation') : t('AssignJury')}
                          style={{ 
                            width: 34, height: 34, borderRadius: '10px', 
                            background: !g.final_submission_approved ? 'var(--bg)' : (hasJury ? 'var(--primary-subtle)' : 'var(--bg)'), 
                            border: `1px solid ${!g.final_submission_approved ? 'var(--border)' : (hasJury ? 'var(--primary)' : 'var(--border)')}`, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: !g.final_submission_approved ? 'not-allowed' : 'pointer', 
                            color: !g.final_submission_approved ? 'var(--text-muted)' : (hasJury ? 'var(--primary)' : 'var(--text-muted)'),
                            transition: 'all 0.15s'
                          }}
                        >
                          <IoRibbonOutline size={16}/>
                        </button>
                        <button onClick={() => setDetailGrp(g)} style={{ width: 34, height: 34, borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s' }}>
                          <IoEyeOutline size={16}/>
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                          {(teacher?.name || g.teacher_name || 'E').charAt(0)}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{teacher?.name || g.teacher_name || g.encadreur || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <IoPeopleOutline size={14}/>
                        <span style={{ fontSize: '12px' }}>{g.Student_count || 0} {t('Members').toLowerCase()}</span>
                      </div>
                      {g.final_submission_approved && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px', fontWeight: 700, marginLeft: 'auto' }}>
                          <IoCheckmarkCircleOutline size={14}/> {t('Success')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                  <IoPeopleOutline size={48} style={{ marginBottom: '16px', opacity: 0.2 }}/>
                  <p style={{ fontWeight: 600 }}>{t('NoGroups')}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <GroupDetailModal
        group={detailGrp}
        users={safeUsers}
        onClose={() => setDetailGrp(null)}
        onAssignJury={g => { setDetailGrp(null); setJuryGrp(g); }}
        onSchedule={g => { setDetailGrp(null); setScheduleGrp(g); }}
      />
      {juryGrp && <JuryModal group={juryGrp} users={safeUsers} onClose={() => setJuryGrp(null)} onAssign={handleAssignJury} isEdit={!!(juryGrp.jury?.teacher1_id)}/>}
      {scheduleGrp && <ScheduleModal group={scheduleGrp} onClose={() => setScheduleGrp(null)} onSchedule={handleSchedule}/>}
      {createGrp && <CreateGroupModal withoutGroup={withoutGroup} onClose={() => setCreateGrp(false)} onSubmit={addGroup}/>}
    </DashboardLayout>
  );
}
