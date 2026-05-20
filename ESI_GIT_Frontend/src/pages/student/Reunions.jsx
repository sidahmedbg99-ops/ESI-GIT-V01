import { useState } from 'react';
import {
  IoAddOutline, IoCalendarOutline, IoTimeOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline, IoHourglassOutline,
  IoVideocamOutline, IoPersonOutline, IoLocationOutline, IoAlertCircleOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useStudent } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';

/* ─── status display config ──────────────────────────────────── */
const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'warning', icon: <IoHourglassOutline size={14} /> },
  accepted: { label: 'Acceptée', variant: 'success', icon: <IoCheckmarkCircleOutline size={14} /> },
  rejected: { label: 'Refusée', variant: 'danger', icon: <IoCloseCircleOutline size={14} /> },
};

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
        const d = new Date(m.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .map(m => new Date(m.date).getDate())
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

const EMPTY_FORM = { title: '', date: '', time: '', location: '', desc: '', type: 'Présentielle' };

export default function Reunions() {
  // ── Context ──────────────────────────────────────────────────
  const { meetings, addMeeting, group } = useStudent();
  const { t, lang } = useLanguage();

  // ── Local UI state ───────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const encadreurName = group?.encadreur ?? group?.supervisorName ?? '—';

  /* ── submit: validate then send to API ──────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.title.trim()) { setError('Veuillez saisir l\'objet de la réunion.'); return; }
    if (!formData.date)         { setError('Veuillez choisir une date.'); return; }
    if (!formData.time)         { setError('Veuillez choisir une heure.'); return; }
    if (formData.type === 'Présentielle' && !formData.location.trim()) {
      setError('Veuillez indiquer le lieu pour une réunion présentielle.'); return;
    }

    try {
      await addMeeting({
        title:    formData.title,
        date:     formData.date,
        time:     formData.time,
        location: formData.type === 'Présentielle' ? formData.location : formData.type,
        type:     formData.type,
      });
      // Only close if the API call succeeded
      setModalOpen(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setError('Erreur lors de l\'envoi de la demande. Veuillez réessayer.');
    }
  };

  /* ── split into upcoming vs history ─────────────────────────── */
  const list = Array.isArray(meetings) ? meetings : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upcoming: pending/approved meetings whose date is today or in the future
  const upcoming = list.filter(m => {
    if (m.status === 'rejected' || m.status === 'cancelled') return false;
    if (!m.date) return true;
    return new Date(m.date) >= today;
  });

  // History: past meetings OR rejected/cancelled ones
  const history = list.filter(m => {
    if (m.status === 'rejected' || m.status === 'cancelled') return true;
    if (!m.date) return false;
    return new Date(m.date) < today;
  });

  const hasSupervisor = !!(group?.TID || group?.encadreur || group?.supervisorName);
  const isFormValid = formData.title.trim() && formData.date && formData.time &&
    (formData.type !== 'Présentielle' || formData.location.trim());

  if (!group) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <IoCalendarOutline size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('Meetings')}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '24px' }}>
            Vous devez rejoindre ou créer un groupe avant de pouvoir planifier des réunions.
          </p>
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
        <Button 
          icon={<IoAddOutline size={18} />} 
          onClick={() => setModalOpen(true)}
          disabled={!hasSupervisor}
          style={{ opacity: hasSupervisor ? 1 : 0.6 }}
        >
          {t('NewTask').split(' ')[0]} {t('Meetings').toLowerCase().slice(0, -1)}
        </Button>
      </div>

      {!hasSupervisor && (
        <Card style={{ marginBottom: '24px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <IoAlertCircleOutline size={24} color="#D97706" />
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400E' }}>Action requise : Aucun encadreur assigné</p>
              <p style={{ fontSize: '13px', color: '#B45309' }}>Vous devez d'abord solliciter un encadreur depuis l'onglet "Groupe" avant de pouvoir planifier des réunions.</p>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* ... rest of the file ... */}

        {/* Meetings list */}
        <div>
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Upcoming */}
          <h2 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            À venir
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                Aucune réunion planifiée
              </p>
            ) : upcoming.map((m) => {
              const d = m.date ? new Date(m.date) : null;
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
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{m.title}</h3>
                          {m.createdBy && m.createdBy.startsWith('T') && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: '#EEF2FF', color: 'var(--primary)' }}>
                              👨‍🏫 Planifiée par l'encadreur
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {m.time && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoTimeOutline size={13} /> {m.time}</span>}
                          {!m.time && d && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoTimeOutline size={13} /> {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          {encadreurName !== '—' && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoPersonOutline size={13} /> {encadreurName}</span>}
                          {m.location && !m.location.startsWith('En ligne') && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoLocationOutline size={13} /> {m.location}</span>}
                          {m.location && m.location.startsWith('En ligne') && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoVideocamOutline size={13} /> {m.location}</span>}
                          {!m.location && m.type && <span style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><IoVideocamOutline size={13} /> {m.type}</span>}
                        </div>
                        {m.desc && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>{m.desc}</p>}
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
                Historique
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map((m) => {
                  const d = m.date ? new Date(m.date) : null;
                  return (
                    <Card key={m.id} style={{ padding: '14px 18px', opacity: m.status === 'rejected' ? 0.7 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600 }}>{m.title}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {d ? d.toLocaleDateString() : '—'}{d ? ` · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}{encadreurName !== '—' ? ` · ${encadreurName}` : ''}
                          </p>
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
          <MiniCalendar meetings={meetings} />
          <Card style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Encadreur</h4>
            {group?.encadreur || group?.supervisorName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {encadreurName.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>{encadreurName}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Encadreur</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Aucun encadreur assigné</p>
            )}
          </Card>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setFormData(EMPTY_FORM); setError(''); }} title="Planifier une réunion" size="md">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Validation error banner */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '13px' }}>
              <IoAlertCircleOutline size={16} />
              {error}
            </div>
          )}

          <Input label="Objet de la réunion *" value={formData.title} onChange={e => { setFormData(f => ({ ...f, title: e.target.value })); setError(''); }} placeholder="Ex: Revue d'avancement sprint 3" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Date *" type="date" value={formData.date} onChange={e => { setFormData(f => ({ ...f, date: e.target.value })); setError(''); }} />
            <Input label="Heure *" type="time" value={formData.time} onChange={e => { setFormData(f => ({ ...f, time: e.target.value })); setError(''); }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type</label>
            <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
              <option>Présentielle</option>
              <option>En ligne (Teams)</option>
              <option>En ligne (Zoom)</option>
            </select>
          </div>

          {/* Location field — only for in-person meetings */}
          {formData.type === 'Présentielle' && (
            <Input
              label="Lieu *"
              value={formData.location}
              onChange={e => { setFormData(f => ({ ...f, location: e.target.value })); setError(''); }}
              placeholder="Ex: Salle D12, Bâtiment principal..."
            />
          )}

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description</label>
            <textarea value={formData.desc} onChange={e => setFormData(f => ({ ...f, desc: e.target.value }))} placeholder="Décrivez l'objectif de cette réunion..." rows={3} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => { setModalOpen(false); setFormData(EMPTY_FORM); setError(''); }} type="button">Annuler</Button>
            <Button type="submit">Envoyer la demande</Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
