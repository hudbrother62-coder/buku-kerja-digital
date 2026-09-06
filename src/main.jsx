import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import * as XLSX from "xlsx";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronDown,
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

const NAV_ITEMS = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "assistant", label: "Asisten Guru", icon: Sparkles },
  { id: "students", label: "Siswa", icon: Users },
  { id: "attendance", label: "Presensi", icon: CalendarCheck2 },
  { id: "journal", label: "Jurnal", icon: BookOpen },
  { id: "grades", label: "Penilaian", icon: ClipboardList },
  { id: "reports", label: "Rekap & laporan", icon: BarChart3 },
];

const emptyData = () => ({
  profile: { fullName: "", schoolName: "", role: "wali_kelas", setupComplete: false },
  school: null,
  academicYears: [],
  classes: [],
  subjects: [],
  students: [],
  attendance: [],
  journals: [],
  grades: [],
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
  return role === "guru_mapel" ? "Guru mata pelajaran" : "Wali kelas";
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
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.Sheets[preferredSheet] ? preferredSheet : workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false }).map(normalizeRow);
}

function saveRowsAsCsv(filename, rows) {
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

function AuthScreen({ onAuth, configurationPending = false }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", school: "", role: "wali_kelas" });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!form.email || !form.password || (mode === "register" && (!form.name || !form.school))) {
      setNotice({ type: "error", message: "Lengkapi data yang wajib diisi terlebih dahulu." });
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
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name, school_name: form.school, role: form.role } },
        });
        if (error) throw error;
        if (data.session) onAuth({ mode: "supabase", user: data.user, accessToken: data.session.access_token });
        else setNotice({ type: "success", message: "Akun berhasil dibuat. Periksa email untuk mengaktifkan akun, lalu masuk." });
      }
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Terjadi kesalahan. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-ambient ambient-one"></div><div className="auth-ambient ambient-two"></div>
      <section className="auth-story">
        <Logo />
        <div className="auth-story-copy"><p className="eyebrow"><span></span>RUANG KERJA KHUSUS GURU</p><h1>Catatan kelas rapi.<br/><span>Mengajar jadi lebih fokus.</span></h1><p>Siswa, presensi, jurnal, nilai, dan bantuan AI hadir dalam satu ruang kerja yang tenang dan mudah dipakai.</p></div>
        <div className="auth-preview-card"><div className="preview-top"><span className="preview-logo"><img src="/brand/bantu-beres-symbol.png" alt="" /></span><span>Hari ini</span></div><strong>Apa yang ingin dibereskan?</strong><div className="preview-command"><Sparkles size={16}/><span>Ringkas jurnal dan siapkan tindak lanjut…</span></div><div className="preview-metrics"><span><b>32</b>Siswa</span><span><b>94%</b>Hadir</span><span><b>6</b>Jurnal</span></div></div>
        <div className="auth-trust"><span><ShieldCheck size={16}/> Data per akun</span><span><FileSpreadsheet size={16}/> Import Excel</span><span><Sparkles size={16}/> Asisten AI</span></div>
      </section>
      <section className="auth-panel"><div className="auth-mobile-brand"><Logo /></div><div className="auth-card">
        <div className="auth-heading"><p className="eyebrow">{mode === "login" ? "SELAMAT DATANG KEMBALI" : "MULAI RUANG KERJA"}</p><h1>{mode === "login" ? "Masuk ke Bantu Beres" : "Buat akun guru"}</h1><p>{mode === "login" ? "Lanjutkan pekerjaan kelasmu dari tempat terakhir." : "Siapkan ruang kerja pribadi untuk kelas dan mata pelajaranmu."}</p></div>
        {configurationPending && <div className="setup-notice"><ShieldCheck size={18}/><span><strong>Database khusus sedang menunggu slot</strong><small>Login akan aktif setelah project Supabase baru tersedia. Data tidak memakai database aplikasi lain.</small></span></div>}
        {notice && <div className={"form-notice " + notice.type}>{notice.message}</div>}
        <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(null); }}>Masuk</button><button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setNotice(null); }}>Daftar</button></div>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <><Field label="Nama lengkap" value={form.name} onChange={(value) => update("name", value)} placeholder="Contoh: Rina Wulandari" /><Field label="Nama sekolah" value={form.school} onChange={(value) => update("school", value)} placeholder="Contoh: SMP Negeri 1" /><label className="field"><span>Peran utama</span><select value={form.role} onChange={(event) => update("role", event.target.value)}><option value="wali_kelas">Wali kelas</option><option value="guru_mapel">Guru mata pelajaran</option></select></label></>}
          <Field label="Email" value={form.email} onChange={(value) => update("email", value)} placeholder="nama@sekolah.sch.id" type="email" />
          <label className="field"><span>Kata sandi</span><div className="password-field"><input type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Minimal 6 karakter"/><button type="button" aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
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
  data.profile = { fullName: metadata.full_name || user.email || "Guru", schoolName: metadata.school_name || "", role: metadata.role || "wali_kelas", setupComplete: false };
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
  ]);
  const [years, classes, subjects, students, enrollments, attendance, journals, assessments, scores] = results.map((result) => result.data || []);
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
  const assignmentResult = await supabase.from("teacher_assignments").insert({ school_id: schoolResult.data.id, user_id: auth.user.id, class_id: classResult.data.id, subject_id: subject?.id || null, mode: form.role, is_homeroom: form.role === "wali_kelas" });
  if (assignmentResult.error) throw assignmentResult.error;
  return fetchRemoteData(auth.user);
}

