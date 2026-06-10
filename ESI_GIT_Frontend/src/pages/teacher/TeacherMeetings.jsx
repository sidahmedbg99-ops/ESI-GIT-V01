import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  IoCalendarOutline, IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoHourglassOutline, IoTimeOutline, IoPeopleOutline, IoVideocamOutline,
  IoLocationOutline, IoSearchOutline,
} from 'react-icons/io5';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import toast from 'react-hot-toast';

function makeStatusCfg(t) {
  return {
    pending:   { label: t('MeetingStatusPending'),   variant: 'warning', icon: <IoHourglassOutline size={13}/> },
    approved:  { label: t('MeetingStatusApproved'),  variant: 'success', icon: <IoCheckmarkCircleOutline size={13}/> },
    rejected:  { label: t('MeetingStatusRejected'),  variant: 'danger',  icon: <IoCloseCircleOutline size={13}/> },
    cancelled: { label: t('MeetingStatusCancelled'), variant: 'default', icon: <IoCloseCircleOutline size={13}/> },
  };
}

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];

function parseDateTime(m) {
  return new Date(`${m.date}T${m.time || '00:00:00'}`);
}

function DateChip({ dateStr, isPast }) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00');
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '10px',
      background: isPast ? 'var(--bg)' : 'var(--primary-subtle)',
      color: isPast ? 'var(--text-muted)' : 'var(--primary)',
      border: isPast ? '1px solid var(--border)' : 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
      <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {MONTHS_SHORT[d.getMonth()]}
      </span>
    </div>
  );
}

