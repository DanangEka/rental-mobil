# Cakra Discovery Web
## Editorial Masonry + Mood Discovery

> Konsep UI/UX untuk fitur Discovery Cakra yang berfokus pada eksplorasi destinasi wisata melalui fotografi.

> **Catatan revisi:** versi ini disesuaikan dari draf awal dalam dua tahap — (1) palet warna mengikuti tema cakra57.com yang sudah berjalan (dark theme black/neutral-900 + red-600 accent, menggantikan arahan warm off-white), dan (2) struktur destinasi mengikuti cakupan yang sudah diterapkan di produk: **Jawa, Bali, Indonesia, ASEAN** sebagai region tab utama, mood sebagai filter sekunder di dalamnya. Ditambahkan juga panduan sumber foto dummy bebas hak cipta (Bagian 18) dan catatan akses publik tanpa login (Bagian 2, 12). Prinsip editorial dan masonry gallery tetap sama.

---

## 1. Design Direction

**Core concept:** Editorial travel photography + masonry discovery + mood-based exploration.

Cakra Discovery tidak diposisikan sebagai katalog destinasi biasa. Foto menjadi konten utama, sementara teks dan UI berfungsi sebagai konteks dan navigasi.

### Visual keywords

- Editorial
- Immersive
- Photography-first
- Modern
- Youthful
- Warm
- Minimal
- Explorative

### Hindari

- Card grid generik 3 kolom
- Terlalu banyak border dan shadow
- UI yang terasa seperti dashboard
- Thumbnail dengan ukuran seragam
- Terlalu banyak teks pada gallery
- Pure white + blue corporate styling

---

## 2. Information Architecture

```text
Cakra Discovery
│
├── Hero
│   ├── Headline
│   ├── Supporting copy
│   └── Featured destination
│
├── Region Tabs
│   ├── Jawa
│   ├── Bali
│   ├── Indonesia
│   └── ASEAN
│
├── Mood Discovery (filter sekunder, jalan di dalam tab region aktif)
│   ├── Escape
│   ├── Reconnect
│   ├── Adventure
│   ├── Slow Life
│   └── Culture
│
├── Destination Gallery
│   └── Editorial Masonry (destinasi pada region + mood terpilih)
│
└── Destination Detail
    ├── Hero photography
    ├── Destination information
    ├── Story / description
    ├── Gallery
    └── Related destinations
```

**Akses:** seluruh menu Discovery — Hero, Region Tabs, Mood Discovery, Gallery, Destination Detail — adalah halaman publik, bisa diakses siapa pun tanpa login, termasuk client yang belum daftar/masuk. Login baru diminta saat user melakukan aksi yang butuh identitas (lanjut booking, atau simpan favorit kalau fitur itu ditambahkan nanti) — bukan syarat untuk browsing.

---

## 3. Hero Section

### Headline

Gunakan headline besar dan editorial.

Contoh:

**Discover Southeast Asia**

> One destination at a time.

Alternatif:

**Places worth getting lost in.**

**Discover Indonesia and beyond.**

### Visual

- Featured destination menggunakan foto besar.
- Foto dapat menggunakan aspect ratio 16:9 atau cinematic crop.
- Overlay gradient hanya jika diperlukan untuk readability.
- Hindari UI berlebihan di atas hero.

---

## 4. Mood Discovery

### Concept

User tidak harus mengetahui nama destinasi terlebih dahulu.

Pertanyaan utama:

> **How do you want to feel?**

Mood options:

| Mood | Intent |
|---|---|
| 🌊 Escape | Pantai, pulau, tempat untuk menjauh dari rutinitas |
| 🌿 Reconnect | Alam, hutan, retreat |
| 🏔️ Adventure | Hiking, diving, outdoor activities |
| ☀️ Slow Life | Desa, resort, sunrise, quiet places |
| 🏛️ Culture | Heritage, architecture, local traditions |

### Interaction

Saat mood dipilih:

