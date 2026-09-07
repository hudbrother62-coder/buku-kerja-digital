import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/workspace/scratch/7abf7224fb71/outputs/buku-kerja-digital-template";
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const navy = "#17233B", purple = "#74279E", blue = "#1676C4", ink = "#1F2937", muted = "#64748B", light = "#F8FAFC", line = "#DCE3EE", warning = "#FFF8E7";

function styleSheet(sheet, widths) {
  sheet.showGridLines = false;
  for (const [range, width] of widths) sheet.getRange(range).format.columnWidth = width;
}
function addTitle(sheet, title, subtitle, lastCol) {
  sheet.mergeCells(`A1:${lastCol}1`); sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${lastCol}1`).format = { fill: navy, font: { bold: true, color: "#FFFFFF", size: 18 }, verticalAlignment: "center" };
  sheet.getRange(`A1:${lastCol}1`).format.rowHeight = 34;
  sheet.mergeCells(`A2:${lastCol}2`); sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${lastCol}2`).format = { fill: light, font: { color: muted, italic: true }, wrapText: true, verticalAlignment: "center" };
  sheet.getRange(`A2:${lastCol}2`).format.rowHeight = 31;
}
function addHeader(sheet, range) { sheet.getRange(range).format = { fill: purple, font: { bold: true, color: "#FFFFFF" }, wrapText: true, horizontalAlignment: "center", verticalAlignment: "center", borders: { preset: "all", style: "thin", color: line } }; sheet.getRange(range).format.rowHeight = 34; }
function addBody(sheet, range) { sheet.getRange(range).format = { font: { color: ink }, wrapText: true, verticalAlignment: "center", borders: { preset: "all", style: "thin", color: line } }; }
function exampleStyle(sheet, range) { sheet.getRange(range).format = { fill: "#F1F5F9", font: { color: muted, italic: true }, wrapText: true, borders: { preset: "all", style: "thin", color: line } }; }

const guide = workbook.worksheets.add("PETUNJUK");
addTitle(guide, "Bantu Beres · Template Import Master", "Nama sheet dan nama kolom jangan diubah. Hapus baris CONTOH sebelum file diimpor ke aplikasi.", "F");
guide.getRange("A4:C4").values = [["Langkah", "Yang dilakukan", "Hasil di aplikasi"]]; addHeader(guide, "A4:C4");
guide.getRange("A5:C11").values = [
  [1, "Isi MASTER_KELAS", "Semua kelas yang dinaungi guru dibuat lebih dahulu."],
  [2, "Isi MASTER_SISWA", "Setiap siswa ditautkan ke kelas melalui class_name."],
  [3, "Import dari menu Master Data", "Kelas dan siswa masuk ke database akun guru."],
  [4, "Isi NILAI bila diperlukan", "Nama siswa dicocokkan dengan NISN atau nama lengkap."],
  [5, "Isi PRESENSI bila diperlukan", "Status kehadiran terbaca per kelas, tanggal, dan sesi."],
  [6, "Isi JADWAL_MINGGUAN", "Pola agenda mengajar dapat disiapkan per hari."],
  [7, "Periksa hasil", "Baris contoh, ganda, atau tidak lengkap akan dilewati."],
]; addBody(guide, "A5:C11");
guide.mergeCells("A13:F13"); guide.getRange("A13").values = [["Aturan penting"]]; guide.getRange("A13:F13").format = { fill: warning, font: { bold: true, color: "#8A5712" } };
guide.getRange("A14:F18").merge(true); guide.getRange("A14:F18").values = [
  ["• Isi class_name dengan penulisan yang sama pada MASTER_KELAS dan MASTER_SISWA."],
  ["• NISN sebaiknya diisi karena menjadi pencocok paling aman saat import nilai."],
  ["• Tanggal memakai format yyyy-mm-dd. Jam memakai format HH:mm."],
  ["• Jenis presensi: homeroom untuk wali kelas, subject untuk mata pelajaran."],
  ["• Nilai point tidak boleh melebihi max_point. Gunakan angka, misalnya 87.5."],
]; guide.getRange("A14:F18").format = { fill: "#FFFBEB", font: { color: ink }, wrapText: true, verticalAlignment: "center" };
guide.getRange("A20:C20").values = [["Sheet", "Fungsi", "Diimpor dari menu"]]; addHeader(guide, "A20:C20");
guide.getRange("A21:C25").values = [["MASTER_KELAS", "Daftar semua kelas", "Master Data"], ["MASTER_SISWA", "Database identitas siswa", "Master Data"], ["NILAI", "Nilai dan catatan ketuntasan", "Penilaian"], ["PRESENSI", "Kehadiran per sesi", "Presensi"], ["JADWAL_MINGGUAN", "Pola agenda berulang", "Agenda"]]; addBody(guide, "A21:C25");
styleSheet(guide, [["A:A", 18], ["B:B", 42], ["C:C", 52], ["D:F", 4]]);

