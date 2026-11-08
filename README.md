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

## Pembaruan GroqCloud (November 2026)

Asisten Guru sekarang memakai API GroqCloud, bukan Gemini. Pengguna membuka **Pengaturan → Asisten Guru GroqCloud**, membuat key di https://console.groq.com/keys, kemudian memilih **Uji Koneksi & Simpan**. Key harus diawali `gsk_`. Model dipilih otomatis dari `GET /openai/v1/models` dan menggunakan fallback model lain yang diizinkan key. Key Gemini tidak dapat digunakan. Pemberitahuan pembaruan tampil setelah pengguna login.

Jika tersedia, pengelola dapat mengatur `GROQ_API_KEY_1` sampai `GROQ_API_KEY_3` di Vercel; tanpa key server, pengguna memasukkan key Groq sendiri. Untuk kompatibilitas aplikasi lama, key pribadi Buku Kerja Digital disimpan di browser perangkat itu sendiri; jangan gunakan perangkat bersama. Jangan memasukkan API key ke repository.
