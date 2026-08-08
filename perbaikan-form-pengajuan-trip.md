# Perbaikan: Form Pengajuan Trip (Open Trip / Private Trip)

## Konteks project

- Area yang terdampak: modal "Form Pengajuan — Detail Perjalananmu"
- Melengkapi rancangan yang sudah dibahas di `marketplace-multi-mitra.md`
  (Task 5: Pengajuan Open Trip / Private Trip oleh client)

## Masalah

Form saat ini sudah mencakup pemilihan tipe trip, destinasi/rute, tanggal,
jumlah peserta, dan catatan tambahan — tapi ada beberapa bagian penting
dari rancangan awal yang belum masuk ke form.

---

## Task 1: Tambahkan pilihan tier untuk Open Trip

- [ ] Saat client memilih tipe trip **Open Trip**, tampilkan field
      tambahan (kondisional, tidak muncul untuk Private Trip): pilihan
      tier **VIP** (include snack + makan 2x) atau **Reguler** (tanpa
      snack/makan)
- [ ] Tampilkan singkat perbedaan fasilitas di dekat pilihan tier,
      supaya client paham konsekuensinya sebelum submit

**Acceptance criteria:**
- Field tier hanya muncul saat tipe trip "Open Trip" dipilih, dan hilang
  otomatis saat berpindah ke "Private Trip"
- Data tier tersimpan dan diteruskan ke admin sebagai bagian dari
  `trip_requests` (field `tier`)

---

## Task 2: Ubah field tanggal jadi rentang (mulai — selesai/durasi)

- [ ] Ganti field "Tanggal Diinginkan" (satu tanggal) menjadi dua field:
      **Tanggal Mulai** dan **Tanggal Selesai**, atau alternatifnya
      Tanggal Mulai + estimasi durasi (contoh: "3 hari 2 malam")
- [ ] Validasi tanggal selesai tidak boleh lebih awal dari tanggal mulai

**Acceptance criteria:**
- Admin menerima rentang tanggal yang jelas (bukan satu titik tanggal
  saja) untuk keperluan perhitungan biaya dan penjadwalan

---

## Task 3: Tambahkan field kontak (untuk client yang belum login)

- [ ] Jika form dapat diakses tanpa login (sesuai perbaikan akses
      browsing yang sudah dirancang), tambahkan field nomor WhatsApp/
      kontak wajib diisi
- [ ] Jika client sudah login, field ini bisa otomatis terisi dari data
      akun dan tidak perlu diketik ulang

**Acceptance criteria:**
- Setiap pengajuan trip yang masuk ke admin selalu punya kontak yang
  bisa dihubungi, baik dari akun login maupun input manual

---

## Task 4: Tampilkan ekspektasi waktu respons (SLA)

- [ ] Tambahkan catatan kecil di dekat tombol submit, contoh: "Tim kami
      akan merespons pengajuanmu maksimal dalam 2x24 jam"
- [ ] Setelah submit berhasil, tampilkan konfirmasi yang mengulang info
      SLA ini (di halaman konfirmasi atau notifikasi)

**Acceptance criteria:**
- Client selalu tahu ekspektasi waktu respons sebelum dan sesudah
  mengirim pengajuan, tanpa perlu bertanya ke CS

---

## Task 5: Perbaiki styling field "Jumlah Peserta"

- [ ] Ubah warna latar field "Jumlah Peserta" dari merah muda/pink
      (saat ini menyerupai sinyal error/warning) menjadi warna netral
      standar seperti field lain, kecuali field tersebut memang sedang
      menampilkan pesan validasi

**Acceptance criteria:**
- Field "Jumlah Peserta" secara visual konsisten dengan field lain di
  form saat tidak ada error, dan hanya berubah warna saat benar-benar
  ada validasi yang perlu diperhatikan client

---

## Referensi visual

Mockup interaktif sudah dibuat di percakapan sebelumnya, mencakup:
- Card tier VIP/Reguler yang muncul kondisional tepat di bawah pilihan
  tipe trip, hanya saat "Open Trip" dipilih, dan hilang otomatis saat
  berpindah ke "Private Trip"
- Field tanggal dipecah jadi "Tanggal Mulai" dan "Tanggal Selesai"
  berdampingan
- Field "Nomor WhatsApp" ditambahkan sejajar dengan "Jumlah Peserta"
- Field "Jumlah Peserta" memakai warna netral standar, bukan lagi warna
  pink yang menyerupai sinyal error
- Catatan SLA ("Tim kami akan merespons pengajuanmu maksimal dalam
  2x24 jam") ditampilkan halus di bawah tombol submit

