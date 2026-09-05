# Task 9: Halaman Detail Destinasi (Pinterest Layout) & Redesign Testimoni

**Project:** Cakra Lima Tujuh (cakra57.com)
**Stack:** React (functional + hooks), Tailwind (dark theme: black / neutral-900 bg, red-600 accent), Firebase/Firestore

---

## 1. Halaman Detail Destinasi — Layout Pinterest

### Alur
Klik card "Jawa" / "Bali" / "Indonesia" / "ASEAN" di section "Berdasarkan Destinasi" → navigasi ke halaman `/destinasi/:region` (contoh: `/destinasi/jawa`) → menampilkan kumpulan foto spot wisata di region tsb dalam layout masonry ala Pinterest.

### Kenapa CSS Columns, bukan Grid biasa
Grid Tailwind standar (`grid-cols-4`) memaksa semua baris sejajar tinggi — bukan Pinterest look. Efek masonry asli didapat dari **CSS multi-column** (`columns-*`), di mana tiap foto mempertahankan aspect ratio aslinya sehingga tinggi antar kolom otomatis bervariasi. Syaratnya: **jangan** crop foto ke aspect-ratio seragam (mis. `aspect-square`) — biarkan `h-auto` mengikuti rasio asli gambar, itu yang menciptakan efek "jatuh" khas Pinterest.

### Implementasi
```jsx
// pages/DestinasiDetail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const regionLabel = { jawa: "Jawa", bali: "Bali", indonesia: "Indonesia", asean: "ASEAN" };

export default function DestinasiDetail() {
  const { region } = useParams();
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    async function fetchSpots() {
      const q = query(collection(db, "destinationSpots"), where("region", "==", region));
      const snap = await getDocs(q);
      setSpots(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }
    fetchSpots();
  }, [region]);

  return (
    <div className="bg-black min-h-screen px-4 md:px-10 py-10">
      <nav className="text-neutral-400 text-sm mb-2">
        <a href="/" className="hover:text-red-500">Beranda</a> / Destinasi / {regionLabel[region]}
      </nav>
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-8">
        Destinasi Wisata {regionLabel[region]}
      </h1>

      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
        {spots.map((spot) => (
          <a
            href={`/destinasi/${region}/${spot.slug}`}
            key={spot.id}
            className="block mb-4 break-inside-avoid rounded-lg overflow-hidden relative group"
          >
            <img
              src={spot.image}
              alt={spot.name}
              className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              <p className="text-white font-semibold text-sm">{spot.name}</p>
              <p className="text-neutral-300 text-xs">{spot.city}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

### Struktur data Firestore
Sesuai konvensi flat single-tenant yang sudah dipakai — collection baru `destinationSpots`, tanpa nested subcollection supaya query `where("region", "==", ...)` tetap sederhana:

```
destinationSpots/{spotId}
  - region: "jawa" | "bali" | "indonesia" | "asean"
  - name: "Kawah Ijen"
  - city: "Banyuwangi"
  - image: "https://..."
  - slug: "kawah-ijen"