1. Active state berubah — chip terpilih pakai `--accent` (bg atau border red-600), chip lain tetap `--border` (neutral-800) dengan teks `--muted`.
2. Gallery melakukan filtering.
3. Transisi gambar dibuat smooth.
4. Tidak perlu reload halaman.

---

## 5. Editorial Masonry Gallery

Gallery adalah pusat pengalaman Discovery.

### Prinsip

- Foto lebih dominan daripada metadata.
- Ukuran image bervariasi.
- Gunakan masonry/asymmetrical layout.
- Metadata diletakkan dekat gambar.
- Card tidak perlu terlihat seperti card tradisional.

Contoh (dalam satu tab region, mis. tab "Semua" lintas region):

```text
┌────────────┐   ┌──────────────────┐   ┌───────────┐
│            │   │                  │   │           │
│   PHOTO    │   │      PHOTO       │   │   PHOTO   │
│            │   │                  │   │           │
│            │   │                  │   │           │
└────────────┘   └──────────────────┘   └───────────┘
   Bromo              Ha Long Bay          Ubud
   Jawa                ASEAN               Bali
```

### Recommended aspect ratios

- 4:5
- 3:2
- 16:9

Jangan paksa seluruh foto ke aspect ratio yang sama.

---

## 6. Destination Metadata

Metadata harus ringkas.

### Recommended format

```text
Mount Bromo
East Java · Nature
```

atau:

```text
Raja Ampat
West Papua · Island
```

### Optional metadata

- Country / region
- Category
- Elevation
- Best season
- Estimated travel time

Hanya tampilkan informasi yang membantu discovery.

---

## 7. Image Interaction

### Default

Foto tampil clean tanpa overlay berat.

### Hover

Desktop:

- Image scale: sekitar `1.03x`
- Transition: `250–400ms`
- Metadata tetap readable
- Optional CTA: `View destination →` — teks/panah pakai `--accent` (red-600) saat hover, bukan warna default

### Mobile

Karena hover tidak ada:

- Gunakan tap interaction.
- Jangan bergantung pada hover untuk informasi penting.

---

## 8. Destination Detail Page

Saat user membuka destinasi:

```text
┌──────────────────────────────────────────────┐
│                                              │
│              HERO DESTINATION               │
│                                              │
│                                              │
│              Mount Bromo                    │
│              East Java                      │
└──────────────────────────────────────────────┘

About the place

[ description / story ]

Gallery

┌──────────────┐  ┌────────────────────┐
│              │  │                    │
│    PHOTO     │  │       PHOTO        │
│              │  │                    │
└──────────────┘  └────────────────────┘

You might also like

[ destination ] [ destination ] [ destination ]
```

### Experience

Destination detail sebaiknya terasa seperti membaca editorial travel, bukan membuka database.

---

## 9. Typography

### Primary UI / Body

Recommended:

- Inter
- Manrope
- DM Sans

### Editorial Heading

Recommended:

- Playfair Display
- DM Serif Display
- Cormorant Garamond

### Suggested hierarchy

```text
Hero heading       56–80px
Section heading    36–48px
Destination title  20–28px
Body               16–18px
Metadata           12–14px
```

Responsive sizing wajib digunakan untuk mobile.

---

## 10. Color Direction

Gunakan dark neutral palette milik cakra57, bukan warm off-white.

### Suggested tokens

```css
--background: #0A0A0A;      /* neutral-950, page base */
--surface: #171717;         /* neutral-900, card & elevated surface */
--surface-alt: #262626;     /* neutral-800, hover / secondary surface */
--foreground: #FAFAFA;      /* neutral-50, primary text */
--muted: #A3A3A3;           /* neutral-400, metadata / secondary text */
--border: #262626;          /* neutral-800, hairline border */
```

Accent:

```css
--accent: #DC2626;          /* red-600, primary accent */
--accent-hover: #B91C1C;    /* red-700, hover / active state */
--accent-muted: #7F1D1D;    /* red-900, subtle tint untuk badge/tag */
```

