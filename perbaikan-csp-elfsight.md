# Perbaikan: Widget Elfsight Diblokir CSP di Production

## Konteks project

- Hosting: Firebase Hosting
- Area yang terdampak: konfigurasi header Content Security Policy (CSP)
  di `firebase.json`, section Testimoni yang memakai widget Google
  Reviews dari Elfsight

## Masalah

Widget Elfsight (Google Reviews) muncul normal di local development,
tapi tidak muncul di `cakra57.com` (production). Console browser
menunjukkan error:

```
Refused to load the script 'https://elfsightcdn.com/platform.js' because
it violates the following Content Security Policy directive:
"script-src 'self' 'unsafe-inline' https://apis.google.com". Note that
'script-src-elem' was not explicitly set, so 'script-src' is used as a
fallback.
```

Penyebabnya: CSP di production (dikonfigurasi lewat header Firebase
Hosting) hanya mengizinkan script dari `'self'` dan
`https://apis.google.com`. Domain Elfsight (`elfsightcdn.com`) belum
masuk whitelist, jadi browser diam-diam memblokir script tersebut.
Local development tidak menerapkan CSP sama sekali, sehingga masalah ini
tidak terlihat sampai di-deploy ke production.

---

## Task 1: Tambahkan domain Elfsight ke whitelist CSP

- [ ] Buka konfigurasi header CSP di `firebase.json` (atau file konfigurasi
      header hosting yang setara)
- [ ] Tambahkan domain berikut ke directive `script-src` (atau
      `script-src-elem` jika didefinisikan terpisah):
      - `https://elfsightcdn.com`
      - `https://static.elfsight.com` (kadang dipakai sebagai domain
        alternatif oleh Elfsight, aman ditambahkan sekaligus)
- [ ] Jika widget Elfsight juga memuat data dari domain lain (misalnya
      untuk gambar profil reviewer atau API call), cek console lagi
      setelah perbaikan pertama untuk error CSP tambahan yang mungkin
      muncul (`img-src`, `connect-src`, `frame-src`) dan tambahkan sesuai
      kebutuhan
- [ ] Deploy ulang hosting setelah perubahan `firebase.json`

**Acceptance criteria:**
- Widget Elfsight tampil normal di `cakra57.com` production, tidak
  hanya di local
- Tidak ada lagi error "Refused to load the script" terkait domain
  Elfsight di console browser saat membuka halaman production

---

## Task 2 (opsional): Pertimbangkan migrasi ke package React resmi

Sebagai perbaikan jangka panjang yang lebih tahan terhadap masalah
serupa di masa depan (bukan wajib untuk memperbaiki masalah CSP saat
ini):

- [ ] Pertimbangkan migrasi dari instalasi script mentah ke package
      `react-elfsight-widget` dari npm, yang menangani pemuatan script
      platform Elfsight secara otomatis dan lebih sesuai untuk aplikasi
      React (SPA)

**Acceptance criteria:**
- Tidak mendesak — hanya dilakukan jika tim ingin mengurangi
  ketergantungan pada script mentah yang rawan konflik CSP di kemudian
  hari
