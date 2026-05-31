import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { IoRibbonOutline } from 'react-icons/io5';
import { useLanguage } from '../../context/LanguageContext';
import { useTeacher } from '../../context/TeacherContext';
import { getFileUrl } from '../../api/config';

const ROLE_LABELS = {
  president: 'Président du jury',
  supervisor: 'Encadreur',
  examiner: 'Examinateur',
};

const ROLE_COLORS = {
  president: '#6366F1',
  supervisor: '#2EC4B6',
  examiner: '#F59E0B',
};

export default function TeacherJury() {
  const { t } = useLanguage();
  const { evaluations, evaluationsLoading, gradeEvaluation, platformSettings } = useTeacher();
  
  const stats = evaluations || { assignees: 0, a_evaluer: 0, evaluees: 0 };
  const defenses = evaluations?.defenses || [];

  const [gradeModal, setGradeModal] = useState(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [is2CpiProject, setIs2CpiProject] = useState(false);

  // Dynamic marks state based on role
  const [evalMarks, setEvalMarks] = useState({});

  const getCriteriaForRole = (role) => {
    try {
      const all = typeof platformSettings?.evaluation_criteria === 'string'
        ? JSON.parse(platformSettings.evaluation_criteria)
        : platformSettings?.evaluation_criteria;
      return all?.[role] || [];
    } catch(e) { return []; }
  };

  const calculateFinalGrade = () => {
    const criteria = getCriteriaForRole(gradeModal?.jury_role);
    if (criteria.length === 0) {
      // fallback to average if no criteria
      const vals = Object.values(evalMarks).map(v => parseFloat(v) || 0);
      if (vals.length === 0) return '0.00';
      return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    }
    
    let weightedSum = 0;
    let totalWeight = 0;
    criteria.forEach(c => {
      const val = parseFloat(evalMarks[c.name]) || 0;
      weightedSum += val * (c.weight / 100);
      totalWeight += c.weight;
    });
    
    if (totalWeight === 0) return '0.00';
    return (weightedSum * (100 / totalWeight)).toFixed(2);
  };

  const allFieldsFilled = () => {
    if (!gradeModal) return false;
    const criteria = getCriteriaForRole(gradeModal.jury_role);
    if (criteria.length === 0) return true;
    return criteria.every(c => evalMarks[c.name] !== undefined && evalMarks[c.name] !== '');
  };

  const openGradeModal = (defense) => {
    setGradeModal(defense);
    const criteria = getCriteriaForRole(defense.jury_role);
    const initial = {};
    criteria.forEach(c => { initial[c.name] = ''; });
    setEvalMarks(initial);
    setFeedbackInput('');
    setIs2CpiProject(false);
  };

  const submitJuryGrade = async (pid) => {
    if (!allFieldsFilled()) return;
    
    setSubmitting(true);
    try {
      const payload = {
        ...evalMarks,
        validate_cpi: is2CpiProject,
        comments: feedbackInput,
      };
      await gradeEvaluation(pid, payload);
      setGradeModal(null);
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
          const roleLabel = ROLE_LABELS[j.jury_role] || 'Membre du jury';
          const roleColor = ROLE_COLORS[j.jury_role] || 'var(--text-muted)';
          return (
            <Card key={j.PID_id} hover style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <Badge variant="primary">{j.group_code}</Badge>
                    <Badge variant="gray">{j.specialty}</Badge>
                    <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                      {roleLabel}
                    </span>
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
                        <a key={att.id} href={getFileUrl(att.url)} target="_blank" rel="noreferrer" 
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
                    <button onClick={() => openGradeModal(j)}
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

      <Modal isOpen={!!gradeModal} onClose={() => setGradeModal(null)} title={`${t('DefenseEvaluation')} — ${gradeModal?.group_code}`} size="md"
        description={`Vous évaluez en tant que ${ROLE_LABELS[gradeModal?.jury_role] || 'membre du jury'}. Remplissez les notes ci-dessous.`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
            <p style={{ fontSize: '14px', fontWeight: 600 }}>{gradeModal?.project_name}</p>
            {gradeModal?.schedule && (
               <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{gradeModal.schedule.date} à {gradeModal.schedule.time} — {gradeModal.schedule.room}</p>
            )}
            
            {/* Role badge */}
            <div style={{ marginTop: '10px' }}>
              <span style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 700,
                background: `${ROLE_COLORS[gradeModal?.jury_role] || '#6B7280'}15`,
                color: ROLE_COLORS[gradeModal?.jury_role] || '#6B7280',
                border: `1px solid ${ROLE_COLORS[gradeModal?.jury_role] || '#6B7280'}30`,
              }}>
                {ROLE_LABELS[gradeModal?.jury_role] || 'Membre du jury'}
              </span>
            </div>

            {(gradeModal?.attachments || []).length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Documents :</p>
                {gradeModal.attachments.map(att => (
                  <a key={att.id} href={getFileUrl(att.url)} target="_blank" rel="noreferrer" 
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

          {/* Dynamic grade fields based on role */}
          <div style={{ display: 'grid', gridTemplateColumns: getCriteriaForRole(gradeModal?.jury_role).length === 1 ? '1fr' : '1fr 1fr', gap: '10px' }}>
            {getCriteriaForRole(gradeModal?.jury_role).map((c, i) => (
              <div key={i}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {c.name} <span style={{ color: 'var(--primary)', fontSize: '10px' }}>({c.weight}%)</span>
                </label>
                <input type="number" min="0" max="20" step="0.5" value={evalMarks[c.name] || ''} onChange={e => setEvalMarks({...evalMarks, [c.name]: e.target.value})} placeholder="/20"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none' }}/>
              </div>
            ))}
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
            <button onClick={() => submitJuryGrade(gradeModal.PID_id)} disabled={!allFieldsFilled() || submitting} style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: (!allFieldsFilled() || submitting) ? 'not-allowed' : 'pointer', opacity: (!allFieldsFilled() || submitting) ? 0.5 : 1 }}>
              {submitting ? '...' : `✓ ${t('Confirm')}`}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
