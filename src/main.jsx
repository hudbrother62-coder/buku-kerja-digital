import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Users,
  X
} from "lucide-react";
import "./styles.css";

const menu = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "assistant", label: "Asisten AI", icon: Sparkles },
  { id: "students", label: "Siswa", icon: Users },
  { id: "attendance", label: "Presensi", icon: CalendarCheck2 },
  { id: "journal", label: "Jurnal", icon: BookOpen },
  { id: "grades", label: "Penilaian", icon: ClipboardList },
  { id: "reports", label: "Rekap & laporan", icon: BarChart3 }
];

const spaces = [
  { id: "homeroom", title: "Wali Kelas 7A", subtitle: "Ruang kerja utama" },
  { id: "math", title: "Matematika", subtitle: "4 kelas yang diajar" },
  { id: "informatics", title: "Informatika", subtitle: "Kelas 8B" }
];

const students = [
  { name: "Alya Rahma", initials: "AR", status: "Hadir", score: 89, tone: "green" },
  { name: "Bagas Pratama", initials: "BP", status: "Izin", score: 76, tone: "amber" },
  { name: "Citra Lestari", initials: "CL", status: "Hadir", score: 94, tone: "blue" },
  { name: "Dimas Saputra", initials: "DS", status: "Belum diisi", score: 68, tone: "rose" }
];

function Logo() {
  return (
    <div className="brand-mark" aria-label="Bantu Beres">
      <span className="brand-check"><Check size={17} strokeWidth={3} /></span>
      <span className="brand-copy">
        <strong>Bantu Beres</strong>
        <small>Buku Kerja Digital</small>
      </span>
    </div>
  );
}

function App() {
  const [active, setActive] = useState("dashboard");
  const [space, setSpace] = useState(spaces[0]);
  const [spaceOpen, setSpaceOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className={dark ? "app dark" : "app"}>
      <aside className={mobileMenu ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Tutup menu"><X size={19} /></button>
        </div>
        <div className="workspace-label">RUANG KERJA</div>
        <button className="workspace-switch" onClick={() => setSpaceOpen(!spaceOpen)}>
          <span className="workspace-avatar">7A</span>
          <span className="workspace-text"><strong>{space.title}</strong><small>{space.subtitle}</small></span>
          <ChevronDown size={16} />
        </button>
        {spaceOpen && (
          <div className="workspace-menu">
            {spaces.map(item => (
              <button key={item.id} className={space.id === item.id ? "workspace-option selected" : "workspace-option"} onClick={() => { setSpace(item); setSpaceOpen(false); }}>
                <span>{item.title}</span><small>{item.subtitle}</small>
              </button>
            ))}
          </div>
        )}
        <nav className="nav-list">
          {menu.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={active === item.id ? "nav-item active" : "nav-item"} onClick={() => { setActive(item.id); setMobileMenu(false); }}><Icon size={19} /><span>{item.label}</span>{item.id === "assistant" && <span className="nav-badge">AI</span>}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setActive("settings")}><Settings2 size={19} /><span>Pengaturan</span></button>
          <div className="user-mini"><div className="avatar">AH</div><div><strong>Agus Heri</strong><small>Guru & wali kelas</small></div><MoreHorizontal size={17} /></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Buka menu"><Menu size={20} /></button>
          <div className="topbar-title"><span className="eyebrow">Buku Kerja Digital</span><h1>{active === "assistant" ? "Asisten Guru" : pageTitle(active)}</h1></div>
          <div className="topbar-actions">
            <button className="theme-button" onClick={() => setDark(!dark)} aria-label="Ubah tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <div className="top-avatar">AH</div>
          </div>
        </header>

        <div className="content">
          {active === "dashboard" && <Dashboard setActive={setActive} space={space} />}
          {active === "assistant" && <Assistant />}
          {active === "students" && <Students />}
          {active === "attendance" && <Attendance />}
          {active === "journal" && <Journal />}
          {active === "grades" && <Grades />}
          {active === "reports" && <Reports />}
          {active === "settings" && <Settings />}
        </div>
      </main>

      <nav className="mobile-nav">
        {menu.slice(0, 5).map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={active === item.id ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setActive(item.id)}><Icon size={19} /><span>{item.label === "Asisten AI" ? "Asisten" : item.label.split(" ")[0]}</span></button>;
        })}
      </nav>
    </div>
  );
}

