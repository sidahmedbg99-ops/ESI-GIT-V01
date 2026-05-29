import { useState } from 'react';
import { 
  IoNotificationsOutline, IoDocumentTextOutline, 
  IoCheckmarkCircleOutline, IoCloseCircleOutline,
  IoChevronForwardOutline, IoShieldCheckmarkOutline,
  IoDownloadOutline, IoEyeOutline
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
            supervisor_feedback: feedback || "Projet refusé. Veuillez consulter l'encadreur."
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
          Gérez vos demandes d'encadrement et validations de projets.
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
                      <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{req.projectTitle}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Code: {req.groupCode}</p>
                    </div>
                    <Badge variant="warning">{t('InProgress')}</Badge>
                  </div>
                  
                  <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: '8px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Membres</p>
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
                      onClick={() => respondToSupervisorRequest(req.id, 'approved')}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IoShieldCheckmarkOutline size={18} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>{t('FinalValidationRequests')}</h2>
            <Badge variant="success">{finalSubmissions.length}</Badge>
          </div>

          {finalSubmissions.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>Aucun projet en attente de validation finale.</p>
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
                        Soumis le {g.final_submission_date ? new Date(g.final_submission_date).toLocaleDateString() : 'récemment'}
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
                        <div style={{ padding: '10px 16px', borderRadius: '10px', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', border: '1px solid var(--border)' }}>
                          Aucun rapport joint
                        </div>
                      )}

                      <button 
                        onClick={() => handleValidation(g._id || g.PID, true)}
                        style={{ padding: '10px 20px', borderRadius: '10px', background: '#10B981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <IoCheckmarkCircleOutline size={18} /> {t('Approve')}
                      </button>
                      
                      <button 
                        onClick={() => {
                          const reason = prompt("Raison du refus (obligatoire) :");
                          if (reason) handleValidation(g._id || g.PID, false, reason);
                        }}
                        style={{ padding: '10px 20px', borderRadius: '10px', background: '#EF4444', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <IoCloseCircleOutline size={18} /> {t('Reject')}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Dépôt GitHub :</span>
                      {g.github_url ? (
                        <a href={g.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{g.github_url}</a>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Non renseigné</span>
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

      </div>
    </DashboardLayout>
  );
}
