import { useState } from 'react';
import {
  IoPeopleOutline, IoEnterOutline,
  IoPersonAddOutline, IoCheckmarkCircleOutline,
  IoShieldCheckmarkOutline, IoCodeSlashOutline, IoColorPaletteOutline,
  IoDocumentTextOutline, IoStarOutline, IoCloseOutline,
  IoArrowForwardOutline, IoArrowBackOutline,
  IoTimeOutline, IoPersonOutline, IoCheckmarkOutline,
  IoAlertCircleOutline, IoSendOutline, IoLogoGithub, IoCopyOutline,
  IoWarningOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { useLanguage } from '../../context/LanguageContext';
import { useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { usersApi } from '../../api/users';
import { groupApi } from '../../api/groups';
import { ROLE_OPTIONS } from '../../constants';
import { toast } from 'react-hot-toast';

const ROLE_MAP = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r]));

export default function Groupe() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: teachersList, request: loadTeachers } = useApi(usersApi.getTeachers);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const teachers = teachersList || [];
  const { group: team, updateGroup, setGroup: setTeam } = useStudent();
  const [activeTab, setActiveTab] = useState('creer');
  const [createStep, setCreateStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectTheme, setProjectTheme] = useState('Intelligence Artificielle');
  const [creatorRole, setCreatorRole] = useState('frontend');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [supervisorRequests, setSupervisorRequests] = useState([]);
  const [requestStatus, setRequestStatus] = useState('idle');
  const [selectedRole, setSelectedRole] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinRole, setJoinRole] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [error, setError] = useState('');
  const [ghError, setGhError] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoCopied, setRepoCopied] = useState(false);
  const [ghData, setGhData] = useState(null);
  const [ghLoading, setGhLoading] = useState(false);
  const [documentFiles, setDocumentFiles] = useState([]);

  useEffect(() => {
    if (team) {
      setRepoUrl(team.github_url || '');
      groupApi.getAttachments().then(setDocumentFiles).catch(console.error);
    }
  }, [team]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showKickModal, setShowKickModal] = useState(false);
  const [memberToKick, setMemberToKick] = useState(null);
  const [isKicking, setIsKicking] = useState(false);


  // Robust teacher lookup for both mock (_id, SID) and real (TID, id) environments
  const findTeacher = (id) => teachers.find(t => (t._id === id || t.TID === id || t.id === id || t.SID === id));

  const sendSupervisorRequest = () => {
    // Skip API call, just advance to confirmation. The actual API call is done in handleCreate.
    setRequestStatus('approved'); // Fake approval for UI flow if needed
    setCreateStep(2);
    setShowConfirmModal(false);
  };

  const handleSendClick = () => {
    if (selectedTeacher) setCreateStep(2);
  };

  const tryAnotherSupervisor = () => { setSelectedTeacher(null); setRequestMessage(''); setRequestStatus('idle'); };

  /* ── GitHub API fetch ─────────────────────────────────────────── */
  const loadGitHub = async (url) => {
    if (!url) return;
    const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (!match) { setGhError("URL GitHub invalide — ex: https://github.com/org/repo"); return; }
    const [, owner, repo] = match;
    setGhLoading(true); setGhError(''); setGhData(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`),
      ]);
      if (!rRes.ok) throw new Error(rRes.status === 404 ? 'Dépôt introuvable ou privé' : 'Erreur GitHub API');
      const [rData, cData] = await Promise.all([rRes.json(), cRes.ok ? cRes.json() : []]);
      setGhData({ repo: rData, commits: Array.isArray(cData) ? cData : [] });
    } catch (e) {
      setGhError(e.message || 'Erreur de connexion à GitHub');
    } finally {
      setGhLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const activeReq = supervisorRequests[supervisorRequests.length - 1];
      const res = await groupApi.createGroup({
        name: groupName || projectTitle || 'Projet PFE',
        type: projectTheme,
        role: creatorRole,
        teacherId: selectedTeacher || null,
        requestMessage: requestMessage || '',
      });
      // Re-fetch project to get full details and normalize via context
      const fullProject = await groupApi.getStudentGroup();
      updateGroup(fullProject);
      toast.success(t('GroupCreated') || 'Groupe créé !');
      // Force refresh to ensure all context data is re-fetched for the new group
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleJoin = async () => {
    if (!joinRole) { setError('Veuillez choisir un rôle.'); return; }
    try {
      const code = joinCode.trim().toUpperCase();
      console.log('Joining with code:', code);
      await groupApi.joinProject(code, joinRole);
      setError('');
      const fullProject = await groupApi.getStudentGroup();
      updateGroup(fullProject);
      toast.success(t('GroupJoined') || 'Groupe rejoint !');
    } catch (err) {
      console.error('Join error:', err.response?.data);
      const msg = err.response?.data?.error || err.response?.data?.detail || t('InvalidInviteCode');
      setError(msg);
      toast.error(msg);
    }
  };

  const handleKickConfirm = async () => {
    if (!memberToKick) return;
    setIsKicking(true);
    const cid = memberToKick.student_id || memberToKick.id || memberToKick.CID || memberToKick._id;
    console.log('Kicking member:', memberToKick.name, 'CID:', cid);
    
    try {
      await groupApi.leaderAction({ 
        action: 'kick', 
        target_cid: cid
      });
      setTeam(prev => ({ ...prev, members: prev.members.filter(m => m._id !== memberToKick._id) }));
      toast.success(`${memberToKick.name} a été retiré du groupe`);
      setShowKickModal(false);
      setMemberToKick(null);
    } catch (err) {
      console.error('Kick failed:', err.response);
      const serverError = err.response?.data?.error || err.response?.data?.detail;
      const status = err.response?.status;
      toast.error(serverError ? `${serverError} (Status: ${status})` : `Erreur ${status || 'Inconnue'} lors du retrait`);
    } finally {
      setIsKicking(false);
    }
  };

  const updateRole = (index, role) => {
    setTeam(prev => ({ ...prev, members: prev.members.map((m, i) => i === index ? { ...m, Role: role, role } : m) }));
    setEditingRole(null);
  };

  // ── Handle multi-file upload ──────────────────────────────────
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await groupApi.uploadAttachment(formData);
        toast.success(`${file.name} uploader avec succès`);
      } catch (err) {
        toast.error(`Échec de l'upload de ${file.name}`);
      }
    }
    // Refresh list from backend
    try {
      const updated = await groupApi.getAttachments();
      setDocumentFiles(updated);
    } catch (e) { console.error(e); }
  };

  const removeFile = (index) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ── Team view ────────────────────────────────────────────────────────────
  if (team) {
    return (
      <>
        {/* Kick Member Confirmation Modal */}
        <Modal isOpen={showKickModal} onClose={() => setShowKickModal(false)} title="🚨 Retirer un membre" size="sm">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <IoPersonOutline size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Confirmer le retrait ?</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Êtes-vous sûr de vouloir retirer <strong>{memberToKick?.name}</strong> du groupe ? Cette action est irréversible.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowKickModal(false)} 
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}
              >
                Annuler
              </button>
              <button 
                onClick={handleKickConfirm} 
                disabled={isKicking}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#EF4444', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isKicking ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.2)', opacity: isKicking ? 0.7 : 1 }}
              >
                {isKicking ? 'Retrait en cours...' : 'Retirer le membre'}
              </button>
            </div>
          </div>
        </Modal>

        <DashboardLayout>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('MyGroupTitle')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('MyGroupSub')}</p>
        </div>

        {/* Group banner */}
        <Card style={{ marginBottom: '24px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', border: 'none', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{t('CurrentGroup')}</p>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{team.Name || team.name}</h2>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{team.title}</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{t('Supervisor')} : {team.encadreur}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
                {team.supervisorApproved ? `✓ ${t('Approve')}` : `⏳ ${t('NonApproved_Stat')}`}
              </Badge>
              <Badge style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>{team.members.length}/6 {t('Members').toLowerCase()}</Badge>
            </div>
          </div>
        </Card>

        {/* Invite code */}
        <Card style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{t('InviteCode')}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.12em' }}>{team.InviteCode || team.joinCode}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(team.InviteCode || team.joinCode)}>{t('Copy')}</Button>
          </div>
        </Card>

          {/* GitHub Viewer */}
          <Card style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IoLogoGithub size={16} /> {t('GithubRepo')}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                value={repoUrl}
                onChange={e => { setRepoUrl(e.target.value); setGhData(null); setGhError(''); }}
                placeholder="https://github.com/organisation/nom-du-projet"
                style={{ flex: 1, padding: '10px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace', outline: 'none' }}
              />
              <button 
                onClick={async () => { 
                  try {
                    await groupApi.leaderAction({ action: 'edit', github_url: repoUrl });
                    updateGroup({ ...team, github: repoUrl }); 
                    toast.success('GitHub URL enregistrée');
                  } catch (e) {
                    toast.error('Erreur lors de l\'enregistrement');
                  }
                }} 
                style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Enregistrer
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(repoUrl); setRepoCopied(true); setTimeout(() => setRepoCopied(false), 2000); }} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <IoCopyOutline size={14} />{repoCopied ? t('Copied') : t('Copy')}
              </button>
              {repoUrl && (
                <button onClick={() => window.open(repoUrl, '_blank', 'noopener,noreferrer')} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: '#24292e', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                  <IoLogoGithub size={15} /> {t('Open')}
                </button>
              )}
              {repoUrl && (
                <button onClick={() => loadGitHub(repoUrl)} disabled={ghLoading} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--primary)', color: '#fff', cursor: ghLoading ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: ghLoading ? 0.7 : 1 }}>
                  {ghLoading ? '...' : `↻ ${t('Load')}`}
                </button>
              )}
            </div>
          {ghError && <p style={{ fontSize: '12px', color: '#DC2626', padding: '8px 12px', background: '#FEF2F2', borderRadius: 'var(--radius-md)', marginBottom: '10px' }}>{ghError}</p>}

          {/* GitHub repo info */}
          {ghData && (
            <div>
              {/* Repo stats */}
              <div style={{ display: 'flex', gap: '16px', padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '12px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700 }}>{ghData.repo.full_name}</p>
                  {ghData.repo.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ghData.repo.description}</p>}
                </div>
                <div style={{ display: 'flex', gap: '14px', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                  {[
                    { icon: '⭐', val: ghData.repo.stargazers_count },
                    { icon: '🍴', val: ghData.repo.forks_count },
                    { icon: '👁', val: ghData.repo.watchers_count },
                    { icon: '🔤', val: ghData.repo.language ?? '—' },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700 }}>{s.val}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{s.icon}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent commits */}
              {ghData.commits.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Derniers commits</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ghData.commits.map((cm, i) => (
                      <a key={i} href={cm.html_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-subtle)', overflow: 'hidden', flexShrink: 0 }}>
                          {cm.author?.avatar_url ? <img src={cm.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{(cm.commit.author.name || '?').charAt(0)}</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cm.commit.message.split('\n')[0]}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {cm.commit.author.name} · {new Date(cm.commit.author.date).toLocaleDateString('fr-DZ')}
                          </p>
                        </div>
                        <code style={{ fontSize: '10px', color: 'var(--primary)', background: 'var(--primary-subtle)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                          {cm.sha.slice(0, 7)}
                        </code>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ── Project Documents — multi-file upload with preview ── */}
        <Card style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IoDocumentTextOutline size={16} /> {t('ProjectDocs')}
          </p>
          <div style={{ marginBottom: '12px' }}>
            <input type="file" id="docUpload" style={{ display: 'none' }} onChange={handleFileUpload} multiple />
            <label htmlFor="docUpload" style={{ padding: '9px 16px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'inline-block' }}>
              Sélectionner multiples fichiers
            </label>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '10px' }}>
              {documentFiles.length > 0 ? `${documentFiles.length} fichier(s)` : t('NoFile')}
            </span>
          </div>
          {documentFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documentFiles.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--primary-subtle)', border: '1px solid rgba(79,70,229,0.2)' }}>
                  <IoDocumentTextOutline size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.filename || file.name}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatFileSize(file.file_size || file.size)} · {file.attachment_type || file.type || 'fichier'}
                    </p>
                  </div>
                  <a
                    href={file.url.startsWith('http') ? file.url : `http://localhost:8000${file.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                  >
                    📄 {t('Open')}
                  </a>
                  <button
                    onClick={() => removeFile(idx)}
                    style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)', flexShrink: 0 }}
                  >
                    <IoCloseOutline size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Project Submission */}
        {team.members.find(m => m.isMe)?.isChef && (
          <Card style={{ marginBottom: '20px', background: team.submitted_to_supervisor ? 'var(--primary-subtle)' : 'var(--bg-card)', border: team.final_submission_approved ? '2px solid #10B981' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IoShieldCheckmarkOutline style={{ color: team.final_submission_approved ? '#10B981' : 'var(--primary)' }} />
                  {t('ProjectValidation')}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {team.final_submission_approved
                    ? '✨ Votre projet a été officiellement approuvé pour la soutenance !'
                    : team.submitted_to_supervisor
                      ? '⏳ Projet soumis à l\'encadreur. En attente de validation finale...'
                      : 'Soumettez votre rapport final pour obtenir l\'autorisation de soutenance.'}
                </p>
                {team.supervisor_feedback && !team.final_submission_approved && !team.submitted_to_supervisor && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '4px' }}>📢 Feedback de l'encadreur :</p>
                    <p style={{ fontSize: '13px', color: '#B91C1C', fontStyle: 'italic' }}>"{team.supervisor_feedback}"</p>
                    <p style={{ fontSize: '11px', color: '#991B1B', marginTop: '6px', fontWeight: 600 }}>Veuillez corriger votre rapport et le soumettre à nouveau.</p>
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {!team.submitted_to_supervisor && !team.final_submission_approved && (
                  <div>
                    <input type="file" id="finalUpload" style={{ display: 'none' }} onChange={async (e) => {
                      if (e.target.files.length > 0) {
                        try {
                          await groupApi.leaderAction({ action: 'edit', submitted_to_supervisor: true });
                          updateGroup({ ...team, submitted_to_supervisor: true, supervisor_feedback: null });
                          toast.success('Rapport final soumis avec succès !');
                        } catch (err) {
                          toast.error('Erreur lors de la soumission');
                        }
                      }
                    }} />
                    <Button icon={<IoSendOutline size={16} />} onClick={() => document.getElementById('finalUpload').click()}>
                      {team.supervisor_feedback ? 'Ressoumettre le Rapport' : 'Soumettre le Rapport Final'}
                    </Button>
                  </div>
                )}
                {team.submitted_to_supervisor && !team.final_submission_approved && (
                  <Button variant="outline" icon={<IoCloseOutline size={16} />} onClick={async () => {
                    try {
                      await groupApi.leaderAction({ action: 'edit', submitted_to_supervisor: false });
                      updateGroup({ ...team, submitted_to_supervisor: false });
                      toast.success('Soumission annulée');
                    } catch (err) {
                      toast.error('Erreur lors de l\'annulation');
                    }
                  }}>
                    Annuler la soumission
                  </Button>
                )}
                {team.final_submission_approved && (
                  <div style={{ padding: '8px 16px', borderRadius: '20px', background: '#DCFCE7', color: '#16A34A', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IoCheckmarkCircleOutline size={18} /> {t('Approved')}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Members */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('TeamMembers')}</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{team.members.length} membre{team.members.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {team.members.map((m, i) => {
              const ri = ROLE_MAP[m.Role || m.role] || ROLE_OPTIONS[0];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: m.isMe ? 'var(--primary-subtle)' : 'var(--bg)', border: m.isMe ? '1px solid rgba(79,70,229,0.25)' : '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${i * 80 + 230},65%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{m.name}</p>
                      {m.isMe && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>Vous</span>}
                      {(m.IsLeader || m.isChef) && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#F59E0B22', color: '#F59E0B', fontWeight: 600 }}>Chef</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                      <span>{ri.icon}</span>
                      {ri.label}
                    </div>
                  </div>
                  {(m.isMe || team.members.find(x => x.isMe)?.isChef) && (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {editingRole === i && (
                        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                          {ROLE_OPTIONS.map(r => (
                            <button key={r.value} onClick={() => updateRole(i, r.value)} style={{ width: '100%', padding: '10px 14px', border: 'none', background: (m.Role || m.role) === r.value ? 'var(--primary-subtle)' : 'transparent', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: (m.Role || m.role) === r.value ? 'var(--primary)' : 'var(--text-primary)', fontWeight: (m.Role || m.role) === r.value ? 600 : 400 }}>
                              <span>{r.icon}</span>{r.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setEditingRole(editingRole === i ? null : i)} style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500 }}>{t('ChangeRole')}</button>
                    </div>
                  )}
                  {team.members.find(x => x.isMe)?.isChef && !m.isMe && (
                    <button 
                      onClick={() => {
                        console.log('X clicked for member:', m.name);
                        setMemberToKick(m);
                        setShowKickModal(true);
                      }} 
                      style={{ width: 30, height: 30, borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)', flexShrink: 0, zIndex: 10, transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#FEE2E2'}
                      onMouseOut={e => e.currentTarget.style.background = 'var(--bg)'}
                    >
                      <IoCloseOutline size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Button variant="ghost" size="sm" onClick={async () => {
            try {
              await groupApi.leaveProject();
              updateGroup(null);
              toast.success('Vous avez quitté le groupe');
            } catch (e) {
              toast.error(e.response?.data?.error || 'Erreur lors de la sortie du groupe');
            }
          }} style={{ color: 'var(--danger)' }}>Quitter le groupe</Button>
        </div>
      </DashboardLayout>
      </>
    );
  }

  // ── No group ─────────────────────────────────────────────────────────────
  const STEP_LABELS = ['Infos du groupe', 'Choisir un encadreur', 'Confirmation'];

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= createStep ? 'var(--primary)' : 'var(--bg)', border: i <= createStep ? 'none' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i <= createStep ? '#fff' : 'var(--text-muted)', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}>
              {i < createStep ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '10px', fontWeight: i === createStep ? 600 : 400, color: i === createStep ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
          {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 2, background: i < createStep ? 'var(--primary)' : 'var(--border)', margin: '0 6px', marginBottom: '22px', transition: 'all 0.2s' }} />}
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>Groupe</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Créez ou rejoignez un groupe de projet</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[{ id: 'creer', label: t('CreateGroup').split(' ')[0] }, { id: 'rejoindre', label: t('JoinGroup').split(' ')[0] }].map(tVal => (
          <button key={tVal.id} onClick={() => { setActiveTab(tVal.id); setCreateStep(0); setError(''); }} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: activeTab === tVal.id ? 'var(--primary)' : 'transparent', color: activeTab === tVal.id ? '#fff' : 'var(--text-secondary)', fontSize: '14px', fontWeight: activeTab === tVal.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>{tVal.label}</button>
        ))}
      </div>

      {activeTab === 'creer' && (
        <div style={{ maxWidth: '620px' }}>
          <StepIndicator />
          {error && <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '14px', marginBottom: '20px' }}>{error}</div>}

          {createStep === 0 && (
            <Card>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Informations du groupe</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Définissez le nom et le sujet de votre PFE.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input label={t('GroupName') || 'Nom du groupe'} value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Team AI / Les Innovateurs" icon={<IoPeopleOutline size={16} />} />
                <Input label={t('ProjectTitle')} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Titre de votre PFE" />
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('ProjectTheme') || 'Thème du projet'}</label>
                  <select value={projectTheme} onChange={e => setProjectTheme(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
                    <option>Intelligence Artificielle</option><option>Développement Web</option><option>Systèmes Distribués</option><option>Cybersécurité</option><option>Big Data</option><option>Internet des Objets (IoT)</option><option>Vision par Ordinateur</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Role')}</label>
                  <select value={creatorRole} onChange={e => setCreatorRole(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
                    {ROLE_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button icon={<IoArrowForwardOutline size={16} />} onClick={() => { if (!groupName.trim() || !projectTitle.trim() || !creatorRole) { setError('Veuillez remplir tous les champs.'); return; } setError(''); setCreateStep(1); }}>Suivant : Encadreur</Button>
                </div>
              </div>
            </Card>
          )}

          {createStep === 1 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <button onClick={() => { setCreateStep(0); setRequestStatus('idle'); setSelectedTeacher(null); setSupervisorRequests([]); }} style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><IoArrowBackOutline size={18} /></button>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Choisir un encadreur</h2>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', paddingLeft: '30px' }}>Envoyez une demande. Si refusée, vous pourrez en choisir un autre.</p>

              {supervisorRequests.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Historique des demandes</p>
                  {supervisorRequests.map((req, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg)', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IoPersonOutline size={14} style={{ color: 'var(--primary)' }} /></div>
                        <div><p style={{ fontSize: '13px', fontWeight: 600 }}>{req.teacher.name}</p><p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.sentAt}</p></div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: (req.Status || req.status) === 'approved' ? '#10B981' : (req.Status || req.status) === 'rejected' ? '#EF4444' : '#F59E0B' }}>
                        {(req.Status || req.status) === 'pending' && '⏳ En attente...'}{(req.Status || req.status) === 'approved' && '✓ Accepté'}{(req.Status || req.status) === 'rejected' && '✕ Refusé'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {requestStatus === 'rejected' && (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#B91C1C', fontWeight: 600, marginBottom: '4px' }}>Demande refusée</p>
                  <p style={{ fontSize: '13px', color: '#991B1B', marginBottom: '10px' }}>L'encadreur a décliné votre demande. Veuillez en choisir un autre.</p>
                  <button onClick={tryAnotherSupervisor} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FFF', color: '#B91C1C', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>🔄 Choisir un autre encadreur</button>
                </div>
              )}

              {requestStatus === 'approved' && (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: '#DCFCE7', border: '1px solid #86EFAC', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#16A34A', fontWeight: 600 }}>✓ {supervisorRequests.find(r => (r.Status || r.status) === 'approved')?.teacher?.name} a accepté de superviser votre projet !</p>
                </div>
              )}

              {requestStatus === 'idle' && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {teachers.map(t => (
                      <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: t.available ? 'pointer' : 'not-allowed', border: selectedTeacher === t._id ? '2px solid var(--primary)' : '1px solid var(--border)', background: selectedTeacher === t._id ? 'var(--primary-subtle)' : 'var(--bg)', opacity: t.available ? 1 : 0.5, transition: 'all 0.15s' }}>
                        <input type="radio" name="teacher" value={t._id} checked={selectedTeacher === t._id} onChange={() => t.available && setSelectedTeacher(t._id)} disabled={!t.available} style={{ accentColor: 'var(--primary)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p style={{ fontSize: '14px', fontWeight: 600 }}>{t.name}</p>
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: t.available ? '#DCFCE7' : '#FEE2E2', color: t.available ? '#16A34A' : '#B91C1C', fontWeight: 600 }}>{t.available ? 'Disponible' : 'Indisponible'}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.specialty} · {t.department}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>✉️ Message (optionnel)</label>
                    <textarea value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="Présentez brièvement votre projet..." rows={3} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>
                  <Button disabled={!selectedTeacher} onClick={handleSendClick}>Suivant : Confirmation</Button>
                </div>
              )}

              {requestStatus === 'pending' && (
                <div>
                  <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Demande envoyée — En attente de réponse...</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Vous pouvez continuer et créer votre groupe en attendant.</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <button onClick={tryAnotherSupervisor} style={{ border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', background: 'var(--bg)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Rechanger encadreur</button>
                    <Button icon={<IoArrowForwardOutline size={16} />} onClick={() => { setError(''); setCreateStep(2); }}>Continuer vers confirmation</Button>
                  </div>
                </div>
              )}

              {requestStatus === 'approved' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <Button icon={<IoArrowForwardOutline size={16} />} onClick={() => { setError(''); setCreateStep(2); }}>Suivant : Confirmation</Button>
                </div>
              )}
            </Card>
          )}



          {createStep === 2 && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <button onClick={() => setCreateStep(1)} style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><IoArrowBackOutline size={18} /></button>
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Récapitulatif</h2>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', paddingLeft: '30px' }}>Vérifiez les informations avant de créer votre groupe.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {[{ label: 'Nom du groupe', value: groupName }, { label: 'Titre du projet', value: projectTitle }, { label: 'Thème', value: projectTheme }, { label: 'Encadreur', value: findTeacher(selectedTeacher)?.name || findTeacher(selectedTeacher)?.full_name }, { label: 'Votre rôle', value: `⭐ Chef & ${ROLE_MAP[creatorRole]?.label}` }].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.value || '—'}</span>
                  </div>
                ))}
              </div>
              <Button onClick={handleCreate} style={{ width: '100%' }}>✓ Créer le groupe</Button>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'rejoindre' && (
        <div style={{ maxWidth: '520px' }}>
          <Card>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{t('JoinGroup')}</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('ReadyToStartSub')}</p>
            {error && <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Input label={t('InviteCode')} value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="XXXXXXXX" icon={<IoEnterOutline size={16} />} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '10px' }}>{t('Role')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ROLE_OPTIONS.map(r => (
                    <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: joinRole === r.value ? '2px solid var(--primary)' : '1px solid var(--border)', background: joinRole === r.value ? 'var(--primary-subtle)' : 'var(--bg)', transition: 'all 0.15s' }}>
                      <input type="radio" name="joinRole" value={r.value} checked={joinRole === r.value} onChange={() => setJoinRole(r.value)} style={{ accentColor: 'var(--primary)' }} />
                      <span>{r.icon}</span>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>💡 Code de test : <code style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>GRSU5OIL</code></p>
              </div>
              <Button onClick={handleJoin} disabled={!joinCode || !joinRole}>{t('JoinGroup')}</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── CHANGE 3: Supervisor Request Confirmation Modal ────────── */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="⚠️ Confirmation de la demande" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Warning banner */}
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1.5px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IoWarningOutline size={22} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#92400E' }}>Action irréversible</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6 }}>
              Vous êtes sur le point d'envoyer une demande d'encadrement à <strong>{findTeacher(selectedTeacher)?.name || findTeacher(selectedTeacher)?.full_name || 'cet encadreur'}</strong>.
            </p>
          </div>

          {/* Warning details */}
          <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>🚫</span>
                <p style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>
                  <strong>Vous ne pourrez pas annuler</strong> cette demande une fois envoyée.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>🔒</span>
                <p style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>
                  <strong>Vous ne pourrez pas changer d'encadreur</strong> si votre demande est acceptée.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>📋</span>
                <p style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>
                  L'encadreur recevra votre demande avec votre message et devra l'accepter ou la refuser.
                </p>
              </div>
            </div>
          </div>

          {/* Selected teacher info */}
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <IoPersonOutline size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700 }}>{findTeacher(selectedTeacher)?.name || findTeacher(selectedTeacher)?.full_name}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{findTeacher(selectedTeacher)?.specialty || findTeacher(selectedTeacher)?.specialite} · {findTeacher(selectedTeacher)?.department}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={() => setShowConfirmModal(false)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', color: 'var(--text-secondary)' }}>
              Annuler
            </button>
            <button onClick={sendSupervisorRequest} style={{ padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
              <IoSendOutline size={16} /> Confirmer et envoyer
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
