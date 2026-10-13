# Spec: Sistem Membership VIP & Peminjaman Antar Mitra

## Konteks project

- Backend: Firebase (Firestore + Cloud Functions)
- Melanjutkan spec `marketplace-multi-mitra.md`
- Dokumen ini mencakup dua fitur yang saling terkait dalam ekosistem
  marketplace multi-mitra: **sistem membership VIP** (loyalitas per-mitra)
  dan **peminjaman unit antar mitra**

---

# Bagian 1: Sistem Membership VIP

## Latar belakang

Client yang sudah rental berkali-kali di satu mitra layak mendapat reward
loyalitas. Dua ide awal (driver gratis tanpa batas, atau diskon otomatis
lintas mitra) berisiko membebani mitra secara finansial atau menimbulkan
sengketa biaya antar mitra. Sistem ini dirancang supaya reward tetap
terasa eksklusif tanpa membebani mitra secara tidak wajar.

## Task 1: Tier membership per-mitra

Perhitungan jumlah rental dihitung **khusus dari mitra yang sama** —
bukan akumulasi lintas mitra di platform. Ini menjaga agar biaya reward
selalu ditanggung oleh mitra yang memang diuntungkan dari loyalitas
client tersebut.

```
partners/{partnerId}/clients/{clientId}
  completed_rental_count: number
  tier: "regular" | "silver" | "gold" | "vip"
```

| Tier | Syarat (rental selesai) | Reward |
|---|---|---|
| Regular | 0-2 | Harga normal |
| Silver | 3-4 | Diskon 5% tiap booking |
| Gold | 5-9 | Diskon 10% + prioritas respons CS |
| VIP | 10+ | Semua di atas + privilege self-drive (Task 3) + akses early Open Trip |

- [ ] Tambahkan field `completed_rental_count` dan `tier` di dokumen
      client per mitra
- [ ] `tier` dihitung otomatis (via Cloud Function) setiap booking
      berstatus selesai, berdasarkan `completed_rental_count` terbaru
- [ ] Diskon tier diterapkan otomatis saat client booking di mitra
      tempat tier tersebut didapat

**Acceptance criteria:**
- Jumlah rental di Mitra A tidak memengaruhi tier client di Mitra B
- Diskon otomatis muncul di ringkasan harga saat client dengan tier
  Silver/Gold melakukan booking

---

## Task 2: Reputasi lintas platform (informasi, bukan kewajiban)

Untuk menjaga rasa aman mitra baru terhadap client yang belum pernah
mereka layani, riwayat client tetap bisa dilihat lintas platform sebagai
**informasi**, tanpa mewajibkan mitra memberi reward apa pun.

```
users/{userId}
  platform_stats: {
    total_completed_rentals: number   // akumulasi dari semua mitra
    total_cancellations: number
  }
```

