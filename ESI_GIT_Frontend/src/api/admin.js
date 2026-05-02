import client from './client';
import { ENDPOINTS } from './config';

export const adminApi = {
  // Platform Settings
  getSettings: async () => {
    const { data } = await client.get(ENDPOINTS.admin.platformSettings);
    return data;
  },
  updateSettings: async (patch) => {
    const { data } = await client.patch(ENDPOINTS.admin.platformSettings, patch);
    return data;
  },

  // Grading Formulas
  getFormulas: async () => {
    const { data } = await client.get(ENDPOINTS.admin.gradingFormulas);
    return data;
  },
  createFormula: async (formula) => {
    const { data } = await client.post(ENDPOINTS.admin.gradingFormulas, formula);
    return data;
  },
  activateFormula: async (id) => {
    const { data } = await client.patch(ENDPOINTS.admin.activateFormula(id));
    return data;
  },
  getActiveFormula: async () => {
    const { data } = await client.get(ENDPOINTS.admin.activeFormula);
    return data;
  },

  // Specialties / Departments
  getAcademicStructure: async () => {
    const { data } = await client.get(ENDPOINTS.admin.academicStructure);
    return data;
  },
  getSpecialties: async () => {
    const { data } = await client.get(ENDPOINTS.admin.specialties);
    return data;
  },
  createSpecialty: async (specialty) => {
    const { data } = await client.post(ENDPOINTS.admin.specialties, specialty);
    return data;
  },
  updateSpecialty: async (id, patch) => {
    const { data } = await client.patch(ENDPOINTS.admin.specialtyDetail(id), patch);
    return data;
  },
  deleteSpecialty: async (id) => {
    const { data } = await client.delete(ENDPOINTS.admin.specialtyDetail(id));
    return data;
  },
};
