export default function handler(_request, response) {
  const databaseConfigured = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const aiConfigured = Boolean(process.env.GEMINI_AUTH_KEY_1 || process.env.GEMINI_KEY_1 || process.env.GEMINI_API_KEY);
  response.status(databaseConfigured ? 200 : 503).json({ ok: databaseConfigured, database: databaseConfigured ? "configured" : "missing", ai: aiConfigured ? "configured" : "user-key-required" });
}
