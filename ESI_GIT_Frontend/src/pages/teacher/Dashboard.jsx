import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IoPeopleOutline, IoCalendarOutline,
  IoCheckmarkCircleOutline, IoStarOutline,
  IoTimeOutline, IoTrendingUpOutline, IoDocumentTextOutline,
  IoWarningOutline, IoAlertCircleOutline, IoPersonOutline,
} from 'react-icons/io5';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';

export default function TeacherDashboard() {
  const { groups, meetings, evaluations, analytics, groupsLoading, acceptMeeting, rejectMeeting, updateGroup, supervisorRequests, respondToSupervisorRequest } = useTeacher();
  const { t } = useLanguage();

  const [finalRejectModal, setFinalRejectModal] = useState(null);
  const [finalRejectReason, setFinalRejectReason] = useState('');

  const safeGroups   = groups   || [];
  const safeMeetings = meetings || [];

  // FIX 4: use real computed analytics
  const a = analytics ?? {};

  const statCards = [
    { label: t('SupervisedGroups_Stat'), value: a.totalGroups  ?? safeGroups.length,            icon: <IoPeopleOutline size={22}/>,          color: 'var(--primary)' },
    { label: t('ActiveGroups_Stat'),     value: a.activeGroups ?? 0,                            icon: <IoTimeOutline size={22}/>,            color: 'var(--accent)' },
    { label: t('TasksDone'),             value: `${a.tasksDone ?? 0}/${a.tasksTotal ?? 0}`,     icon: <IoTrendingUpOutline size={22}/>,      color: '#10B981' },
    { label: t('PendingRequestsStat'),   value: a.pendingRequests ?? 0,                         icon: <IoPersonOutline size={22}/>,          color: '#8B5CF6' },
    { label: t('PendingMeetings_Stat'),  value: a.pendingMeetings ?? 0,                         icon: <IoCalendarOutline size={22}/>,        color: '#F59E0B' },
    { label: t('PendingEvals_Stat'),     value: a.pendingEvals ?? 0,                            icon: <IoStarOutline size={22}/>,            color: '#EF4444' },
  ];

  const taskStatusData = [
    { name: t('Todo'),       value: a.todoTasks       ?? 0, color: '#6B7280' },
    { name: t('InProgress'), value: a.inProgressTasks ?? 0, color: 'var(--primary)' },
    { name: t('Done'),       value: a.doneTasks       ?? 0, color: '#10B981' },
  ];

  const atRiskGroups = a.atRiskGroups ?? [];

  const groupBreakdown = (a.groupBreakdown ?? []).length > 0
    ? a.groupBreakdown
    : safeGroups.map(g => ({ name: g.groupCode || g.title, tasks_done: 0, tasks_total: 0, health: 'on_track', overdue: 0 }));

  const LEVEL_LABELS = { 2: '2CPI', 3: '1CS', 4: '2CS', 5: '3CS' };

  const HEALTH_CONFIG = {
    on_track: { label: t('Health_OnTrack'), color: '#10B981' },
    watch:    { label: t('Health_Watch'),   color: '#F59E0B' },
    at_risk:  { label: t('Health_AtRisk'),  color: '#EF4444' },
  };

  // build a lookup so health is accessible from the group row
  const healthByCode = {};
  (a.groups_progress ?? []).forEach(gp => {
    healthByCode[gp.invite_code] = gp;
  });

  const columns = [
    { key: 'title', label: 'Projet', render: (v, row) => (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: row.academic_level ? '3px' : 0 }}>
          {row.academic_level && (
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'var(--primary-subtle)', color: 'var(--primary)', flexShrink: 0 }}>
              {LEVEL_LABELS[row.academic_level] || `L${row.academic_level}`}
            </span>
          )}
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{v}</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.specialty || 'None'}</span>
      </div>
    )},
    { key: 'members', label: t('Members').split(' ')[0], align: 'center', render: (_, row) => <span style={{ fontWeight: 600 }}>{row?.members?.length || row?.studentIds?.length || 0}</span> },
    { key: 'invite_code', label: t('Tasks_label'), render: (code, row) => {
      const gp = healthByCode[code || row.groupCode];
      if (!gp) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>;
      const pct = gp.tasks_total > 0 ? Math.round((gp.tasks_done / gp.tasks_total) * 100) : 0;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', minWidth: 60 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: 3 }}/>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, minWidth: 36, color: 'var(--text-secondary)' }}>{gp.tasks_done}/{gp.tasks_total}</span>
        </div>
      );
    }},
    { key: 'invite_code', label: t('Health_label'), render: (code, row) => {
      const gp = healthByCode[code || row.groupCode];
      const h = gp?.health ?? 'on_track';
      const cfg = HEALTH_CONFIG[h] ?? HEALTH_CONFIG.on_track;
      return <span style={{ fontSize: '12px', fontWeight: 600, color: cfg.color }}>{cfg.label}</span>;
    }},
    { key: 'supervisorApproved', label: 'Approbation', render: v => <Badge variant={v ? 'success' : 'warning'}>{v ? t('Approve') : t('InProgress')}</Badge> },
  ];

  const pendingMeetings = safeMeetings.filter(m => m.status === 'pending');

  return (<>
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('TeacherDashboard')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('RealDataAnalytics')}</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map((s, i) => <div key={i}><StatCard {...s}/></div>)}
      </div>

      {/* Row 1: group tasks bar + tasks status pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', marginBottom: '20px' }}>
        <Card style={{ minHeight: '270px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>{t('TasksDoneByGroup')}</h3>
          {groupBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={groupBreakdown} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip
                  formatter={(v, name, props) => [`${props.payload.tasks_done}/${props.payload.tasks_total}`, 'Tâches réalisées']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
                <Bar dataKey="tasks_done" fill="var(--primary)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 60 }}>{t('NoGroups')}</p>
          )}
        </Card>

        <Card style={{ minHeight: '270px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>{t('TaskState')}</h3>
          <PieChart width={210} height={150} style={{ margin: '0 auto' }}>
            <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={3} dataKey="value">
              {taskStatusData.map((d, i) => <Cell key={i} fill={d.color}/>)}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px' }}/>
          </PieChart>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
            {taskStatusData.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }}/>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <strong>{d.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: groups needing attention + pending meetings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('GroupsToWatch')}
            {atRiskGroups.length > 0 && <Badge variant="danger" style={{ fontSize: '11px' }}>{atRiskGroups.length}</Badge>}
          </h3>
          {atRiskGroups.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '24px' }}>
              <IoCheckmarkCircleOutline size={36} style={{ color: '#10B981', marginBottom: '8px', opacity: 0.7 }}/>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('AllGroupsOnTrack')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {atRiskGroups.map((g, i) => (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: g.health === 'at_risk' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${g.health === 'at_risk' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    {g.health === 'at_risk'
                      ? <IoAlertCircleOutline size={14} style={{ color: '#EF4444', flexShrink: 0 }}/>
                      : <IoWarningOutline size={14} style={{ color: '#F59E0B', flexShrink: 0 }}/>}
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{g.group}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '20px' }}>
                    {g.reasons?.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            {t('PendingMeetings_Stat')}
            {pendingMeetings.length > 0 && <Badge variant="warning" style={{ marginLeft: 8 }}>{pendingMeetings.length}</Badge>}
          </h3>
          {pendingMeetings.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 30 }}>{t('NoPendingRequests')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingMeetings.slice(0, 4).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{m.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {m.date} à {m.time}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => acceptMeeting(m.id)} style={{ padding: '5px 10px', borderRadius: '8px', background: 'var(--primary-subtle)', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>✓</button>
                    <button onClick={() => rejectMeeting(m.id)} style={{ padding: '5px 10px', borderRadius: '8px', background: '#FEE2E2', border: 'none', color: '#DC2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Special Requests */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
         {/* Supervisor Requests */}
         {(supervisorRequests || []).length > 0 && (
           <Card style={{ border: '1px solid var(--primary)' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--primary)' }}>
               {t('SupervisionRequests')}
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               {(supervisorRequests || []).map(req => (
                 <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                   <div>
                     <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{req.projectTitle}</p>
                     <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Groupe: {req.groupCode}</p>
                     <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {(req.members || []).map((m, idx) => (
                          <span key={idx} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: 'var(--primary-subtle)', color: m.is_leader ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: m.is_leader ? 700 : 400 }}>
                            {m.is_leader && '⭐ '}{m.name}
                          </span>
                        ))}
                     </div>
                     {req.Message && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{req.Message}"</p>}
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => respondToSupervisorRequest(req.id, 'approved')} style={{ padding: '6px 12px', borderRadius: '8px', background: '#DCFCE7', border: '1px solid #86EFAC', color: '#16A34A', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>{t('Approve')}</button>
                      <button onClick={() => respondToSupervisorRequest(req.id, 'rejected')} style={{ padding: '6px 12px', borderRadius: '8px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>{t('Reject')}</button>
                   </div>
                 </div>
               ))}
             </div>
           </Card>
         )}

         {/* Final Validation Requests */}
         {safeGroups.filter(g => g.submitted_to_supervisor && !g.final_submission_approved).length > 0 && (
           <Card style={{ border: '1px solid var(--primary)', background: 'var(--primary-subtle)' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <IoDocumentTextOutline /> {t('FinalValidationRequests')}
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               {safeGroups.filter(g => g.submitted_to_supervisor && !g.final_submission_approved).map(g => (
                 <div key={g._id || g.PID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                   <div>
                     <p style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{g.title || g.name || g.Name}</p>
                     <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Groupe: {g.groupCode || g.invite_code} — <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('ProjectSubmittedFinal')}</span></p>
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => updateGroup?.(g._id || g.PID, { final_submission_approved: true })} style={{ padding: '8px 16px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>✓ {t('Approve')}</button>
                      <button onClick={() => { setFinalRejectModal({ id: g._id || g.PID }); setFinalRejectReason(''); }} style={{ padding: '8px 16px', borderRadius: '10px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#DC2626', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>✕ {t('Reject')}</button>
                   </div>
                 </div>
               ))}
             </div>
           </Card>
         )}
      </div>
      {/* Groups table */}
      <Card style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('MyGroups')}</h3>
        {groupsLoading ? (
          <p style={{ color: 'var(--text-muted)', padding: '24px', textAlign: 'center' }}>{t('Loading')}</p>
        ) : safeGroups.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <IoPeopleOutline size={36} style={{ marginBottom: '12px', opacity: 0.3 }}/>
            <p>{t('NoSupervisedGroups')}</p>
          </div>
        ) : (
          <Table columns={columns} data={safeGroups}/>
        )}
      </Card>

      {/* Jury Assignments table */}
      {(evaluations?.defenses || []).length > 0 && (
        <Card style={{ marginTop: '20px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>{t('DefenseJury')}</h3>
          <Table 
            columns={[
              { key: 'project_name', label: 'Projet', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
              { key: 'specialty',    label: 'Spécialité' },
              { key: 'schedule',     label: 'Soutenance', render: s => s ? `${s.date} ${s.time}` : 'Non planifiée' },
              { key: 'is_evaluated', label: 'Statut', render: v => <Badge variant={v ? 'success' : 'warning'}>{v ? t('Evaluated') : t('ToEvaluate')}</Badge> },
              { key: 'PID_id',       label: 'Action', align: 'right', render: (id) => (
                <a href="/teacher/jury" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '13px' }}>
                  {t('ViewDetails')} →
                </a>
              )}
            ]} 
            data={evaluations.defenses}
          />
        </Card>
      )}
    </DashboardLayout>

    {finalRejectModal && createPortal(
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => { if (e.target === e.currentTarget) setFinalRejectModal(null); }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '90vw', boxShadow: 'var(--shadow-xl)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>Rejeter la soumission finale</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Expliquez la raison du rejet — ce feedback sera visible par le groupe.</p>
          <textarea
            value={finalRejectReason}
            onChange={e => setFinalRejectReason(e.target.value)}
            placeholder="Raison du rejet..."
            rows={4}
            style={{ width: '100%', borderRadius: '10px', border: `1px solid ${finalRejectReason.trim() ? 'var(--border)' : '#EF4444'}`, padding: '10px 12px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          {!finalRejectReason.trim() && <p style={{ fontSize: '12px', color: '#EF4444', marginTop: '4px' }}>La raison est obligatoire.</p>}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={() => setFinalRejectModal(null)} style={{ padding: '8px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
            <button
              disabled={!finalRejectReason.trim()}
              onClick={() => {
                updateGroup?.(finalRejectModal.id, { final_submission_approved: false, supervisor_feedback: finalRejectReason.trim() });
                setFinalRejectModal(null);
              }}
              style={{ padding: '8px 18px', borderRadius: '10px', background: finalRejectReason.trim() ? '#DC2626' : '#6B7280', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: finalRejectReason.trim() ? 'pointer' : 'not-allowed' }}>
              Confirmer le rejet
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>);
}
