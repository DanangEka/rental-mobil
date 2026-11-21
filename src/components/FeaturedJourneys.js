import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../services/firebase";
import { normalizeOpenTrip, normalizePaketWisata, formatRupiah } from "../utils/tourShowcase";

const sources = [
  { key: "open", collection: "open_trips", label: "Open Trip", href: "/open-trip", normalize: normalizeOpenTrip },
  { key: "private", collection: "paket_wisata", label: "Private Trip", href: "/tour-packages", normalize: normalizePaketWisata },
];

export default function FeaturedJourneys() {
  const [data, setData] = useState({});

  useEffect(() => {
    const unsubscribers = sources.map((source) => onSnapshot(collection(db, source.collection), (snapshot) => {
      const items = snapshot.docs.map((doc) => source.normalize({ id: doc.id, ...doc.data() }));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eligible = source.key === "open"
        ? items.filter((item) => item.tanggal && item.tanggal >= today).sort((a, b) => a.tanggal - b.tanggal)
        : items;
      setData((current) => ({ ...current, [source.key]: { item: eligible[0] || null } }));
    }, () => setData((current) => ({ ...current, [source.key]: { error: true } }))));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  return (
    <section className="bg-c57-surface-container-low py-20 sm:py-24" aria-labelledby="featured-journeys-heading">
      <div className="editorial-shell">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 id="featured-journeys-heading" className="font-display text-[clamp(2rem,4vw,3.1rem)] leading-tight">Pilihan perjalanan untuk Anda</h2>
            <p className="mt-3 max-w-xl text-body-md text-c57-on-surface-variant">Temukan jadwal bersama atau rencanakan perjalanan privat untuk rombongan Anda.</p>
          </div>
          <Link to="/tour-packages" className="inline-flex min-h-[44px] items-center font-label-md text-label-md text-c57-primary underline underline-offset-4">Lihat semua paket wisata</Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {sources.map((source) => {
            const result = data[source.key];
            const item = result?.item;
            return (
              <article key={source.key} className="flex flex-col rounded-c57-lg bg-c57-surface-container-lowest p-6 sm:p-8">
                <p className="font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-primary">{source.label}</p>
                <h3 className="mt-3 font-display text-[1.6rem] leading-tight">{item?.judul || item?.destinasi || (source.key === "open" ? "Perjalanan bersama" : "Perjalanan privat")}</h3>
                {!result ? <p className="mt-4 text-body-sm text-c57-on-surface-variant" role="status">Memuat pilihan perjalanan...</p> : item ? (
                  <div className="mt-4 space-y-1 text-body-sm text-c57-on-surface-variant">
                    {item.destinasi && <p>{item.destinasi}</p>}
                    {source.key === "open" && <p>{item.tanggalLabel}</p>}
                    {item.durasi && <p>{item.durasi}</p>}
                    {item.harga > 0 && <p className="font-semibold text-c57-primary">{formatRupiah(item.harga)}{source.key === "open" ? " / orang" : ""}</p>}
                  </div>
                ) : <p className="mt-4 text-body-sm text-c57-on-surface-variant">{result.error ? "Pilihan perjalanan belum dapat dimuat. Silakan lihat layanan atau hubungi kami." : "Hubungi kami untuk pilihan dan jadwal perjalanan terbaru."}</p>}
                <Link to={source.href} className="mt-6 inline-flex min-h-[44px] items-center self-start font-label-md text-label-md text-c57-primary underline underline-offset-4">{source.key === "open" ? "Lihat open trip" : "Lihat paket private"}</Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