Prinsip:

- Black/neutral-900 sebagai background utama — ini identitas visual cakra57 yang sudah berjalan, bukan sekadar dark mode opsional.
- Foto jadi satu-satunya sumber "warmth" di halaman. Di atas bg gelap, warna asli destinasi (biru laut, hijau hutan, oranye sunset) justru lebih menonjol dibanding di atas bg terang.
- Red-600 dipakai secukupnya — mood aktif, CTA utama, aksen garis tipis — bukan untuk field atau area luas.
- Teks utama pakai neutral-50, metadata/caption pakai neutral-400 supaya kontras tetap nyaman di atas bg gelap.
- Tetap satu warna aksen (red). Jangan menambah warna kedua di luar palet warna foto itu sendiri.

---

## 11. Spacing

Gunakan generous whitespace.

Suggested spacing scale:

```text
4
8
12
16
24
32
48
64
96
128
```

Desktop:

- Content max-width: `1200–1440px`
- Page padding: `32–64px`
- Section spacing: `96–128px`

Mobile:

- Page padding: `16–20px`
- Section spacing: `56–80px`

---

## 12. Navigation

Ikuti header pill yang sudah berjalan di cakra57.com — bukan nav generik. Tambahkan **Discovery** sebagai item baru:

```text
(  LAYANAN ⌄     DISCOVERY     OPEN TRIP     COMPANY     PAKET WISATA  )
```

- Ditaruh tepat setelah dropdown `LAYANAN`, sebelum `OPEN TRIP` — Discovery adalah pintu masuk jelajah destinasi sebelum user pilih jenis trip, jadi posisinya di depan `OPEN TRIP` masuk akal secara alur.
- Style pill mengikuti yang sudah ada: rounded-full, background terang (`--surface`, bukan neutral-900) yang sengaja kontras terhadap hero/bg gelap halaman, teks gelap, hover/active state item pakai `--accent` (red-600) — bukan bg solid red-600 di seluruh pill.
- Perlu sedikit lebih lebar/padding menyesuaikan 5 item, atau font sedikit lebih rapat di breakpoint kecil sebelum jatuh ke mobile menu.

Mobile: bukan drawer off-canvas, tapi dropdown panel yang muncul di bawah tombol toggle (rounded card, floating di atas hero). Isinya sudah benar secara struktur:

```text
[ → LOGIN ]        (accent-filled, red-600 — satu-satunya primary CTA di panel ini)
[ + SIGN UP ]       (outline, secondary)

  LAYANAN
  DISCOVERY
  OPEN TRIP
  PAKET WISATA
  COMPANY
```

Dua hal yang perlu dirapikan:

1. **Tombol toggle** — karena perilakunya dropdown panel (nempel di bawah tombol, bukan slide dari samping), ikonnya seharusnya cuma chevron, bukan hamburger + chevron digabung. Hamburger secara konvensi menjanjikan drawer/off-canvas; dipasangkan dengan chevron di tombol yang sama bikin dua sinyal saling tabrakan. Pilih satu: chevron-down saja (kalau mau tetap ringkas), atau ganti isi tombol jadi label `Menu` + chevron.
2. **Urutan item tidak sama dengan desktop** — di dropdown ini urutannya Layanan → Discovery → Open Trip → Paket Wisata → Company, sedangkan di pill desktop urutannya Layanan → Discovery → Open Trip → Company → Paket Wisata. Samakan urutan di kedua tempat (pakai urutan desktop di atas) supaya user tidak bingung posisi menu berpindah antar breakpoint.

Login/Sign up ditaruh di atas nav item — masuk akal karena itu aksi yang paling sering dicari, tapi pastikan `LOGIN` yang jadi satu-satunya tombol accent-filled di panel ini (sudah benar di screenshot), `SIGN UP` tetap secondary/outline.

Search di dalam halaman Discovery sendiri (bukan di navbar utama) sebaiknya mendukung:

- Destination
- Region
- Category
- Mood

