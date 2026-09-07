import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarCheck2,
  Check,
  ChevronDown,
  Clock3,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Phone,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import "./styles.css";

const TEMPLATE_URL = "/templates/Bantu_Beres_Template_Import.xlsx";
const SESSION_KEY = "bb_buku_kerja_session";
const ACCOUNTS_KEY = "bb_buku_kerja_accounts";
const DATA_KEY = "bb_buku_kerja_data";
const API_KEY = "bb_buku_kerja_gemini_key";
const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
if (typeof document !== "undefined") document.documentElement.dataset.theme = window.localStorage.getItem("bb_dark") === "1" ? "dark" : "light";

const NAV_ITEMS = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "assistant", label: "Asisten Guru", icon: Sparkles },
  { id: "master", label: "Master Data", icon: Users },
  { id: "attendance", label: "Presensi", icon: CalendarCheck2 },
  { id: "journal", label: "Jurnal", icon: BookOpen },
  { id: "grades", label: "Penilaian", icon: ClipboardList },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "reports", label: "Rekap & laporan", icon: BarChart3 },
];

const emptyData = () => ({
  profile: { fullName: "", schoolName: "", role: "wali_kelas", preferences: {}, setupComplete: false },
  school: null,
  academicYears: [],
  classes: [],
  subjects: [],
  students: [],
  attendance: [],
  journals: [],
  grades: [],
  assignments: [],
  schedules: [],
});

const previewData = () => ({
  profile: { fullName: "Rina Wulandari", schoolName: "SMP Negeri 1", role: "wali_kelas", setupComplete: true },
  school: { id: "school-preview", name: "SMP Negeri 1" },
  academicYears: [{ id: "year-preview", label: "2026/2027", semester: "ganjil", active: true }],
  classes: [{ id: "class-7a", name: "7A", active: true }],
  subjects: [{ id: "subject-math", name: "Matematika" }],
  students: Array.from({ length: 32 }, (_, index) => ({ id: `student-${index + 1}`, full_name: ["Alya Putri", "Bagas Pratama", "Citra Lestari", "Dimas Saputra"][index % 4] + ` ${index + 1}`, nisn: `0098765${String(index + 1).padStart(3, "0")}`, gender: index % 2 ? "L" : "P", class_id: "class-7a", class_name: "7A", active: true })),
  attendance: Array.from({ length: 30 }, (_, index) => ({ id: `attendance-${index}`, student_id: `student-${index + 1}`, class_id: "class-7a", attendance_date: today(), status: index === 28 ? "I" : index === 29 ? "S" : "H" })),
  journals: Array.from({ length: 6 }, (_, index) => ({ id: `journal-${index}`, journal_date: today(), class_id: "class-7a", subject_id: "subject-math", topic: ["Pecahan dan perbandingan", "Persamaan linear", "Bangun ruang"][index % 3], activity: "Diskusi kelompok dan latihan terarah", reflection: "Sebagian besar siswa memahami materi.", status: "complete" })),
  grades: Array.from({ length: 32 }, (_, index) => ({ id: `grade-${index}`, student_id: `student-${index + 1}`, student_name: `Siswa ${index + 1}`, class_name: "7A", subject_name: "Matematika", assessment_title: "Asesmen Harian", assessment_date: today(), point: 72 + (index % 24), max_point: 100 })),
  assignments: [{ id: "assignment-preview", class_id: "class-7a", subject_id: "subject-math", mode: "wali_kelas", is_homeroom: true }],
  schedules: [{ id: "schedule-preview", class_id: "class-7a", subject_id: "subject-math", day_of_week: 1, start_time: "07:00", end_time: "08:20", note: "Pembelajaran rutin", active: true }],
});

function id(prefix) {
  if (globalThis.crypto?.randomUUID) return prefix + "-" + globalThis.crypto.randomUUID();
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function readJson(key, fallback = null) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function accountKey(user) {
  return DATA_KEY + ":" + encodeURIComponent(user.id || user.email || "user");
}

function roleLabel(role) {
  if (role === "guru_mapel") return "Guru mata pelajaran";
  if (role === "gabungan") return "Wali kelas & guru mapel";
  return "Wali kelas";
}

function academicYearOptions() {
  const now = new Date();
  const base = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [-1, 0, 1, 2].map((offset) => `${base + offset}/${base + offset + 1}`);
}

function ageFromBirthDate(value) {
  if (!value) return "-";
  const birth = new Date(value); const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return Number.isFinite(age) ? `${age} tahun` : "-";
}

function avatarName(name) {
  return text(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase() || "GB";
}

function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.toLowerCase().trim().replace(/\s+/g, "_"),
      value,
    ]),
  );
}

function isExampleRow(row) {
  return Object.values(row).some((value) => text(value).toUpperCase().includes("CONTOH"));
}

async function readWorkbookRows(file, preferredSheet) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.Sheets[preferredSheet] ? preferredSheet : workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false }).map(normalizeRow);
}

async function readWorkbook(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return Object.fromEntries(workbook.SheetNames.map((name) => [name, XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "", raw: false }).map(normalizeRow)]));
}

