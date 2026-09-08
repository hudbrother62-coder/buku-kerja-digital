import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
  LoaderCircle,
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
  Trash2,
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
const DAY_NAMES = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];
if (typeof document !== "undefined")
  document.documentElement.dataset.theme =
    window.localStorage.getItem("bb_dark") === "1" ? "dark" : "light";

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
  profile: {
    fullName: "",
    schoolName: "",
    role: "wali_kelas",
    preferences: {},
    setupComplete: false,
  },
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
  events: [],
});

function normalizeWorkspaceData(value) {
  const fallback = emptyData();
  if (!value || typeof value !== "object") return fallback;
  const arrayKeys = [
    "academicYears",
    "classes",
    "subjects",
    "students",
    "attendance",
    "journals",
    "grades",
    "assignments",
    "schedules",
    "events",
  ];
  const normalized = {
    ...fallback,
    ...value,
    profile: { ...fallback.profile, ...(value.profile || {}) },
  };
  arrayKeys.forEach((key) => {
    normalized[key] = Array.isArray(value[key]) ? value[key] : [];
  });
  normalized.profile.fullName = text(normalized.profile.fullName) || "Guru";
  normalized.profile.schoolName = text(normalized.profile.schoolName);
  normalized.profile.role = ["wali_kelas", "guru_mapel", "gabungan"].includes(
    normalized.profile.role,
  )
    ? normalized.profile.role
    : "wali_kelas";
  normalized.profile.preferences =
    normalized.profile.preferences &&
    typeof normalized.profile.preferences === "object"
      ? normalized.profile.preferences
      : {};
  return normalized;
}

const previewData = () => ({
  profile: {
    fullName: "Rina Wulandari",
    schoolName: "SMP Negeri 1",
    role: "wali_kelas",
    setupComplete: true,
  },
  school: { id: "school-preview", name: "SMP Negeri 1" },
  academicYears: [
    {
      id: "year-preview",
      label: "2026/2027",
      semester: "ganjil",
      active: true,
    },
  ],
  classes: [{ id: "class-7a", name: "7A", active: true }],
  subjects: [{ id: "subject-math", name: "Matematika" }],
  students: Array.from({ length: 32 }, (_, index) => ({
    id: `student-${index + 1}`,
    full_name:
      ["Alya Putri", "Bagas Pratama", "Citra Lestari", "Dimas Saputra"][
        index % 4
      ] + ` ${index + 1}`,
    nisn: `0098765${String(index + 1).padStart(3, "0")}`,
    gender: index % 2 ? "L" : "P",
    class_id: "class-7a",
    class_name: "7A",
    active: true,
  })),
  attendance: Array.from({ length: 30 }, (_, index) => ({
    id: `attendance-${index}`,
    student_id: `student-${index + 1}`,
    class_id: "class-7a",
    attendance_date: today(),
    status: index === 28 ? "I" : index === 29 ? "S" : "H",
  })),
  journals: Array.from({ length: 6 }, (_, index) => ({
    id: `journal-${index}`,
    journal_date: today(),
    class_id: "class-7a",
    subject_id: "subject-math",
    topic: ["Pecahan dan perbandingan", "Persamaan linear", "Bangun ruang"][
      index % 3
    ],
    activity: "Diskusi kelompok dan latihan terarah",
    reflection: "Sebagian besar siswa memahami materi.",
    status: "complete",
  })),
  grades: Array.from({ length: 32 }, (_, index) => ({
    id: `grade-${index}`,
    student_id: `student-${index + 1}`,
    student_name: `Siswa ${index + 1}`,
    class_name: "7A",
    subject_name: "Matematika",
    assessment_title: "Asesmen Harian",
    assessment_date: today(),
    point: 72 + (index % 24),
    max_point: 100,
  })),
  assignments: [
    {
      id: "assignment-preview",
      class_id: "class-7a",
      subject_id: "subject-math",
      mode: "wali_kelas",
      is_homeroom: true,
    },
  ],
  schedules: [
    {
      id: "schedule-preview",
      class_id: "class-7a",
      subject_id: "subject-math",
      day_of_week: 1,
      start_time: "07:00",
      end_time: "08:20",
      note: "Pembelajaran rutin",
      active: true,
    },
  ],
  events: [
    {
      id: "event-preview",
      class_id: "class-7a",
      subject_id: null,
      title: "Rapat koordinasi guru",
      event_date: today(),
      start_time: "13:00",
      end_time: "14:00",
      event_type: "meeting",
      note: "Ruang guru",
      all_day: false,
    },
  ],
});

function id(prefix) {
  if (globalThis.crypto?.randomUUID)
    return prefix + "-" + globalThis.crypto.randomUUID();
  return (
    prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)
  );
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

function readSessionJson(key, fallback = null) {
  try {
    return JSON.parse(window.sessionStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSessionJson(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Cache is optional; a full cache must not break a successful save. */
  }
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
  const birth = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()))
    age -= 1;
  return Number.isFinite(age) ? `${age} tahun` : "-";
}

function avatarName(name) {
  return (
    text(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join("")
      .toUpperCase() || "GB"
  );
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
  return Object.values(row).some((value) =>
    text(value).toUpperCase().includes("CONTOH"),
  );
}

async function readWorkbookRows(file, preferredSheet) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetName = workbook.Sheets[preferredSheet]
    ? preferredSheet
    : workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils
    .sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false })
    .map(normalizeRow);
}

async function readWorkbook(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  return Object.fromEntries(
    workbook.SheetNames.map((name) => [
      name,
      XLSX.utils
        .sheet_to_json(workbook.Sheets[name], { defval: "", raw: false })
        .map(normalizeRow),
    ]),
  );
}

async function saveRowsAsCsv(filename, rows) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.json_to_sheet(reportExportRows(rows));
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

async function saveRowsAsExcel(filename, rows, sheetName = "Rekap", summaryRows = []) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(reportExportRows(rows));
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  if (summaryRows.length) {
    const summarySheet = XLSX.utils.json_to_sheet(reportExportRows(summaryRows));
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Rata-rata Siswa");
  }
  XLSX.writeFile(workbook, filename);
}

function saveRowsAsWord(filename, title, rows, summaryRows = [], periodLabel = "") {
  const headers = reportHeaders(rows);
  const escapeHtml = (value) =>
    text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const tableRows = rows.length ? rows : [{ keterangan: "Belum ada data" }];
  const summaryHeaders = reportHeaders(summaryRows);
  const summaryTable = summaryRows.length ? `<h2>Rata-rata setiap siswa</h2><table><thead><tr><th>No.</th>${summaryHeaders.map((header) => `<th>${escapeHtml(header.replace(/_/g, " "))}</th>`).join("")}</tr></thead><tbody>${summaryRows.map((row,index) => `<tr><td>${index+1}</td>${summaryHeaders.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 landscape;margin:18mm}body{font-family:Arial,sans-serif;color:#172238}header{border-bottom:3px solid #7726aa;padding-bottom:12px}h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:24px 0 -10px}p{color:#596579;margin:0}table{width:100%;border-collapse:collapse;margin-top:22px;font-size:10px}th,td{border:1px solid #cfd6e2;padding:7px;text-align:left;vertical-align:top}th{background:#eef2f8;text-transform:capitalize}.footer{margin-top:22px;font-size:9px;color:#788397}</style></head><body><header><h1>${escapeHtml(title)}</h1><p>${escapeHtml(periodLabel)} · Bantu Beres Buku Kerja Digital · Dicetak ${escapeHtml(new Date().toLocaleDateString("id-ID"))}</p></header>${summaryTable}<h2>Data rinci</h2><table><thead><tr><th>No.</th>${headers.map((header) => `<th>${escapeHtml(header.replace(/_/g, " "))}</th>`).join("")}</tr></thead><tbody>${tableRows.map((row,index) => `<tr><td>${index+1}</td>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="footer">Jumlah data: ${rows.length}</p></body></html>`;
  downloadBlob(
    filename,
    new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" }),
  );
}

async function saveRowsAsPdf(filename, title, rows, summaryRows = [], periodLabel = "") {
  const { jsPDF } = await import("jspdf");
  const documentPdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });
  const headers = reportHeaders(rows);
  documentPdf.setFont("helvetica", "bold");
  documentPdf.setFontSize(16);
  documentPdf.text(title, 14, 16);
  documentPdf.setFont("helvetica", "normal");
  documentPdf.setFontSize(8);
  documentPdf.text(`${periodLabel}${periodLabel ? " · " : ""}Bantu Beres Buku Kerja Digital`, 14, 22);
  let y = 30;
  const renderLine = (values, bold = false) => {
    documentPdf.setFont("helvetica", bold ? "bold" : "normal");
    const line = values
      .map(
        (value, index) =>
          `${headers[index]?.replace(/_/g, " ")}: ${text(value)}`,
      )
      .join("   |   ");
    const wrapped = documentPdf.splitTextToSize(line, 268);
    if (y + wrapped.length * 4 > 195) {
      documentPdf.addPage();
      y = 16;
    }
    documentPdf.text(wrapped, 14, y);
    y += wrapped.length * 4 + 2;
  };
  if (summaryRows.length) {
    documentPdf.setFont("helvetica", "bold");
    documentPdf.text("Rata-rata setiap siswa", 14, y);
    y += 6;
    const summaryHeaders = reportHeaders(summaryRows);
    summaryRows.forEach((row) => {
      const line = summaryHeaders.map((header) => `${header.replace(/_/g, " ")}: ${text(row[header])}`).join("   |   ");
      const wrapped = documentPdf.splitTextToSize(line, 268);
      if (y + wrapped.length * 4 > 195) { documentPdf.addPage(); y = 16; }
      documentPdf.setFont("helvetica", "normal");
      documentPdf.text(wrapped, 14, y);
      y += wrapped.length * 4 + 2;
    });
    y += 3;
    documentPdf.setFont("helvetica", "bold");
    documentPdf.text("Data rinci", 14, y);
    y += 6;
  }
  if (!rows.length) renderLine(["Belum ada data"], false);
  else rows.forEach((row) => renderLine(headers.map((header) => row[header])));
  documentPdf.save(filename);
}

function reportHeaders(rows) {
  return Object.keys(rows[0] || { keterangan: "Belum ada data" }).filter(
    (header) => !header.startsWith("_"),
  );
}

function reportExportRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(reportHeaders([row]).map((header) => [header, row[header]])),
  );
}

function Logo() {
  return (
    <div className="brand-lockup" aria-label="Bantu Beres Buku Kerja Digital">
      <img
        src="/brand/bantu-beres-symbol.png"
        alt=""
        className="brand-symbol-img"
      />
      <span className="brand-copy">
        <strong>
          Bantu<span>Beres</span>
        </strong>
        <small>BUKU KERJA DIGITAL</small>
      </span>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const visualPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("preview") === "dashboard";

  useEffect(() => {
    if (visualPreview) {
      setAuth({
        mode: "preview",
        user: {
          id: "preview-teacher",
          email: "guru@sekolah.id",
          user_metadata: {
            full_name: "Rina Wulandari",
            school_name: "SMP Negeri 1",
            role: "wali_kelas",
          },
        },
      });
      setAuthReady(true);
      return undefined;
    }
    if (!supabase) return undefined;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuth(
        data.session
          ? {
              mode: "supabase",
              user: data.session.user,
              accessToken: data.session.access_token,
            }
          : null,
      );
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuth(
          session
            ? {
                mode: "supabase",
                user: session.user,
                accessToken: session.access_token,
              }
            : null,
        );
      },
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [visualPreview]);

  if (!authReady) return <LoadingScreen />;
  if (!auth)
    return (
      <AuthScreen
        onAuth={setAuth}
        configurationPending={!isSupabaseConfigured}
      />
    );
  return <Workspace auth={auth} onLogout={() => setAuth(null)} />;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Logo />
      <span className="boot-line"></span>
      <p>Menyiapkan ruang kerja guru…</p>
    </div>
  );
}

function authErrorMessage(error) {
  const message = String(error?.message || "");
  if (/email rate limit exceeded/i.test(message))
    return "Pendaftaran sedang terlalu ramai. Tunggu beberapa menit lalu coba kembali.";
  if (/email not confirmed/i.test(message))
    return "Akun belum aktif. Silakan hubungi pengelola aplikasi.";
  if (/invalid login credentials/i.test(message))
    return "Email atau kata sandi tidak cocok. Periksa kembali data masukmu.";
  if (/already registered|already exists|user_already_exists/i.test(message))
    return "Email ini sudah terdaftar. Pilih Masuk dan gunakan akun yang sudah ada.";
  if (/terlalu banyak percobaan|too many requests/i.test(message))
    return "Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat lalu coba kembali.";
  if (/password should be at least|kata sandi minimal/i.test(message))
    return "Kata sandi minimal 8 karakter.";
  return message || "Terjadi kesalahan. Coba lagi.";
}