const classes = workbook.worksheets.add("MASTER_KELAS");
addTitle(classes, "Master Kelas", "Satu baris untuk satu kelas. Semua kelas yang dinaungi guru boleh dimasukkan sekaligus.", "D");
classes.getRange("A4:D4").values = [["class_name", "grade_level", "academic_year", "active"]]; addHeader(classes, "A4:D4");
classes.getRange("A5:D6").values = [["CONTOH 7A", "7", "2026/2027", true], ["", "", "", ""]]; addBody(classes, "A5:D105"); exampleStyle(classes, "A5:D5");
classes.getRange("D5:D105").dataValidation = { rule: { type: "list", values: [true, false] } };
styleSheet(classes, [["A:A", 22], ["B:B", 16], ["C:C", 20], ["D:D", 14]]); classes.freezePanes.freezeRows(4);

const students = workbook.worksheets.add("MASTER_SISWA");
addTitle(students, "Master Siswa", "Wajib: full_name dan class_name. Isi class_name sesuai MASTER_KELAS.", "L");
const studentHeaders = ["full_name", "nickname", "nis", "nisn", "gender", "birth_date", "address", "phone", "parent_phone", "class_name", "academic_year", "active"];
students.getRange("A4:L4").values = [studentHeaders]; addHeader(students, "A4:L4");
students.getRange("A5:L6").values = [["CONTOH Hapus Baris Ini", "Alya", "1001", "0012345678", "P", "2012-04-17", "Jl. Contoh No. 1", "081234567890", "081298765432", "7A", "2026/2027", true], ["", "", "", "", "", "", "", "", "", "", "", ""]]; addBody(students, "A5:L505"); exampleStyle(students, "A5:L5");
students.getRange("E5:E505").dataValidation = { rule: { type: "list", values: ["L", "P"] } }; students.getRange("L5:L505").dataValidation = { rule: { type: "list", values: [true, false] } }; students.getRange("F5:F505").format.numberFormat = "yyyy-mm-dd";
styleSheet(students, [["A:A", 30], ["B:B", 18], ["C:D", 17], ["E:E", 12], ["F:F", 16], ["G:G", 38], ["H:I", 20], ["J:J", 16], ["K:K", 18], ["L:L", 12]]); students.freezePanes.freezeRows(4);

const grades = workbook.worksheets.add("NILAI");
addTitle(grades, "Import Nilai", "Nama siswa berasal dari Master Data. NISN adalah pencocok utama; catatan bebas untuk remedial atau ketuntasan.", "J");
grades.getRange("A4:J4").values = [["student_nisn", "student_name", "class_name", "subject_name", "assessment_title", "assessment_category", "assessment_date", "point", "max_point", "comment"]]; addHeader(grades, "A4:J4");
grades.getRange("A5:J6").values = [["0012345678", "CONTOH Hapus Baris Ini", "7A", "Matematika", "Tugas 1", "TUGAS", "2026-08-20", 86, 100, "Tuntas"], ["", "", "", "", "", "", "", "", "", ""]]; addBody(grades, "A5:J505"); exampleStyle(grades, "A5:J5");
grades.getRange("F5:F505").dataValidation = { rule: { type: "list", values: ["TUGAS", "UH", "PTS", "PAS", "PROYEK", "LAINNYA"] } }; grades.getRange("G5:G505").format.numberFormat = "yyyy-mm-dd"; grades.getRange("H5:I505").format.numberFormat = "0.00";
styleSheet(grades, [["A:A", 18], ["B:B", 30], ["C:C", 14], ["D:D", 22], ["E:E", 25], ["F:F", 20], ["G:G", 16], ["H:I", 14], ["J:J", 40]]); grades.freezePanes.freezeRows(4);

