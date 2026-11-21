import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Icon } from "./ui";
import { useEditorialReveal } from "../motion/editorial";
import testimonial1 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.38 (1).webp";
import testimonial2 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.38.webp";
import testimonial3 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.39.webp";
import testimonial4 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.40 (1).webp";
import testimonial5 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.40.webp";
import testimonial6 from "../assets/testimoni/WhatsApp Image 2026-09-02 at 22.03.41.webp";
import testimonial7 from "../assets/testimoni/IMG_4350.JPG";
import testimonial8 from "../assets/testimoni/WhatsApp Image 2026-10-19 at 12.19.06.jpeg";
import testimonial9 from "../assets/testimoni/WhatsApp Image 2026-10-19 at 12.19.07 (1).jpeg";
import testimonial10 from "../assets/testimoni/WhatsApp Image 2026-10-19 at 12.19.07.jpeg";

const FEATURED = {
  image: testimonial7,
  trip: "Wisata Bromo",
  quote: "Tempat yang luar biasa dengan pemandangan memukau.",
};

// Aspect ratios follow each photo's native orientation (portrait 4:5,
// square 1:1, landscape 3:2 / 16:9) so no story is forced through a
// heavy crop, and the sequence interleaves shapes so every masonry
// column mixes heights at the 2- and 3-column breakpoints.
const JOURNAL = [
  { image: testimonial4, trip: "Bromo Jeep", quote: "Semua sudah diatur rapi, kami tinggal menikmati perjalanan.", aspect: "aspect-square" },
  { image: testimonial1, trip: "Bromo Sunrise", quote: "Matahari terbit di atas lautan awan. Tidak ada kata yang cukup.", aspect: "aspect-[4/5]" },
  { image: testimonial8, trip: "Trip Oktober", quote: "Pengalaman tak terlupakan bersama keluarga.", aspect: "aspect-[4/5]" },
  { image: testimonial2, trip: "Bromo & Malang", quote: "Perjalanan paling berkesan yang pernah saya ikuti.", aspect: "aspect-[16/9]" },
  { image: testimonial5, trip: "Private Trip", quote: "Detail kecil diperhatikan. Rasanya seperti ditemani keluarga.", aspect: "aspect-[3/2]" },
  { image: testimonial3, trip: "Open Trip Bromo", quote: "Guide-nya hangat, rombongannya seru, dan waktunya pas.", aspect: "aspect-square" },
  { image: testimonial9, trip: "Open Trip", quote: "Seru banget, pasti balik lagi!", aspect: "aspect-[4/5]" },
  { image: testimonial6, trip: "Safari Jeep", quote: "Anak-anak senang, kami pun tenang. Terima kasih Cakra.", aspect: "aspect-[3/2]" },
  { image: testimonial10, trip: "Private Tour", quote: "Pelayanan ramah dan profesional.", aspect: "aspect-[4/5]" },
];

const TOTAL = 1 + JOURNAL.length;

const pad = (n) => String(n).padStart(2, "0");

