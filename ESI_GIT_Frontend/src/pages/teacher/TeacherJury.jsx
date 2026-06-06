import { useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { IoRibbonOutline } from 'react-icons/io5';
import { useLanguage } from '../../context/LanguageContext';
import { useTeacher } from '../../context/TeacherContext';
import { useAuth } from '../../context/AuthContext';
import { getFileUrl } from '../../api/config';
import AttachmentsPopover from '../../components/ui/AttachmentsPopover';


export default function TeacherJury() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { evaluations, evaluationsLoading, gradeEvaluation } = useTeacher();
  
  if (evaluations?.disabled) return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
        <IoRibbonOutline size={48} style={{ color: 'var(--text-muted)' }} />
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('JuryPageDisabled') || 'Jury access is currently disabled by the admin'}</p>
      </div>
    </DashboardLayout>
  );

  const stats = evaluations || { assignees: 0, a_evaluer: 0, evaluees: 0 };
  const defenses = evaluations?.defenses || [];
  const activeFormula = evaluations?.active_formula; // { id, name, expression, labels: {"g1": "Continuous...", "g2": "..."} }

  const [gradeModal, setGradeModal] = useState(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dynamic evaluation state: map variables (g1, g2, etc.) to values
  const [evalMarks, setEvalMarks] = useState({});
  const [is2CpiProject, setIs2CpiProject] = useState(false);

  // Helper to get active teacher's role badges for a given jury card
  const getTeacherRoles = (j) => {
    const roles = [];
    const teacherId = user?.TID || user?._id || user?.id;
    if (j.teacher1_id === teacherId) roles.push({ name: 'Président', color: 'var(--primary)', bg: 'var(--primary-subtle)' });
    if (j.teacher2_id === teacherId || j.teacher3_id === teacherId) roles.push({ name: 'Examinateur', color: '#4B5563', bg: '#F3F4F6' });
    if (j.supervisor_id === teacherId) roles.push({ name: 'Encadrant', color: '#059669', bg: '#D1FAE5' });
    return roles;
  };

  const calculateFinalGrade = () => {
    if (!activeFormula || !activeFormula.expression) return '0.00';
    
    // Evaluate the expression using the dynamic values inputted
    try {
      const sandbox = {};
      
      // Setup helper mathematical/custom functions allowed in grading engine
      const ALLOWED_FUNCTIONS = {
        min: Math.min,
        max: Math.max,
        round: (val, dec = 0) => {
          const mult = Math.pow(10, dec);
          return Math.round(val * mult) / mult;
        },
        abs: Math.abs,
        sqrt: Math.sqrt
      };

      Object.assign(sandbox, ALLOWED_FUNCTIONS);

      // Setup dynamic variable values (fallback to 0)
      if (activeFormula.labels) {
        Object.keys(activeFormula.labels).forEach(variable => {
          sandbox[variable] = parseFloat(evalMarks[variable]) || 0;
        });
      }

      // Safe evaluation of simple math expression via Function constructor in isolated scope
      const keys = Object.keys(sandbox);
      const vals = Object.values(sandbox);
      const fn = new Function(...keys, `return ${activeFormula.expression};`);
      const final = fn(...vals);
      
      const result = parseFloat(final);
      if (isNaN(result)) return '0.00';
      return Math.max(0, Math.min(20, result)).toFixed(2);
    } catch (e) {
      return '0.00';
    }
  };

  const submitJuryGrade = async (pid) => {
    if (!activeFormula || !activeFormula.labels) return;

    // Verify all keys are filled
    const keys = Object.keys(activeFormula.labels);
    const incomplete = keys.some(k => !evalMarks[k] || isNaN(parseFloat(evalMarks[k])));
    if (incomplete) return;

    setSubmitting(true);
    try {
      // Build dynamic double/float dictionary
      const valuesPayload = {};
      keys.forEach(k => {
        valuesPayload[k] = parseFloat(evalMarks[k]);
      });

      await gradeEvaluation(pid, {
        values: valuesPayload,
        validate_cpi: is2CpiProject,
        comments: feedbackInput
      });
      setGradeModal(null);
      setEvalMarks({});
      setFeedbackInput('');
      setIs2CpiProject(false);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    if (!activeFormula || !activeFormula.labels) return false;
    const keys = Object.keys(activeFormula.labels);
    return keys.length > 0 && keys.every(k => evalMarks[k] !== undefined && evalMarks[k] !== '' && !isNaN(parseFloat(evalMarks[k])));
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
          const userRoles = getTeacherRoles(j);
          return (
            <Card key={j.PID_id} hover style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge variant="primary">{j.group_code}</Badge>
                    <Badge variant="gray">{j.specialty}</Badge>
                    <Badge variant={j.schedule ? 'success' : 'warning'}>{j.schedule ? t('Scheduled') : t('InProgress')}</Badge>
                    {userRoles.map((role, idx) => (
                      <span key={idx} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, color: role.color, background: role.bg, display: 'inline-flex', alignItems: 'center' }}>
                        {role.name}
                      </span>
                    ))}
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

                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Jury</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontWeight: 600 }}>
                        👑 Président: {j.president_name}
                      </span>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        Examinateur: {j.examiner1_name}
                      </span>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        Examinateur: {j.examiner2_name}
                      </span>
                    </div>
                  </div>
                  
                  {(j.attachments || []).length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <AttachmentsPopover attachments={j.attachments.map(a => ({ ...a, file_url: a.file_url || getFileUrl(a.url) }))} />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  {graded ? (
                    <div style={{ textAlign: 'right' }}>
                      <Badge variant="success">{t('Evaluated')} ✓</Badge>
                    </div>
                  ) : j.my_role === 'president' ? (
                    <button onClick={() => { setGradeModal(j); setEvalMarks({}); setFeedbackInput(''); setIs2CpiProject(false); }}
                      style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                      🎓 {t('Evaluate')}
                    </button>
                  ) : (
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Badge variant="gray">Membre du Jury</Badge>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lecture seule</span>
                    </div>
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
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Documents :</span>
                <AttachmentsPopover attachments={gradeModal.attachments.map(a => ({ ...a, file_url: a.file_url || getFileUrl(a.url) }))} />
              </div>
            )}
          </div>

          {/* Dynamic Grading Form built from activeFormula */}
          {activeFormula && activeFormula.labels ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {Object.entries(activeFormula.labels).map(([variable, labelText]) => (
                <div key={variable}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    {labelText}
                  </label>
                  <input 
                    type="number" 
                    min="0" 
                    max="20" 
                    step="0.5" 
                    value={evalMarks[variable] || ''} 
                    onChange={e => setEvalMarks({...evalMarks, [variable]: e.target.value})} 
                    placeholder="/20"
                    style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
              Aucune formule d'évaluation active trouvée.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('FinalGradeCalculated')} ({activeFormula?.name || 'Formule active'}) : </span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>{calculateFinalGrade()}/20</span>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('EvaluationComments')}</label>
            <textarea value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} rows={3} placeholder="..."
              style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', outline: 'none', resize: 'vertical' }}/>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setGradeModal(null)} style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>{t('Cancel')}</button>
            <button 
              onClick={() => submitJuryGrade(gradeModal.PID_id)} 
              disabled={!isFormValid() || submitting} 
              style={{ 
                padding: '9px 20px', 
                borderRadius: '10px', 
                background: 'var(--primary)', 
                border: 'none', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '13px', 
                cursor: (submitting || !isFormValid()) ? 'not-allowed' : 'pointer', 
                opacity: (submitting || !isFormValid()) ? 0.5 : 1 
              }}
            >
              {submitting ? '...' : `✓ ${t('Confirm')}`}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

