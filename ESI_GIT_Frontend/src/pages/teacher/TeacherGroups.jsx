import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import {
  IoPeopleOutline, IoCalendarOutline,
  IoLogoGithub, IoCopyOutline, IoCheckboxOutline,
  IoDocumentTextOutline,
} from 'react-icons/io5';
import { useTeacher } from '../../context/TeacherContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROLE_OPTIONS } from '../../constants';
import { getFileUrl } from '../../api/config';

const ROLE_MAP = Object.fromEntries((ROLE_OPTIONS || []).map(r => [r.value, r]));

export default function TeacherGroups() {
  const { groups, updateGroup, assignTask, scheduleMeeting, supervisorRequests, respondToSupervisorRequest } = useTeacher();
  const { t } = useLanguage();
  const list = groups || [];
  const [selected, setSelected] = useState(null);
  const group = selected ? list.find(g => g._id === selected) || null : null;
  const team = group;

  useEffect(() => {
    if (team) {
      setRepoUrl(team.github_url || '');
    }
  }, [team]);

  // GitHub
  const [repoUrl,    setRepoUrl]    = useState('');
  const [ghData,     setGhData]     = useState(null);
  const [ghLoading,  setGhLoading]  = useState(false);
  const [ghError,    setGhError]    = useState('');
  const [repoCopied, setRepoCopied] = useState(false);

  // Task modal state
  const [taskModal,       setTaskModal]       = useState(false);
  const [taskTitle,       setTaskTitle]       = useState('');
  const [taskDesc,        setTaskDesc]        = useState('');
  const [taskPriority,    setTaskPriority]    = useState('medium');
  const [taskDeadline,    setTaskDeadline]    = useState('');
  const [taskAssigneeIds, setTaskAssigneeIds] = useState([]);
  const [taskSubmitting,  setTaskSubmitting]  = useState(false);

  // Schedule meeting modal state
  const [meetModal,      setMeetModal]      = useState(false);
  const [meetTitle,      setMeetTitle]      = useState('');
  const [meetDate,       setMeetDate]       = useState('');
  const [meetTime,       setMeetTime]       = useState('');
  const [meetType,       setMeetType]       = useState('Présentielle');
  const [meetDesc,       setMeetDesc]       = useState('');
  const [meetSubmitting, setMeetSubmitting] = useState(false);

  const loadGitHub = async (url) => {
    if (!url) return;
    const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (!match) { setGhError(t('InvalidURL')); return; }
    const [, owner, repo] = match;
    setGhLoading(true); setGhError(''); setGhData(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`),
      ]);
      if (!rRes.ok) throw new Error(rRes.status === 404 ? t('RepoNotFound') : t('Error'));
      const [rData, cData] = await Promise.all([rRes.json(), cRes.ok ? cRes.json() : []]);
      setGhData({ repo: rData, commits: Array.isArray(cData) ? cData : [] });
    } catch(e) { setGhError(e.message); }
    finally { setGhLoading(false); }
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim() || !group) return;
    setTaskSubmitting(true);
    await assignTask(group._id, {
      title:       taskTitle.trim(),
      description: taskDesc.trim(),
      priority:    taskPriority,
      deadline:    taskDeadline || null,
      assigneeIds: taskAssigneeIds.length > 0 ? taskAssigneeIds : group.studentIds ?? [],
    });
    setTaskModal(false);
    setTaskTitle(''); setTaskDesc(''); setTaskPriority('medium'); setTaskDeadline(''); setTaskAssigneeIds([]);
    setTaskSubmitting(false);
  };

  const handleScheduleMeeting = async () => {
    if (!meetTitle.trim() || !meetDate || !meetTime || !group) return;
    setMeetSubmitting(true);
    await scheduleMeeting(group._id, {
      title: meetTitle.trim(),
      date:  meetDate,
      time:  meetTime,
      type:  meetType,
      desc:  meetDesc.trim(),
    });
    setMeetModal(false);
    setMeetTitle(''); setMeetDate(''); setMeetTime(''); setMeetType('Présentielle'); setMeetDesc('');
    setMeetSubmitting(false);
  };

  if (list.length === 0) {
    return (
      <DashboardLayout>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('MyGroups')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('GroupsSupervision')}</p>
        </div>
        <Card style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <IoPeopleOutline size={40} style={{ marginBottom: '12px', opacity: 0.3 }}/>
          <p>{t('NoGroupYet')}</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (!group) {
    return (
      <DashboardLayout>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>{t('MyGroups')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ClickGroupDetails')}</p>
        </div>

        {/* Categories 2: Supervised Groups */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)' }}>
            {t('SupervisedGroups')} <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, marginLeft: '4px' }}>({list.length})</span>
          </h2>
          {list.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {list.map(g => (
                <div key={g._id} onClick={() => setSelected(g._id)} style={{ cursor: 'pointer' }}>
                  <Card hover>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{g.title}</h3>
                      <Badge variant={(g.status === 'active' || g.status === 'approved') ? 'success' : 'warning'}>{(g.status === 'active' || g.status === 'approved') ? t('Done') : t('InProgress')}</Badge>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{g.groupCode}</p>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('ProjectProgress')}</span>
                        <span style={{ fontWeight: 600 }}>{g.progress || 0}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                        <div style={{ width: `${g.progress || 0}%`, height: '100%', background: (g.progress||0) >= 60 ? '#10B981' : '#F59E0B', borderRadius: 3 }}/>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(g.members || []).map((m, j) => (
                        <span key={j} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)' }}>{m.name || m}</span>
                      ))}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('NoSupervisedGroups')}</p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Detail view
  return (
    <DashboardLayout>
      <div style={{ borderRadius: 'var(--radius-2xl)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 50%, #8B5CF6 100%)', padding: '28px 32px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }}/>
        <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '14px' }}>← {t('AllGroups')}</button>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>{team.title}</h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
          {team.groupCode} · ID projet : <code style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{team._id}</code>
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge style={{ background: team.supervisorApproved ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)', color: '#fff', border: 'none' }}>
            {team.supervisorApproved ? `✓ ${t('Approve')}` : `⏳ ${t('InProgress')}`}
          </Badge>
          <Badge style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>{(team.members||[]).length} membre(s)</Badge>
          {team.github_url && (
            <Badge style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}>
              <IoLogoGithub size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }}/> GitHub : Connecté
            </Badge>
          )}
          {team.joinCode && (
            <Badge style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              🔑 {team.joinCode}
            </Badge>
          )}
        </div>
      </div>

      {/* Validation workflow */}
      {team.submittedToSupervisor && !team.supervisorApproved && (
        <Card style={{ marginBottom: '20px', background: 'var(--primary-subtle)', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>{t('ValidationRequest')}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('ValidationRequestSub')}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" onClick={() => {
                const reason = prompt(t('Reject') + " :");
                if (reason) updateGroup(team._id, { submittedToSupervisor: true, supervisorApproved: false, supervisorFeedback: reason });
              }} style={{ borderColor: '#EF4444', color: '#EF4444' }}>{t('Reject')}</Button>
              <Button onClick={() => updateGroup(team._id, { supervisorApproved: true, submittedToSupervisor: true })} style={{ background: '#10B981', borderColor: '#10B981' }}>{t('Approve')}</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick-action bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setTaskModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          <IoCheckboxOutline size={16}/> {t('AssignTask')}
        </button>
        <button onClick={() => setMeetModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          <IoCalendarOutline size={16}/> {t('ScheduleMeeting')}
        </button>
      </div>

      {/* Progress */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('ProjectProgress')}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{team.progress || 0}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${team.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), #8B5CF6)', borderRadius: 5, transition: 'width 0.4s' }}/>
        </div>
      </Card>

      {/* GitHub & Docs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <IoLogoGithub size={18}/>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{t('GithubRepo')}</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/org/repo"
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}/>
            <button onClick={() => loadGitHub(repoUrl)} disabled={ghLoading}
              style={{ padding: '9px 16px', borderRadius: '8px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: ghLoading ? 0.6 : 1 }}>
              {ghLoading ? '...' : (repoUrl === team.github_url ? t('Reload') : t('Load'))}
            </button>
            {repoUrl !== team.github_url && (
              <button onClick={async () => {
                await updateGroup(team._id, { github_url: repoUrl });
                toast.success('Lien GitHub mis à jour');
              }} style={{ padding: '9px 16px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Enregistrer
              </button>
            )}
            {repoUrl && (
              <button onClick={() => { navigator.clipboard.writeText(repoUrl); setRepoCopied(true); setTimeout(() => setRepoCopied(false), 1500); }}
                style={{ padding: '9px 12px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                {repoCopied ? '✓' : <IoCopyOutline size={14}/>}
              </button>
            )}
          </div>
          {ghError && <p style={{ fontSize: '13px', color: '#EF4444', marginBottom: '8px' }}>{ghError}</p>}
          {ghData && (
            <div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span>⭐ {ghData.repo.stargazers_count}</span>
                <span>🍴 {ghData.repo.forks_count}</span>
                <span>🔭 {ghData.repo.watchers_count}</span>
                {ghData.repo.language && <span>💻 {ghData.repo.language}</span>}
              </div>
              {ghData.commits.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>{t('LastCommits').toUpperCase()}</p>
                  {ghData.commits.map((c, i) => (
                    <div key={i} style={{ fontSize: '12px', padding: '5px 0', borderBottom: i < ghData.commits.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-secondary)' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--primary)', marginRight: '8px' }}>{c.sha.slice(0,7)}</span>
                      {c.commit.message.split('\n')[0].slice(0, 70)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Project Document Viewer */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <IoDocumentTextOutline size={18}/>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{t('ProjectDocs')}</h3>
          </div>
          {team.attachments && team.attachments.length > 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
               {team.attachments.map((file, i) => (
                 <div key={i} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <IoDocumentTextOutline size={18} style={{ color: file.is_final ? '#10B981' : 'var(--primary)' }} />
                     <div>
                       <p style={{ fontSize: '13px', fontWeight: 600 }}>{file.filename}</p>
                       <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{file.attachment_type === 'report' ? 'Rapport Final' : 'Document'}</p>
                     </div>
                   </div>
                   <a href={getFileUrl(file.url)} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Ouvrir</a>
                 </div>
               ))}
             </div>
          ) : (
             <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('NoFile')}</p>
          )}
        </Card>
      </div>

      {/* Members */}
      <Card>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>{t('Members')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(team.members || []).map((m, i) => {
            const roleInfo = ROLE_MAP[m.role] || { label: m.role, color: '#6B7280' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `hsl(${i*80+230},70%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    {(m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.cid}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge style={{ background: roleInfo.color + '20', color: roleInfo.color, border: 'none' }}>{roleInfo.label || m.role}</Badge>
                  {m.isChef && <Badge variant="primary">Chef</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Assign Task Modal */}
      <Modal isOpen={taskModal} onClose={() => setTaskModal(false)} title={`${t('AssignTask')} — ${team.title}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('TaskTitle')} *</label>
            <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}/>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Description')}</label>
            <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={3} placeholder="..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Priority')}</label>
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="high">🔴 {t('High')}</option>
                <option value="medium">🟡 {t('Medium')}</option>
                <option value="low">🟢 {t('Low')}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Deadline')}</label>
              <input type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>{t('AssignTo')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(team.members || []).map(m => {
              const memberId = m.CID ?? m._id ?? m.cid ?? m.id;
              return (
                <label key={memberId} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={taskAssigneeIds.includes(memberId)}
                    onChange={e => setTaskAssigneeIds(prev => e.target.checked ? [...prev, memberId] : prev.filter(id => id !== memberId))}/>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                </label>
              );
            })}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{t('IfNoneSelected')}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => setTaskModal(false)} style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>{t('Cancel')}</button>
            <button onClick={handleAssignTask} disabled={!taskTitle.trim() || taskSubmitting}
              style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: taskTitle.trim() ? 'pointer' : 'not-allowed', opacity: taskTitle.trim() ? 1 : 0.5 }}>
              {taskSubmitting ? '...' : `✓ ${t('Confirm')}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Schedule Meeting Modal */}
      <Modal isOpen={meetModal} onClose={() => setMeetModal(false)} title={`${t('ScheduleMeeting')} — ${team.title}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('TaskTitle')} *</label>
            <input value={meetTitle} onChange={e => setMeetTitle(e.target.value)} placeholder="..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Date *</label>
              <input type="date" value={meetDate} onChange={e => setMeetDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}/>
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Time')} *</label>
              <input type="time" value={meetTime} onChange={e => setMeetTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type</label>
            <select value={meetType} onChange={e => setMeetType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="Présentielle">🏫 Présentielle</option>
              <option value="Distancielle">💻 Distancielle</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Description')}</label>
            <textarea value={meetDesc} onChange={e => setMeetDesc(e.target.value)} rows={3} placeholder="..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}/>
          </div>
          <p style={{ fontSize: '12px', color: '#10B981', background: 'var(--primary-subtle)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '8px 12px' }}>
            ✓ {t('MeetingAutoAccepted')}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setMeetModal(false)} style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>{t('Cancel')}</button>
            <button onClick={handleScheduleMeeting} disabled={!meetTitle.trim() || !meetDate || !meetTime || meetSubmitting}
              style={{ padding: '9px 20px', borderRadius: '10px', background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: (meetTitle.trim() && meetDate && meetTime) ? 'pointer' : 'not-allowed', opacity: (meetTitle.trim() && meetDate && meetTime) ? 1 : 0.5 }}>
              {meetSubmitting ? '...' : `📅 ${t('Confirm')}`}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
