import { useState } from 'react';
import {
  IoPeopleOutline, IoEnterOutline,
  IoPersonAddOutline, IoCheckmarkCircleOutline,
  IoShieldCheckmarkOutline, IoCodeSlashOutline, IoColorPaletteOutline,
  IoDocumentTextOutline, IoStarOutline, IoCloseOutline,
  IoArrowForwardOutline, IoArrowBackOutline,
  IoTimeOutline, IoPersonOutline, IoCheckmarkOutline,
  IoAlertCircleOutline, IoSendOutline, IoLogoGithub, IoCopyOutline,
  IoWarningOutline, IoLogOutOutline, IoSearchOutline, IoAddOutline, IoRocketOutline,
  IoLockClosedOutline,
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
import UserPopover from '../../components/ui/UserPopover';

const ROLE_MAP = Object.fromEntries(ROLE_OPTIONS.map(r => [r.value, r]));

// Contextual roles based on specialty keywords
const SPECIALTY_ROLE_MAP = {
  robotics:  ['fullstack', 'backend'],   // no frontend/design for robotics/embedded
  embedded:  ['fullstack', 'backend'],
  network:   ['fullstack', 'backend'],
  security:  ['fullstack', 'backend'],
  cyber:     ['fullstack', 'backend'],
  default:   ['frontend', 'backend', 'design', 'fullstack'],
};

function getRolesForSpecialty(specialty) {
  if (!specialty) return ROLE_OPTIONS;
  const lower = specialty.toLowerCase();
  for (const [key, allowed] of Object.entries(SPECIALTY_ROLE_MAP)) {
    if (key === 'default') continue;
    if (lower.includes(key)) return ROLE_OPTIONS.filter(r => allowed.includes(r.value));
  }
  return ROLE_OPTIONS;
}

export default function Groupe() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: teachersList, request: loadTeachers } = useApi(usersApi.getAvailableSupervisors);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const teachers = teachersList || [];
  const { group: team, updateGroup, setGroup: setTeam } = useStudent();
  const [activeTab, setActiveTab] = useState('creer');
  const [createStep, setCreateStep] = useState(0);
  const [groupName, setGroupName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
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
  const [studentDirectory, setStudentDirectory] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirSearch, setDirSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTech, setEditTech] = useState('');
  const [editType, setEditType] = useState('');
  const [publicSettings, setPublicSettings] = useState(null);
  const [projectType, setProjectType] = useState('');
  const [customProjectType, setCustomProjectType] = useState(''); // F9: free-text when "Autre" selected
  const [customEditType, setCustomEditType] = useState('');       // F9: free-text for edit modal

  // Available roles depend on the student's specialty
  const availableRoles = getRolesForSpecialty(user?.specialty);

  useEffect(() => {
    groupApi.getPublicSettings()
      .then(res => setPublicSettings(res))
      .catch(e => console.error("Error loading public settings:", e));
  }, []);

  useEffect(() => {
    if (team) {
      setRepoUrl(team.github_url || '');
      setEditTitle(team.name || team.title || '');
      setEditDesc(team.description || '');
      setEditTech(team.tech_stack || '');
      const knownTypes = publicSettings?.project_types?.split(',').map(t => t.trim()) || ['PFE', 'Stage', 'Projet'];
      const teamType = team.type || '';
      if (teamType && !knownTypes.includes(teamType)) {
        setEditType('Autre');
        setCustomEditType(teamType);
      } else {
        setEditType(teamType);
        setCustomEditType('');
      }
      groupApi.getAttachments().then(setDocumentFiles).catch(console.error);
    }
  }, [team]);

  useEffect(() => {
    // Fetch supervisor requests if student has a project or is in the creation flow
    groupApi.getSupervisorRequests()
      .then(res => {
        setSupervisorRequests(res);
        // If there's an approved request, update local state
        const approved = res.find(r => r.status === 'accepted' || r.status === 'approved');
        if (approved) setRequestStatus('approved');
        const rejected = res.find(r => r.status === 'rejected');
        if (rejected && !approved) setRequestStatus('rejected');
      })
      .catch(e => console.error("Error fetching supervisor requests:", e));
  }, [team]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showKickModal, setShowKickModal] = useState(false);
  const [memberToKick, setMemberToKick] = useState(null);
  const [popover, setPopover] = useState(null);
  const [isKicking, setIsKicking] = useState(false);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showSupervisorConfirmModal, setShowSupervisorConfirmModal] = useState(false);
  const [showGroupConfirmModal, setShowGroupConfirmModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherPage, setTeacherPage] = useState(1);
  const teachersPerPage = 10;


  // Robust teacher lookup for both mock (_id, SID) and real (TID, id) environments
  const findTeacher = (id) => teachers.find(t => (t._id === id || t.TID === id || t.id === id || t.SID === id));

  const sendSupervisorRequest = () => {
    // Skip API call, just advance to confirmation. The actual API call is done in handleCreate.
    setRequestStatus('approved'); // Fake approval for UI flow if needed
    setCreateStep(2);
    setShowConfirmModal(false);
  };

  const isLocked = Boolean(team?.is_locked);
  const isLeader = Boolean(team?.members?.find(m => m.isMe)?.isChef);
  const globalLocked = (() => {
    if (!publicSettings?.group_lock_deadline) return false;
    const deadline = new Date(publicSettings.group_lock_deadline + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return today >= deadline;
  })();

  const handleConfirmGroup = async () => {
    setIsConfirming(true);
    try {
      await groupApi.confirmGroup();
      updateGroup({ ...team, is_confirmed: true, is_locked: true });
      toast.success('Groupe confirmé ! La composition est maintenant verrouillée.');
      setShowGroupConfirmModal(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de la confirmation';
      toast.error(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleLeaveGroup = async () => {
    setIsLeaving(true);
    try {
      await groupApi.leaveProject();
      updateGroup(null);
      toast.success('Vous avez quitté le groupe');
      setShowLeaveModal(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de la sortie du groupe';
      toast.error(msg);
    } finally {
      setIsLeaving(false);
    }
  };

  const confirmSupervisor = () => {
    setShowSupervisorConfirmModal(true);
  };

  const handleSendSupervisorRequest = async () => {
    if (!selectedTeacher) return;
    try {
      await groupApi.sendSupervisorRequest(selectedTeacher._id || selectedTeacher.TID || selectedTeacher.id, requestMessage);
      toast.success('Demande envoyée à l\'encadreur');
      // Force refresh or update local state
      const updated = await groupApi.getStudentGroup();
      updateGroup(updated);
      setCreateStep(2);
      setShowSupervisorConfirmModal(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de l\'envoi de la demande';
      toast.error(msg);
    }
  };

  const tryAnotherSupervisor = () => { window.location.href = '/student/encadreur'; };

  const STEP_LABELS = ['Infos du groupe', 'Choisir Encadreur', 'Confirmation'];

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= createStep ? 'var(--primary)' : 'var(--bg)', border: i <= createStep ? 'none' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i <= createStep ? '#fff' : 'var(--text-muted)', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s' }}>
              {i < createStep ? '✓' : i + 1}
            </div>
            {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 2, background: i < createStep ? 'var(--primary)' : 'var(--border)', margin: '0 12px', transition: 'all 0.2s' }} />}
          </div>
          <span style={{ fontSize: '10px', fontWeight: i === createStep ? 600 : 400, color: i === createStep ? 'var(--primary)' : 'var(--text-muted)', marginTop: '8px' }}>{label}</span>
        </div>
      ))}
    </div>
  );

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
      if (!rRes.ok) throw new Error(rRes.status === 404 ? t('GithubRepoNotFound') : 'Erreur GitHub API');
      const [rData, cData] = await Promise.all([rRes.json(), cRes.ok ? cRes.json() : []]);
      setGhData({ repo: rData, commits: Array.isArray(cData) ? cData : [] });
    } catch (e) {
      setGhError(e.message || t('GithubConnError'));
    } finally {
      setGhLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const resolvedType = projectType === 'Autre' ? customProjectType.trim() || 'Autre' : projectType;
      const res = await groupApi.createGroup({
        name: projectTitle || 'Projet',
        title: projectTitle,
        description: projectDescription,
        type: resolvedType,
        role: creatorRole,
      });

      // Re-fetch project to get full details and normalize via context
      const fullProject = await groupApi.getStudentGroup();
      updateGroup(fullProject);
      toast.success(t('GroupCreated') || 'Groupe créé !');

      // If a teacher was selected, send the request
      if (selectedTeacher) {
        try {
          const teacherId = selectedTeacher._id || selectedTeacher.TID || selectedTeacher.id;
          await groupApi.sendSupervisorRequest(teacherId, t('SupervInitialMsg') || "Demande d'encadrement initiale lors de la création du groupe.");
          toast.success('Demande envoyée à l\'encadreur');
        } catch (e) {
          console.error("Failed to send initial supervisor request:", e);
          const msg = e.response?.data?.error || e.response?.data?.detail || "Erreur lors de l'envoi de la demande à l'encadreur";
          toast.error(msg);
        }
      }

      // If no teacher selected, or even if selected, redirect to see status
      setTimeout(() => window.location.href = '/student/groupe', 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleJoin = async () => {
    if (!joinRole) { setError(t('ChooseRoleFirst')); return; }
    try {
      const code = joinCode.trim().toUpperCase();
      console.log('Joining with code:', code);
      await groupApi.joinProject(code, joinRole);
      setError('');
      toast.success(t('GroupJoined') || 'Groupe rejoint !');
      setTimeout(() => window.location.reload(), 800);
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
      setTeam(prev => ({ 
        ...prev, 
        members: prev.members.filter(m => (m.student_id || m.id || m.CID || m._id) !== cid) 
      }));
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

  const updateRole = async (index, role) => {
    const member = team.members[index];
    const cid = member.student_id || member.id || member.CID || member._id;
    
    try {
      // Check if current user is leader or is updating their own role
      const isLeader = team.members.find(m => m.isMe)?.isChef;
      if (!isLeader && !member.isMe) {
        toast.error("Seul le chef peut changer le rôle des autres");
        return;
      }

      await groupApi.leaderAction({
        action: 'update_role',
        target_cid: cid,
        role: role
      });

      setTeam(prev => ({ 
        ...prev, 
        members: prev.members.map((m, i) => i === index ? { ...m, Role: role, role } : m) 
      }));
      toast.success("Rôle mis à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour du rôle");
    } finally {
      setEditingRole(null);
    }
  };

  const handleUpdateInfo = async () => {
    const resolvedType = editType === 'Autre' ? customEditType.trim() || 'Autre' : editType;
    try {
      await groupApi.leaderAction({
        action: 'edit',
        name: editTitle,
        description: editDesc,
        tech_stack: editTech,
        type: resolvedType
      });
      updateGroup({ 
        ...team, 
        name: editTitle, 
        description: editDesc, 
        tech_stack: editTech, 
        type: resolvedType 
      });
      toast.success('Informations mises à jour');
      setShowEditModal(false);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // ── Handle multi-file upload ──────────────────────────────────
  const handleFileUpload = async (e, isFinal = false) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      if (isFinal) {
        formData.append('is_final', 'true');
        formData.append('attachment_type', 'report');
        formData.append('title', 'Rapport Final');
      }
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

  const removeFile = async (idx) => {
    const file = documentFiles[idx];
    if (!file?.id) {
      // If it doesn't have an ID (maybe just uploaded but state not refreshed), just remove from local state
      setDocumentFiles(prev => prev.filter((_, i) => i !== idx));
      return;
    }

    try {
      await groupApi.deleteAttachment(file.id);
      setDocumentFiles(prev => prev.filter((_, i) => i !== idx));
      toast.success('Document supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isFinalUploaded = documentFiles.length > 0;

  // ── Unified Render ────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      {/* ── Supervisor Request Confirmation Modal ── */}
      <Modal isOpen={showSupervisorConfirmModal} onClose={() => setShowSupervisorConfirmModal(false)} title={t('ConfirmSupervReqTitle')} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1.5px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IoWarningOutline size={22} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#92400E' }}>{t('ImportantAction')}</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6 }}>
              {t('ConfirmSupervMsg')} <strong>{selectedTeacher?.name || selectedTeacher?.full_name || t('Encadreur').toLowerCase()}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={() => setShowSupervisorConfirmModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>{t('Cancel')}</button>
            <button
              onClick={handleSendSupervisorRequest}
              style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(31, 58, 95, 0.2)' }}
            >
              {t('ConfirmSend')}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Main Content ── */}
      {team ? (
        <>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('MyGroupTitle')}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('MyGroupSub')}</p>
          </div>

          {/* Group banner */}
          <Card style={{ marginBottom: '24px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', border: 'none', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{t('CurrentGroup')}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{team.title || team.Name || team.name}</h2>
                    {team.description && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', marginTop: '2px', maxWidth: '420px', lineHeight: 1.4 }}>{team.description}</p>}
                  </div>
                  {team.members?.find(m => m.isMe)?.isChef && (
                    <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} icon={<IoRocketOutline size={14}/>}>
                      {t('Edit')} Infos
                    </Button>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{t('Supervisor')} :</span>
                  {team.supervisorRequest?.status === 'rejected'
                    ? <span style={{ color: '#FECACA', fontWeight: 600 }}>{team.supervisorRequest.teacher_name} ({t('Rejected_label')})</span>
                    : team.encadreur
                      ? <span
                          onClick={e => setPopover({ user: { name: team.encadreur, email: team.encadreur_email || team.teacher_email || team.supervisor_email || team.encadreurEmail || team.teacherEmail || null }, anchor: { x: e.clientX, y: e.clientY } })}
                          style={{ cursor: 'pointer', color: '#fff', fontWeight: 700, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '3px', fontSize: '14px' }}
                        >{team.encadreur}</span>
                      : <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>—</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {team.supervisorRequest?.status === 'rejected' ? (
                  <Badge style={{ background: '#DC2626', color: '#fff', border: 'none' }}>
                    ❌ Refusé
                  </Badge>
                ) : (
                  <Badge style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
                    {team.supervisorApproved ? `✓ ${t('Approve')}` : `⏳ ${t('NonApproved_Stat')}`}
                  </Badge>
                )}
                <Badge style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}>{(team.members || []).length}/6 {t('Members').toLowerCase()}</Badge>
              </div>
            </div>
          </Card>
          
          {/* Lock banner */}
          {isLocked && (
            <div style={{ marginBottom: '16px', padding: '14px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)', border: '1.5px solid #EF4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px', flexShrink: 0 }}>🔒</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B', marginBottom: '2px' }}>{t('GroupLockedTitle')}</p>
                <p style={{ fontSize: '12px', color: '#B91C1C' }}>{t('GroupLockedDesc')}</p>
              </div>
            </div>
          )}

          {/* Min 3 members warning */}
          {(team.members || []).length < 3 && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1.5px solid #F59E0B', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>{t('IncompleteGroupTitle')}</p>
                <p style={{ fontSize: '12px', color: '#78350F' }}>{t('MyGroup')} — {(team.members || []).length} {t('Members').toLowerCase()}. Min. 3.</p>
              </div>
            </div>
          )}

          {/* Supervisor Management Section */}
          {!team.supervisorApproved && team.members?.find(m => m.isMe)?.isChef && (
            <Card style={{ marginBottom: '24px', border: '1.5px dashed var(--primary)', background: 'var(--primary-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IoPersonAddOutline size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                    {team.supervisorRequest?.status === 'rejected' ? `❌ ${t('Rejected_label')}` :
                     team.supervisorRequest?.status === 'pending' ? `⏳ ${t('PendingRequest')}` : `🔍 ${t('RequestNewSupervisor')}`}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {team.supervisorRequest?.status === 'rejected'
                      ? `${team.supervisorRequest.teacher_name} ${t('ReqRejectedFull')} ${t('MeetingNeedsSupervWarn')}`
                      : team.supervisorRequest?.status === 'pending'
                        ? `${t('ReqPendingFull')} ${team.supervisorRequest.teacher_name}. ${t('MeetingNeedsSupervWarn')}`
                        : `${t('NoSupervisorWarning')} ${t('MeetingNeedsSupervWarn')}`}
                  </p>
                </div>
              </div>

              {(team.supervisorRequest?.status === 'rejected' || !team.supervisorRequest) && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <IoSearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      placeholder="Rechercher un enseignant par nom..."
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                      {teachers
                        .filter(t => (t.full_name || t.name || '').toLowerCase().includes(teacherSearch.toLowerCase()))
                        .slice(0, 5)
                        .map(t => (
                          <div key={t.TID || t._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                                {(t.full_name || t.name || '?').charAt(0)}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>{t.full_name || t.name}</span>
                            </div>
                            <Button size="sm" onClick={() => { setSelectedTeacher(t); setShowSupervisorConfirmModal(true); }}>Choisir</Button>
                          </div>
                        ))}
                    </div>
                </div>
              )}
            </Card>
          )}

          {/* Invite code — hidden once group is locked (no new members can join) */}
          {!isLocked && (
            <Card style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{t('InviteCode')}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '0.12em' }}>{team.InviteCode || team.joinCode}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(team.InviteCode || team.joinCode)}>{t('Copy')}</Button>
              </div>
            </Card>
          )}

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
                    updateGroup({ ...team, github_url: repoUrl });
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
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{ghData.repo.full_name}</p>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IoDocumentTextOutline size={16} /> {t('ProjectDocs')}
              </p>
              
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input type="file" id="docUpload" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, false)} multiple />
              <label htmlFor="docUpload" style={{ padding: '9px 16px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'inline-block' }}>
                {t('SelectDocs')}
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '10px' }}>
                {documentFiles.length > 0 ? `${documentFiles.length} fichier(s)` : t('NoFile')}
              </span>
            </div>

            {documentFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documentFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px',
                    background: file.is_final ? 'rgba(16, 185, 129, 0.1)' : 'var(--primary-subtle)',
                    border: file.is_final ? '1.5px solid #10B981' : '1px solid rgba(79,70,229,0.2)'
                  }}>
                    <IoDocumentTextOutline size={18} style={{ color: file.is_final ? '#10B981' : 'var(--primary)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: file.is_final ? '#059669' : 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.filename || file.name} {file.is_final && '✅ (FINAL)'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatFileSize(file.file_size || file.size)} · {file.attachment_type === 'report' ? 'Rapport Final' : (file.attachment_type || file.type || 'fichier')}
                      </p>
                    </div>
                    <a
                      href={file.url ? (file.url.startsWith('http') ? file.url : `http://localhost:8000${file.url}`) : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '6px 12px', borderRadius: '6px', background: file.is_final ? '#10B981' : 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
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
          {team.members?.find(m => m.isMe)?.isChef && (
            <Card style={{ marginBottom: '20px', background: team.submitted_to_supervisor ? 'var(--primary-subtle)' : 'var(--bg-card)', border: team.final_submission_approved ? '2px solid #10B981' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IoShieldCheckmarkOutline style={{ color: team.final_submission_approved ? '#10B981' : 'var(--primary)' }} />
                    {t('ProjectValidation')}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {team.final_submission_approved
                      ? t('SubmissionApprovedMsg')
                      : team.submitted_to_supervisor
                        ? t('SubmissionPendingMsg')
                        : team.supervisor_feedback
                          ? t('SubmissionRejectedMsg')
                          : t('SubmitProjectToSup')}
                  </p>
                  {!isFinalUploaded && !team.submitted_to_supervisor && !team.final_submission_approved && (
                    <p style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IoAlertCircleOutline size={14} /> {t('DeliverableRequired')}
                    </p>
                  )}
                  {/* Supervisor rejection feedback — always visible when present and not approved */}
                  {team.supervisor_feedback && !team.final_submission_approved && (
                    <div style={{ marginTop: '12px', padding: '14px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>{t('SupervFeedbackLabel')}</p>
                      <p style={{ fontSize: '13px', color: '#B91C1C', fontStyle: 'italic', lineHeight: 1.6 }}>«{team.supervisor_feedback}»</p>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {!team.submitted_to_supervisor && !team.final_submission_approved && (
                    <Button
                      icon={<IoSendOutline size={16} />}
                      disabled={!isFinalUploaded}
                      onClick={async () => {
                        try {
                          await groupApi.leaderAction({ action: 'edit', submitted_to_supervisor: true });
                          updateGroup({ ...team, submitted_to_supervisor: true, supervisor_feedback: null });
                          toast.success('Projet soumis à l\'encadreur !');
                        } catch (err) {
                          toast.error('Erreur lors de la soumission');
                        }
                      }}
                    >
                      {team.supervisor_feedback ? 'Ressoumettre le Projet' : 'Soumettre pour Validation'}
                    </Button>
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

          {/* Jury & Soutenance */}
          {(team.jury || team.schedule || team.grades) && (
            <Card style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IoStarOutline size={18} color="var(--primary)" /> Soutenance & Évaluation
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {team.schedule && (
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>📅 Calendrier de Soutenance</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Date: {team.schedule.presentation_date} à {team.schedule.presentation_time}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Salle: {team.schedule.room} ({team.schedule.duration_minutes} min)</p>
                  </div>
                )}
                {team.jury && (
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>👥 Membres du Jury</p>
                    <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Président: {team.jury.president}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Examinateur 1: {team.jury.examiner1}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Examinateur 2: {team.jury.examiner2}</p>
                  </div>
                )}
                {team.grades && team.grades.final_grade && (
                  <div style={{ padding: '14px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid #10B981' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#059669', marginBottom: '8px' }}>⭐ Évaluation Finale</p>
                    <p style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginBottom: '4px' }}>{Number(team.grades.final_grade).toFixed(1)}/20</p>
                    {team.grades.grade1 && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '11px', color: '#059669', opacity: 0.8 }}>
                        <span>J1: {team.grades.grade1}</span>
                        <span>J2: {team.grades.grade2}</span>
                        <span>J3: {team.grades.grade3}</span>
                      </div>
                    )}
                    {team.grades.feedback && (
                      <p style={{ fontSize: '13px', color: '#059669', marginTop: '8px', fontStyle: 'italic' }}>«{team.grades.feedback}»</p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Members */}

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('TeamMembers')}</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{(team.members || []).length} membre{(team.members || []).length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {team.members?.map((m, i) => {
                const ri = ROLE_MAP[m.Role || m.role] || ROLE_OPTIONS[0];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: m.isMe ? 'var(--primary-subtle)' : 'var(--bg)', border: m.isMe ? '1px solid rgba(79,70,229,0.25)' : '1px solid var(--border)' }}>
                    <div
                      onClick={e => !m.isMe && setPopover({ user: { name: m.name, email: m.email }, anchor: { x: e.clientX, y: e.clientY } })}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${i * 80 + 230},65%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: '#fff', flexShrink: 0, cursor: m.isMe ? 'default' : 'pointer' }}>
                      {(m.name || m.avatar || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p
                          onClick={e => !m.isMe && setPopover({ user: { name: m.name, email: m.email }, anchor: { x: e.clientX, y: e.clientY } })}
                          style={{ fontSize: '14px', fontWeight: 600, cursor: m.isMe ? 'default' : 'pointer' }}>{m.name}</p>
                        {m.isMe && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'var(--primary)', color: '#fff', fontWeight: 600 }}>Vous</span>}
                        {(m.IsLeader || m.isChef) && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#F59E0B22', color: '#F59E0B', fontWeight: 600 }}>Chef</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                        <span>{ri.icon}</span>
                        {ri.label}
                      </div>
                    </div>
                    {!isLocked && (m.isMe || team.members.find(x => x.isMe)?.isChef) && (
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
                    {!isLocked && team.members?.find(x => x.isMe)?.isChef && !m.isMe && (
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

          {/* Bottom action row: confirm (leader) + leave */}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              {isLeader && !isLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<IoShieldCheckmarkOutline size={15} />}
                  onClick={() => setShowGroupConfirmModal(true)}
                  disabled={(team.members || []).length < 3}
                  style={{ color: '#059669', borderColor: '#10B981' }}
                >
                  {(team.members || []).length < 3
                    ? `Confirmer le groupe (${(team.members || []).length}/3 membres requis)`
                    : 'Confirmer la composition du groupe'}
                </Button>
              )}
            </div>
            <div>
              {!isLocked && (
                <Button variant="ghost" size="sm" onClick={() => setShowLeaveModal(true)} style={{ color: 'var(--danger)' }}>Quitter le groupe</Button>
              )}
            </div>
          </div>
        </>
      ) : globalLocked ? (
        /* ── Group formation closed (global deadline passed, no group) ── */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-muted)' }}>
            <IoLockClosedOutline size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Inscription aux groupes fermée</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '24px' }}>
            La période de formation des groupes est terminée. Si vous n'avez pas encore de groupe, veuillez contacter l'administration pour être affecté à un groupe.
          </p>
          <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '380px' }}>
            <IoAlertCircleOutline size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Contactez l'administration ou votre encadreur pour toute demande de rattachement à un groupe.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '8px', background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Espace Projet</h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>Créez une nouvelle équipe ou rejoignez un groupe existant pour commencer votre Projet.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px', background: 'var(--bg-card)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)', width: 'fit-content', margin: '0 auto 40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            {[{ id: 'creer', label: '✨ Créer un groupe', icon: <IoAddOutline /> }, { id: 'rejoindre', label: '🔗 Rejoindre', icon: <IoEnterOutline /> }, { id: 'repertoire', label: '👥 Répertoire', icon: <IoPeopleOutline /> }].map(tVal => (
              <button key={tVal.id} onClick={() => { 
                setActiveTab(tVal.id); 
                setCreateStep(0); 
                setError(''); 
                if(tVal.id === 'repertoire') {
                  setDirLoading(true);
                  groupApi.getStudentsStatus().then(setStudentDirectory).finally(() => setDirLoading(false));
                }
              }} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 28px', borderRadius: '12px', border: 'none', 
                  background: activeTab === tVal.id ? 'var(--primary)' : 'transparent', 
                  color: activeTab === tVal.id ? '#fff' : 'var(--text-secondary)', 
                  fontSize: '15px', fontWeight: activeTab === tVal.id ? 700 : 500, 
                  cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: activeTab === tVal.id ? '0 8px 16px rgba(79, 70, 229, 0.25)' : 'none'
                }}>
                {tVal.icon} {tVal.label}
              </button>
            ))}
          </div>

          {activeTab === 'creer' && (
            <div style={{ maxWidth: '620px', margin: '0 auto' }}>
              <StepIndicator />
              {error && <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '14px', marginBottom: '20px' }}>{error}</div>}

              {createStep === 0 && (
                <Card style={{ padding: '32px', borderRadius: '24px', border: '1px solid rgba(79, 70, 229, 0.1)', boxShadow: '0 20px 40px -20px rgba(79,70,229,0.15)', background: 'linear-gradient(145deg, var(--bg-card) 0%, var(--bg) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'var(--primary-subtle)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IoRocketOutline size={24} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em' }}>Informations du groupe</h2>
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Définissez le nom et le sujet de votre Projet.</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Input label={t('ProjectTitle') || 'Titre du projet'} value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Titre de votre Projet" icon={<IoDocumentTextOutline size={18} />} />
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Description') || 'Description du projet'}</label>
                      <textarea value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="Décrivez brièvement votre projet..." rows={3} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}></textarea>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type de projet</label>
                      <select value={projectType} onChange={e => setProjectType(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
                        <option value="" disabled>-- Choisir un type --</option>
                        <option value="Web">Web</option>
                        <option value="Mobile App">Mobile App</option>
                        <option value="Desktop App">Desktop App</option>
                        <option value="AI / ML">AI / ML</option>
                        <option value="IoT / Embedded">IoT / Embedded</option>
                        <option value="Cybersecurity">Cybersecurity</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>{t('Role')}</label>
                      <select value={creatorRole} onChange={e => setCreatorRole(e.target.value)} style={{ width: '100%', padding: '11px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
                        {availableRoles.map(r => (
                          <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                      <Button icon={<IoArrowForwardOutline size={16} />} onClick={() => { if (!projectTitle.trim() || !projectDescription.trim() || !creatorRole || !projectType) { setError('Veuillez remplir le titre, la description, le type de projet et le rôle.'); return; } setError(''); setCreateStep(1); }}>Suivant : Récapitulatif</Button>
                    </div>
                  </div>
                </Card>
              )}

              {createStep === 1 && (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <button onClick={() => setCreateStep(0)} style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><IoArrowBackOutline size={18} /></button>
                    <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Choisir un encadreur</h2>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', paddingLeft: '30px' }}>Optionnel : Vous pouvez solliciter un encadreur maintenant ou plus tard.</p>

                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <IoSearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      placeholder="Rechercher un enseignant..."
                      value={teacherSearch}
                      onChange={(e) => { setTeacherSearch(e.target.value); setTeacherPage(1); }}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', padding: '4px' }}>
                    {teachers
                      .filter(t => t.name?.toLowerCase().includes(teacherSearch.toLowerCase()) || t.full_name?.toLowerCase().includes(teacherSearch.toLowerCase()))
                      .slice((teacherPage - 1) * teachersPerPage, teacherPage * teachersPerPage)
                      .map(t => (
                        <div
                          key={t._id || t.TID}
                          onClick={() => setSelectedTeacher(t)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px',
                            cursor: 'pointer', border: '1px solid',
                            borderColor: (selectedTeacher?._id === t._id || selectedTeacher?.TID === t.TID) ? 'var(--primary)' : 'var(--border)',
                            background: (selectedTeacher?._id === t._id || selectedTeacher?.TID === t.TID) ? 'var(--primary-subtle)' : 'var(--bg)'
                          }}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                            {(t.name || t.full_name || '?').charAt(0)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600 }}>{t.name || t.full_name}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.specialty} · {t.department}</p>
                          </div>
                          {(selectedTeacher?._id === t._id || selectedTeacher?.TID === t.TID) && <IoCheckmarkCircleOutline color="var(--primary)" size={18} />}
                        </div>
                      ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button variant="ghost" onClick={() => { setSelectedTeacher(null); setCreateStep(2); }}>Passer cette étape</Button>
                    <Button onClick={() => setCreateStep(2)} disabled={!selectedTeacher}>Suivant : Confirmation</Button>
                  </div>
                </Card>
              )}



              {createStep === 2 && (
                <Card style={{ padding: '32px', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.2)', boxShadow: '0 20px 40px -20px rgba(16,185,129,0.15)', background: 'linear-gradient(145deg, var(--bg-card) 0%, rgba(16,185,129,0.03) 100%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <button onClick={() => setCreateStep(1)} style={{ width: 36, height: 36, borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background='var(--primary-subtle)'} onMouseOut={e => e.currentTarget.style.background='var(--bg)'}><IoArrowBackOutline size={18} /></button>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Récapitulatif</h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Vérifiez les informations avant de créer votre groupe.</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                    {[{ label: 'Titre du projet', value: projectTitle, icon: '📄' }, { label: 'Description', value: projectDescription, icon: '📝' }, { label: 'Type de projet', value: projectType === 'Autre' ? (customProjectType.trim() || 'Autre') : projectType, icon: '🎯' }, { label: 'Encadreur', value: findTeacher(selectedTeacher?._id || selectedTeacher?.TID)?.name || findTeacher(selectedTeacher?._id || selectedTeacher?.TID)?.full_name, icon: '👨‍🏫' }, { label: 'Votre rôle', value: `Chef & ${ROLE_MAP[creatorRole]?.label}`, icon: '⭐' }].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><span>{item.icon}</span> {item.label}</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value || '—'}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleCreate} style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '14px', boxShadow: '0 8px 20px rgba(16,185,129,0.3)', background: '#10B981' }}>✨ Confirmer et Créer le groupe</Button>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'repertoire' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }} className="animate-fade">
              <Card style={{ padding: '24px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800 }}>👥 Répertoire des Étudiants</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Consultez la liste des étudiants de votre promotion et leur statut.</p>
                  </div>
                  <div style={{ position: 'relative', width: '300px' }}>
                    <IoSearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      placeholder="Rechercher un étudiant..."
                      value={dirSearch}
                      onChange={(e) => setDirSearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                {dirLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement du répertoire...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                    {studentDirectory
                      .filter(s => s.full_name.toLowerCase().includes(dirSearch.toLowerCase()) || s.email.toLowerCase().includes(dirSearch.toLowerCase()))
                      .map((s, i) => (
                        <div key={i} style={{ 
                          padding: '16px', borderRadius: '16px', background: 'var(--bg)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', gap: '14px'
                        }}>
                          <div style={{ 
                            width: 40, height: 40, borderRadius: '12px', background: s.has_group ? 'var(--primary-subtle)' : '#DCFCE7', 
                            color: s.has_group ? 'var(--primary)' : '#16A34A', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px'
                          }}>
                            {s.full_name.charAt(0)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.full_name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.email}</p>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {s.has_group ? (
                              <Badge style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary)', border: 'none', fontSize: '10px' }}>En groupe</Badge>
                            ) : (
                              <Badge style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A', border: 'none', fontSize: '10px' }}>Disponible</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                
                {!dirLoading && studentDirectory.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Aucun étudiant trouvé.</div>
                )}
              </Card>
            </div>
          )}
          {activeTab === 'rejoindre' && (
            <div style={{ maxWidth: '520px', margin: '0 auto' }} className="animate-fade">
              <Card style={{ padding: '36px', borderRadius: '24px', border: '1px solid rgba(79, 70, 229, 0.15)', boxShadow: '0 24px 50px -12px rgba(79,70,229,0.2)', background: 'linear-gradient(145deg, var(--bg-card) 0%, var(--primary-subtle) 100%)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 10px 20px rgba(79,70,229,0.3)' }}>
                  <IoEnterOutline size={28} />
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em' }}>{t('JoinGroup')}</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>Entrez le code fourni par votre chef d'équipe pour intégrer le projet.</p>
                {error && <div style={{ padding: '14px 18px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><IoAlertCircleOutline size={20}/> {error}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Input label={t('InviteCode')} value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Ex: ABCDEFGH" icon={<IoEnterOutline size={18} />} style={{ fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>{t('Role')} souhaité</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {availableRoles.map(r => (
                        <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', border: joinRole === r.value ? '2px solid var(--primary)' : '1px solid var(--border)', background: joinRole === r.value ? 'var(--primary-subtle)' : 'var(--bg)', boxShadow: joinRole === r.value ? '0 4px 12px rgba(79,70,229,0.1)' : 'none', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
                          {joinRole === r.value && <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary)' }} />}
                          <input type="radio" name="joinRole" value={r.value} checked={joinRole === r.value} onChange={() => setJoinRole(r.value)} style={{ display: 'none' }} />
                          <span style={{ fontSize: '18px', color: joinRole === r.value ? 'var(--primary)' : 'var(--text-muted)' }}>{r.icon}</span>
                          <span style={{ fontSize: '14px', fontWeight: joinRole === r.value ? 700 : 500, color: joinRole === r.value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{r.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleJoin} disabled={!joinCode || !joinRole} style={{ padding: '16px', fontSize: '16px', borderRadius: '14px', marginTop: '8px' }}>🚀 Rejoindre l'équipe</Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* ── Confirm group modal ── */}
      <Modal isOpen={showGroupConfirmModal} onClose={() => setShowGroupConfirmModal(false)} title="Confirmer la composition du groupe" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)', border: '1.5px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IoWarningOutline size={22} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#92400E' }}>Action irréversible</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6 }}>
              En confirmant, la composition de votre groupe sera <strong>définitivement verrouillée</strong>. Plus aucun membre ne pourra rejoindre, quitter, ou être retiré. Pour toute modification ultérieure, vous devrez contacter l'administration.
            </p>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Membres actuels ({(team?.members || []).length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {(team?.members || []).map((m, i) => (
                <p key={i} style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: m.isChef ? '#F59E0B' : 'var(--text-muted)' }}>{m.isChef ? '⭐' : '•'}</span>
                  {m.name} {m.isMe && <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'var(--primary)', color: '#fff' }}>Vous</span>}
                </p>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button onClick={() => setShowGroupConfirmModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button
              onClick={handleConfirmGroup}
              disabled={isConfirming}
              style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#10B981', color: '#fff', fontWeight: 700, cursor: isConfirming ? 'wait' : 'pointer', opacity: isConfirming ? 0.7 : 1 }}
            >
              {isConfirming ? 'Confirmation...' : '🔒 Confirmer et verrouiller'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Unified Modals ── */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Quitter le groupe">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IoLogOutOutline size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Quitter le groupe ?</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            Êtes-vous sûr de vouloir quitter ce groupe ? {team?.members?.find(m => m.isMe)?.isChef && "En tant que chef, si vous êtes seul, le groupe sera supprimé."}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowLeaveModal(false)}>Annuler</Button>
            <Button style={{ flex: 1, background: 'var(--danger)' }} onClick={handleLeaveGroup} disabled={isLeaving}>
              {isLeaving ? 'Traitement...' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showKickModal} onClose={() => setShowKickModal(false)} title="Retirer un membre">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <IoWarningOutline size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Retirer {memberToKick?.name} ?</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Cette action est irréversible. Le membre devra rejoindre à nouveau avec le code d'invitation.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowKickModal(false)}>Annuler</Button>
            <Button style={{ flex: 1, background: 'var(--danger)' }} onClick={handleKickConfirm} disabled={isKicking}>
              {isKicking ? 'Retrait...' : 'Retirer le membre'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier les infos du groupe">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Titre du projet" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Description</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
          </div>
          <Input label="Technologies (ex: React, Django, PostgreSQL)" value={editTech} onChange={e => setEditTech(e.target.value)} />
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Type de projet</label>
            <select value={editType} onChange={e => setEditType(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="Web">Web</option>
              <option value="Mobile App">Mobile App</option>
              <option value="Desktop App">Desktop App</option>
              <option value="AI / ML">AI / ML</option>
              <option value="IoT / Embedded">IoT / Embedded</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Annuler</Button>
            <Button style={{ flex: 1 }} onClick={handleUpdateInfo}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
      {popover && <UserPopover user={popover.user} anchor={popover.anchor} onClose={() => setPopover(null)}/>}
    </DashboardLayout>
  );
}