function AuthScreen({ onAuth, configurationPending = false }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!form.email || !form.password || (mode === "register" && !form.name)) {
      setNotice({
        type: "error",
        message: "Lengkapi data yang wajib diisi terlebih dahulu.",
      });
      return;
    }
    if (mode === "register" && form.password.length < 8) {
      setNotice({ type: "error", message: "Kata sandi minimal 8 karakter." });
      return;
    }
    if (mode === "register" && form.password !== form.confirmPassword) {
      setNotice({
        type: "error",
        message: "Kata sandi yang diulangi belum sama.",
      });
      return;
    }
    setBusy(true);
    try {
      if (!supabase || configurationPending)
        throw new Error(
          "Database khusus Buku Kerja Digital belum dapat dibuat karena batas project Supabase akun saat ini. Tidak ada data yang diarahkan ke project lain.",
        );
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        onAuth({
          mode: "supabase",
          user: data.user,
          accessToken: data.session?.access_token,
        });
      } else {
        const { error: registerError } = await supabase.functions.invoke(
          "register-teacher",
          {
            body: {
              name: form.name.trim(),
              email: form.email.trim(),
              password: form.password,
            },
          },
        );
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        onAuth({
          mode: "supabase",
          user: data.user,
          accessToken: data.session?.access_token,
        });
      }
    } catch (error) {
      setNotice({ type: "error", message: authErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-ambient ambient-one"></div>
      <div className="auth-ambient ambient-two"></div>
      <section className="auth-story">
        <Logo />
        <div className="auth-preview-card">
          <div className="preview-top">
            <span className="preview-logo">
              <img src="/brand/bantu-beres-symbol.png" alt="" />
            </span>
            <span>Hari ini</span>
          </div>
          <strong>Apa yang ingin dibereskan?</strong>
          <div className="preview-command">
            <Sparkles size={16} />
            <span>Ringkas jurnal dan siapkan tindak lanjut…</span>
          </div>
          <div className="preview-metrics">
            <span>
              <b>32</b>Siswa
            </span>
            <span>
              <b>94%</b>Hadir
            </span>
            <span>
              <b>6</b>Jurnal
            </span>
          </div>
        </div>
        <div className="auth-story-copy">
          <p className="eyebrow">
            <span></span>RUANG KERJA KHUSUS GURU
          </p>
          <h1>
            Catatan kelas rapi.
            <br />
            <span>Mengajar jadi lebih fokus.</span>
          </h1>
          <p>
            Siswa, presensi, jurnal, nilai, dan bantuan AI hadir dalam satu
            ruang kerja yang tenang dan mudah dipakai.
          </p>
        </div>
        <div className="auth-trust">
          <span>
            <ShieldCheck size={16} /> Data per akun
          </span>
          <span>
            <FileSpreadsheet size={16} /> Import Excel
          </span>
          <span>
            <Sparkles size={16} /> Asisten AI
          </span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-card">
          <div className="auth-heading">
            <p className="eyebrow">
              {mode === "login"
                ? "SELAMAT DATANG KEMBALI"
                : "MULAI RUANG KERJA"}
            </p>
            <h1>
              {mode === "login" ? "Masuk ke Bantu Beres" : "Buat akun guru"}
            </h1>
            <p>
              {mode === "login"
                ? "Lanjutkan pekerjaan kelasmu dari tempat terakhir."
                : "Siapkan ruang kerja pribadi untuk kelas dan mata pelajaranmu."}
            </p>
          </div>
          {configurationPending && (
            <div className="setup-notice">
              <ShieldCheck size={18} />
              <span>
                <strong>Database khusus sedang menunggu slot</strong>
                <small>
                  Login akan aktif setelah project Supabase baru tersedia. Data
                  tidak memakai database aplikasi lain.
                </small>
              </span>
            </div>
          )}
          {notice && (
            <div className={"form-notice " + notice.type} role="status">
              <span>{notice.message}</span>
            </div>
          )}
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setNotice(null);
              }}
            >
              Masuk
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setNotice(null);
              }}
            >
              Daftar
            </button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === "register" && (
              <Field
                label="Nama lengkap"
                value={form.name}
                onChange={(value) => update("name", value)}
                placeholder="Contoh: Rina Wulandari"
              />
            )}
            <Field
              label="Email"
              value={form.email}
              onChange={(value) => update("email", value)}
              placeholder="nama@sekolah.sch.id"
              type="email"
            />
            <label className="field">
              <span>Kata sandi</span>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                  placeholder="Minimal 8 karakter"
                  minLength={mode === "register" ? 8 : 6}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {mode === "register" && (
              <label className="field">
                <span>Ulangi kata sandi</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) =>
                    update("confirmPassword", event.target.value)
                  }
                  placeholder="Ketik ulang kata sandi"
                  minLength={8}
                />
              </label>
            )}
            <button className="primary-button wide" disabled={busy}>
              {busy
                ? "Memproses…"
                : mode === "login"
                  ? "Masuk ke ruang kerja"
                  : "Buat akun"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-footnote">
            Dengan melanjutkan, kamu tetap menjadi pemeriksa akhir untuk semua
            catatan, nilai, dan rekomendasi AI.
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

async function fetchRemoteData(user) {
  const data = emptyData();
  const metadata = user.user_metadata || {};
  const [profileResult, schoolResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("schools")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (schoolResult.error) throw schoolResult.error;
  const profile = profileResult.data || {};
  data.profile = {
    fullName: profile.full_name || metadata.full_name || user.email || "Guru",
    schoolName: metadata.school_name || "",
    role: profile.role || metadata.role || "wali_kelas",
    preferences: profile.preferences || {},
    setupComplete: false,
  };
  const school = schoolResult.data?.[0] || null;
  if (!school) return data;
  data.school = school;
  data.profile.schoolName = school.name;
  data.profile.setupComplete = true;
  const results = await Promise.all([
    supabase
      .from("academic_years")
      .select("*")
      .eq("school_id", school.id)
      .order("active", { ascending: false }),
    supabase
      .from("classes")
      .select("*")
      .eq("school_id", school.id)
      .order("name"),
    supabase
      .from("subjects")
      .select("*")
      .eq("school_id", school.id)
      .order("name"),
    supabase
      .from("students")
      .select("*")
      .eq("school_id", school.id)
      .order("full_name"),
    supabase
      .from("enrollments")
      .select("*")
      .eq("school_id", school.id)
      .eq("active", true),
    supabase
      .from("attendance_records")
      .select("*")
      .eq("school_id", school.id)
      .order("attendance_date", { ascending: false })
      .limit(1000),
    supabase
      .from("teaching_journals")
      .select("*")
      .eq("school_id", school.id)
      .order("journal_date", { ascending: false })
      .limit(300),
    supabase
      .from("assessments")
      .select("*")
      .eq("school_id", school.id)
      .order("assessment_date", { ascending: false })
      .limit(300),
    supabase.from("assessment_scores").select("*").limit(2000),
    supabase
      .from("teacher_schedules")
      .select("*")
      .eq("school_id", school.id)
      .eq("user_id", user.id)
      .order("day_of_week")
      .order("start_time"),
    supabase
      .from("teacher_events")
      .select("*")
      .eq("school_id", school.id)
      .eq("user_id", user.id)
      .order("event_date")
      .order("start_time"),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  const [
    years,
    classes,
    subjects,
    students,
    enrollments,
    attendance,
    journals,
    assessments,
    scores,
    schedules,
    events,
  ] = results.map((result) => result.data || []);
  data.academicYears = years;
  data.classes = classes;
  data.subjects = subjects;
  const enrollmentByStudent = new Map(
    enrollments.map((item) => [item.student_id, item]),
  );
  const classById = new Map(classes.map((item) => [item.id, item]));
  data.students = students.map((student) => {
    const enrollment = enrollmentByStudent.get(student.id);
    const classRow = classById.get(enrollment?.class_id);
    return {
      ...student,
      class_id: enrollment?.class_id || null,
      class_name: classRow?.name || "",
    };
  });
  data.attendance = attendance;
  data.journals = journals;
  data.schedules = schedules;
  data.events = events;
  const assessmentMap = new Map(assessments.map((item) => [item.id, item]));
  const studentById = new Map(data.students.map((item) => [item.id, item]));
  const subjectById = new Map(subjects.map((item) => [item.id, item]));
  data.grades = scores.map((score) => {
    const assessment = assessmentMap.get(score.assessment_id) || {};
    const student = studentById.get(score.student_id);
    const classRow = classById.get(assessment.class_id);
    const subject = subjectById.get(assessment.subject_id);
    return {
      id: score.id,
      assessment_id: score.assessment_id,
      student_id: score.student_id,
      student_name: student?.full_name || "",
      student_nisn: student?.nisn || "",
      class_name: classRow?.name || "",
      subject_name: subject?.name || "",
      assessment_title: assessment.title || "",
      assessment_category: assessment.category || "",
      assessment_date: assessment.assessment_date || "",
      point: score.point,
      max_point: assessment.max_point || 100,
      comment: score.comment || "",
    };
  });
  return data;
}

async function createWorkspace(form, auth) {
  if (auth.mode === "preview") {
    const data = emptyData();
    data.profile = {
      fullName: form.fullName,
      schoolName: form.schoolName,
      role: form.role,
      setupComplete: true,
    };
    data.classes = [
      {
        id: id("class"),
        name: form.className,
        grade_level: form.className.replace(/[^0-9]/g, ""),
        active: true,
      },
    ];
    data.subjects = form.subjectName
      ? [{ id: id("subject"), name: form.subjectName }]
      : [];
    writeJson(accountKey(auth.user), data);
    return data;
  }
  const metadataResult = await supabase.auth.updateUser({
    data: {
      full_name: form.fullName,
      school_name: form.schoolName,
      role: form.role,
    },
  });
  if (metadataResult.error) throw metadataResult.error;
  const profileResult = await supabase.from("profiles").upsert(
    {
      id: auth.user.id,
      full_name: form.fullName,
      role: form.role,
      preferences: { dashboard_focus: "overview" },
    },
    { onConflict: "id" },
  );
  if (profileResult.error) throw profileResult.error;
  const schoolResult = await supabase
    .from("schools")
    .insert({
      owner_id: auth.user.id,
      name: form.schoolName,
      teacher_name: form.fullName,
    })
    .select()
    .single();
  if (schoolResult.error) throw schoolResult.error;
  const yearResult = await supabase
    .from("academic_years")
    .insert({
      school_id: schoolResult.data.id,
      label: form.academicYear,
      semester: "ganjil",
      active: true,
    })
    .select()
    .single();
  if (yearResult.error) throw yearResult.error;
  const classResult = await supabase
    .from("classes")
    .insert({
      school_id: schoolResult.data.id,
      academic_year_id: yearResult.data.id,
      name: form.className,
      grade_level: form.className.replace(/[^0-9]/g, ""),
      active: true,
    })
    .select()
    .single();
  if (classResult.error) throw classResult.error;
  let subject = null;
  if (form.subjectName) {
    const subjectResult = await supabase
      .from("subjects")
      .insert({ school_id: schoolResult.data.id, name: form.subjectName })
      .select()
      .single();
    if (subjectResult.error) throw subjectResult.error;
    subject = subjectResult.data;
  }
  const assignmentResult = await supabase.from("teacher_assignments").insert({
    school_id: schoolResult.data.id,
    user_id: auth.user.id,
    class_id: classResult.data.id,
    subject_id: subject?.id || null,
    mode: form.role,
    is_homeroom: form.role !== "guru_mapel",
  });
  if (assignmentResult.error) throw assignmentResult.error;
  return fetchRemoteData(auth.user);
}

function SetupScreen({ auth, onComplete }) {
  const metadata = auth.user.user_metadata || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const years = academicYearOptions();
  const [form, setForm] = useState({
    fullName: metadata.full_name || "",
    schoolName: metadata.school_name || "",
    role: metadata.role || "wali_kelas",
    className: "7A",
    subjectName: metadata.role === "guru_mapel" ? "Matematika" : "",
    academicYear: years[1],
  });
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.fullName || !form.schoolName || !form.className)
      return setError("Nama, sekolah, dan kelas wajib diisi.");
    if (form.role !== "wali_kelas" && !form.subjectName)
      return setError(
        "Mata pelajaran wajib diisi untuk mode guru mapel atau gabungan.",
      );
    setBusy(true);
    try {
      onComplete(await createWorkspace(form, auth));
    } catch (err) {
      setError(err.message || "Ruang kerja belum dapat dibuat.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <Logo />
        <div className="auth-heading">
          <p className="eyebrow">LANGKAH PERTAMA</p>
          <h1>Siapkan ruang kerjamu</h1>
          <p>
            Pilih mode kerja utama. Mode ini tetap bisa diubah nanti dan setiap
            kelas akan memiliki data sendiri.
          </p>
        </div>
        {error && <div className="form-notice error">{error}</div>}
        <form onSubmit={submit} className="setup-form">
          <Field
            label="Nama lengkap"
            value={form.fullName}
            onChange={(value) => update("fullName", value)}
            placeholder="Nama guru"
          />
          <Field
            label="Nama sekolah"
            value={form.schoolName}
            onChange={(value) => update("schoolName", value)}
            placeholder="Nama sekolah"
          />
          <div className="two-fields">
            <label className="field">
              <span>Mode kerja</span>
              <select
                value={form.role}
                onChange={(event) => update("role", event.target.value)}
              >
                <option value="wali_kelas">Wali kelas</option>
                <option value="guru_mapel">Guru mata pelajaran</option>
                <option value="gabungan">Wali kelas + guru mapel</option>
              </select>
            </label>
            <label className="field">
              <span>Tahun ajaran</span>
              <select
                value={form.academicYear}
                onChange={(event) => update("academicYear", event.target.value)}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-fields">
            <Field
              label="Kelas pertama"
              value={form.className}
              onChange={(value) => update("className", value)}
              placeholder="7A"
            />
            <Field
              label={
                form.role === "wali_kelas"
                  ? "Mata pelajaran (opsional)"
                  : "Mata pelajaran"
              }
              value={form.subjectName}
              onChange={(value) => update("subjectName", value)}
              placeholder="Matematika"
            />
          </div>
          <button className="primary-button wide" disabled={busy}>
            {busy ? "Menyiapkan…" : "Masuk ke ruang kerja"}
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}

function Workspace({ auth, onLogout }) {
  const [data, setData] = useState(() => {
    if (auth.mode === "preview") return previewData();
    const cached = normalizeWorkspaceData(
      readSessionJson(accountKey(auth.user), null),
    );
    return cached.profile.setupComplete ? cached : emptyData();
  });
  const [loading, setLoading] = useState(() => !data.profile.setupComplete);
  const [error, setError] = useState("");
  const [active, setActive] = useState("dashboard");
  const [dark, setDark] = useState(
    () => window.localStorage.getItem("bb_dark") === "1",
  );
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const refresh = async (blocking = false) => {
    if (blocking) setLoading(true);
    try {
      const next =
        auth.mode === "preview"
          ? previewData()
          : await fetchRemoteData(auth.user);
      setData(normalizeWorkspaceData(next));
      writeSessionJson(accountKey(auth.user), next);
      setError("");
      return next;
    } catch (err) {
      setError(err.message || "Data belum dapat dibaca.");
      throw err;
    } finally {
      if (blocking) setLoading(false);
    }
  };

  useEffect(() => {
    refresh(!data.profile.setupComplete).catch(() => {});
  }, [auth.user.id]);
  useEffect(() => {
    window.localStorage.setItem("bb_dark", dark ? "1" : "0");
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  const completeSetup = (next) => {
    setData(next);
    setError("");
  };
  const commit = (nextOrUpdater) => {
    setData((current) => {
      const next = normalizeWorkspaceData(
        typeof nextOrUpdater === "function"
          ? nextOrUpdater(current)
          : nextOrUpdater,
      );
      writeSessionJson(accountKey(auth.user), next);
      return next;
    });
  };
  const notify = (type, message) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.sessionStorage.removeItem(accountKey(auth.user));
    window.localStorage.removeItem(SESSION_KEY);
    onLogout();
  };

  if (loading) return <LoadingScreen />;
  if (!data.profile.setupComplete)
    return <SetupScreen auth={auth} onComplete={completeSetup} />;

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const notifications = [
    ...(data.events || [])
      .filter(
        (item) =>
          item.event_date >= today() &&
          item.event_date <= nextWeek.toISOString().slice(0, 10),
      )
      .map((item) => ({
        id: "event-" + item.id,
        title: item.title,
        detail: `${item.event_date}${item.all_day ? " · seharian" : ` · ${text(item.start_time).slice(0, 5)}`}`,
      })),
    ...(!data.students.length
      ? [
          {
            id: "setup-students",
            title: "Master Data belum lengkap",
            detail: "Tambahkan siswa agar presensi dan nilai dapat digunakan.",
          },
        ]
      : []),
    ...(data.students.length &&
    !data.attendance.some((item) => item.attendance_date === today())
      ? [
          {
            id: "attendance-today",
            title: "Presensi hari ini belum diisi",
            detail: "Pilih kelas dan catat kehadiran siswa.",
          },
        ]
      : []),
  ].slice(0, 8);

  const handlers = {
    saveClass: async (draft, classId = null) => {
      try {
        if (auth.mode === "preview") {
          const row = {
            id: classId || id("class"),
            name: draft.name,
            grade_level: draft.grade_level,
            active: draft.active !== false,
          };
          commit((current) => ({
            ...current,
            classes: classId
              ? current.classes.map((item) =>
                  item.id === classId ? { ...item, ...row } : item,
                )
              : [...current.classes, row],
            students: classId
              ? current.students.map((student) =>
                  student.class_id === classId
                    ? { ...student, class_name: row.name }
                    : student,
                )
              : current.students,
          }));
        } else {
          const payload = {
            school_id: data.school.id,
            academic_year_id: data.academicYears[0]?.id,
            name: draft.name,
            grade_level:
              draft.grade_level || text(draft.name).replace(/[^0-9]/g, ""),
            active: draft.active !== false,
          };
          const result = classId
            ? await supabase
                .from("classes")
                .update(payload)
                .eq("id", classId)
                .select()
                .single()
            : await supabase.from("classes").insert(payload).select().single();
          if (result.error) throw result.error;
          const row = result.data;
          commit((current) => ({
            ...current,
            classes: classId
              ? current.classes.map((item) =>
                  item.id === classId ? row : item,
                )
              : [...current.classes, row],
            students: classId
              ? current.students.map((student) =>
                  student.class_id === classId
                    ? { ...student, class_name: row.name }
                    : student,
                )
              : current.students,
          }));
        }
        notify(
          "success",
          classId
            ? "Kelas berhasil diperbarui."
            : "Kelas berhasil ditambahkan.",
        );
      } catch (err) {
        notify("error", err.message || "Kelas belum tersimpan.");
        throw err;
      }
    },
    saveSubject: async (draft, subjectId = null) => {
      try {
        if (auth.mode === "preview") {
          const row = {
            id: subjectId || id("subject"),
            name: draft.name,
            code: draft.code || "",
          };
          commit((current) => ({
            ...current,
            subjects: subjectId
              ? current.subjects.map((item) =>
                  item.id === subjectId ? row : item,
                )
              : [...current.subjects, row],
          }));
        } else {
          const payload = {
            school_id: data.school.id,
            name: draft.name,
            code: draft.code || null,
          };
          const result = subjectId
            ? await supabase
                .from("subjects")
                .update(payload)
                .eq("id", subjectId)
                .select()
                .single()
            : await supabase.from("subjects").insert(payload).select().single();
          if (result.error) throw result.error;
          const row = result.data;
          commit((current) => ({
            ...current,
            subjects: subjectId
              ? current.subjects.map((item) =>
                  item.id === subjectId ? row : item,
                )
              : [...current.subjects, row],
          }));
        }
        notify(
          "success",
          subjectId
            ? "Mata pelajaran diperbarui."
            : "Mata pelajaran ditambahkan.",
        );
      } catch (err) {
        notify("error", err.message || "Mata pelajaran belum tersimpan.");
        throw err;
      }
    },
    saveStudent: async (draft, studentId = null) => {
      try {
        if (auth.mode === "preview") {
          const classRow = data.classes.find(
            (item) => item.id === draft.class_id,
          );
          const row = {
            ...draft,
            id: studentId || id("student"),
            class_name: classRow?.name || "",
            active: draft.active !== false,
          };
          commit((current) => ({
            ...current,
            students: studentId
              ? current.students.map((item) =>
                  item.id === studentId ? { ...item, ...row } : item,
                )
              : [...current.students, row],
          }));
        } else {
          const payload = {
            school_id: data.school.id,
            full_name: draft.full_name,
            nickname: draft.nickname || null,
            nis: draft.nis || null,
            nisn: draft.nisn || null,
            gender: draft.gender || null,
            birth_date: draft.birth_date || null,
            address: draft.address || null,
            phone: draft.phone || null,
            parent_phone: draft.parent_phone || null,
            active: draft.active !== false,
          };
          const result = studentId
            ? await supabase
                .from("students")
                .update(payload)
                .eq("id", studentId)
                .select()
                .single()
            : await supabase.from("students").insert(payload).select().single();
          if (result.error) throw result.error;
          const sid = studentId || result.data.id;
          const year = data.academicYears[0];
          if (draft.class_id && year) {
            const deactivate = await supabase
              .from("enrollments")
              .update({ active: false })
              .eq("school_id", data.school.id)
              .eq("student_id", sid);
            if (deactivate.error) throw deactivate.error;
            const enrollment = await supabase.from("enrollments").upsert(
              {
                school_id: data.school.id,
                class_id: draft.class_id,
                student_id: sid,
                academic_year_id: year.id,
                active: true,
              },
              { onConflict: "class_id,student_id,academic_year_id" },
            );
            if (enrollment.error) throw enrollment.error;
          }
          const classRow = data.classes.find(
            (item) => item.id === draft.class_id,
          );
          const row = {
            ...result.data,
            class_id: draft.class_id,
            class_name: classRow?.name || "",
          };
          commit((current) => ({
            ...current,
            students: studentId
              ? current.students.map((item) =>
                  item.id === studentId ? row : item,
                )
              : [...current.students, row],
          }));
        }
        notify(
          "success",
          studentId
            ? "Data siswa berhasil diperbarui."
            : "Data siswa berhasil ditambahkan.",
        );
      } catch (err) {
        notify("error", err.message || "Data siswa belum tersimpan.");
        throw err;
      }
    },
    importMaster: async (file) => {
      try {
        const sheets = await readWorkbook(file);
        const classRows = sheets.MASTER_KELAS || [];
        const studentRows = sheets.MASTER_SISWA || sheets.TEMPLATE_SISWA || [];
        let added = 0;
        let skipped = 0;
        if (auth.mode === "preview") {
          notify(
            "success",
            `Template terbaca: ${classRows.length} kelas dan ${studentRows.length} siswa.`,
          );
          return;
        }
        const year = data.academicYears[0];
        const knownClasses = [...data.classes];
        for (const raw of classRows) {
          const row = normalizeRow(raw);
          const name = text(row.class_name || row.name);
          if (!name || isExampleRow(row)) {
            skipped += 1;
            continue;
          }
          let classRow = knownClasses.find(
            (item) => text(item.name).toLowerCase() === name.toLowerCase(),
          );
          if (!classRow) {
            const created = await supabase
              .from("classes")
              .insert({
                school_id: data.school.id,
                academic_year_id: year.id,
                name,
                grade_level:
                  text(row.grade_level) || name.replace(/[^0-9]/g, ""),
                active: text(row.active).toLowerCase() !== "false",
              })
              .select()
              .single();
            if (created.error) throw created.error;
            classRow = created.data;
            knownClasses.push(classRow);
            added += 1;
          }
        }
        const knownStudents = new Set(
          data.students.map((student) =>
            text(student.nisn || student.full_name).toLowerCase(),
          ),
        );
        for (const raw of studentRows) {
          const row = normalizeRow(raw);
          const fullName = text(row.full_name);
          const className = text(row.class_name || row.kelas);
          const key = text(row.nisn || fullName).toLowerCase();
          if (
            !fullName ||
            !className ||
            isExampleRow(row) ||
            knownStudents.has(key)
          ) {
            skipped += 1;
            continue;
          }
          const classRow = knownClasses.find(
            (item) => text(item.name).toLowerCase() === className.toLowerCase(),
          );
          if (!classRow) {
            skipped += 1;
            continue;
          }
          const created = await supabase
            .from("students")
            .insert({
              school_id: data.school.id,
              full_name: fullName,
              nickname: text(row.nickname) || null,
              nis: text(row.nis) || null,
              nisn: text(row.nisn) || null,
              gender: text(row.gender) || null,
              birth_date: text(row.birth_date) || null,
              address: text(row.address) || null,
              phone: text(row.phone) || null,
              parent_phone: text(row.parent_phone) || null,
              active: text(row.active).toLowerCase() !== "false",
            })
            .select()
            .single();
          if (created.error) throw created.error;
          const enrollment = await supabase.from("enrollments").insert({
            school_id: data.school.id,
            class_id: classRow.id,
            student_id: created.data.id,
            academic_year_id: year.id,
            active: true,
          });
          if (enrollment.error) throw enrollment.error;
          knownStudents.add(key);
          added += 1;
        }
        await refresh();
        notify(
          "success",
          `Import Master Data selesai: ${added} data masuk, ${skipped} dilewati.`,
        );
      } catch (err) {
        notify(
          "error",
          err.message || "Template Master Data belum dapat dibaca.",
        );
      }
    },
    saveAttendance: async (session, statuses, notes) => {
      const { date, classId, subjectId, sessionType, startTime, endTime } =
        session;
      const classRow =
        data.classes.find((item) => item.id === classId) || data.classes[0];
      const className = text(classRow?.name).toLowerCase();
      const roster = data.students.filter(
        (student) =>
          !classRow ||
          student.class_id === classRow.id ||
          text(student.class_name).toLowerCase() === className ||
          (data.classes.length === 1 &&
            !student.class_id &&
            !student.class_name),
      );
      const matchesSession = (item) =>
        item.attendance_date === date &&
        item.class_id === classRow?.id &&
        item.session_type === sessionType &&
        (sessionType !== "subject" ||
          (item.subject_id === subjectId &&
            text(item.start_time).slice(0, 5) === startTime &&
            text(item.end_time).slice(0, 5) === endTime));
      const records = roster.map((student) => ({
        id: id("attendance"),
        student_id: student.id,
        class_id: classRow?.id,
        subject_id: sessionType === "subject" ? subjectId : null,
        attendance_date: date,
        session_type: sessionType,
        start_time: sessionType === "subject" ? startTime || null : null,
        end_time: sessionType === "subject" ? endTime || null : null,
        status: statuses[student.id] || "H",
        note: notes[student.id] || "",
      }));
      try {
        if (auth.mode === "preview") {
          commit((current) => ({
            ...current,
            attendance: [
              ...current.attendance.filter((item) => !matchesSession(item)),
              ...records,
            ],
          }));
        } else {
          let removal = supabase
            .from("attendance_records")
            .delete()
            .eq("school_id", data.school.id)
            .eq("class_id", classRow.id)
            .eq("attendance_date", date)
            .eq("recorded_by", auth.user.id)
            .eq("session_type", sessionType);
          removal =
            sessionType === "subject"
              ? removal
                  .eq("subject_id", subjectId)
                  .eq("start_time", startTime)
                  .eq("end_time", endTime)
              : removal.is("subject_id", null);
          const removed = await removal;
          if (removed.error) throw removed.error;
          const payload = roster.map((student) => ({
            school_id: data.school.id,
            class_id: classRow.id,
            subject_id: sessionType === "subject" ? subjectId : null,
            student_id: student.id,
            recorded_by: auth.user.id,
            attendance_date: date,
            session_type: sessionType,
            start_time: sessionType === "subject" ? startTime : null,
            end_time: sessionType === "subject" ? endTime : null,
            status: statuses[student.id] || "H",
            note: notes[student.id] || null,
          }));
          const result = await supabase
            .from("attendance_records")
            .insert(payload);
          if (result.error) throw result.error;
          commit((current) => ({
            ...current,
            attendance: [
              ...current.attendance.filter((item) => !matchesSession(item)),
              ...records,
            ],
          }));
        }
        notify("success", "Presensi " + date + " berhasil disimpan.");
      } catch (err) {
        notify("error", err.message || "Presensi belum tersimpan.");
      }
    },
    importAttendance: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "PRESENSI");
        const uniqueRows = new Map();
        let skipped = 0;
        for (const raw of rows) {
          const row = normalizeRow(raw);
          const date = text(row.date || row.attendance_date);
          const className = text(row.class_name);
          const sessionType = text(
            row.session_type || "homeroom",
          ).toLowerCase();
          const status = text(row.status).toUpperCase();
          const classRow = data.classes.find(
            (item) => text(item.name).toLowerCase() === className.toLowerCase(),
          );
          const student = data.students.find(
            (item) =>
              (text(row.student_nisn) &&
                text(item.nisn) === text(row.student_nisn)) ||
              text(item.full_name).toLowerCase() ===
                text(row.student_name).toLowerCase(),
          );
          const subject =
            sessionType === "subject"
              ? data.subjects.find(
                  (item) =>
                    text(item.name).toLowerCase() ===
                    text(row.subject_name).toLowerCase(),
                )
              : null;
          const startTime =
            sessionType === "subject" ? text(row.start_time).slice(0, 5) : "";
          const endTime =
            sessionType === "subject" ? text(row.end_time).slice(0, 5) : "";
          if (
            isExampleRow(row) ||
            !date ||
            !classRow ||
            !student ||
            !["H", "S", "I", "A"].includes(status) ||
            !["homeroom", "subject"].includes(sessionType) ||
            (sessionType === "subject" && (!subject || !startTime || !endTime))
          ) {
            skipped += 1;
            continue;
          }
          const key = [
            date,
            classRow.id,
            student.id,
            sessionType,
            subject?.id || "",
            startTime,
            endTime,
          ].join("|");
          uniqueRows.set(key, {
            school_id: data.school?.id,
            class_id: classRow.id,
            subject_id: subject?.id || null,
            student_id: student.id,
            recorded_by: auth.user.id,
            attendance_date: date,
            session_type: sessionType,
            start_time: startTime || null,
            end_time: endTime || null,
            status,
            note: text(row.note) || null,
          });
        }
        const payloads = [...uniqueRows.values()];
        if (auth.mode === "preview") {
          notify(
            "success",
            `Template presensi terbaca: ${payloads.length} baris siap, ${skipped} dilewati.`,
          );
          return;
        }
        for (const payload of payloads) {
          let removal = supabase
            .from("attendance_records")
            .delete()
            .eq("school_id", payload.school_id)
            .eq("class_id", payload.class_id)
            .eq("student_id", payload.student_id)
            .eq("recorded_by", payload.recorded_by)
            .eq("attendance_date", payload.attendance_date)
            .eq("session_type", payload.session_type);
          removal =
            payload.session_type === "subject"
              ? removal
                  .eq("subject_id", payload.subject_id)
                  .eq("start_time", payload.start_time)
                  .eq("end_time", payload.end_time)
              : removal.is("subject_id", null);
          const removed = await removal;
          if (removed.error) throw removed.error;
        }
        if (payloads.length) {
          const inserted = await supabase
            .from("attendance_records")
            .insert(payloads);
          if (inserted.error) throw inserted.error;
        }
        await refresh();
        notify(
          "success",
          `Import presensi selesai: ${payloads.length} baris masuk, ${skipped} dilewati.`,
        );
      } catch (err) {
        notify("error", err.message || "File presensi belum dapat dibaca.");
      }
    },
    addJournal: async (draft) => {
      try {
        if (auth.mode === "preview")
          commit((current) => ({
            ...current,
            journals: [
              { ...draft, id: id("journal"), status: "complete" },
              ...current.journals,
            ],
          }));
        else {
          const result = await supabase
            .from("teaching_journals")
            .insert({
              school_id: data.school.id,
              class_id: draft.class_id,
              subject_id: draft.subject_id || null,
              created_by: auth.user.id,
              journal_date: draft.journal_date,
              topic: draft.topic,
              activity: draft.activity,
              reflection: draft.reflection,
              follow_up: draft.follow_up || null,
              status: "complete",
            })
            .select()
            .single();
          if (result.error) throw result.error;
          commit((current) => ({
            ...current,
            journals: [result.data, ...current.journals],
          }));
        }
        notify("success", "Jurnal berhasil disimpan.");
      } catch (err) {
        notify("error", err.message || "Jurnal belum tersimpan.");
      }
    },
    importGrades: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "NILAI");
        const result = await saveGradeRows(rows, data, auth, refresh, commit);
        notify(
          "success",
          "Import nilai selesai: " +
            result.added +
            " masuk, " +
            result.skipped +
            " dilewati.",
        );
      } catch (err) {
        notify("error", err.message || "File nilai belum dapat dibaca.");
      }
    },
    addGrade: async (draft) => {
      try {
        const result = await saveGradeRows(
          [draft],
          data,
          auth,
          refresh,
          commit,
          false,
        );
        if (!result.added)
          throw new Error(
            "Nilai belum tersimpan. Periksa siswa, kelas, mata pelajaran, dan nilai.",
          );
        notify("success", "Nilai berhasil disimpan.");
        return result;
      } catch (err) {
        notify("error", err.message || "Nilai belum tersimpan.");
        throw err;
      }
    },
    deleteRecord: async (kind, row) => {
      const tableByKind = {
        attendance: "attendance_records",
        student: "students",
        class: "classes",
        subject: "subjects",
        journal: "teaching_journals",
        grade: "assessment_scores",
        schedule: "teacher_schedules",
        event: "teacher_events",
      };
      const collectionByKind = {
        attendance: "attendance",
        student: "students",
        class: "classes",
        subject: "subjects",
        journal: "journals",
        grade: "grades",
        schedule: "schedules",
        event: "events",
      };
      const table = tableByKind[kind];
      const collection = collectionByKind[kind];
      if (!table || !collection) throw new Error("Jenis data tidak dikenali.");
      try {
        if (auth.mode !== "preview") {
          const result = await supabase.from(table).delete().eq("id", row.id);
          if (result.error) throw result.error;
        }
        commit((current) => {
          const next = {
            ...current,
            [collection]: current[collection].filter(
              (item) => item.id !== row.id,
            ),
          };
          if (kind === "student") {
            next.attendance = current.attendance.filter(
              (item) => item.student_id !== row.id,
            );
            next.grades = current.grades.filter(
              (item) => item.student_id !== row.id,
            );
          }
          if (kind === "class") {
            const studentIds = new Set(
              current.students
                .filter((item) => item.class_id === row.id)
                .map((item) => item.id),
            );
            next.students = current.students.filter(
              (item) => item.class_id !== row.id,
            );
            next.attendance = current.attendance.filter(
              (item) =>
                item.class_id !== row.id && !studentIds.has(item.student_id),
            );
            next.grades = current.grades.filter(
              (item) =>
                item.class_name !== row.name &&
                !studentIds.has(item.student_id),
            );
            next.journals = current.journals.filter(
              (item) => item.class_id !== row.id,
            );
            next.schedules = current.schedules.filter(
              (item) => item.class_id !== row.id,
            );
            next.events = (current.events || []).filter(
              (item) => item.class_id !== row.id,
            );
          }
          return next;
        });
        notify("success", "Data berhasil dihapus.");
      } catch (err) {
        notify("error", err.message || "Data belum dapat dihapus.");
        throw err;
      }
    },
    saveSchedule: async (draft, scheduleId = null) => {
      try {
        if (auth.mode === "preview") {
          const row = {
            ...draft,
            id: scheduleId || id("schedule"),
            active: true,
          };
          commit((current) => ({
            ...current,
            schedules: scheduleId
              ? current.schedules.map((item) =>
                  item.id === scheduleId ? row : item,
                )
              : [...current.schedules, row],
          }));
        } else {
          const payload = {
            school_id: data.school.id,
            user_id: auth.user.id,
            class_id: draft.class_id,
            subject_id: draft.subject_id || null,
            day_of_week: Number(draft.day_of_week),
            start_time: draft.start_time,
            end_time: draft.end_time,
            note: draft.note || null,
            active: true,
            updated_at: new Date().toISOString(),
          };
          const result = scheduleId
            ? await supabase
                .from("teacher_schedules")
                .update(payload)
                .eq("id", scheduleId)
                .select()
                .single()
            : await supabase
                .from("teacher_schedules")
                .insert(payload)
                .select()
                .single();
          if (result.error) throw result.error;
          const row = result.data;
          commit((current) => ({
            ...current,
            schedules: scheduleId
              ? current.schedules.map((item) =>
                  item.id === scheduleId ? row : item,
                )
              : [...current.schedules, row],
          }));
        }
        notify(
          "success",
          scheduleId ? "Agenda diperbarui." : "Agenda mingguan ditambahkan.",
        );
      } catch (err) {
        notify("error", err.message || "Agenda belum tersimpan.");
        throw err;
      }
    },
    saveEvent: async (draft, eventId = null) => {
      try {
        const row = {
          ...draft,
          id: eventId || id("event"),
          all_day: Boolean(draft.all_day),
        };
        if (auth.mode !== "preview") {
          const payload = {
            school_id: data.school.id,
            user_id: auth.user.id,
            class_id: draft.class_id || null,
            subject_id: draft.subject_id || null,
            title: draft.title,
            event_date: draft.event_date,
            start_time: draft.all_day ? null : draft.start_time,
            end_time: draft.all_day ? null : draft.end_time,
            event_type: draft.event_type,
            note: draft.note || null,
            all_day: Boolean(draft.all_day),
            updated_at: new Date().toISOString(),
          };
          const result = eventId
            ? await supabase
                .from("teacher_events")
                .update(payload)
                .eq("id", eventId)
                .select()
                .single()
            : await supabase
                .from("teacher_events")
                .insert(payload)
                .select()
                .single();
          if (result.error) throw result.error;
          Object.assign(row, result.data);
        }
        commit((current) => ({
          ...current,
          events: eventId
            ? (current.events || []).map((item) =>
                item.id === eventId ? row : item,
              )
            : [...(current.events || []), row],
        }));
        notify(
          "success",
          eventId
            ? "Kegiatan diperbarui."
            : "Kegiatan ditambahkan ke kalender.",
        );
      } catch (err) {
        notify("error", err.message || "Kegiatan belum tersimpan.");
        throw err;
      }
    },
    importSchedules: async (file) => {
      try {
        const rows = await readWorkbookRows(file, "JADWAL_MINGGUAN");
        let added = 0;
        let updated = 0;
        let skipped = 0;
        const known = [...data.schedules];
        if (auth.mode === "preview") {
          const valid = rows.filter(
            (row) =>
              !isExampleRow(row) &&
              text(row.day) &&
              text(row.class_name) &&
              text(row.start_time) &&
              text(row.end_time),
          );
          notify(
            "success",
            `Template agenda terbaca: ${valid.length} baris siap.`,
          );
          return;
        }
        for (const raw of rows) {
          const row = normalizeRow(raw);
          const day =
            DAY_NAMES.findIndex(
              (item) => item.toLowerCase() === text(row.day).toLowerCase(),
            ) + 1;
          const classRow = data.classes.find(
            (item) =>
              text(item.name).toLowerCase() ===
              text(row.class_name).toLowerCase(),
          );
          const subjectName = text(row.subject_name);
          const subject = subjectName
            ? data.subjects.find(
                (item) =>
                  text(item.name).toLowerCase() === subjectName.toLowerCase(),
              )
            : null;
          const startTime = text(row.start_time).slice(0, 5);
          const endTime = text(row.end_time).slice(0, 5);
          if (
            isExampleRow(row) ||
            !day ||
            !classRow ||
            (subjectName && !subject) ||
            !startTime ||
            !endTime ||
            startTime >= endTime
          ) {
            skipped += 1;
            continue;
          }
          const payload = {
            school_id: data.school.id,
            user_id: auth.user.id,
            class_id: classRow.id,
            subject_id: subject?.id || null,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            note: text(row.note) || null,
            active: text(row.active).toLowerCase() !== "false",
            updated_at: new Date().toISOString(),
          };
          const existing = known.find(
            (item) =>
              Number(item.day_of_week) === day &&
              item.class_id === classRow.id &&
              (item.subject_id || null) === payload.subject_id &&
              text(item.start_time).slice(0, 5) === startTime &&
              text(item.end_time).slice(0, 5) === endTime,
          );
          const result = existing
            ? await supabase
                .from("teacher_schedules")
                .update(payload)
                .eq("id", existing.id)
            : await supabase
                .from("teacher_schedules")
                .insert(payload)
                .select()
                .single();
          if (result.error) throw result.error;
          if (existing) updated += 1;
          else {
            added += 1;
            known.push(result.data);
          }
        }
        await refresh();
        notify(
          "success",
          `Import agenda selesai: ${added} baru, ${updated} diperbarui, ${skipped} dilewati.`,
        );
      } catch (err) {
        notify("error", err.message || "File agenda belum dapat dibaca.");
      }
    },
    updatePreferences: async (preferences) => {
      try {
        if (auth.mode !== "preview") {
          const result = await supabase
            .from("profiles")
            .update({ preferences })
            .eq("id", auth.user.id);
          if (result.error) throw result.error;
        }
        commit((current) => ({
          ...current,
          profile: { ...current.profile, preferences },
        }));
        notify("success", "Tampilan beranda disimpan.");
      } catch (err) {
        notify("error", err.message || "Preferensi belum tersimpan.");
      }
    },
    updateRole: async (role) => {
      try {
        if (auth.mode !== "preview") {
          const profile = await supabase
            .from("profiles")
            .update({ role })
            .eq("id", auth.user.id);
          if (profile.error) throw profile.error;
          const assignment = await supabase
            .from("teacher_assignments")
            .update({ mode: role, is_homeroom: role !== "guru_mapel" })
            .eq("school_id", data.school.id)
            .eq("user_id", auth.user.id);
          if (assignment.error) throw assignment.error;
          await supabase.auth.updateUser({
            data: { ...(auth.user.user_metadata || {}), role },
          });
        }
        commit((current) => ({
          ...current,
          profile: { ...current.profile, role },
        }));
        notify("success", "Mode kerja guru diperbarui.");
      } catch (err) {
        notify("error", err.message || "Mode kerja belum diperbarui.");
      }
    },
  };

  const page =
    active === "dashboard" ? (
      <DashboardPage
        data={data}
        setActive={setActive}
        onPreferences={handlers.updatePreferences}
      />
    ) : active === "assistant" ? (
      <AssistantPage data={data} />
    ) : active === "master" ? (
      <MasterDataPage
        data={data}
        onSaveClass={handlers.saveClass}
        onSaveSubject={handlers.saveSubject}
        onSaveStudent={handlers.saveStudent}
        onDelete={handlers.deleteRecord}
        onImport={handlers.importMaster}
      />
    ) : active === "attendance" ? (
      <AttendancePage
        data={data}
        onSave={handlers.saveAttendance}
        onImport={handlers.importAttendance}
      />
    ) : active === "journal" ? (
      <JournalPage
        data={data}
        onAdd={handlers.addJournal}
        onDelete={handlers.deleteRecord}
      />
    ) : active === "grades" ? (
      <GradesPage
        data={data}
        onMaster={() => setActive("master")}
        onImport={handlers.importGrades}
        onAdd={handlers.addGrade}
        onDelete={handlers.deleteRecord}
      />
    ) : active === "agenda" ? (
      <AgendaPageV2
        data={data}
        onSave={handlers.saveSchedule}
        onSaveEvent={handlers.saveEvent}
        onDelete={handlers.deleteRecord}
        onImport={handlers.importSchedules}
      />
    ) : active === "reports" ? (
      <ReportsPage data={data} setActive={setActive} onDelete={handlers.deleteRecord} />
    ) : (
      <SettingsPage
        data={data}
        onLogout={logout}
        onRoleChange={handlers.updateRole}
      />
    );

  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className={mobileMenu ? "sidebar open" : "sidebar"}>
        <div className="sidebar-header">
          <Logo />
          <button
            className="icon-button close-mobile"
            onClick={() => setMobileMenu(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-chip">
          <span className="workspace-symbol">
            {avatarName(data.classes[0]?.name || "BK")}
          </span>
          <div>
            <strong>{data.profile.schoolName || "Ruang kerja"}</strong>
            <small>
              {roleLabel(data.profile.role)} · {data.classes.length} kelas
            </small>
          </div>
        </div>
        <nav className="nav-list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={active === item.id ? "nav-item active" : "nav-item"}
                onClick={() => {
                  setActive(item.id);
                  setMobileMenu(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === "assistant" && <em>AI</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            className={active === "settings" ? "nav-item active" : "nav-item"}
            onClick={() => setActive("settings")}
          >
            <Settings2 size={18} />
            <span>Pengaturan</span>
          </button>
          <button className="logout-button" onClick={logout}>
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="icon-button mobile-trigger"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={19} />
          </button>
          <div>
            <span className="eyebrow">Buku Kerja Digital</span>
            <h1>
              {NAV_ITEMS.find((item) => item.id === active)?.label ||
                "Pengaturan"}
            </h1>
          </div>
          <div className="top-actions">
            <span className="connection-pill">
              <span></span>Database terhubung
            </span>
            <div className="notification-wrap">
              <button
                className="theme-button notification-button"
                aria-label="Buka notifikasi"
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <Bell size={17} />
                {notifications.length > 0 && <b>{notifications.length}</b>}
              </button>
              {notificationsOpen && (
                <div className="notification-panel">
                  <div>
                    <strong>Notifikasi</strong>
                    <button
                      className="icon-button"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  {notifications.length ? (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActive(
                            item.id.startsWith("event-")
                              ? "agenda"
                              : item.id === "setup-students"
                                ? "master"
                                : "attendance",
                          );
                          setNotificationsOpen(false);
                        }}
                      >
                        <span></span>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.detail}</small>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p>Semua pekerjaan penting sudah diperiksa.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="theme-button"
              onClick={() => setDark((current) => !current)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="top-avatar">
              {avatarName(data.profile.fullName)}
            </span>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="form-notice error page-notice">{error}</div>
          )}
          {notice && (
            <div className={"form-notice " + notice.type + " page-notice"}>
              {notice.message}
            </div>
          )}
          {page}
        </div>
      </main>
      <nav className="mobile-nav">
        {[
          NAV_ITEMS[0],
          NAV_ITEMS[2],
          NAV_ITEMS[3],
          NAV_ITEMS[5],
          NAV_ITEMS[6],
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={active === item.id ? "active" : ""}
              onClick={() => setActive(item.id)}
            >
              <Icon size={18} />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

async function saveGradeRows(
  rows,
  data,
  auth,
  refresh,
  commit,
  skipExamples = true,
) {
  let added = 0;
  let skipped = 0;
  const localGrades = [...data.grades];
  const savedGrades = [];
  const assessmentCache = {};
  for (const raw of rows) {
    const row = normalizeRow(raw);
    if (skipExamples && isExampleRow(row)) {
      skipped += 1;
      continue;
    }
    const studentNisn = text(row.student_nisn);
    const studentName = text(row.student_name);
    const className = text(row.class_name);
    const subjectName = text(row.subject_name);
    const title = text(row.assessment_title || row.title);
    const point = Number(text(row.point).replace(",", "."));
    const student = data.students.find(
      (item) =>
        text(row.student_id) === item.id ||
        (studentNisn && text(item.nisn) === studentNisn) ||
        (studentName &&
          text(item.full_name).toLowerCase() === studentName.toLowerCase()),
    );
    if (
      !student ||
      !className ||
      !subjectName ||
      !title ||
      !text(row.point) ||
      !Number.isFinite(point) ||
      point < 0
    ) {
      skipped += 1;
      continue;
    }
    const grade = {
      id: id("grade"),
      student_id: student.id,
      student_nisn: student.nisn || studentNisn,
      student_name: student.full_name,
      class_name: className,
      subject_name: subjectName,
      academic_year: text(row.academic_year),
      semester: text(row.semester),
      assessment_title: title,
      assessment_category: text(row.assessment_category || "LAINNYA"),
      assessment_date: text(row.assessment_date) || today(),
      point,
      max_point: Number(text(row.max_point).replace(",", ".")) || 100,
      comment: text(row.comment),
    };
    if (auth.mode === "preview") {
      localGrades.push(grade);
      added += 1;
      continue;
    }
    let classRow = data.classes.find(
      (item) =>
        item.id === text(row.class_id) ||
        text(item.name).toLowerCase() === className.toLowerCase(),
    );
    let subjectRow = data.subjects.find(
      (item) =>
        item.id === text(row.subject_id) ||
        text(item.name).toLowerCase() === subjectName.toLowerCase(),
    );
    if (!classRow) {
      const year = data.academicYears[0];
      if (!year) {
        skipped += 1;
        continue;
      }
      const classResult = await supabase
        .from("classes")
        .insert({
          school_id: data.school.id,
          academic_year_id: year.id,
          name: className,
          grade_level: className.replace(/[^0-9]/g, ""),
          active: true,
        })
        .select()
        .single();
      if (classResult.error) {
        skipped += 1;
        continue;
      }
      classRow = classResult.data;
    }
    if (!subjectRow) {
      const subjectResult = await supabase
        .from("subjects")
        .insert({ school_id: data.school.id, name: subjectName })
        .select()
        .single();
      if (subjectResult.error) {
        skipped += 1;
        continue;
      }
      subjectRow = subjectResult.data;
    }

    const cacheKey = [
      classRow.id,
      subjectRow.id,
      title,
      grade.assessment_date,
    ].join("|");
    let assessment = assessmentCache[cacheKey];
    if (!assessment) {
      const existing = await supabase
        .from("assessments")
        .select("*")
        .eq("school_id", data.school.id)
        .eq("class_id", classRow.id)
        .eq("subject_id", subjectRow.id)
        .eq("title", title)
        .eq("assessment_date", grade.assessment_date)
        .order("created_at", { ascending: true })
        .limit(1);
      if (existing.error) throw existing.error;
      assessment = existing.data?.[0] || null;
      if (!assessment) {
        const assessmentResult = await supabase
          .from("assessments")
          .insert({
            school_id: data.school.id,
            class_id: classRow.id,
            subject_id: subjectRow.id,
            created_by: auth.user.id,
            title,
            category: grade.assessment_category,
            max_point: grade.max_point,
            assessment_date: grade.assessment_date,
          })
          .select()
          .single();
        if (assessmentResult.error) throw assessmentResult.error;
        assessment = assessmentResult.data || null;
      }
      assessmentCache[cacheKey] = assessment;
    }
    if (!assessment) {
      skipped += 1;
      continue;
    }
    const scoreResult = await supabase.from("assessment_scores").upsert(
      {
        assessment_id: assessment.id,
        student_id: student.id,
        point,
        comment: grade.comment,
      },
      { onConflict: "assessment_id,student_id" },
    );
    if (scoreResult.error) throw scoreResult.error;
    savedGrades.push(grade);
    added += 1;
  }
  if (auth.mode === "preview")
    commit((current) => ({ ...current, grades: localGrades }));
  else if (rows.length === 1 && savedGrades.length) {
    const saved = savedGrades[0];
    commit((current) => {
      const sameGrade = (item) =>
        item.student_id === saved.student_id &&
        text(item.assessment_title).toLowerCase() ===
          text(saved.assessment_title).toLowerCase() &&
        text(item.assessment_date) === text(saved.assessment_date) &&
        text(item.subject_name).toLowerCase() ===
          text(saved.subject_name).toLowerCase();
      return {
        ...current,
        grades: current.grades.some(sameGrade)
          ? current.grades.map((item) =>
              sameGrade(item) ? { ...item, ...saved } : item,
            )
          : [...current.grades, saved],
      };
    });
  } else if (rows.length > 1) await refresh();
  return { added, skipped };
}

function PageSection({ eyebrow, title, action, children }) {
  return (
    <section className="page-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ConfirmDelete({ title, description, busy, onCancel, onConfirm }) {
  return createPortal(
    <div
      className="confirm-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onCancel()
      }
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <span className="danger-symbol">
          <Trash2 size={20} />
        </span>
        <div>
          <p className="eyebrow">KONFIRMASI HAPUS</p>
          <h2 id="confirm-delete-title">{title}</h2>
          <p>{description}</p>
        </div>
        <div className="confirm-actions">
          <button
            className="secondary-button"
            onClick={onCancel}
            disabled={busy}
          >
            Batal
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Trash2 size={16} />
            )}{" "}
            {busy ? "Menghapus…" : "Hapus data"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function DashboardPage({ data, setActive, onPreferences }) {
  const [classId, setClassId] = useState(
    data.profile.preferences?.dashboard_class_id || "all",
  );
  const todayAttendance = data.attendance.filter(
    (item) => item.attendance_date === today(),
  );
  const filteredStudents =
    classId === "all"
      ? data.students
      : data.students.filter((item) => item.class_id === classId);
  const filteredAttendance =
    classId === "all"
      ? todayAttendance
      : todayAttendance.filter((item) => item.class_id === classId);
  const filteredPresent = filteredAttendance.filter(
    (item) => item.status === "H",
  ).length;
  const rate = filteredAttendance.length
    ? Math.round((filteredPresent / filteredAttendance.length) * 100)
    : 0;
  const attendanceComposition = [
    { code: "H", label: "Hadir", tone: "green" },
    { code: "S", label: "Sakit", tone: "amber" },
    { code: "I", label: "Izin", tone: "blue" },
    { code: "A", label: "Alpa", tone: "red" },
  ].map((item) => {
    const count = filteredAttendance.filter((row) => row.status === item.code).length;
    return {
      ...item,
      count,
      percentage: filteredAttendance.length
        ? Math.round((count / filteredAttendance.length) * 100)
        : 0,
    };
  });
  const classAverages = data.classes.map((classRow) => {
    const studentIds = new Set(
      data.students
        .filter(
          (student) =>
            student.class_id === classRow.id ||
            text(student.class_name).toLowerCase() ===
              text(classRow.name).toLowerCase(),
        )
        .map((student) => student.id),
    );
    const values = data.grades
      .filter(
        (grade) =>
          grade.class_name === classRow.name ||
          studentIds.has(grade.student_id),
      )
      .map(
        (grade) =>
          (Number(grade.point) / Math.max(1, Number(grade.max_point || 100))) *
          100,
      )
      .filter(Number.isFinite);
    return {
      id: classRow.id,
      name: classRow.name,
      average: values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) / values.length,
          )
        : null,
      count: values.length,
    };
  });
  const highestAverage = classAverages
    .filter((item) => item.average !== null)
    .reduce(
      (best, item) => (!best || item.average > best.average ? item : best),
      null,
    );
  const agendaDates = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return date;
  });
  const upcoming = agendaDates
    .flatMap((date) => {
      const iso = date.toISOString().slice(0, 10);
      const day = date.getDay() === 0 ? 7 : date.getDay();
      const routine = data.schedules
        .filter(
          (item) => Number(item.day_of_week) === day && item.active !== false,
        )
        .map((item) => ({
          ...item,
          kind: "routine",
          date: iso,
          title:
            data.subjects.find((row) => row.id === item.subject_id)?.name ||
            "Agenda wali kelas",
        }));
      const events = (data.events || [])
        .filter((item) => item.event_date === iso)
        .map((item) => ({
          ...item,
          kind: "event",
          date: iso,
          title: item.title || "Kegiatan",
        }));
      return [...routine, ...events].sort((a, b) =>
        text(a.start_time).localeCompare(text(b.start_time)),
      );
    })
    .slice(0, 6);
  const selectClass = (value) => {
    setClassId(value);
    onPreferences({
      ...(data.profile.preferences || {}),
      dashboard_class_id: value,
    });
  };
  return (
    <>
      <section className="welcome-block">
        <div>
          <p className="eyebrow">RUANG KERJA PRIBADI</p>
          <h2>
            Selamat datang, {data.profile.fullName.split(" ")[0] || "Guru"}.
          </h2>
          <p>
            {roleLabel(data.profile.role)} ·{" "}
            {data.academicYears[0]?.label || "Tahun ajaran aktif"}
          </p>
        </div>
        <div className="welcome-actions">
          <label className="compact-field">
            <span>Ringkasan kelas</span>
            <select
              value={classId}
              onChange={(event) => selectClass(event.target.value)}
            >
              <option value="all">Semua kelas</option>
              {data.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary-button"
            onClick={() => setActive("assistant")}
          >
            <Sparkles size={17} /> Tanya Asisten
          </button>
        </div>
      </section>
      <div className="stat-grid">
        <Stat
          label="Siswa aktif"
          value={filteredStudents.length}
          meta={
            classId === "all"
              ? data.classes.length + " kelas tercatat"
              : "kelas terpilih"
          }
          icon={Users}
          tone="purple"
        />
        <Stat
          label="Kehadiran hari ini"
          value={rate + "%"}
          meta={
            filteredAttendance.length
              ? filteredPresent + " hadir"
              : "Belum diisi"
          }
          icon={CalendarCheck2}
          tone="green"
        />
        <Stat
          label="Jurnal tersimpan"
          value={data.journals.length}
          meta="dapat dibuka kembali"
          icon={BookOpen}
          tone="amber"
        />
        <Stat
          label="Nilai tersimpan"
          value={data.grades.length}
          meta="baris penilaian"
          icon={ClipboardList}
          tone="blue"
        />
      </div>
      <div className="dashboard-stack">
        <div className="panel grade-chart-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">PERBANDINGAN SELURUH KELAS</p>
              <h3>Rata-rata nilai per kelas</h3>
              <p>
                {highestAverage
                  ? `${highestAverage.name} saat ini tertinggi dengan rata-rata ${highestAverage.average}.`
                  : "Grafik akan terbentuk setelah nilai siswa disimpan."}
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => setActive("reports")}
            >
              Lihat rekap
            </button>
          </div>
          <ClassAverageChart items={classAverages} />
        </div>
        <div className="panel daily-composition-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">KOMPOSISI HARIAN</p>
              <h3>Ringkasan kehadiran hari ini</h3>
              <p>
                {filteredAttendance.length
                  ? `${filteredAttendance.length} catatan pada ${classId === "all" ? "semua kelas" : data.classes.find((item) => item.id === classId)?.name || "kelas terpilih"}.`
                  : "Presensi hari ini belum diisi."}
              </p>
            </div>
            <button className="text-button" onClick={() => setActive("attendance")}>Isi presensi</button>
          </div>
          <div className="daily-composition-table" role="table" aria-label="Komposisi kehadiran harian">
            <div className="daily-composition-head" role="row">
              <span>Status</span><span>Jumlah</span><span>Persentase</span>
            </div>
            {attendanceComposition.map((item) => (
              <div className="daily-composition-row" role="row" key={item.code}>
                <span><i className={item.tone}></i>{item.label}</span>
                <strong>{item.count}</strong>
                <span className="composition-progress"><i style={{ width: `${item.percentage}%` }}></i><b>{item.percentage}%</b></span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel teaching-agenda-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">TUJUH HARI KE DEPAN</p>
              <h3>Jadwal mengajar & kegiatan</h3>
            </div>
            <button className="text-button" onClick={() => setActive("agenda")}>
              Buka kalender
            </button>
          </div>
          <div className="dashboard-agenda-list">
            {upcoming.length ? (
              upcoming.map((item) => (
                <button
                  key={`${item.kind}-${item.id}-${item.date}`}
                  onClick={() => setActive("agenda")}
                >
                  <span
                    className={
                      item.kind === "event" ? "day-pill event" : "day-pill"
                    }
                  >
                    {new Intl.DateTimeFormat("id-ID", {
                      weekday: "short",
                      day: "numeric",
                    }).format(new Date(item.date + "T12:00:00"))}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {data.classes.find((row) => row.id === item.class_id)
                        ?.name || "Agenda umum"}{" "}
                      ·{" "}
                      {item.all_day
                        ? "Seharian"
                        : `${text(item.start_time).slice(0, 5) || "--:--"}–${text(item.end_time).slice(0, 5) || "--:--"}`}{" "}
                      · {item.kind === "event" ? "Satu kali" : "Rutin"}
                    </small>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <p className="muted-copy">
                Belum ada jadwal rutin atau kegiatan satu kali dalam tujuh hari
                ke depan.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="panel checklist">
        <div className="panel-head">
          <div>
            <p className="eyebrow">ALUR KERJA</p>
            <h3>Yang bisa dibereskan hari ini</h3>
          </div>
        </div>
        <div className="checklist-grid">
          <QuickTask
            done={data.students.length > 0}
            title="Lengkapi Master Data"
            desc="Kelas dan identitas siswa"
            onClick={() => setActive("master")}
          />
          <QuickTask
            done={filteredAttendance.length > 0}
            title="Isi presensi"
            desc="Tandai H, S, I, atau A"
            onClick={() => setActive("attendance")}
          />
          <QuickTask
            done={data.journals.length > 0}
            title="Tulis jurnal"
            desc="Simpan dan buka kembali"
            onClick={() => setActive("journal")}
          />
          <QuickTask
            done={data.grades.length > 0}
            title="Rekap nilai"
            desc="Nama siswa otomatis"
            onClick={() => setActive("grades")}
          />
        </div>
      </div>
    </>
  );
}

function ClassAverageChart({ items }) {
  const canvasRef = useRef(null);
  const available = items.filter((item) => item.average !== null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !available.length) return undefined;
    const draw = () => {
      const bounds = canvas.parentElement.getBoundingClientRect();
      const width = Math.max(280, Math.floor(bounds.width));
      const height = 220;
      const ratio = window.devicePixelRatio || 1;
      const tokens = getComputedStyle(canvas);
      const ink = tokens.getPropertyValue("--ink").trim() || "#24324a";
      const muted = tokens.getPropertyValue("--muted").trim() || "#8190a6";
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const context = canvas.getContext("2d");
      context.scale(ratio, ratio);
      context.clearRect(0, 0, width, height);
      const left = 38,
        right = 18,
        top = 20,
        bottom = 38,
        innerWidth = width - left - right,
        innerHeight = height - top - bottom;
      context.font = "11px Inter, Arial, sans-serif";
      context.fillStyle = muted;
      context.strokeStyle = "rgba(129,144,166,.2)";
      context.lineWidth = 1;
      [0, 25, 50, 75, 100].forEach((value) => {
        const y = top + innerHeight - (value / 100) * innerHeight;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(width - right, y);
        context.stroke();
        context.fillText(String(value), 5, y + 4);
      });
      const points = available.map((item, index) => ({
        ...item,
        x:
          available.length === 1
            ? left + innerWidth / 2
            : left + index * (innerWidth / (available.length - 1)),
        y: top + innerHeight - (item.average / 100) * innerHeight,
      }));
      if (points.length === 1) {
        const point = points[0];
        const barWidth = Math.min(64, Math.max(38, innerWidth * 0.12));
        const barTop = point.y;
        const barHeight = top + innerHeight - barTop;
        const gradient = context.createLinearGradient(0, barTop, 0, top + innerHeight);
        gradient.addColorStop(0, "#247fd5");
        gradient.addColorStop(1, "#8a2db4");
        context.fillStyle = gradient;
        context.beginPath();
        context.roundRect(point.x - barWidth / 2, barTop, barWidth, barHeight, 10);
        context.fill();
      } else {
        const area = context.createLinearGradient(0, top, 0, top + innerHeight);
        area.addColorStop(0, "rgba(138,45,180,.24)");
        area.addColorStop(1, "rgba(36,127,213,0)");
        context.beginPath();
        context.moveTo(points[0].x, top + innerHeight);
        points.forEach((point) => context.lineTo(point.x, point.y));
        context.lineTo(points[points.length - 1].x, top + innerHeight);
        context.closePath();
        context.fillStyle = area;
        context.fill();
        context.strokeStyle = "#8a2db4";
        context.lineWidth = 3;
        context.lineJoin = "round";
        context.beginPath();
        points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.stroke();
      }
      points.forEach((point) => {
        context.fillStyle = "#247fd5";
        context.beginPath();
        context.arc(point.x, point.y, 5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = ink;
        context.textAlign = "center";
        context.fillText(String(point.average), point.x, point.y - 10);
        context.fillStyle = muted;
        context.fillText(point.name.slice(0, 12), point.x, height - 12);
      });
      context.textAlign = "left";
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas.parentElement);
    const themeObserver = new MutationObserver(draw);
    const appRoot = canvas.closest(".app");
    if (appRoot) themeObserver.observe(appRoot, { attributes: true, attributeFilter: ["class"] });
    return () => { observer.disconnect(); themeObserver.disconnect(); };
  }, [available.map((item) => `${item.id}:${item.average}`).join("|")]);
  if (!available.length)
    return (
      <div className="chart-empty">
        <BarChart3 size={22} />
        <span>Belum ada nilai untuk dibandingkan.</span>
      </div>
    );
  return (
    <div className="class-average-chart">
      <canvas
        ref={canvasRef}
        aria-label={available
          .map((item) => `${item.name} rata-rata ${item.average}`)
          .join(", ")}
        role="img"
      />
      <div className="chart-legend">
        {available.map((item) => (
          <span key={item.id}>
            <i></i>
            {item.name}
            <b>{item.average}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, meta, icon: Icon, tone }) {
  return (
    <div className="stat-card">
      <div className={"stat-icon " + tone}>
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{meta}</small>
      </div>
    </div>
  );
}
function QuickTask({ done, title, desc, onClick }) {
  return (
    <button className="quick-task" onClick={onClick}>
      <span className={done ? "task-check done" : "task-check"}>
        {done && <Check size={13} />}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{desc}</small>
      </span>
      <ArrowRight size={15} />
    </button>
  );
}

function AssistantPage({ data }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const suggestions = [
    "Ringkas jurnal hari ini",
    "Analisis pola presensi",
    "Buat refleksi pembelajaran",
    "Susun tindak lanjut siswa",
  ];
  const send = async (value = prompt) => {
    const question = text(value);
    if (!question || busy) return;
    setPrompt("");
    setMessages((current) => [...current, { role: "user", text: question }]);
    setBusy(true);
    try {
      const answer = await askAssistant(question, data);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "error",
          text:
            error.message ||
            "Asisten belum dapat merespons. Periksa API key di Pengaturan.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="assistant-page">
      <div
        className={
          messages.length ? "assistant-intro compact" : "assistant-intro"
        }
      >
        <div className="ai-orb large">
          <Sparkles size={25} />
        </div>
        <p className="eyebrow">ASISTEN GURU</p>
        <h2>
          {messages.length
            ? "Percakapan ruang kerja"
            : "Apa yang ingin dibereskan?"}
        </h2>
        {!messages.length && (
          <p>
            Tulis perintah dengan bahasa biasa. Asisten membaca ringkasan data
            kelasmu dan memberi hasil tanpa simbol markdown yang mengganggu.
          </p>
        )}
      </div>
      <div className="chat-area">
        {messages.length === 0 && (
          <div className="suggestion-grid">
            {suggestions.map((item) => (
              <button
                className="suggestion"
                key={item}
                onClick={() => send(item)}
              >
                <Sparkles size={15} />
                <span>{item}</span>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <div className={`message ${message.role}`} key={index}>
            <span className="message-label">
              {message.role === "user"
                ? "Kamu"
                : message.role === "error"
                  ? "Perlu disiapkan"
                  : "Asisten Guru"}
            </span>
            <div className="message-body">{message.text}</div>
          </div>
        ))}
        {busy && (
          <div className="message assistant">
            <span className="message-label">Asisten Guru</span>
            <div className="typing">
              <i></i>
              <i></i>
              <i></i>
            </div>
          </div>
        )}
      </div>
      <div className="prompt-box">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Tulis perintah untuk asisten guru…"
          rows="1"
        />
        <button
          aria-label="Kirim perintah"
          className="send-button"
          disabled={!text(prompt) || busy}
          onClick={() => send()}
        >
          <ArrowRight size={18} />
        </button>
        <small>Enter untuk mengirim · Shift + Enter untuk baris baru</small>
      </div>
    </section>
  );
}

async function askAssistant(prompt, data) {
  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data?.session?.access_token || "";
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      prompt,
      userKey: window.localStorage.getItem(API_KEY) || "",
      context: {
        profile: data.profile,
        classes: data.classes.map((item) => ({ id: item.id, name: item.name })),
        subjects: data.subjects.map((item) => ({
          id: item.id,
          name: item.name,
        })),
        students: data.students.slice(0, 500).map((item) => ({
          id: item.id,
          name: item.full_name,
          nickname: item.nickname,
          class_id: item.class_id,
        })),
        attendance: data.attendance.slice(0, 1000),
        journals: data.journals.slice(0, 120),
        grades: data.grades.slice(0, 600),
        schedules: data.schedules.slice(0, 100),
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(payload.error || "Asisten belum dapat merespons.");
  return payload.reply;
}

function ImportActions({ onImport, accept = ".xlsx,.xls,.csv" }) {
  const [inputId] = useState(() => id("file"));
  return (
    <div className="import-actions">
      <a className="secondary-button" href={TEMPLATE_URL} download>
        <Download size={16} /> Unduh template
      </a>
      <label className="primary-button file-button" htmlFor={inputId}>
        <Upload size={16} /> Import file
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function MasterDataPage({
  data,
  onSaveClass,
  onSaveSubject,
  onSaveStudent,
  onDelete,
  onImport,
}) {
  const firstClassId = data.classes[0]?.id || "";
  const [classId, setClassId] = useState(firstClassId || "all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("student");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [saveState, setSaveState] = useState("idle");
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const selectedClassId = classId === "all" ? firstClassId : classId;
  const blankStudent = () => ({
    full_name: "",
    nickname: "",
    nis: "",
    nisn: "",
    gender: "",
    birth_date: "",
    address: "",
    phone: "",
    parent_phone: "",
    class_id: selectedClassId || firstClassId,
    active: true,
  });
  const blankClass = () => ({ name: "", grade_level: "", active: true });
  const blankSubject = () => ({ name: "", code: "" });
  const [studentForm, setStudentForm] = useState(blankStudent);
  const [classForm, setClassForm] = useState(blankClass);
  const [subjectForm, setSubjectForm] = useState(blankSubject);

  const classById = useMemo(
    () => new Map(data.classes.map((row) => [row.id, row])),
    [data.classes],
  );
  const studentCountByClass = useMemo(() => {
    const counts = new Map();
    data.students.forEach((student) =>
      counts.set(student.class_id, (counts.get(student.class_id) || 0) + 1),
    );
    return counts;
  }, [data.students]);
  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return data.students.filter((item) => {
      if (classId !== "all" && item.class_id !== classId) return false;
      if (!needle) return true;
      return [item.full_name, item.nickname, item.nis, item.nisn]
        .map(text)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data.students, classId, deferredQuery]);

  const resetModal = (type) => {
    setEditingId(null);
    setFormError("");
    setSaveState("idle");
    if (type === "student") setStudentForm(blankStudent());
    if (type === "class") setClassForm(blankClass());
    if (type === "subject") setSubjectForm(blankSubject());
  };
  const openCreate = (type = "student") => {
    setModalType(type);
    resetModal(type);
    setModalOpen(true);
  };
  const switchType = (type) => {
    if (saving || type === modalType) return;
    setModalType(type);
    resetModal(type);
  };
  const openEditStudent = (student) => {
    setModalType("student");
    setEditingId(student.id);
    setStudentForm({
      ...blankStudent(),
      ...student,
      class_id: student.class_id || selectedClassId || firstClassId,
    });
    setFormError("");
    setSaveState("idle");
    setModalOpen(true);
  };
  const openEditClass = (row) => {
    setModalType("class");
    setEditingId(row.id);
    setClassForm({
      name: row.name,
      grade_level: row.grade_level || "",
      active: row.active !== false,
    });
    setFormError("");
    setSaveState("idle");
    setModalOpen(true);
  };
  const openEditSubject = (row) => {
    setModalType("subject");
    setEditingId(row.id);
    setSubjectForm({ name: row.name, code: row.code || "" });
    setFormError("");
    setSaveState("idle");
    setModalOpen(true);
  };
  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setFormError("");
    setSaveState("idle");
  };

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = document.querySelector(".master-modal");
    dialog?.querySelector("button")?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) closeModal();
      if (event.key === "Tab") {
        const items = [
          ...dialog.querySelectorAll(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
          ),
        ];
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen, saving]);

  const submitModal = async (event) => {
    event.preventDefault();
    if (submitLock.current || saveState === "success") return;
    setFormError("");

    if (modalType === "student") {
      if (!studentForm.full_name.trim())
        return setFormError("Nama lengkap siswa wajib diisi.");
      if (!studentForm.class_id)
        return setFormError(
          "Tambahkan kelas terlebih dahulu, lalu pilih kelas siswa.",
        );
      const duplicateNisn =
        studentForm.nisn &&
        data.students.some(
          (row) =>
            row.id !== editingId && text(row.nisn) === text(studentForm.nisn),
        );
      if (duplicateNisn)
        return setFormError("NISN tersebut sudah dipakai oleh siswa lain.");
    }
    if (modalType === "class") {
      if (!classForm.name.trim())
        return setFormError("Nama kelas wajib diisi.");
      if (
        data.classes.some(
          (row) =>
            row.id !== editingId &&
            text(row.name).toLowerCase() === text(classForm.name).toLowerCase(),
        )
      )
        return setFormError("Kelas dengan nama tersebut sudah tersedia.");
    }
    if (modalType === "subject") {
      if (!subjectForm.name.trim())
        return setFormError("Nama mata pelajaran wajib diisi.");
      if (
        data.subjects.some(
          (row) =>
            row.id !== editingId &&
            text(row.name).toLowerCase() ===
              text(subjectForm.name).toLowerCase(),
        )
      )
        return setFormError("Mata pelajaran tersebut sudah tersedia.");
    }

    submitLock.current = true;
    setSaving(true);
    setSaveState("saving");
    try {
      if (modalType === "student") await onSaveStudent(studentForm, editingId);
      if (modalType === "class") await onSaveClass(classForm, editingId);
      if (modalType === "subject") await onSaveSubject(subjectForm, editingId);
      setSaveState("success");
      window.setTimeout(() => {
        setModalOpen(false);
        setSaveState("idle");
        setSaving(false);
        submitLock.current = false;
      }, 700);
    } catch (error) {
      setFormError(error.message || "Data belum dapat disimpan. Coba lagi.");
      setSaveState("error");
      setSaving(false);
      submitLock.current = false;
    }
  };

  const modalCopy = {
    student: {
      eyebrow: editingId ? "EDIT DATA SISWA" : "SISWA BARU",
      title: editingId ? "Perbarui identitas siswa" : "Tambahkan siswa",
      description:
        "Data ini menjadi sumber nama untuk presensi, penilaian, jurnal, dan rekap.",
      saveLabel: editingId ? "Simpan perubahan siswa" : "Simpan siswa",
    },
    class: {
      eyebrow: editingId ? "EDIT KELAS" : "KELAS BARU",
      title: editingId ? "Perbarui data kelas" : "Tambahkan kelas",
      description:
        "Kelas memisahkan daftar siswa, presensi, nilai, dan agenda mengajar.",
      saveLabel: editingId ? "Simpan perubahan kelas" : "Simpan kelas",
    },
    subject: {
      eyebrow: editingId ? "EDIT MATA PELAJARAN" : "MATA PELAJARAN BARU",
      title: editingId ? "Perbarui mata pelajaran" : "Tambahkan mata pelajaran",
      description:
        "Mata pelajaran digunakan pada presensi mapel, penilaian, jurnal, dan agenda.",
      saveLabel: editingId ? "Simpan perubahan mapel" : "Simpan mata pelajaran",
    },
  }[modalType];
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.kind, deleteTarget.row);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageSection
      eyebrow="SUMBER DATA UTAMA"
      title="Master Data"
      action={
        <div className="section-actions">
          <ImportActions onImport={onImport} />
          <button
            className="primary-button"
            onClick={() =>
              openCreate(data.classes.length ? "student" : "class")
            }
          >
            <Plus size={16} /> Tambah master data
          </button>
        </div>
      }
    >
      <div className="helper-banner">
        <FileSpreadsheet size={18} />
        <span>
          Kelola kelas, siswa, dan mata pelajaran dari satu tempat. Data yang
          disimpan langsung tersedia di presensi, nilai, jurnal, dan agenda.
        </span>
      </div>

      <div className="master-summary-grid">
        <article>
          <span className="summary-icon purple">
            <Users size={18} />
          </span>
          <div>
            <strong>{data.students.length}</strong>
            <small>Siswa aktif</small>
          </div>
        </article>
        <article>
          <span className="summary-icon blue">
            <GraduationCap size={18} />
          </span>
          <div>
            <strong>{data.classes.length}</strong>
            <small>Kelas</small>
          </div>
        </article>
        <article>
          <span className="summary-icon amber">
            <BookOpen size={18} />
          </span>
          <div>
            <strong>{data.subjects.length}</strong>
            <small>Mata pelajaran</small>
          </div>
        </article>
      </div>
      <details className="master-catalog panel">
        <summary>
          <div>
            <p className="eyebrow">KELAS & MATA PELAJARAN</p>
            <strong>Kelola data pendukung</strong>
          </div>
          <ChevronDown size={18} />
        </summary>
        <div className="catalog-groups">
          <section>
            <h3>Kelas</h3>
            {data.classes.map((row) => (
              <div className="catalog-row" key={row.id}>
                <span>
                  {row.name}
                  <small>{studentCountByClass.get(row.id) || 0} siswa</small>
                </span>
                <div>
                  <button
                    className="icon-button"
                    onClick={() => openEditClass(row)}
                    aria-label={"Edit " + row.name}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-button danger-icon"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "class",
                        row,
                        title: `Hapus kelas ${row.name}?`,
                        description:
                          "Siswa di kelas ini beserta presensi, nilai, jurnal, dan agenda terkait akan ikut dihapus.",
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </section>
          <section>
            <h3>Mata pelajaran</h3>
            {data.subjects.map((row) => (
              <div className="catalog-row" key={row.id}>
                <span>
                  {row.name}
                  <small>{row.code || "Tanpa kode"}</small>
                </span>
                <div>
                  <button
                    className="icon-button"
                    onClick={() => openEditSubject(row)}
                    aria-label={"Edit " + row.name}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-button danger-icon"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "subject",
                        row,
                        title: `Hapus ${row.name}?`,
                        description:
                          "Mata pelajaran dihapus dan hubungan agenda terkait akan dibersihkan.",
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      </details>

      <div className="master-layout">
        <aside className="class-manager">
          <div className="panel-head">
            <div>
              <p className="eyebrow">DAFTAR KELAS</p>
              <h3>{data.classes.length} kelas</h3>
            </div>
          </div>
          <button
            className={
              classId === "all" ? "class-choice active" : "class-choice"
            }
            onClick={() => setClassId("all")}
          >
            <span>
              Semua kelas<small>Seluruh siswa</small>
            </span>
            <b>{data.students.length}</b>
          </button>
          {data.classes.map((row) => (
            <div
              className={
                classId === row.id
                  ? "class-choice-wrap active"
                  : "class-choice-wrap"
              }
              key={row.id}
            >
              <button
                className="class-choice"
                onClick={() => setClassId(row.id)}
              >
                <span>
                  {row.name}
                  <small>Tingkat {row.grade_level || "-"}</small>
                </span>
                <b>{studentCountByClass.get(row.id) || 0}</b>
              </button>
              <button
                className="class-edit-button"
                aria-label={"Edit kelas " + row.name}
                onClick={() => openEditClass(row)}
              >
                <Pencil size={13} />
              </button>
            </div>
          ))}
        </aside>

        <div className="master-content">
          <div className="toolbar">
            <div className="search-box">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, panggilan, NIS, atau NISN…"
              />
            </div>
            <span className="result-count">{visible.length} siswa</span>
          </div>
          <div className="table-card">
            {visible.length === 0 ? (
              <EmptyState
                title="Belum ada siswa di kelas ini"
                desc="Tekan Tambah master data atau import template resmi."
              />
            ) : (
              visible.map((student) => (
                <div className="data-row student-row" key={student.id}>
                  <span className="person-avatar">
                    {avatarName(student.full_name)}
                  </span>
                  <div className="person-copy">
                    <strong>
                      {student.full_name}
                      {student.nickname && <em>“{student.nickname}”</em>}
                    </strong>
                    <small>
                      {student.nisn || "NISN belum diisi"} ·{" "}
                      {student.class_name ||
                        classById.get(student.class_id)?.name ||
                        "Belum ada kelas"}
                    </small>
                  </div>
                  <span className="row-meta">
                    {ageFromBirthDate(student.birth_date)}
                  </span>
                  <span className="row-meta phone-meta">
                    <Phone size={13} />
                    {student.phone || student.parent_phone || "-"}
                  </span>
                  <div className="row-actions">
                    <button
                      className="row-action"
                      onClick={() => openEditStudent(student)}
                    >
                      <Pencil size={15} /> Edit
                    </button>
                    <button
                      className="row-action danger"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "student",
                          row: student,
                          title: `Hapus ${student.full_name}?`,
                          description:
                            "Data siswa, presensi, nilai, dan hubungan kelasnya akan dihapus secara permanen.",
                        })
                      }
                    >
                      <Trash2 size={15} /> Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {modalOpen &&
        createPortal(
          <div
            className="master-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <section
              className="master-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="master-modal-title"
            >
              <div className="master-modal-head">
                <div>
                  <p className="eyebrow">
                    {editingId ? modalCopy.eyebrow : "TAMBAH MASTER DATA"}
                  </p>
                  <h2 id="master-modal-title">
                    {editingId
                      ? modalCopy.title
                      : "Pilih data yang ingin dikelola"}
                  </h2>
                  {editingId && <p>{modalCopy.description}</p>}
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Tutup popup"
                  onClick={closeModal}
                  disabled={saving}
                >
                  <X size={18} />
                </button>
              </div>
              {!editingId && (
                <div
                  className="master-modal-tabs"
                  role="tablist"
                  aria-label="Jenis Master Data"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modalType === "student"}
                    className={modalType === "student" ? "active" : ""}
                    onClick={() => switchType("student")}
                    disabled={saving}
                  >
                    <Users size={17} />
                    <span>Tambah siswa</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modalType === "class"}
                    className={modalType === "class" ? "active" : ""}
                    onClick={() => switchType("class")}
                    disabled={saving}
                  >
                    <GraduationCap size={17} />
                    <span>Tambah kelas</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={modalType === "subject"}
                    className={modalType === "subject" ? "active" : ""}
                    onClick={() => switchType("subject")}
                    disabled={saving}
                  >
                    <BookOpen size={17} />
                    <span>Tambah mata pelajaran</span>
                  </button>
                </div>
              )}

              <form className="master-modal-form" onSubmit={submitModal}>
                {!editingId && (
                  <div className="master-modal-copy">
                    <span
                      className={
                        "summary-icon " +
                        (modalType === "student"
                          ? "purple"
                          : modalType === "class"
                            ? "blue"
                            : "amber")
                      }
                    >
                      {modalType === "student" ? (
                        <Users size={18} />
                      ) : modalType === "class" ? (
                        <GraduationCap size={18} />
                      ) : (
                        <BookOpen size={18} />
                      )}
                    </span>
                    <div>
                      <p className="eyebrow">{modalCopy.eyebrow}</p>
                      <h3>{modalCopy.title}</h3>
                      <p>{modalCopy.description}</p>
                    </div>
                  </div>
                )}
                {formError && (
                  <div className="form-notice error" role="alert">
                    {formError}
                  </div>
                )}

                <div className="master-modal-body">
                  {modalType === "student" && (
                    <>
                      {data.classes.length === 0 && (
                        <div className="form-notice warning">
                          Belum ada kelas. Pilih tab Tambah kelas dan simpan
                          kelas pertama terlebih dahulu.
                        </div>
                      )}
                      <div className="master-form-grid">
                        <Field
                          label="Nama lengkap"
                          value={studentForm.full_name}
                          onChange={(value) =>
                            setStudentForm((current) => ({
                              ...current,
                              full_name: value,
                            }))
                          }
                          placeholder="Nama sesuai data sekolah"
                        />
                        <Field
                          label="Nama panggilan"
                          value={studentForm.nickname}
                          onChange={(value) =>
                            setStudentForm((current) => ({
                              ...current,
                              nickname: value,
                            }))
                          }
                          placeholder="Nama yang biasa dipakai"
                        />
                        <Field
                          label="NIS"
                          value={studentForm.nis}
                          onChange={(value) =>
                            setStudentForm((current) => ({
                              ...current,
                              nis: value,
                            }))
                          }
                          placeholder="Opsional"
                        />
                        <Field
                          label="NISN"
                          value={studentForm.nisn}
                          onChange={(value) =>
                            setStudentForm((current) => ({
                              ...current,
                              nisn: value,
                            }))
                          }
                          placeholder="Opsional"
                        />
                        <label className="field">
                          <span>Kelas</span>
                          <select
                            value={studentForm.class_id}
                            onChange={(event) =>
                              setStudentForm((current) => ({
                                ...current,
                                class_id: event.target.value,
                              }))
                            }
                          >
                            <option value="">Pilih kelas</option>
                            {data.classes.map((row) => (
                              <option key={row.id} value={row.id}>
                                {row.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Jenis kelamin</span>
                          <select
                            value={studentForm.gender || ""}
                            onChange={(event) =>
                              setStudentForm((current) => ({
                                ...current,
                                gender: event.target.value,
                              }))
                            }
                          >
                            <option value="">Pilih</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Tanggal lahir</span>
                          <input
                            type="date"
                            value={studentForm.birth_date || ""}
                            onChange={(event) =>
                              setStudentForm((current) => ({
                                ...current,
                                birth_date: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <Field
                          label="Nomor HP siswa"
                          value={studentForm.phone || ""}
                          onChange={(value) =>
                            setStudentForm((current) => ({
                              ...current,
                              phone: value,
                            }))
                          }
                          placeholder="Opsional"
                        />
                        <Field
                          label="Nomor HP orang tua"
                          value={studentForm.parent_phone || ""}
                          onChange={(value) =>
                            setStudentForm((current) => ({
                              ...current,
                              parent_phone: value,
                            }))
                          }
                          placeholder="Opsional"
                        />
                        <label className="field field-wide">
                          <span>Alamat</span>
                          <textarea
                            value={studentForm.address || ""}
                            onChange={(event) =>
                              setStudentForm((current) => ({
                                ...current,
                                address: event.target.value,
                              }))
                            }
                            rows="2"
                            placeholder="Alamat tempat tinggal"
                          />
                        </label>
                      </div>
                    </>
                  )}
                  {modalType === "class" && (
                    <div className="master-form-grid compact-grid">
                      <Field
                        label="Nama kelas"
                        value={classForm.name}
                        onChange={(value) =>
                          setClassForm((current) => ({
                            ...current,
                            name: value,
                          }))
                        }
                        placeholder="Contoh: 8B"
                      />
                      <Field
                        label="Tingkat"
                        value={classForm.grade_level}
                        onChange={(value) =>
                          setClassForm((current) => ({
                            ...current,
                            grade_level: value,
                          }))
                        }
                        placeholder="Contoh: 8"
                      />
                    </div>
                  )}
                  {modalType === "subject" && (
                    <div className="master-form-grid compact-grid">
                      <Field
                        label="Nama mata pelajaran"
                        value={subjectForm.name}
                        onChange={(value) =>
                          setSubjectForm((current) => ({
                            ...current,
                            name: value,
                          }))
                        }
                        placeholder="Contoh: Matematika"
                      />
                      <Field
                        label="Kode mapel"
                        value={subjectForm.code}
                        onChange={(value) =>
                          setSubjectForm((current) => ({
                            ...current,
                            code: value,
                          }))
                        }
                        placeholder="Opsional, contoh: MTK"
                      />
                    </div>
                  )}
                </div>

                <div className="master-modal-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Batal
                  </button>
                  <button
                    className={
                      "primary-button master-save-button " +
                      (saveState === "success" ? "is-success" : "")
                    }
                    type="submit"
                    disabled={
                      saving ||
                      (modalType === "student" && data.classes.length === 0)
                    }
                  >
                    {saveState === "saving" ? (
                      <>
                        <LoaderCircle className="spin" size={17} /> Menyimpan…
                      </>
                    ) : saveState === "success" ? (
                      <>
                        <CheckCircle2 size={17} /> Berhasil disimpan
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {modalCopy.saveLabel}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
      {deleteTarget && (
        <ConfirmDelete
          title={deleteTarget.title}
          description={deleteTarget.description}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </PageSection>
  );
}

function AttendancePage({ data, onSave, onImport }) {
  const initialType =
    data.profile.role === "guru_mapel" ? "subject" : "homeroom";
  const [session, setSession] = useState({
    date: today(),
    classId: data.classes[0]?.id || "",
    sessionType: initialType,
    subjectId: data.subjects[0]?.id || "",
    startTime: "07:00",
    endTime: "08:00",
  });
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const { date, classId, sessionType, subjectId, startTime, endTime } = session;
  const classRow =
    data.classes.find((item) => item.id === classId) || data.classes[0];
  const roster = data.students.filter(
    (student) =>
      !classRow ||
      student.class_id === classRow.id ||
      text(student.class_name).toLowerCase() ===
        text(classRow.name).toLowerCase() ||
      (data.classes.length === 1 && !student.class_id && !student.class_name),
  );
  useEffect(() => {
    const next = {};
    const nextNotes = {};
    roster.forEach((student) => {
      const record = data.attendance.find(
        (item) =>
          item.student_id === student.id &&
          item.attendance_date === date &&
          item.class_id === classId &&
          (item.session_type || "homeroom") === sessionType &&
          (sessionType !== "subject" || item.subject_id === subjectId),
      );
      next[student.id] = record?.status || "H";
      nextNotes[student.id] = record?.note || "";
    });
    setStatuses(next);
    setNotes(nextNotes);
  }, [date, classId, sessionType, subjectId, data.students, data.attendance]);
  const counts = Object.values(statuses).reduce(
    (result, value) => ({ ...result, [value]: (result[value] || 0) + 1 }),
    {},
  );
  const setValue = (key, value) =>
    setSession((current) => ({ ...current, [key]: value }));
  const canChoose = data.profile.role === "gabungan";
  return (
    <PageSection
      eyebrow="CATATAN KEHADIRAN"
      title="Presensi"
      action={
        <div className="section-actions">
          <ImportActions onImport={onImport} />
          <button
            className="primary-button"
            disabled={
              !roster.length ||
              (sessionType === "subject" &&
                (!subjectId || !startTime || !endTime))
            }
            onClick={() => onSave(session, statuses, notes)}
          >
            <Save size={16} /> Simpan presensi
          </button>
        </div>
      }
    >
      <div className="control-row attendance-controls">
        {canChoose && (
          <label className="compact-field">
            <span>Jenis presensi</span>
            <select
              value={sessionType}
              onChange={(event) => setValue("sessionType", event.target.value)}
            >
              <option value="homeroom">Presensi wali kelas</option>
              <option value="subject">Presensi mata pelajaran</option>
            </select>
          </label>
        )}
        <label className="compact-field">
          <span>Tanggal</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setValue("date", event.target.value)}
          />
        </label>
        <label className="compact-field">
          <span>Kelas</span>
          <select
            value={classId}
            onChange={(event) => setValue("classId", event.target.value)}
          >
            {data.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {sessionType === "subject" && (
          <>
            <label className="compact-field">
              <span>Mata pelajaran</span>
              <select
                value={subjectId}
                onChange={(event) => setValue("subjectId", event.target.value)}
              >
                {data.subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="compact-field">
              <span>Mulai</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setValue("startTime", event.target.value)}
              />
            </label>
            <label className="compact-field">
              <span>Selesai</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setValue("endTime", event.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <div className="attendance-summary">
        <div>
          <strong>{roster.length}</strong>
          <span>Total siswa</span>
        </div>
        <div className="present">
          <strong>{counts.H || 0}</strong>
          <span>Hadir</span>
        </div>
        <div className="permission">
          <strong>{(counts.S || 0) + (counts.I || 0)}</strong>
          <span>Sakit / izin</span>
        </div>
        <div className="absent">
          <strong>{counts.A || 0}</strong>
          <span>Alpa</span>
        </div>
      </div>
      <div className="table-card">
        {roster.length === 0 ? (
          <EmptyState
            title="Belum ada siswa"
            desc="Pilih kelas yang sudah memiliki siswa pada Master Data."
          />
        ) : (
          roster.map((student) => (
            <div className="data-row attendance-row" key={student.id}>
              <span className="person-avatar">
                {avatarName(student.full_name)}
              </span>
              <div className="person-copy">
                <strong>{student.full_name}</strong>
                <small>
                  {student.nickname ||
                    student.nisn ||
                    "Data identitas belum lengkap"}
                </small>
              </div>
              <div className="attendance-actions">
                {[
                  ["H", "Hadir"],
                  ["S", "Sakit"],
                  ["I", "Izin"],
                  ["A", "Alpa"],
                ].map(([code, label]) => (
                  <button
                    type="button"
                    key={code}
                    title={label}
                    className={
                      statuses[student.id] === code
                        ? "attendance-button active " + code
                        : "attendance-button"
                    }
                    onClick={() =>
                      setStatuses((current) => ({
                        ...current,
                        [student.id]: code,
                      }))
                    }
                  >
                    {code}
                  </button>
                ))}
              </div>
              <input
                className="attendance-note"
                value={notes[student.id] || ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [student.id]: event.target.value,
                  }))
                }
                placeholder="Catatan opsional"
              />
            </div>
          ))
        )}
      </div>
    </PageSection>
  );
}

function JournalPage({ data, onAdd, onDelete }) {
  const [form, setForm] = useState({
    journal_date: today(),
    class_id: data.classes[0]?.id || "",
    subject_id: data.subjects[0]?.id || "",
    topic: "",
    activity: "",
    reflection: "",
    follow_up: "",
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.topic) return;
    await onAdd(form);
    setForm((current) => ({
      ...current,
      topic: "",
      activity: "",
      reflection: "",
      follow_up: "",
    }));
  };
  return (
    <PageSection
      eyebrow="CATATAN PEMBELAJARAN"
      title="Jurnal mengajar"
      action={
        <button
          className="secondary-button"
          onClick={() => document.getElementById("journal-topic")?.focus()}
        >
          <Plus size={16} /> Tulis jurnal
        </button>
      }
    >
      <form className="journal-form" onSubmit={submit}>
        <div className="three-fields">
          <label className="field">
            <span>Tanggal</span>
            <input
              type="date"
              value={form.journal_date}
              onChange={(event) => update("journal_date", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Kelas</span>
            <select
              value={form.class_id}
              onChange={(event) => update("class_id", event.target.value)}
            >
              {data.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mata pelajaran</span>
            <select
              value={form.subject_id}
              onChange={(event) => update("subject_id", event.target.value)}
            >
              <option value="">Umum / wali kelas</option>
              {data.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Topik pembelajaran</span>
          <input
            id="journal-topic"
            value={form.topic}
            onChange={(event) => update("topic", event.target.value)}
            placeholder="Contoh: Pecahan dan perbandingan"
          />
        </label>
        <label className="field">
          <span>Aktivitas pembelajaran</span>
          <textarea
            value={form.activity}
            onChange={(event) => update("activity", event.target.value)}
            placeholder="Apa yang dilakukan siswa dan guru?"
            rows="3"
          />
        </label>
        <div className="two-fields">
          <label className="field">
            <span>Refleksi</span>
            <textarea
              value={form.reflection}
              onChange={(event) => update("reflection", event.target.value)}
              placeholder="Apa yang berjalan baik dan perlu diperbaiki?"
              rows="3"
            />
          </label>
          <label className="field">
            <span>Tindak lanjut</span>
            <textarea
              value={form.follow_up}
              onChange={(event) => update("follow_up", event.target.value)}
              placeholder="Remedial, pengayaan, atau kegiatan berikutnya"
              rows="3"
            />
          </label>
        </div>
        <button className="primary-button" type="submit">
          <Save size={16} /> Simpan jurnal
        </button>
      </form>
      <div className="list-heading">
        <p className="eyebrow">RIWAYAT JURNAL</p>
        <span>{data.journals.length} catatan tersimpan</span>
      </div>
      <div className="journal-list">
        {data.journals.length === 0 ? (
          <EmptyState
            title="Belum ada jurnal"
            desc="Simpan catatan pertama untuk membangun riwayat pembelajaran."
          />
        ) : (
          data.journals.map((journal) => (
            <details className="journal-card journal-details" key={journal.id}>
              <summary>
                <span className="date-block">
                  {text(journal.journal_date).slice(5)}
                </span>
                <div className="person-copy">
                  <strong>{journal.topic}</strong>
                  <small>
                    {data.classes.find((item) => item.id === journal.class_id)
                      ?.name || "Kelas"}{" "}
                    ·{" "}
                    {data.subjects.find(
                      (item) => item.id === journal.subject_id,
                    )?.name || "Umum"}
                  </small>
                </div>
                <ChevronDown size={17} />
              </summary>
              <div className="journal-body">
                <div>
                  <span>Aktivitas</span>
                  <p>{journal.activity || "Belum ada catatan aktivitas."}</p>
                </div>
                <div>
                  <span>Refleksi</span>
                  <p>{journal.reflection || "Belum ada refleksi."}</p>
                </div>
                <div>
                  <span>Tindak lanjut</span>
                  <p>{journal.follow_up || "Belum ada tindak lanjut."}</p>
                </div>
              </div>
            </details>
          ))
        )}
      </div>
    </PageSection>
  );
}

function GradesPage({ data, onImport, onAdd, onMaster }) {
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const [form, setForm] = useState({
    student_id: "",
    class_id: data.classes[0]?.id || "",
    subject_id: data.subjects[0]?.id || "",
    assessment_title: "",
    assessment_category: "TUGAS",
    assessment_date: today(),
    point: "",
    max_point: "100",
    comment: "",
  });
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const roster = data.students.filter(
    (student) => student.class_id === form.class_id,
  );
  const selectedStudent = data.students.find(
    (student) => student.id === form.student_id,
  );
  const classRow = data.classes.find((item) => item.id === form.class_id);
  const subjectRow = data.subjects.find((item) => item.id === form.subject_id);
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    setMessage("");
    if (!classRow || !selectedStudent || !subjectRow)
      return setMessage(
        "Pilih kelas, siswa, dan mata pelajaran. Jika belum tersedia, lengkapi Master Data terlebih dahulu.",
      );
    if (!form.assessment_title.trim() || !form.assessment_date)
      return setMessage("Isi nama tugas dan tanggal penilaian.");
    const point = Number(form.point),
      maximum = Number(form.max_point);
    if (
      form.point === "" ||
      !Number.isFinite(point) ||
      !Number.isFinite(maximum) ||
      maximum <= 0 ||
      point < 0 ||
      point > maximum
    )
      return setMessage(
        "Nilai harus antara 0 dan nilai maksimum yang lebih besar dari 0.",
      );
    lock.current = true;
    setBusy(true);
    try {
      await onAdd({
        ...form,
        student_name: selectedStudent.full_name,
        student_nisn: selectedStudent.nisn || "",
        class_name: classRow.name,
        subject_name: subjectRow.name,
      });
      setMessage(
        "Nilai berhasil disimpan. Pilih siswa berikutnya untuk tugas yang sama.",
      );
      setForm((current) => ({
        ...current,
        student_id: "",
        point: "",
        comment: "",
      }));
    } catch (error) {
      setMessage(
        error.message ||
          "Penyimpanan gagal. Isian tetap tersedia untuk dicoba kembali.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <PageSection
      eyebrow="HASIL BELAJAR"
      title="Penilaian"
      action={
        <div className="section-actions">
          <ImportActions onImport={onImport} />
          <button
            className={showForm ? "secondary-button" : "primary-button"}
            aria-expanded={showForm}
            onClick={() => setShowForm((current) => !current)}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Tutup formulir" : "Input nilai"}
          </button>
        </div>
      }
    >
      <div className="helper-banner">
        <ClipboardList size={18} />
        <span>
          Nama siswa otomatis dari Master Data. Catatan dapat dipakai untuk
          status belum tuntas, remedial, atau informasi lain.
        </span>
      </div>
      {(!data.classes.length ||
        !data.subjects.length ||
        !data.students.length) && (
        <div className="helper-banner">
          <span>
            Siapkan kelas, mata pelajaran, dan siswa sebelum mencatat nilai.
          </span>
          <button className="secondary-button" onClick={onMaster}>
            Lengkapi Master Data
          </button>
        </div>
      )}
      {message && (
        <div className="form-notice" role="status">
          {message}
        </div>
      )}
      {showForm && (
        <form
          className="inline-form grades-form collapsible-form"
          onSubmit={submit}
        >
          <label className="field">
            <span>Kelas</span>
            <select
              value={form.class_id}
              onChange={(event) => {
                update("class_id", event.target.value);
                update("student_id", "");
              }}
            >
              {data.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nama siswa</span>
            <select
              value={form.student_id}
              onChange={(event) => update("student_id", event.target.value)}
            >
              <option value="">Pilih dari Master Data</option>
              {roster.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mata pelajaran</span>
            <select
              value={form.subject_id}
              onChange={(event) => update("subject_id", event.target.value)}
            >
              {data.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Nama tugas / asesmen"
            value={form.assessment_title}
            onChange={(value) => update("assessment_title", value)}
            placeholder="Contoh: Tugas 1"
          />
          <label className="field">
            <span>Kategori</span>
            <select
              value={form.assessment_category}
              onChange={(event) =>
                update("assessment_category", event.target.value)
              }
            >
              <option>TUGAS</option>
              <option>UH</option>
              <option>PTS</option>
              <option>PAS</option>
              <option>PROYEK</option>
              <option>LAINNYA</option>
            </select>
          </label>
          <label className="field">
            <span>Tanggal</span>
            <input
              type="date"
              value={form.assessment_date}
              onChange={(event) =>
                update("assessment_date", event.target.value)
              }
            />
          </label>
          <Field
            label="Nilai"
            value={form.point}
            onChange={(value) => update("point", value)}
            placeholder="0–100"
            type="number"
          />
          <Field
            label="Nilai maksimum"
            value={form.max_point}
            onChange={(value) => update("max_point", value)}
            placeholder="100"
            type="number"
          />
          <label className="field field-wide">
            <span>Catatan guru</span>
            <textarea
              value={form.comment}
              onChange={(event) => update("comment", event.target.value)}
              rows="2"
              placeholder="Contoh: Belum tuntas, remedial hari Jumat"
            />
          </label>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Save size={15} />
            )}{" "}
            {busy ? "Menyimpan…" : "Simpan nilai"}
          </button>
        </form>
      )}
      <div className="grade-summary">
        <strong>{data.grades.length}</strong>
        <span>baris nilai tersimpan</span>
        <div className="grade-progress">
          <span
            style={{
              width: data.students.length
                ? Math.min(
                    100,
                    Math.round(
                      (data.grades.length / Math.max(1, data.students.length)) *
                        100,
                    ),
                  ) + "%"
                : "0%",
            }}
          ></span>
        </div>
      </div>
      <div className="table-card">
        {data.grades.length === 0 ? (
          <EmptyState
            title="Belum ada nilai"
            desc="Input nilai dari daftar siswa atau import template resmi."
          />
        ) : (
          data.grades.map((grade) => (
            <div className="data-row grade-row" key={grade.id}>
              <span className="person-avatar blue">
                {avatarName(grade.student_name)}
              </span>
              <div className="person-copy">
                <strong>{grade.student_name}</strong>
                <small>
                  {grade.class_name} · {grade.subject_name} ·{" "}
                  {grade.assessment_title}
                  {grade.comment ? ` · ${grade.comment}` : ""}
                </small>
              </div>
              <strong className="score-value">{grade.point}</strong>
              <span className="row-meta">/{grade.max_point || 100}</span>
            </div>
          ))
        )}
      </div>
    </PageSection>
  );
}

function AgendaPage({ data, onSave, onImport }) {
  const blank = {
    day_of_week: 1,
    class_id: data.classes[0]?.id || "",
    subject_id:
      data.profile.role === "wali_kelas" ? "" : data.subjects[0]?.id || "",
    start_time: "07:00",
    end_time: "08:00",
    note: "",
  };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.class_id || !form.start_time || !form.end_time) return;
    await onSave(form, editing);
    setForm(blank);
    setEditing(null);
  };
  const edit = (row) => {
    setEditing(row.id);
    setForm({
      day_of_week: row.day_of_week,
      class_id: row.class_id,
      subject_id: row.subject_id || "",
      start_time: text(row.start_time).slice(0, 5),
      end_time: text(row.end_time).slice(0, 5),
      note: row.note || "",
    });
  };
  return (
    <PageSection
      eyebrow="POLA MINGGUAN"
      title="Kalender agenda"
      action={<ImportActions onImport={onImport} />}
    >
      <div className="agenda-layout">
        <form className="agenda-form panel" onSubmit={submit}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">
                {editing ? "EDIT JADWAL" : "JADWAL BARU"}
              </p>
              <h3>Pelajaran berulang tiap minggu</h3>
            </div>
          </div>
          <label className="field">
            <span>Hari</span>
            <select
              value={form.day_of_week}
              onChange={(event) =>
                update("day_of_week", Number(event.target.value))
              }
            >
              {DAY_NAMES.map((day, index) => (
                <option key={day} value={index + 1}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Kelas</span>
            <select
              value={form.class_id}
              onChange={(event) => update("class_id", event.target.value)}
            >
              {data.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Mata pelajaran</span>
            <select
              value={form.subject_id}
              onChange={(event) => update("subject_id", event.target.value)}
            >
              <option value="">Wali kelas / agenda umum</option>
              {data.subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="two-fields">
            <label className="field">
              <span>Mulai</span>
              <input
                type="time"
                value={form.start_time}
                onChange={(event) => update("start_time", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Selesai</span>
              <input
                type="time"
                value={form.end_time}
                onChange={(event) => update("end_time", event.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>Catatan</span>
            <textarea
              rows="3"
              value={form.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Kelas, ruang, materi, atau pengingat"
            />
          </label>
          <button className="primary-button">
            <Save size={15} />
            {editing ? "Simpan perubahan" : "Tambahkan agenda"}
          </button>
        </form>
        <div className="week-board">
          {DAY_NAMES.map((day, index) => {
            const rows = data.schedules.filter(
              (item) =>
                Number(item.day_of_week) === index + 1 && item.active !== false,
            );
            return (
              <section className="day-column" key={day}>
                <div className="day-head">
                  <span>{day.slice(0, 3)}</span>
                  <strong>{day}</strong>
                  <small>{rows.length} agenda</small>
                </div>
                <div className="day-events">
                  {rows.length ? (
                    rows.map((item) => (
                      <button
                        className="schedule-card"
                        key={item.id}
                        onClick={() => edit(item)}
                      >
                        <span>
                          <Clock3 size={14} />
                          {text(item.start_time).slice(0, 5)}–
                          {text(item.end_time).slice(0, 5)}
                        </span>
                        <strong>
                          {data.classes.find((row) => row.id === item.class_id)
                            ?.name || "Kelas"}
                        </strong>
                        <small>
                          {data.subjects.find(
                            (row) => row.id === item.subject_id,
                          )?.name || "Agenda wali kelas"}
                        </small>
                        {item.note && <p>{item.note}</p>}
                      </button>
                    ))
                  ) : (
                    <span className="empty-slot">Belum ada jadwal</span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </PageSection>
  );
}

function AgendaPageV2({ data, onSave, onSaveEvent, onDelete, onImport }) {
  const now = new Date();
  const [cursor, setCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today());
  const [mode, setMode] = useState("event");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const blankEvent = () => ({
    title: "",
    event_date: selectedDate,
    class_id: data.classes[0]?.id || "",
    subject_id: "",
    start_time: "07:00",
    end_time: "08:00",
    event_type: "other",
    note: "",
    all_day: false,
  });
  const blankSchedule = () => ({
    day_of_week: 1,
    class_id: data.classes[0]?.id || "",
    subject_id: "",
    start_time: "07:00",
    end_time: "08:00",
    note: "",
  });
  const [form, setForm] = useState(blankEvent);
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const monthTitle = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(cursor);
  const firstMondayOffset = (cursor.getDay() + 6) % 7;
  const gridStart = new Date(
    cursor.getFullYear(),
    cursor.getMonth(),
    1 - firstMondayOffset,
  );
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const isoLocal = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const entriesFor = (date) => {
    const iso = isoLocal(date);
    const day = date.getDay() === 0 ? 7 : date.getDay();
    const oneTime = (data.events || [])
      .filter((item) => item.event_date === iso)
      .map((item) => ({ ...item, kind: "event" }));
    const recurring = data.schedules
      .filter(
        (item) => item.active !== false && Number(item.day_of_week) === day,
      )
      .map((item) => ({
        ...item,
        title:
          data.subjects.find((row) => row.id === item.subject_id)?.name ||
          "Agenda wali kelas",
        event_date: iso,
        kind: "schedule",
      }));
    return [...oneTime, ...recurring].sort((a, b) =>
      text(a.start_time).localeCompare(text(b.start_time)),
    );
  };
  const selectedEntries = entriesFor(new Date(selectedDate + "T00:00:00"));
  const openCreate = (type, date = selectedDate) => {
    setMode(type);
    setEditing(null);
    setForm(
      type === "event"
        ? { ...blankEvent(), event_date: date }
        : blankSchedule(),
    );
    setOpen(true);
  };
  const openEdit = (item) => {
    setMode(item.kind);
    setEditing(item.id);
    setForm(
      item.kind === "event"
        ? {
            title: item.title,
            event_date: item.event_date,
            class_id: item.class_id || "",
            subject_id: item.subject_id || "",
            start_time: text(item.start_time).slice(0, 5) || "07:00",
            end_time: text(item.end_time).slice(0, 5) || "08:00",
            event_type: item.event_type || "other",
            note: item.note || "",
            all_day: Boolean(item.all_day),
          }
        : {
            day_of_week: Number(item.day_of_week),
            class_id: item.class_id,
            subject_id: item.subject_id || "",
            start_time: text(item.start_time).slice(0, 5),
            end_time: text(item.end_time).slice(0, 5),
            note: item.note || "",
          },
    );
    setOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "event") {
        if (
          !form.title.trim() ||
          !form.event_date ||
          (!form.all_day &&
            (!form.start_time ||
              !form.end_time ||
              form.start_time >= form.end_time))
        )
          return;
        await onSaveEvent(form, editing);
      } else {
        if (
          !form.class_id ||
          !form.start_time ||
          !form.end_time ||
          form.start_time >= form.end_time
        )
          return;
        await onSave(form, editing);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };
  const changeMonth = (offset) =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1));
  return (
    <PageSection
      eyebrow="AGENDA GURU"
      title="Kalender kegiatan"
      action={
        <div className="section-actions">
          <ImportActions onImport={onImport} />
          <button
            className="primary-button"
            onClick={() => openCreate("event")}
          >
            <Plus size={16} /> Tambah agenda
          </button>
        </div>
      }
    >
      <div className="helper-banner">
        <CalendarDays size={18} />
        <span>
          Jadwal rutin muncul otomatis setiap minggu. Rapat, upacara, dan
          kegiatan mendadak dapat ditambahkan pada tanggal tertentu.
        </span>
      </div>
      <div className="calendar-shell">
        <div className="calendar-toolbar">
          <button
            className="icon-button"
            onClick={() => changeMonth(-1)}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft size={19} />
          </button>
          <h3>{monthTitle}</h3>
          <button
            className="secondary-button compact"
            onClick={() => {
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(today());
            }}
          >
            Hari ini
          </button>
          <button
            className="icon-button"
            onClick={() => changeMonth(1)}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight size={19} />
          </button>
        </div>
        <div className="calendar-weekdays">
          {DAY_NAMES.map((day) => (
            <span key={day}>{day.slice(0, 3)}</span>
          ))}
        </div>
        <div className="month-grid">
          {days.map((date) => {
            const iso = isoLocal(date),
              entries = entriesFor(date),
              outside = date.getMonth() !== cursor.getMonth();
            return (
              <button
                key={iso}
                className={`calendar-day ${outside ? "outside" : ""} ${selectedDate === iso ? "selected" : ""} ${iso === today() ? "today" : ""}`}
                onClick={() => setSelectedDate(iso)}
              >
                <span>{date.getDate()}</span>
                <div>
                  {entries.slice(0, 2).map((item) => (
                    <i className={item.kind} key={item.kind + item.id}>
                      {item.title}
                    </i>
                  ))}
                  {entries.length > 2 && (
                    <small>+{entries.length - 2} lagi</small>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <section className="selected-agenda">
        <div className="selected-agenda-head">
          <div>
            <p className="eyebrow">AGENDA TERPILIH</p>
            <h3>
              {new Intl.DateTimeFormat("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(selectedDate + "T00:00:00"))}
            </h3>
          </div>
          <div>
            <button
              className="secondary-button"
              onClick={() => openCreate("schedule")}
            >
              <Clock3 size={15} /> Jadwal rutin
            </button>
            <button
              className="primary-button"
              onClick={() => openCreate("event", selectedDate)}
            >
              <Plus size={15} /> Kegiatan satu kali
            </button>
          </div>
        </div>
        <div className="agenda-list">
          {selectedEntries.length ? (
            selectedEntries.map((item) => (
              <article
                className={`agenda-entry ${item.kind}`}
                key={item.kind + item.id}
              >
                <span className="agenda-time">
                  {item.all_day
                    ? "Seharian"
                    : `${text(item.start_time).slice(0, 5)}–${text(item.end_time).slice(0, 5)}`}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {data.classes.find((row) => row.id === item.class_id)
                      ?.name || "Umum"}
                    {item.note ? ` · ${item.note}` : ""}
                  </small>
                </div>
                <span className="kind-pill">
                  {item.kind === "schedule" ? "Rutin" : "Satu kali"}
                </span>
                <button className="icon-button" onClick={() => openEdit(item)}>
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button danger-icon"
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))
          ) : (
            <EmptyState
              title="Belum ada agenda"
              desc="Tambahkan kegiatan satu kali atau atur jadwal rutin untuk tanggal ini."
            />
          )}
        </div>
      </section>
      {open &&
        createPortal(
          <div className="master-modal-backdrop">
            <section
              className="master-modal agenda-modal"
              role="dialog"
              aria-modal="true"
            >
              <div className="master-modal-head">
                <div>
                  <p className="eyebrow">
                    {editing ? "EDIT AGENDA" : "AGENDA BARU"}
                  </p>
                  <h2>
                    {mode === "event"
                      ? "Kegiatan satu kali"
                      : "Jadwal rutin mingguan"}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => !busy && setOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="master-modal-tabs">
                <button
                  type="button"
                  className={mode === "event" ? "active" : ""}
                  onClick={() => !editing && openCreate("event")}
                >
                  <CalendarDays size={17} />
                  Satu kali
                </button>
                <button
                  type="button"
                  className={mode === "schedule" ? "active" : ""}
                  onClick={() => !editing && openCreate("schedule")}
                >
                  <Clock3 size={17} />
                  Rutin mingguan
                </button>
              </div>
              <form className="master-modal-form" onSubmit={submit}>
                <div className="master-modal-body">
                  <div className="master-form-grid">
                    {mode === "event" && (
                      <>
                        <Field
                          label="Nama kegiatan"
                          value={form.title}
                          onChange={(value) => update("title", value)}
                          placeholder="Rapat, upacara, atau pengingat"
                        />
                        <label className="field">
                          <span>Tanggal</span>
                          <input
                            type="date"
                            value={form.event_date}
                            onChange={(event) =>
                              update("event_date", event.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Jenis kegiatan</span>
                          <select
                            value={form.event_type}
                            onChange={(event) =>
                              update("event_type", event.target.value)
                            }
                          >
                            <option value="meeting">Rapat</option>
                            <option value="ceremony">Upacara</option>
                            <option value="teaching">Pembelajaran</option>
                            <option value="reminder">Pengingat</option>
                            <option value="other">Lainnya</option>
                          </select>
                        </label>
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={form.all_day}
                            onChange={(event) =>
                              update("all_day", event.target.checked)
                            }
                          />{" "}
                          Kegiatan seharian
                        </label>
                      </>
                    )}
                    {mode === "schedule" && (
                      <label className="field">
                        <span>Hari</span>
                        <select
                          value={form.day_of_week}
                          onChange={(event) =>
                            update("day_of_week", Number(event.target.value))
                          }
                        >
                          {DAY_NAMES.map((day, index) => (
                            <option value={index + 1} key={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="field">
                      <span>Kelas</span>
                      <select
                        value={form.class_id}
                        onChange={(event) =>
                          update("class_id", event.target.value)
                        }
                      >
                        <option value="">Agenda umum</option>
                        {data.classes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>Mata pelajaran</span>
                      <select
                        value={form.subject_id}
                        onChange={(event) =>
                          update("subject_id", event.target.value)
                        }
                      >
                        <option value="">Umum / wali kelas</option>
                        {data.subjects.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!(mode === "event" && form.all_day) && (
                      <>
                        <label className="field">
                          <span>Mulai</span>
                          <input
                            type="time"
                            value={form.start_time}
                            onChange={(event) =>
                              update("start_time", event.target.value)
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Selesai</span>
                          <input
                            type="time"
                            value={form.end_time}
                            onChange={(event) =>
                              update("end_time", event.target.value)
                            }
                          />
                        </label>
                      </>
                    )}
                    <label className="field field-wide">
                      <span>Catatan</span>
                      <textarea
                        rows="3"
                        value={form.note}
                        onChange={(event) => update("note", event.target.value)}
                        placeholder="Lokasi, tujuan, atau hal yang perlu disiapkan"
                      />
                    </label>
                  </div>
                </div>
                <div className="master-modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setOpen(false)}
                  >
                    Batal
                  </button>
                  <button className="primary-button" disabled={busy}>
                    {busy ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )}{" "}
                    {busy ? "Menyimpan…" : "Simpan agenda"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
      {deleteTarget && (
        <ConfirmDelete
          title={`Hapus ${deleteTarget.title || "agenda ini"}?`}
          description={
            deleteTarget.kind === "schedule"
              ? "Jadwal ini tidak akan muncul lagi pada minggu berikutnya."
              : "Kegiatan satu kali ini akan dihapus dari kalender."
          }
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await onDelete(deleteTarget.kind, deleteTarget);
              setDeleteTarget(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </PageSection>
  );
}

function ReportsPage({ data, setActive, onDelete }) {
  const [selected, setSelected] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [periodMode, setPeriodMode] = useState("month");
  const [periodValue, setPeriodValue] = useState(today().slice(0, 7));
  const attendanceRows = data.attendance.map((row) => ({
    _sourceId: row.id,
    _studentId: row.student_id,
    _status: row.status,
    tanggal: row.attendance_date,
    kelas: data.classes.find((item) => item.id === row.class_id)?.name || "",
    siswa:
      data.students.find((item) => item.id === row.student_id)?.full_name || "",
    status:
      { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpa" }[row.status] ||
      row.status,
    jenis: row.session_type === "subject" ? "Mata pelajaran" : "Wali kelas",
    catatan: row.note || "",
  }));
  const gradeRows = data.grades.map((row) => ({
    _sourceId: row.id,
    _studentId: row.student_id,
    _percentage:
      (Number(row.point) / Math.max(1, Number(row.max_point || 100))) * 100,
    tanggal: row.assessment_date || "",
    kelas: row.class_name || "",
    siswa: row.student_name || "",
    mata_pelajaran: row.subject_name || "",
    asesmen: row.assessment_title || "",
    kategori: row.assessment_category || "",
    nilai: row.point,
    nilai_maksimum: row.max_point || 100,
    catatan: row.comment || "",
  }));
  const classRows = data.classes.map((row) => ({
    _sourceId: row.id,
    kelas: row.name,
    tingkat: row.grade_level || "",
    jumlah_siswa: data.students.filter((student) => student.class_id === row.id)
      .length,
    status: row.active === false ? "Tidak aktif" : "Aktif",
  }));
  const safePeriodValue = periodValue || (periodMode === "day" ? today() : today().slice(0, 7));
  const matchesPeriod = (row) =>
    periodMode === "day"
      ? row.tanggal === safePeriodValue
      : text(row.tanggal).startsWith(safePeriodValue);
  const filteredAttendanceRows = attendanceRows.filter(matchesPeriod);
  const filteredGradeRows = gradeRows.filter(matchesPeriod);
  const periodLabel = periodMode === "day"
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${safePeriodValue}T12:00:00`))
    : new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${safePeriodValue}-01T12:00:00`));
  const attendancePresent = filteredAttendanceRows.filter((row) => row._status === "H").length;
  const attendanceRate = filteredAttendanceRows.length
    ? Math.round((attendancePresent / filteredAttendanceRows.length) * 1000) / 10
    : 0;
  const attendanceByStudent = Array.from(
    filteredAttendanceRows.reduce((groups, row) => {
      const key = row._studentId || row.siswa;
      const current = groups.get(key) || { siswa: row.siswa || "Tanpa nama", kelas: row.kelas || "-", hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0 };
      current.total += 1;
      if (row._status === "H") current.hadir += 1;
      if (row._status === "S") current.sakit += 1;
      if (row._status === "I") current.izin += 1;
      if (row._status === "A") current.alpa += 1;
      groups.set(key, current);
      return groups;
    }, new Map()).values(),
  ).map((row) => ({ ...row, rata_rata_kehadiran: row.total ? `${Math.round((row.hadir / row.total) * 1000) / 10}%` : "0%" }));
  const validGradeRows = filteredGradeRows.filter((row) => Number.isFinite(row._percentage));
  const overallGradeAverage = validGradeRows.length
    ? Math.round((validGradeRows.reduce((sum, row) => sum + row._percentage, 0) / validGradeRows.length) * 10) / 10
    : 0;
  const gradeByStudent = Array.from(
    validGradeRows.reduce((groups, row) => {
      const key = row._studentId || row.siswa;
      const current = groups.get(key) || { siswa: row.siswa || "Tanpa nama", kelas: row.kelas || "-", jumlah_penilaian: 0, total_persentase: 0 };
      current.jumlah_penilaian += 1;
      current.total_persentase += row._percentage;
      groups.set(key, current);
      return groups;
    }, new Map()).values(),
  ).map((row) => ({ siswa: row.siswa, kelas: row.kelas, jumlah_penilaian: row.jumlah_penilaian, rata_rata_nilai: Math.round((row.total_persentase / row.jumlah_penilaian) * 10) / 10 }));
  const reports = [
    {
      id: "attendance",
      icon: CalendarCheck2,
      title: "Rekap presensi",
      value: `${filteredAttendanceRows.length} catatan`,
      cardValue: `${attendanceRows.length} catatan`,
      desc: "Rekap harian atau bulanan beserta rata-rata kehadiran.",
      rows: filteredAttendanceRows,
      summaryRows: attendanceByStudent,
      summaryCards: [
        { label: "Rata-rata kehadiran", value: `${attendanceRate}%`, meta: `${attendancePresent} hadir dari ${filteredAttendanceRows.length} catatan` },
        { label: "Siswa tercatat", value: attendanceByStudent.length, meta: periodLabel },
        { label: "Tidak hadir", value: filteredAttendanceRows.length - attendancePresent, meta: "Sakit, izin, dan alpa" },
      ],
      filterable: true,
      file: "rekap-presensi",
      sheet: "Presensi",
      editPage: "attendance",
      deleteKind: "attendance",
    },
    {
      id: "grades",
      icon: ClipboardList,
      title: "Rekap penilaian",
      value: `${filteredGradeRows.length} nilai`,
      cardValue: `${gradeRows.length} nilai`,
      desc: "Rekap harian atau bulanan dan rata-rata setiap siswa.",
      rows: filteredGradeRows,
      summaryRows: gradeByStudent,
      summaryCards: [
        { label: "Rata-rata keseluruhan", value: overallGradeAverage, meta: "Skala 0–100" },
        { label: "Siswa dinilai", value: gradeByStudent.length, meta: periodLabel },
        { label: "Jumlah penilaian", value: filteredGradeRows.length, meta: "Pada periode terpilih" },
      ],
      filterable: true,
      file: "rekap-penilaian",
      sheet: "Penilaian",
      editPage: "grades",
      deleteKind: "grade",
    },
    {
      id: "classes",
      icon: GraduationCap,
      title: "Cakupan kelas",
      value: `${classRows.length} kelas`,
      cardValue: `${classRows.length} kelas`,
      desc: "Daftar kelas dan jumlah siswa yang dinaungi.",
      rows: classRows,
      file: "rekap-kelas",
      sheet: "Kelas",
      editPage: "master",
      deleteKind: "class",
    },
  ];
  const report = reports.find((item) => item.id === selected);
  const reportPeriodLabel = report?.filterable ? periodLabel : "";
  const reportFileSuffix = report?.filterable ? `-${safePeriodValue}` : "";
  if (report)
    return (
      <PageSection
        eyebrow="DETAIL REKAP"
        title={report.title}
        action={
          <button
            className="secondary-button"
            onClick={() => setSelected(null)}
          >
            <ChevronLeft size={16} /> Kembali
          </button>
        }
      >
        {report.filterable && (
          <div className="report-period-panel">
            <div>
              <p className="eyebrow">PERIODE LAPORAN</p>
              <strong>{periodLabel}</strong>
            </div>
            <div className="period-mode-tabs" role="group" aria-label="Jenis periode rekap">
              <button className={periodMode === "month" ? "active" : ""} onClick={() => { setPeriodMode("month"); setPeriodValue(text(periodValue).slice(0, 7) || today().slice(0, 7)); }}>Bulanan</button>
              <button className={periodMode === "day" ? "active" : ""} onClick={() => { setPeriodMode("day"); setPeriodValue(periodValue.length === 10 ? periodValue : today()); }}>Harian</button>
            </div>
            <label className="period-picker">
              <span>{periodMode === "month" ? "Pilih bulan" : "Pilih tanggal"}</span>
              <input type={periodMode === "month" ? "month" : "date"} value={periodValue} onChange={(event) => setPeriodValue(event.target.value)} />
            </label>
          </div>
        )}
        {report.summaryCards?.length ? (
          <div className="report-summary-grid">
            {report.summaryCards.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.meta}</small></article>)}
          </div>
        ) : null}
        {report.summaryRows?.length ? (
          <details className="student-average-panel" open>
            <summary><div><p className="eyebrow">RANGKUMAN SISWA</p><strong>Rata-rata setiap siswa</strong></div><ChevronDown size={18}/></summary>
            <ReportTable rows={report.summaryRows} />
          </details>
        ) : null}
        <div className="report-detail-toolbar">
          <div>
            <strong>{report.value}</strong>
            <span>Data rinci untuk {reportPeriodLabel || "seluruh kelas"}.</span>
          </div>
          <div className="report-actions">
            <button
              className="secondary-button"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye size={16} /> Preview
            </button>
            <button
              className="secondary-button"
              onClick={() => setActive(report.editPage)}
            >
              <Pencil size={16} /> Edit data
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                saveRowsAsExcel(
                  `${report.file}${reportFileSuffix}.xlsx`,
                  report.rows,
                  report.sheet,
                  report.summaryRows || [],
                )
              }
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                saveRowsAsPdf(`${report.file}${reportFileSuffix}.pdf`, report.title, report.rows, report.summaryRows || [], reportPeriodLabel)
              }
            >
              <FileText size={16} /> PDF
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                saveRowsAsWord(`${report.file}${reportFileSuffix}.doc`, report.title, report.rows, report.summaryRows || [], reportPeriodLabel)
              }
            >
              <FileText size={16} /> Word
            </button>
            <button
              className="primary-button"
              onClick={() => saveRowsAsCsv(`${report.file}${reportFileSuffix}.csv`, report.rows)}
            >
              <Download size={16} /> CSV
            </button>
          </div>
        </div>
        <ReportTable
          rows={report.rows}
          onDeleteRow={(row) => setDeleteTarget({ report, row })}
        />
        {previewOpen && (
          <ReportPreview
            report={report}
            periodLabel={reportPeriodLabel}
            onClose={() => setPreviewOpen(false)}
          />
        )}
        {deleteTarget && (
          <ConfirmDelete
            title={`Hapus satu data dari ${deleteTarget.report.title}?`}
            description="Data yang dipilih akan dihapus dari database dan tidak ikut muncul pada preview maupun file unduhan berikutnya."
            busy={deleting}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={async () => {
              if (deleting) return;
              setDeleting(true);
              try {
                await onDelete(deleteTarget.report.deleteKind, { id: deleteTarget.row._sourceId, name: deleteTarget.row.kelas || deleteTarget.row.siswa || deleteTarget.row.topik || "data" });
                setDeleteTarget(null);
              } finally {
                setDeleting(false);
              }
            }}
          />
        )}
      </PageSection>
    );
  return (
    <PageSection eyebrow="RINGKASAN DATA" title="Rekap & laporan">
      <div className="helper-banner">
        <FileSpreadsheet size={18} />
        <span>
          Tekan salah satu kartu untuk melihat seluruh catatan, preview laporan,
          mengedit data sumber, atau mengunduh Excel, PDF, Word, dan CSV.
        </span>
      </div>
      <div className="report-grid">
        {reports.map((item) => (
          <ReportCard
            key={item.id}
            {...item}
            value={item.cardValue}
            onClick={() => setSelected(item.id)}
          />
        ))}
      </div>
    </PageSection>
  );
}
function ReportCard({ icon: Icon, title, value, desc, onClick }) {
  return (
    <button className="report-card" onClick={onClick}>
      <div className="report-icon">
        <Icon size={19} />
      </div>
      <strong>{title}</strong>
      <b>{value}</b>
      <p>{desc}</p>
      <span className="report-open">
        Lihat semua data <ArrowRight size={14} />
      </span>
    </button>
  );
}

function ReportTable({ rows, compact = false, onDeleteRow = null }) {
  const visibleRows = compact ? rows.slice(0, 12) : rows;
  const headers = reportHeaders(rows);
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>No.</th>
            {headers.map((header) => (
              <th key={header}>{header.replace(/_/g, " ")}</th>
            ))}
            {onDeleteRow ? <th>Aksi</th> : null}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length ? (
            visibleRows.map((row, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                {headers.map((header) => (
                  <td key={header}>{text(row[header]) || "-"}</td>
                ))}
                {onDeleteRow ? <td><button className="table-delete-button" onClick={() => onDeleteRow(row)}><Trash2 size={14}/> Hapus</button></td> : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headers.length + (onDeleteRow ? 2 : 1)}>Belum ada data tersimpan.</td>
            </tr>
          )}
        </tbody>
      </table>
      {compact && rows.length > visibleRows.length && (
        <p className="preview-more">
          +{rows.length - visibleRows.length} data lainnya tersedia pada halaman
          rekap.
        </p>
      )}
    </div>
  );
}

function ReportPreview({ report, periodLabel, onClose }) {
  return createPortal(
    <div
      className="master-modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="master-modal report-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-preview-title"
      >
        <div className="master-modal-head">
          <div>
            <p className="eyebrow">PREVIEW LAPORAN</p>
            <h2 id="report-preview-title">{report.title}</h2>
            <p>{report.value} · Bantu Beres Buku Kerja Digital</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Tutup preview"
          >
            <X size={18} />
          </button>
        </div>
        <div className="report-preview-body">
          <article className="report-paper">
            <header>
              <div><span>BANTU BERES</span><strong>BUKU KERJA DIGITAL</strong></div>
              <p>LAPORAN GURU</p>
            </header>
            <section className="report-paper-title">
              <p>REKAP DATA</p>
              <h2>{report.title}</h2>
              <span>{periodLabel ? `${periodLabel} · ` : ""}Dicetak {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date())} · {report.value}</span>
            </section>
            {report.summaryRows?.length ? <section className="report-paper-summary"><h3>Rata-rata setiap siswa</h3><ReportTable rows={report.summaryRows}/></section> : null}
            <h3 className="report-detail-title">Data rinci</h3>
            <ReportTable rows={report.rows} />
            <footer><span>Bantu Beres Buku Kerja Digital</span><span>Jumlah data: {report.rows.length}</span></footer>
          </article>
        </div>
        <div className="master-modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Tutup
          </button>
          <button
            className="primary-button"
            onClick={() =>
              saveRowsAsPdf(`${report.file}.pdf`, report.title, report.rows, report.summaryRows || [], periodLabel)
            }
          >
            <Download size={16} /> Unduh PDF
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function SettingsPage({ data, onLogout, onRoleChange }) {
  const [key, setKey] = useState(
    () => window.localStorage.getItem(API_KEY) || "",
  );
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking");
  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => response.json())
      .then((payload) => {
        if (active)
          setAiStatus(payload.ai === "configured" ? "ready" : "personal");
      })
      .catch(() => {
        if (active)
          setAiStatus(
            window.localStorage.getItem(API_KEY) ? "personal" : "unknown",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const save = () => {
    const cleaned = key.trim();
    if (cleaned) window.localStorage.setItem(API_KEY, cleaned);
    else window.localStorage.removeItem(API_KEY);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };
  return (
    <PageSection eyebrow="PENGATURAN" title="Pengaturan">
      <div className="settings-stack">
        <div className="settings-card">
          <div>
            <p className="eyebrow">PROFIL & MODE KERJA</p>
            <h3>{data.profile.fullName}</h3>
            <p>
              {data.profile.schoolName} ·{" "}
              {data.academicYears[0]?.label || "Tahun ajaran aktif"}
            </p>
          </div>
          <div className="profile-controls">
            <label className="compact-field">
              <span>Mode guru</span>
              <select
                value={data.profile.role}
                onChange={(event) => onRoleChange(event.target.value)}
              >
                <option value="wali_kelas">Wali kelas</option>
                <option value="guru_mapel">Guru mata pelajaran</option>
                <option value="gabungan">Wali kelas + guru mapel</option>
              </select>
            </label>
            <span className="connection-pill">
              <span></span>Database terhubung
            </span>
          </div>
        </div>
        <div className="settings-card ai-settings">
          <div className="settings-copy">
            <p className="eyebrow">ASISTEN AI</p>
            <div className="ai-settings-title">
              <h3>Asisten Guru Gemini</h3>
              <span className={`ai-status ${aiStatus}`}>
                {aiStatus === "checking"
                  ? "Memeriksa…"
                  : aiStatus === "ready"
                    ? "AI aplikasi aktif"
                    : key
                      ? "Key pribadi aktif"
                      : "Perlu API key"}
              </span>
            </div>
            <p>
              {aiStatus === "ready"
                ? "Tiga API key aplikasi sudah terhubung di server dan dipakai bergantian saat salah satu mencapai batas kuota. Kolom di bawah hanya diperlukan jika guru ingin memakai key pribadi."
                : "Masukkan API key pribadi agar Asisten Guru dapat digunakan. Key hanya tersimpan di perangkat guru ini."}
            </p>
            <a
              className="studio-link"
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
            >
              <Sparkles size={16} />
              Buka Google AI Studio untuk membuat API key
              <ArrowRight size={14} />
            </a>
          </div>
          <div className="key-row">
            <div className="key-input-wrap">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="Tempel API key Gemini"
              />
              <button
                className="icon-button"
                type="button"
                aria-label={
                  showKey ? "Sembunyikan API key" : "Tampilkan API key"
                }
                onClick={() => setShowKey((current) => !current)}
              >
                {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <button className="primary-button" onClick={save}>
              <Save size={15} /> Simpan
            </button>
          </div>
          {saved && (
            <small className="saved-label">
              API key siap digunakan dari perangkat ini.
            </small>
          )}
          <details className="tutorial-details" open>
            <summary>Tutorial memasukkan API key Gemini</summary>
            <div className="api-steps">
              <span>
                <b>1</b>
                <strong>Buka Google AI Studio</strong>
                <small>
                  Tekan tombol ungu di atas dan masuk dengan akun Google.
                </small>
              </span>
              <span>
                <b>2</b>
                <strong>Buat API key</strong>
                <small>
                  Pilih Create API key, lalu pilih project Google yang tersedia.
                </small>
              </span>
              <span>
                <b>3</b>
                <strong>Salin key</strong>
                <small>
                  Tekan Copy. Jangan mengirim atau memperlihatkan key kepada
                  orang lain.
                </small>
              </span>
              <span>
                <b>4</b>
                <strong>Tempel dan simpan</strong>
                <small>
                  Tempel key di kolom API key pribadi lalu tekan Simpan.
                </small>
              </span>
              <span>
                <b>5</b>
                <strong>Uji Asisten Guru</strong>
                <small>
                  Buka Asisten Guru dan kirim satu perintah untuk memastikan AI
                  merespons.
                </small>
              </span>
            </div>
            <div className="video-frame">
              <iframe
                src="https://www.youtube.com/embed/mUTAq9ffk0s"
                title="Tutorial memasukkan API key Gemini"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </details>
        </div>
        <div className="settings-card">
          <div>
            <p className="eyebrow">DATA</p>
            <h3>Template import siap pakai</h3>
            <p>
              Satu file resmi untuk kelas, siswa, nilai, presensi, dan agenda.
              Petunjuk pengisian tersedia di sheet pertama.
            </p>
          </div>
          <a className="secondary-button" href={TEMPLATE_URL} download>
            <Download size={16} /> Unduh template
          </a>
        </div>
        <div className="settings-card guide-card">
          <div>
            <p className="eyebrow">PETUNJUK PENGGUNAAN</p>
            <h3>Urutan kerja yang disarankan</h3>
            <p>Ikuti urutan ini agar setiap nama dan rekap saling terhubung.</p>
          </div>
          <div className="guide-grid">
            <details open>
              <summary>1. Master Data</summary>
              <p>
                Tambahkan kelas, lalu data siswa. Gunakan template bila ingin
                memasukkan banyak kelas sekaligus. Master Data menjadi sumber
                nama untuk presensi dan nilai.
              </p>
            </details>
            <details>
              <summary>2. Presensi</summary>
              <p>
                Pilih kelas. Wali kelas menggunakan presensi harian; guru mapel
                mengisi tanggal, mata pelajaran, serta jam mulai dan selesai.
                Mode gabungan dapat memilih keduanya.
              </p>
            </details>
            <details>
              <summary>3. Penilaian</summary>
              <p>
                Pilih kelas dan nama siswa dari daftar, isi tugas, nilai, serta
                catatan remedial atau ketuntasan. Tidak perlu mengetik nama
                ulang.
              </p>
            </details>
            <details>
              <summary>4. Jurnal</summary>
              <p>
                Simpan topik, aktivitas, refleksi, dan tindak lanjut. Riwayat
                dapat dibuka kembali dari kartu jurnal.
              </p>
            </details>
            <details>
              <summary>5. Agenda</summary>
              <p>
                Atur pola mengajar Senin–Minggu. Jadwal berulang tiap minggu dan
                dapat diedit dengan menekan kartu agenda.
              </p>
            </details>
            <details>
              <summary>6. Asisten Guru</summary>
              <p>
                Minta analisis presensi, ringkasan jurnal, rencana tindak
                lanjut, atau bantuan administrasi. Periksa kembali hasil AI
                sebelum digunakan.
              </p>
            </details>
            <details>
              <summary>7. Rekap & laporan</summary>
              <p>
                Unduh data presensi dan nilai dalam CSV untuk arsip atau
                pengolahan lanjutan.
              </p>
            </details>
          </div>
        </div>
        <div className="settings-card danger-card">
          <div>
            <h3>Keluar dari aplikasi</h3>
            <p>Sesi akun di perangkat ini akan diakhiri.</p>
          </div>
          <button className="secondary-button" onClick={onLogout}>
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </div>
    </PageSection>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <FileText size={20} />
      </div>
      <strong>{title}</strong>
      <p>{desc}</p>
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, detail: "" };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      detail: error?.message || "Kesalahan render tidak dikenal",
    };
  }
  componentDidCatch(error, info) {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(error?.message || error),
        stack: String(info?.componentStack || "").slice(0, 3000),
        path: window.location.pathname,
      }),
    }).catch(() => {});
    const previousRecovery = Number(
      window.localStorage.getItem("bb_last_auto_recovery") || 0,
    );
    if (Date.now() - previousRecovery > 60000) {
      window.localStorage.setItem("bb_last_auto_recovery", String(Date.now()));
      window.sessionStorage.clear();
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError)
      return (
        <div className="app-error">
          <div className="app-error-card">
            <div className="app-error-mark">!</div>
            <h1>Aplikasi belum dapat dimuat</h1>
            <p>
              Aplikasi sudah mencoba memulihkan sesi. Tekan tombol di bawah
              untuk mengambil ulang data akun dari database.
            </p>
            <small className="error-code">{this.state.detail}</small>
            <button
              onClick={() => {
                window.sessionStorage.clear();
                window.localStorage.removeItem("bb_last_auto_recovery");
                window.location.reload();
              }}
            >
              Pulihkan aplikasi
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
const reactRoot = rootElement.__bantuBeresRoot || createRoot(rootElement);
rootElement.__bantuBeresRoot = reactRoot;
reactRoot.render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
