import React, { useEffect, useState } from "react";
import { collection, orderBy, onSnapshot, query } from "firebase/firestore";

import { db } from "../services/firebase";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import Pill from "../components/ui/Pill";
import SectionHeading from "../components/ui/SectionHeading";
import { PageHeaderSkeleton, PackageSkeleton } from "../components/SkeletonLoader";
import {
  ConciergeDesk,
  OpenTripCard,
  PrivateJourneyCard,
  ServicePillars,
  TourFilterBar,
  TourHero,
} from "../components/TourPackagesSections";
import {
  CATEGORIES,
  OPEN_TRIP_SECTION,
  PRIVATE_JOURNEYS,
  PRIVATE_SECTION,
  WHATSAPP_NUMBER,
  filterOpenTrips,
} from "../data/tourCatalogue";

const SEMUA = CATEGORIES[0];
const OPEN_TRIP = CATEGORIES[1];
const PRIVAT = CATEGORIES[2];
const BESPOKE = CATEGORIES[3];

/**
 * Public tour-package page, in two halves.
 *
 * The upper half is the curated catalogue transcribed from the design in
 * `stitch_cakra57_travel_web_redesign/`, rendered by `TourPackagesSections` from
 * `src/data/tourCatalogue.js`. Its copy, prices and dates are mockup figures
 * pending commercial sign-off, and `src/__tests__/tourCatalogue.test.js` fails
 * loudly if any of them drifts from the design or if the known-stale 2025
 * figures are quietly dropped.
 *
 * The lower half is the admin-managed CMS catalogue, unchanged: the
 * `paket_wisata` collection ordered by `timestamp` desc, with `judul`,
 * `destinasi`, `durasi`, `harga`, `description` and `imageUrl`. Booking is
 * still a WhatsApp deep link rather than a form, so it stays commission-free.
 */
