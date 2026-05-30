export const STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'inprogress',
  DONE: 'done',
  PENDING: 'pending',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  GRADED: 'graded',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

export const ROLE_OPTIONS = [
  { value: 'frontend', label: 'Dev Frontend', icon: '🎨', color: '#2EC4B6', desc: 'UI, UX, interfaces utilisateur' },
  { value: 'backend', label: 'Dev Backend', icon: '⚙️', color: '#1F3A5F', desc: 'APIs, base de données, logique métier' },
  { value: 'design', label: 'Designer', icon: '✨', color: '#4ED5C9', desc: 'UI/UX Design, maquettes' },
  { value: 'fullstack', label: 'Fullstack', icon: '📌', color: '#2D5486', desc: 'Développement complet' },
];

export const PRIORITY_COLORS = {
  high:   { bg: '#FEE2E2', color: '#DC2626', label: 'Haute' },
  medium: { bg: '#FEF9C3', color: '#CA8A04', label: 'Moyenne' },
  low:    { bg: '#DCFCE7', color: '#16A34A', label: 'Basse' },
};

export const TECH_COLORS = {
  Python:'#3B7ACF', React:'#61DAFB', 'Node.js':'#43A047', MongoDB:'#4CAF50',
  TensorFlow:'#FF6F00', FastAPI:'#009688', 'Vue.js':'#42B883', Laravel:'#FF2D20',
  MySQL:'#4479A1', Flask:'#222', spaCy:'#09A3D5', 'Scikit-learn':'#F7931E',
  Django:'#092E20', PostgreSQL:'#336791', Java:'#ED8B00', Spring:'#6DB33F',
  TypeScript:'#3178C6', Tailwind:'#38B2AC',
};