function SetupScreen({ auth, onComplete }) {
  const metadata = auth.user.user_metadata || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: metadata.full_name || "", schoolName: metadata.school_name || "", role: metadata.role || "wali_kelas", className: "7A", subjectName: metadata.role === "guru_mapel" ? "Matematika" : "", academicYear: "2026/2027" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.fullName || !form.schoolName || !form.className) return setError("Nama, sekolah, dan kelas wajib diisi.");
    setBusy(true);
    try { onComplete(await createWorkspace(form, auth)); } catch (err) { setError(err.message || "Ruang kerja belum dapat dibuat."); } finally { setBusy(false); }
  };
  return <div className="setup-screen"><div className="setup-card"><Logo /><div className="auth-heading"><p className="eyebrow">LANGKAH PERTAMA</p><h1>Siapkan ruang kerjamu</h1><p>Data awal boleh kosong. Di sini kamu menentukan konteks kelas agar presensi, nilai, dan jurnal tidak tercampur.</p></div>{error && <div className="form-notice error">{error}</div>}<form onSubmit={submit} className="setup-form"><Field label="Nama lengkap" value={form.fullName} onChange={(value) => update("fullName", value)} placeholder="Nama guru" /><Field label="Nama sekolah" value={form.schoolName} onChange={(value) => update("schoolName", value)} placeholder="Nama sekolah" /><div className="two-fields"><label className="field"><span>Peran</span><select value={form.role} onChange={(event) => update("role", event.target.value)}><option value="wali_kelas">Wali kelas</option><option value="guru_mapel">Guru mata pelajaran</option></select></label><Field label="Tahun ajaran" value={form.academicYear} onChange={(value) => update("academicYear", value)} placeholder="2026/2027" /></div><div className="two-fields"><Field label="Kelas pertama" value={form.className} onChange={(value) => update("className", value)} placeholder="7A" /><Field label="Mata pelajaran (opsional)" value={form.subjectName} onChange={(value) => update("subjectName", value)} placeholder="Matematika" /></div><button className="primary-button wide" disabled={busy}>{busy ? "Menyiapkan…" : "Masuk ke ruang kerja"}<ArrowRight size={17} /></button></form></div></div>;
}

