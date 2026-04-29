// ╔══════════════════════════════════════════════════════════════════╗
// ║  MESSAGES / CHAT                                                 ║
// ║  ⚠️  NO BACKEND ENDPOINT — STUBS ONLY                            ║
// ║  These functions exist to prevent crashes in contexts that       ║
// ║  import messagesApi. They are no-ops.                            ║
// ╚══════════════════════════════════════════════════════════════════╝

export const messagesApi = {
  getThread: async () => [],
  sendMessage: async () => null,
  markThreadRead: async () => ({ success: true }),
};