function MeetingCard({ m, isPast, onApprove, onReject, onCancel, onAttendance, statusCfg, t }) {
  const timeStr = m.time ? m.time.slice(0, 5) : null;

  return (
    <Card hover style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <DateChip dateStr={m.date} isPast={isPast}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                {m.project_name || m.group || '—'}
              </span>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{m.title}</h3>
            </div>
            <Badge variant={statusCfg[m.status]?.variant ?? 'default'} style={{ flexShrink: 0 }}>
              {statusCfg[m.status]?.icon} {statusCfg[m.status]?.label ?? m.status}
            </Badge>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {timeStr && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoTimeOutline size={12}/> {timeStr}
              </span>
            )}
            {m.type && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoVideocamOutline size={12}/> {m.type}
              </span>
            )}
            {(m.location || m.desc) && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IoLocationOutline size={12}/> {m.location || m.desc}
              </span>
            )}
          </div>

          {m.cancellation_reason && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>
              {t('CancellationReason')} : {m.cancellation_reason}
            </p>
          )}

          {/* Actions */}
          {m.status === 'pending' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onApprove(m.id)} style={{ padding: '7px 16px', borderRadius: '8px', background: '#DCFCE7', border: 'none', color: '#16A34A', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                ✓ {t('ApproveMeeting')}
              </button>
              <button onClick={() => onReject(m.id)} style={{ padding: '7px 16px', borderRadius: '8px', background: '#FEE2E2', border: 'none', color: '#DC2626', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                ✕ {t('RejectMeeting')}
              </button>
            </div>
          )}
          {m.status === 'approved' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => onAttendance(m)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--primary-subtle)', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                📋 {t('Attendances')}
              </button>
              {!isPast && (
                <button onClick={() => onCancel(m)} style={{ padding: '6px 14px', borderRadius: '8px', background: 'none', border: '1px solid #DC2626', color: '#DC2626', fontSize: '12px', cursor: 'pointer' }}>
                  {t('CancelMeeting')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: '8px' }}>
      <h2 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </h2>
      {count > 0 && (
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px', background: color || 'var(--primary)', color: '#fff' }}>
          {count}
        </span>
      )}
    </div>
  );
}

export default function TeacherMeetings() {
  const { meetings, acceptMeeting, rejectMeeting, cancelMeeting } = useTeacher();
  const { t } = useLanguage();
  const list = meetings || [];
  const STATUS_CFG = makeStatusCfg(t);

  // Group filter
  const [groupFilter, setGroupFilter] = useState('');

  // ── Attendance modal ──
  const [attendanceModal, setAttendanceModal] = useState(null);
  const [roster, setRoster]       = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingRoster, setSavingRoster]   = useState(false);

  // ── Cancel modal ──
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);

  const openAttendance = useCallback(async (meeting) => {
    setAttendanceModal({ meetingId: meeting.id, title: meeting.title });
    setLoadingRoster(true);
    try {
      const res = await client.get(ENDPOINTS.meetings.teacherAttendance(meeting.id));
      setRoster(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error(t('CancelError'));
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  const toggleAttended = (cid) => {
    setRoster(prev => prev.map(r => r.cid === cid ? { ...r, attended: !r.attended } : r));
  };

  const saveAttendance = async () => {
    setSavingRoster(true);
    try {
      await client.put(ENDPOINTS.meetings.teacherAttendance(attendanceModal.meetingId), roster);
      toast.success(t('AttendanceSaved'));
      setAttendanceModal(null);
    } catch {
      toast.error(t('CancelError'));
    } finally {
      setSavingRoster(false);
    }
  };

  const openCancelModal = (meeting) => { setCancelModal(meeting); setCancelReason(''); };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await cancelMeeting(cancelModal.id, cancelReason.trim());
      setCancelModal(null);
    } catch {
      toast.error(t('CancelError'));
    } finally {
      setCancelling(false);
    }
  };

  // ── Group names for filter ──
  const groupNames = useMemo(() => {
    const names = [...new Set(list.map(m => m.project_name || m.group).filter(Boolean))].sort();
    return names;
  }, [list]);

  const filtered = groupFilter ? list.filter(m => (m.project_name || m.group) === groupFilter) : list;

  // ── Sort into sections, separating PAST approved from UPCOMING approved ──
  const now = new Date();
  const pending        = filtered.filter(m => m.status === 'pending').sort((a, b) => parseDateTime(a) - parseDateTime(b));
  const upcomingApproved = filtered.filter(m => m.status === 'approved' && parseDateTime(m) >= now).sort((a, b) => parseDateTime(a) - parseDateTime(b));
  const pastApproved   = filtered.filter(m => m.status === 'approved' && parseDateTime(m) < now).sort((a, b) => parseDateTime(b) - parseDateTime(a));
  const cancelledRejected = filtered.filter(m => m.status === 'rejected' || m.status === 'cancelled').sort((a, b) => parseDateTime(b) - parseDateTime(a));
  const past = [...pastApproved, ...cancelledRejected].sort((a, b) => parseDateTime(b) - parseDateTime(a));

  const commonProps = { onApprove: acceptMeeting, onReject: rejectMeeting, onCancel: openCancelModal, onAttendance: openAttendance, statusCfg: STATUS_CFG, t };

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('Meetings')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('GroupsSupervision')}</p>
        </div>
        {/* Summary chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {pending.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #F59E0B' }}>
              <IoHourglassOutline size={14} color="#D97706"/>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97706' }}>{pending.length} {t('MeetingStatusPending').toLowerCase()}</span>
            </div>
          )}
          {upcomingApproved.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', background: '#DCFCE7', border: '1px solid #16A34A' }}>
              <IoCheckmarkCircleOutline size={14} color="#16A34A"/>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>{upcomingApproved.length} {t('UpcomingMeetings').toLowerCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Group filter */}
      {groupNames.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <IoPeopleOutline size={15} color="var(--text-muted)"/>
          <button onClick={() => setGroupFilter('')}
            style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', background: !groupFilter ? 'var(--primary)' : 'transparent', color: !groupFilter ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('AllGroups2')}
          </button>
          {groupNames.map(name => (
            <button key={name} onClick={() => setGroupFilter(name)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', background: groupFilter === name ? 'var(--primary)' : 'transparent', color: groupFilter === name ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <Card style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <IoCalendarOutline size={40} style={{ marginBottom: '12px', opacity: 0.3 }}/>
          <p style={{ fontSize: '14px' }}>{t('NoMeetings')}</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Pending */}
          {pending.length > 0 && (
            <>
              <SectionHeader label={t('PendingMeetings')} count={pending.length} color="#D97706"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {pending.map(m => <MeetingCard key={m.id} m={m} isPast={false} {...commonProps}/>)}
              </div>
            </>
          )}

          {/* Upcoming approved */}
          {upcomingApproved.length > 0 && (
            <>
              <SectionHeader label={t('UpcomingMeetings')} count={upcomingApproved.length} color="var(--primary)"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {upcomingApproved.map(m => <MeetingCard key={m.id} m={m} isPast={false} {...commonProps}/>)}
              </div>
            </>
          )}

          {/* Past (approved past + cancelled/rejected) */}
          {past.length > 0 && (
            <>
              <SectionHeader label={t('PastCancelledMeetings')} count={0} color="var(--text-muted)"/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {past.map(m => <MeetingCard key={m.id} m={m} isPast={true} {...commonProps}/>)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Attendance modal */}
      {attendanceModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, width: 420, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('AttendancesTitle')} — {attendanceModal.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{t('CheckPresentMembers')}</p>
            {loadingRoster ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>{t('SavingAttendance')}</p>
            ) : roster.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>{t('NoMembersFound')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {roster.map(r => (
                  <label key={r.cid} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, border: '1px solid var(--border)',
                    background: r.attended ? 'var(--primary-subtle)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <input type="checkbox" checked={r.attended} onChange={() => toggleAttended(r.cid)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}/>
                    <span style={{ fontSize: 14, fontWeight: r.attended ? 600 : 400 }}>{r.student_name}</span>
                    {r.attended
                      ? <IoCheckmarkCircleOutline size={16} color="var(--primary)" style={{ marginLeft: 'auto' }}/>
                      : <IoCloseCircleOutline size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }}/>
                    }
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setAttendanceModal(null)}>{t('Cancel')}</Button>
              <Button onClick={saveAttendance} disabled={savingRoster || loadingRoster}>
                {savingRoster ? t('SavingAttendance') : t('SaveAttendance')}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cancel modal */}
      {cancelModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, width: 420, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{t('CancelConfirmTitle')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              <strong>{cancelModal.title}</strong> — {cancelModal.date}{cancelModal.time ? ` à ${cancelModal.time.slice(0,5)}` : ''}
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                {t('CancellationReason')} <span style={{ fontWeight: 400 }}>({t('Optional')})</span>
              </label>
              <textarea
                value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder={t('CancelReasonPlaceholder')}
                style={{ width: '100%', minHeight: '80px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setCancelModal(null)}>{t('Back')}</Button>
              <button
                onClick={confirmCancel} disabled={cancelling}
                style={{ padding: '8px 18px', borderRadius: '10px', background: '#DC2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.7 : 1 }}
              >
                {cancelling ? `${t('CancelMeeting')}…` : t('CancelConfirmTitle')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
}