async function saveRowsAsCsv(filename, rows) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Logo() {
  return (
    <div className="brand-lockup" aria-label="Bantu Beres Buku Kerja Digital">
      <img src="/brand/bantu-beres-symbol.png" alt="" className="brand-symbol-img" />
      <span className="brand-copy"><strong>Bantu<span>Beres</span></strong><small>BUKU KERJA DIGITAL</small></span>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const visualPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("preview") === "dashboard";

  useEffect(() => {
    if (visualPreview) {
      setAuth({ mode: "preview", user: { id: "preview-teacher", email: "guru@sekolah.id", user_metadata: { full_name: "Rina Wulandari", school_name: "SMP Negeri 1", role: "wali_kelas" } } });
      setAuthReady(true);
      return undefined;
    }
    if (!supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuth(data.session ? { mode: "supabase", user: data.session.user, accessToken: data.session.access_token } : null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session ? { mode: "supabase", user: session.user, accessToken: session.access_token } : null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [visualPreview]);

  if (!authReady) return <LoadingScreen />;
  if (!auth) return <AuthScreen onAuth={setAuth} configurationPending={!isSupabaseConfigured} />;
  return <Workspace auth={auth} onLogout={() => setAuth(null)} />;
}

function LoadingScreen() { return <div className="loading-screen"><Logo /><span className="boot-line"></span><p>Menyiapkan ruang kerja guru…</p></div>; }

function authErrorMessage(error) {
  const message = String(error?.message || "");
  if (/email rate limit exceeded/i.test(message)) return "Pendaftaran sedang terlalu ramai. Tunggu beberapa menit lalu coba kembali.";
  if (/email not confirmed/i.test(message)) return "Akun belum aktif. Silakan hubungi pengelola aplikasi.";
  if (/invalid login credentials/i.test(message)) return "Email atau kata sandi tidak cocok. Periksa kembali data masukmu.";
  if (/already registered|already exists|user_already_exists/i.test(message)) return "Email ini sudah terdaftar. Pilih Masuk dan gunakan akun yang sudah ada.";
  if (/terlalu banyak percobaan|too many requests/i.test(message)) return "Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat lalu coba kembali.";
  if (/password should be at least|kata sandi minimal/i.test(message)) return "Kata sandi minimal 8 karakter.";
  return message || "Terjadi kesalahan. Coba lagi.";
}

function AuthScreen({ onAuth, configurationPending = false }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!form.email || !form.password || (mode === "register" && !form.name)) {
      setNotice({ type: "error", message: "Lengkapi data yang wajib diisi terlebih dahulu." });
      return;
    }
    if (mode === "register" && form.password.length < 8) {
      setNotice({ type: "error", message: "Kata sandi minimal 8 karakter." });
      return;
    }
    if (mode === "register" && form.password !== form.confirmPassword) {
      setNotice({ type: "error", message: "Kata sandi yang diulangi belum sama." });
      return;
    }
    setBusy(true);
    try {
      if (!supabase || configurationPending) throw new Error("Database khusus Buku Kerja Digital belum dapat dibuat karena batas project Supabase akun saat ini. Tidak ada data yang diarahkan ke project lain.");
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        onAuth({ mode: "supabase", user: data.user, accessToken: data.session?.access_token });
      } else {
        const { error: registerError } = await supabase.functions.invoke("register-teacher", {
          body: { name: form.name.trim(), email: form.email.trim(), password: form.password },
        });
        if (registerError) {
          let detail = registerError.message;
          try {
            const body = await registerError.context?.json();
            detail = body?.error || detail;
          } catch {
            // Keep the original function error when no JSON body is available.
          }
          throw new Error(detail);
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        onAuth({ mode: "supabase", user: data.user, accessToken: data.session?.access_token });
      }
    } catch (error) {
      setNotice({ type: "error", message: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-ambient ambient-one"></div><div className="auth-ambient ambient-two"></div>
      <section className="auth-story">
        <Logo />
        <div className="auth-preview-card"><div className="preview-top"><span className="preview-logo"><img src="/brand/bantu-beres-symbol.png" alt="" /></span><span>Hari ini</span></div><strong>Apa yang ingin dibereskan?</strong><div className="preview-command"><Sparkles size={16}/><span>Ringkas jurnal dan siapkan tindak lanjut…</span></div><div className="preview-metrics"><span><b>32</b>Siswa</span><span><b>94%</b>Hadir</span><span><b>6</b>Jurnal</span></div></div>
        <div className="auth-story-copy"><p className="eyebrow"><span></span>RUANG KERJA KHUSUS GURU</p><h1>Catatan kelas rapi.<br/><span>Mengajar jadi lebih fokus.</span></h1><p>Siswa, presensi, jurnal, nilai, dan bantuan AI hadir dalam satu ruang kerja yang tenang dan mudah dipakai.</p></div>
        <div className="auth-trust"><span><ShieldCheck size={16}/> Data per akun</span><span><FileSpreadsheet size={16}/> Import Excel</span><span><Sparkles size={16}/> Asisten AI</span></div>
      </section>
      <section className="auth-panel"><div className="auth-mobile-brand"><Logo /></div><div className="auth-card">
        <div className="auth-heading"><p className="eyebrow">{mode === "login" ? "SELAMAT DATANG KEMBALI" : "MULAI RUANG KERJA"}</p><h1>{mode === "login" ? "Masuk ke Bantu Beres" : "Buat akun guru"}</h1><p>{mode === "login" ? "Lanjutkan pekerjaan kelasmu dari tempat terakhir." : "Siapkan ruang kerja pribadi untuk kelas dan mata pelajaranmu."}</p></div>
        {configurationPending && <div className="setup-notice"><ShieldCheck size={18}/><span><strong>Database khusus sedang menunggu slot</strong><small>Login akan aktif setelah project Supabase baru tersedia. Data tidak memakai database aplikasi lain.</small></span></div>}
        {notice && <div className={"form-notice " + notice.type} role="status"><span>{notice.message}</span></div>}
        <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(null); }}>Masuk</button><button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setNotice(null); }}>Daftar</button></div>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <Field label="Nama lengkap" value={form.name} onChange={(value) => update("name", value)} placeholder="Contoh: Rina Wulandari" />}
          <Field label="Email" value={form.email} onChange={(value) => update("email", value)} placeholder="nama@sekolah.sch.id" type="email" />
          <label className="field"><span>Kata sandi</span><div className="password-field"><input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Minimal 8 karakter" minLength={mode === "register" ? 8 : 6}/><button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
          {mode === "register" && <label className="field"><span>Ulangi kata sandi</span><input type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} placeholder="Ketik ulang kata sandi" minLength={8}/></label>}
          <button className="primary-button wide" disabled={busy}>{busy ? "Memproses…" : mode === "login" ? "Masuk ke ruang kerja" : "Buat akun"}<ArrowRight size={17} /></button>
        </form>
        <p className="auth-footnote">Dengan melanjutkan, kamu tetap menjadi pemeriksa akhir untuk semua catatan, nilai, dan rekomendasi AI.</p>
      </div></section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

async function fetchRemoteData(user) {
  const data = emptyData();
  const metadata = user.user_metadata || {};
  const profileResult = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  const profile = profileResult.data || {};
  data.profile = { fullName: profile.full_name || metadata.full_name || user.email || "Guru", schoolName: metadata.school_name || "", role: profile.role || metadata.role || "wali_kelas", preferences: profile.preferences || {}, setupComplete: false };
  const schoolResult = await supabase.from("schools").select("*").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1);
  if (schoolResult.error) throw schoolResult.error;
  const school = schoolResult.data?.[0] || null;
  if (!school) return data;
  data.school = school;
  data.profile.schoolName = school.name;
  data.profile.setupComplete = true;
  const results = await Promise.all([
    supabase.from("academic_years").select("*").eq("school_id", school.id).order("active", { ascending: false }),
    supabase.from("classes").select("*").eq("school_id", school.id).order("name"),
    supabase.from("subjects").select("*").eq("school_id", school.id).order("name"),
    supabase.from("students").select("*").eq("school_id", school.id).order("full_name"),
    supabase.from("enrollments").select("*").eq("school_id", school.id).eq("active", true),
    supabase.from("attendance_records").select("*").eq("school_id", school.id).order("attendance_date", { ascending: false }).limit(1000),
    supabase.from("teaching_journals").select("*").eq("school_id", school.id).order("journal_date", { ascending: false }).limit(300),
    supabase.from("assessments").select("*").eq("school_id", school.id).order("assessment_date", { ascending: false }).limit(300),
    supabase.from("assessment_scores").select("*").limit(2000),
    supabase.from("teacher_assignments").select("*").eq("school_id", school.id).eq("user_id", user.id),
    supabase.from("teacher_schedules").select("*").eq("school_id", school.id).eq("user_id", user.id).order("day_of_week").order("start_time"),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  const [years, classes, subjects, students, enrollments, attendance, journals, assessments, scores, assignments, schedules] = results.map((result) => result.data || []);
  data.academicYears = years;
  data.classes = classes;
  data.subjects = subjects;
  const enrollmentByStudent = Object.fromEntries(enrollments.map((item) => [item.student_id, item]));
  data.students = students.map((student) => {
    const enrollment = enrollmentByStudent[student.id];
    const classRow = classes.find((item) => item.id === enrollment?.class_id);
    return { ...student, class_id: enrollment?.class_id || null, class_name: classRow?.name || "" };
  });
  data.attendance = attendance;
  data.journals = journals;
  data.assignments = assignments;
  data.schedules = schedules;
  const assessmentMap = Object.fromEntries(assessments.map((item) => [item.id, item]));
  data.grades = scores.map((score) => {
    const assessment = assessmentMap[score.assessment_id] || {};
    const student = data.students.find((item) => item.id === score.student_id);
    const classRow = classes.find((item) => item.id === assessment.class_id);
    const subject = subjects.find((item) => item.id === assessment.subject_id);
    return { id: score.id, student_id: score.student_id, student_name: student?.full_name || "", student_nisn: student?.nisn || "", class_name: classRow?.name || "", subject_name: subject?.name || "", assessment_title: assessment.title || "", assessment_category: assessment.category || "", assessment_date: assessment.assessment_date || "", point: score.point, max_point: assessment.max_point || 100, comment: score.comment || "" };
  });
  return data;
}

async function createWorkspace(form, auth) {
  if (auth.mode === "preview") {
    const data = emptyData();
    data.profile = { fullName: form.fullName, schoolName: form.schoolName, role: form.role, setupComplete: true };
    data.classes = [{ id: id("class"), name: form.className, grade_level: form.className.replace(/[^0-9]/g, ""), active: true }];
    data.subjects = form.subjectName ? [{ id: id("subject"), name: form.subjectName }] : [];
    writeJson(accountKey(auth.user), data);
    return data;
  }
  const metadataResult = await supabase.auth.updateUser({ data: { full_name: form.fullName, school_name: form.schoolName, role: form.role } });
  if (metadataResult.error) throw metadataResult.error;
  const profileResult = await supabase.from("profiles").upsert({ id: auth.user.id, full_name: form.fullName, role: form.role, preferences: { dashboard_focus: "overview" } }, { onConflict: "id" });
  if (profileResult.error) throw profileResult.error;
  const schoolResult = await supabase.from("schools").insert({ owner_id: auth.user.id, name: form.schoolName, teacher_name: form.fullName }).select().single();
  if (schoolResult.error) throw schoolResult.error;
  const yearResult = await supabase.from("academic_years").insert({ school_id: schoolResult.data.id, label: form.academicYear, semester: "ganjil", active: true }).select().single();
  if (yearResult.error) throw yearResult.error;
  const classResult = await supabase.from("classes").insert({ school_id: schoolResult.data.id, academic_year_id: yearResult.data.id, name: form.className, grade_level: form.className.replace(/[^0-9]/g, ""), active: true }).select().single();
  if (classResult.error) throw classResult.error;
  let subject = null;
  if (form.subjectName) {
    const subjectResult = await supabase.from("subjects").insert({ school_id: schoolResult.data.id, name: form.subjectName }).select().single();
    if (subjectResult.error) throw subjectResult.error;
    subject = subjectResult.data;
  }
  const assignmentResult = await supabase.from("teacher_assignments").insert({ school_id: schoolResult.data.id, user_id: auth.user.id, class_id: classResult.data.id, subject_id: subject?.id || null, mode: form.role, is_homeroom: form.role !== "guru_mapel" });
  if (assignmentResult.error) throw assignmentResult.error;
  return fetchRemoteData(auth.user);
}

function SetupScreen({ auth, onComplete }) {
  const metadata = auth.user.user_metadata || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const years = academicYearOptions();
  const [form, setForm] = useState({ fullName: metadata.full_name || "", schoolName: metadata.school_name || "", role: metadata.role || "wali_kelas", className: "7A", subjectName: metadata.role === "guru_mapel" ? "Matematika" : "", academicYear: years[1] });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.fullName || !form.schoolName || !form.className) return setError("Nama, sekolah, dan kelas wajib diisi.");
    if (form.role !== "wali_kelas" && !form.subjectName) return setError("Mata pelajaran wajib diisi untuk mode guru mapel atau gabungan.");
    setBusy(true);
    try { onComplete(await createWorkspace(form, auth)); } catch (err) { setError(err.message || "Ruang kerja belum dapat dibuat."); } finally { setBusy(false); }
  };
  return <div className="setup-screen"><div className="setup-card"><Logo /><div className="auth-heading"><p className="eyebrow">LANGKAH PERTAMA</p><h1>Siapkan ruang kerjamu</h1><p>Pilih mode kerja utama. Mode ini tetap bisa diubah nanti dan setiap kelas akan memiliki data sendiri.</p></div>{error && <div className="form-notice error">{error}</div>}<form onSubmit={submit} className="setup-form"><Field label="Nama lengkap" value={form.fullName} onChange={(value) => update("fullName", value)} placeholder="Nama guru" /><Field label="Nama sekolah" value={form.schoolName} onChange={(value) => update("schoolName", value)} placeholder="Nama sekolah" /><div className="two-fields"><label className="field"><span>Mode kerja</span><select value={form.role} onChange={(event) => update("role", event.target.value)}><option value="wali_kelas">Wali kelas</option><option value="guru_mapel">Guru mata pelajaran</option><option value="gabungan">Wali kelas + guru mapel</option></select></label><label className="field"><span>Tahun ajaran</span><select value={form.academicYear} onChange={(event) => update("academicYear", event.target.value)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div><div className="two-fields"><Field label="Kelas pertama" value={form.className} onChange={(value) => update("className", value)} placeholder="7A" /><Field label={form.role === "wali_kelas" ? "Mata pelajaran (opsional)" : "Mata pelajaran"} value={form.subjectName} onChange={(value) => update("subjectName", value)} placeholder="Matematika" /></div><button className="primary-button wide" disabled={busy}>{busy ? "Menyiapkan…" : "Masuk ke ruang kerja"}<ArrowRight size={17} /></button></form></div></div>;
}

function Workspace({ auth, onLogout }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("dashboard");
  const [dark, setDark] = useState(() => window.localStorage.getItem("bb_dark") === "1");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState(null);

  const refresh = async (blocking = false) => {
    if (blocking) setLoading(true);
    try {
      const next = auth.mode === "preview" ? previewData() : await fetchRemoteData(auth.user);
      setData(next);
      setError("");
      return next;
    } catch (err) {
      setError(err.message || "Data belum dapat dibaca.");
      throw err;
    } finally { if (blocking) setLoading(false); }
  };

  useEffect(() => { refresh(true).catch(() => {}); }, [auth]);
  useEffect(() => { window.localStorage.setItem("bb_dark", dark ? "1" : "0"); document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);

  const completeSetup = (next) => { setData(next); setError(""); };
  const commit = (next) => { setData(next); if (auth.mode === "preview") writeJson(accountKey(auth.user), next); };
  const notify = (type, message) => { setNotice({ type, message }); window.setTimeout(() => setNotice(null), 4500); };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.localStorage.removeItem(SESSION_KEY);
    onLogout();
  };

  if (loading) return <LoadingScreen />;
  if (!data.profile.setupComplete) return <SetupScreen auth={auth} onComplete={completeSetup} />;

  const handlers = {
    saveClass: async (draft, classId = null) => {
      try {
        if (auth.mode === "preview") {
          const row = { id: classId || id("class"), name: draft.name, grade_level: draft.grade_level, active: draft.active !== false };
          commit({ ...data, classes: classId ? data.classes.map((item) => item.id === classId ? { ...item, ...row } : item) : [...data.classes, row] });
        } else {
          const payload = { school_id: data.school.id, academic_year_id: data.academicYears[0]?.id, name: draft.name, grade_level: draft.grade_level || text(draft.name).replace(/[^0-9]/g, ""), active: draft.active !== false };
          const result = classId ? await supabase.from("classes").update(payload).eq("id", classId) : await supabase.from("classes").insert(payload);
          if (result.error) throw result.error; await refresh();
        }
        notify("success", classId ? "Kelas berhasil diperbarui." : "Kelas berhasil ditambahkan.");
      } catch (err) { notify("error", err.message || "Kelas belum tersimpan."); throw err; }
    },
    saveSubject: async (draft, subjectId = null) => {
      try {
        if (auth.mode === "preview") { const row = { id: subjectId || id("subject"), name: draft.name, code: draft.code || "" }; commit({ ...data, subjects: subjectId ? data.subjects.map((item) => item.id === subjectId ? row : item) : [...data.subjects, row] }); }
        else { const payload = { school_id: data.school.id, name: draft.name, code: draft.code || null }; const result = subjectId ? await supabase.from("subjects").update(payload).eq("id", subjectId) : await supabase.from("subjects").insert(payload); if (result.error) throw result.error; await refresh(); }
        notify("success", subjectId ? "Mata pelajaran diperbarui." : "Mata pelajaran ditambahkan.");
      } catch (err) { notify("error", err.message || "Mata pelajaran belum tersimpan."); throw err; }
    },
    saveStudent: async (draft, studentId = null) => {
      try {
        if (auth.mode === "preview") {
          const classRow = data.classes.find((item) => item.id === draft.class_id);
          const row = { ...draft, id: studentId || id("student"), class_name: classRow?.name || "", active: draft.active !== false };
          commit({ ...data, students: studentId ? data.students.map((item) => item.id === studentId ? { ...item, ...row } : item) : [...data.students, row] });
        } else {
          const payload = { school_id: data.school.id, full_name: draft.full_name, nickname: draft.nickname || null, nis: draft.nis || null, nisn: draft.nisn || null, gender: draft.gender || null, birth_date: draft.birth_date || null, address: draft.address || null, phone: draft.phone || null, parent_phone: draft.parent_phone || null, active: draft.active !== false };
          const result = studentId ? await supabase.from("students").update(payload).eq("id", studentId).select().single() : await supabase.from("students").insert(payload).select().single();
          if (result.error) throw result.error;
          const sid = studentId || result.data.id; const year = data.academicYears[0];
          if (draft.class_id && year) {
            const deactivate = await supabase.from("enrollments").update({ active: false }).eq("school_id", data.school.id).eq("student_id", sid); if (deactivate.error) throw deactivate.error;
            const enrollment = await supabase.from("enrollments").upsert({ school_id: data.school.id, class_id: draft.class_id, student_id: sid, academic_year_id: year.id, active: true }, { onConflict: "class_id,student_id,academic_year_id" }); if (enrollment.error) throw enrollment.error;
          }
          await refresh();
        }
        notify("success", studentId ? "Data siswa berhasil diperbarui." : "Data siswa berhasil ditambahkan.");
      } catch (err) { notify("error", err.message || "Data siswa belum tersimpan."); throw err; }
    },
    importMaster: async (file) => {
      try {
        const sheets = await readWorkbook(file); const classRows = sheets.MASTER_KELAS || []; const studentRows = sheets.MASTER_SISWA || sheets.TEMPLATE_SISWA || []; let added = 0; let skipped = 0;
        if (auth.mode === "preview") { notify("success", `Template terbaca: ${classRows.length} kelas dan ${studentRows.length} siswa.`); return; }
        const year = data.academicYears[0]; const knownClasses = [...data.classes];
        for (const raw of classRows) { const row = normalizeRow(raw); const name = text(row.class_name || row.name); if (!name || isExampleRow(row)) { skipped += 1; continue; } let classRow = knownClasses.find((item) => text(item.name).toLowerCase() === name.toLowerCase()); if (!classRow) { const created = await supabase.from("classes").insert({ school_id: data.school.id, academic_year_id: year.id, name, grade_level: text(row.grade_level) || name.replace(/[^0-9]/g, ""), active: text(row.active).toLowerCase() !== "false" }).select().single(); if (created.error) throw created.error; classRow = created.data; knownClasses.push(classRow); added += 1; } }
        const knownStudents = new Set(data.students.map((student) => text(student.nisn || student.full_name).toLowerCase()));
        for (const raw of studentRows) { const row = normalizeRow(raw); const fullName = text(row.full_name); const className = text(row.class_name || row.kelas); const key = text(row.nisn || fullName).toLowerCase(); if (!fullName || !className || isExampleRow(row) || knownStudents.has(key)) { skipped += 1; continue; } const classRow = knownClasses.find((item) => text(item.name).toLowerCase() === className.toLowerCase()); if (!classRow) { skipped += 1; continue; } const created = await supabase.from("students").insert({ school_id: data.school.id, full_name: fullName, nickname: text(row.nickname) || null, nis: text(row.nis) || null, nisn: text(row.nisn) || null, gender: text(row.gender) || null, birth_date: text(row.birth_date) || null, address: text(row.address) || null, phone: text(row.phone) || null, parent_phone: text(row.parent_phone) || null, active: text(row.active).toLowerCase() !== "false" }).select().single(); if (created.error) throw created.error; const enrollment = await supabase.from("enrollments").insert({ school_id: data.school.id, class_id: classRow.id, student_id: created.data.id, academic_year_id: year.id, active: true }); if (enrollment.error) throw enrollment.error; knownStudents.add(key); added += 1; }
        await refresh(); notify("success", `Import Master Data selesai: ${added} data masuk, ${skipped} dilewati.`);
      } catch (err) { notify("error", err.message || "Template Master Data belum dapat dibaca."); }
    },
    saveAttendance: async (session, statuses, notes) => {
      const { date, classId, subjectId, sessionType, startTime, endTime } = session;
      const classRow = data.classes.find((item) => item.id === classId) || data.classes[0];
      const className = text(classRow?.name).toLowerCase();
      const roster = data.students.filter((student) => !classRow || student.class_id === classRow.id || text(student.class_name).toLowerCase() === className || (data.classes.length === 1 && !student.class_id && !student.class_name));
      try {
        if (auth.mode === "preview") {
          const kept = data.attendance.filter((item) => !(item.attendance_date === date && item.class_id === classRow?.id && item.session_type === sessionType));
          const records = roster.map((student) => ({ id: id("attendance"), student_id: student.id, class_id: classRow?.id, subject_id: sessionType === "subject" ? subjectId : null, attendance_date: date, session_type: sessionType, start_time: startTime || null, end_time: endTime || null, status: statuses[student.id] || "H", note: notes[student.id] || "" }));
          commit({ ...data, attendance: [...kept, ...records] });
        } else {
          let removal = supabase.from("attendance_records").delete().eq("school_id", data.school.id).eq("class_id", classRow.id).eq("attendance_date", date).eq("recorded_by", auth.user.id).eq("session_type", sessionType);
          removal = sessionType === "subject" ? removal.eq("subject_id", subjectId).eq("start_time", startTime).eq("end_time", endTime) : removal.is("subject_id", null);
          const removed = await removal; if (removed.error) throw removed.error;
          const payload = roster.map((student) => ({ school_id: data.school.id, class_id: classRow.id, subject_id: sessionType === "subject" ? subjectId : null, student_id: student.id, recorded_by: auth.user.id, attendance_date: date, session_type: sessionType, start_time: sessionType === "subject" ? startTime : null, end_time: sessionType === "subject" ? endTime : null, status: statuses[student.id] || "H", note: notes[student.id] || null }));
          const result = await supabase.from("attendance_records").insert(payload); if (result.error) throw result.error; await refresh();
        }
        notify("success", "Presensi " + date + " berhasil disimpan.");
      } catch (err) { notify("error", err.message || "Presensi belum tersimpan."); }
    },
    importAttendance: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "PRESENSI");
        const uniqueRows = new Map(); let skipped = 0;
        for (const raw of rows) {
          const row = normalizeRow(raw);
          const date = text(row.date || row.attendance_date); const className = text(row.class_name); const sessionType = text(row.session_type || "homeroom").toLowerCase(); const status = text(row.status).toUpperCase();
          const classRow = data.classes.find((item) => text(item.name).toLowerCase() === className.toLowerCase());
          const student = data.students.find((item) => (text(row.student_nisn) && text(item.nisn) === text(row.student_nisn)) || text(item.full_name).toLowerCase() === text(row.student_name).toLowerCase());
          const subject = sessionType === "subject" ? data.subjects.find((item) => text(item.name).toLowerCase() === text(row.subject_name).toLowerCase()) : null;
          const startTime = sessionType === "subject" ? text(row.start_time).slice(0, 5) : ""; const endTime = sessionType === "subject" ? text(row.end_time).slice(0, 5) : "";
          if (isExampleRow(row) || !date || !classRow || !student || !["H", "S", "I", "A"].includes(status) || !["homeroom", "subject"].includes(sessionType) || (sessionType === "subject" && (!subject || !startTime || !endTime))) { skipped += 1; continue; }
          const key = [date, classRow.id, student.id, sessionType, subject?.id || "", startTime, endTime].join("|");
          uniqueRows.set(key, { school_id: data.school?.id, class_id: classRow.id, subject_id: subject?.id || null, student_id: student.id, recorded_by: auth.user.id, attendance_date: date, session_type: sessionType, start_time: startTime || null, end_time: endTime || null, status, note: text(row.note) || null });
        }
        const payloads = [...uniqueRows.values()];
        if (auth.mode === "preview") { notify("success", `Template presensi terbaca: ${payloads.length} baris siap, ${skipped} dilewati.`); return; }
        for (const payload of payloads) {
          let removal = supabase.from("attendance_records").delete().eq("school_id", payload.school_id).eq("class_id", payload.class_id).eq("student_id", payload.student_id).eq("recorded_by", payload.recorded_by).eq("attendance_date", payload.attendance_date).eq("session_type", payload.session_type);
          removal = payload.session_type === "subject" ? removal.eq("subject_id", payload.subject_id).eq("start_time", payload.start_time).eq("end_time", payload.end_time) : removal.is("subject_id", null);
          const removed = await removal; if (removed.error) throw removed.error;
        }
        if (payloads.length) { const inserted = await supabase.from("attendance_records").insert(payloads); if (inserted.error) throw inserted.error; }
        await refresh(); notify("success", `Import presensi selesai: ${payloads.length} baris masuk, ${skipped} dilewati.`);
      } catch (err) { notify("error", err.message || "File presensi belum dapat dibaca."); }
    },
    addJournal: async (draft) => {
      try {
        if (auth.mode === "preview") commit({ ...data, journals: [{ ...draft, id: id("journal"), status: "complete" }, ...data.journals] });
        else { const result = await supabase.from("teaching_journals").insert({ school_id: data.school.id, class_id: draft.class_id, subject_id: draft.subject_id || null, created_by: auth.user.id, journal_date: draft.journal_date, topic: draft.topic, activity: draft.activity, reflection: draft.reflection, follow_up: draft.follow_up || null, status: "complete" }); if (result.error) throw result.error; await refresh(); }
        notify("success", "Jurnal berhasil disimpan.");
      } catch (err) { notify("error", err.message || "Jurnal belum tersimpan."); }
    },
    importGrades: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "NILAI");
        const result = await saveGradeRows(rows, data, auth, refresh, commit);
        notify("success", "Import nilai selesai: " + result.added + " masuk, " + result.skipped + " dilewati.");
      } catch (err) { notify("error", err.message || "File nilai belum dapat dibaca."); }
    },
    addGrade: async (draft) => {
      try { const result = await saveGradeRows([draft], data, auth, refresh, commit); notify("success", result.added ? "Nilai berhasil disimpan." : "Baris nilai dilewati."); } catch (err) { notify("error", err.message || "Nilai belum tersimpan."); }
    },
    saveSchedule: async (draft, scheduleId = null) => {
      try {
        if (auth.mode === "preview") { const row = { ...draft, id: scheduleId || id("schedule"), active: true }; commit({ ...data, schedules: scheduleId ? data.schedules.map((item) => item.id === scheduleId ? row : item) : [...data.schedules, row] }); }
        else { const payload = { school_id: data.school.id, user_id: auth.user.id, class_id: draft.class_id, subject_id: draft.subject_id || null, day_of_week: Number(draft.day_of_week), start_time: draft.start_time, end_time: draft.end_time, note: draft.note || null, active: true, updated_at: new Date().toISOString() }; const result = scheduleId ? await supabase.from("teacher_schedules").update(payload).eq("id", scheduleId) : await supabase.from("teacher_schedules").insert(payload); if (result.error) throw result.error; await refresh(); }
        notify("success", scheduleId ? "Agenda diperbarui." : "Agenda mingguan ditambahkan.");
      } catch (err) { notify("error", err.message || "Agenda belum tersimpan."); throw err; }
    },
    importSchedules: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "JADWAL_MINGGUAN"); let added = 0; let updated = 0; let skipped = 0; const known = [...data.schedules];
        if (auth.mode === "preview") { const valid = rows.filter((row) => !isExampleRow(row) && text(row.day) && text(row.class_name) && text(row.start_time) && text(row.end_time)); notify("success", `Template agenda terbaca: ${valid.length} baris siap.`); return; }
        for (const raw of rows) {
          const row = normalizeRow(raw); const day = DAY_NAMES.findIndex((item) => item.toLowerCase() === text(row.day).toLowerCase()) + 1;
          const classRow = data.classes.find((item) => text(item.name).toLowerCase() === text(row.class_name).toLowerCase()); const subjectName = text(row.subject_name); const subject = subjectName ? data.subjects.find((item) => text(item.name).toLowerCase() === subjectName.toLowerCase()) : null;
          const startTime = text(row.start_time).slice(0, 5); const endTime = text(row.end_time).slice(0, 5);
          if (isExampleRow(row) || !day || !classRow || (subjectName && !subject) || !startTime || !endTime || startTime >= endTime) { skipped += 1; continue; }
          const payload = { school_id: data.school.id, user_id: auth.user.id, class_id: classRow.id, subject_id: subject?.id || null, day_of_week: day, start_time: startTime, end_time: endTime, note: text(row.note) || null, active: text(row.active).toLowerCase() !== "false", updated_at: new Date().toISOString() };
          const existing = known.find((item) => Number(item.day_of_week) === day && item.class_id === classRow.id && (item.subject_id || null) === payload.subject_id && text(item.start_time).slice(0, 5) === startTime && text(item.end_time).slice(0, 5) === endTime);
          const result = existing ? await supabase.from("teacher_schedules").update(payload).eq("id", existing.id) : await supabase.from("teacher_schedules").insert(payload).select().single();
          if (result.error) throw result.error; if (existing) updated += 1; else { added += 1; known.push(result.data); }
        }
        await refresh(); notify("success", `Import agenda selesai: ${added} baru, ${updated} diperbarui, ${skipped} dilewati.`);
      } catch (err) { notify("error", err.message || "File agenda belum dapat dibaca."); }
    },
    updatePreferences: async (preferences) => {
      try { if (auth.mode === "preview") commit({ ...data, profile: { ...data.profile, preferences } }); else { const result = await supabase.from("profiles").update({ preferences }).eq("id", auth.user.id); if (result.error) throw result.error; await refresh(); } notify("success", "Tampilan beranda disimpan."); } catch (err) { notify("error", err.message || "Preferensi belum tersimpan."); }
    },
    updateRole: async (role) => {
      try { if (auth.mode === "preview") commit({ ...data, profile: { ...data.profile, role } }); else { const profile = await supabase.from("profiles").update({ role }).eq("id", auth.user.id); if (profile.error) throw profile.error; const assignment = await supabase.from("teacher_assignments").update({ mode: role, is_homeroom: role !== "guru_mapel" }).eq("school_id", data.school.id).eq("user_id", auth.user.id); if (assignment.error) throw assignment.error; await supabase.auth.updateUser({ data: { ...(auth.user.user_metadata || {}), role } }); await refresh(); } notify("success", "Mode kerja guru diperbarui."); } catch (err) { notify("error", err.message || "Mode kerja belum diperbarui."); }
    },
  };

  const page = active === "dashboard" ? <DashboardPage data={data} setActive={setActive} onPreferences={handlers.updatePreferences} />
    : active === "assistant" ? <AssistantPage data={data} />
      : active === "master" ? <MasterDataPage data={data} onSaveClass={handlers.saveClass} onSaveSubject={handlers.saveSubject} onSaveStudent={handlers.saveStudent} onImport={handlers.importMaster} />
        : active === "attendance" ? <AttendancePage data={data} onSave={handlers.saveAttendance} onImport={handlers.importAttendance} />
          : active === "journal" ? <JournalPage data={data} onAdd={handlers.addJournal} />
            : active === "grades" ? <GradesPage data={data} onImport={handlers.importGrades} onAdd={handlers.addGrade} />
              : active === "agenda" ? <AgendaPage data={data} onSave={handlers.saveSchedule} onImport={handlers.importSchedules} />
                : active === "reports" ? <ReportsPage data={data} />
                : <SettingsPage data={data} onLogout={logout} onRoleChange={handlers.updateRole} />;

  return <div className={dark ? "app dark" : "app"}>
    <aside className={mobileMenu ? "sidebar open" : "sidebar"}><div className="sidebar-header"><Logo /><button className="icon-button close-mobile" onClick={() => setMobileMenu(false)}><X size={18} /></button></div><div className="workspace-chip"><span className="workspace-symbol">{avatarName(data.classes[0]?.name || "BK")}</span><div><strong>{data.profile.schoolName || "Ruang kerja"}</strong><small>{roleLabel(data.profile.role)} · {data.classes.length} kelas</small></div></div><nav className="nav-list">{NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.id); setMobileMenu(false); }}><Icon size={18} /><span>{item.label}</span>{item.id === "assistant" && <em>AI</em>}</button>; })}</nav><div className="sidebar-footer"><button className={active === "settings" ? "nav-item active" : "nav-item"} onClick={() => setActive("settings")}><Settings2 size={18} /><span>Pengaturan</span></button><button className="logout-button" onClick={logout}><LogOut size={16} /><span>Keluar</span></button></div></aside>
    <main className="main"><header className="topbar"><button className="icon-button mobile-trigger" onClick={() => setMobileMenu(true)}><Menu size={19} /></button><div><span className="eyebrow">Buku Kerja Digital</span><h1>{NAV_ITEMS.find((item) => item.id === active)?.label || "Pengaturan"}</h1></div><div className="top-actions"><span className="connection-pill"><span></span>Database terhubung</span><button className="theme-button" onClick={() => setDark((current) => !current)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><span className="top-avatar">{avatarName(data.profile.fullName)}</span></div></header><div className="content">{error && <div className="form-notice error page-notice">{error}</div>}{notice && <div className={"form-notice " + notice.type + " page-notice"}>{notice.message}</div>}{page}</div></main><nav className="mobile-nav">{[NAV_ITEMS[0], NAV_ITEMS[2], NAV_ITEMS[3], NAV_ITEMS[5], NAV_ITEMS[6]].map((item) => { const Icon = item.icon; return <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><Icon size={18} /><span>{item.label.split(" ")[0]}</span></button>; })}</nav>
  </div>;
}

