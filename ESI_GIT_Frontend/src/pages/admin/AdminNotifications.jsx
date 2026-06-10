import { useState, useEffect, useCallback } from 'react';
import {
  IoSendOutline, IoTrashOutline, IoNotificationsOutline,
  IoPeopleOutline, IoPersonOutline, IoSchoolOutline,
  IoRefreshOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useLanguage } from '../../context/LanguageContext';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import toast from 'react-hot-toast';


const LEVEL_LABELS = { 2: '2CPI', 3: '1CS', 4: '2CS', 5: '3CS' };
// Only 2CS (4) and 3CS (5) have specialties
const LEVELS_WITH_SPECIALTY = new Set([4, 5]);

export default function AdminNotifications() {
  const { t } = useLanguage();

  const AUDIENCE_OPTIONS = [
    { value: 'all',      label: t('NotifAudience_all'),      icon: <IoPeopleOutline size={16} /> },
    { value: 'students', label: t('NotifAudience_students'), icon: <IoSchoolOutline size={16} /> },
    { value: 'staff',    label: t('NotifAudience_staff'),    icon: <IoPersonOutline size={16} /> },
  ];

  // compose form
  const [form, setForm]       = useState({ title: '', message: '', audience: 'all', level: '', specialty: '' });
  const [sending, setSending] = useState(false);

  // specialties list from backend
  const [specialties, setSpecialties] = useState([]);

  // history
  const [history, setHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(() => {
    setLoadingHistory(true);
    client.get(ENDPOINTS.notifications.adminList)
      .then(res => setHistory(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Fetch specialties once
  useEffect(() => {
    client.get(ENDPOINTS.admin.specialties)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setSpecialties(list.map(s => (typeof s === 'string' ? s : s.name)).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  // Whether the currently selected level has specialties
  const levelHasSpecialty = form.audience === 'students' && form.level !== '' && LEVELS_WITH_SPECIALTY.has(parseInt(form.level));

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error(t('NotifTitleRequired'));
      return;
    }
    setSending(true);
    try {
      const payload = { title: form.title, message: form.message, audience: form.audience };
      if (form.audience === 'students' && form.level) payload.level = parseInt(form.level);
      if (form.audience === 'students' && form.specialty.trim()) payload.specialty = form.specialty.trim();
      await client.post(ENDPOINTS.notifications.adminSend, payload);
      toast.success(t('NotifSentSuccess'));
      setForm({ title: '', message: '', audience: 'all', level: '', specialty: '' });
      fetchHistory();
    } catch {
      toast.error(t('NotifSendFail'));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(ENDPOINTS.notifications.adminDelete(id));
      setHistory(prev => prev.filter(n => n.id !== id));
      toast.success(t('NotifDeleted'));
    } catch {
      toast.error(t('NotifDeleteFail'));
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <IoNotificationsOutline size={28} color="var(--primary)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Notifications
          </h1>
        </div>

        {/* Compose card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
            {t('NotifSendLabel')}
          </h2>

          {/* Audience selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {AUDIENCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm(f => ({ ...f, audience: opt.value, level: '', specialty: '' }))}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)',
                  background: form.audience === opt.value ? 'var(--primary)' : 'transparent',
                  color: form.audience === opt.value ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          {/* Student filters */}
          {form.audience === 'students' && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  {t('NotifLevelOptional')}
                </label>
                <select
                  value={form.level}
                  onChange={e => setForm(f => ({ ...f, level: e.target.value, specialty: '' }))}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text-primary)', fontSize: 13,
                  }}
                >
                  <option value="">{t('AllLevels')}</option>
                  {Object.entries(LEVEL_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>

              {/* Specialty dropdown — only for 2CS (4) and 3CS (5) */}
              {levelHasSpecialty && (
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    {t('NotifSpecialtyOptional')}
                  </label>
                  <select
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text-primary)', fontSize: 13,
                    }}
                  >
                    <option value="">{t('AllSpecialties')}</option>
                    {specialties.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('NotifTitle')}</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t('NotifTitle')}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{t('NotifMessage')}</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={t('NotifMessage')}
              rows={3}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg)',
                color: 'var(--text-primary)', fontSize: 14, resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '10px 20px', borderRadius: 10, background: 'var(--primary)',
              color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600,
              opacity: sending ? 0.7 : 1,
            }}
          >
            <IoSendOutline size={16} />
            {sending ? t('Sending') : t('SendNotification')}
          </button>
        </div>

        {/* History card */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {t('NotifHistory')}
            </h2>
            <button
              onClick={fetchHistory}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13,
              }}
            >
              <IoRefreshOutline size={14} /> {t('Refresh')}
            </button>
          </div>

          {loadingHistory ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t('Loading')}…</p>
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
              {t('NotifNoHistory')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {n.recipient_type === 'all' ? 'Everyone'
                        : n.recipient_type === 'student' ? (n.recipient_id ? `Student #${n.recipient_id}` : 'All students')
                        : n.recipient_type === 'staff'   ? (n.recipient_id ? `Staff #${n.recipient_id}` : 'All staff')
                        : n.recipient_type}
                      {' · '}
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(n.id)}
                    style={{
                      padding: 6, borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--danger)', cursor: 'pointer', flexShrink: 0,
                    }}
                    title="Delete"
                  >
                    <IoTrashOutline size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
