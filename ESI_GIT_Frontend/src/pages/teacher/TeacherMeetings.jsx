import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { IoCalendarOutline } from 'react-icons/io5';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TeacherMeetings() {
  const { meetings, acceptMeeting, rejectMeeting, cancelMeeting } = useTeacher();
  const { t } = useLanguage();
  const list = meetings || [];

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('Meetings')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('GroupsSupervision')}</p>
      </div>

      {list.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <IoCalendarOutline size={40} style={{ marginBottom: '12px', opacity: 0.3 }}/>
          <p>{t('NoPendingRequests')}</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {list.map(m => (
            <Card key={m.id} hover style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                    <Badge variant="primary">{m.project_name || m.group}</Badge>
                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{m.title}</h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📅 {m.date} à {m.time}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {m.status === 'pending' && (
                    <>
                      <button onClick={() => acceptMeeting(m.id)} style={{ padding: '8px 16px', borderRadius: '10px', background: '#DCFCE7', border: 'none', color: '#16A34A', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>✓ {t('Approve')}</button>
                      <button onClick={() => rejectMeeting(m.id)} style={{ padding: '8px 16px', borderRadius: '10px', background: '#FEE2E2', border: 'none', color: '#DC2626', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>✕ {t('Reject')}</button>
                    </>
                  )}
                  {m.status === 'approved' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Badge variant="success">{t('Approve') || 'Approuvée'}</Badge>
                      <button 
                        onClick={() => {
                          const r = prompt("Motif de l'annulation :");
                          if(r) cancelMeeting(m.id, r);
                        }} 
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'none', border: '1px solid #DC2626', color: '#DC2626', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {m.status === 'rejected' && <Badge variant="danger">{t('Reject') || 'Refusée'}</Badge>}
                  {m.status === 'cancelled' && (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="danger">Annulée</Badge>
                      {m.cancellation_reason && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Motif: {m.cancellation_reason}</p>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
