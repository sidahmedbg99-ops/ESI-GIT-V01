// ╔══════════════════════════════════════════════════════════════════╗
// ║  EVALUATIONS                                                     ║
// ║  Student-facing evaluations have NO backend endpoint.            ║
// ║  Teacher jury scoring is connected to /api/teacher/jury/.        ║
// ╚══════════════════════════════════════════════════════════════════╝

import client from './client';
import { ENDPOINTS } from './config';

export const evaluationsApi = {
  // No standalone evaluation endpoint for students — return empty gracefully
  getGroupEvaluations: async () => [],

  // GET /api/teacher/jury/ → list of defenses/evaluations
  getTeacherEvaluations: async () => {
    try {
      const { data } = await client.get(ENDPOINTS.evaluations.teacherJury);
      return data;
    } catch {
      return [];
    }
  },

  // POST /api/teacher/jury/<pid>/evaluate/ → submit jury evaluation
  gradeEvaluation: async (pid, gradePayload) => {
    const { data } = await client.post(ENDPOINTS.evaluations.teacherEvaluate(pid), gradePayload);
    return data;
  },
};