export default function LandingStories() {
  const reveal = useEditorialReveal();

  return (
    <section
      className="relative overflow-hidden bg-c57-surface-container-low py-20 sm:py-28"
      aria-labelledby="stories-heading"
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-c57-primary-container/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="editorial-shell relative">
        <motion.div {...reveal()} className="mx-auto max-w-3xl text-center">
          <h2
            id="stories-heading"
            className="text-balance font-display text-[clamp(2.4rem,5.5vw,4.4rem)] font-normal leading-[1.03] tracking-[-0.025em] text-c57-on-surface"
          >
            Cerita dari
            <br />
            <em className="italic text-c57-primary">perjalanan mereka</em>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-body-md leading-relaxed text-c57-on-surface-variant">
            Sepuluh potret, sepuluh cerita. Momen kecil yang membuat perjalanan
            layak dikenang — diceritakan langsung oleh mereka yang ikut
            berangkat bersama kami sejak 2014.
          </p>
        </motion.div>

        {/* Opening spread — the one photo given the whole width, like a
            magazine feature opener. */}
        <motion.figure
          {...reveal()}
          className="relative mt-12 overflow-hidden rounded-[1.6rem] bg-c57-scrim shadow-c57-overlay md:mt-16"
        >
          <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]">
            <img
              src={FEATURED.image}
              alt={FEATURED.trip}
              className="photo-warm absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-c57-scrim/75 via-c57-scrim/15 to-c57-scrim/5" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </div>

          <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-c57-scrim/45 px-3 py-1.5 font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-on-scrim/80 backdrop-blur-md">
            <Icon name="photo_camera" size="xs" />
            Arsip tamu
          </span>
          <span className="absolute right-5 top-5 rounded-full border border-white/15 bg-c57-scrim/45 px-3 py-1.5 font-label-sm text-label-sm uppercase tracking-[0.16em] tabular-nums text-c57-on-scrim/80 backdrop-blur-md">
            {pad(1)} / {pad(TOTAL)}
          </span>

          <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10">
            <span className="flex items-center gap-3">
              <span className="h-px w-8 bg-c57-accent-line" aria-hidden="true" />
              <span className="font-label-sm text-label-sm uppercase tracking-[0.18em] text-c57-accent-line">
                {FEATURED.trip}
              </span>
            </span>
            <span className="mt-4 block max-w-2xl text-balance font-display text-[clamp(1.5rem,3.2vw,2.5rem)] italic leading-[1.25] text-c57-surface-bright">
              &ldquo;{FEATURED.quote}&rdquo;
            </span>
            <span className="mt-4 block font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-on-scrim/60">
              Dokumentasi tamu · Cakra Lima Tujuh
            </span>
          </figcaption>
        </motion.figure>

        {/* Journal rule — the running head between opener and archive. */}
        <motion.div
          {...reveal(0.05)}
          className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-c57-outline-variant pt-6 md:mt-14"
        >
          <p className="inline-flex items-center gap-2 font-label-sm text-label-sm uppercase tracking-[0.18em] text-c57-on-surface-variant">
            <Icon name="format_quote" size="sm" />
            Jurnal lengkap
          </p>
          <p className="font-label-sm text-label-sm uppercase tracking-[0.18em] tabular-nums text-c57-on-surface-variant">
            {pad(TOTAL)} potret terarsip
          </p>
        </motion.div>

        {/* Masonry journal — photos as the hero, captions kept to the
            metadata strip below each frame. */}
        <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
          {JOURNAL.map((entry, i) => (
            <motion.figure
              key={entry.trip}
              {...reveal(Math.min(i, 4) * 0.06)}
              className="mb-6 break-inside-avoid"
            >
              <div
                className={`group relative overflow-hidden rounded-[1.25rem] bg-c57-surface-container ${entry.aspect}`}
              >
                <img
                  src={entry.image}
                  alt={entry.trip}
                  className="photo-warm h-full w-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </div>
              <figcaption className="mt-4">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-label-sm text-label-sm uppercase tracking-[0.18em] tabular-nums text-c57-on-surface-variant">
                    {pad(i + 2)}
                  </span>
                  <span className="font-display text-[1.25rem] leading-snug text-c57-on-surface">
                    {entry.trip}
                  </span>
                </span>
                <span className="mt-1.5 block text-body-sm leading-relaxed text-c57-on-surface-variant">
                  &ldquo;{entry.quote}&rdquo;
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <motion.div {...reveal()} className="mt-10 flex justify-center">
          <Link
            to="/testimoni"
            className="group inline-flex items-center gap-3 rounded-full border border-c57-on-surface/25 py-2.5 pl-6 pr-3 font-label-sm text-label-sm uppercase tracking-[0.16em] text-c57-on-surface transition-colors hover:border-c57-on-surface hover:bg-c57-primary-container hover:text-c57-on-primary"
          >
            Baca semua cerita
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-c57-accent-line text-c57-scrim transition-transform group-hover:translate-x-0.5">
              <Icon name="north_east" size="xs" />
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