function Workspace({ auth, onLogout }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("dashboard");
  const [dark, setDark] = useState(() => window.localStorage.getItem("bb_dark") === "1");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const next = auth.mode === "preview" ? previewData() : await fetchRemoteData(auth.user);
      setData(next);
    } catch (err) {
      setError(err.message || "Data belum dapat dibaca.");
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [auth]);
  useEffect(() => { window.localStorage.setItem("bb_dark", dark ? "1" : "0"); }, [dark]);

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
    addStudent: async (draft) => {
      try {
        if (auth.mode === "preview") {
          const next = { ...data, students: [...data.students], classes: [...data.classes] };
          let classRow = next.classes.find((item) => item.name.toLowerCase() === text(draft.class_name).toLowerCase());
          if (draft.class_name && !classRow) { classRow = { id: id("class"), name: draft.class_name, active: true }; next.classes.push(classRow); }
          next.students.push({ ...draft, id: id("student"), class_id: classRow?.id || null, active: true });
          commit(next);
        } else {
          const result = await supabase.from("students").insert({ school_id: data.school.id, full_name: draft.full_name, nis: draft.nis || null, nisn: draft.nisn || null, gender: draft.gender || null, address: draft.address || null, parent_phone: draft.parent_phone || null, active: true }).select().single();
          if (result.error) throw result.error;
          const classRow = data.classes.find((item) => item.name.toLowerCase() === text(draft.class_name).toLowerCase());
          const year = data.academicYears[0];
          if (classRow && year && result.data) await supabase.from("enrollments").insert({ school_id: data.school.id, class_id: classRow.id, student_id: result.data.id, academic_year_id: year.id, active: true });
          await refresh();
        }
        notify("success", "Data siswa berhasil ditambahkan.");
      } catch (err) { notify("error", err.message || "Siswa belum tersimpan."); }
    },
    importStudents: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "TEMPLATE_SISWA");
        let added = 0; let skipped = 0;
        if (auth.mode === "preview") {
          const next = { ...data, students: [...data.students], classes: [...data.classes] };
          const known = new Set(next.students.map((student) => text(student.nisn || student.full_name).toLowerCase()));
          for (const row of rows) {
            if (isExampleRow(row) || !text(row.full_name)) { skipped += 1; continue; }
            const name = text(row.full_name); const nisn = text(row.nisn); const className = text(row.class_name || row.kelas);
            if (!className || known.has((nisn || name).toLowerCase())) { skipped += 1; continue; }
            let classRow = next.classes.find((item) => item.name.toLowerCase() === className.toLowerCase());
            if (!classRow) { classRow = { id: id("class"), name: className, active: true }; next.classes.push(classRow); }
            next.students.push({ id: id("student"), full_name: name, nis: text(row.nis), nisn, gender: text(row.gender), address: text(row.address), parent_phone: text(row.parent_phone), class_id: classRow.id, class_name: className, active: text(row.active).toLowerCase() !== "false" });
            known.add((nisn || name).toLowerCase()); added += 1;
          }
          commit(next);
        } else {
          const known = new Set(data.students.map((student) => text(student.nisn || student.full_name).toLowerCase()));
          const year = data.academicYears[0];
          const remoteClasses = [...data.classes];
          for (const row of rows) {
            if (isExampleRow(row) || !text(row.full_name)) { skipped += 1; continue; }
            const name = text(row.full_name); const nisn = text(row.nisn); const className = text(row.class_name || row.kelas);
            if (!className || known.has((nisn || name).toLowerCase()) || !year) { skipped += 1; continue; }
            let classRow = remoteClasses.find((item) => item.name.toLowerCase() === className.toLowerCase());
            if (!classRow) {
              const classResult = await supabase.from("classes").insert({ school_id: data.school.id, academic_year_id: year.id, name: className, grade_level: className.replace(/[^0-9]/g, ""), active: true }).select().single();
              if (classResult.error) { skipped += 1; continue; }
              classRow = classResult.data; remoteClasses.push(classRow);
            }
            const result = await supabase.from("students").insert({ school_id: data.school.id, full_name: name, nis: text(row.nis) || null, nisn: nisn || null, gender: text(row.gender) || null, address: text(row.address) || null, parent_phone: text(row.parent_phone) || null, active: text(row.active).toLowerCase() !== "false" }).select().single();
            if (result.error) { skipped += 1; continue; }
            await supabase.from("enrollments").insert({ school_id: data.school.id, class_id: classRow.id, student_id: result.data.id, academic_year_id: year.id, active: true });
            known.add((nisn || name).toLowerCase()); added += 1;
          }
          await refresh();
        }
        notify("success", "Import siswa selesai: " + added + " ditambahkan, " + skipped + " dilewati.");
      } catch (err) { notify("error", err.message || "File siswa belum dapat dibaca."); }
    },
    saveAttendance: async (date, statuses, classId) => {
      const classRow = data.classes.find((item) => item.id === classId) || data.classes[0];
      const className = text(classRow?.name).toLowerCase();
      const roster = data.students.filter((student) => !classRow || student.class_id === classRow.id || text(student.class_name).toLowerCase() === className || (data.classes.length === 1 && !student.class_id && !student.class_name));
      try {
        if (auth.mode === "preview") {
          const kept = data.attendance.filter((item) => !(item.attendance_date === date && item.class_id === classRow?.id));
          const records = roster.map((student) => ({ id: id("attendance"), student_id: student.id, class_id: classRow?.id, attendance_date: date, status: statuses[student.id] || "H", note: "" }));
          commit({ ...data, attendance: [...kept, ...records] });
        } else {
          await supabase.from("attendance_records").delete().eq("school_id", data.school.id).eq("class_id", classRow.id).eq("attendance_date", date).eq("recorded_by", auth.user.id);
          const payload = roster.map((student) => ({ school_id: data.school.id, class_id: classRow.id, subject_id: null, student_id: student.id, recorded_by: auth.user.id, attendance_date: date, status: statuses[student.id] || "H" }));
          const result = await supabase.from("attendance_records").insert(payload); if (result.error) throw result.error; await refresh();
        }
        notify("success", "Presensi " + date + " berhasil disimpan.");
      } catch (err) { notify("error", err.message || "Presensi belum tersimpan."); }
    },
    addJournal: async (draft) => {
      try {
        if (auth.mode === "preview") commit({ ...data, journals: [{ ...draft, id: id("journal"), status: "complete" }, ...data.journals] });
        else { const result = await supabase.from("teaching_journals").insert({ school_id: data.school.id, class_id: draft.class_id, subject_id: draft.subject_id || null, created_by: auth.user.id, journal_date: draft.journal_date, topic: draft.topic, activity: draft.activity, reflection: draft.reflection, status: "complete" }); if (result.error) throw result.error; await refresh(); }
        notify("success", "Jurnal berhasil disimpan.");
      } catch (err) { notify("error", err.message || "Jurnal belum tersimpan."); }
    },
    importGrades: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "TEMPLATE_NILAI");
        const result = await saveGradeRows(rows, data, auth, refresh, commit);
        notify("success", "Import nilai selesai: " + result.added + " masuk, " + result.skipped + " dilewati.");
      } catch (err) { notify("error", err.message || "File nilai belum dapat dibaca."); }
    },
    addGrade: async (draft) => {
      try { const result = await saveGradeRows([draft], data, auth, refresh, commit); notify("success", result.added ? "Nilai berhasil disimpan." : "Baris nilai dilewati."); } catch (err) { notify("error", err.message || "Nilai belum tersimpan."); }
    },
  };

  const page = active === "dashboard" ? <DashboardPage data={data} setActive={setActive} />
    : active === "assistant" ? <AssistantPage data={data} />
      : active === "students" ? <StudentsPage data={data} onAdd={handlers.addStudent} onImport={handlers.importStudents} />
        : active === "attendance" ? <AttendancePage data={data} onSave={handlers.saveAttendance} />
          : active === "journal" ? <JournalPage data={data} onAdd={handlers.addJournal} />
            : active === "grades" ? <GradesPage data={data} onImport={handlers.importGrades} onAdd={handlers.addGrade} />
              : active === "reports" ? <ReportsPage data={data} />
                : <SettingsPage data={data} onLogout={logout} />;

  return <div className={dark ? "app dark" : "app"}>
    <aside className={mobileMenu ? "sidebar open" : "sidebar"}><div className="sidebar-header"><Logo /><button className="icon-button close-mobile" onClick={() => setMobileMenu(false)}><X size={18} /></button></div><div className="workspace-chip"><span className="workspace-symbol">{avatarName(data.classes[0]?.name || "BK")}</span><div><strong>{data.profile.schoolName || "Ruang kerja"}</strong><small>{roleLabel(data.profile.role)} · {data.classes.length} kelas</small></div></div><nav className="nav-list">{NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.id); setMobileMenu(false); }}><Icon size={18} /><span>{item.label}</span>{item.id === "assistant" && <em>AI</em>}</button>; })}</nav><div className="sidebar-footer"><button className={active === "settings" ? "nav-item active" : "nav-item"} onClick={() => setActive("settings")}><Settings2 size={18} /><span>Pengaturan</span></button><button className="logout-button" onClick={logout}><LogOut size={16} /><span>Keluar</span></button></div></aside>
    <main className="main"><header className="topbar"><button className="icon-button mobile-trigger" onClick={() => setMobileMenu(true)}><Menu size={19} /></button><div><span className="eyebrow">Buku Kerja Digital</span><h1>{NAV_ITEMS.find((item) => item.id === active)?.label || "Pengaturan"}</h1></div><div className="top-actions"><span className="connection-pill"><span></span>{"Database terhubung"}</span><button className="theme-button" onClick={() => setDark((current) => !current)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button><span className="top-avatar">{avatarName(data.profile.fullName)}</span></div></header><div className="content">{error && <div className="form-notice error page-notice">{error}</div>}{notice && <div className={"form-notice " + notice.type + " page-notice"}>{notice.message}</div>}{page}</div></main><nav className="mobile-nav">{NAV_ITEMS.slice(0, 5).map((item) => { const Icon = item.icon; return <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => setActive(item.id)}><Icon size={18} /><span>{item.id === "assistant" ? "Asisten" : item.label.split(" ")[0]}</span></button>; })}</nav>
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
    const student = data.students.find((item) => (studentNisn && text(item.nisn) === studentNisn) || (studentName && text(item.full_name).toLowerCase() === studentName.toLowerCase()));
    if (!student || !className || !subjectName || !title || Number.isNaN(point)) { skipped += 1; continue; }
    const grade = { id: id("grade"), student_id: student.id, student_nisn: student.nisn || studentNisn, student_name: student.full_name, class_name: className, subject_name: subjectName, academic_year: text(row.academic_year), semester: text(row.semester), assessment_title: title, assessment_category: text(row.assessment_category || "LAINNYA"), assessment_date: text(row.assessment_date) || today(), point, max_point: Number(text(row.max_point).replace(",", ".")) || 100, comment: text(row.comment) };
    if (auth.mode === "preview") { localGrades.push(grade); added += 1; continue; }
    let classRow = data.classes.find((item) => text(item.name).toLowerCase() === className.toLowerCase());
    let subjectRow = data.subjects.find((item) => text(item.name).toLowerCase() === subjectName.toLowerCase());
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
      const assessmentResult = await supabase.from("assessments").insert({ school_id: data.school.id, class_id: classRow.id, subject_id: subjectRow.id, created_by: auth.user.id, title, category: grade.assessment_category, max_point: grade.max_point, assessment_date: grade.assessment_date }).select().single();
      if (assessmentResult.error) throw assessmentResult.error;
      assessment = assessmentResult.data || null; assessmentCache[cacheKey] = assessment;
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

