import { useState, useEffect } from 'react';
import {
  IoPeopleOutline, IoSearchOutline, IoAddOutline, IoEyeOutline,
  IoTrashOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoPersonOutline, IoRibbonOutline, IoSchoolOutline, IoTimeOutline,
  IoArrowBackOutline,IoArchiveOutline,IoCreateOutline,IoStarOutline,
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
import { IoPersonAddOutline, IoSwapHorizontalOutline } from 'react-icons/io5';

// ── Jury + Schedule combined modal ────────────────────────────────
function JuryScheduleModal({ group, users, onClose, onAssign, onSchedule }) {
  const { t } = useLanguage();
  const supervisorId = group?.teacherId;
  const isEdit = !!(group.jury?.president);

  const allTeachers = (users || [])
    .filter(u => u.role === 'teacher' || u.role === 'admin' || u.type === 'staff')
    .sort((a, b) => {
      const aId = a._id ?? a.id; const bId = b._id ?? b.id;
      if (aId === supervisorId) return -1;
      if (bId === supervisorId) return 1;
      return 0;
    });

  // jury state — pre-fill from existing jury names by matching users
  const resolveId = name => (users || []).find(u => u.name === name)?._id;
  const [selected, setSelected] = useState(() => {
    if (isEdit) {
      const t1 = resolveId(group.jury.president);
      const t2 = resolveId(group.jury.examiner1);
      const t3 = resolveId(group.jury.examiner2);
      return [
        t1 && { teacherId: t1, role: 'president' },
        t2 && { teacherId: t2, role: 'examiner' },
        t3 && { teacherId: t3, role: 'examiner' },
      ].filter(Boolean);
    }
    if (!supervisorId) return [];
    return [{ teacherId: supervisorId, role: 'president' }];
  });

  // schedule state — pre-fill from existing schedule
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate]   = useState(group.schedule?.presentation_date  || '');
  const [time, setTime]   = useState(group.schedule?.presentation_time  || '');
  const [room, setRoom]   = useState(group.schedule?.room               || '');
  const [dept, setDept]   = useState(group.schedule?.department_name    || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggle = id => {
    setSelected(prev => {
      const exists = prev.find(x => x.teacherId === id);
      if (exists) { if (id === supervisorId) return prev; return prev.filter(x => x.teacherId !== id); }
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
  const juryValid = selected.length === 3 && supervisorIncluded && presidentCount === 1;
  const scheduleValid = date && time && room.trim() && dept && date >= today;
  const canSubmit = juryValid;

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const pres = selected.find(x => x.role === 'president') || selected[0];
      const rest = selected.filter(x => x.teacherId !== pres.teacherId);
      await onAssign(group._id ?? group.PID, {
        teacher1: pres.teacherId,
        teacher2: rest[0]?.teacherId,
        teacher3: rest[1]?.teacherId,
      }, isEdit);
      if (scheduleValid) {
        await onSchedule(group._id ?? group.PID, { date, time, room: room.trim(), department: dept });
      }
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || t('Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '9px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' };

  return (
    <Modal isOpen onClose={onClose} title={`${isEdit ? 'Modifier' : 'Assigner'} jury & soutenance — ${group?.title || group?.groupCode}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '13px' }}>{error}</div>}

        {/* ── Jury section ── */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Jury — {selected.length}/3 sélectionnés
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
            {allTeachers.map(tVal => {
              const id = tVal._id ?? tVal.id;
              const sel = selected.find(x => x.teacherId === id);
              const isSelected = !!sel;
              const isSupervisor = id === supervisorId;
              const disabled = !isSelected && selected.length >= 3;
              return (
                <div key={id} onClick={() => !disabled && toggle(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '10px',
                    background: isSelected ? 'var(--primary-subtle)' : 'var(--bg)',
                    border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: isSupervisor ? 'default' : disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.45 : 1, transition: 'all 0.15s' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: isSupervisor ? 'var(--primary)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {tVal.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{tVal.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tVal.specialty || tVal.department || '—'}</p>
                  </div>
                  {isSupervisor && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: '#10B98120', color: '#10B981', flexShrink: 0 }}>Encadreur</span>}
                  {isSelected && (
                    <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                      <select value={sel.role} onChange={e => changeRole(e, id)}
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)', background: '#fff', outline: 'none' }}>
                        <option value="president">Président</option>
                        <option value="examiner">Examinateur</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {selected.length === 3 && !supervisorIncluded && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
              ⚠️ L'encadreur doit faire partie du jury.
            </div>
          )}
          {selected.length === 3 && presidentCount !== 1 && (
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>
              ⚠️ Exactement 1 président requis.
            </div>
          )}
        </div>

        {/* ── Schedule section ── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Soutenance <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '11px' }}>(optionnel — peut être complété plus tard)</span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Date</label>
              <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Heure</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Salle</label>
              <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="ex: Salle A1" style={inputStyle}/>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Département</label>
              <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
                <option value="">— Sélectionner —</option>
                <option value="PREP">PREP</option>
                <option value="SUP">SUP</option>
              </select>
            </div>
          </div>
          {date && date < today && <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>La date ne peut pas être dans le passé.</p>}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: juryValid ? 'var(--success)' : 'var(--text-muted)' }}>
            {juryValid ? `✅ Jury complet${scheduleValid ? ' · Soutenance planifiée' : ''}` : `${selected.length}/3 membres jury`}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting} icon={<IoRibbonOutline size={16}/>}>
              {submitting ? t('Loading') : isEdit ? 'Enregistrer' : t('AssignJury')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


// ── Group detail modal ─────────────────────────────────────────────
function GroupDetailModal({ g, users, onClose }) {

  const { t } = useLanguage();
  if (!g) return null;
  const isGraded    = g.grades?.final_grade != null;
  const attachments = g.attachments ?? [];

  const teacher = (users || []).find(u => u._id === g.teacherId);

  let juryMembers = [];
  if (Array.isArray(g.jury)) {
    juryMembers = g.jury.map(j => {
      const isObj = typeof j === 'object';
      const id = isObj ? j.teacherId : j;
      const roleKey = isObj ? j.role : '';
      const user = (users || []).find(u => u._id === id);
      return { name: user?.name || id, role: t(`JuryRoles.${roleKey}`) || roleKey };
    });
  } else if (g.jury && typeof g.jury === 'object') {
    if (g.jury.president) juryMembers.push({ name: g.jury.president, role: 'Président', grade: g.grades?.grade1 });
    if (g.jury.examiner1) juryMembers.push({ name: g.jury.examiner1, role: 'Examinateur', grade: g.grades?.grade2 });
    if (g.jury.examiner2) juryMembers.push({ name: g.jury.examiner2, role: 'Examinateur', grade: g.grades?.grade3 });
  }

  return (
    <Modal isOpen onClose={onClose} title={g.groupCode ?? g.title} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Header: title+tags left, supervisor+members right ── */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
          {/* Left: project title + status tags */}
          <div style={{ flex: 1, padding: '14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>{g.title || '—'}</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {/* Active / Archived */}
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                background: g.archived ? 'var(--warning-subtle, #FEF3C7)' : 'var(--success-subtle, #D1FAE5)',
                color:      g.archived ? 'var(--warning, #D97706)'        : 'var(--success, #059669)' }}>
                {g.archived ? t('Archive') : t('Active_Stat')}
              </span>
              {/* Approved */}
              {g.final_submission_approved && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                  {t('Approve') || 'Approuvé'}
                </span>
              )}
              {/* Graded */}
              {isGraded && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--accent-subtle, #EDE9FE)', color: 'var(--accent, #7C3AED)' }}>
                  {t('Graded') || 'Noté'}
                </span>
              )}
            </div>
          </div>
          {/* Right: supervisor + members count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '160px', flexShrink: 0 }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('Supervisor')}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher?.name || g.teacher_name || g.encadreur || '—'}</p>
            </div>
            <div style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>{t('Members')}</p>
              <p style={{ fontSize: '13px', fontWeight: 600 }}>{g.Student_count || (g.members || []).length} {t('Students').toLowerCase()}</p>
            </div>
          </div>
        </div>

        {/* ── Members list ── */}
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

        {/* ── Jury ── */}
        <div style={{ padding: '14px', borderRadius: '10px', background: juryMembers.length ? 'var(--primary-subtle)' : 'var(--bg)', border: `1px solid ${juryMembers.length ? 'var(--primary)' : 'var(--border)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('JuryAssigned')}</p>
            {isGraded && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                <IoStarOutline size={18} style={{ color: '#F59E0B', flexShrink: 0 }}/>
                {g.grades.final_grade}<span style={{ fontSize: '13px', fontWeight: 500 }}>/20</span>
              </span>
            )}
          </div>
          {juryMembers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {juryMembers.map((member, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{member.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({member.role})</span>
                  </div>
                </div>
              ))}
              {g.grades?.feedback && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px', padding: '0 4px' }}>
                  💬 {g.grades.feedback}
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('NoJuryAssigned')}</p>
          )}
        </div>

        {/* ── Soutenance ── */}
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

        {/* ── Livrables ── */}
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
                    try { const res = await fetch(a.file_url); zip.file(a.filename, await res.blob()); } catch {}
                  }));
                  saveAs(await zip.generateAsync({ type: 'blob' }), 'livrables.zip');
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}

function EditGroupModal({ g, withoutGroup, allUsers, onClose, onAddMember, onRemoveMember, onChangeSupervisor, onArchive, onDone }) {
  const { t } = useLanguage();
  if (!g) return null;

  const groupLevel = g.academic_level ?? null; // integer 1-5
  const levelMapInv = { 1: 'L1', 2: 'L2', 3: 'L3', 4: 'M1', 5: 'M2' };

  const [members, setMembers] = useState(
    (g.members || [])
      .map(m => typeof m === 'object'
        ? { id: m.id ?? m._id ?? m.cid, name: m.name ?? m.student_name, is_leader: m.is_leader ?? false }
        : { id: null, name: m, is_leader: false }
      )
      .sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0))
  );
  const [newMemberCid, setNewMemberCid] = useState('');
  const [newSupId, setNewSupId]       = useState('');
  const [saving, setSaving]           = useState(false);

  const currentSupervisor = (allUsers || []).find(u => u._id === g.teacherId);
  const groupStudentIds = new Set(members.map(m => String(m.id)));
  const availableStudents = (withoutGroup || []).filter(u =>
    (groupLevel === null || u.level === groupLevel) &&
    !groupStudentIds.has(String(u._id))
  );
  const teachers = (allUsers || []).filter(u => u.role === 'teacher' || u.role === 'admin');

  const handleRemove = async (memberId) => {
    setSaving(true);
    const ok = await onRemoveMember(g._id ?? g.PID, memberId);
    if (ok) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      onDone();
    }
    setSaving(false);
  };
  const handleAdd = async () => {
    if (!newMemberCid) return;
    setSaving(true);
    const ok = await onAddMember(g._id ?? g.PID, newMemberCid);
    if (ok) {
      const student = (allUsers || []).find(u => String(u._id) === String(newMemberCid));
      if (student) setMembers(prev => [...prev, { id: student._id, name: student.name, is_leader: false }]);
      setNewMemberCid('');
    }
    setSaving(false);
  };

  const handleChangeSup = async () => {
    if (!newSupId) return;
    setSaving(true);
    await onChangeSupervisor(g._id ?? g.PID, newSupId);
    setSaving(false);
    onDone();
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Modifier — ${g.groupCode ?? g.title}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Members section */}
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.06em' }}>
            Membres ({members.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {members.map((m, i) => {
              const id = m.id ?? m._id ?? m.cid;
              const name = m.name ?? String(m);
              const isLeader = m.is_leader ?? false;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: isLeader ? 'var(--primary)' : 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: isLeader ? '#fff' : 'var(--accent)', flexShrink: 0 }}>
                    {name?.charAt(0)}
                  </div>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{name}</span>
                  {isLeader && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>Chef</span>}
                  {!isLeader && (
                    <button
                      onClick={() => handleRemove(id)}
                      disabled={saving}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Retirer
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add member */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={newMemberCid} onChange={e => setNewMemberCid(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="">— Ajouter un étudiant {groupLevel ? `(${levelMapInv[groupLevel]})` : ''} —</option>
              {availableStudents.map(u => (
                <option key={u._id} value={u._id}>{u.name} — {u.specialite || ''}</option>
              ))}
            </select>
            <Button onClick={handleAdd} disabled={!newMemberCid || saving}>Ajouter</Button>
          </div>
          {availableStudents.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Aucun étudiant sans groupe disponible pour ce niveau.
            </p>
          )}
        </div>

        {/* Supervisor section */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.06em' }}>
            Encadreur
          </p>
          {currentSupervisor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)', marginBottom: '10px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff' }}>
                {currentSupervisor.name?.charAt(0)}
              </div>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{currentSupervisor.name}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: currentSupervisor.available !== false ? '#D1FAE5' : '#FEE2E2', color: currentSupervisor.available !== false ? '#065F46' : '#991B1B' }}>
                {currentSupervisor.available !== false ? 'Disponible' : 'Indisponible'}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={newSupId} onChange={e => setNewSupId(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="">— Changer l'encadreur —</option>
              {teachers.map(u => (
                <option key={u._id} value={u._id}>
                  {u.name} {u.available === false ? '(Indisponible)' : ''}
                </option>
              ))}
            </select>
            <Button onClick={handleChangeSup} disabled={!newSupId || saving}>Confirmer</Button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          {(g.grades?.final_grade != null) && !g.archived && onArchive && (
            <Button
              variant="danger"
              onClick={async () => { await onArchive(g._id ?? g.PID); onClose(); }}
              icon={<IoArchiveOutline size={16}/>}
            >
              Archiver
            </Button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
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
  const types = ['Application Web', 'Application Mobile', 'Application Desktop', 'Système Embarqué', 'Intelligence Artificielle', 'Data Science', 'Cybersécurité', 'Réseau & Infrastructure', 'Autre'];
  
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [supSearch,       setSupSearch]       = useState('');
  const [supOpen,         setSupOpen]         = useState(false);
  const [selectedType, setSelectedType] = useState(types[0] || 'PFE');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [leaderId, setLeaderId] = useState(null);
  const [levelFilter, setLevelFilter] = useState('L2');
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
          📌 Le titre du projet sera <strong>"temp"</strong> par défaut. Le <strong>chef de groupe</strong> pourra modifier le nom et le type du projet après création.
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type de Projet *</label>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
            {types.map(tOption => <option key={tOption} value={tOption}>{tOption}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Supervisor')}</label>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setSupOpen(v => !v)}>
              <IoPersonOutline size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
              <span style={{ flex: 1, color: selectedTeacher ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {selectedTeacher ? (teachers.find(u => String(u._id) === String(selectedTeacher))?.name || 'Encadreur') : `— ${t('Optional')} —`}
              </span>
              {selectedTeacher && (
                <span onClick={e => { e.stopPropagation(); setSelectedTeacher(''); setSupSearch(''); setSupOpen(false); }}
                  style={{ fontSize: '15px', lineHeight: 1, color: 'var(--text-muted)', cursor: 'pointer' }}>×</span>
              )}
            </div>
            {supOpen && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 200, background: 'var(--bg-card, var(--bg))', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                <div style={{ padding: '8px' }}>
                  <input autoFocus value={supSearch} onChange={e => setSupSearch(e.target.value)}
                    placeholder="Rechercher..." style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }}/>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {teachers
                    .filter(u => !supSearch || u.name?.toLowerCase().includes(supSearch.toLowerCase()))
                    .map(u => (
                      <div key={u._id} onClick={() => { setSelectedTeacher(String(u._id)); setSupSearch(''); setSupOpen(false); }}
                        style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer',
                          background: String(u._id) === String(selectedTeacher) ? 'var(--primary-subtle)' : 'transparent',
                          color: String(u._id) === String(selectedTeacher) ? 'var(--primary)' : 'var(--text-primary)',
                          fontWeight: String(u._id) === String(selectedTeacher) ? 700 : 400 }}
                        onMouseEnter={e => { if (String(u._id) !== String(selectedTeacher)) e.currentTarget.style.background = 'var(--bg)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = String(u._id) === String(selectedTeacher) ? 'var(--primary-subtle)' : 'transparent'; }}
                      >{u.name}</div>
                    ))
                  }
                  {teachers.filter(u => !supSearch || u.name?.toLowerCase().includes(supSearch.toLowerCase())).length === 0 && (
                    <p style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Aucun résultat</p>
                  )}
                </div>
              </div>
            )}
          </div>
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
              <option value="L2">2CPI</option>
              <option value="L3">1CS</option>
              <option value="M1">2CS</option>
              <option value="M2">3CS</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
            {(() => {
              const levelMap = { L2: 2, L3: 3, M1: 4, M2: 5 };
              const visible = withoutGroup.filter(s => (s.level === levelMap[levelFilter]) || (s.year === levelFilter));
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
  const { groups, users, archive, departments, updateGroup, addGroup, assignJury, editJury, scheduleDefense, reloadGroups, archiveGroup, addMember, removeMember, changeSupervisor } = useAdmin();

  const safeGroups = groups || [];
  const safeUsers  = users  || [];

  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('all');
  const [filterLevel,  setFilterLevel]  = useState('');
  const [filterTag,    setFilterTag]    = useState('');
  const [filterSup,    setFilterSup]    = useState('');
  const [supSearch,    setSupSearch]    = useState('');
  const [supOpen,      setSupOpen]      = useState(false);
  const [detailGrp,    setDetailGrp]    = useState(null);
  const [editGrp,      setEditGrp]      = useState(null);
  const [jurySchedGrp, setJurySchedGrp] = useState(null);
  const [createGrp,    setCreateGrp]    = useState(false);

  useEffect(() => { reloadGroups(); }, []);

  const realGroups = safeGroups.filter(g => (g.Student_count > 0));
  
  const tagOrder = g => {
    if (g.grades?.final_grade != null) return 2; // graded
    if (g.final_submission_approved)   return 1; // approved
    return 0;                                     // active
  };

  const levelMap = { 1:'L1', 2:'L2', 3:'L3', 4:'M1', 5:'M2' };
  const teachers = safeUsers.filter(u => u.role === 'teacher' || u.role === 'admin');

  const filtered = realGroups
    .filter(g => {
      const q = search.toLowerCase();
      const matchSearch = (g.groupCode?.toLowerCase().includes(q) ?? false) || (g.title?.toLowerCase().includes(q) ?? false);
      const matchTag =
        !filterTag ||
        (filterTag === 'active'    && g.grades?.final_grade == null && !g.final_submission_approved) ||
        (filterTag === 'approved'  && g.final_submission_approved && g.grades?.final_grade == null) ||
        (filterTag === 'graded'    && g.grades?.final_grade != null);
      const matchLevel = !filterLevel || String(g.academic_level) === filterLevel;
      const matchSup   = !filterSup   || String(g.teacherId) === filterSup;
      return matchSearch && matchTag && matchLevel && matchSup;
    })
    .sort((a, b) => tagOrder(a) - tagOrder(b));

  const handleAssignJury = async (groupId, slots, isEdit) => {
    if (isEdit) {
      await editJury(groupId, slots);
    } else {
      await assignJury(groupId, slots);
    }
  };

  const handleSchedule = async (groupId, payload) => {
    await scheduleDefense(groupId, payload);
    reloadGroups();
  };

  const students = safeUsers.filter(u => u.role === 'student');
  const safeArchive = archive || [];
  const archivedStudentIds = new Set(
    safeArchive.flatMap(g => g.members || []).map(m => String(typeof m === 'object' ? m.id : m))
  );
  const activeStudentIds = new Set(
    realGroups.flatMap(g => (g.members || []).map(m => String(m.id ?? m)))
  );
  const studentIds = new Set([...activeStudentIds, ...archivedStudentIds]);
  const withGroup    = students.filter(s => studentIds.has(s._id));
  const withoutGroup = students.filter(s => !studentIds.has(String(s._id)) && s.status !== 'blocked' && s.level !== 1);

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
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search')} icon={<IoSearchOutline size={14}/>}/>
              </div>
              {/* Tag filter */}
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="">Tous les tags</option>
                <option value="active">Actif</option>
                <option value="approved">Approuvé</option>
                <option value="graded">Noté</option>
              </select>
              {/* Level filter — 2CPI/1CS/2CS/3CS only */}
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="">Tous les niveaux</option>
                <option value="2">2CPI</option>
                <option value="3">1CS</option>
                <option value="4">2CS</option>
                <option value="5">3CS</option>
              </select>
              {/* Supervisor — searchable picker */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', minWidth: '160px' }}
                  onClick={() => setSupOpen(v => !v)}>
                  <IoPersonOutline size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
                  <span style={{ flex: 1, color: filterSup ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {filterSup ? (teachers.find(u => String(u._id) === filterSup)?.name || 'Encadreur') : 'Tous les encadreurs'}
                  </span>
                  {filterSup && (
                    <span onClick={e => { e.stopPropagation(); setFilterSup(''); setSupSearch(''); setSupOpen(false); }}
                      style={{ fontSize: '14px', lineHeight: 1, color: 'var(--text-muted)', cursor: 'pointer' }}>×</span>
                  )}
                </div>
                {supOpen && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, background: 'var(--bg-card, var(--bg))', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', minWidth: '220px', overflow: 'hidden' }}>
                    <div style={{ padding: '8px' }}>
                      <input autoFocus value={supSearch} onChange={e => setSupSearch(e.target.value)}
                        placeholder="Rechercher..." style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', outline: 'none', color: 'var(--text-primary)', boxSizing: 'border-box' }}/>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {teachers
                        .filter(u => !supSearch || u.name?.toLowerCase().includes(supSearch.toLowerCase()))
                        .map(u => (
                          <div key={u._id} onClick={() => { setFilterSup(String(u._id)); setSupSearch(''); setSupOpen(false); }}
                            style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: String(u._id) === filterSup ? 'var(--primary-subtle)' : 'transparent', color: String(u._id) === filterSup ? 'var(--primary)' : 'var(--text-primary)', fontWeight: String(u._id) === filterSup ? 700 : 400 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = String(u._id) === filterSup ? 'var(--primary-subtle)' : 'transparent'}
                          >{u.name}</div>
                        ))
                      }
                      {teachers.filter(u => !supSearch || u.name?.toLowerCase().includes(supSearch.toLowerCase())).length === 0 && (
                        <p style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>Aucun résultat</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                          {/* Level badge */}
                          {g.academic_level && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'var(--bg-card, #1e1e2e)', border: '1px solid var(--border)', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {({ 2:'2CPI', 3:'1CS', 4:'2CS', 5:'3CS' })[g.academic_level] || `L${g.academic_level}`}
                            </span>
                          )}
                          {/* Active/Archived tag always shown */}
                          <Badge variant={g.archived ? 'warning' : 'success'}>{g.archived ? t('Archive') : t('Active_Stat')}</Badge>
                          {/* Approved tag */}
                          {g.final_submission_approved && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                              {t('Approve') || 'Approuvé'}
                            </span>
                          )}
                          {/* Graded tag */}
                          {g.grades?.final_grade != null && (
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--accent-subtle, #EDE9FE)', color: 'var(--accent, #7C3AED)' }}>
                              {t('Graded') || 'Noté'}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{g.title}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => setEditGrp(g)} 
                          title="Modifier le groupe"
                          style={{ width: 34, height: 34, borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.15s' }}
                        >
                          <IoCreateOutline size={16}/>
                        </button>
                        {g.final_submission_approved && (() => {
                          const isGraded = g.grades?.final_grade != null;
                          const fullySet = !!g.jury?.president && !!g.schedule?.presentation_date;
                          return (
                            <button
                              onClick={() => !isGraded && setJurySchedGrp(g)}
                              title={isGraded ? 'Projet noté — modification désactivée' : fullySet ? 'Modifier jury & soutenance' : 'Assigner jury & soutenance'}
                              style={{ width: 34, height: 34, borderRadius: '10px',
                                background: fullySet ? 'var(--primary-subtle)' : 'var(--bg)',
                                border: `1px solid ${fullySet ? 'var(--primary)' : 'var(--border)'}`,
                                boxShadow: fullySet ? '0 0 0 2px var(--primary)33' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: isGraded ? 'not-allowed' : 'pointer',
                                color: fullySet ? 'var(--primary)' : 'var(--text-muted)',
                                opacity: isGraded ? 0.4 : 1,
                                transition: 'all 0.15s' }}
                            >
                              <IoRibbonOutline size={16}/>
                            </button>
                          );
                        })()}
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
                      {g.final_submission_approved && (() => {
                        const isGraded  = g.grades?.final_grade != null;
                        const hasJury   = !!g.jury?.president;
                        const hasSched  = !!g.schedule?.presentation_date;
                        if (isGraded) return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent, #7C3AED)', fontSize: '12px', fontWeight: 700, marginLeft: 'auto' }}>
                            ⭐ Noté — {g.grades.final_grade}/20
                          </div>
                        );
                        if (hasJury && hasSched) return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px', fontWeight: 700, marginLeft: 'auto' }}>
                            <IoCheckmarkCircleOutline size={13}/> Prêt pour la soutenance
                          </div>
                        );
                        if (hasJury) return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontSize: '12px', fontWeight: 600, marginLeft: 'auto' }}>
                            ⏳ Jury ✓ — Date manquante
                          </div>
                        );
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B', fontSize: '12px', fontWeight: 600, marginLeft: 'auto' }}>
                            ⏳ Jury requis
                          </div>
                        );
                      })()}
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

      {detailGrp && <GroupDetailModal g={detailGrp} users={safeUsers} onClose={() => setDetailGrp(null)}/>}
      {editGrp && <EditGroupModal g={editGrp} withoutGroup={withoutGroup} allUsers={safeUsers} onClose={() => setEditGrp(null)} onAddMember={addMember} onRemoveMember={removeMember} onChangeSupervisor={changeSupervisor} onArchive={archiveGroup} onDone={reloadGroups}/>}
      {jurySchedGrp && <JuryScheduleModal group={jurySchedGrp} users={safeUsers} onClose={() => { setJurySchedGrp(null); reloadGroups(); }} onAssign={handleAssignJury} onSchedule={handleSchedule}/>}
      {createGrp && <CreateGroupModal withoutGroup={withoutGroup} onClose={() => setCreateGrp(false)} onSubmit={addGroup}/>}
    </DashboardLayout>
  );
}