---

## 13. Search & Filter

### Search

Placeholder:

> Search destinations...

### Filters

Dua lapis filter — jangan digabung jadi satu baris panjang:

**1. Region tabs (primary, selalu terlihat)**

```text
Semua
Jawa
Bali
Indonesia
ASEAN
```

Ini mengikuti cakupan trip yang sudah berjalan di cakra57 (Open Trip/Private Trip by region). Tab ini menentukan destinasi apa saja yang muncul di gallery.

**2. Mood chips (secondary, scrollable horizontal)**

```text
Escape
Reconnect
Adventure
Slow Life
Culture
```

Mood chip memfilter di dalam region yang sedang aktif — bukan pengganti region tab.

Filter dibuat lightweight. Chip/tab aktif pakai `--accent` (bg atau border red-600 dengan teks putih), yang nonaktif pakai border `--border` (neutral-800) dengan teks `--muted`.

Jangan membuat sidebar filter ala e-commerce. Kita sedang mencari tempat liburan, bukan membeli 14 jenis kabel USB.

---

## 14. Responsive Behavior

### Desktop

- Masonry 3–4 columns
- Large hero
- Hover interactions
- Generous whitespace

### Tablet

- Masonry 2–3 columns
- Smaller typography
- Reduced section spacing

### Mobile

- Masonry 1–2 columns
- Hero tetap immersive
- Touch-first interaction
- Metadata lebih ringkas
- Navigation menjadi compact

---

## 15. Motion

Motion harus subtle.

### Recommended

```text
Image hover       250–400ms
Filter transition 300–500ms
Page transition   400–700ms
```

Gunakan easing yang natural.

Hindari:

- Excessive parallax
- Bouncing UI
- Animasi yang mengganggu browsing
- Loading animation yang terlalu lama

---

## 16. Accessibility

Wajib:

- Alt text untuk setiap destination image.
- Kontras teks yang memadai.
- Keyboard navigation.
- Focus state yang jelas.
- Interactive element tidak hanya dibedakan berdasarkan warna.
- Reduced-motion support.
- Cek kontras teks `--muted` (neutral-400) terhadap `--background`/`--surface` — pastikan tetap memenuhi WCAG AA meski di atas bg gelap.
- Focus ring pakai warna yang tetap terlihat jelas di atas foto gelap maupun bg neutral-900 (mis. red-500/red-400, bukan red-700 yang terlalu redup).

---

## 17. Performance

Karena gallery image-heavy, performance harus menjadi bagian dari design.

### Recommended

- Lazy loading image.
- Responsive image sizes.
- WebP/AVIF.
- Blur/low-quality placeholder.
- CDN image optimization.
- Jangan load seluruh gallery sekaligus.
- Gunakan progressive loading saat scroll.

Target:

> Visual tetap premium tanpa membuat user menunggu jaringan menyesuaikan diri dengan ambisi desainer.

---

## 18. Dummy Photo Sourcing (Bebas Hak Cipta)

**Prioritas pertama: pakai ulang foto yang sudah ada.** Sebelum cari foto stok baru, tarik foto yang sudah dipakai di `DestinationDetail.js` untuk destinasi yang sama — foto itu sudah tervalidasi (sudah dipakai di production) dan menjaga konsistensi visual antara Discovery dan halaman detail destinasi. Cukup source foto dummy baru untuk destinasi yang belum punya foto sama sekali di codebase.

Untuk destinasi yang belum ada fotonya, gunakan foto stok dengan lisensi yang jelas mengizinkan penggunaan komersial — jangan hotlink dari sembarang hasil pencarian gambar.

### Sumber yang aman dipakai