function DashboardPage({ data, setActive }) {
  const todayAttendance = data.attendance.filter((item) => item.attendance_date === today());
  const present = todayAttendance.filter((item) => item.status === "H").length;
  const rate = data.students.length ? Math.round((present / data.students.length) * 100) : 0;
  return <><section className="welcome-block"><div><p className="eyebrow">RUANG KERJA PRIBADI</p><h2>Selamat datang, {data.profile.fullName.split(" ")[0] || "Guru"}.</h2><p>Mulai dari data yang paling ingin kamu bereskan hari ini.</p></div><button className="primary-button" onClick={() => setActive("assistant")}><Sparkles size={17} /> Tanya Asisten Guru</button></section><div className="stat-grid"><Stat label="Siswa aktif" value={data.students.length} meta={data.classes.length + " kelas tercatat"} icon={Users} tone="purple" /><Stat label="Kehadiran hari ini" value={rate + "%"} meta={todayAttendance.length ? present + " hadir tercatat" : "Belum diisi"} icon={CalendarCheck2} tone="green" /><Stat label="Jurnal tersimpan" value={data.journals.length} meta="catatan pembelajaran" icon={BookOpen} tone="amber" /><Stat label="Nilai tersimpan" value={data.grades.length} meta="baris penilaian" icon={ClipboardList} tone="blue" /></div><div className="dashboard-grid"><div className="panel empty-panel"><div className="panel-icon"><FileSpreadsheet size={20} /></div><h3>{data.students.length ? "Data kelas sudah mulai terisi" : "Mulai dari data siswa"}</h3><p>{data.students.length ? "Lanjutkan dengan presensi, jurnal, atau penilaian agar rekap terbentuk otomatis." : "Unduh template, isi data siswa, lalu import. Kamu juga bisa menambah satu per satu."}</p><div className="button-row"><button className="primary-button" onClick={() => setActive("students")}><Users size={16} /> Kelola siswa</button><button className="secondary-button" onClick={() => setActive("assistant")}><Sparkles size={16} /> Minta bantuan</button></div></div><div className="panel ai-card"><div className="ai-orb"><Sparkles size={20} /></div><p className="eyebrow">ASISTEN GURU</p><h3>Tulis perintahmu dengan bahasa biasa.</h3><p>Contoh: “Buatkan refleksi pembelajaran dari jurnal hari ini.”</p><button className="ghost-light" onClick={() => setActive("assistant")}>Buka Asisten <ArrowRight size={16} /></button></div></div><div className="panel checklist"><div className="panel-head"><div><p className="eyebrow">ALUR KERJA</p><h3>Yang bisa dibereskan hari ini</h3></div></div><div className="checklist-grid"><QuickTask done={data.students.length > 0} title="Masukkan data siswa" desc="Import Excel atau tambah manual" onClick={() => setActive("students")} /><QuickTask done={data.attendance.some((item) => item.attendance_date === today())} title="Isi presensi" desc="Tandai H, S, I, atau A" onClick={() => setActive("attendance")} /><QuickTask done={data.journals.length > 0} title="Tulis jurnal" desc="Simpan catatan pembelajaran" onClick={() => setActive("journal")} /><QuickTask done={data.grades.length > 0} title="Rekap nilai" desc="Import atau input nilai" onClick={() => setActive("grades")} /></div></div></>;
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
  const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ prompt, userKey: window.localStorage.getItem(API_KEY) || "", context: { profile: data.profile, classes: data.classes.map((item) => item.name), subjects: data.subjects.map((item) => item.name), studentCount: data.students.length, attendance: data.attendance.slice(0, 300), journals: data.journals.slice(0, 80), grades: data.grades.slice(0, 300) } }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Asisten belum dapat merespons.");
  return payload.reply;
}

