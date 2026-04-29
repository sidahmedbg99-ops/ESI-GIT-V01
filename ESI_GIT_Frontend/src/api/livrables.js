// ╔══════════════════════════════════════════════════════════════════╗
// ║  LIVRABLES (Deliverables)                                        ║
// ║  ⚠️  NO BACKEND ENDPOINT — STUBS ONLY                            ║
// ║  These functions exist to prevent crashes in contexts that       ║
// ║  import livrablesApi. They are no-ops.                           ║
// ╚══════════════════════════════════════════════════════════════════╝

export const livrablesApi = {
  getGroupLivrables: async () => [],
  submitLivrable: async () => null,
  updateLivrable: async () => null,
  deleteLivrable: async () => ({ success: true }),
};