function pageTitle(id) {
  return menu.find(item => item.id === id)?.label || "Pengaturan";
}

function Dashboard({ setActive, space }) {
  return (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow">Kamis, 6 September 2026</p><h2>Selamat pagi, Agus.</h2><p className="muted">Berikut ringkasan pekerjaan di <strong>{space.title}</strong>.</p></div>
        <button className="primary-button" onClick={() => setActive("assistant")}><Sparkles size={17} /> Minta bantuan AI</button>
      </section>
      <section className="stat-grid">
        <Stat label="Siswa aktif" value="32" meta="di kelas 7A" icon={Users} tone="teal" />
        <Stat label="Kehadiran hari ini" value="96,8%" meta="1 siswa izin" icon={CalendarCheck2} tone="green" />
        <Stat label="Jurnal bulan ini" value="12" meta="2 belum lengkap" icon={BookOpen} tone="amber" />
        <Stat label="Nilai terisi" value="84%" meta="dari 5 penilaian" icon={ClipboardList} tone="blue" />
      </section>
      <section className="dashboard-grid">
        <div className="panel recent-panel"><div className="panel-head"><div><p className="eyebrow">AKTIVITAS TERBARU</p><h3>Yang perlu diselesaikan</h3></div><button className="text-button" onClick={() => setActive("reports")}>Lihat semua</button></div><div className="task-list"><Task icon={BookOpen} title="Lengkapi jurnal Matematika" meta="Kelas 7A · Hari ini" action="Buka jurnal" onClick={() => setActive("journal")} /><Task icon={ClipboardList} title="Isi nilai tugas pecahan" meta="32 siswa · Belum selesai" action="Isi nilai" onClick={() => setActive("grades")} /><Task icon={CalendarCheck2} title="Periksa presensi siswa" meta="1 catatan perlu ditinjau" action="Periksa" onClick={() => setActive("attendance")} /></div></div>
        <div className="panel ai-panel"><div className="ai-orb"><Sparkles size={22} /></div><p className="eyebrow">ASISTEN GURU</p><h3>Ada yang ingin dibereskan?</h3><p className="muted">Tulis perintah seperti biasa. AI membantu menyusun, merangkum, dan merekap pekerjaanmu.</p><button className="secondary-button" onClick={() => setActive("assistant")}>Buka Asisten AI <ArrowUp size={16} /></button></div>
      </section>
      <section className="panel preview-panel"><div className="panel-head"><div><p className="eyebrow">PRESENSI KELAS</p><h3>Ringkasan hari ini</h3></div><button className="secondary-button small" onClick={() => setActive("attendance")}>Buka presensi</button></div><div className="student-preview">{students.map(s => <div className="student-row" key={s.name}><div className={"student-avatar " + s.tone}>{s.initials}</div><div className="student-name"><strong>{s.name}</strong><small>Nilai rata-rata {s.score}</small></div><span className={"status " + s.tone}>{s.status}</span></div>)}</div></section>
    </>
  );
}

function Stat({ label, value, meta, icon: Icon, tone }) {
  return <div className="stat-card"><div className={"stat-icon " + tone}><Icon size={19} /></div><div><p>{label}</p><strong>{value}</strong><small>{meta}</small></div></div>;
}

function Task({ icon: Icon, title, meta, action, onClick }) {
  return <div className="task-row"><div className="task-icon"><Icon size={18} /></div><div className="task-copy"><strong>{title}</strong><small>{meta}</small></div><button className="text-button" onClick={onClick}>{action}</button></div>;
}