async function saveGradeRows(rows, data, auth, refresh, commit) {
  let added = 0; let skipped = 0;
  const localGrades = [...data.grades];
  const assessmentCache = {};
  for (const raw of rows) {
    const row = normalizeRow(raw);
    if (isExampleRow(row)) { skipped += 1; continue; }
    const studentNisn = text(row.student_nisn); const studentName = text(row.student_name); const className = text(row.class_name); const subjectName = text(row.subject_name); const title = text(row.assessment_title || row.title); const point = Number(text(row.point).replace(",", "."));
    const student = data.students.find((item) => text(row.student_id) === item.id || (studentNisn && text(item.nisn) === studentNisn) || (studentName && text(item.full_name).toLowerCase() === studentName.toLowerCase()));
    if (!student || !className || !subjectName || !title || Number.isNaN(point)) { skipped += 1; continue; }
    const grade = { id: id("grade"), student_id: student.id, student_nisn: student.nisn || studentNisn, student_name: student.full_name, class_name: className, subject_name: subjectName, academic_year: text(row.academic_year), semester: text(row.semester), assessment_title: title, assessment_category: text(row.assessment_category || "LAINNYA"), assessment_date: text(row.assessment_date) || today(), point, max_point: Number(text(row.max_point).replace(",", ".")) || 100, comment: text(row.comment) };
    if (auth.mode === "preview") { localGrades.push(grade); added += 1; continue; }
    let classRow = data.classes.find((item) => item.id === text(row.class_id) || text(item.name).toLowerCase() === className.toLowerCase());
    let subjectRow = data.subjects.find((item) => item.id === text(row.subject_id) || text(item.name).toLowerCase() === subjectName.toLowerCase());
    if (!classRow) {
      const year = data.academicYears[0];
      if (!year) { skipped += 1; continue; }
      const classResult = await supabase.from("classes").insert({ school_id: data.school.id, academic_year_id: year.id, name: className, grade_level: className.replace(/[^0-9]/g, ""), active: true }).select().single();
      if (classResult.error) { skipped += 1; continue; }
      classRow = classResult.data;
    }
    if (!subjectRow) {
      const subjectResult = await supabase.from("subjects").insert({ school_id: data.school.id, name: subjectName }).select().single();
      if (subjectResult.error) { skipped += 1; continue; }
      subjectRow = subjectResult.data;
    }
    const year = data.academicYears[0];
    if (year && student.id) await supabase.from("enrollments").upsert({ school_id: data.school.id, class_id: classRow.id, student_id: student.id, academic_year_id: year.id, active: true }, { onConflict: "class_id,student_id,academic_year_id" });
    const cacheKey = [classRow.id, subjectRow.id, title, grade.assessment_date].join("|");
    let assessment = assessmentCache[cacheKey];
    if (!assessment) {
      const existing = await supabase.from("assessments").select("*").eq("school_id", data.school.id).eq("class_id", classRow.id).eq("subject_id", subjectRow.id).eq("title", title).eq("assessment_date", grade.assessment_date).order("created_at", { ascending: true }).limit(1);
      if (existing.error) throw existing.error;
      assessment = existing.data?.[0] || null;
      if (!assessment) {
        const assessmentResult = await supabase.from("assessments").insert({ school_id: data.school.id, class_id: classRow.id, subject_id: subjectRow.id, created_by: auth.user.id, title, category: grade.assessment_category, max_point: grade.max_point, assessment_date: grade.assessment_date }).select().single();
        if (assessmentResult.error) throw assessmentResult.error;
        assessment = assessmentResult.data || null;
      }
      assessmentCache[cacheKey] = assessment;
    }
    if (!assessment) { skipped += 1; continue; }
    const scoreResult = await supabase.from("assessment_scores").upsert({ assessment_id: assessment.id, student_id: student.id, point, comment: grade.comment }, { onConflict: "assessment_id,student_id" });
    if (scoreResult.error) throw scoreResult.error;
    added += 1;
  }
  if (auth.mode === "preview") commit({ ...data, grades: localGrades }); else await refresh();
  return { added, skipped };
}

