# Spec: Marketplace multi-mitra & Paket Wisata — Cakra57

## Konteks project

- Backend: Firebase (Firestore + Cloud Functions)
- Perubahan arsitektur: dari single rental company menjadi marketplace
  yang mewadahi banyak mitra rental, masing-masing dengan role dan data
  yang terpisah
- Dokumen ini melanjutkan spec sebelumnya (`perbaikan-booking-mobil.md`)
  yang membahas booking, manual order, dan harga driver untuk satu mitra

---

## Task 1: Role hierarchy & data model multi-tenant

```
partners/{partnerId}
  name
  status: "pending" | "approved" | "rejected"
  services: {
    car_rental: true,
    wisata: true | false      // dikontrol superadmin
  }

partners/{partnerId}/staff/{userId}
  role: "admin" | "driver"

partners/{partnerId}/units/{unitId}
  ...
partners/{partnerId}/units/{unitId}/bookings/{bookingId}
  ...

users/{userId}
  role: "superadmin" | "partner_admin" | "driver" | "client"
  partnerId: string | null   // kosong untuk superadmin dan client
```

- [ ] Buat koleksi `partners` dengan field `status` dan `services`
- [ ] Buat subcollection `staff` per mitra untuk role admin dan driver
- [ ] Field `role` di `users` menentukan akses: superadmin melihat semua
      mitra, partner_admin/driver hanya melihat data `partnerId` miliknya
- [ ] Superadmin bisa toggle `services.wisata` per mitra — saat `false`,
      menu Paket Wisata disembunyikan dari admin mitra tersebut dan dari
      tampilan client untuk mitra itu

**Acceptance criteria:**
- Admin mitra A tidak bisa mengakses/melihat data mitra B (divalidasi di
  Firestore Security Rules, bukan hanya disembunyikan di UI)
- Mengubah `services.wisata` ke `false` langsung menyembunyikan menu
  terkait tanpa perlu redeploy

---

## Task 2: Alur pengajuan kemitraan

- [ ] Form pendaftaran mitra (data perusahaan, dokumen legalitas) → status
      awal `pending`
- [ ] Superadmin meninjau dan approve/reject
- [ ] Setelah `approved`, sistem otomatis membuat akun `partner_admin`
      pertama untuk mitra tersebut

**Acceptance criteria:**
- Mitra dengan status `pending` atau `rejected` tidak muncul di listing
  client sama sekali

---

## Task 3: Pencarian mitra berdasarkan lokasi (service area)

Bukan murni jarak terdekat — filter berdasarkan area layanan mitra,
jarak hanya jadi tiebreaker.

```
partners/{partnerId}
  service_area: {
    type: "city_list" | "radius",
    cities: ["Yogyakarta", "Sleman"],   // jika type = city_list
    base_location: GeoPoint,             // jika type = radius
    radius_km: 25
  }
```

- [ ] Client input lokasi (GPS atau input manual)
- [ ] Sistem filter mitra yang `service_area`-nya mencakup lokasi
      tersebut, urutkan berdasarkan jarak sebagai tiebreaker
- [ ] Fallback: jika tidak ada mitra yang cocok, tampilkan mitra terdekat
      di luar area dengan keterangan jarak
- [ ] Tambahkan toggle "Lihat semua mitra" untuk client yang ingin mencari
      manual tanpa filter lokasi

**Acceptance criteria:**
- Client di lokasi yang tidak dilayani mitra manapun tetap mendapat hasil
  (bukan halaman kosong), dengan keterangan jarak ke mitra terdekat

---

## Task 4: Status perjalanan oleh driver

```
partners/{partnerId}/units/{unitId}/bookings/{bookingId}/trip
  status: "assigned" | "heading_to_pickup" | "arrived" | "in_progress" | "completed"
  driver_id
  updated_at: Timestamp
```

- [ ] Driver bisa update status: Ditugaskan → Menuju jemput → Tiba di
      lokasi → Dalam perjalanan → Selesai
- [ ] Client memantau status secara real-time lewat Firestore listener

**Acceptance criteria:**
- Perubahan status oleh driver langsung terlihat di sisi client tanpa
  perlu refresh halaman

---

## Task 5: Pengajuan Open Trip / Private Trip oleh client

### Form pengajuan client

- Tipe trip: `open_trip` atau `private_trip`
- Tier (khusus `open_trip`): `vip` (include snack + makan 2x) atau
  `reguler` (tanpa snack/makan)
- Destinasi/rute, tanggal, jumlah peserta, catatan tambahan

### Data model

```
partners/{partnerId}/trip_requests/{requestId}
  client_id
  type: "open_trip" | "private_trip"
  tier: "vip" | "reguler"        // hanya untuk open_trip
  destination
  proposed_date
  participant_count
  notes
  status: "submitted" | "in_review" | "quoted" | "revision_requested" | "confirmed" | "rejected"
  sla_deadline: Timestamp        // created_at + 48 jam
  created_at: Timestamp

partners/{partnerId}/trip_requests/{requestId}/quote
  admin_id
  line_items: [{ label, amount }]
  total
  dp_amount
  payment_deadline_dp: Timestamp
  payment_deadline_full: Timestamp   // hari H
  uploaded_at: Timestamp

partners/{partnerId}/trip_requests/{requestId}/revisions/{revisionId}
  by: "client" | "admin"
  note
  created_at: Timestamp
```

### Task

- [ ] Client submit request → status `submitted`, `sla_deadline` = waktu
      submit + 48 jam
- [ ] Admin meninjau dan upload quote (breakdown biaya, bukan cuma satu
      angka total) → status `quoted`
- [ ] Client bisa: **setuju & bayar DP**, **minta revisi** (masuk ke
      `revisions`, status kembali `revision_requested` → admin quote
      ulang), atau **tolak**
- [ ] Setelah DP dibayar → status `confirmed`, pelunasan jatuh tempo di
      hari H (`payment_deadline_full`)
- [ ] Admin panel: menu "Paket Wisata" dipecah jadi dua bagian:
  - Katalog paket yang dibuat admin sendiri (existing — Open Trip dengan
    jadwal dan harga tetap)
  - Tab baru **"Private Trip & Open Trip Submitted"**: antrian
    pengajuan client, dengan indikator visual jika sudah mendekati/lewat
    SLA 2x24 jam

**Acceptance criteria:**
- Request yang sudah lewat `sla_deadline` tanpa direspons admin tampil
  dengan penanda visual berbeda di antrian admin
- Client bisa melihat riwayat revisi (siapa minta apa) sebelum quote
  final disepakati
- Pelunasan hari H tidak menghalangi trip berjalan jika DP sudah lunas
  (validasi pelunasan terjadi terpisah dari validasi keberangkatan)

---

## Task 6: Kontrol layanan Wisata per mitra (superadmin)

- [ ] Superadmin bisa toggle `services.wisata` saat approve atau kapan
      saja setelahnya dari panel kelola mitra
- [ ] Mitra dengan `services.wisata: false` tidak menampilkan menu Paket
      Wisata sama sekali di admin panel mereka, dan client tidak melihat
      opsi trip untuk mitra tersebut — hanya sewa mobil

**Acceptance criteria:**
- Mitra yang wisata-nya dinonaktifkan tetap bisa menjalankan sewa mobil
  seperti biasa tanpa gangguan

---

## Referensi visual

Mockup dan diagram interaktif sudah dibuat di percakapan sebelumnya,
mencakup:
- Hierarki role: superadmin → mitra → admin mitra / driver / client
- Alur status perjalanan driver
- Alur pengajuan trip lengkap dengan loop revisi dan pembayaran dua
  tahap (DP → pelunasan hari H)
