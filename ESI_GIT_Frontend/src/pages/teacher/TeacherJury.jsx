import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { IoRibbonOutline } from 'react-icons/io5';
import { useLanguage } from '../../context/LanguageContext';
import { useTeacher } from '../../context/TeacherContext';

export default function TeacherJury() {
  const { t } = useLanguage();
  const { evaluations, evaluationsLoading, gradeEvaluation } = useTeacher();
  
  const stats = evaluations || { assignees: 0, a_evaluer: 0, evaluees: 0 };
  const defenses = evaluations?.defenses || [];

  const [gradeModal, setGradeModal] = useState(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Structured evaluation specific state
  const [evalMarks, setEvalMarks] = useState({
    presentation: '',
    document: '',
    demo: ''
  });
  const [is2CpiProject, setIs2CpiProject] = useState(false);

  const calculateFinalGrade = () => {
    const formulaConfig = { presentationWeight: 0.2, documentWeight: 0.3, demoWeight: 0.5 };
    const p = parseFloat(evalMarks.presentation) || 0;
    const doc = parseFloat(evalMarks.document) || 0;
    const d = parseFloat(evalMarks.demo) || 0;

    let final = (p * formulaConfig.presentationWeight) + (doc * formulaConfig.documentWeight) + (d * formulaConfig.demoWeight);
    return final.toFixed(2);
  };

  const submitJuryGrade = async (pid) => {
    if (!evalMarks.presentation || !evalMarks.document || !evalMarks.demo) return;
    
    setSubmitting(true);
    try {
      await gradeEvaluation(pid, {
        presentation: parseFloat(evalMarks.presentation),
        document: parseFloat(evalMarks.document),
        demo: parseFloat(evalMarks.demo),
        validate_cpi: is2CpiProject,
        comments: feedbackInput
      });
      setGradeModal(null);
      setEvalMarks({ presentation: '', document: '', demo: '' });
      setFeedbackInput('');
      setIs2CpiProject(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IoRibbonOutline size={26}/> {t('DefenseJury')}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('JuryParticipation')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: t('Assigned'),   value: stats.assignees, color: 'var(--primary)', icon: '🎓' },
          { label: t('ToEvaluate'), value: stats.a_evaluer, color: '#F59E0B', icon: '⏳' },
          { label: t('Evaluated'),  value: stats.evaluees,  color: '#10B981', icon: '✅' },
        ].map((s, i) => (
          <Card key={i} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>{s.icon}</div>
            <div>
              <p style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {evaluationsLoading ? (
          <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('Loading')}</p>
        ) : defenses.length === 0 ? (
          <Card style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
             <p>{t('NoGroups')}</p>
          </Card>
        ) : defenses.map(j => {
          const graded = j.is_evaluated;
          return (
            <Card key={j.PID_id} hover style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <Badge variant="primary">{j.group_code}</Badge>
                    <Badge variant="gray">{j.specialty}</Badge>
                    <Badge variant={j.schedule ? 'success' : 'warning'}>{j.schedule ? t('Scheduled') : t('InProgress')}</Badge>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{j.project_name}</h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {j.schedule ? (
                      <><span>📅 {j.schedule.date}</span><span>🕐 {j.schedule.time}</span><span>📍 {j.schedule.room}</span></>
                    ) : (
                      <span>Date non planifiée</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                    {(j.members || []).map((m, i) => <span key={i} style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)' }}>{m.name}</span>)}
                  </div>
                  
                  {(j.attachments || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {j.attachments.map(att => (
                        <a key={att.id} href={att.url} target="_blank" rel="noreferrer" 
                           style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>
                          📎 {att.filename} {att.is_final ? '(Final)' : ''}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {graded ? (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="success">{t('Evaluated')} ✓</Badge>
                    </div>
                  ) : (
                    <button onClick={() => { setGradeModal(j); setEvalMarks({ presentation:'', document:'', demo:'' }); setFeedbackInput(''); setIs2CpiProject(false); }}
                      style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      🎓 {t('Evaluate')}
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={!!gradeModal} onClose={() => setGradeModal(null)} title={`${t('DefenseEvaluation')} — ${gradeModal?.group_code}`} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>{gradeModal?.project_name}</p>
            {gradeModal?.schedule && (
               <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{gradeModal.schedule.date} à {gradeModal.schedule.time} — {gradeModal.schedule.room}</p>
            )}
            
            {(gradeModal?.attachments || []).length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Documents :</p>
                {gradeModal.attachments.map(att => (
                  <a key={att.id} href={att.url} target="_blank" rel="noreferrer" 
                     style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>
                    📎 {att.filename} {att.is_final ? '(Final)' : ''}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '10px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79,70,229,0.2)' }}>
              <input type="checkbox" checked={is2CpiProject} onChange={e => setIs2CpiProject(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
              Valider le projet pour le "Cycle Préparatoire Intégré" (2 CPI)
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Présentation (20%)</label>
              <input type="number" min="0" max="20" step="0.5" value={evalMarks.presentation} onChange={e => setEvalMarks({...evalMarks, presentation: e.target.value})} placeholder="/20"
                style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none' }}/>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Document (30%)</label>
              <input type="number" min="0" max="20" step="0.5" value={evalMarks.document} onChange={e => setEvalMarks({...evalMarks, document: e.target.value})} placeholder="/20"
                style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none' }}/>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Démo (50%)</label>
              <input type="number" min="0" max="20" step="0.5" value={evalMarks.demo} onChange={e => setEvalMarks({...evalMarks, demo: e.target.value})} placeholder="/20"
                style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none' }}/>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('FinalGradeCalculated')} : </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{calculateFinalGrade()}/20</span>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('EvaluationComments')}</label>
            <textarea value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} rows={3} placeholder="..."
              style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', resize: 'vertical' }}/>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setGradeModal(null)} style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>{t('Cancel')}</button>
            <button onClick={() => submitJuryGrade(gradeModal.PID_id)} disabled={!evalMarks.presentation || !evalMarks.document || !evalMarks.demo || submitting} style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: (submitting || !evalMarks.presentation || !evalMarks.document || !evalMarks.demo) ? 'not-allowed' : 'pointer', opacity: (submitting || !evalMarks.presentation || !evalMarks.document || !evalMarks.demo) ? 0.5 : 1 }}>
              {submitting ? '...' : `✓ ${t('Confirm')}`}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