function PageSection({ eyebrow, title, action, children }) {
  return <section className="page-section"><div className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</div>{children}</section>;
}

function DashboardPage({ data, setActive, onPreferences }) {
  const [classId, setClassId] = useState(data.profile.preferences?.dashboard_class_id || "all");
  const todayAttendance = data.attendance.filter((item) => item.attendance_date === today());
  const present = todayAttendance.filter((item) => item.status === "H").length;
  const filteredStudents = classId === "all" ? data.students : data.students.filter((item) => item.class_id === classId);
  const filteredAttendance = classId === "all" ? todayAttendance : todayAttendance.filter((item) => item.class_id === classId);
  const filteredPresent = filteredAttendance.filter((item) => item.status === "H").length;
  const rate = filteredAttendance.length ? Math.round((filteredPresent / filteredAttendance.length) * 100) : 0;
  const statusCounts = ["H", "S", "I", "A"].map((status) => ({ status, count: filteredAttendance.filter((item) => item.status === status).length }));
  const upcoming = [...data.schedules].sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week) || text(a.start_time).localeCompare(text(b.start_time))).slice(0, 5);
  const selectClass = (value) => { setClassId(value); onPreferences({ ...(data.profile.preferences || {}), dashboard_class_id: value }); };
  return <><section className="welcome-block"><div><p className="eyebrow">RUANG KERJA PRIBADI</p><h2>Selamat datang, {data.profile.fullName.split(" ")[0] || "Guru"}.</h2><p>{roleLabel(data.profile.role)} · {data.academicYears[0]?.label || "Tahun ajaran aktif"}</p></div><div className="welcome-actions"><label className="compact-field"><span>Ringkasan kelas</span><select value={classId} onChange={(event) => selectClass(event.target.value)}><option value="all">Semua kelas</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary-button" onClick={() => setActive("assistant")}><Sparkles size={17} /> Tanya Asisten</button></div></section><div className="stat-grid"><Stat label="Siswa aktif" value={filteredStudents.length} meta={classId === "all" ? data.classes.length + " kelas tercatat" : "kelas terpilih"} icon={Users} tone="purple" /><Stat label="Kehadiran hari ini" value={rate + "%"} meta={filteredAttendance.length ? filteredPresent + " hadir" : "Belum diisi"} icon={CalendarCheck2} tone="green" /><Stat label="Jurnal tersimpan" value={data.journals.length} meta="dapat dibuka kembali" icon={BookOpen} tone="amber" /><Stat label="Nilai tersimpan" value={data.grades.length} meta="baris penilaian" icon={ClipboardList} tone="blue" /></div><div className="insight-grid"><div className="panel"><div className="panel-head"><div><p className="eyebrow">PRESENSI HARI INI</p><h3>Komposisi kehadiran</h3></div></div><div className="mini-bars">{statusCounts.map((item) => <div key={item.status}><span>{({ H: "Hadir", S: "Sakit", I: "Izin", A: "Alpa" })[item.status]}</span><div><i style={{ width: filteredAttendance.length ? `${Math.max(3, item.count / filteredAttendance.length * 100)}%` : "0%" }}></i></div><b>{item.count}</b></div>)}</div></div><div className="panel"><div className="panel-head"><div><p className="eyebrow">AGENDA MINGGUAN</p><h3>Jadwal mengajar</h3></div><button className="text-button" onClick={() => setActive("agenda")}>Kelola</button></div><div className="compact-list">{upcoming.length ? upcoming.map((item) => <div key={item.id}><span className="day-pill">{DAY_NAMES[item.day_of_week - 1]}</span><div><strong>{data.classes.find((row) => row.id === item.class_id)?.name || "Kelas"}</strong><small>{text(item.start_time).slice(0, 5)}–{text(item.end_time).slice(0, 5)} · {data.subjects.find((row) => row.id === item.subject_id)?.name || "Wali kelas"}</small></div></div>) : <p className="muted-copy">Belum ada jadwal. Tambahkan pola mingguan agar agenda berikutnya otomatis sama.</p>}</div></div></div><div className="panel checklist"><div className="panel-head"><div><p className="eyebrow">ALUR KERJA</p><h3>Yang bisa dibereskan hari ini</h3></div></div><div className="checklist-grid"><QuickTask done={data.students.length > 0} title="Lengkapi Master Data" desc="Kelas dan identitas siswa" onClick={() => setActive("master")} /><QuickTask done={filteredAttendance.length > 0} title="Isi presensi" desc="Tandai H, S, I, atau A" onClick={() => setActive("attendance")} /><QuickTask done={data.journals.length > 0} title="Tulis jurnal" desc="Simpan dan buka kembali" onClick={() => setActive("journal")} /><QuickTask done={data.grades.length > 0} title="Rekap nilai" desc="Nama siswa otomatis" onClick={() => setActive("grades")} /></div></div></>;
}

