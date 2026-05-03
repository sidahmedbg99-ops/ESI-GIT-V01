import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
  IoAddOutline, IoSearchOutline, IoPencilOutline,
  IoTrashOutline, IoPersonOutline, IoMailOutline,
  IoCheckmarkOutline, IoArrowBackOutline, IoSaveOutline,
  IoShieldOutline, IoSchoolOutline, IoPeopleOutline,
  IoEyeOutline, IoCloseOutline, IoCloudUploadOutline,
  IoDocumentTextOutline, IoCheckmarkCircleOutline, IoAlertCircleOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAdmin } from '../../context/AdminContext';
import { useLanguage } from '../../context/LanguageContext';
import client from '../../api/client';
import { ENDPOINTS } from '../../api/config';
import ConfirmModal from '../../components/ui/ConfirmModal';

const ROLE_VARIANTS = { student: 'gray', teacher: 'info', admin: 'primary' };
const SPECIALITES   = ['ISI', 'IASD', 'GL', 'SIQ', 'SIT'];
const PROMOS        = ['2022', '2023', '2024', '2025'];
const DEPARTMENTS   = ['Informatique', 'Mathématiques', 'Génie Logiciel', 'Réseaux & Sécurité'];

// ── Field helper ──────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SelectBox({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1.5px solid var(--border)', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Add/Edit form page (inline, not a modal) ──────────────────────
function UserForm({ initial, onSave, onCancel }) {
  const { t } = useLanguage();
  const isEdit = !!initial?._id;
  const ROLE_LABELS = { student: t('Students').slice(0,-1), teacher: t('Teachers').slice(0,-1), admin: 'Admin' };
  
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const [form, setForm] = useState({
    id: '', name: '', email: '', role: 'student', status: 'active',
    specialite: 'ISI', promo: '2024', department: 'Informatique',
    year: 'L3', 
    is_teacher: initial?.role === 'student' ? false : (initial?.is_teacher ?? true),
    is_admin: initial?.is_admin ?? false,
    password: isEdit ? '' : generateRandomPassword(), ...(initial || {}),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || (!isEdit && !form.id)) return;
    setSaved(true);
    setTimeout(() => { onSave(form); }, 400);
  };

  const letter = form.name?.charAt(0)?.toUpperCase() || '?';
  const avatarColor = form.role === 'teacher' ? 'var(--accent)' : form.role === 'admin' ? '#8B5CF6' : 'var(--primary)';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <button onClick={onCancel} style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <IoArrowBackOutline size={18}/>
        </button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            {isEdit ? t('EditUser') : t('AddUser')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {isEdit ? `${t('Edit')} ${initial.name}` : t('ReadyToStartSub')}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: '#fff', margin: '0 auto 12px', transition: 'background 0.2s' }}>
              {letter}
            </div>
            <p style={{ fontSize: '13px', fontWeight: 700 }}>{form.name || '—'}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{form.email || '—'}</p>
            <div style={{ marginTop: '10px' }}>
              <Badge variant={ROLE_VARIANTS[form.role] || 'gray'}>{ROLE_LABELS[form.role] || form.role}</Badge>
            </div>
          </Card>

          <Card style={{ padding: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{t('Status')}</p>
            {['active', 'pending'].map(s => (
              <div key={s} onClick={() => set('status', s)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: form.status === s ? 'var(--primary-subtle)' : 'transparent', cursor: 'pointer', marginBottom: '4px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: form.status === s ? 'var(--primary)' : 'var(--border)', flexShrink: 0 }}/>
                <span style={{ fontSize: '13px', fontWeight: form.status === s ? 700 : 400, color: form.status === s ? 'var(--primary)' : 'var(--text-secondary)' }}>
                  {s === 'active' ? t('Validated') : t('InProgress')}
                </span>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IoPersonOutline size={16} color="var(--primary)"/> {t('Identity')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="ID / Matricule (National ID)">
                  <Input value={form.id} onChange={e => set('id', e.target.value)} placeholder="Ex: 202031045..." icon={<IoShieldOutline size={14}/>} disabled={isEdit}/>
                </Field>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label={t('FullName')}>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Amira Benatia" icon={<IoPersonOutline size={14}/>}/>
                </Field>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label={t('Email')}>
                  <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="amira@esi.dz" icon={<IoMailOutline size={14}/>} type="email"/>
                </Field>
              </div>
              <Field label="Rôle Principal">
                <SelectBox value={form.role === 'student' ? 'student' : 'staff'} onChange={v => set('role', v === 'student' ? 'student' : 'teacher')} options={[
                  { value: 'student',  label: `🎓 ${t('Students').slice(0,-1)}` },
                  { value: 'staff',    label: `👔 Staff (Enseignant / Admin)` },
                ]}/>
              </Field>
              {form.role !== 'student' && (
                <div style={{ display: 'flex', gap: '16px', gridColumn: '1/-1', background: 'var(--primary-subtle)', padding: '12px', borderRadius: '10px', border: '1px solid var(--primary)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form.is_teacher} onChange={e => set('is_teacher', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Enseignant</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form.is_admin} onChange={e => set('is_admin', e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Administrateur</span>
                  </label>
                </div>
              )}
              <Field label={isEdit ? "Nouveau Password (optionnel)" : "Password"}>
                <Input type="text" value={form.password || ''} onChange={e => set('password', e.target.value)} placeholder={isEdit ? "Laisser vide pour ne pas changer" : "Default: student123"} icon={<IoShieldOutline size={14}/>}/>
              </Field>
            </div>
          </Card>

          {form.role === 'student' && (
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoSchoolOutline size={16} color="#10B981"/> {t('StudentInfo')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label={t('Specialty')}>
                  <SelectBox 
                    value={['M1', 'M2'].includes(form.year) ? form.specialite : ''} 
                    onChange={v => set('specialite', v)} 
                    options={[
                      { value: '', label: (['M1', 'M2'].includes(form.year) ? '-- Choisir --' : 'N/A (2CPI / 3CS)') },
                      ...SPECIALITES.map(s => ({ value: s, label: s }))
                    ]}
                    disabled={!['M1', 'M2'].includes(form.year)}
                  />
                </Field>
                <Field label={t('Promotion')}>
                  <SelectBox value={form.promo} onChange={v => set('promo', v)} options={PROMOS.map(p => ({ value: p, label: p }))}/>
                </Field>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label={t('Year')}>
                    <SelectBox value={form.year} onChange={v => set('year', v)} options={[
                      { value: 'L1', label: '1ère Année (1CPI)' },
                      { value: 'L2', label: '2ème Année (2CPI)' },
                      { value: 'L3', label: '3ème Année (1CS / 3CS)' },
                      { value: 'M1', label: '4ème Année (2CS / 4CS)' },
                      { value: 'M2', label: '5ème Année (3CS / 5CS)' },
                    ]}/>
                  </Field>
                </div>
              </div>
            </Card>
          )}

          {form.role === 'teacher' && (
            <Card>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoPeopleOutline size={16} color="var(--accent)"/> {t('TeacherInfo')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label={t('Department')}>
                  <SelectBox value={form.department || 'Informatique'} onChange={v => set('department', v)} options={DEPARTMENTS.map(d => ({ value: d, label: d }))}/>
                </Field>
                <Field label={t('TeachingSpecialty')}>
                  <Input value={form.specialty || ''} onChange={e => set('specialty', e.target.value)} placeholder="AI & ML"/>
                </Field>
                <Field label={t('AvailableForSupervision')}>
                  <SelectBox value={String(form.available !== false)} onChange={v => set('available', v === 'true')} options={[{ value: 'true', label: `✅ ${t('Success')}` }, { value: 'false', label: `❌ Non` }]}/>
                </Field>
              </div>
            </Card>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onCancel} icon={<IoCloseOutline size={16}/>}>{t('Cancel')}</Button>
            <Button onClick={handleSave} icon={saved ? <IoCheckmarkOutline size={16}/> : <IoSaveOutline size={16}/>}>
              {saved ? t('Success') : isEdit ? t('Save') : t('CreateTask').split(' ')[0]}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error Boundary ───────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div style={{ padding: '20px', color: 'red', background: '#fee' }}>
        <h3>Error in Component</h3>
        <pre>{this.state.error.toString()}</pre>
        <pre>{this.state.error.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

// ── View detail modal ──────────────────────────────────────────────
function UserDetailModal({ user: u, onClose, onEdit }) {
  const { t } = useLanguage();
  if (!u) return null;
  const ROLE_LABELS = { student: t('Students').slice(0,-1), teacher: t('Teachers').slice(0,-1), admin: 'Admin' };
  const avatarColor = u.role === 'teacher' ? 'var(--accent)' : u.role === 'admin' ? '#8B5CF6' : 'var(--primary)';
  
  return (
    <Modal isOpen onClose={onClose} title={t('UserDetail')}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {u.name?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{u.name}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>{u.email}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {u.role === 'student' ? (
              <Badge variant="primary">{t('Students').slice(0,-1)}</Badge>
            ) : (
              <>
                {u.is_teacher !== false && <Badge variant="accent">{t('Teachers').slice(0,-1)}</Badge>}
                {u.is_admin && <Badge variant="warning">Admin</Badge>}
              </>
            )}
            <Badge variant={u.status === 'active' ? 'success' : 'warning'}>{u.status === 'active' ? t('Validated') : t('InProgress')}</Badge>
          </div>
        </div>
      </div>
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {u.role === 'student' && [
          { label: t('Specialty'), value: u.specialite || '—' },
          { label: t('Promotion'),  value: u.promo || '—' },
          { label: t('Year'),       value: u.year || '—' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>{f.label}</p>
            <p style={{ fontSize: '14px', fontWeight: 500 }}>{f.value}</p>
          </div>
        ))}
        {u.role === 'teacher' && [
          { label: t('Department'), value: u.department || '—' },
          { label: t('Specialty'),  value: u.specialty || '—' },
          { label: t('AvailableForSupervision'),  value: u.available !== false ? t('Success') : 'Non' },
        ].map((f, i) => (
          <div key={i} style={{ padding: '10px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>{f.label}</p>
            <p style={{ fontSize: '14px', fontWeight: 500 }}>{f.value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={() => { onClose(); onEdit(u); }} icon={<IoPencilOutline size={16}/>}>{t('Edit')}</Button>
      </div>
    </Modal>
  );
}

// ── Excel Import Modal ────────────────────────────────────────────
function ExcelImportModal({ isOpen, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [userType, setUserType] = useState('student');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { 
      toast.error('Fichier CSV ou Excel uniquement (.csv, .xlsx, .xls)'); 
      return; 
    }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const endpoint = userType === 'student' ? ENDPOINTS.admin.student.upload : ENDPOINTS.admin.staff.upload;
      const { data } = await client.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult({ 
        success: true, 
        created: data.created, 
        errors: data.errors || [],
        users: data.users || [] 
      });
      if (onImported) onImported();
    } catch (e) {
      const msg = e?.response?.data?.error || 'Erreur lors de l\'import';
      setResult({ success: false, errors: [msg] });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setFile(null); setResult(null); };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="📥 Importer des utilisateurs" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[{ v: 'student', label: '🎓 Étudiants' }, { v: 'staff', label: '👨‍🏫 Enseignants / Staff' }].map(({ v, label }) => (
            <button key={v} onClick={() => { setUserType(v); reset(); }}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${userType === v ? 'var(--primary)' : 'var(--border)'}`, background: userType === v ? 'var(--primary-subtle)' : 'var(--bg)', color: userType === v ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Results with Password List */}
        {result && result.success && result.users.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
             <p style={{ fontSize: '14px', fontWeight: 700, color: '#16A34A', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <IoCheckmarkCircleOutline size={18} /> Comptes créés avec succès
             </p>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
               <thead>
                 <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                   <th style={{ padding: '8px' }}>Nom</th>
                   <th style={{ padding: '8px' }}>Email</th>
                   <th style={{ padding: '8px' }}>Mot de passe</th>
                 </tr>
               </thead>
               <tbody>
                 {result.users.map((u, i) => (
                   <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                     <td style={{ padding: '8px', fontWeight: 600 }}>{u.name}</td>
                     <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{u.email}</td>
                     <td style={{ padding: '8px' }}>
                       <code style={{ background: 'var(--primary-subtle)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{u.password}</code>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {/* Template hint */}
        {!result && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text-primary)' }}>📋 Colonnes attendues :</strong><br/>
            {userType === 'student'
              ? <code style={{ fontSize: '11px' }}>CID, email, first_name, last_name, specialty, academic_year</code>
              : <code style={{ fontSize: '11px' }}>email, first_name, last_name, is_admin (0/1), is_teacher (0/1)</code>
            }
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
               💡 Note: Un utilisateur Staff peut être à la fois Enseignant et Admin (mettre 1 dans les deux colonnes).
            </div>
          </div>
        )}

        {/* Drop zone */}
        {!result && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : file ? '#10B981' : 'var(--border)'}`, borderRadius: '14px', padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'var(--primary-subtle)' : file ? '#F0FDF4' : 'var(--bg)', transition: 'all 0.2s' }}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <>
                <IoDocumentTextOutline size={36} color="#10B981" style={{ marginBottom: '10px' }} />
                <p style={{ fontWeight: 700, color: '#10B981', fontSize: '14px' }}>{file.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB — Cliquez pour changer</p>
              </>
            ) : (
              <>
                <IoCloudUploadOutline size={40} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
                <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '6px' }}>Glissez votre fichier ici</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ou <span style={{ color: 'var(--primary)', fontWeight: 600 }}>parcourir</span> — CSV, XLSX, XLS</p>
              </>
            )}
          </div>
        )}

        {/* Results Summary & Errors */}
        {result && (
          <div style={{ borderRadius: '12px', border: `1px solid ${result.success ? '#86EFAC' : '#FECACA'}`, background: result.success ? '#F0FDF4' : '#FEF2F2', padding: '16px' }}>
            {result.success ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <IoCheckmarkCircleOutline size={22} color="#16A34A" />
                  <p style={{ fontWeight: 700, color: '#16A34A', fontSize: '15px' }}>{result.created} utilisateur(s) importé(s) !</p>
                </div>
                {result.errors.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#B45309', marginBottom: '6px' }}>⚠️ {result.errors.length} ligne(s) ignorée(s) :</p>
                    <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                      {result.errors.map((err, i) => <p key={i} style={{ fontSize: '11px', color: '#92400E', padding: '2px 0' }}>• {JSON.stringify(err)}</p>)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IoAlertCircleOutline size={22} color="#DC2626" />
                <p style={{ color: '#DC2626', fontWeight: 600, fontSize: '14px' }}>{result.errors[0]}</p>
              </div>
            )}
            <button onClick={reset} style={{ marginTop: '12px', fontSize: '13px', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↩ Importer un autre fichier</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Fermer</Button>
          {!result && (
            <Button onClick={handleUpload} disabled={!file || loading} icon={<IoCloudUploadOutline size={16}/>}>
              {loading ? 'Import en cours...' : 'Importer'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function AdminUsers() {
  const { t } = useLanguage();
  const { users, addUser, updateUser, removeUser } = useAdmin();
  const safeUsers = users || [];
  const ROLE_LABELS = { student: t('Students').slice(0,-1), teacher: t('Teachers').slice(0,-1), admin: 'Admin' };

  const [view,       setView]       = useState('list');
  const [formData,   setFormData]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [detailUser, setDetailUser] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = safeUsers.filter(u => {
    const q = search.toLowerCase();
    return (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      && (roleFilter === 'all' || u.role === roleFilter);
  });

  const toggleAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([]);
    else setSelectedIds(paginatedData.map(u => u._id));
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    setModal({
      isOpen: true,
      title: "Supprimer la sélection ?",
      message: `Êtes-vous sûr de vouloir supprimer définitivement ces ${selectedIds.length} utilisateurs ?`,
      type: "warning",
      onConfirm: async () => {
        setIsBulkDeleting(true);
        try {
          await Promise.all(selectedIds.map(id => removeUser(id)));
          toast.success(`${selectedIds.length} utilisateurs supprimés`);
          setSelectedIds([]);
        } catch (e) {
          toast.error("Erreur lors de la suppression groupée");
        } finally {
          setIsBulkDeleting(false);
          setModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const validCurrentPage = Math.min(currentPage, totalPages > 0 ? totalPages : 1);
  const paginatedData = filtered.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  const openAdd  = ()    => { setFormData(null);  setView('form'); };
  const openEdit = (row) => { setFormData(row);   setView('form'); };
  const backList = ()    => setView('list');

  const handleSave = (form) => {
    if (formData?._id) updateUser(formData._id, form);
    else addUser(form);
    setView('list');
  };

  if (view === 'form') {
    return (
      <DashboardLayout>
        <UserForm initial={formData} onSave={handleSave} onCancel={backList}/>
      </DashboardLayout>
    );
  }

  const columns = [
    {
      key: 'select',
      label: (
        <input 
          type="checkbox" 
          checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}
          onChange={toggleAll}
          style={{ cursor: 'pointer' }}
        />
      ),
      render: (_, row) => (
        <input 
          type="checkbox" 
          checked={selectedIds.includes(row._id)}
          onChange={() => toggleOne(row._id)}
          style={{ cursor: 'pointer' }}
        />
      ),
      align: 'center'
    },
    {
      key: 'name', label: t('Users'),
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: row.role === 'teacher' ? 'var(--accent)' : row.role === 'admin' ? '#8B5CF6' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {v?.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '13px' }}>{v}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {row.role === 'student' ? `${row.year || ''} · ${row.specialite || ''} · ${row.promo || ''}` : row.email}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'role',   label: 'Rôle',   render: v => <Badge variant={ROLE_VARIANTS[v] || 'gray'}>{ROLE_LABELS[v] || v}</Badge> },
    { key: 'status', label: t('Status'), render: v => <Badge variant={v === 'active' ? 'success' : 'warning'}>{v === 'active' ? t('Validated') : t('InProgress')}</Badge> },
    {
      key: '_id', label: t('Actions'),
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '5px' }}>
          {row.status === 'pending' && (
            <button onClick={() => updateUser(row._id, { status: 'active' })} style={{ padding: '5px 10px', borderRadius: '8px', background: 'var(--primary-subtle)', border: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{t('Approve')}</button>
          )}
          <button onClick={() => setDetailUser(row)} style={{ width: 30, height: 30, borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <IoEyeOutline size={14}/>
          </button>
          <button onClick={() => openEdit(row)} style={{ width: 30, height: 30, borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <IoPencilOutline size={14}/>
          </button>
          <button onClick={() => setModal({
            isOpen: true,
            title: t('Confirm'),
            message: t('ConfirmDeleteUser'),
            type: "warning",
            onConfirm: () => {
              removeUser(row._id);
              setModal(prev => ({ ...prev, isOpen: false }));
            }
          })} style={{ width: 30, height: 30, borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#DC2626' }}>
            <IoTrashOutline size={14}/>
          </button>
        </div>
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <DashboardLayout>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>{t('UserManagement')}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t('ReadyToStartSub')}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',       value: safeUsers.length,                               color: 'var(--primary)' },
          { label: t('Students'),   value: safeUsers.filter(u=>u.role==='student').length,  color: 'var(--primary)' },
          { label: t('Teachers'), value: safeUsers.filter(u=>u.role==='teacher').length,  color: 'var(--accent)' },
          { label: t('InProgress'),  value: safeUsers.filter(u=>u.status==='pending').length,color: '#F59E0B' },
        ].map((c, i) => (
          <div key={i} style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.label}</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: c.color }}>{c.value}</span>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ width: '220px' }}>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search')} icon={<IoSearchOutline size={14}/>}/>
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
              style={{ padding: '9px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1.5px solid var(--border)', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }}>
              <option value="all">{t('All')}</option>
              <option value="student">{t('Students')}</option>
              <option value="teacher">{t('Teachers')}</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button icon={<IoCloudUploadOutline size={16}/>} variant="secondary" onClick={() => setIsImportModalOpen(true)}>Importer Excel</Button>
            <Button icon={<IoAddOutline size={16}/>} onClick={openAdd}>{t('AddUser')}</Button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div style={{ padding: '12px 16px', background: 'var(--primary-subtle)', borderRadius: '12px', border: '1px solid var(--primary-border)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{selectedIds.length} sélectionnés</span>
              <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>Tout désélectionner</button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button size="sm" variant="danger" icon={<IoTrashOutline size={14}/>} onClick={handleBulkDelete} loading={isBulkDeleting}>Supprimer la sélection</Button>
            </div>
          </div>
        )}

        <Table columns={columns} data={paginatedData}/>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '0 8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {t('Displaying')} {filtered.length === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1} {t('To')} {Math.min(validCurrentPage * itemsPerPage, filtered.length)} {t('Of')} {filtered.length} {t('Users').toLowerCase()}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={validCurrentPage === 1} style={{ fontSize: '13px', padding: '6px 12px' }}>Précédent</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} style={{ width: 34, height: 34, borderRadius: '8px', border: validCurrentPage === page ? '1px solid var(--primary)' : '1px solid var(--border)', background: validCurrentPage === page ? 'var(--primary)' : 'var(--bg)', color: validCurrentPage === page ? '#fff' : 'var(--text-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}>
                {page}
              </button>
            ))}
            <Button variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={validCurrentPage === totalPages || totalPages === 0} style={{ fontSize: '13px', padding: '6px 12px' }}>Suivant</Button>
          </div>
        </div>
      </Card>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <ErrorBoundary>
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} onEdit={openEdit}/>
      </ErrorBoundary>

      <ExcelImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImported={() => window.location.reload()} />

      <ConfirmModal 
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.onConfirm}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        loading={isBulkDeleting}
      />
    </DashboardLayout>
    </ErrorBoundary>
  );
}
