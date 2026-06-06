import client from './client';
import { ENDPOINTS } from './config';

export const archiveApi = {
  // GET /api/projects/projects/archived/ → role-based archived projects list
  getArchive: async () => {
    const { data } = await client.get(ENDPOINTS.archive.all);
    const list = Array.isArray(data) ? data : [];
    return list.map(p => ({
      ...p,
      tech:      (p.tech_stack || '').split(',').map(s => s.trim()).filter(Boolean),
      encadreur: p.teacher_name || p.encadreur || null,
      group:     p.invite_code  || p.group     || null,
      specialite:p.specialty?.name || p.specialty || null,
      repo:      p.github_url   || p.repo      || null,
    }));
  },

  // GET /api/projects/admin/projects/<id>/ → admin gets project detail
  getById: async (id) => {
    const { data } = await client.get(ENDPOINTS.archive.byId(id));
    return data;
  },

  // PATCH /api/projects/admin/projects/<id>/ → admin partially updates project (e.g. is_public)
  updateArchiveEntry: async (id, patch) => {
    const { data } = await client.patch(ENDPOINTS.archive.update(id), patch);
    return data;
  },

  // DELETE /api/projects/admin/projects/<id>/ → admin deletes project
  deleteArchiveEntry: async (id) => {
    await client.delete(ENDPOINTS.archive.byId(id));
  },
};