- [ ] Admin mitra dapat melihat ringkasan riwayat client di seluruh
      platform (misalnya badge "12 rental selesai di platform ini, 0
      pembatalan") saat meninjau profil client
- [ ] Data ini bersifat referensi saja — tidak memicu diskon atau
      privilege otomatis di mitra yang belum pernah melayani client
      tersebut

**Acceptance criteria:**
- Mitra baru dapat melihat riwayat client dari mitra lain, tetapi tidak
  ada reward yang otomatis aktif dari riwayat tersebut

---

## Task 3: Privilege VIP — sewa lepas kunci untuk unit "Dengan Driver"

Client dengan tier VIP di suatu mitra dapat menyewa unit berstatus
"Dengan Driver" secara **lepas kunci** (tanpa driver), kecuali unit
tersebut memang mewajibkan driver karena alasan izin/keselamatan
(misalnya Hiace atau unit lain yang butuh SIM khusus).

```
partners/{partnerId}/units/{unitId}
  vip_self_drive_eligible: boolean   // default true, admin bisa matikan per unit
```

- [ ] Tambahkan field `vip_self_drive_eligible` di setiap unit, default
      `true`
- [ ] Admin menonaktifkan field ini secara manual untuk unit yang memang
      wajib pakai driver (contoh: Hiace, unit dengan izin khusus)
- [ ] Saat client bertier VIP membuka unit "Dengan Driver" yang
      `vip_self_drive_eligible: true`, tampilkan opsi tambahan **"Sewa
      Lepas Kunci (Privilege VIP)"** dengan harga hanya
      `rental_fee_per_day` (tanpa `driver_fee_per_day`)
- [ ] Client non-VIP atau unit dengan `vip_self_drive_eligible: false`
      tetap hanya bisa sewa dengan driver seperti biasa

**Acceptance criteria:**
- Opsi self-drive privilege hanya muncul untuk client bertier VIP di
  mitra yang bersangkutan, dan hanya untuk unit yang diizinkan admin
- Unit yang di-nonaktifkan (Hiace, dsb) tidak pernah menampilkan opsi
  ini untuk client manapun, termasuk VIP

---

# Bagian 2: Peminjaman Unit Antar Mitra

## Latar belakang

Mitra terkadang tidak punya unit yang dibutuhkan client (armada penuh
atau tidak memiliki tipe unit tersebut). Fitur ini memungkinkan mitra
saling meminjam unit, dengan pendapatan dari booking tersebut dibagi rata
antara mitra pemilik unit dan mitra yang menerima booking dari client.

**Keputusan yang sudah ditetapkan:**
- Driver (jika unit berstatus "Dengan Driver") selalu disediakan oleh
  **mitra pemilik unit**, bukan mitra peminjam
- Peminjaman terbuka untuk **semua mitra berstatus approved** di
  platform — tidak ada sistem whitelist/rekanan khusus
- Pencairan bagi hasil 50/50 dilakukan **di luar sistem** (transfer
  langsung antar mitra) — sistem hanya mencatat pembagian sebagai
  referensi, tidak memproses pembayaran antar mitra

## Task 4: Opt-in unit ke pool peminjaman

Setiap mitra memutuskan sendiri unit mana yang boleh dipinjam mitra lain
— tidak otomatis semua unit masuk pool.

```
partners/{partnerId}/units/{unitId}
  lending_enabled: boolean   // default false, admin mitra opt-in manual
```

- [ ] Tambahkan toggle "Bolehkan unit ini dipinjam mitra lain" di form
      Manajemen Armada, default nonaktif
- [ ] Unit dengan `lending_enabled: false` tidak muncul saat mitra lain
      mencari unit pinjaman

**Acceptance criteria:**
- Unit yang tidak di-opt-in tidak pernah muncul di pencarian peminjaman
  mitra lain

---

## Task 5: Alur permintaan peminjaman

Karena tidak ada whitelist, **semua mitra approved** bisa mengajukan
peminjaman ke mitra manapun yang unitnya masuk pool — tapi mitra pemilik
tetap harus menyetujui tiap permintaan secara spesifik (bukan otomatis
disetujui), karena ketersediaan unit perlu dicek untuk tanggal yang
diminta.

```
lending_requests/{requestId}
  owner_partner_id
  borrower_partner_id
  unit_id
  start: Timestamp
  end: Timestamp
  status: "requested" | "approved" | "rejected" | "cancelled"
  created_at: Timestamp
```

- [ ] Mitra peminjam mencari unit dari pool lintas mitra (filter
      berdasarkan tipe unit, tanggal dibutuhkan)
- [ ] Mitra peminjam mengajukan `lending_requests` dengan rentang tanggal
      yang dibutuhkan
- [ ] Mitra pemilik menerima notifikasi, meninjau, lalu approve/reject
- [ ] Validasi ketersediaan unit (cek bentrok dengan `bookings` unit
      tersebut) dilakukan di Cloud Function yang sama seperti validasi
      booking biasa, sebelum permintaan bisa di-approve

**Acceptance criteria:**
- Mitra pemilik tidak bisa approve permintaan yang rentang tanggalnya
  bentrok dengan booking/peminjaman lain yang sudah ada untuk unit
  tersebut

---

## Task 6: Booking hasil peminjaman & pencatatan bagi hasil

Booking yang berasal dari client Mitra A (peminjam) terhadap unit Mitra B
(pemilik) tetap tercatat di bawah unit milik Mitra B, dengan referensi ke
mitra peminjam dan pembagian pendapatan.

```
partners/{ownerPartnerId}/units/{unitId}/bookings/{bookingId}
  client_id
  booked_by_partner_id: string        // partnerId mitra peminjam
  lending_request_id: string
  total_amount: number
  revenue_split: {
    owner_percent: 50,
    borrower_percent: 50,
    owner_amount: number,
    borrower_amount: number
  }
  driver_provided_by: "owner"         // selalu mitra pemilik, sesuai keputusan
```

- [ ] Setelah `lending_requests` disetujui, client dari mitra peminjam
      bisa booking unit tersebut seperti booking biasa
- [ ] Sistem mencatat `revenue_split` sebagai referensi (bukan memproses
      transfer dana — pencairan dilakukan manual di luar sistem oleh
      kedua mitra)
- [ ] Kedua mitra (pemilik dan peminjam) bisa melihat catatan transaksi
      ini di laporan/dashboard masing-masing, ditandai jelas sebagai
      "hasil peminjaman antar mitra"

**Acceptance criteria:**
- Mitra pemilik dan mitra peminjam masing-masing punya catatan yang
  jelas berapa nominal bagian mereka dari tiap transaksi peminjaman,
  sebagai referensi rekonsiliasi manual
- Driver untuk unit "Dengan Driver" hasil peminjaman selalu berasal dari
  mitra pemilik, tidak pernah dari mitra peminjam

---

## Referensi visual

Mockup dan diagram interaktif sudah dibuat di percakapan sebelumnya,
mencakup:
- Struktur tier bertingkat (Regular, Silver, Gold, VIP) dengan reward
  masing-masing, dan contoh kartu member client
- Alur peminjaman unit antar mitra: mitra peminjam mencari unit → mitra
  pemilik meninjau dan menyetujui/menolak → booking berjalan dengan
  pendapatan dibagi 50/50
