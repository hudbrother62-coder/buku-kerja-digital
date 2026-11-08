export default function handler(_req,res) {
  res.setHeader("Cache-Control","no-store, max-age=0");
  const db=Boolean(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"https://glgpksdzregenrhfjasd.supabase.co");
  const ai=[process.env.GROQ_API_KEY_1||process.env.GROQ_API_KEY,process.env.GROQ_API_KEY_2,process.env.GROQ_API_KEY_3].some(k=>/^gsk_[A-Za-z0-9_-]{20,}$/.test(String(k||"").trim()));
  return res.status(db?200:503).json({ok:db,database:db?"configured":"missing",ai:ai?"configured":"user-key-required",provider:"groq",aiModel:"automatic"});
}
