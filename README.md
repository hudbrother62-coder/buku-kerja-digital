# Bantu Beres Buku Kerja Digital

Aplikasi kerja guru dan wali kelas yang membantu mencatat siswa, presensi, jurnal, penilaian, rekap, laporan, dan menggunakan Asisten Guru berbasis AI.

## Pengembangan lokal

```bash
npm install
npm run dev
```

## Environment variable

Buat file `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Kunci yang boleh berada di frontend hanya publishable/anon key Supabase. Service role key dan API key AI wajib berada di server atau environment variable server, bukan di source code.

## Prinsip produk

- Ruang kerja wali kelas dan guru mata pelajaran dipisahkan.
- Presensi, jurnal, dan nilai terikat pada sekolah, tahun ajaran, kelas, mata pelajaran, dan pengguna.
- Output Asisten Guru dapat diedit sebelum disimpan.
- Tampilan mobile-first dengan mode terang dan gelap.