export default function TourPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Category tabs apply immediately; the select panel is staged and applied on
  // submit, matching the design's "Tampilkan Jadwal" control.
  const [category, setCategory] = useState(SEMUA);
  const [filters, setFilters] = useState({
    region: "all",
    period: "all",
    budget: "all",
  });

  useEffect(() => {
    const q = query(
      collection(db, "paket_wisata"),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPackages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  /* One predicate per section, all derived from the same `category` value, so a
     tab can only ever *hide* a section — it can never leave a section on screen
     with nothing in it. Previously `openTrips` collapsed to `[]` on a non-open
     -trip tab while the section itself stayed mounted, which rendered the
     "no trips match" panel next to a perfectly healthy private-journeys grid. */
  const showOpenTrips = category === SEMUA || category === OPEN_TRIP;
  const showPrivate = category === SEMUA || category === PRIVAT;
  const showBespoke = category === SEMUA || category === BESPOKE;
  /* The CMS catalogue is not one of the four tabs — it is the general package
     catalogue. Under "Semua Kategori" it belongs at the foot of the page; under
     a narrower tab it would contradict the tab the reader just chose. */
  const showCms = category === SEMUA;

  const openTrips = showOpenTrips ? filterOpenTrips(filters) : [];

  const handleBooking = (pkg) => {
    const message = `Halo Cakra Lima Tujuh, saya tertarik dengan Paket Wisata: ${pkg.judul}. Boleh minta informasi lebih lanjut?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low px-gutter-mobile pb-16 pt-30 sm:px-gutter">
        <div className="mx-auto max-w-7xl">
          <PageHeaderSkeleton />
          <div className="mt-space-xl grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <PackageSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low px-gutter-mobile pb-16 pt-30 sm:px-gutter">
      <div className="mx-auto max-w-7xl">
        <TourHero />

        <TourFilterBar
          category={category}
          onCategoryChange={setCategory}
          filters={filters}
          onApply={setFilters}
        />

        {showOpenTrips && (
          <section className="mt-space-2xl md:mt-space-3xl" aria-label={OPEN_TRIP_SECTION.title}>
            <SectionHeading
              eyebrow={OPEN_TRIP_SECTION.eyebrow}
              title={OPEN_TRIP_SECTION.title}
              description={OPEN_TRIP_SECTION.lead}
            />
            {openTrips.length > 0 ? (
              <div className="mt-space-xl grid gap-gutter md:grid-cols-2 lg:grid-cols-4">
                {openTrips.map((trip, idx) => (
                  <OpenTripCard key={trip.id} trip={trip} index={idx} />
                ))}
              </div>
            ) : (
              <NoResults />
            )}
            <p className="mt-space-lg font-label-sm uppercase tracking-editorial text-c57-on-surface-variant">
              {OPEN_TRIP_SECTION.meta}
            </p>
          </section>
        )}

        {showPrivate && (
          <section className="mt-space-2xl md:mt-space-3xl" aria-label={PRIVATE_SECTION.title}>
            <SectionHeading
              eyebrow={PRIVATE_SECTION.eyebrow}
              title={PRIVATE_SECTION.title}
              description={PRIVATE_SECTION.lead}
            />
            <div className="mt-space-xl grid gap-gutter md:grid-cols-2 lg:grid-cols-3">
              {PRIVATE_JOURNEYS.map((journey, idx) => (
                <PrivateJourneyCard
                  key={journey.id}
                  journey={journey}
                  index={idx}
                />
              ))}
            </div>
          </section>
        )}

        {showBespoke && <ServicePillars />}
        {showBespoke && <ConciergeDesk />}

        {showCms && (
          <CmsCatalogue
            packages={packages}
            onDetail={setSelectedPackage}
            onBook={handleBooking}
          />
        )}
      </div>

      <PackageModal
        pkg={selectedPackage}
        onClose={() => setSelectedPackage(null)}
        onBook={() => {
          handleBooking(selectedPackage);
          setSelectedPackage(null);
        }}
      />
    </div>
  );
}

/**
 * A filter combination that matches nothing is a legitimate answer, not an
 * error, so it gets a way out rather than a blank grid.
 */
function NoResults() {
  return (
    <Card variant="inset" className="p-space-xl text-center">
      <Icon
        name="info"
        size="2xl"
        className="mx-auto text-c57-on-surface-variant"
      />
      <p className="mt-space-md text-body-md text-c57-on-surface-variant">
        Tidak ada perjalanan yang cocok dengan filter tersebut. Longgarkan salah
        satu filter atau hubungi concierge kami untuk itinerary khusus.
      </p>
    </Card>
  );
}

/**
 * The admin-managed catalogue. Kept below the curated sections rather than
 * merged into them: it is CMS content with its own fields and its own
 * lifecycle, and folding it into the design's card shapes would make the admin
 * form responsible for a layout it does not know about.
 */
function CmsCatalogue({ packages, onDetail, onBook }) {
  return (
    <section className="mt-space-2xl md:mt-space-3xl" aria-label="Katalog paket wisata">
      {/* The "harga sudah termasuk driver" line used to sit here as a floating
          `outline` pill under a bare heading, reading as a leftover filter chip.
          It is a statement about pricing, so it belongs in the description. */}
      <SectionHeading
        title="Katalog Paket Wisata"
        description="Harga sudah termasuk driver profesional."
      />

      {packages.length > 0 ? (
        <div className="mt-space-lg grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, idx) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              index={idx}
              onDetail={() => onDetail(pkg)}
              onBook={() => onBook(pkg)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-space-lg">
          {/* `border-solid` overrides EmptyState's dashed perimeter: an empty
              catalogue should still read as a section, not a placeholder. */}
          <EmptyState
            icon="map"
            title="Belum ada Paket Wisata"
            description="Kami sedang menyiapkan petualangan seru untuk Anda. Nantikan penawaran menarik dari kami segera!"
            action="Tanyakan Jadwal Wisata"
            actionHref={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
              "Halo Cakra Lima Tujuh, apakah ada paket wisata yang tersedia?"
            )}`}
            actionIcon="send"
            className="border-solid"
          />
        </div>
      )}
    </section>
  );
}

