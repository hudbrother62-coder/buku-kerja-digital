export default function handler(_request, response) {
  const databaseConfigured = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://glgpksdzregenrhfjasd.supabase.co");
  const aiConfigured = Boolean(process.env.GROQ_API_KEY_1 || process.env.GROQ_KEY_1 || process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2 || process.env.GROQ_API_KEY_3);
  response.status(databaseConfigured ? 200 : 503).json({
    ok: databaseConfigured,
    database: databaseConfigured ? "configured" : "missing",
    ai: aiConfigured ? "configured" : "user-key-required",
    aiProvider: "groq",
    aiModel: "automatic",
    aiModelSource: "/models"
  });
}
