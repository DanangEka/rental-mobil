# Perbaikan tampilan mobile

## Konteks project

- Area yang terdampak: navbar halaman utama (mobile), modal "Sewa Manual"
  di Kasir Admin Panel (mobile)
- Ditemukan saat pengujian di layar mobile sempit (~375-390px)

## Masalah

### 1. Navbar — ikon profil terpotong

Ikon bel notifikasi dan avatar profil di kanan atas navbar terlalu mepet
ke tepi layar. Avatar (lingkaran inisial) terlihat terpotong sebagian,
kemungkinan karena padding kanan container tidak konsisten atau ada
negative margin yang tidak disengaja.

### 2. Modal "Sewa Manual" — layout tidak rapi

Form input pada modal Kasir Admin Panel terlihat berantakan di layar
mobile:
- Field tanggal "Mulai" dan "Selesai" dipaksa berdampingan dalam ruang
  sempit, membuat masing-masing input date terlalu kecil untuk diketik
  dengan nyaman
- Box ringkasan (estimasi durasi, grand total, metode pembayaran)
  tampak overflow — dropdown "Tunai/Cash" tidak menyesuaikan lebar
  container induknya

---

## Task 1: Perbaikan navbar

- [ ] Samakan padding kanan container navbar dengan padding kiri
      (hilangkan negative margin di sekitar ikon bel/avatar)
- [ ] Beri jarak (gap) minimal 8-10px antara ikon bel dan avatar profil
- [ ] Pastikan avatar tidak terpotong oleh `overflow: hidden` pada
      elemen pembungkus manapun

**Acceptance criteria:**
- Avatar profil terlihat penuh (lingkaran utuh) di semua lebar layar
  mobile umum (360px-430px)
- Jarak ikon bel ke avatar dan avatar ke tepi layar terlihat seimbang

---

## Task 2: Perbaikan layout modal Sewa Manual

- [ ] Ubah field tanggal "Mulai" dan "Selesai" dari 2 kolom berdampingan
      menjadi ditumpuk 1 kolom di layar mobile (breakpoint disesuaikan
      dengan lebar modal, bukan lebar layar penuh)
- [ ] Pastikan semua elemen di dalam box ringkasan (estimasi durasi,
      grand total, dropdown metode pembayaran) mengikuti lebar
      container, tidak overflow ke luar card
- [ ] Cek padding horizontal modal konsisten di semua section (info
      pelanggan, tanggal sewa, nominal DP, ringkasan)

**Acceptance criteria:**
- Tidak ada elemen yang terpotong atau overflow ke luar batas modal di
  lebar layar 360px-430px
- Field date input cukup lebar untuk menampilkan format tanggal penuh
  tanpa terpotong

---

## Referensi visual

Mockup interaktif sudah dibuat di percakapan sebelumnya, mencakup:
- Perbandingan navbar sebelum/sesudah (avatar terpotong vs padding
  konsisten)
- Modal Sewa Manual versi rapi dengan field tanggal 1 kolom dan box
  ringkasan full-width mengikuti container
