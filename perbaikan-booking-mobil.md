# Spec: Perbaikan Booking Mobil untuk Unit yang Sedang Tersewa

## Konteks project

- Backend: Firebase (Firestore + Cloud Functions)
- Area yang terdampak: card unit di sisi client, form Manual Order (admin),
  form Manajemen Armada (admin)

## Masalah

Saat mobil sedang dalam masa sewa, card menampilkan status "Currently
Unavailable" dengan tombol disabled sepenuhnya. Client tidak bisa booking
untuk tanggal setelah masa sewa saat ini selesai, dan tidak ada info kapan
mobil tersedia kembali. Admin juga tidak punya visibilitas jadwal unit saat
melayani client walk-in/offline.

Selain itu, tarif "Dengan driver" saat ini diinput sebagai satu angka
gabungan, sehingga tidak transparan dan sulit diupdate saat biaya driver
berubah sendiri.

---

## Task 1: Data model Firestore untuk rentang booking

Ganti pendekatan status boolean available/unavailable dengan rentang
tanggal booking, disimpan sebagai subcollection (bukan array di dalam
dokumen unit), karena Firestore tidak bisa query overlap ke dalam field
array-of-maps.

```
units/{unitId}
  name: "All New Terios Manual DLX"
  ...

units/{unitId}/bookings/{bookingId}
  start: Timestamp
  end: Timestamp
  source: "online" | "manual_offline"
  status: "confirmed"
```

- [ ] Buat subcollection `units/{unitId}/bookings`
- [ ] Field `start` dan `end` disimpan sebagai `Timestamp`, bukan string
- [ ] Field `source` membedakan booking dari client online vs input admin
      manual order

**Acceptance criteria:**
- Query subcollection `bookings` milik satu unit mengembalikan semua
  rentang tanggal yang sudah terisi untuk unit tersebut

---

## Task 2: Cloud Function validasi bentrok tanggal

Validasi bentrok tidak boleh hanya di frontend, karena berisiko race
condition saat dua booking untuk rentang tanggal sama masuk hampir
bersamaan.

- [ ] Buat Cloud Function yang dipanggil saat submit booking (baik dari
      client maupun dari form Manual Order admin)
- [ ] Function menerima `unitId`, `start`, `end`
- [ ] Function query subcollection `bookings` milik unit tersebut dan cek
      overlap dengan rentang baru
- [ ] Jika bentrok → tolak dan kembalikan pesan error
- [ ] Jika tidak bentrok → buat dokumen booking baru

**Acceptance criteria:**
- Dua request booking untuk rentang tanggal yang overlap, dikirim hampir
  bersamaan, hanya satu yang berhasil tersimpan

---

## Task 3: Card client — badge ketersediaan + date range picker

Saat ini: badge "BOOKED" dan tombol "Currently Unavailable" disabled total.

Ubah menjadi:

- [ ] Badge menampilkan tanggal ketersediaan berikutnya, contoh
      `Available Aug 5` (dihitung dari `bookings` milik unit)
- [ ] Tambahkan kalender di dalam card:
  - Tanggal yang sudah masuk rentang `bookings` ditampilkan abu-abu dan
    tidak bisa diklik
  - Client memilih tanggal mulai, lalu tanggal selesai
  - Rentang yang dipilih di-highlight secara visual (bukan satu titik)
- [ ] Tombol booking menampilkan ringkasan dinamis, contoh
      `Book 5 - 7 Agustus (2 hari)`
- [ ] Submit booking memanggil Cloud Function dari Task 2

**Acceptance criteria:**
- Tanggal yang sudah terbooking tidak bisa dipilih di kalender
- Badge dan kalender terupdate otomatis mengikuti data `bookings` terbaru
- Client bisa menyelesaikan booking tanpa reload halaman atau menunggu
  notifikasi

---

## Task 4: Form Manual Order (admin) — kalender ketersediaan

Saat ini: field Mulai/Selesai berupa native `<input type="date">` berdiri
sendiri tanpa info ketersediaan.

- [ ] Tambahkan section "Ketersediaan unit" di form, berisi badge status
      singkat dan kalender kecil (sumber data sama dengan Task 3:
      subcollection `bookings`)
- [ ] Tanggal terbooking di kalender ini tidak bisa diklik
- [ ] Field Mulai/Selesai terisi otomatis dari klik admin di kalender,
      menggantikan native date input
- [ ] Submit transaksi memanggil Cloud Function yang sama dari Task 2
      dengan `source: "manual_offline"`

**Acceptance criteria:**
- Admin tidak bisa submit transaksi dengan rentang tanggal yang bentrok
  dengan booking yang sudah ada (baik online maupun manual)

---

## Task 5: Form Manajemen Armada (admin) — pisahkan biaya driver

Saat ini: field harga "Dengan driver" adalah satu angka gabungan.

```
units/{unitId}
  service_type: "dengan_driver" | "lepas_kunci"
  rental_fee_per_day: number
  driver_fee_per_day: number
```

- [ ] Pisahkan input menjadi dua field: "Tarif sewa / hari" dan "Biaya
      driver / hari"
- [ ] Field "Biaya driver / hari" disembunyikan atau di-gray out saat
      `service_type` adalah `"lepas_kunci"`
- [ ] Tampilkan preview total (`rental_fee_per_day + driver_fee_per_day`)
      langsung di form admin sebelum disimpan
- [ ] Card client menampilkan total gabungan sebagai harga utama saat
      `service_type` adalah `"dengan_driver"`, dengan breakdown kecil di
      bawahnya:
      ```
      Rp 1.300.000 /hari
      Rp 1.100.000 sewa + Rp 200.000 driver
      ```
- [ ] Saat `service_type` adalah `"lepas_kunci"`, card client hanya
      menampilkan `rental_fee_per_day` tanpa breakdown

**Acceptance criteria:**
- Mengubah `driver_fee_per_day` tidak mengubah `rental_fee_per_day`, dan
  sebaliknya
- Perhitungan total dilakukan di frontend (tidak butuh Cloud Function,
  karena tidak melibatkan validasi lintas dokumen)

---

## Kenapa pendekatan ini dipilih dibanding alternatif lain

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| Tombol "Notify Me" | Sederhana untuk diimplementasi | Client harus menunggu, ada friksi ganda, risiko pindah ke kompetitor |
| Tombol terpisah "Book for Future Dates" | Tetap memberi jalan booking | Dua tombol berdekatan bisa membingungkan client |
| **Badge + date range picker (dipilih)** | Satu alur, transparan langsung, tidak ada percabangan keputusan, mengurangi kebutuhan tanya CS | Butuh perubahan struktur data booking di backend |

## Referensi visual

Mockup interaktif sudah dibuat di percakapan sebelumnya, mencakup:
- Card dengan badge ketersediaan dan kalender rentang tanggal
- Form Manual Order (admin) dengan kalender ketersediaan terintegrasi ke
  field Mulai/Selesai
- Form Manajemen Armada (admin) dengan field tarif sewa dan biaya driver
  terpisah, beserta preview total dan breakdown harga di card client
