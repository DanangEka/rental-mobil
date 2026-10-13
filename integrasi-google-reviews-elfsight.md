# Integrasi Google Reviews (Elfsight) — Cakra Lima Tujuh

Website sudah punya section testimoni statis ("TESTIMONI" / "Kata Pelanggan Kami" dengan 3 kartu dummy: Budi Santoso, Siti Rahmawati, Hendra Wijaya). Dokumen ini menjelaskan cara mengganti isi section itu dengan widget Elfsight yang menarik review asli dari Google Maps — tanpa perlu Google Cloud API key atau billing account.

## Kode embed

```html
<!-- Elfsight Google Reviews | Untitled Google Reviews -->
<script src="https://elfsightcdn.com/platform.js" async></script>
<div class="elfsight-app-9e1ea109-b04f-462c-9b6f-a2d202491384" data-elfsight-app-lazy></div>
```

## Cara mengganti section testimoni yang sudah ada

1. Cari file/komponen yang me-render section ini (biasanya nama seperti `Testimonial.jsx`, `Testimoni.jsx`, atau ada di dalam file halaman utama, cari teks `"Kata Pelanggan Kami"` atau `"TESTIMONI"` untuk menemukannya cepat).
2. Di dalam komponen itu, biasanya ada array data dummy (nama, jabatan, isi testimoni, rating) yang di-`map()` jadi 3 kartu. **Hapus array data dummy dan bagian `.map()` render kartu tersebut.**
3. Ganti grid 3 kartu itu dengan container Elfsight, tapi **pertahankan heading "TESTIMONI" dan "Kata Pelanggan Kami"** supaya struktur visual section tetap sama.

### Sebelum (ilustrasi struktur yang sudah ada)

```jsx
<section id="testimoni">
  <p className="label">TESTIMONI</p>
  <h2>Kata Pelanggan Kami</h2>

  <div className="grid grid-cols-3 gap-6">
    {testimonials.map((t) => (
      <TestimonialCard key={t.id} {...t} />
    ))}
  </div>
</section>
```

### Sesudah (dengan widget Elfsight)

**Next.js:**

```jsx
import Script from "next/script";

<section id="testimoni">
  <p className="label">TESTIMONI</p>
  <h2>Kata Pelanggan Kami</h2>

  <div className="elfsight-app-9e1ea109-b04f-462c-9b6f-a2d202491384" data-elfsight-app-lazy></div>
  <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
</section>
```

**React biasa (Vite/CRA)** — script cukup dipasang sekali secara global (misalnya di `App.jsx` lewat `useEffect`, atau langsung di `public/index.html`), lalu di section testimoni cukup taruh container-nya saja:

```jsx
<section id="testimoni">
  <p className="label">TESTIMONI</p>
  <h2>Kata Pelanggan Kami</h2>

  <div className="elfsight-app-9e1ea109-b04f-462c-9b6f-a2d202491384" data-elfsight-app-lazy></div>
</section>
```

Kalau script dipasang di `public/index.html`, tinggal tambahkan sebelum `</body>`:

```html
<script src="https://elfsightcdn.com/platform.js" async></script>
```

## Catatan

- Setelah diganti, data 3 testimoni dummy (Budi Santoso, Siti Rahmawati, Hendra Wijaya) tidak lagi diperlukan — boleh dihapus dari kode/komponen `TestimonialCard` kalau tidak dipakai di tempat lain.
- Layout, jumlah review yang tampil, dan filter rating diatur dari dashboard Elfsight, bukan dari kode.
- Cek limit free tier Elfsight di dashboard supaya widget tidak berhenti tampil kalau kuota views bulanan habis.
- Widget ini murni client-side — tidak butuh API key Google, billing account, atau server proxy.
