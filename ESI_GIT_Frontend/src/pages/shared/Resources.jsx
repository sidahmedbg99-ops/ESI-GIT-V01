import { useState, useEffect, useCallback } from 'react';
import {
  IoLibraryOutline, IoLinkOutline, IoDocumentOutline, IoAddOutline,
  IoTrashOutline, IoPencilOutline, IoEyeOffOutline, IoEyeOutline,
  IoDownloadOutline, IoFilterOutline, IoCloseOutline, IoSearchOutline,
  IoPersonOutline, IoTimeOutline,
} from 'react-icons/io5';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import client from '../../api/client';
import { ENDPOINTS, getFileUrl } from '../../api/config';
import toast from 'react-hot-toast';

const TYPE_FILTERS  = [{ value: '', label: 'Tous' }, { value: 'file', label: 'Fichiers' }, { value: 'link', label: 'Liens' }];

export default function Resources() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const ROLE_FILTERS = [
    { value: '', label: t('AllAuthors') },
    { value: 'staff', label: t('Teachers') },
    { value: 'student', label: t('Students') },
  ];
  const isAdmin = user?.role === 'admin';

  const [resources, setResources]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [typeFilter, setTypeFilter]   = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [search, setSearch]           = useState('');

  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ title: '', description: '', category: '', linkUrl: '', file: null, useLink: false });
  const [submitting, setSubmitting]   = useState(false);

  const fetchResources = useCallback(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (roleFilter) params.set('role', roleFilter);
    const url = ENDPOINTS.resources.list + (params.toString() ? `?${params}` : '');
    setLoading(true);
    client.get(url)
      .then(res => setResources(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typeFilter, roleFilter]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Le titre est requis'); return; }
    if (!form.useLink && !form.file) { toast.error('Veuillez sélectionner un fichier ou passer en mode lien'); return; }
    if (form.useLink && !form.linkUrl.trim()) { toast.error('Veuillez saisir une URL'); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      if (form.useLink) fd.append('link_url', form.linkUrl);
      else fd.append('file', form.file);
      await client.post(ENDPOINTS.resources.create, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Ressource publiée');
      setShowForm(false);
      setForm({ title: '', description: '', category: '', linkUrl: '', file: null, useLink: false });
      fetchResources();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erreur lors de la publication');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette ressource ?')) return;
    try {
      await client.delete(ENDPOINTS.resources.detail(id));
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Supprimée');
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleToggleVisible = async (resource) => {
    try {
      const res = await client.patch(ENDPOINTS.resources.detail(resource.id), { is_visible: !resource.is_visible });
      setResources(prev => prev.map(r => r.id === resource.id ? res.data : r));
    } catch { toast.error('Erreur lors de la mise à jour'); }
  };

  // Client-side search on top of server-side type/role filter
  const displayed = resources.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            {t('Resources') || 'Ressources'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {t('ResourcesSubtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: '9px 18px', borderRadius: 10, background: showForm ? 'var(--bg)' : 'var(--primary)', color: showForm ? 'var(--text-secondary)' : '#fff',
            border: showForm ? '1px solid var(--border)' : 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13,
          }}
        >
          {showForm ? <IoCloseOutline size={16} /> : <IoAddOutline size={16} />}
          {showForm ? 'Annuler' : 'Publier une ressource'}
        </button>
      </div>

      {/* Post form (inline, collapsible) */}
      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Nouvelle ressource</h3>
          <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre *" required
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
            <textarea
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optionnel)" rows={2}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
            />
            <input
              value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              placeholder={t('CategoryOptional')}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {['Fichier', 'Lien URL'].map((mode, i) => (
                <button key={mode} type="button"
                  onClick={() => setForm(f => ({ ...f, useLink: i === 1 }))}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 8,
                    border: (form.useLink ? i === 1 : i === 0) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: (form.useLink ? i === 1 : i === 0) ? 'var(--primary-subtle)' : 'transparent',
                    color: (form.useLink ? i === 1 : i === 0) ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {i === 0 ? <IoDocumentOutline size={15}/> : <IoLinkOutline size={15}/>} {mode}
                </button>
              ))}
            </div>
            {form.useLink ? (
              <input
                value={form.linkUrl} onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                placeholder="https://…" type="url"
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
              />
            ) : (
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 8, padding: '18px 12px', textAlign: 'center', background: 'var(--bg)', position: 'relative', cursor: 'pointer' }}>
                <input type="file" onChange={e => setForm(f => ({ ...f, file: e.target.files[0] || null }))}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}/>
                <IoDownloadOutline size={22} style={{ color: 'var(--text-muted)', marginBottom: 6 }}/>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {form.file ? form.file.name : t('SelectFile')}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {form.file ? `${(form.file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, DOC, ZIP (Max 50 MB)'}
                </p>
              </div>
            )}
            <button
              type="submit" disabled={submitting}
              style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, alignSelf: 'flex-end', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Publication…' : 'Publier'}
            </button>
          </form>
        </div>
      )}

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
            <IoSearchOutline size={16}/>
          </span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par titre, description…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: '4px', borderRadius: 10, border: '1px solid var(--border)' }}>
          {TYPE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setTypeFilter(f.value)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: typeFilter === f.value ? 'var(--primary)' : 'transparent', color: typeFilter === f.value ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Role filter */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-card)', padding: '4px', borderRadius: 10, border: '1px solid var(--border)' }}>
          {ROLE_FILTERS.map(f => (
            <button key={f.value} onClick={() => setRoleFilter(f.value)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: roleFilter === f.value ? 'var(--primary)' : 'transparent', color: roleFilter === f.value ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Chargement des ressources…</p>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <IoLibraryOutline size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>
            {search || typeFilter || roleFilter ? t('NoResourcesFilter') : t('NoResourcesEmpty')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {displayed.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              onToggleVisible={handleToggleVisible}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function ResourceCard({ resource: r, isAdmin, onDelete, onToggleVisible }) {
  const { t } = useLanguage();
  const isFile = r.resource_type === 'file';
  const actionUrl = isFile && r.file_url ? getFileUrl(r.file_url) : r.link_url;
  const uploaderName = r.uploader?.name || '—';
  const uploaderIsStaff = r.uploader?.type === 'staff';
  const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
  const sizeMB = r.file_size ? `${(r.file_size / (1024 * 1024)).toFixed(2)} MB` : null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
      display: 'flex', flexDirection: 'column', height: '100%',
      opacity: r.is_visible === false ? 0.65 : 1,
      transition: 'box-shadow 0.2s',
      overflow: 'hidden',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Card body */}
      <div style={{ padding: '20px 20px 14px', flex: 1 }}>
        {/* Icon row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: isFile ? 'var(--primary-subtle)' : '#E0F2FE',
            color: isFile ? 'var(--primary)' : '#0284C7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isFile ? <IoDocumentOutline size={22}/> : <IoLinkOutline size={22}/>}
          </div>

          {/* Badges + admin actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 700,
              background: isFile ? 'var(--primary-subtle)' : '#E0F2FE',
              color: isFile ? 'var(--primary)' : '#0284C7',
            }}>
              {isFile ? 'FICHIER' : 'LIEN'}
            </span>
            {r.is_visible === false && (
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>
                {t('HiddenBadge')}
              </span>
            )}
            {r.can_edit && (
              <button
                onClick={() => onToggleVisible(r)}
                title={r.is_visible ? 'Masquer' : 'Rendre visible'}
                style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {r.is_visible ? <IoEyeOffOutline size={13}/> : <IoEyeOutline size={13}/>}
              </button>
            )}
            {r.can_delete && (
              <button
                onClick={() => onDelete(r.id)}
                title="Supprimer"
                style={{ padding: 5, borderRadius: 6, border: '1px solid var(--border)', background: '#FEF2F2', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <IoTrashOutline size={13}/>
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
          {r.title}
        </h3>

        {/* Description clamped */}
        {r.description && (
          <p style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 12,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {r.description}
          </p>
        )}

        {/* Category */}
        {r.category && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'inline-block', marginBottom: 10 }}>
            {r.category}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: uploaderIsStaff ? '#EEF2FF' : '#F0FDF4', color: uploaderIsStaff ? 'var(--primary)' : '#16A34A' }}>
              {uploaderIsStaff ? '👨‍🏫' : '🎓'}
            </span>
            {uploaderName}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IoTimeOutline size={11}/> {dateStr}
          </span>
        </div>

        {actionUrl ? (
          <a
            href={actionUrl} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '9px', borderRadius: 8, boxSizing: 'border-box',
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = isFile ? 'var(--primary)' : '#0284C7'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          >
            {isFile
              ? <><IoDownloadOutline size={15}/> {t('DownloadBtn')} {sizeMB ? `(${sizeMB})` : ''}</>
              : <><IoLinkOutline size={15}/> {t('Open')}</>
            }
          </a>
        ) : (
          <div style={{ padding: '9px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            Lien non disponible
          </div>
        )}
      </div>
    </div>
  );
}
