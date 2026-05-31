import { useState, useEffect } from 'react';
import { 
  IoPersonAddOutline, IoCheckmarkCircleOutline, 
  IoTimeOutline, IoPersonOutline, IoSearchOutline,
  IoAlertCircleOutline, IoSendOutline, IoWarningOutline,
  IoArrowForwardOutline, IoArrowBackOutline, IoPeopleOutline
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useStudent } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';
import { useApi } from '../../hooks/useApi';
import { usersApi } from '../../api/users';
import { groupApi } from '../../api/groups';
import { toast } from 'react-hot-toast';

export default function Supervisor() {
  const { t } = useLanguage();
  const { group: team, updateGroup } = useStudent();
  const { data: teachersList, request: loadTeachers } = useApi(usersApi.getTeachers);
  
  const [supervisorRequests, setSupervisorRequests] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherPage, setTeacherPage] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const teachersPerPage = 10;

  useEffect(() => {
    loadTeachers(true);
    fetchRequests();
  }, [loadTeachers]);

  const fetchRequests = async () => {
    try {
      const res = await groupApi.getSupervisorRequests();
      setSupervisorRequests(res);
    } catch (e) {
      console.error("Error fetching requests:", e);
    }
  };

  const teachers = teachersList || [];
  const findTeacher = (id) => teachers.find(tVal => (tVal._id === id || tVal.TID === id || tVal.id === id));
  
  const handleSendRequest = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      await groupApi.sendSupervisorRequest(selectedTeacher, requestMessage);
      toast.success(t('RequestSent'));
      setShowConfirmModal(false);
      setSelectedTeacher(null);
      setRequestMessage('');
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.error || t('Error');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasApproved = (supervisorRequests || []).some(r => r.status === 'accepted' || r.status === 'approved');
  const hasPending = (supervisorRequests || []).some(r => r.status === 'pending');

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('JuryRoles.supervisor')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ManageSupervision')}</p>
      </div>

      {!team ? (
        <Card style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IoPeopleOutline size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '10px' }}>{t('NoGroupYet')}</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px' }}>
            {t('JoinGroupToContinue')}
          </p>
          <Button onClick={() => window.location.href = '/student/groupe/'}>{t('GoToGroup')}</Button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Current Supervisor Card */}
            <Card>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoCheckmarkCircleOutline size={20} style={{ color: 'var(--primary)' }} />
                {t('CurrentSupervisor')}
              </h3>
              {team.TID ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'var(--primary-subtle)', border: '1px solid rgba(79,70,229,0.2)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700 }}>
                    {team.teacher_name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>{team.teacher_name}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('OfficialSupervisor')}</p>
                  </div>
                  <Badge variant="success" style={{ marginLeft: 'auto' }}>{t('Accepted')}</Badge>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('NoSupervisorAssigned')}</p>
                </div>
              )}
            </Card>

            {/* Selection UI if no supervisor and no approved request */}
            {!team.TID && !hasApproved && (
              <Card>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>{t('RequestNewSupervisor')}</h3>
                
                {hasPending ? (
                  <div style={{ padding: '16px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #F59E0B', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <IoTimeOutline size={20} style={{ color: '#F59E0B', marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400E' }}>{t('PendingRequest')}</p>
                      <p style={{ fontSize: '13px', color: '#B45309', marginTop: '4px' }}>
                        {t('PendingRequestMsg')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <IoSearchOutline size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="text"
                          placeholder={t('SearchByTeacherName')}
                          value={teacherSearch}
                          onChange={(e) => { setTeacherSearch(e.target.value); setTeacherPage(1); }}
                          style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '14px', outline: 'none' }}
                        />
                      </div>
                      <Button variant="outline" style={{ borderRadius: '10px' }} onClick={() => setTeacherPage(1)}>{t('Search')}</Button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                      {(() => {
                        const filtered = teachers.filter(tVal => 
                          tVal.full_name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                          tVal.specialty?.toLowerCase().includes(teacherSearch.toLowerCase())
                        );
                        const start = (teacherPage - 1) * teachersPerPage;
                        const paginated = filtered.slice(start, start + teachersPerPage);
                        const totalPages = Math.ceil(filtered.length / teachersPerPage);

                        if (filtered.length === 0) return <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{t('NoTeachersFound')}</p>;

                        return (
                          <>
                            {paginated.map(tVal => (
                              <label key={tVal.TID || tVal.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '12px', border: selectedTeacher === (tVal.TID || tVal.id) ? '2px solid var(--primary)' : '1px solid var(--border)', background: selectedTeacher === (tVal.TID || tVal.id) ? 'var(--primary-subtle)' : 'var(--bg)', cursor: tVal.available !== false ? 'pointer' : 'not-allowed', opacity: tVal.available !== false ? 1 : 0.6, transition: 'all 0.15s' }}>
                                <input type="radio" name="teacher" checked={selectedTeacher === (tVal.TID || tVal.id)} onChange={() => tVal.available !== false && setSelectedTeacher(tVal.TID || tVal.id)} disabled={tVal.available === false} style={{ accentColor: 'var(--primary)' }} />
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: '14px', fontWeight: 700 }}>{tVal.full_name}</p>
                                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tVal.specialty || tVal.department || 'ESI Teacher'}</p>
                                </div>
                                <Badge variant={tVal.available !== false ? 'success' : 'danger'}>{tVal.available !== false ? t('Available') : t('Unavailable')}</Badge>
                              </label>
                            ))}
                            {totalPages > 1 && (
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                                <Button size="sm" variant="ghost" onClick={() => setTeacherPage(p => p - 1)} disabled={teacherPage === 1}>{t('Previous')}</Button>
                                <span style={{ alignSelf: 'center', fontSize: '13px' }}>{teacherPage} / {totalPages}</span>
                                <Button size="sm" variant="ghost" onClick={() => setTeacherPage(p => p + 1)} disabled={teacherPage === totalPages}>{t('Next')}</Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('AccompanyingMessage')}</label>
                      <textarea
                        value={requestMessage}
                        onChange={e => setRequestMessage(e.target.value)}
                        placeholder={t('ExplainSubject')}
                        rows={4}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    <Button 
                      style={{ width: '100%' }} 
                      disabled={!selectedTeacher} 
                      onClick={() => setShowConfirmModal(true)}
                    >
                      {t('SendRequest')}
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* History Sidebar */}
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('RequestHistory')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(supervisorRequests || []).length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>{t('NoRequestsSent')}</p>
                ) : (
                  (supervisorRequests || []).map((req, i) => (
                    <div key={i} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700 }}>{req.teacher_name}</p>
                        <Badge variant={req.status === 'accepted' || req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                          {req.status === 'pending' ? t('Wait') : req.status === 'rejected' ? t('Rejected') : t('Accepted')}
                        </Badge>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('Sent')} {new Date(req.created_at).toLocaleDateString()}</p>
                      {req.status === 'rejected' && (
                        <div style={{ marginTop: '8px', padding: '8px', background: '#FEF2F2', borderRadius: '6px', fontSize: '11px', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
                          <IoAlertCircleOutline size={12} style={{ marginRight: '4px' }} />
                          {t('RequestRejected')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={t('ConfirmSend')}>
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FFFBEB', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IoWarningOutline size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>{t('SendRequest')} ?</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            {t('YouAreRequesting')} <strong>{findTeacher(selectedTeacher)?.full_name}</strong>. 
            {t('CannotSendMore')}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowConfirmModal(false)}>{t('Cancel')}</Button>
            <Button style={{ flex: 1 }} onClick={handleSendRequest} disabled={isSubmitting}>
              {isSubmitting ? t('Wait') + '...' : t('Confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