function ImportActions({ onImport, accept = ".xlsx,.xls,.csv" }) { const inputId = id("file"); return <div className="import-actions"><a className="secondary-button" href={TEMPLATE_URL} download><Download size={16} /> Unduh template</a><label className="primary-button file-button" htmlFor={inputId}><Upload size={16} /> Import file<input id={inputId} type="file" accept={accept} onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ""; }} /></label></div>; }

function StudentsPage({ data, onAdd, onImport }) {
  const [showForm, setShowForm] = useState(false); const [query, setQuery] = useState(""); const [form, setForm] = useState({ full_name: "", nis: "", nisn: "", gender: "", address: "", parent_phone: "", class_name: data.classes[0]?.name || "" });
  const visible = data.students.filter((item) => (text(item.full_name) + " " + text(item.nis) + " " + text(item.nisn)).toLowerCase().includes(query.toLowerCase()));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); if (!form.full_name) return; await onAdd(form); setForm({ ...form, full_name: "", nis: "", nisn: "", address: "", parent_phone: "" }); setShowForm(false); };
  return <PageSection eyebrow="DATA KELAS" title="Siswa" action={<div className="section-actions"><ImportActions onImport={onImport} /><button className="primary-button" onClick={() => setShowForm((current) => !current)}><Plus size={16} /> Tambah siswa</button></div>}><div className="helper-banner"><FileSpreadsheet size={18} /><span>Format import sudah disiapkan. Isi sheet TEMPLATE_SISWA, hapus baris contoh, lalu unggah kembali.</span></div>{showForm && <form className="inline-form" onSubmit={submit}><Field label="Nama lengkap" value={form.full_name} onChange={(value) => update("full_name", value)} placeholder="Nama siswa" /><Field label="NISN" value={form.nisn} onChange={(value) => update("nisn", value)} placeholder="Opsional" /><Field label="Kelas" value={form.class_name} onChange={(value) => update("class_name", value)} placeholder="7A" /><label className="field"><span>Jenis kelamin</span><select value={form.gender} onChange={(event) => update("gender", event.target.value)}><option value="">Pilih</option><option value="L">L</option><option value="P">P</option></select></label><button className="primary-button"><Save size={15} /> Simpan</button></form>}<div className="toolbar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, NIS, atau NISN…" /></div><span className="result-count">{visible.length} siswa</span></div><div className="table-card">{visible.length === 0 ? <EmptyState title="Belum ada data siswa" desc="Tambahkan manual atau import template untuk memulai." /> : visible.map((student) => <div className="data-row" key={student.id}><span className="person-avatar">{avatarName(student.full_name)}</span><div className="person-copy"><strong>{student.full_name}</strong><small>{student.nisn || "NISN belum diisi"} · {student.class_name || data.classes.find((item) => item.id === student.class_id)?.name || "Kelas belum dipilih"}</small></div><span className="row-meta">{student.gender || "-"}</span><span className="row-meta">{student.active === false ? "Nonaktif" : "Aktif"}</span></div>)}</div></PageSection>;
}