function Stat({ label, value, meta, icon: Icon, tone }) { return <div className="stat-card"><div className={"stat-icon " + tone}><Icon size={18} /></div><div><span>{label}</span><strong>{value}</strong><small>{meta}</small></div></div>; }
function QuickTask({ done, title, desc, onClick }) { return <button className="quick-task" onClick={onClick}><span className={done ? "task-check done" : "task-check"}>{done && <Check size={13} />}</span><span><strong>{title}</strong><small>{desc}</small></span><ArrowRight size={15} /></button>; }

function AssistantPage({ data }) {
  const [prompt, setPrompt] = useState(""); const [messages, setMessages] = useState([]); const [busy, setBusy] = useState(false);
  const suggestions = ["Ringkas jurnal hari ini", "Analisis pola presensi", "Buat refleksi pembelajaran", "Susun tindak lanjut siswa"];
  const send = async (value = prompt) => {
    const question = text(value); if (!question || busy) return;
    setPrompt(""); setMessages((current) => [...current, { role: "user", text: question }]); setBusy(true);
    try { const answer = await askAssistant(question, data); setMessages((current) => [...current, { role: "assistant", text: answer }]); }
    catch (error) { setMessages((current) => [...current, { role: "error", text: error.message || "Asisten belum dapat merespons. Periksa API key di Pengaturan." }]); }
    finally { setBusy(false); }
  };
  return <section className="assistant-page">
    <div className={messages.length ? "assistant-intro compact" : "assistant-intro"}><div className="ai-orb large"><Sparkles size={25} /></div><p className="eyebrow">ASISTEN GURU</p><h2>{messages.length ? "Percakapan ruang kerja" : "Apa yang ingin dibereskan?"}</h2>{!messages.length && <p>Tulis perintah dengan bahasa biasa. Asisten membaca ringkasan data kelasmu dan memberi hasil tanpa simbol markdown yang mengganggu.</p>}</div>
    <div className="chat-area">{messages.length === 0 && <div className="suggestion-grid">{suggestions.map((item) => <button className="suggestion" key={item} onClick={() => send(item)}><Sparkles size={15} /><span>{item}</span><ArrowRight size={14} /></button>)}</div>}{messages.map((message, index) => <div className={`message ${message.role}`} key={index}><span className="message-label">{message.role === "user" ? "Kamu" : message.role === "error" ? "Perlu disiapkan" : "Asisten Guru"}</span><div className="message-body">{message.text}</div></div>)}{busy && <div className="message assistant"><span className="message-label">Asisten Guru</span><div className="typing"><i></i><i></i><i></i></div></div>}</div>
    <div className="prompt-box"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="Tulis perintah untuk asisten guru…" rows="1" /><button aria-label="Kirim perintah" className="send-button" disabled={!text(prompt) || busy} onClick={() => send()}><ArrowRight size={18} /></button><small>Enter untuk mengirim · Shift + Enter untuk baris baru</small></div>
  </section>;
}

