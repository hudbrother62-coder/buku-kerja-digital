const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const PRODUCTION_SUPABASE_URL = "https://glgpksdzregenrhfjasd.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Puv84iHF9e1WeVO9gupkNg_-7bm4VW7";

function cleanKey(value) {
  const key = String(value || "").trim();
  return key.length >= 20 && !/REPLACE_ME|YOUR[_-]?KEY/i.test(key) ? key : "";
}

function configuredKeys() {
  const aliases = [
    ["GEMINI_AUTH_KEY_1", "GEMINI_KEY_1", "GEMINI_API_KEY", "GOOGLE_API_KEY"],
    ["GEMINI_AUTH_KEY_2", "GEMINI_KEY_2"],
    ["GEMINI_AUTH_KEY_3", "GEMINI_KEY_3"],
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

async function generate(key, prompt, context) {
  const model = process.env.GEMINI_PRIMARY_MODEL || "gemini-2.5-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Anda adalah Asisten Guru Bantu Beres untuk pendidik profesional. Sapa atau panggil guru dengan nama depannya secara natural, tidak di setiap paragraf. Pahami perbedaan wali kelas, guru mata pelajaran, dan peran gabungan. Bantu menyusun administrasi, menganalisis presensi dan hasil belajar, menulis refleksi pedagogis, merancang tindak lanjut, remedial, pengayaan, komunikasi orang tua, serta agenda kerja. Utamakan analisis yang tajam, langkah yang dapat dilaksanakan, dan bahasa Indonesia yang setara dengan kompetensi guru. Gunakan data konteks bila tersedia, tetapi jangan pernah mengarang nama, nilai, kondisi, atau fakta siswa. Jika data kurang, jelaskan informasi yang dibutuhkan atau nyatakan asumsi secara singkat. Jangan gunakan markdown dekoratif, tanda bintang, pagar judul, atau code fence. Gunakan paragraf pendek dan penomoran polos hanya bila membantu. Guru selalu menjadi pemeriksa dan pengambil keputusan akhir." }] },
        contents: [{ role: "user", parts: [{ text: `Konteks ruang kerja:\n${JSON.stringify(compactContext(context))}\n\nPerintah guru:\n${String(prompt).slice(0, 8000)}` }] }],
        generationConfig: { temperature: 0.25, topP: 0.9, maxOutputTokens: 8192 },
      }), signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload?.error?.message || "Gemini belum dapat merespons."), { status: response.status });
    const reply = cleanOutput(payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n"));
    if (!reply) throw Object.assign(new Error("AI tidak menghasilkan jawaban."), { status: 502 });
    return reply;
  } finally { clearTimeout(timer); }
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Metode tidak diizinkan." });
  try {
    await verifyUser(request);
    const { prompt, context, userKey } = request.body || {};
    if (!String(prompt || "").trim()) return response.status(400).json({ error: "Tulis perintah untuk Asisten Guru." });
    const keys = [...configuredKeys(), cleanKey(userKey)].filter(Boolean);
    if (!keys.length) return response.status(503).json({ error: "API key Gemini belum tersedia. Masukkan key pribadi di Pengaturan." });
    let lastError;
    for (const key of keys) {
      try { return response.status(200).json({ reply: await generate(key, prompt, context) }); }
      catch (error) { lastError = error; if (![401, 403, 429, 500, 502, 503, 504].includes(Number(error.status))) break; }
    }
    throw lastError || new Error("Asisten Guru belum dapat merespons.");
  } catch (error) {
    const status = Number(error.status) || 500;
    const message = status >= 500 ? "Asisten Guru belum dapat merespons. Periksa konfigurasi API key lalu coba lagi." : error.message;
    return response.status(status).json({ error: message });
  }
}