function AttendancePage({ data, onSave }) {
  const [date, setDate] = useState(today()); const [classId, setClassId] = useState(data.classes[0]?.id || ""); const [statuses, setStatuses] = useState({});
  const classRow = data.classes.find((item) => item.id === classId) || data.classes[0];
  const roster = data.students.filter((student) => !classRow || student.class_id === classRow.id || text(student.class_name).toLowerCase() === text(classRow.name).toLowerCase() || (data.classes.length === 1 && !student.class_id && !student.class_name));
  useEffect(() => { const next = {}; roster.forEach((student) => { const record = data.attendance.find((item) => item.student_id === student.id && item.attendance_date === date && (!classId || item.class_id === classId)); next[student.id] = record?.status || "H"; }); setStatuses(next); }, [date, classId, data.students, data.attendance]);
  const counts = Object.values(statuses).reduce((result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }), {});
  return <PageSection eyebrow="CATATAN KEHADIRAN" title="Presensi" action={<button className="primary-button" onClick={() => onSave(date, statuses, classId)}><Save size={16} /> Simpan presensi</button>}><div className="control-row"><label className="compact-field"><span>Tanggal</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="compact-field"><span>Kelas</span><select value={classId} onChange={(event) => setClassId(event.target.value)}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="attendance-summary"><div><strong>{roster.length}</strong><span>Total siswa</span></div><div className="present"><strong>{counts.H || 0}</strong><span>Hadir</span></div><div className="permission"><strong>{(counts.S || 0) + (counts.I || 0)}</strong><span>Sakit / izin</span></div><div className="absent"><strong>{counts.A || 0}</strong><span>Alpa</span></div></div><div className="table-card">{roster.length === 0 ? <EmptyState title="Belum ada siswa" desc="Isi data siswa sebelum membuat presensi." /> : roster.map((student) => <div className="data-row attendance-row" key={student.id}><span className="person-avatar">{avatarName(student.full_name)}</span><div className="person-copy"><strong>{student.full_name}</strong><small>{student.nisn || "NISN belum diisi"}</small></div><div className="attendance-actions">{[["H", "Hadir"], ["S", "Sakit"], ["I", "Izin"], ["A", "Alpa"]].map(([code, label]) => <button key={code} title={label} className={statuses[student.id] === code ? "attendance-button active " + code : "attendance-button"} onClick={() => setStatuses((current) => ({ ...current, [student.id]: code }))}>{code}</button>)}</div></div>)}</div></PageSection>;
}