async function askAssistant(prompt, data) {
  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data?.session?.access_token || "";
  const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ prompt, userKey: window.localStorage.getItem(API_KEY) || "", context: { profile: data.profile, classes: data.classes.map((item) => ({ id: item.id, name: item.name })), subjects: data.subjects.map((item) => ({ id: item.id, name: item.name })), students: data.students.slice(0, 500).map((item) => ({ id: item.id, name: item.full_name, nickname: item.nickname, class_id: item.class_id })), attendance: data.attendance.slice(0, 1000), journals: data.journals.slice(0, 120), grades: data.grades.slice(0, 600), schedules: data.schedules.slice(0, 100) } }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Asisten belum dapat merespons.");
  return payload.reply;
}

function ImportActions({ onImport, accept = ".xlsx,.xls,.csv" }) { const inputId = id("file"); return <div className="import-actions"><a className="secondary-button" href={TEMPLATE_URL} download><Download size={16} /> Unduh template</a><label className="primary-button file-button" htmlFor={inputId}><Upload size={16} /> Import file<input id={inputId} type="file" accept={accept} onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ""; }} /></label></div>; }

function MasterDataPage({ data, onSaveClass, onSaveSubject, onSaveStudent, onImport }) {
  const [classId, setClassId] = useState(data.classes[0]?.id || "all"); const [query, setQuery] = useState(""); const [editingClass, setEditingClass] = useState(null); const [editingStudent, setEditingStudent] = useState(null); const [showStudent, setShowStudent] = useState(false);
  const blankStudent = { full_name: "", nickname: "", nis: "", nisn: "", gender: "", birth_date: "", address: "", phone: "", parent_phone: "", class_id: classId === "all" ? data.classes[0]?.id || "" : classId, active: true };
  const [studentForm, setStudentForm] = useState(blankStudent); const [classForm, setClassForm] = useState({ name: "", grade_level: "", active: true });
  const [subjectForm, setSubjectForm] = useState({ name: "", code: "" }); const [editingSubject, setEditingSubject] = useState(null);
  const visible = data.students.filter((item) => (classId === "all" || item.class_id === classId) && (text(item.full_name) + " " + text(item.nickname) + " " + text(item.nis) + " " + text(item.nisn)).toLowerCase().includes(query.toLowerCase()));
  const openStudent = (student = null) => { setEditingStudent(student?.id || null); setStudentForm(student ? { ...blankStudent, ...student } : { ...blankStudent, class_id: classId === "all" ? data.classes[0]?.id || "" : classId }); setShowStudent(true); };
  const submitStudent = async (event) => { event.preventDefault(); if (!studentForm.full_name || !studentForm.class_id) return; await onSaveStudent(studentForm, editingStudent); setShowStudent(false); setEditingStudent(null); };
  const editClass = (row) => { setEditingClass(row.id); setClassForm({ name: row.name, grade_level: row.grade_level || "", active: row.active !== false }); };
  const submitClass = async (event) => { event.preventDefault(); if (!classForm.name) return; await onSaveClass(classForm, editingClass); setClassForm({ name: "", grade_level: "", active: true }); setEditingClass(null); };
  const submitSubject = async (event) => { event.preventDefault(); if (!subjectForm.name) return; await onSaveSubject(subjectForm, editingSubject); setSubjectForm({ name: "", code: "" }); setEditingSubject(null); };
  return <PageSection eyebrow="SUMBER DATA UTAMA" title="Master Data" action={<div className="section-actions"><ImportActions onImport={onImport} /><button className="primary-button" onClick={() => openStudent()}><Plus size={16} /> Tambah siswa</button></div>}><div className="helper-banner"><FileSpreadsheet size={18} /><span>Semua presensi dan nilai mengambil nama dari sini. Isi sheet MASTER_KELAS dan MASTER_SISWA pada template resmi.</span></div><div className="subject-manager panel"><div><p className="eyebrow">MATA PELAJARAN DIAMPU</p><div className="subject-chips">{data.subjects.map((row) => <button key={row.id} onClick={() => { setEditingSubject(row.id); setSubjectForm({ name: row.name, code: row.code || "" }); }}>{row.name}{row.code ? ` · ${row.code}` : ""}<Pencil size={12}/></button>)}</div></div><form onSubmit={submitSubject}><input value={subjectForm.name} onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tambah mata pelajaran"/><input value={subjectForm.code} onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))} placeholder="Kode (opsional)"/><button className="secondary-button"><Save size={14}/>{editingSubject ? "Simpan" : "Tambah"}</button></form></div><div className="master-layout"><aside className="class-manager"><div className="panel-head"><div><p className="eyebrow">DAFTAR KELAS</p><h3>{data.classes.length} kelas</h3></div></div><button className={classId === "all" ? "class-choice active" : "class-choice"} onClick={() => setClassId("all")}><span>Semua kelas</span><b>{data.students.length}</b></button>{data.classes.map((row) => <button key={row.id} className={classId === row.id ? "class-choice active" : "class-choice"} onClick={() => setClassId(row.id)}><span>{row.name}<small>Tingkat {row.grade_level || "-"}</small></span><b>{data.students.filter((item) => item.class_id === row.id).length}</b><i onClick={(event) => { event.stopPropagation(); editClass(row); }}><Pencil size={13}/></i></button>)}<form className="class-form" onSubmit={submitClass}><Field label={editingClass ? "Edit nama kelas" : "Tambah kelas"} value={classForm.name} onChange={(value) => setClassForm((current) => ({ ...current, name: value }))} placeholder="Contoh: 8B" /><Field label="Tingkat" value={classForm.grade_level} onChange={(value) => setClassForm((current) => ({ ...current, grade_level: value }))} placeholder="8" /><button className="secondary-button"><Save size={14}/>{editingClass ? "Simpan edit" : "Tambah kelas"}</button></form></aside><div className="master-content">{showStudent && <form className="inline-form student-editor" onSubmit={submitStudent}><div className="form-title"><div><p className="eyebrow">{editingStudent ? "EDIT SISWA" : "SISWA BARU"}</p><h3>Identitas siswa</h3></div><button className="icon-button" type="button" onClick={() => setShowStudent(false)}><X size={17}/></button></div><Field label="Nama lengkap" value={studentForm.full_name} onChange={(value) => setStudentForm((current) => ({ ...current, full_name: value }))} placeholder="Nama sesuai data sekolah" /><Field label="Nama panggilan" value={studentForm.nickname} onChange={(value) => setStudentForm((current) => ({ ...current, nickname: value }))} placeholder="Nama yang biasa dipakai" /><Field label="NIS" value={studentForm.nis} onChange={(value) => setStudentForm((current) => ({ ...current, nis: value }))} placeholder="Opsional" /><Field label="NISN" value={studentForm.nisn} onChange={(value) => setStudentForm((current) => ({ ...current, nisn: value }))} placeholder="Opsional" /><label className="field"><span>Kelas</span><select value={studentForm.class_id} onChange={(event) => setStudentForm((current) => ({ ...current, class_id: event.target.value }))}>{data.classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="field"><span>Jenis kelamin</span><select value={studentForm.gender || ""} onChange={(event) => setStudentForm((current) => ({ ...current, gender: event.target.value }))}><option value="">Pilih</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label><label className="field"><span>Tanggal lahir</span><input type="date" value={studentForm.birth_date || ""} onChange={(event) => setStudentForm((current) => ({ ...current, birth_date: event.target.value }))}/></label><Field label="Nomor HP siswa" value={studentForm.phone || ""} onChange={(value) => setStudentForm((current) => ({ ...current, phone: value }))} placeholder="Opsional" /><Field label="Nomor HP orang tua" value={studentForm.parent_phone || ""} onChange={(value) => setStudentForm((current) => ({ ...current, parent_phone: value }))} placeholder="Opsional" /><label className="field field-wide"><span>Alamat</span><textarea value={studentForm.address || ""} onChange={(event) => setStudentForm((current) => ({ ...current, address: event.target.value }))} rows="2" placeholder="Alamat tempat tinggal" /></label><button className="primary-button"><Save size={15}/> Simpan data siswa</button></form>}<div className="toolbar"><div className="search-box"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, panggilan, NIS, atau NISN…"/></div><span className="result-count">{visible.length} siswa</span></div><div className="table-card">{visible.length === 0 ? <EmptyState title="Belum ada siswa di kelas ini" desc="Tambahkan manual atau import template Master Data."/> : visible.map((student) => <div className="data-row student-row" key={student.id}><span className="person-avatar">{avatarName(student.full_name)}</span><div className="person-copy"><strong>{student.full_name}{student.nickname && <em>“{student.nickname}”</em>}</strong><small>{student.nisn || "NISN belum diisi"} · {student.class_name || data.classes.find((row) => row.id === student.class_id)?.name || "Belum ada kelas"}</small></div><span className="row-meta">{ageFromBirthDate(student.birth_date)}</span><span className="row-meta phone-meta"><Phone size={13}/>{student.phone || student.parent_phone || "-"}</span><button className="row-action" onClick={() => openStudent(student)}><Pencil size={15}/> Edit</button></div>)}</div></div></div></PageSection>;
}

