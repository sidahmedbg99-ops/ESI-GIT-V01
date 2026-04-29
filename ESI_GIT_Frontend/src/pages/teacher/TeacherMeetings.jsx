import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { IoCalendarOutline } from 'react-icons/io5';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TeacherMeetings() {
  const { meetings, acceptMeeting, rejectMeeting } = useTeacher();
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
                    <Badge variant="primary">{m.group}</Badge>
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
                  {m.status === 'approved' && <Badge variant="success">{t('Done')}</Badge>}
                  {m.status === 'rejected' && <Badge variant="danger">{t('Reject')}</Badge>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
