# Task 8: Hero Section & "Berdasarkan Destinasi" Redesign

**Project:** Cakra Lima Tujuh (cakra57.com)
**Stack:** React (functional + hooks), Tailwind (dark theme: black / neutral-900 bg, red-600 accent), Firebase/Firestore

---

## 1. Hero Section — Background Bromo

### Referensi
Layout mengikuti pola di contoh Euro Travel Coach: foto full-bleed dengan overlay gelap, judul besar bold di tengah, subjudul italic di bawahnya.

### Perubahan
- **Gambar background:** foto Gunung Bromo (disarankan momen sunrise dengan lautan pasir & kawah, karena paling ikonik dan sering dipakai untuk open trip).
- **Overlay gradient:** jangan pakai overlay hitam datar seperti contoh. Gunakan gradient yang menyatu dengan palet situs:
  - `linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(23,23,23,0.55) 50%, rgba(220,38,38,0.25) 100%)`
  - Arah gradient bisa diagonal (`to bottom right`) supaya tidak terkesan generic overlay hitam polos — beri sedikit "warmth" dari red-600 di salah satu sudut agar konsisten dengan aksen brand, bukan sekadar dark scrim netral.
- **Teks:** tetap putih, bold, uppercase untuk headline utama; subheadline italic, weight lebih ringan.

### Implementasi
```jsx
// components/HeroSection.jsx
<section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
  <img
    src="/images/hero-bromo.jpg"
    alt="Gunung Bromo saat sunrise"
    className="absolute inset-0 w-full h-full object-cover"
  />
  <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-neutral-900/55 to-red-600/25" />
  <div className="relative z-10 text-center px-4">
    <h1 className="text-white font-bold uppercase text-4xl md:text-6xl tracking-tight">
      Rencanakan Petualanganmu ke Bromo
    </h1>
    <p className="text-white/90 italic mt-4 text-lg md:text-xl">
      Cakra Lima Tujuh siap wujudkan trip impianmu
    </p>
  </div>
</section>
```

### Sumber gambar (bebas hak cipta)
- Unsplash: cari `"Mount Bromo sunrise"` atau `"Bromo volcano Indonesia"`
- Pexels: cari `"Bromo Indonesia"`
- Semua hasil di kedua platform berlisensi bebas pakai (tidak perlu atribusi), cukup unduh resolusi tinggi (min. 1920px lebar) untuk kebutuhan hero full-bleed.

---

## 2. "Berdasarkan Destinasi" — Ubah ke Gaya Discovery (ala Fora)

### Kondisi sekarang
4 card polos berisi teks saja: Jawa (12+), Bali (8+), Indonesia (20+), ASEAN (6+).

### Referensi (Fora)
Card dengan foto full-bleed sebagai background, label kategori kecil (pill) di pojok, judul di bagian bawah dengan gradient gelap agar teks tetap terbaca. Grid campur ukuran (masonry-like), tapi untuk kasus kita cukup grid rata 4 kolom karena jumlah item tetap (4 region).

### Perubahan
Ganti tiap card jadi photo-card dengan overlay gradient bawah, konsisten dengan pola gradient hero (bukan overlay hitam polos):

| Region     | Gambar disarankan                          | Jumlah destinasi |
|------------|---------------------------------------------|-------------------|
| Jawa       | Candi Borobudur / Kawah Ijen                | 12+               |
| Bali       | Sawah terasering Ubud / Pantai Kuta         | 8+                |
| Indonesia  | Raja Ampat / Danau Toba                     | 20+               |
| ASEAN      | Angkor Wat (Kamboja) / Petronas (Malaysia)  | 6+                |

### Implementasi
```jsx
// components/DestinationDiscoveryGrid.jsx
const destinations = [
  { region: "Jawa", count: "12+ Destinasi", image: "/images/dest-jawa.jpg" },
  { region: "Bali", count: "8+ Destinasi", image: "/images/dest-bali.jpg" },
  { region: "Indonesia", count: "20+ Destinasi", image: "/images/dest-indonesia.jpg" },
  { region: "ASEAN", count: "6+ Destinasi", image: "/images/dest-asean.jpg" },
];

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {destinations.map((d) => (
    <a
      key={d.region}
      href={`/destinasi/${d.region.toLowerCase()}`}
      className="relative aspect-[3/4] rounded-lg overflow-hidden group"
    >
      <img
        src={d.image}
        alt={d.region}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute bottom-0 p-4">
        <h3 className="text-white font-bold text-xl">{d.region}</h3>
        <p className="text-red-400 text-xs font-medium">{d.count}</p>
      </div>
    </a>
  ))}
</div>
```

### Catatan struktur data
Mengikuti konvensi flat single-tenant Firestore yang sudah dipakai: bisa dibuat collection `destinationRegions` (field: `region`, `imageUrl`, `count`, `slug`) supaya gambar & jumlah destinasi bisa diedit admin (`isAdmin()`) tanpa redeploy. Kalau tidak butuh dinamis, array hardcoded di komponen seperti di atas sudah cukup.

### Sumber gambar (bebas hak cipta)
- Unsplash / Pexels / Pixabay — cari per nama tempat spesifik (contoh: `"Borobudur temple"`, `"Ubud rice terrace"`, `"Raja Ampat aerial"`, `"Angkor Wat Cambodia"`) agar hasil relevan dan resolusi bagus.
- Hindari foto dengan watermark atau dari akun yang menandai "no derivatives" — filter di Unsplash/Pexels sudah otomatis royalty-free, jadi aman selama diunduh langsung dari platform tersebut (bukan re-upload dari Google Images/Pinterest).

---

## Catatan Desain Umum
- Gradient di hero dan di grid destinasi sengaja dibuat konsisten (arah & warna dasar sama: hitam → red-600 tipis) supaya kedua section terasa satu identitas visual, bukan dua treatment yang berbeda sendiri-sendiri.
- Hindari border-radius seragam + shadow generic di semua card — cukup radius kecil (`rounded-lg`) dan andalkan gradient overlay sebagai pembeda visual, bukan shadow.
