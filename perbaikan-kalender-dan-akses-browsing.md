# Perbaikan: Kalender & Akses Browsing Tanpa Login

## Konteks project

- Area yang terdampak: komponen kalender (dipakai di card client, admin
  manual order, dan kemungkinan komponen tanggal lain yang berbagi kode
  yang sama), serta guard autentikasi pada halaman Layanan dan Paket
  Wisata

## Masalah

### 1. Kalender salah menempatkan tanggal ke kolom hari

Tanggal 3 Agustus 2026 (seharusnya hari Senin) tampil di kolom Selasa —
seluruh tanggal bergeser satu kolom ke kanan. Kemungkinan penyebab:
perhitungan index hari (`Date.getDay()` di JavaScript mengembalikan
`0 = Minggu`) tidak dikonversi dengan benar ke urutan kolom kalender yang
dimulai dari Senin, sehingga terjadi pergeseran satu kolom untuk semua
hari kecuali Minggu.

### 2. Client wajib login hanya untuk melihat katalog

Saat ini, mengklik menu "Layanan" atau "Paket Wisata" tanpa login akan
langsung diarahkan ke halaman login. Berdasarkan masukan calon client
(lihat lampiran percakapan), ini menciptakan friksi besar — calon client
merasa proses terlalu teknis ("harus bikin akun dulu") hanya untuk
sekadar melihat pilihan unit atau paket, dan berpotensi membuat mereka
pergi sebelum sempat tertarik.

---

## Task 1: Perbaiki perhitungan kolom hari pada kalender

- [ ] Audit fungsi yang menghitung offset hari pertama tiap bulan (cari
      pemakaian `Date.getDay()` atau setara di komponen kalender)
- [ ] Konversi index hari dari standar JavaScript (`0 = Minggu`) ke
      urutan kolom kalender yang dimulai dari Senin, contoh:
      `const mondayFirstIndex = (jsDay + 6) % 7;`
- [ ] Terapkan perbaikan ke semua tempat yang menggunakan komponen
      kalender yang sama (card client, admin manual order), bukan hanya
      satu tempat, supaya tidak ada versi kalender yang masih salah di
      bagian lain

**Acceptance criteria:**
- Untuk sembarang bulan/tahun, tanggal yang diketahui hari-nya (misalnya
  3 Agustus 2026 = Senin) tampil tepat di kolom hari yang sesuai
- Perbaikan konsisten di semua komponen kalender yang ada di aplikasi,
  tidak hanya satu instance

---

## Task 2: Izinkan browsing katalog tanpa login, wajibkan login saat aksi

- [ ] Ubah route/guard halaman **Layanan** dan **Paket Wisata** (termasuk
      katalog Open Trip) menjadi publik — bisa diakses tanpa login
- [ ] Login/registrasi hanya diwajibkan saat client benar-benar melakukan
      aksi yang butuh akun, misalnya:
  - Klik "Sewa Sekarang" / submit booking
  - Mengajukan rencana Open Trip / Private Trip
  - Melihat riwayat pesanan pribadi
- [ ] Setelah login/registrasi, client diarahkan kembali ke halaman atau
      unit yang tadi ingin diakses (bukan ke homepage), supaya proses
      booking tidak perlu diulang dari awal

**Acceptance criteria:**
- Client yang belum login dapat melihat seluruh katalog unit dan paket
  wisata tanpa diarahkan ke halaman login
- Client baru diminta login tepat saat mengklik aksi yang memerlukan
  identitas (booking, pengajuan trip, riwayat pesanan)
- Setelah login, client kembali ke konteks yang sedang dikerjakan
  sebelumnya (unit/paket yang tadi diklik), bukan mulai dari halaman awal

---

## Referensi visual

Mockup perbandingan sudah dibuat di percakapan sebelumnya, mencakup:
- Kalender sebelum dan sesudah perbaikan penempatan kolom hari
- Alur browsing tanpa login: lihat katalog bebas → klik aksi → baru
  diminta login → kembali ke konteks semula setelah login
