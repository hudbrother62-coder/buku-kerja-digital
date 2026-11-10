const BRAND = "BANTU BERES - BUKU KERJA DIGITAL";
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const TEXT_LEFT = 25;
const TEXT_WIDTH = 160;
const CONTENT_BOTTOM = 267;

function asText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function formatJournalDate(value) {
  const date = asText(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return asText(value) || "-";
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    parsed.getFullYear() !== Number(match[1]) ||
    parsed.getMonth() !== Number(match[2]) - 1 ||
    parsed.getDate() !== Number(match[3])
  ) return asText(value) || "-";
  return parsed.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function journalExportEntries(data, journals) {
  const rows = Array.isArray(journals) ? journals : [journals];
  return rows.filter(Boolean).map((journal) => ({
    id: asText(journal.id),
    dateRaw: asText(journal.journal_date).slice(0, 10),
    date: formatJournalDate(journal.journal_date),
    school: asText(data?.profile?.schoolName || data?.school?.name) || "-",
    teacher: asText(data?.profile?.fullName) || "-",
    className: asText(data?.classes?.find((item) => item.id === journal.class_id)?.name) || "-",
    subject: asText(data?.subjects?.find((item) => item.id === journal.subject_id)?.name) || "Umum / wali kelas",
    topic: asText(journal.topic) || "-",
    activity: asText(journal.activity) || "Belum ada catatan aktivitas.",
    reflection: asText(journal.reflection) || "Belum ada refleksi.",
    followUp: asText(journal.follow_up) || "Belum ada tindak lanjut.",
  }));
}

function slug(value) {
  return asText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 46) || "jurnal";
}

export function journalPdfFilename(entries) {
  if (entries.length === 1) {
    const row = entries[0];
    return "jurnal-" + slug(row.dateRaw) + "-" + slug(row.className) + "-" + slug(row.topic) + ".pdf";
  }
  return "kumpulan-jurnal-" + new Date().toISOString().slice(0, 10) + "-" + entries.length + "-catatan.pdf";
}

function drawPageFrame(pdf, continuation) {
  pdf.setFillColor(250, 250, 253);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(12, 12, 186, 269, 3, 3, "F");
  pdf.setFillColor(115, 36, 154);
  pdf.rect(12, 12, 186, 3.5, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(115, 36, 154);
  pdf.text(BRAND, 20, 27);
  pdf.setTextColor(24, 34, 55);
  pdf.setFontSize(17);
  pdf.text("JURNAL MENGAJAR", 20, 43);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(102, 112, 133);
  pdf.text(continuation ? "Lanjutan catatan pembelajaran" : "Dokumentasi kegiatan pembelajaran", 20, 51);
  pdf.setDrawColor(225, 229, 239);
  pdf.line(20, 58, 190, 58);
  return 66;
}

function addFormattedPage(pdf, continuation, forceNewPage) {
  if (forceNewPage) pdf.addPage();
  return drawPageFrame(pdf, continuation);
}

function wrapText(pdf, value, maxWidth) {
  return asText(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .flatMap((paragraph) => paragraph
      ? pdf.splitTextToSize(paragraph, maxWidth)
      : [""]);
}

function drawJournal(pdf, entry, firstPage) {
  let y = addFormattedPage(pdf, false, !firstPage);
  const nextPage = () => {
    y = addFormattedPage(pdf, true, true);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(105, 112, 130);
    pdf.text(("Topik: " + entry.topic).slice(0, 102), TEXT_LEFT, y);
    y += 8;
  };
  const ensureRoom = (height) => {
    if (y + height > CONTENT_BOTTOM) nextPage();
  };
  const metadata = (label, value) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const lines = wrapText(pdf, value, 119);
    const height = Math.max(6, lines.length * 5.2);
    ensureRoom(height + 2);
    pdf.setTextColor(103, 113, 135);
    pdf.text(label, TEXT_LEFT, y);
    pdf.setTextColor(30, 41, 63);
    lines.forEach((line, index) => pdf.text(line || " ", 64, y + index * 5.2));
    y += height + 2;
  };
  metadata("Sekolah", entry.school);
  metadata("Nama guru", entry.teacher);
  metadata("Tanggal", entry.date);
  metadata("Kelas", entry.className);
  metadata("Mata pelajaran", entry.subject);
  y += 5;

  const section = (label, value) => {
    ensureRoom(18);
    pdf.setFillColor(244, 239, 249);
    pdf.roundedRect(20, y - 3, 170, 10, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(109, 35, 146);
    pdf.text(label, TEXT_LEFT, y + 3.5);
    y += 15;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(35, 45, 64);
    for (const line of wrapText(pdf, value, TEXT_WIDTH)) {
      ensureRoom(6);
      if (line) pdf.text(line, TEXT_LEFT, y);
      y += line ? 5.6 : 4;
    }
    y += 10;
  };
  section("TOPIK PEMBELAJARAN", entry.topic);
  section("AKTIVITAS PEMBELAJARAN", entry.activity);
  section("REFLEKSI", entry.reflection);
  section("TINDAK LANJUT", entry.followUp);
}

export async function downloadJournalPdf(data, journals) {
  const entries = journalExportEntries(data, journals);
  if (!entries.length) throw new Error("Belum ada jurnal yang bisa diunduh.");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  entries.forEach((entry, index) => drawJournal(pdf, entry, index === 0));
  const totalPages = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(225, 229, 239);
    pdf.line(20, 276, 190, 276);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(115, 124, 143);
    pdf.text(BRAND, 20, 283);
    pdf.text("Halaman " + page + " dari " + totalPages, 190, 283, { align: "right" });
  }
  pdf.save(journalPdfFilename(entries));
  return entries.length;
}