| Sumber | Lisensi | Catatan |
|---|---|---|
| **Pexels** | Pexels License — bebas dipakai komersial, tanpa wajib atribusi | Koleksi besar, kualitas konsisten, API resmi di `api.pexels.com` |
| **Pixabay** | Mayoritas CC0 | Variasi kualitas lebih beragam, cek lisensi per foto sebelum unduh |
| **Unsplash** | Unsplash License (kini di bawah Getty) — bebas komersial, tapi bukan CC0 | Boleh dipakai di produk, tidak boleh dikumpulkan ulang jadi "bank foto" pesaing; pakai `api.unsplash.com` resmi |

**Hindari** `source.unsplash.com` — endpoint ini sudah dinonaktifkan sejak beberapa tahun lalu dan tidak lagi berfungsi untuk hotlink random image.

### Cara pakai untuk development

1. Unduh dan simpan foto ke storage/CDN sendiri (Firebase Storage atau Cloudflare) — jangan hotlink langsung dari domain pihak ketiga saat production, karena rentan berubah/hilang dan menambah dependency di luar kontrol.
2. Beri nama file yang jelas per destinasi (`bromo-sunrise.webp`, `ubud-terraces.webp`) supaya gampang diganti foto asli nanti.
3. Simpan sumber + link lisensi tiap foto di satu file referensi internal (mis. `assets/photo-credits.md`), meski tidak wajib atribusi — memudahkan audit kalau ada foto yang perlu diganti.

### Kata kunci pencarian per region

- **Jawa:** "Mount Bromo sunrise", "Kawah Ijen blue fire", "Borobudur temple", "Dieng plateau"
- **Bali:** "Ubud rice terrace", "Kelingking beach Nusa Penida", "Tanah Lot sunset", "Uluwatu cliff temple"
- **Indonesia:** "Raja Ampat aerial", "Lake Toba Sumatra", "Komodo island", "Lombok Rinjani"
- **ASEAN:** "Ha Long Bay Vietnam", "Bangkok temple Thailand", "Boracay Philippines", "Angkor Wat Cambodia"

---

## 19. Component List

Recommended component structure:

```text
DiscoveryPage
├── Navbar
├── HeroDestination
├── MoodExplorer
│   └── MoodChip
├── DestinationGallery
│   └── DestinationTile
├── LoadMore / InfiniteScroll
└── Footer

DestinationDetail
├── Navbar
├── DestinationHero
├── DestinationIntro
├── DestinationGallery
├── RelatedDestinations
└── Footer
```

`Navbar` di sini adalah header pill yang sudah ada (LAYANAN, Discovery, Open Trip, Company, Paket Wisata) — bukan komponen baru. `DestinationGallery`/`DestinationTile` di `DiscoveryPage` dan `DestinationDetail` sebaiknya jadi komponen yang sama supaya foto per destinasi otomatis konsisten di kedua tempat, sesuai catatan reuse foto di Bagian 18.

---

## 20. Destination Tile

Concept:

```text
┌─────────────────────────┐
│                         │
│                         │
│         IMAGE           │
│                         │
│                         │
└─────────────────────────┘
Mount Bromo
East Java · Nature
```

Optional hover:

```text
┌─────────────────────────┐
│                         │
│         IMAGE           │
│                  ↗      │
│                         │
└─────────────────────────┘
Mount Bromo
East Java · Nature
```

Tile harus terasa seperti editorial image, bukan product card.

---

## 21. Design Personality

Cakra Discovery sebaiknya terasa:

**Curious**
> Mengajak user menemukan tempat baru.

**Calm**
> Tidak berisik dan tidak penuh UI.

**Premium**
> Fotografi dan whitespace menjadi pusat visual.

**Human**
> Destinasi terasa seperti tempat yang ingin dikunjungi, bukan sekadar database.

**Modern**
> Interaction dan layout mengikuti web modern tanpa mengejar tren secara berlebihan.

---

## 22. Final Design Formula

```text
Cakra Discovery
=
Editorial Photography
+
Masonry Gallery
+
Mood-based Discovery
+
Minimal UI
+
Immersive Destination Detail
```

### One-line design principle

> **Let the destination do the talking.**

Foto adalah hero. UI hanya membantu user menemukan cerita berikutnya.
