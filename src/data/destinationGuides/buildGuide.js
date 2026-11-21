import { destinationSpots } from "../destinationSpots";
import destinationPhotos from "../destinationPhotos.json";

const PREPARATION = {
  Mountain: ["hiking", "Sepatu berpijak baik", "Pilih alas kaki yang nyaman dan sesuai dengan jalur yang diizinkan."],
  Temple: ["dry_cleaning", "Pakaian yang sopan", "Siapkan pakaian sesuai tata tertib tempat ibadah dan arahan petugas."],
  Cliff: ["hiking", "Alas kaki yang stabil", "Gunakan jalur pengunjung dan nikmati panorama dari area berpagar."],
  Nature: ["hiking", "Alas kaki untuk berjalan", "Sesuaikan alas kaki dengan kondisi jalur dan cuaca saat berkunjung."],
  Beach: ["wb_sunny", "Pelindung dari matahari", "Bawa topi dan perlengkapan pribadi untuk menikmati waktu di pesisir."],
  Island: ["backpack", "Tas pelindung barang", "Lindungi barang pribadi saat perjalanan laut dan periksa prakiraan cuaca."],
  Lake: ["backpack", "Perlengkapan pribadi", "Siapkan air minum dan pakaian yang sesuai dengan aktivitas yang dipilih."],
  City: ["hiking", "Sepatu berjalan", "Pilih alas kaki nyaman untuk menjelajahi kawasan tanpa terburu-buru."],
  Village: ["dry_cleaning", "Pakaian yang sesuai", "Berpakaian sopan dan tanyakan etika kunjungan kepada tuan rumah."],
};

/** Shared presentation fields; every narrative and fact is authored per slug. */
export function buildRegionalGuides(records) {
  return Object.fromEntries(Object.entries(records).map(([slug, entry]) => {
    const spot = destinationSpots.find((item) => item.slug === slug);
    const photo = destinationPhotos[slug];
    if (!spot || !photo) throw new Error(`Missing catalogue or licensed photo: ${slug}`);
    const [icon, title, description] = PREPARATION[spot.category];
    return [slug, {
      subtitle: entry.subtitle,
      excerpt: entry.lead,
      lead: entry.lead,
      heroImage: photo.src,
      photoCredit: photo,
      facts: [
        { icon: "place", label: "Lokasi", value: spot.city },
        { icon: "explore", label: "Fokus Panduan", value: entry.focus },
        { icon: "schedule", label: "Cara Menikmati", value: "Luangkan waktu untuk mengenal tempat" },
        { icon: "info", label: "Sebelum Berangkat", value: "Periksa informasi pengelola" },
      ],
      panorama: { image: photo.src, label: spot.name, quote: entry.caption },
      narrative: { title: entry.title, body: entry.body, quote: entry.reflection, quoteBy: "Catatan editorial Cakra Discovery" },
      funFacts: entry.funFacts,
      light: {
        title: entry.experienceTitle,
        intro: entry.experience,
        timeline: [
          { time: "Awal", title: "Kenali kawasan", body: "Baca informasi setempat dan pastikan area yang dapat dikunjungi.", active: false },
          { time: "Inti", title: entry.highlight, body: entry.highlightBody, active: true },
          { time: "Jeda", title: "Sisakan waktu untuk berhenti", body: "Atur waktu istirahat dan perjalanan pulang tanpa memaksakan semua agenda.", active: false },
        ],
      },
      gear: [
        { icon, title, description },
        { icon: "backpack", title: "Bawaan secukupnya", description: "Pilih tas kecil dan bawa kembali sampah dari kunjungan Anda." },
        { icon: "photo_camera", title: "Etika fotografi", description: "Minta izin sebelum memotret orang dan patuhi pembatasan fotografi setempat." },
        { icon: "info", title: "Informasi terbaru", description: "Konfirmasi cuaca, akses, tiket, dan ketentuan aktivitas sebelum berangkat." },
      ],
      route: { title: entry.accessTitle, body: entry.access, note: entry.note || "Panduan ini tidak menjamin akses, jadwal, atau ketersediaan aktivitas. Periksa sumber resmi dan konfirmasi rencana perjalanan sebelum melakukan pemesanan." },
      culinary: { name: "Jeda selama perjalanan", description: entry.pause },
      reviewedOn: "2026-11-13",
      sources: entry.sources,
      commercial: null,
    }];
  }));
}
