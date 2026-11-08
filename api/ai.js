const ROOT = "https://api.groq.com/openai/v1";
const TEXT_MODELS = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant", "qwen/qwen3.8-27b", "qwen/qwen3.6-27b"];
const URL = "https://glgpksdzregenrhfjasd.supabase.co";
const PUBLISHABLE = "sb_publishable_Puv84iHF9e1WeVO9gupkNg_-7bm4VW7";
const modelCache = new Map();

function validKey(value) {
  const key = String(value || "").trim();
  return /^gsk_[A-Za-z0-9_-]{20,}$/.test(key) ? key : "";
}
function platformKeys() {
  return [...new Set([process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].map(validKey).filter(Boolean))];
}
async function requireUser(req) {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || URL).replace(/\/$/, "");
  const key = String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || PUBLISHABLE);
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw Object.assign(new Error("Silakan masuk kembali untuk menggunakan Asisten Guru."), {status:401});
  const response = await fetch(url + "/auth/v1/user", {headers:{apikey:key,Authorization:"Bearer " + token},signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw Object.assign(new Error("Sesi berakhir. Silakan masuk kembali."), {status:401});
}
async function availableModels(key) {
  const cached = modelCache.get(key);
  if (cached && cached.expires>Date.now()) return cached.models;
  const res = await fetch(ROOT + "/models",{headers:{Authorization:"Bearer " + key},signal:AbortSignal.timeout(10000)});
  if (!res.ok) throw Object.assign(new Error(res.status===429?"Kuota GroqCloud sedang dibatasi.":res.status===401||res.status===403?"API key GroqCloud ditolak. Buat key di console.groq.com/keys.":"Tidak dapat membaca daftar model GroqCloud."),{status:res.status});
  const data = await res.json();
  const active = new Set((data.data||[]).filter(x=>x.active!==false).map(x=>x.id));
  const models = TEXT_MODELS.filter(x=>active.has(x));
  if (!models.length) throw Object.assign(new Error("Key ini tidak memiliki model percakapan GroqCloud yang didukung."),{status:503});
  modelCache.set(key,{models,expires:Date.now()+300000});
  return models;
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


async function generate(key,prompt,context) {
  const models=await availableModels(key);
  let lastError;
  for (const model of models) {
    try {
      const res=await fetch(ROOT+"/chat/completions",{
        method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},
        signal:AbortSignal.timeout(55000),
        body:JSON.stringify({model,temperature:0.25,top_p:0.9,max_completion_tokens:4096,
          messages:[
            {role:"system",content:"Anda Asisten Guru Bantu Beres. Bantu administrasi, jurnal, presensi, nilai, refleksi dan tindak lanjut sekolah secara akurat dalam bahasa Indonesia. Gunakan hanya data yang diberikan, jangan mengarang informasi siswa. Guru menjadi pemeriksa akhir. Hindari markdown dekoratif."},
            {role:"user",content:"Data ruang kerja:\n"+JSON.stringify(compactContext(context)).slice(0,65000)+"\n\nPertanyaan guru:\n"+String(prompt).slice(0,8000)}
          ]})
      });
      const data=await res.json().catch(()=>({}));
      if (!res.ok) throw Object.assign(new Error(data.error?.message || "GroqCloud belum merespons."),{status:res.status});
      const reply=cleanOutput(data.choices?.[0]?.message?.content);
      if (!reply) throw Object.assign(new Error("Model belum memberikan jawaban."),{status:502});
      return {reply,model};
    } catch(err) {
      lastError=err;
      if(err.name==="TimeoutError"||err.name==="AbortError") lastError=Object.assign(new Error("Waktu respons GroqCloud habis."),{status:504});
      if (![400,404,408,429,500,502,503,504].includes(Number(lastError.status))) break;
    }
  }
  throw lastError||Object.assign(new Error("Model GroqCloud belum tersedia."),{status:503});
}
export default async function handler(request,response) {
  if(!["POST","PUT"].includes(request.method))return response.status(405).json({error:"Metode tidak diizinkan."});
  response.setHeader("Cache-Control","no-store, max-age=0");
  try {
    await requireUser(request);
    const body=request.body||{};
    const raw=String(body.userKey||"").trim();
    const personal=validKey(raw);
    if(request.method==="PUT") {
      if(!personal)return response.status(400).json({error:"Gunakan API key GroqCloud yang diawali gsk_. Key Gemini tidak berlaku."});
      const models=await availableModels(personal);
      return response.status(200).json({ok:true,provider:"groq",modelSelection:"automatic",model:models[0]});
    }
    const prompt=String(body.prompt||"").trim();
    if(!prompt)return response.status(400).json({error:"Tulis perintah untuk Asisten Guru."});
    if(raw&&!personal)return response.status(400).json({error:"Key lama bukan key GroqCloud. Ganti di Pengaturan dengan key gsk_."});
    const keys=[...new Set([...platformKeys(),personal].filter(Boolean))];
    if(!keys.length)return response.status(503).json({error:"API key GroqCloud belum tersedia. Masukkan key pribadi melalui Pengaturan."});
    let lastError;
    for(const key of keys) {
      try {return response.status(200).json(await generate(key,prompt,body.context||{}));}
      catch(err){lastError=err;if(![400,401,403,404,408,429,500,502,503,504].includes(Number(err.status)))break;}
    }
    const status=Number(lastError?.status)||503;
    return response.status(status===429?429:503).json({error:status===429?"Batas kuota GroqCloud tercapai. Coba kembali atau gunakan key lain.":lastError?.message||"Layanan GroqCloud belum tersedia."});
  }catch(err) {
    const status=Number(err.status)||503;
    return response.status([401,403,429].includes(status)?status:503).json({error:err.message||"Layanan GroqCloud belum tersedia."});
  }
}
