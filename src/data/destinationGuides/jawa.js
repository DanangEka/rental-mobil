import records from "./jawa.json";
import { buildRegionalGuides } from "./buildGuide";
import bromoHero from "../../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.41.webp";
import bromoPanorama from "../../assets/testimoni/IMG_4350.JPG";

/** Reviewed editorial records, keyed by the existing destination slug. */
const jawaGuides = {
  ...buildRegionalGuides(records),
  "gunung-bromo": {
    subtitle: "Lautan pasir dan cerita Tengger",
    heroImage: bromoHero,
    excerpt: "Mengapa Bromo punya lautan pasir? Kenali bentang alam dan budaya Tengger sebelum berangkat.",
    lead: "Bromo bukan hanya tempat menunggu matahari terbit. Di balik panorama pegunungannya, ada lautan pasir, kehidupan masyarakat Tengger, dan perjalanan yang layak dinikmati perlahan.",
    facts: [
      { icon: "place", label: "Lokasi", value: "Jawa Timur" },
      { icon: "landscape", label: "Bentang Alam", value: "Pegunungan & lautan pasir" },
      { icon: "group", label: "Budaya", value: "Masyarakat Tengger" },
      { icon: "schedule", label: "Rencana Kunjungan", value: "Sesuaikan akses & cuaca" },
    ],
    panorama: {
      image: bromoPanorama,
      label: "Catatan perjalanan Cakra57",
      quote: "Sisakan waktu untuk menikmati perjalanan, bukan hanya mengumpulkan foto.",
    },
    narrative: {
      title: "Mengenal Bromo, lebih dari sunrise",
      body: [
        "Gunung Bromo berada di kawasan Taman Nasional Bromo Tengger Semeru, Jawa Timur. Daya tariknya tidak berhenti pada satu puncak: hamparan pasir dan kerucut-kerucut gunung membentuk panorama yang membuat kawasan ini begitu khas.",
        "Lautan pasir Tengger adalah bagian dari bentang vulkanik kawasan ini. Dari titik pandang yang berbeda, bentuk gunung dan hamparan di sekitarnya bisa terlihat sangat berbeda pula. Karena itu, menikmati Bromo tidak harus berarti mengejar sebanyak mungkin tempat dalam satu pagi.",
        "Kawasan ini juga merupakan ruang hidup dan ruang spiritual masyarakat Tengger. Yadnya Kasada adalah ritual tahunan masyarakat Hindu Tengger, dengan prosesi yang berkaitan dengan Pura Luhur Poten dan kawah Bromo. Tradisi tersebut memiliki makna keagamaan; pengunjung perlu menghormati ruang dan aktivitas ibadah, bukan memperlakukannya sebagai pertunjukan.",
      ],
      quote: "Datang untuk melihat pemandangan, pulang dengan mengenal tempat dan masyarakatnya.",
      quoteBy: "Catatan editorial Cakra Discovery",
    },
    funFacts: [
      { title: "Lautan pasir di pegunungan", body: "Hamparan yang dikenal sebagai lautan pasir Tengger berada di kawasan vulkanik. Inilah salah satu unsur yang membedakan panorama Bromo dari pemandangan pegunungan yang didominasi pepohonan." },
      { title: "Satu panorama, beberapa gunung", body: "Bromo bukan satu-satunya gunung dalam bentang ini. Batok, Kursi, Watangan, dan Widodaren juga disebut dalam gambaran kawasan Tengger oleh Indonesia Travel." },
      { title: "Kasada mengikuti kalender Tengger", body: "Pelaksanaan Yadnya Kasada mengikuti penanggalan tradisional Tengger. Jangan mengandalkan tanggal yang sama pada kalender Masehi setiap tahun; cari informasi penyelenggaraan dan akses melalui pengelola." },
    ],
    light: {
      title: "Menikmati Bromo tanpa terburu-buru",
      intro: "Berikut gambaran urutan kunjungan, bukan jadwal keberangkatan atau jaminan akses. Susun waktu bersama pendamping perjalanan berdasarkan cuaca dan pengumuman pengelola.",
      timeline: [
        { time: "Awal", title: "Persiapkan keberangkatan", body: "Konfirmasi titik temu, pakaian hangat, dan transportasi kawasan sebelum berangkat.", active: false },
        { time: "Pagi", title: "Nikmati panorama", body: "Jika kondisi memungkinkan, sisihkan waktu untuk menyaksikan perubahan cahaya di pegunungan. Matahari terbit tidak selalu terlihat saat berawan.", active: true },
        { time: "Lanjut", title: "Kenali kawasan dan budaya", body: "Lanjutkan hanya ke area yang diizinkan. Beri ruang bagi aktivitas masyarakat dan ikuti arahan petugas.", active: false },
      ],
    },
    gear: [
      { icon: "dry_cleaning", title: "Pakaian berlapis", description: "Siapkan jaket dan lapisan pakaian yang mudah disesuaikan saat udara berubah." },
      { icon: "hiking", title: "Sepatu yang nyaman", description: "Pilih alas kaki dengan pijakan baik untuk berjalan di permukaan pasir dan jalur yang diizinkan." },
      { icon: "backpack", title: "Tas kecil", description: "Bawa air minum, kebutuhan pribadi, serta kantong untuk membawa kembali sampah." },
      { icon: "support_agent", title: "Informasi pengelola", description: "Periksa pengumuman resmi dan konfirmasi rute dengan pendamping sebelum berangkat." },
    ],
    route: {
      title: "Pilih akses sesuai titik keberangkatan",
      body: "Indonesia Travel menyebut akses melalui kawasan Probolinggo, Pasuruan, dan Ngadas. Pilihan jalur sebaiknya mengikuti titik keberangkatan, kondisi jalan, serta akses yang sedang diizinkan. Atur transportasi lanjutan di kawasan bersama penyedia perjalanan.",
      note: "Jangan menganggap seluruh titik wisata selalu dapat dikunjungi. Periksa pengumuman, tiket, dan ketentuan melalui situs resmi TNBTS sebelum menentukan tanggal. Akses dapat berubah mengikuti kondisi kawasan dan kegiatan adat.",
    },
    culinary: {
      name: "Jeda sebelum melanjutkan perjalanan",
      description: "Sisihkan waktu untuk makan dan beristirahat. Tanyakan pilihan tempat singgah yang sedang buka kepada pendamping, terutama bila membawa anak atau bepergian bersama keluarga.",
    },
    reviewedOn: "2026-11-13",
    sources: [
      { title: "Indonesia Travel — Bentang alam dan akses Bromo Tengger Semeru", url: "https://www.indonesia.travel/id/en/destination/java/east-java/bromo-tengger-semeru-national-park" },
      { title: "Indonesia Travel — Mengenal Yadnya Kasada", url: "https://www.indonesia.travel/id/id/travel-ideas/culture/yadnya-kasada-and-bromo-excotica-festival-on-bewitching-mt-bromo" },
      { title: "TNBTS — Pengumuman dan informasi kunjungan resmi", url: "https://bromotenggersemeru.id/" },
    ],
    commercial: null,
  },
};

export default jawaGuides;