function AttendancePage({ data, onSave, onImport }) {
  const initialType = data.profile.role === "guru_mapel" ? "subject" : "homeroom";
  const [session, setSession] = useState({ date: today(), classId: data.classes[0]?.id || "", sessionType: initialType, subjectId: data.subjects[0]?.id || "", startTime: "07:00", endTime: "08:00" }); const [statuses, setStatuses] = useState({}); const [notes, setNotes] = useState({});
  const { date, classId, sessionType, subjectId, startTime, endTime } = session;
  const classRow = data.classes.find((item) => item.id === classId) || data.classes[0];
  const roster = data.students.filter((student) => !classRow || student.class_id === classRow.id || text(student.class_name).toLowerCase() === text(classRow.name).toLowerCase() || (data.classes.length === 1 && !student.class_id && !student.class_name));
  useEffect(() => { const next = {}; const nextNotes = {}; roster.forEach((student) => { const record = data.attendance.find((item) => item.student_id === student.id && item.attendance_date === date && item.class_id === classId && (item.session_type || "homeroom") === sessionType && (sessionType !== "subject" || item.subject_id === subjectId)); next[student.id] = record?.status || "H"; nextNotes[student.id] = record?.note || ""; }); setStatuses(next); setNotes(nextNotes); }, [date, classId, sessionType, subjectId, data.students, data.attendance]);
  const counts = Object.values(statuses).reduce((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {});
  const setValue = (key, value) => setSession((current) => ({ ...current, [key]: value }));
  const canChoose = data.profile.role === "gabungan";
  return <PageSection eyebrow="CATATAN KEHADIRAN" title="Presensi" action={<div className="section-actions"><ImportActions onImport={onImport}/><button className="primary-button" disabled={!roster.length || (sessionType === "subject" && (!subjectId || !startTime || !endTime))} onClick={() => onSave(session, statuses, notes)}><Save size={16}/> Simpan presensi</button></div>}><div className="control-row attendance-controls">{canChoose && <label className="compact-field"><span>Jenis presensi</span><select value={sessionType} onChange={(event) => setValue("sessionType", event.target.value)}><option value="homeroom">Presensi wali kelas</option><option value="subject">Presensi mata pelajaran</option></select></label>}<label className="compact-field"><span>Tanggal</span><input type="date" value={date} onChange={(event) => setValue("date", event.target.value)}/></label><label className="compact-field"><span>Kelas</span><select value={classId} onChange={(event) => setValue("classId", event.target.value)}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{sessionType === "subject" && <><label className="compact-field"><span>Mata pelajaran</span><select value={subjectId} onChange={(event) => setValue("subjectId", event.target.value)}>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="compact-field"><span>Mulai</span><input type="time" value={startTime} onChange={(event) => setValue("startTime", event.target.value)}/></label><label className="compact-field"><span>Selesai</span><input type="time" value={endTime} onChange={(event) => setValue("endTime", event.target.value)}/></label></>}</div><div className="attendance-summary"><div><strong>{roster.length}</strong><span>Total siswa</span></div><div className="present"><strong>{counts.H || 0}</strong><span>Hadir</span></div><div className="permission"><strong>{(counts.S || 0) + (counts.I || 0)}</strong><span>Sakit / izin</span></div><div className="absent"><strong>{counts.A || 0}</strong><span>Alpa</span></div></div><div className="table-card">{roster.length === 0 ? <EmptyState title="Belum ada siswa" desc="Pilih kelas yang sudah memiliki siswa pada Master Data."/> : roster.map((student) => <div className="data-row attendance-row" key={student.id}><span className="person-avatar">{avatarName(student.full_name)}</span><div className="person-copy"><strong>{student.full_name}</strong><small>{student.nickname || student.nisn || "Data identitas belum lengkap"}</small></div><div className="attendance-actions">{[["H", "Hadir"], ["S", "Sakit"], ["I", "Izin"], ["A", "Alpa"]].map(([code, label]) => <button type="button" key={code} title={label} className={statuses[student.id] === code ? "attendance-button active " + code : "attendance-button"} onClick={() => setStatuses((current) => ({ ...current, [student.id]: code }))}>{code}</button>)}</div><input className="attendance-note" value={notes[student.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [student.id]: event.target.value }))} placeholder="Catatan opsional"/></div>)}</div></PageSection>;
}

function JournalPage({ data, onAdd }) {
  const [form, setForm] = useState({ journal_date: today(), class_id: data.classes[0]?.id || "", subject_id: data.subjects[0]?.id || "", topic: "", activity: "", reflection: "", follow_up: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); if (!form.topic) return; await onAdd(form); setForm((current) => ({ ...current, topic: "", activity: "", reflection: "", follow_up: "" })); };
  return <PageSection eyebrow="CATATAN PEMBELAJARAN" title="Jurnal mengajar" action={<button className="secondary-button" onClick={() => document.getElementById("journal-topic")?.focus()}><Plus size={16}/> Tulis jurnal</button>}><form className="journal-form" onSubmit={submit}><div className="three-fields"><label className="field"><span>Tanggal</span><input type="date" value={form.journal_date} onChange={(event) => update("journal_date", event.target.value)}/></label><label className="field"><span>Kelas</span><select value={form.class_id} onChange={(event) => update("class_id", event.target.value)}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Mata pelajaran</span><select value={form.subject_id} onChange={(event) => update("subject_id", event.target.value)}><option value="">Umum / wali kelas</option>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label className="field"><span>Topik pembelajaran</span><input id="journal-topic" value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="Contoh: Pecahan dan perbandingan"/></label><label className="field"><span>Aktivitas pembelajaran</span><textarea value={form.activity} onChange={(event) => update("activity", event.target.value)} placeholder="Apa yang dilakukan siswa dan guru?" rows="3"/></label><div className="two-fields"><label className="field"><span>Refleksi</span><textarea value={form.reflection} onChange={(event) => update("reflection", event.target.value)} placeholder="Apa yang berjalan baik dan perlu diperbaiki?" rows="3"/></label><label className="field"><span>Tindak lanjut</span><textarea value={form.follow_up} onChange={(event) => update("follow_up", event.target.value)} placeholder="Remedial, pengayaan, atau kegiatan berikutnya" rows="3"/></label></div><button className="primary-button" type="submit"><Save size={16}/> Simpan jurnal</button></form><div className="list-heading"><p className="eyebrow">RIWAYAT JURNAL</p><span>{data.journals.length} catatan tersimpan</span></div><div className="journal-list">{data.journals.length === 0 ? <EmptyState title="Belum ada jurnal" desc="Simpan catatan pertama untuk membangun riwayat pembelajaran."/> : data.journals.map((journal) => <details className="journal-card journal-details" key={journal.id}><summary><span className="date-block">{text(journal.journal_date).slice(5)}</span><div className="person-copy"><strong>{journal.topic}</strong><small>{data.classes.find((item) => item.id === journal.class_id)?.name || "Kelas"} · {data.subjects.find((item) => item.id === journal.subject_id)?.name || "Umum"}</small></div><ChevronDown size={17}/></summary><div className="journal-body"><div><span>Aktivitas</span><p>{journal.activity || "Belum ada catatan aktivitas."}</p></div><div><span>Refleksi</span><p>{journal.reflection || "Belum ada refleksi."}</p></div><div><span>Tindak lanjut</span><p>{journal.follow_up || "Belum ada tindak lanjut."}</p></div></div></details>)}</div></PageSection>;
}

