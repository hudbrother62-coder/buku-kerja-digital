const PRODUCTION_SUPABASE_URL = "https://glgpksdzregenrhfjasd.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Puv84iHF9e1WeVO9gupkNg_-7bm4VW7";

function cleanKey(value) {
  const key = String(value || "").trim();
  return key.length >= 20 && !/REPLACE_ME|YOUR[_-]?KEY/i.test(key) ? key : "";
}

function configuredKeys() {
  const aliases = [
    ["GROQ_API_KEY_1", "GROQ_KEY_1", "GROQ_API_KEY", "GROQ_API_KEY"],
    ["GROQ_API_KEY_2", "GROQ_KEY_2"],
    ["GROQ_API_KEY_3", "GROQ_KEY_3"],
  ];
  return [...new Set(aliases.map((group) => group.map((name) => cleanKey(process.env[name])).find(Boolean)).filter(Boolean))];
}

async function verifyUser(request) {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || PRODUCTION_SUPABASE_URL).replace(/\/$/, "");
  const key = cleanKey(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || PRODUCTION_SUPABASE_PUBLISHABLE_KEY);
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!url || !key) throw Object.assign(new Error("Database aplikasi belum dikonfigurasi."), { status: 503 });
  if (!token) throw Object.assign(new Error("Silakan masuk kembali untuk menggunakan Asisten Guru."), { status: 401 });
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Object.assign(new Error("Sesi sudah berakhir. Silakan masuk kembali."), { status: 401 });
  return response.json();
}

function cleanOutput(value) {
  return String(value || "")
    .replace(/^```(?:\w+)?\s*/i, "").replace(/\s*```$/i, "")
    .replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "").replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n").trim();
}

function compactContext(context = {}) {
  const statusCount = (context.attendance || []).reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  const gradeValues = (context.grades || []).map((row) => Number(row.point)).filter(Number.isFinite);
  const average = gradeValues.length ? Math.round(gradeValues.reduce((sum, value) => sum + value, 0) / gradeValues.length) : null;
  const studentMap = Object.fromEntries((context.students || []).map((student) => [student.id, student]));
  const attention = (context.grades || []).filter((row) => Number(row.point) < Number(row.max_point || 100) * 0.75 || String(row.comment || "").trim()).slice(0, 40).map((row) => ({ student: row.student_name || studentMap[row.student_id]?.name || "", class: row.class_name || "", subject: row.subject_name || "", task: row.assessment_title || "", point: row.point, max: row.max_point, note: row.comment || "" }));
  return {
    teacher: context.profile?.fullName || "Guru",
    role: context.profile?.role || "guru",
    school: context.profile?.schoolName || "",
    classes: context.classes || [], subjects: context.subjects || [], students: (context.students || []).slice(0, 500),
    attendanceSummary: statusCount,
    recentJournals: (context.journals || []).slice(0, 32).map(({ journal_date, topic, activity, reflection, follow_up }) => ({ journal_date, topic, activity, reflection, follow_up })),
    gradeSummary: { count: gradeValues.length, average, attention },
    weeklySchedules: (context.schedules || []).slice(0, 100),
  };
}

const GROQ_ROOT = "https://api.groq.com/openai/v1";
const GROQ_PREFERRED = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
async function availableModels(key) {
  const res = await fetch(GROQ_ROOT + "/models", { headers: { Authorization: "Bearer " + key }, signal: AbortSignal.timeout(12000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error?.message || "API key Groq ditolak."), { status: res.status });
  const ids = (data.data || []).filter(m => m.active !== false && !/guard|whisper|tts|speech|transcri|audio|embed|vision|image/i.test(m.id)).map(m => m.id);
  return [...GROQ_PREFERRED.filter(id => ids.includes(id)), ...ids.filter(id => !GROQ_PREFERRED.includes(id))];
}
async function generate(key, prompt, context) {
  const models = await availableModels(key);
  if (!models.length) throw Object.assign(new Error("Tidak ada model chat Groq yang diizinkan untuk API key ini."), { status: 403 });
  let lastError;
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 55000);
      let res;
      try {
        res = await fetch(GROQ_ROOT + "/chat/completions", {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "Anda adalah Asisten Guru Bantu Beres untuk pendidik profesional. Sapa guru dengan natural, bedakan wali kelas dan guru mapel, bantu administrasi, presensi, penilaian, refleksi, remedial dan komunikasi orang tua. Jangan mengarang data siswa. Gunakan bahasa Indonesia jelas, tanpa markdown dekoratif. Guru memeriksa hasil akhir." },
              { role: "user", content: "Konteks ruang kerja:\\n" + JSON.stringify(compactContext(context)).slice(0,65000) + "\\n\\nPerintah guru:\\n" + String(prompt).slice(0,8000) },
            ], temperature: 0.25, max_completion_tokens: 4096
          })
        });
      } finally { clearTimeout(timer); }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(payload.error?.message || "Model Groq belum merespons."), { status: res.status });
      const reply = cleanOutput(payload.choices?.[0]?.message?.content);
      if (!reply) throw Object.assign(new Error("Model Groq tidak menghasilkan teks."), { status: 502 });
      return { reply, model };
    } catch (error) {
      lastError = error;
      if (![400, 403, 404, 408, 429, 500, 502, 503, 504].includes(Number(error.status))) throw error;
      if (error.status === 429) break; // quota belongs to the current key, try another key
    }
  }
  throw lastError || new Error("Model Groq tidak tersedia.");
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Metode tidak diizinkan." });
  try {
    await verifyUser(request);
    const { prompt, context, userKey } = request.body || {};
    if (!String(prompt || "").trim()) return response.status(400).json({ error: "Tulis perintah untuk Asisten Guru." });
    const keys = [...new Set([...configuredKeys(), cleanKey(userKey).startsWith("gsk_") ? cleanKey(userKey) : ""])].filter(Boolean);
    if (!keys.length) return response.status(503).json({ error: "API key Groq belum tersedia. Masukkan key pribadi di Pengaturan." });
    let lastError;
    for (const key of keys) {
      try { return response.status(200).json(await generate(key, prompt, context)); }
      catch (error) { lastError = error; if (![400, 401, 403, 404, 408, 429, 500, 502, 503, 504].includes(Number(error.status))) break; }
    }
    throw lastError || new Error("Asisten Guru belum dapat merespons.");
  } catch (error) {
    const status = Number(error.status) || 500;
    const message = status >= 500 ? "Asisten Guru belum dapat merespons. Periksa konfigurasi API key lalu coba lagi." : error.message;
    return response.status(status).json({ error: message });
  }
}