const attendance = workbook.worksheets.add("PRESENSI");
addTitle(attendance, "Import Presensi", "Gunakan homeroom untuk presensi wali kelas dan subject untuk presensi mata pelajaran.", "J");
attendance.getRange("A4:J4").values = [["date", "class_name", "session_type", "subject_name", "start_time", "end_time", "student_nisn", "student_name", "status", "note"]]; addHeader(attendance, "A4:J4");
attendance.getRange("A5:J6").values = [["2026-08-20", "7A", "subject", "Matematika", "07:00", "08:00", "0012345678", "CONTOH Hapus Baris Ini", "H", ""], ["", "", "", "", "", "", "", "", "", ""]]; addBody(attendance, "A5:J505"); exampleStyle(attendance, "A5:J5");
attendance.getRange("C5:C505").dataValidation = { rule: { type: "list", values: ["homeroom", "subject"] } }; attendance.getRange("I5:I505").dataValidation = { rule: { type: "list", values: ["H", "S", "I", "A"] } }; attendance.getRange("A5:A505").format.numberFormat = "yyyy-mm-dd";
styleSheet(attendance, [["A:A", 16], ["B:B", 15], ["C:C", 18], ["D:D", 22], ["E:F", 14], ["G:G", 18], ["H:H", 30], ["I:I", 12], ["J:J", 36]]); attendance.freezePanes.freezeRows(4);

const schedules = workbook.worksheets.add("JADWAL_MINGGUAN");
addTitle(schedules, "Jadwal Mingguan Guru", "Satu baris untuk satu pola mengajar yang berulang setiap minggu.", "G");
schedules.getRange("A4:G4").values = [["day", "class_name", "subject_name", "start_time", "end_time", "note", "active"]]; addHeader(schedules, "A4:G4");
schedules.getRange("A5:G6").values = [["Senin", "7A", "Matematika", "07:00", "08:20", "CONTOH Hapus Baris Ini", true], ["", "", "", "", "", "", ""]]; addBody(schedules, "A5:G205"); exampleStyle(schedules, "A5:G5");
schedules.getRange("A5:A205").dataValidation = { rule: { type: "list", values: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] } }; schedules.getRange("G5:G205").dataValidation = { rule: { type: "list", values: [true, false] } };
styleSheet(schedules, [["A:A", 16], ["B:B", 16], ["C:C", 24], ["D:E", 15], ["F:F", 40], ["G:G", 12]]); schedules.freezePanes.freezeRows(4);

const choices = workbook.worksheets.add("DAFTAR_PILIHAN");
addTitle(choices, "Daftar Pilihan", "Referensi nilai yang diterima aplikasi. Jangan menghapus sheet ini.", "F");
choices.getRange("A4:F4").values = [["gender", "status_presensi", "session_type", "assessment_category", "day", "active"]]; addHeader(choices, "A4:F4");
choices.getRange("A5:F11").values = [["L", "H", "homeroom", "TUGAS", "Senin", true], ["P", "S", "subject", "UH", "Selasa", false], ["", "I", "", "PTS", "Rabu", ""], ["", "A", "", "PAS", "Kamis", ""], ["", "", "", "PROYEK", "Jumat", ""], ["", "", "", "LAINNYA", "Sabtu", ""], ["", "", "", "", "Minggu", ""]]; addBody(choices, "A5:F11");
styleSheet(choices, [["A:A", 16], ["B:B", 20], ["C:C", 18], ["D:D", 24], ["E:E", 18], ["F:F", 14]]);

for (const sheet of [guide, classes, students, grades, attendance, schedules, choices]) { const used = sheet.getUsedRange(); if (used) used.format.font = { ...(used.format.font ?? {}), name: "Aptos" }; }

const inspect = await workbook.inspect({ kind: "sheet,region", maxChars: 10000, tableMaxRows: 6, tableMaxCols: 12 });
await fs.writeFile(`${outputDir}/inspect.txt`, inspect.ndjson ?? String(inspect));
const errorScan = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
await fs.writeFile(`${outputDir}/formula-errors.txt`, errorScan.ndjson ?? String(errorScan));
for (const sheetName of ["PETUNJUK", "MASTER_KELAS", "MASTER_SISWA", "NILAI", "PRESENSI", "JADWAL_MINGGUAN", "DAFTAR_PILIHAN"]) { const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" }); await fs.writeFile(`${outputDir}/${sheetName}.png`, new Uint8Array(await preview.arrayBuffer())); }
const xlsx = await SpreadsheetFile.exportXlsx(workbook); await xlsx.save(`${outputDir}/Bantu_Beres_Template_Import.xlsx`);
console.log(JSON.stringify({ outputDir, sheets: ["PETUNJUK", "MASTER_KELAS", "MASTER_SISWA", "NILAI", "PRESENSI", "JADWAL_MINGGUAN", "DAFTAR_PILIHAN"] }, null, 2));
