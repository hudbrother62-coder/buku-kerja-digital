import assert from "node:assert/strict";
import test from "node:test";
import { formatJournalDate, journalExportEntries, journalPdfFilename } from "../src/lib/journal-pdf.js";

const workspace = {
  profile: { schoolName: "SMP Harapan", fullName: "Ibu Maya" },
  classes: [{ id: "kelas7d", name: "7D" }],
  subjects: [{ id: "bahasa", name: "Bahasa Indonesia" }],
};
const saved = {
  id: "jurnal-1",
  journal_date: "2026-11-10",
  class_id: "kelas7d",
  subject_id: "bahasa",
  topic: "Lawan kata",
  activity: "Siswa dibagi menjadi dua kelompok.\nSatu kelompok memberikan pernyataan.",
  reflection: "Memberikan pertanyaan mengenai topik pelajaran",
  follow_up: "Remedial dan pengayaan.",
};

test("ekspor jurnal memuat seluruh data asli, termasuk teks banyak baris", () => {
  const [entry] = journalExportEntries(workspace, saved);
  assert.equal(entry.school, "SMP Harapan");
  assert.equal(entry.teacher, "Ibu Maya");
  assert.equal(entry.className, "7D");
  assert.equal(entry.subject, "Bahasa Indonesia");
  assert.equal(entry.topic, "Lawan kata");
  assert.equal(entry.activity, saved.activity);
  assert.equal(entry.reflection, saved.reflection);
  assert.equal(entry.followUp, saved.follow_up);
  assert.match(entry.date, /10 November 2026/);
});

test("nama unduhan per jurnal aman dan jelas", () => {
  const entries = journalExportEntries(workspace, saved);
  assert.equal(journalPdfFilename(entries), "jurnal-2026-11-10-7d-lawan-kata.pdf");
});

test("kumpulan jurnal diekspor utuh dalam satu file", () => {
  const entries = journalExportEntries(workspace, [saved, { ...saved, id: "jurnal-2", topic: "Menulis" }]);
  assert.equal(entries.length, 2);
  assert.match(journalPdfFilename(entries), /^kumpulan-jurnal-\d{4}-\d{2}-\d{2}-2-catatan\.pdf$/);
});

test("data kosong atau referensi master yang dihapus tidak membuat unduhan rusak", () => {
  assert.deepEqual(journalExportEntries(workspace, []), []);
  const [entry] = journalExportEntries({ profile: {}, classes: [], subjects: [] }, {
    ...saved, class_id: "unknown", subject_id: null, reflection: null, follow_up: null,
  });
  assert.equal(entry.className, "-");
  assert.equal(entry.subject, "Umum / wali kelas");
  assert.equal(entry.reflection, "Belum ada refleksi.");
  assert.equal(entry.followUp, "Belum ada tindak lanjut.");
});

test("tanggal tidak valid tidak diubah menjadi tanggal lain", () => {
  assert.equal(formatJournalDate("2026-02-31"), "2026-02-31");
  assert.equal(formatJournalDate(""), "-");
});
