import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoNotificationsOutline, IoDocumentTextOutline,
  IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoChevronForwardOutline, IoShieldCheckmarkOutline,
  IoDownloadOutline, IoEyeOutline, IoFolderOpenOutline,
  IoAlertCircleOutline
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'react-hot-toast';

export default function TeacherRequests() {
  const { 
    supervisorRequests, 
    respondToSupervisorRequest, 
    groups, 
    updateGroup,
    groupsLoading 
  } = useTeacher();
  const { t } = useLanguage();

  const safeRequests = supervisorRequests || [];
  const safeGroups = groups || [];
  const [confirmReq, setConfirmReq] = useState(null);
  const [confirmFinal, setConfirmFinal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { groupId }
  const [rejectReason, setRejectReason] = useState('');

  const LEVEL_LABELS = { 2: '2CPI', 3: '1CS', 4: '2CS', 5: '3CS' };

  // Groups that have submitted for final validation
  const finalSubmissions = safeGroups.filter(g => g.submitted_to_supervisor && !g.final_submission_approved);

  const handleValidation = async (groupId, approved, feedback = "") => {
    try {
      await updateGroup(groupId, { 
        final_submission_approved: approved,
        submitted_to_supervisor: approved, // If approved, keep it submitted. If rejected, reset it.
        supervisor_feedback: feedback 
      });
      // Logic for rejection: if rejected, reset submitted_to_supervisor to false
      if (!approved) {
        await updateGroup(groupId, { 
            submitted_to_supervisor: false,
            supervisor_feedback: feedback || t('SupervFeedbackDefault')
        });
      }
      toast.success(approved ? "Projet approuvé !" : "Projet renvoyé pour corrections.");
    } catch (err) {
      toast.error("Une erreur est survenue.");
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
          {t('Requests')}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t('TeacherReqSubtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* 1. Supervision Requests */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IoNotificationsOutline size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{t('SupervisionRequests')}</h2>
            <Badge variant="primary">{safeRequests.length}</Badge>
          </div>

          {safeRequests.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>{t('NoPendingRequests')}</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {safeRequests.map(req => (
                <Card key={req.id} style={{ border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{req.projectTitle || req.project_name}</h4>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {req.academic_level && (
                          <Badge variant="primary" style={{ fontSize: '10px', padding: '2px 7px' }}>
                            {LEVEL_LABELS[req.academic_level] || `Niv.${req.academic_level}`}
                          </Badge>
                        )}
                        {req.specialty && (
                          <Badge style={{ fontSize: '10px', padding: '2px 7px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                            {req.specialty}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="warning">{t('InProgress')}</Badge>
                  </div>
                  
                  <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>{t('Members_label')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(req.members || []).map((m, i) => (
                        <span key={i} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontWeight: 600 }}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {req.Message && (
                    <div style={{ marginBottom: '16px', paddingLeft: '10px', borderLeft: '3px solid var(--primary)' }}>
                      <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{req.Message}"</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => setConfirmReq({ id: req.id })}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <IoCheckmarkCircleOutline size={16} /> {t('Approve')}
                    </button>
                    <button 
                      onClick={() => respondToSupervisorRequest(req.id, 'rejected')}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--danger)', border: '1px solid var(--danger)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <IoCloseCircleOutline size={16} /> {t('Reject')}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 2. Final Validation Requests */}
        <section>
          <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: finalSubmissions.length > 0 ? '10px' : '0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IoShieldCheckmarkOutline size={18} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{t('FinalValidationRequests')}</h2>
                <Badge variant="success">{finalSubmissions.length}</Badge>
              </div>
              {finalSubmissions.length > 0 && (
                <div style={{ padding: '10px 16px', borderRadius: '10px', background: '#FEF9C3', border: '1px solid #FDE047', fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>
                  {t('FinalApproveWarningInfo')}
                </div>
              )}
            </div>

          {finalSubmissions.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>{t('NoPendingRequests')}</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {finalSubmissions.map(g => (
                <Card key={g._id || g.PID} style={{ border: '2px solid var(--primary-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{g.title || g.name}</h4>
                        <Badge variant="info">{g.groupCode}</Badge>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {t('SubmittedOn')} {g.final_submission_date ? new Date(g.final_submission_date).toLocaleDateString() : '...'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      {/* View Report Button */}
                      {g.final_report_url ? (
                        <a
                          href={g.final_report_url.startsWith('http') ? g.final_report_url : `http://localhost:8000${g.final_report_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--accent-subtle)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--accent)' }}
                        >
                          <IoDocumentTextOutline size={18} /> Voir le Rapport
                        </a>
                      ) : (
                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px' }}
                          title="Les livrables se trouvent directement dans la page du groupe">
                          <IoFolderOpenOutline size={16} />
                          <span>Livrables dans le groupe</span>
                        </div>
                      )}

                      <button 
                        onClick={() => setConfirmFinal({ groupId: g._id || g.PID })}
                        style={{ padding: '10px 20px', borderRadius: '10px', background: '#10B981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <IoCheckmarkCircleOutline size={18} /> {t('Approve')}
                      </button>
                      
                      <button
                        onClick={() => { setRejectModal({ groupId: g._id || g.PID }); setRejectReason(''); }}
                        style={{ padding: '10px 20px', borderRadius: '10px', background: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <IoCloseCircleOutline size={18} /> {t('Reject')}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('GitHubRepo_label')}</span>
                      {g.github_url ? (
                        <a href={g.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{g.github_url}</a>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('NotProvided')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>
                      Avancement: <span style={{ color: 'var(--primary)' }}>{g.progress || 0}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Confirmation modal for supervisor request approval */}
        {confirmReq && createPortal(
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>{t('IrreversibleAction')}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                {t('AcceptSupervBody')}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmReq(null)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  {t('Cancel')}
                </button>
                <button onClick={() => { respondToSupervisorRequest(confirmReq.id, 'approved'); setConfirmReq(null); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Rejection reason modal */}
        {rejectModal && createPortal(
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>❌</div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>{t('Reject')}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                {t('RejectFeedbackNote')}
              </p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder={t('FeedbackPlaceholder2')}
                rows={4}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: `1.5px solid ${rejectReason.trim() ? 'var(--border)' : '#EF4444'}`, background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {!rejectReason.trim() && (
                <p style={{ fontSize: '11px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                  <IoAlertCircleOutline size={13} /> La raison est obligatoire.
                </p>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => { setRejectModal(null); setRejectReason(''); }} style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  {t('Cancel')}
                </button>
                <button
                  disabled={!rejectReason.trim()}
                  onClick={() => { handleValidation(rejectModal.groupId, false, rejectReason.trim()); setRejectModal(null); setRejectReason(''); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', background: rejectReason.trim() ? '#EF4444' : '#94A3B8', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}
                >
                  {t('Confirm')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Confirmation modal for final validation approval */}
        {confirmFinal && createPortal(
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>{t('IrreversibleAction')}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                {t('FinalApproveBody')}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmFinal(null)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  {t('Cancel')}
                </button>
                <button onClick={() => { handleValidation(confirmFinal.groupId, true); setConfirmFinal(null); }}
                  style={{ padding: '10px 20px', borderRadius: '10px', background: '#10B981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {t('Approve')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </DashboardLayout>
  );
}