function Assistant() {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);
  const suggestions = ["Ringkas jurnal saya hari ini", "Buatkan refleksi pembelajaran", "Analisis presensi kelas 7A", "Buat tindak lanjut siswa"];

  const send = (value = prompt) => {
    const text = value.trim();
    if (!text || thinking) return;
    setMessages(old => [...old, { role: "user", text }]);
    setPrompt("");
    setThinking(true);
    setTimeout(() => {
      setMessages(old => [...old, { role: "assistant", text: responseFor(text) }]);
      setThinking(false);
    }, 650);
  };

  return <section className="assistant-shell"><div className="assistant-intro"><div className="ai-orb large"><Sparkles size={27} /></div><h2>Asisten Guru</h2><p>Tulis apa yang ingin kamu kerjakan. Saya akan membantu menyusun hasil yang rapi dan siap kamu periksa.</p></div><div className="chat-area">{messages.length === 0 && <div className="suggestions">{suggestions.map(item => <button key={item} className="suggestion" onClick={() => send(item)}><Sparkles size={15} /><span>{item}</span><ArrowUp size={14} /></button>)}</div>}{messages.map((item, index) => <div className={item.role === "user" ? "message user" : "message assistant"} key={index}><div className="message-label">{item.role === "user" ? "Kamu" : "Asisten Guru"}</div><div className="message-body">{item.text}</div>{item.role === "assistant" && <div className="message-actions"><button>Salin</button><button>Simpan ke jurnal</button><button>Perbaiki</button></div>}</div>)}{thinking && <div className="message assistant"><div className="message-label">Asisten Guru</div><div className="thinking"><span></span><span></span><span></span></div></div>}</div><div className="prompt-box"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Tulis perintah untuk asisten guru..." rows="1" /><button className="send-button" onClick={() => send()} disabled={!prompt.trim() || thinking} aria-label="Kirim"><ArrowUp size={19} /></button><small>Tekan Enter untuk mengirim · AI membantu, guru tetap memeriksa hasilnya.</small></div></section>;
}

function responseFor(prompt) {
  if (prompt.toLowerCase().includes("presensi")) return "Saya dapat membantu membaca pola kehadiran kelas 7A. Dari data yang tersedia, fokus pertama adalah meninjau siswa dengan status izin atau alpa berulang, lalu mencatat tindak lanjut pada catatan siswa. Hubungkan data presensi terbaru agar saya dapat membuat rekap yang lebih spesifik.";
  if (prompt.toLowerCase().includes("refleksi")) return "Refleksi Pembelajaran\n\nSebagian besar siswa mengikuti pembelajaran dengan baik. Beberapa siswa masih memerlukan contoh yang lebih konkret dan latihan bertahap agar dapat memahami materi secara mandiri.\n\nTindak lanjut\n\nGuru dapat memberikan pendampingan singkat, latihan bertingkat, dan pemeriksaan pemahaman sebelum melanjutkan ke materi berikutnya.";
  return "Saya siap membantu menyusun pekerjaan tersebut. Pada versi terhubung, saya akan menggunakan kelas, mata pelajaran, jurnal, presensi, dan penilaian yang sedang kamu pilih. Kamu tetap dapat mengedit hasil sebelum menyimpannya.";
}

function Section({ eyebrow, title, action, children }) {
  return <section className="page-section"><div className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</div>{children}</section>;
}

function Toolbar({ placeholder = "Cari..." }) {
  return <div className="toolbar"><div className="search-box"><Search size={17} /><input placeholder={placeholder} /></div><button className="filter-button">Semua <ChevronDown size={15} /></button></div>;
}

