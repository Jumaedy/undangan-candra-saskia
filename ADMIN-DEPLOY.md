# Panel Admin & Deploy (Vercel + GitHub)

## Yang berubah

- **`/kelola`** = panel admin khusus (tamu **tidak** login).
- Login admin memakai **PIN** yang di-hash di database (`admin_lock`), bukan sandi hardcoded di frontend.
- **CRUD tamu**, **CRUD ucapan/doa restu**, **edit isi undangan**, dan **laporan RSVP** hanya bisa dilakukan setelah admin login.
- Tamu tetap buka undangan tanpa akun, kirim ucapan/RSVP tanpa login.
- Data disimpan di **Postgres** (Neon di production / PGLite lokal). Sudah tidak bergantung pada crudcrud.com.

## Alur admin pertama kali

1. Buka `https://domain-anda.vercel.app/kelola`
2. Buat PIN baru (min. 4 karakter) — hanya sekali.
3. Login dengan PIN tersebut.
4. Tab **Tamu**: tambah/edit/hapus, salin pesan, WA massal.
5. Tab **Isi**: ubah teks undangan (nama, jadwal, maps, ayat, dll).
6. Tab **Ucapan**: lihat / ubah / hapus doa restu tamu.
7. Tab **Laporan**: ringkasan jumlah tamu, hadir / tidak hadir.

PIN tersimpan di `sessionStorage` selama sesi browser (logout untuk keluar).

## Deploy ke GitHub + Vercel

### 1. Database (wajib agar data persisten)

Buat project gratis di [Neon](https://neon.tech), salin connection string:

```
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### 2. Vercel

1. Import repo GitHub ke Vercel (framework: sudah `tanstack-start` di `vercel.json`).
2. **Settings → Environment Variables** tambahkan:
   - `DATABASE_URL` = string Neon di atas (Production + Preview).
3. Redeploy. Saat `npm run build`, migrasi `migrations/*.sql` otomatis dijalankan (`db:migrate`).

Tanpa `DATABASE_URL`, app tetap jalan (PGLite), tetapi data **tidak persisten** antar request serverless.

### 3. GitHub

```bash
git add .
git commit -m "Admin panel: PIN server-side, CRUD tamu & ucapan di database"
git push origin main
```

Vercel akan otomatis deploy jika sudah terhubung ke repo.

## Keamanan singkat

- PIN di-hash SHA-256 (dengan salt app) di server.
- Operasi admin (list/add/delete tamu, update settings, hapus ucapan) **wajib** kirim PIN yang valid.
- Endpoint publik: lihat undangan, kirim ucapan, baca daftar ucapan.
- Jangan share link `/kelola` + PIN ke tamu.

## Link berguna

- Undangan tamu: `/?to=Nama+Tamu`
- Panel admin: `/kelola`
