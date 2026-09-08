export default function handler(_request, response) {
  const databaseConfigured = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://glgpksdzregenrhfjasd.supabase.co");
  const aiConfigured = Boolean(process.env.GEMINI_AUTH_KEY_1 || process.env.GEMINI_KEY_1 || process.env.GEMINI_API_KEY);
  const configuredModel = String(process.env.GEMINI_PRIMARY_MODEL || "").trim().replace(/^models\//, "");
  const aiModel = !configuredModel || configuredModel === "gemini-2.5-flash" ? "gemini-3.6-flash" : configuredModel;
  response.status(databaseConfigured ? 200 : 503).json({ ok: databaseConfigured, database: databaseConfigured ? "configured" : "missing", ai: aiConfigured ? "configured" : "user-key-required", aiModel });
}