function Students() {
  return <Section eyebrow="DATA KELAS" title="Siswa" action={<button className="primary-button"><Plus size={17} /> Tambah siswa</button>}><Toolbar placeholder="Cari nama atau NIS..." /><div className="table-card">{students.concat([{ name: "Elang Wijaya", initials: "EW", status: "Hadir", score: 82, tone: "green" }]).map(s => <div className="student-row" key={s.name}><div className={"student-avatar " + s.tone}>{s.initials}</div><div className="student-name"><strong>{s.name}</strong><small>NIS · Kelas 7A</small></div><span className={"status " + s.tone}>{s.status}</span><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}</div></Section>;
}

function Attendance() {
  return <Section eyebrow="CATATAN KEHADIRAN" title="Presensi" action={<button className="primary-button"><Check size={17} /> Simpan presensi</button>}><div className="control-row"><button className="date-control">Kamis, 6 September 2026 <ChevronDown size={15} /></button><button className="filter-button">Kelas 7A <ChevronDown size={15} /></button></div><div className="attendance-summary"><div><strong>32</strong><span>Total siswa</span></div><div className="present"><strong>30</strong><span>Hadir</span></div><div className="sick"><strong>1</strong><span>Sakit/Izin</span></div><div className="absent"><strong>1</strong><span>Alpa</span></div></div><div className="table-card">{students.concat([{ name: "Elang Wijaya", initials: "EW", status: "Hadir", score: 82, tone: "green" }]).map(s => <div className="attendance-row" key={s.name}><div className={"student-avatar " + s.tone}>{s.initials}</div><div className="student-name"><strong>{s.name}</strong><small>7A · NIS 00{Math.floor(Math.random() * 90 + 10)}</small></div><div className="attendance-actions"><button className={s.status === "Hadir" ? "attendance active present" : "attendance present"}>H</button><button className={s.status === "Sakit" ? "attendance active sick" : "attendance sick"}>S</button><button className={s.status === "Izin" ? "attendance active permission" : "attendance permission"}>I</button><button className={s.status === "Alpa" ? "attendance active absent" : "attendance absent"}>A</button></div></div>)}</div></Section>;
}

function Journal() {
  return <Section eyebrow="CATATAN PEMBELAJARAN" title="Jurnal mengajar" action={<button className="primary-button"><Plus size={17} /> Jurnal baru</button>}><div className="journal-feature"><div className="ai-orb"><Sparkles size={20} /></div><div><strong>Mulai dari catatan singkat</strong><p>Biarkan Asisten Guru membantu menyusun jurnal yang rapi.</p></div><button className="secondary-button">Buka Asisten AI</button></div><div className="journal-list">{["Pecahan dan perbandingan", "Operasi bilangan bulat", "Pengenalan aljabar"].map((title, i) => <div className="journal-card" key={title}><div><span className="date-chip">0{i + 4} SEP</span><strong>{title}</strong><small>Matematika · Kelas 7A</small></div><span className={i === 0 ? "status green" : "status amber"}>{i === 0 ? "Lengkap" : "Draft"}</span></div>)}</div></Section>;
}

function Grades() {
  return <Section eyebrow="HASIL BELAJAR" title="Penilaian" action={<button className="primary-button"><Plus size={17} /> Penilaian baru</button>}><div className="grade-highlight"><div><p className="eyebrow">MATEMATIKA · KELAS 7A</p><strong>84,2</strong><span>Rata-rata kelas</span></div><div className="grade-bar"><span style={{width:"84%"}}></span></div><small>84% nilai sudah terisi</small></div><div className="table-card">{students.map(s => <div className="student-row" key={s.name}><div className={"student-avatar " + s.tone}>{s.initials}</div><div className="student-name"><strong>{s.name}</strong><small>Penilaian: Tugas Pecahan</small></div><span className="grade-number">{s.score}</span><button className="icon-button"><MoreHorizontal size={18} /></button></div>)}</div></Section>;
}

function Reports() {
  return <Section eyebrow="RINGKASAN DATA" title="Rekap & laporan" action={<button className="secondary-button"><FileText size={17} /> Export laporan</button>}><div className="report-grid"><ReportCard title="Rekap presensi" desc="Kehadiran siswa per bulan dan semester" icon={CalendarCheck2} /><ReportCard title="Rekap penilaian" desc="Nilai per kelas dan mata pelajaran" icon={ClipboardList} /><ReportCard title="Laporan wali kelas" desc="Ringkasan perkembangan kelas" icon={GraduationCap} /><ReportCard title="Jurnal mengajar" desc="Daftar jurnal lengkap dan draft" icon={BookOpen} /></div></Section>;
}

function ReportCard({ title, desc, icon: Icon }) {
  return <div className="report-card"><div className="report-icon"><Icon size={19} /></div><strong>{title}</strong><p>{desc}</p><button className="text-button">Buka laporan <ArrowUp size={15} /></button></div>;
}

function Settings() {
  return <Section eyebrow="PENGATURAN" title="Pengaturan aplikasi"><div className="settings-card"><div className="settings-row"><div><strong>API key pribadi</strong><p>Gunakan API key sendiri jika diperlukan untuk Asisten Guru.</p></div><button className="secondary-button">Atur API key</button></div><div className="settings-row"><div><strong>Profil dan ruang kerja</strong><p>Kelola peran wali kelas, kelas, dan mata pelajaran.</p></div><button className="secondary-button">Kelola</button></div><div className="settings-row"><div><strong>Data dan backup</strong><p>Import Excel atau unduh salinan data kerja.</p></div><button className="secondary-button">Buka</button></div></div></Section>;
}

export default App;

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div className="app-error"><div className="app-error-card"><div className="app-error-mark">!</div><h1>Aplikasi belum dapat dimuat</h1><p>Segarkan halaman untuk mencoba lagi. Jika masalah berlanjut, periksa konfigurasi deployment.</p><button onClick={() => window.location.reload()}>Segarkan halaman</button></div></div>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App /></AppErrorBoundary>);
