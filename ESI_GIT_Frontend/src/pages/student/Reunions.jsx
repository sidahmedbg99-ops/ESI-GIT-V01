import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IoAddOutline, IoCalendarOutline, IoTimeOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoHourglassOutline,
  IoVideocamOutline, IoPersonOutline,
} from 'react-icons/io5';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useStudent } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';
import { meetingsApi } from '../../api/meetings';
import toast from 'react-hot-toast';
import UserPopover from '../../components/ui/UserPopover';

/* ─── status display config ──────────────────────────────────── */
function makeStatusConfig(t) {
  return {
    pending:   { label: t('MeetingStatusPending'),   variant: 'warning', icon: <IoHourglassOutline size={14} /> },
    approved:  { label: t('MeetingStatusAccepted'),  variant: 'success', icon: <IoCheckmarkCircleOutline size={14} /> },
    rejected:  { label: t('MeetingStatusRejected'),  variant: 'danger',  icon: <IoCloseCircleOutline size={14} /> },
    cancelled: { label: t('MeetingStatusCancelled'), variant: 'default', icon: <IoCloseCircleOutline size={14} /> },
  };
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/* ─── calendar: highlights days that have meetings ───────────── */
function MiniCalendar({ meetings }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Build the set of day-numbers that have a meeting in the current month/year
  const meetingDays = new Set(
    (meetings ?? [])
      .filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date + 'T00:00:00');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .map(m => new Date(m.date + 'T00:00:00').getDate())
  );

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const offset = (firstDay + 6) % 7;
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => i < offset ? null : i - offset + 1);

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>‹</button>
        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{MONTHS[currentMonth]} {currentYear}</h3>
        <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} style={{
            textAlign: 'center', padding: '6px 0', borderRadius: '6px', fontSize: '13px',
            background: day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              ? 'var(--primary)' : meetingDays.has(day) ? 'var(--primary-subtle)' : 'transparent',
            color: day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
              ? '#fff' : meetingDays.has(day) ? 'var(--primary)' : day ? 'var(--text-primary)' : 'transparent',
            fontWeight: meetingDays.has(day) || (day === today.getDate() && currentMonth === today.getMonth()) ? 600 : 400,
            cursor: day ? 'pointer' : 'default', position: 'relative',
          }}>
            {day || ''}
            {meetingDays.has(day) && !(day === today.getDate() && currentMonth === today.getMonth()) && (
              <span style={{ position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--primary)' }} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

const EMPTY_FORM = { title: '', date: '', time: '', desc: '', type: 'Présentielle' };

export default function Reunions() {
  // ── Context ──────────────────────────────────────────────────
  const { meetings, addMeeting, group } = useStudent();
  const { t, lang } = useLanguage();
  const STATUS_CONFIG = makeStatusConfig(t);

  // ── Local UI state ───────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [popover, setPopover] = useState(null);
  // attendance: { [meetingId]: [{ cid, student_name, attended }] }
  const [attendanceCache, setAttendanceCache] = useState({});

  const fetchAttendance = useCallback(async (meetingId) => {
    if (attendanceCache[meetingId]) return;
    try {
      const res = await client.get(ENDPOINTS.meetings.attendance(meetingId));
      setAttendanceCache(prev => ({ ...prev, [meetingId]: Array.isArray(res.data) ? res.data : [] }));
    } catch { /* silently skip */ }
  }, [attendanceCache]);

  const encadreurName = group?.encadreur ?? group?.supervisorName ?? '—';

  // ── Live meetings state (replaces context copy with polled data) ──
  const [liveMeetings, setLiveMeetings] = useState(Array.isArray(meetings) ? meetings : []);
  const pollRef = useRef(null);

  const fetchMeetings = async () => {
    try {
      const data = await meetingsApi.getGroupMeetings();
      setLiveMeetings(Array.isArray(data) ? data : []);
    } catch { /* keep stale data */ }
  };

  useEffect(() => {
    if (!group) return;
    fetchMeetings();
    pollRef.current = setInterval(fetchMeetings, 30_000);
    return () => clearInterval(pollRef.current);
  }, [group]);

  /* ── submit: POST to real API ─────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Date validation
    if (!formData.date) { setError(t('DateRequired')); return; }
    const selectedDate = new Date(formData.date + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) { setError(t('DatePastError')); return; }
    // Limit meetings to within ~1 year ahead
    const maxDate = new Date(); maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (selectedDate > maxDate) { setError(t('DateTooFarError')); return; }
    if (!formData.time) { setError(t('TimeRequired')); return; }
    if (!formData.title.trim()) { setError(t('TitleRequired')); return; }

    try {
      await meetingsApi.createMeeting({
        title:    formData.title,
        date:     formData.date,
        time:     formData.time || '00:00',
        location: formData.desc || 'À définir',
      });
      toast.success(t('MeetingRequest'));
      setModalOpen(false);
      setFormData(EMPTY_FORM);
      fetchMeetings();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Erreur lors de la création';
      setError(msg);
    }
  };

  /* ── split into upcoming vs history by real date/time ───────── */
  const list = liveMeetings;
  const _parseDate = m => new Date(`${m.date}T${m.time || '00:00:00'}`);
  const _now = new Date();
  const upcoming = list
    .filter(m => {
      if (m.status === 'rejected' || m.status === 'cancelled') return false;
      if (m.status === 'approved') return _parseDate(m) >= _now;
      return true; // pending stays in upcoming regardless of date
    })
    .sort((a, b) => _parseDate(a) - _parseDate(b));
  const history = list
    .filter(m => {
      if (m.status === 'approved') return _parseDate(m) < _now;
      return m.status === 'rejected' || m.status === 'cancelled';
    })
    .sort((a, b) => _parseDate(b) - _parseDate(a));



  if (!group) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <IoCalendarOutline size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('Meetings')}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '24px' }}>
            {t('MustJoinGroup')}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Block access if no supervisor assigned yet
  if (!group.encadreur || group.encadreur === '—') {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '20px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '2px solid #F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <IoPersonOutline size={36} style={{ color: '#D97706' }} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '10px', color: 'var(--text-primary)' }}>{t('NoSupervisorMeetings')}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '460px', marginBottom: '28px', lineHeight: 1.7 }}>
            {t('NoSupervisorMeetingsDesc')}
          </p>
          <a
            href="/student/groupe"
            style={{ padding: '12px 28px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(79,70,229,0.25)' }}
          >
            {t('GoToGroupPage')}
          </a>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('Meetings')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ScheduleMeeting')}</p>
        </div>
        <Button icon={<IoAddOutline size={18} />} onClick={() => setModalOpen(true)}>
          {t('NewMeeting')}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

        {/* Meetings list */}
        <div>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Upcoming */}
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('UpcomingSection')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                {t('NoUpcomingMeetings')}
              </p>
            ) : upcoming.map((m) => {
              const d = m.date ? new Date(m.date + 'T00:00:00') : null;
              const timeStr = m.time ? m.time.slice(0, 5) : null;
              const att = attendanceCache[m.id];
              const isApproved = m.status === 'approved';
              return (
                <Card key={m.id} hover style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '16px', fontWeight: 800 }}>{d ? d.getDate() : '—'}</span>
                        <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {d ? MONTHS[d.getMonth()].slice(0, 3) : ''}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{m.title}</h3>
                          {m.createdBy && m.createdBy.startsWith('T') && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: '#EEF2FF', color: 'var(--primary)' }}>
                              👨‍🏫 {t('ScheduledByTeacher')}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {timeStr && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoTimeOutline size={13} /> {timeStr}</span>}
                          {encadreurName !== '—' && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoPersonOutline size={13} /> {encadreurName}</span>}
                          {m.type && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoVideocamOutline size={13} /> {m.type}</span>}
                        </div>
                        {m.desc && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>{m.desc}</p>}
                        {/* Attendance (read-only) for approved upcoming meetings */}
                        {isApproved && (
                          <div style={{ marginTop: 8 }}>
                            {att ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {att.map(r => (
                                  <span key={r.cid} style={{
                                    fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
                                    background: r.attended ? '#DCFCE7' : '#FEE2E2',
                                    color: r.attended ? '#16A34A' : '#DC2626',
                                    display: 'flex', alignItems: 'center', gap: 3,
                                  }}>
                                    {r.attended ? <IoCheckmarkCircleOutline size={11}/> : <IoCloseCircleOutline size={11}/>}
                                    {r.student_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={() => fetchAttendance(m.id)}
                                style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                              >
                                {t('ViewAttendance')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={STATUS_CONFIG[m.status]?.variant ?? 'default'}>
                      {STATUS_CONFIG[m.status]?.icon} {STATUS_CONFIG[m.status]?.label ?? m.status}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* History */}
          {history.length > 0 && (
            <>
              <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('HistorySection')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((m) => {
                  const d = m.date ? new Date(m.date + 'T00:00:00') : null;
                  const timeStr = m.time ? m.time.slice(0, 5) : null;
                  const att = attendanceCache[m.id];
                  const isApproved = m.status === 'approved';
                  return (
                    <Card key={m.id} style={{ padding: '14px 18px', opacity: m.status === 'rejected' ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600 }}>{m.title}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {d ? d.toLocaleDateString() : '—'}{timeStr ? ` · ${timeStr}` : ''}{encadreurName !== '—' ? ` · ${encadreurName}` : ''}
                          </p>
                          {/* Attendance badges for approved meetings */}
                          {isApproved && (
                            <div style={{ marginTop: 6 }}>
                              {att ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {att.map(r => (
                                    <span key={r.cid} style={{
                                      fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
                                      background: r.attended ? '#DCFCE7' : '#FEE2E2',
                                      color: r.attended ? '#16A34A' : '#DC2626',
                                      display: 'flex', alignItems: 'center', gap: 3,
                                    }}>
                                      {r.attended ? <IoCheckmarkCircleOutline size={11}/> : <IoCloseCircleOutline size={11}/>}
                                      {r.student_name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  onClick={() => fetchAttendance(m.id)}
                                  style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                >
                                  {t('ViewAttendance')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant={STATUS_CONFIG[m.status]?.variant ?? 'default'}>{STATUS_CONFIG[m.status]?.label ?? m.status}</Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Calendar + encadreur */}
        <div>
          <MiniCalendar meetings={liveMeetings} />
          <Card style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>{t('Encadreur')}</h4>
            {group?.encadreur || group?.supervisorName ? (
              <div
                onClick={e => setPopover({ user: { name: encadreurName, email: group?.encadreur_email || group?.teacher_email || group?.supervisor_email || group?.encadreurEmail || group?.teacherEmail || null }, anchor: { x: e.clientX, y: e.clientY } })}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {encadreurName.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{encadreurName}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('Encadreur')}</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('NoSupervisorMeetings')}</p>
            )}
          </Card>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('NewMeeting')} size="md">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Objet de la réunion" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Revue d'avancement sprint 3" required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Date" type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))} required />
            <Input label="Heure" type="time" value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))} required />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type</label>
            <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
              <option>Présentielle</option>
              <option>En ligne (Teams)</option>
              <option>En ligne (Zoom)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description</label>
            <textarea value={formData.desc} onChange={e => setFormData(f => ({ ...f, desc: e.target.value }))} placeholder="Décrivez l'objectif de cette réunion..." rows={4} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setModalOpen(false)} type="button">{t('Cancel')}</Button>
            <Button type="submit">{t('MeetingRequest')}</Button>
          </div>
        </form>
      </Modal>
      {popover && <UserPopover user={popover.user} anchor={popover.anchor} onClose={() => setPopover(null)}/>}
    </DashboardLayout>
  );
}