function GradesPage({ data, onImport, onAdd }) {
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ student_id: "", class_id: data.classes[0]?.id || "", subject_id: data.subjects[0]?.id || "", assessment_title: "", assessment_category: "TUGAS", assessment_date: today(), point: "", max_point: "100", comment: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const roster = data.students.filter((student) => student.class_id === form.class_id); const selectedStudent = data.students.find((student) => student.id === form.student_id); const classRow = data.classes.find((item) => item.id === form.class_id); const subjectRow = data.subjects.find((item) => item.id === form.subject_id);
  const submit = async (event) => { event.preventDefault(); if (!selectedStudent || !classRow || !subjectRow || !form.assessment_title || form.point === "") return; await onAdd({ ...form, student_name: selectedStudent.full_name, student_nisn: selectedStudent.nisn || "", class_name: classRow.name, subject_name: subjectRow.name }); setForm((current) => ({ ...current, student_id: "", point: "", comment: "" })); };
  return <PageSection eyebrow="HASIL BELAJAR" title="Penilaian" action={<div className="section-actions"><ImportActions onImport={onImport}/><button className="primary-button" onClick={() => setShowForm((current) => !current)}><Plus size={16}/> Input nilai</button></div>}><div className="helper-banner"><ClipboardList size={18}/><span>Nama siswa otomatis dari Master Data. Catatan dapat dipakai untuk status belum tuntas, remedial, atau informasi lain.</span></div>{showForm && <form className="inline-form grades-form" onSubmit={submit}><label className="field"><span>Kelas</span><select value={form.class_id} onChange={(event) => { update("class_id", event.target.value); update("student_id", ""); }}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Nama siswa</span><select value={form.student_id} onChange={(event) => update("student_id", event.target.value)}><option value="">Pilih dari Master Data</option>{roster.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><label className="field"><span>Mata pelajaran</span><select value={form.subject_id} onChange={(event) => update("subject_id", event.target.value)}>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Field label="Nama tugas / asesmen" value={form.assessment_title} onChange={(value) => update("assessment_title", value)} placeholder="Contoh: Tugas 1"/><label className="field"><span>Kategori</span><select value={form.assessment_category} onChange={(event) => update("assessment_category", event.target.value)}><option>TUGAS</option><option>UH</option><option>PTS</option><option>PAS</option><option>PROYEK</option><option>LAINNYA</option></select></label><label className="field"><span>Tanggal</span><input type="date" value={form.assessment_date} onChange={(event) => update("assessment_date", event.target.value)}/></label><Field label="Nilai" value={form.point} onChange={(value) => update("point", value)} placeholder="0–100" type="number"/><Field label="Nilai maksimum" value={form.max_point} onChange={(value) => update("max_point", value)} placeholder="100" type="number"/><label className="field field-wide"><span>Catatan guru</span><textarea value={form.comment} onChange={(event) => update("comment", event.target.value)} rows="2" placeholder="Contoh: Belum tuntas, remedial hari Jumat"/></label><button className="primary-button"><Save size={15}/> Simpan nilai</button></form>}<div className="grade-summary"><strong>{data.grades.length}</strong><span>baris nilai tersimpan</span><div className="grade-progress"><span style={{ width: data.students.length ? Math.min(100, Math.round((data.grades.length / Math.max(1, data.students.length)) * 100)) + "%" : "0%" }}></span></div></div><div className="table-card">{data.grades.length === 0 ? <EmptyState title="Belum ada nilai" desc="Input nilai dari daftar siswa atau import template resmi."/> : data.grades.map((grade) => <div className="data-row grade-row" key={grade.id}><span className="person-avatar blue">{avatarName(grade.student_name)}</span><div className="person-copy"><strong>{grade.student_name}</strong><small>{grade.class_name} · {grade.subject_name} · {grade.assessment_title}{grade.comment ? ` · ${grade.comment}` : ""}</small></div><strong className="score-value">{grade.point}</strong><span className="row-meta">/{grade.max_point || 100}</span></div>)}</div></PageSection>;
}

function AgendaPage({ data, onSave, onImport }) {
  const blank = { day_of_week: 1, class_id: data.classes[0]?.id || "", subject_id: data.profile.role === "wali_kelas" ? "" : data.subjects[0]?.id || "", start_time: "07:00", end_time: "08:00", note: "" }; const [form, setForm] = useState(blank); const [editing, setEditing] = useState(null);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); if (!form.class_id || !form.start_time || !form.end_time) return; await onSave(form, editing); setForm(blank); setEditing(null); };
  const edit = (row) => { setEditing(row.id); setForm({ day_of_week: row.day_of_week, class_id: row.class_id, subject_id: row.subject_id || "", start_time: text(row.start_time).slice(0, 5), end_time: text(row.end_time).slice(0, 5), note: row.note || "" }); };
  return <PageSection eyebrow="POLA MINGGUAN" title="Kalender agenda" action={<ImportActions onImport={onImport}/>}><div className="agenda-layout"><form className="agenda-form panel" onSubmit={submit}><div className="panel-head"><div><p className="eyebrow">{editing ? "EDIT JADWAL" : "JADWAL BARU"}</p><h3>Pelajaran berulang tiap minggu</h3></div></div><label className="field"><span>Hari</span><select value={form.day_of_week} onChange={(event) => update("day_of_week", Number(event.target.value))}>{DAY_NAMES.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label><label className="field"><span>Kelas</span><select value={form.class_id} onChange={(event) => update("class_id", event.target.value)}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Mata pelajaran</span><select value={form.subject_id} onChange={(event) => update("subject_id", event.target.value)}><option value="">Wali kelas / agenda umum</option>{data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="two-fields"><label className="field"><span>Mulai</span><input type="time" value={form.start_time} onChange={(event) => update("start_time", event.target.value)}/></label><label className="field"><span>Selesai</span><input type="time" value={form.end_time} onChange={(event) => update("end_time", event.target.value)}/></label></div><label className="field"><span>Catatan</span><textarea rows="3" value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="Kelas, ruang, materi, atau pengingat"/></label><button className="primary-button"><Save size={15}/>{editing ? "Simpan perubahan" : "Tambahkan agenda"}</button></form><div className="week-board">{DAY_NAMES.map((day, index) => { const rows = data.schedules.filter((item) => Number(item.day_of_week) === index + 1 && item.active !== false); return <section className="day-column" key={day}><div className="day-head"><span>{day.slice(0, 3)}</span><strong>{day}</strong><small>{rows.length} agenda</small></div><div className="day-events">{rows.length ? rows.map((item) => <button className="schedule-card" key={item.id} onClick={() => edit(item)}><span><Clock3 size={14}/>{text(item.start_time).slice(0, 5)}–{text(item.end_time).slice(0, 5)}</span><strong>{data.classes.find((row) => row.id === item.class_id)?.name || "Kelas"}</strong><small>{data.subjects.find((row) => row.id === item.subject_id)?.name || "Agenda wali kelas"}</small>{item.note && <p>{item.note}</p>}</button>) : <span className="empty-slot">Belum ada jadwal</span>}</div></section>; })}</div></div></PageSection>;
}

function ReportsPage({ data }) {
  const attendanceRows = data.attendance.map((row) => ({ tanggal: row.attendance_date, siswa: data.students.find((item) => item.id === row.student_id)?.full_name || "", status: row.status, kelas: data.classes.find((item) => item.id === row.class_id)?.name || "" }));
  return <PageSection eyebrow="RINGKASAN DATA" title="Rekap & laporan" action={<button className="secondary-button" onClick={() => saveRowsAsCsv("rekap-buku-kerja.csv", attendanceRows)}><Download size={16} /> Export CSV</button>}><div className="report-grid"><ReportCard icon={CalendarCheck2} title="Rekap presensi" value={data.attendance.length + " catatan"} desc="Unduh data presensi untuk direkap lebih lanjut." onClick={() => saveRowsAsCsv("rekap-presensi.csv", attendanceRows)} /><ReportCard icon={ClipboardList} title="Rekap penilaian" value={data.grades.length + " nilai"} desc="Daftar nilai yang sudah masuk ke ruang kerja." onClick={() => saveRowsAsCsv("rekap-nilai.csv", data.grades)} /><ReportCard icon={GraduationCap} title="Cakupan kelas" value={data.classes.length + " kelas"} desc="Kelas yang tersedia di ruang kerja ini." /><ReportCard icon={BookOpen} title="Jurnal mengajar" value={data.journals.length + " catatan"} desc="Jurnal yang tersimpan dan siap diperiksa." /></div></PageSection>;
}
function ReportCard({ icon: Icon, title, value, desc, onClick }) { return <div className="report-card"><div className="report-icon"><Icon size={19} /></div><strong>{title}</strong><b>{value}</b><p>{desc}</p>{onClick && <button className="text-button" onClick={onClick}>Unduh data <Download size={14} /></button>}</div>; }

function SettingsPage({ data, onLogout, onRoleChange }) {
  const [key, setKey] = useState(() => window.localStorage.getItem(API_KEY) || ""); const [saved, setSaved] = useState(false); const [showKey, setShowKey] = useState(false);
  const save = () => { const cleaned = key.trim(); if (cleaned) window.localStorage.setItem(API_KEY, cleaned); else window.localStorage.removeItem(API_KEY); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <PageSection eyebrow="PENGATURAN" title="Pengaturan"><div className="settings-stack">
    <div className="settings-card"><div><p className="eyebrow">PROFIL & MODE KERJA</p><h3>{data.profile.fullName}</h3><p>{data.profile.schoolName} · {data.academicYears[0]?.label || "Tahun ajaran aktif"}</p></div><div className="profile-controls"><label className="compact-field"><span>Mode guru</span><select value={data.profile.role} onChange={(event) => onRoleChange(event.target.value)}><option value="wali_kelas">Wali kelas</option><option value="guru_mapel">Guru mata pelajaran</option><option value="gabungan">Wali kelas + guru mapel</option></select></label><span className="connection-pill"><span></span>Database terhubung</span></div></div>
    <div className="settings-card ai-settings"><div className="settings-copy"><p className="eyebrow">ASISTEN AI</p><h3>API key Gemini pribadi</h3><p>Key aplikasi digunakan lebih dulu. Key pribadi menjadi cadangan saat kuota bersama habis dan hanya tersimpan di perangkat ini.</p><a className="inline-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Buat atau lihat API key di Google AI Studio <ArrowRight size={14}/></a></div><div className="key-row"><div className="key-input-wrap"><input type={showKey ? "text" : "password"} value={key} onChange={(event) => setKey(event.target.value)} placeholder="Tempel API key Gemini"/><button className="icon-button" type="button" aria-label={showKey ? "Sembunyikan API key" : "Tampilkan API key"} onClick={() => setShowKey((current) => !current)}>{showKey ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><button className="primary-button" onClick={save}><Save size={15}/> Simpan</button></div>{saved && <small className="saved-label">API key siap digunakan dari perangkat ini.</small>}<details className="tutorial-details"><summary>Video dan panduan memasukkan API key</summary><div className="video-frame"><iframe src="https://www.youtube.com/embed/mUTAq9ffk0s" title="Tutorial memasukkan API key Gemini" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div><ol><li>Klik tautan Google AI Studio lalu pilih Create API key.</li><li>Salin key, tempel di kolom di atas, kemudian simpan.</li><li>Buka Asisten Guru dan tulis perintah dengan bahasa biasa.</li></ol></details></div>
    <div className="settings-card"><div><p className="eyebrow">DATA</p><h3>Template import siap pakai</h3><p>Satu file resmi untuk kelas, siswa, nilai, presensi, dan agenda. Petunjuk pengisian tersedia di sheet pertama.</p></div><a className="secondary-button" href={TEMPLATE_URL} download><Download size={16}/> Unduh template</a></div>
    <div className="settings-card guide-card"><div><p className="eyebrow">PETUNJUK PENGGUNAAN</p><h3>Urutan kerja yang disarankan</h3><p>Ikuti urutan ini agar setiap nama dan rekap saling terhubung.</p></div><div className="guide-grid"><details open><summary>1. Master Data</summary><p>Tambahkan kelas, lalu data siswa. Gunakan template bila ingin memasukkan banyak kelas sekaligus. Master Data menjadi sumber nama untuk presensi dan nilai.</p></details><details><summary>2. Presensi</summary><p>Pilih kelas. Wali kelas menggunakan presensi harian; guru mapel mengisi tanggal, mata pelajaran, serta jam mulai dan selesai. Mode gabungan dapat memilih keduanya.</p></details><details><summary>3. Penilaian</summary><p>Pilih kelas dan nama siswa dari daftar, isi tugas, nilai, serta catatan remedial atau ketuntasan. Tidak perlu mengetik nama ulang.</p></details><details><summary>4. Jurnal</summary><p>Simpan topik, aktivitas, refleksi, dan tindak lanjut. Riwayat dapat dibuka kembali dari kartu jurnal.</p></details><details><summary>5. Agenda</summary><p>Atur pola mengajar Senin–Minggu. Jadwal berulang tiap minggu dan dapat diedit dengan menekan kartu agenda.</p></details><details><summary>6. Asisten Guru</summary><p>Minta analisis presensi, ringkasan jurnal, rencana tindak lanjut, atau bantuan administrasi. Periksa kembali hasil AI sebelum digunakan.</p></details><details><summary>7. Rekap & laporan</summary><p>Unduh data presensi dan nilai dalam CSV untuk arsip atau pengolahan lanjutan.</p></details></div></div>
    <div className="settings-card danger-card"><div><h3>Keluar dari aplikasi</h3><p>Sesi akun di perangkat ini akan diakhiri.</p></div><button className="secondary-button" onClick={onLogout}><LogOut size={16} /> Keluar</button></div>
  </div></PageSection>;
}

function EmptyState({ title, desc }) { return <div className="empty-state"><div className="empty-icon"><FileText size={20} /></div><strong>{title}</strong><p>{desc}</p></div>; }

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { if (this.state.hasError) return <div className="app-error"><div className="app-error-card"><div className="app-error-mark">!</div><h1>Aplikasi belum dapat dimuat</h1><p>Segarkan halaman. Jika masalah berlanjut, periksa konfigurasi deployment.</p><button onClick={() => window.location.reload()}>Segarkan halaman</button></div></div>; return this.props.children; }
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