function PackageCard({ pkg, index, onDetail, onBook }) {
  /* `interactive` sets cursor-pointer and a hover shadow, which promises the
     whole card is clickable. It is: the card body opens the same detail modal
     as the "Detail" button, so the promise is kept. The action row is excluded
     from the keyboard handler so the inner buttons stay the single tab stop for
     each action rather than adding a third, duplicate one. */
  const openDetail = () => onDetail();

  return (
    <Card
      interactive
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Lihat detail ${pkg.judul}`}
      className="group flex flex-col overflow-hidden animate-fadeInUp focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="relative h-56 md:h-64 overflow-hidden">
        <img
          src={pkg.imageUrl}
          alt={pkg.judul}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/80 via-transparent to-transparent" />
        <div className="absolute top-space-md left-space-md">
          <Pill variant="onScrim" icon="schedule">
            {pkg.durasi}
          </Pill>
        </div>
        {pkg.description && (
          <p className="absolute bottom-space-md left-space-md right-space-md text-label-sm text-c57-on-scrim/80 line-clamp-2 translate-y-2 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            {pkg.description}
          </p>
        )}
      </div>

      <div className="p-space-lg flex flex-col grow">
        <div className="flex items-center gap-space-xs mb-space-sm">
          <Icon name="place" size="sm" className="text-c57-on-surface-variant" />
          <span className="text-label-sm uppercase tracking-wider text-c57-on-surface-variant">
            {pkg.destinasi}
          </span>
        </div>

        <h2 className="font-headline-sm text-headline-sm text-c57-on-surface group-hover:text-c57-primary transition-colors duration-300">
          {pkg.judul}
        </h2>

        <div className="flex items-center justify-between py-space-md border-t border-c57-surface-variant mt-space-md">
          <span className="text-label-sm uppercase tracking-wider text-c57-on-surface-variant">
            Mulai Dari
          </span>
          <p className="font-headline-sm text-headline-sm text-c57-on-surface">
            Rp {pkg.harga?.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="flex gap-space-sm mt-auto pt-space-md">
          <Button variant="secondary" size="md" onClick={onDetail} className="grow">
            Detail
          </Button>
          <Button variant="primary" size="md" onClick={onBook} className="grow" icon="send">
            Tanya Detail
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * The `description` field doubles as the facility list: admins write numbered
 * lines ("1. Mobil AC\n2. Tour guide"), so split on the lookahead rather than
 * stripping markup, and fall back to the raw string when unnumbered.
 */
function splitFacilities(description) {
  const desc = description || "";
  const parts = desc
    .split(/(?=\d+\.\s)/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [desc];
}

function PackageModal({ pkg, onClose, onBook }) {
  return (
    <Modal
      open={Boolean(pkg)}
      onClose={onClose}
      title={pkg?.judul}
      subtitle={pkg?.destinasi}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-space-md">
          <div>
            <p className="text-label-sm uppercase tracking-wider text-c57-on-surface-variant">
              Harga Mulai Dari
            </p>
            <p className="font-headline-sm text-headline-sm text-c57-on-surface">
              Rp {pkg?.harga?.toLocaleString("id-ID")}
            </p>
          </div>
          <Button variant="primary" size="md" onClick={onBook} icon="send">
            Tanya Detail
          </Button>
        </div>
      }
    >
      {pkg && (
        <div>
          <div className="relative h-48 w-full rounded-c57-md overflow-hidden mb-space-lg">
            <img
              src={pkg.imageUrl}
              alt={pkg.judul}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-c57-scrim/70 via-transparent to-transparent" />
            <div className="absolute bottom-space-sm left-space-sm">
              <Pill variant="onScrim" icon="schedule">
                {pkg.durasi}
              </Pill>
            </div>
          </div>

          {pkg.description && (
            <section>
              <h3 className="text-label-md uppercase tracking-wider text-c57-on-surface-variant mb-space-sm">
                Fasilitas Paket
              </h3>
              <ul className="bg-c57-surface-container rounded-c57-md p-space-md space-y-space-xs max-h-60 overflow-y-auto">
                {splitFacilities(pkg.description).map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-space-sm text-body-sm text-c57-on-surface-variant"
                  >
                    <Icon
                      name="check"
                      size="sm"
                      className="mt-space-xs text-c57-primary shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
