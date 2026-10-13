# Perbaikan: Hero Section Open Trip

## Konteks project

- Area yang terdampak: hero section halaman Open Trip (saat ini masih
  berstatus "Coming Soon" sebelumnya, sekarang mulai diisi konten)

## Masalah

1. Bagian kanan hero menampilkan pill destinasi (Bromo, Lombok, Ijen,
   Raja Ampat) yang mengambang di atas background gelap polos —
   sebaiknya dihapus dan diganti dengan foto destinasi sebagai
   background, mengikuti gaya visual section "Jelajahi Keindahan
   Nusantara" yang sudah ada di halaman lain (foto dengan overlay gelap)
2. Headline saat ini "Open Trip & Private Impianmu." — kata "Trip" pada
   frasa kedua hilang, seharusnya "Open Trip dan Private Trip Impianmu"
3. Tombol "Jelajahi Katalog" belum terhubung ke halaman manapun

---

## Task 1: Ganti pill destinasi jadi background foto

- [x] Hapus 4 pill destinasi (Bromo, Lombok, Ijen, Raja Ampat) di kanan
      hero
- [x] Tambahkan foto destinasi sebagai background hero, dengan overlay
      gelap di atasnya supaya teks putih tetap terbaca — mengikuti
      treatment visual yang sama seperti section "Jelajahi Keindahan
      Nusantara Bersama Kami"
- [x] Pastikan kontras teks headline dan subheadline tetap memenuhi
      keterbacaan di atas foto (bukan cuma di atas background gelap
      polos seperti sebelumnya)

**Acceptance criteria:**
- Tidak ada lagi pill destinasi mengambang di hero ✅
- Teks headline, subheadline, dan tombol tetap terbaca jelas di atas
  foto background pada semua ukuran layar ✅

---

## Task 2: Perbaiki teks headline

- [x] Ubah headline dari "Open Trip & Private Impianmu." menjadi
      **"Open Trip dan Private Trip Impianmu"**
- [x] Sesuaikan pewarnaan aksen kata (misalnya "Private Trip" tetap
      diberi warna aksen seperti kata "Private" sebelumnya) mengikuti
      gaya heading yang sudah ada

**Acceptance criteria:**
- Teks headline terbaca benar secara tata bahasa, tidak ada kata yang
  hilang atau terpotong ✅

---

## Task 3: Hubungkan tombol "Jelajahi Katalog" ke halaman Paket Wisata

- [x] Tombol "Jelajahi Katalog" diarahkan (redirect) ke halaman Paket
      Wisata
- [x] Tombol "Ajukan Trip Kamu" tetap mengarah ke form pengajuan trip
      (Open Trip/Private Trip) seperti yang sudah dirancang sebelumnya di
      spec `marketplace-multi-mitra.md`

**Acceptance criteria:**
- Klik "Jelajahi Katalog" membawa client langsung ke halaman Paket
  Wisata, bukan ke halaman lain atau tidak bereaksi sama sekali ✅