function JournalPage({ data, onAdd }) {
  const [form, setForm] = useState({ journal_date: today(), class_id: data.classes[0]?.id || "", subject_id: data.subjects[0]?.id || "", topic: "", activity: "", reflection: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); if (!form.topic) return; await onAdd(form); setForm((current) => ({ ...current, topic: "", activity: "", reflection: "" })); };
  return <PageSection eyebrow="CATATAN PEMBELAJARAN" title="Jurnal mengajar" action={<button className="secondary-button" onClick={() => document.getElementById("journal-topic")?.focus()}><Plus size={16} /> Tulis jurnal</button>}><form className="journal-form" onSubmit={submit}><div className="two-fields"><label className="field"><span>Tanggal</span><input type="date" value={form.journal_date} onChange={(event) => update("journal_date", event.target.value)} /></label><label className="field"><span>Kelas</span><select value={form.class_id} onChange={(event) => update("class_id", event.target.value)}>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label className="field"><span>Topik pembelajaran</span><input id="journal-topic" value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="Contoh: Pecahan dan perbandingan" /></label><label className="field"><span>Aktivitas pembelajaran</span><textarea value={form.activity} onChange={(event) => update("activity", event.target.value)} placeholder="Apa yang dilakukan siswa dan guru?" rows="3" /></label><label className="field"><span>Refleksi dan tindak lanjut</span><textarea value={form.reflection} onChange={(event) => update("reflection", event.target.value)} placeholder="Apa yang perlu diperbaiki atau dilanjutkan?" rows="3" /></label><button className="primary-button" type="submit"><Save size={16} /> Simpan jurnal</button></form><div className="list-heading"><p className="eyebrow">RIWAYAT JURNAL</p><span>{data.journals.length} catatan</span></div><div className="journal-list">{data.journals.length === 0 ? <EmptyState title="Belum ada jurnal" desc="Simpan catatan pertama untuk membangun rekap pembelajaran." /> : data.journals.map((journal) => <div className="journal-card" key={journal.id}><span className="date-block">{text(journal.journal_date).slice(5)}</span><div className="person-copy"><strong>{journal.topic}</strong><small>{data.classes.find((item) => item.id === journal.class_id)?.name || "Kelas"} · {journal.status || "complete"}</small></div></div>)}</div></PageSection>;
}

function GradesPage({ data, onImport, onAdd }) {
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ student_nisn: "", student_name: "", class_name: data.classes[0]?.name || "", subject_name: data.subjects[0]?.name || "", assessment_title: "", assessment_category: "TUGAS", assessment_date: today(), point: "", max_point: "100", comment: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => { event.preventDefault(); await onAdd(form); setShowForm(false); };
  return <PageSection eyebrow="HASIL BELAJAR" title="Penilaian" action={<div className="section-actions"><ImportActions onImport={onImport} /><button className="primary-button" onClick={() => setShowForm((current) => !current)}><Plus size={16} /> Input nilai</button></div>}><div className="helper-banner"><ClipboardList size={18} /><span>Nilai bisa diimpor untuk banyak kelas dan mata pelajaran. Gunakan NISN agar pencocokan siswa akurat.</span></div>{showForm && <form className="inline-form grades-form" onSubmit={submit}><Field label="NISN siswa" value={form.student_nisn} onChange={(value) => update("student_nisn", value)} placeholder="Disarankan" /><Field label="Nama siswa" value={form.student_name} onChange={(value) => update("student_name", value)} placeholder="Jika tanpa NISN" /><Field label="Kelas" value={form.class_name} onChange={(value) => update("class_name", value)} placeholder="7A" /><Field label="Mata pelajaran" value={form.subject_name} onChange={(value) => update("subject_name", value)} placeholder="Matematika" /><Field label="Judul penilaian" value={form.assessment_title} onChange={(value) => update("assessment_title", value)} placeholder="Tugas 1" /><Field label="Nilai" value={form.point} onChange={(value) => update("point", value)} placeholder="0-100" /><button className="primary-button"><Save size={15} /> Simpan</button></form>}<div className="grade-summary"><strong>{data.grades.length}</strong><span>baris nilai tersimpan</span><div className="grade-progress"><span style={{ width: data.students.length ? Math.min(100, Math.round((data.grades.length / Math.max(1, data.students.length)) * 100)) + "%" : "0%" }}></span></div></div><div className="table-card">{data.grades.length === 0 ? <EmptyState title="Belum ada nilai" desc="Import template nilai atau input satu nilai untuk memulai." /> : data.grades.map((grade) => <div className="data-row" key={grade.id}><span className="person-avatar blue">{avatarName(grade.student_name)}</span><div className="person-copy"><strong>{grade.student_name}</strong><small>{grade.class_name} · {grade.subject_name} · {grade.assessment_title}</small></div><strong className="score-value">{grade.point}</strong><span className="row-meta">/{grade.max_point || 100}</span></div>)}</div></PageSection>;
}

