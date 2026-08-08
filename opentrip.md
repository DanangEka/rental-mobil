## Task 5: Pengajuan Open Trip / Private Trip oleh client

### Form pengajuan client

- Tipe trip: `open_trip` atau `private_trip`
- Tier (khusus `open_trip`): `vip` (include snack + makan 2x) atau
  `reguler` (tanpa snack/makan)
- Destinasi/rute, tanggal, jumlah peserta, catatan tambahan

### Data model

Disesuaikan ke struktur project yang sebenarnya (flat/single-tenant, bukan
`partners/{partnerId}/...`), field pemilik pakai `uid` (sama seperti
koleksi `pemesanan` yang sudah ada), dan `quote` disimpan sebagai map field
langsung di dokumen `trip_requests` (bukan subcollection terpisah) supaya
rules dan query lebih sederhana.

```
trip_requests/{requestId}
  uid
  type: "open_trip" | "private_trip"
  tier: "vip" | "reguler"        // hanya untuk open_trip
  destination
  proposed_date
  participant_count
  notes
  status: "submitted" | "in_review" | "quoted" | "revision_requested" | "confirmed" | "rejected"
  sla_deadline: Timestamp        // distempel Cloud Function, created_at + 48 jam
  created_at: Timestamp
  dp_paid: boolean               // diinisialisasi false saat submit
  dp_paid_at: Timestamp
  full_paid: boolean             // diinisialisasi false saat submit
  full_paid_at: Timestamp
  quote: {
    admin_id
    line_items: [{ label, amount }]
    total
    dp_amount
    payment_deadline_dp: Timestamp
    payment_deadline_full: Timestamp   // hari H
    uploaded_at: Timestamp
  }

trip_requests/{requestId}/revisions/{revisionId}
  by: "client" | "admin"
  note
  created_at: Timestamp
```

### Task

- [x] Client submit request → status `submitted`, `sla_deadline` = waktu
      submit + 48 jam *(form di `OpenTripPage.jsx`, stempel `sla_deadline`
      di `functions/tripRequests.js` — server-side, bukan dari client)*
- [x] Admin meninjau dan upload quote (breakdown biaya, bukan cuma satu
      angka total) → status `quoted` *(`TripRequestsQueue.jsx`, form
      line items dinamis)*
- [x] Client bisa: **setuju & bayar DP**, **minta revisi** (masuk ke
      `revisions`, status kembali `revision_requested` → admin quote
      ulang), atau **tolak** *(tombol respons quote di `OpenTripPage.jsx`;
      quote lama otomatis dihapus server-side saat revisi diminta)*
- [x] Setelah DP dibayar → status `confirmed`, pelunasan jatuh tempo di
      hari H (`payment_deadline_full`)
- [x] Admin panel: menu "Paket Wisata" / "Open Trip" dipecah jadi dua bagian:
  - [x] Katalog paket yang dibuat admin sendiri (existing — koleksi
        `open_trips`, tidak diubah)
  - [x] Tab baru **"Private Trip & Open Trip Submitted"**: antrian
        pengajuan client dengan indikator visual SLA — komponennya sudah
        jadi (`TripRequestsQueue.jsx`), **sudah dipasang** ke navigasi
        admin panel (`AdminOpenTrip.js` & `Navbar.js`)

**Acceptance criteria:**
- [x] Request yang sudah lewat `sla_deadline` tanpa direspons admin tampil
      dengan penanda visual berbeda di antrian admin *(badge merah "LEWAT
      SLA" / kuning "< 6 JAM" di `TripRequestsQueue.jsx`)*
- [x] Client bisa melihat riwayat revisi (siapa minta apa) sebelum quote
      final disepakati *(subcollection `revisions`, immutable via rules)*
- [x] Pelunasan hari H tidak menghalangi trip berjalan jika DP sudah lunas
      (validasi pelunasan terjadi terpisah dari validasi keberangkatan)
      *(`dp_paid` dan `full_paid` adalah dua field terpisah)*

---

## File yang sudah dibuat

| File | Fungsi |
|---|---|
| `firestore.rules` | Section `trip_requests` digabung ke rules project kamu yang asli (bagian lain tidak diubah) |
| `functions/tripRequests.js` | Stempel `sla_deadline` server-side saat create, hapus `quote` lama otomatis saat status masuk `revision_requested` |
| `src/pages/OpenTripPage.jsx` | Halaman client — form pengajuan, tracking status, respon ke quote |
| `src/admin/TripRequestsQueue.jsx` | Komponen antrian admin dengan indikator SLA dan panel buat quote |

## Yang perlu disesuaikan sebelum dipakai

- Import `../lib/firebase` dan `../hooks/useAuth` di kedua file React — arahkan ke lokasi asli di project
- Warna Tailwind (`red-600`, `neutral-900`, dst.) sudah mendekati tema situs, ganti ke hex brand kalau ada token khusus
- Timpa `firestore.rules` project kamu dengan versi ini, lalu deploy `firestore:rules` dan `functions`
- Pasang `TripRequestsQueue.jsx` sebagai tab baru di admin panel (satu-satunya item checklist yang belum full — kode komponennya sudah ada, tinggal ditaruh di navigasi)

## Role & akses

Pakai helper `isAdmin()` yang sudah ada di rules kamu (custom claim `admin`
atau `users/{uid}.role == "admin"`). Tidak ada konsep `partner_admin` atau
superadmin — Task 6 (kontrol per-mitra) belum ditambahkan sesuai arahan
sebelumnya.

## Belum tercakup

Integrasi payment gateway asli. Tombol "Setuju & Bayar DP" saat ini langsung
menandai `dp_paid: true` — belum terhubung ke pembayaran sungguhan.