```

Firestore rule cukup `allow read: if true;` (data publik) dan `allow write: if isAdmin();` — sama pola dengan koleksi lain di project.

### Catatan
- Untuk foto, pastikan variasi orientasi (ada yang landscape, ada portrait) — ini penting supaya efek masonry terlihat natural, bukan grid rapi yang dipaksa jadi "columns".
- Kalau nanti mau tambah filter (kota/kategori wisata) di atas grid, tinggal tambah state filter tanpa ubah struktur layout.

---

## 2. Redesign Section Testimoni — "Testimoni Open Trip" + Elfsight

### Posisi
"Testimoni Open Trip" (custom, dari foto asli peserta trip) diletakkan **di atas** widget Elfsight (ulasan Google agregat). Beri judul berbeda untuk masing-masing supaya konteksnya jelas ke pengunjung:
- **Testimoni Open Trip** → cerita & foto asli peserta
- **Ulasan Google** (existing Elfsight widget) → rating agregat dari Google

### Konsep visual — "Travel Diary Strip"
Alih-alih testimonial card generic (rounded box + shadow + avatar bulat — treatment yang sudah terlalu umum), pakai motif yang lebih personal dan sesuai konteks open trip: foto-foto ditampilkan seperti **polaroid yang ditempel di jurnal perjalanan** — sedikit miring bergantian, ada aksen "washi tape" di atasnya, kutipan testimoni ditulis dengan font aksen (serif/script tipis) di bawah foto. Ini terasa personal & organik, cocok dengan foto-foto asli trip (bukan stock/studio), dan berbeda dari kotak testimoni polos yang sering dipakai template lain.

Strip disusun **horizontal scroll dengan scroll-snap**, bukan grid statis — meniru sensasi membolak-balik album foto trip.

### Implementasi
```jsx
// components/OpenTripTestimonials.jsx
const testimonials = [
  {
    image: "/assets/testimoni/trip-bromo-1.jpg",
    name: "Sarah",
    trip: "Open Trip Bromo Ijen",
    quote: "Perjalanan paling berkesan, guide-nya asik banget!",
    rating: 5,
  },
  {
    image: "/assets/testimoni/trip-lombok-1.jpg",
    name: "Rangga",
    trip: "Open Trip Lombok",
    quote: "Worth it banget, semua udah diatur rapi.",
    rating: 5,
  },
  // ...ambil dari /rental-mobil/src/assets/testimoni, ganti nama/trip/quote sesuai data asli
];

const rotations = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2"];

export default function OpenTripTestimonials() {
  return (
    <section className="bg-neutral-900 py-16">
      <h2 className="text-white text-2xl md:text-3xl font-bold text-center mb-2">
        Testimoni Open Trip
      </h2>
      <p className="text-neutral-400 text-center mb-10">
        Cerita nyata dari peserta trip bareng Cakra Lima Tujuh
      </p>

      <div className="flex gap-8 overflow-x-auto snap-x snap-mandatory px-6 md:px-16 pb-6 scrollbar-hide">
        {testimonials.map((t, i) => (
          <div
            key={t.name}
            className={`snap-center flex-shrink-0 w-60 md:w-64 bg-white p-3 pb-5 rounded-sm shadow-xl ${rotations[i % rotations.length]} hover:rotate-0 transition-transform duration-300`}
          >
            {/* washi tape accent */}
            <div className="absolute -mt-5 ml-8 w-14 h-5 bg-red-600/70 rotate-[-6deg] shadow-sm" />

            <img
              src={t.image}
              alt={t.name}
              className="w-full h-64 object-cover"
            />

            <div className="pt-4 text-center">
              <p className="font-serif italic text-neutral-800 text-sm leading-snug">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="mt-2 text-xs font-semibold text-neutral-900">{t.name}</p>
              <p className="text-[11px] text-red-600">{t.trip}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

```jsx
// urutan render di halaman
<OpenTripTestimonials />
<section className="bg-neutral-900 pt-4 pb-16">
  <h2 className="text-white text-2xl font-bold text-center mb-8">Ulasan Google</h2>
  <div className="elfsight-app-9e1ea109-b04f-462c-9b6f-a2d202491384" data-elfsight-app-lazy />
</section>
```

### Sumber foto
Ambil langsung dari `/rental-mobil/src/assets/testimoni` (foto asli peserta) — import per file atau pakai `import.meta.glob("./assets/testimoni/*.{jpg,png}")` kalau jumlahnya banyak dan ingin di-load otomatis tanpa daftar manual. Nama, trip, dan quote di atas masih placeholder — sesuaikan dengan data testimoni asli yang tersedia.

### Detail kecil yang bikin elegan
- Warna kertas polaroid putih (`bg-white`) sengaja kontras dengan background gelap section — foto jadi "menonjol" seperti ditempel di dinding gelap.
- Rotasi tiap foto beda-beda (`rotations` array) lalu `hover:rotate-0` — waktu di-hover foto "lurus kembali", memberi kesan interaktif tanpa animasi berlebihan.
- Washi tape pakai warna red-600 transparan — aksen brand kecil tanpa mendominasi foto.
- Scrollbar disembunyikan (`scrollbar-hide`, perlu plugin `tailwind-scrollbar-hide` atau custom CSS) supaya strip terlihat bersih, navigasi cukup via swipe/drag.