function ReportsPage({ data }) {
  const attendanceRows = data.attendance.map((row) => ({ tanggal: row.attendance_date, siswa: data.students.find((item) => item.id === row.student_id)?.full_name || "", status: row.status, kelas: data.classes.find((item) => item.id === row.class_id)?.name || "" }));
  return <PageSection eyebrow="RINGKASAN DATA" title="Rekap & laporan" action={<button className="secondary-button" onClick={() => saveRowsAsCsv("rekap-buku-kerja.csv", attendanceRows)}><Download size={16} /> Export CSV</button>}><div className="report-grid"><ReportCard icon={CalendarCheck2} title="Rekap presensi" value={data.attendance.length + " catatan"} desc="Unduh data presensi untuk direkap lebih lanjut." onClick={() => saveRowsAsCsv("rekap-presensi.csv", attendanceRows)} /><ReportCard icon={ClipboardList} title="Rekap penilaian" value={data.grades.length + " nilai"} desc="Daftar nilai yang sudah masuk ke ruang kerja." onClick={() => saveRowsAsCsv("rekap-nilai.csv", data.grades)} /><ReportCard icon={GraduationCap} title="Cakupan kelas" value={data.classes.length + " kelas"} desc="Kelas yang tersedia di ruang kerja ini." /><ReportCard icon={BookOpen} title="Jurnal mengajar" value={data.journals.length + " catatan"} desc="Jurnal yang tersimpan dan siap diperiksa." /></div></PageSection>;
}
function ReportCard({ icon: Icon, title, value, desc, onClick }) { return <div className="report-card"><div className="report-icon"><Icon size={19} /></div><strong>{title}</strong><b>{value}</b><p>{desc}</p>{onClick && <button className="text-button" onClick={onClick}>Unduh data <Download size={14} /></button>}</div>; }

function SettingsPage({ data, onLogout }) {
  const [key, setKey] = useState(() => window.localStorage.getItem(API_KEY) || ""); const [saved, setSaved] = useState(false); const [showKey, setShowKey] = useState(false);
  const save = () => { const cleaned = key.trim(); if (cleaned) window.localStorage.setItem(API_KEY, cleaned); else window.localStorage.removeItem(API_KEY); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <PageSection eyebrow="PENGATURAN" title="Pengaturan"><div className="settings-stack">
    <div className="settings-card"><div><p className="eyebrow">PROFIL</p><h3>{data.profile.fullName}</h3><p>{data.profile.schoolName} · {roleLabel(data.profile.role)}</p></div><span className="connection-pill"><span></span>Database terhubung</span></div>
    <div className="settings-card ai-settings"><div className="settings-copy"><p className="eyebrow">ASISTEN AI</p><h3>API key Gemini pribadi</h3><p>Key aplikasi akan digunakan lebih dulu. Key ini menjadi cadangan akunmu saat kuota bersama mencapai batas.</p></div><div className="key-row"><div className="key-input-wrap"><input type={showKey ? "text" : "password"} value={key} onChange={(event) => setKey(event.target.value)} placeholder="Tempel API key Gemini" /><button className="icon-button" type="button" aria-label={showKey ? "Sembunyikan API key" : "Tampilkan API key"} onClick={() => setShowKey((current) => !current)}>{showKey ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><button className="primary-button" onClick={save}><Save size={15} /> Simpan</button></div>{saved && <small className="saved-label">API key siap digunakan dari perangkat ini.</small>}<details className="tutorial-details"><summary>Video dan panduan memasukkan API key</summary><div className="video-frame"><iframe src="https://www.youtube.com/embed/mUTAq9ffk0s" title="Tutorial memasukkan API key Gemini" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe></div><ol><li>Buka Google AI Studio dan buat API key.</li><li>Salin key, tempel di kolom di atas, lalu simpan.</li><li>Buka Asisten Guru dan tulis perintah seperti biasa.</li></ol></details></div>
    <div className="settings-card"><div><p className="eyebrow">DATA</p><h3>Template import siap pakai</h3><p>Satu file resmi untuk siswa, nilai, dan presensi; petunjuk pengisian tersedia di sheet pertama.</p></div><a className="secondary-button" href={TEMPLATE_URL} download><Download size={16} /> Unduh template</a></div>
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
