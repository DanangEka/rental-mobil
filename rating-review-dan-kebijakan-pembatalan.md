# Spec: Rating & Review, dan Kebijakan Pembatalan

## Konteks project

- Backend: Firebase (Firestore + Cloud Functions)
- Melanjutkan spec-spec sebelumnya di ekosistem marketplace multi-mitra

---

# Bagian 1: Rating & Review

## Latar belakang

Testimoni client yang kredibel meningkatkan kepercayaan calon client baru.
Ditampilkan sebagai card di homepage dan menu "Testimoni", dengan
interaksi hover (desktop) atau tap (mobile) untuk melihat profil singkat
pemberi rating.

## Task 1: Pengumpulan rating & review per booking

```
partners/{partnerId}/units/{unitId}/bookings/{bookingId}/review
  rating: number (1-5)
  comment: string
  created_at: Timestamp
  visibility: "public" | "hidden"   // admin bisa sembunyikan review yang tidak pantas
```

- [ ] Setelah booking berstatus selesai, client mendapat prompt untuk
      memberi rating (1-5 bintang) dan komentar singkat
- [ ] Admin mitra dapat menyembunyikan review yang mengandung konten
      tidak pantas (`visibility: hidden`), tanpa menghapus datanya secara
      permanen

**Acceptance criteria:**
- Review hanya bisa diberikan oleh client yang benar-benar menyelesaikan
  booking tersebut (tidak bisa oleh sembarang akun)
- Review dengan `visibility: hidden` tidak muncul di card testimoni
  manapun

---

## Task 2: Card testimoni di homepage & menu Testimoni

Review yang masuk didenormalisasi ke koleksi terpisah supaya ringan
ditampilkan di homepage tanpa perlu query lintas banyak booking.

```
testimonials/{testimonialId}
  client_id
  display_name: string        // format "Nama Depan I." — nama belakang disingkat
  rating: number
  comment: string
  member_tier: "regular" | "silver" | "gold" | "vip"
  completed_rental_count: number
  joined_at: Timestamp
  featured: boolean            // opsional: admin bisa pin testimoni tertentu
  created_at: Timestamp
```

- [ ] Cloud Function otomatis membuat entri `testimonials` saat review
      baru dibuat dengan `visibility: public`
- [ ] Nama client ditampilkan dalam format singkat (nama depan + inisial
      belakang), bukan nama lengkap, untuk menjaga privasi
- [ ] Card testimoni di homepage/menu Testimoni menampilkan: rating
      bintang, cuplikan komentar, nama singkat, dan avatar inisial
- [ ] Saat card di-hover (desktop) atau di-tap (mobile), tampilkan popup
      profil singkat: tier member, jumlah rental selesai, dan sejak kapan
      bergabung

**Acceptance criteria:**
- Popup profil muncul tepat saat hover di desktop dan saat tap di mobile,
  tanpa perlu berpindah halaman
- Tidak ada data sensitif (nomor HP, alamat, nama lengkap) yang tampil di
  card maupun popup — hanya informasi yang relevan untuk kredibilitas
  testimoni

---

## Task 2b: Sumber sementara — review Google Maps (karena web baru launching)

Karena website baru diluncurkan dan belum punya cukup review native,
testimoni bisa diisi sementara dari review Google Maps bisnis yang sudah
ada, sambil menunggu review native terkumpul.

**Ketentuan teknis dan aturan platform:**
- Wajib diambil lewat **Google Places API (Place Details — reviews
  field)**, bukan scraping halaman Google Maps secara langsung
- API resmi hanya mengembalikan maksimal **5 review** per lokasi (dipilih
  otomatis oleh algoritma Google sebagai "paling relevan", tidak bisa
  dipilih manual)
- Wajib menampilkan atribusi/logo Google di dekat review yang ditarik
  dari sumber ini, sesuai ketentuan Google Maps Platform
- Nama dan foto profil reviewer dari Google ditampilkan apa adanya
  (tidak disamarkan seperti review native, karena sudah berupa data
  publik dengan format atribusi yang ditentukan Google)
- Data diambil berkala lewat Cloud Function terjadwal (misal tiap 24
  jam) dan disimpan sebagai cache di Firestore — tidak fetch langsung ke
  API tiap kali homepage dibuka, untuk menghindari rate limit dan biaya
  berlebih

```
testimonials/{testimonialId}
  source: "native" | "google_maps"
  ... (field lain sama seperti Task 2, kecuali field khusus Google di bawah)
  google_reviewer_name: string      // hanya untuk source = google_maps
  google_reviewer_photo_url: string
  cached_at: Timestamp
```

- [ ] Integrasikan Google Places API (Place Details) untuk menarik review
      bisnis yang sudah ada di Google Maps
- [ ] Simpan hasilnya sebagai cache terjadwal di Firestore, bukan live
      fetch tiap kunjungan
- [ ] Tambahkan badge sumber di tiap card testimoni: **"Ulasan Google"**
      atau **"Ulasan Cakra57"**, supaya client tahu asal datanya
- [ ] Rencana transisi: tampilkan review Google saja di fase awal →
      setelah review native cukup banyak, gabungkan keduanya → review
      native perlahan jadi yang utama, Google tetap sebagai pelengkap

**Acceptance criteria:**
- Review Google yang ditampilkan selalu disertai atribusi/logo Google
  sesuai ketentuan platform
- Card testimoni jelas menunjukkan sumbernya (Google atau native), tidak
  tercampur tanpa keterangan
- Sistem tidak memanggil Google Places API secara langsung setiap
  homepage dibuka, melainkan dari cache

---

# Bagian 2: Kebijakan Pembatalan Terstruktur

## Latar belakang

Kebijakan refund bertingkat berdasarkan seberapa dekat waktu pembatalan
dengan tanggal sewa, supaya ekspektasi jelas bagi client maupun mitra dan
mengurangi pembatalan mendadak yang merugikan mitra.

## Task 3: Aturan refund berdasarkan waktu pembatalan

| Waktu pembatalan | Refund DP |
|---|---|
| H-3 atau lebih awal | 100% (refund penuh) |
| H-2 sampai H-1 | 50% |
| Hari H atau setelah sewa dimulai | 0% (DP hangus) |

```
partners/{partnerId}/units/{unitId}/bookings/{bookingId}
  cancellation: {
    cancelled_at: Timestamp
    days_before_rental: number
    refund_percent: 0 | 50 | 100
    refund_amount: number
    status: "processed" | "pending"
  }
```

- [ ] Saat client/admin membatalkan booking, sistem otomatis menghitung
      `days_before_rental` dari tanggal mulai sewa
- [ ] `refund_percent` ditentukan otomatis berdasarkan tabel di atas
- [ ] Kebijakan ini berlaku untuk semua jenis DP: sewa manual, sewa
      client online, maupun DP pengajuan Open Trip/Private Trip
- [ ] Tampilkan ringkasan kebijakan ini secara jelas kepada client
      **sebelum** mereka membayar DP (bukan hanya di syarat & ketentuan
      tersembunyi), supaya tidak ada kejutan saat pembatalan

**Acceptance criteria:**
- Perhitungan refund konsisten mengikuti tabel di atas untuk semua jenis
  booking (rental biasa maupun trip)
- Client melihat ringkasan kebijakan pembatalan sebelum konfirmasi
  pembayaran DP, bukan setelahnya

---

## Referensi visual

Mockup interaktif sudah dibuat di percakapan sebelumnya: card testimoni
dengan rating bintang, cuplikan komentar, dan popup profil pemberi review
(tier member, jumlah rental, tanggal bergabung) yang muncul saat hover
atau tap.
