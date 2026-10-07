import { useEffect, useRef, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc as firestoreDoc, getDoc } from "firebase/firestore";

import { auth, db } from "../services/firebase";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";

/**
 * Fleet visual QC: a period filter, a photo-report list, and the inspection
 * dialog.
 *
 * The Firestore read is unchanged — `vehicleVerifications` ordered by
 * `timestamp` desc, gated on the auth state resolving first.
 *
 * What the read *expects* was wrong. `VehicleVerification.js` writes
 * `type: "before" | "after"` and nothing else identifying beyond `orderId`,
 * but this page was reading `status`, `namaMobil` and `clientEmail`. So every
 * report rendered as post-rental with a blank car name and a blank client, and
 * a `PHASE[verification.status]` lookup was one field rename away from throwing
 * on every row. `phaseOf` now keys off `type` (tolerating the legacy
 * `sebelum`/`sesudah` spelling) and is total, and the car and client are joined
 * from the linked `pemesanan` document so rows written before the writer
 * denormalised those fields still render.
 *
 * The dialog is now the `Modal` primitive rather than a hand-rolled overlay.
 * That is the point of the primitive: this file's version closed on backdrop
 * click but not on ESC, never locked body scroll, and dropped focus on the
 * trigger when it closed. All three now come for free, and so does the focus
 * trap, which the photo grid's links need.
 */

const FILTERS = [
  { id: "all", label: "Semua Verifikasi" },
  { id: "today", label: "Masuk Hari Ini" },
];

/**
 * `before` / `after` drives tone and label in one place. Keyed by the values
 * `VehicleVerification.js` actually writes; the `sebelum` / `sesudah` aliases
 * are the Indonesian spelling the pre-migration UI compared against, kept so an
 * older document still lands on the right tone.
 *
 * Total by construction: an unknown or absent phase falls back to `after`
 * rather than returning undefined. Every caller dereferences the result, and a
 * lookup table that can miss is a crash in a list row.
 */
const PHASE = {
  before: { pill: "neutral", label: "pre-rental", ink: "text-c57-primary" },
  after: { pill: "available", label: "post-rental", ink: "text-c57-available-text" },
};

const PHASE_ALIASES = { sebelum: "before", setelah: "after" };

const phaseOf = (verification) => {
  const raw = verification?.type ?? verification?.status;
  return PHASE[PHASE_ALIASES[raw] || raw] || PHASE.after;
};

export default function AdminVehicleVerifications() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filter, setFilter] = useState("all");
  const [orderMap, setOrderMap] = useState({});

  /**
   * `vehicleVerifications` carries only `orderId`, so the car and client names
   * have to come from the linked `pemesanan` document. Cached in a ref rather
   * than state for the same reason as AdminPaymentVerifications: the snapshot
   * callback closes over the map that existed when the effect ran, so a state
   * cache check would miss every time and re-read every linked order on every
   * snapshot. A ref is the right container for a non-reactive cache, and the
   * linter exempts refs from the dependency array, so this still subscribes
   * once per `user` instead of once per miss.
   */
  const orderMapRef = useRef({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "vehicleVerifications"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const verificationsData = [];
      querySnapshot.forEach((entry) => {
        verificationsData.push({ id: entry.id, ...entry.data() });
      });
      setVerifications(verificationsData);

      const fetched = {};
      await Promise.all(
        verificationsData.map(async (v) => {
          if (!v.orderId || orderMapRef.current[v.orderId]) return;

          try {
            const snap = await getDoc(firestoreDoc(db, "pemesanan", v.orderId));
            if (!snap.exists()) return;
            fetched[v.orderId] = snap.data();
            orderMapRef.current[v.orderId] = snap.data();
          } catch (err) {
            console.error("Error fetching linked order:", v.orderId, err);
          }
        })
      );

      if (Object.keys(fetched).length > 0) {
        setOrderMap((prev) => ({ ...prev, ...fetched }));
      }
    });

    return () => unsubscribe();
  }, [user]);

  /**
   * A verification's own denormalized `namaMobil` / `clientEmail` win when
   * present; otherwise fall back to the linked order. Returns a placeholder
   * rather than an empty string so a row never collapses to a blank column.
   */
  const orderOf = (verification) =>
    orderMap[verification?.orderId] || orderMapRef.current[verification?.orderId] || null;

  const carNameOf = (verification) =>
    verification?.namaMobil || orderOf(verification)?.namaMobil || "Unit tidak dikenal";

  const clientOf = (verification) =>
    verification?.clientEmail ||
    orderOf(verification)?.email ||
    orderOf(verification)?.clientEmail ||
    "\u2014";

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;
    const now = new Date();
    const verificationDate = verification.timestamp?.toDate
      ? verification.timestamp.toDate()
      : new Date(verification.timestamp);
    if (filter === "today") return verificationDate.toDateString() === now.toDateString();
    return true;
  });

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Fleet Quality Control"
          title="Verifikasi Fisik Unit"
          subtitle="Audit dokumentasi visual armada sebelum dan sesudah operasional."
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-gutter mt-space-xl">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-gutter">
            <Card className="p-space-lg">
              <h3 className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-lg flex items-center gap-space-sm">
                <Icon name="filter_list" size="sm" />
                Log Period
              </h3>
              <div className="flex flex-col gap-space-sm">
                {FILTERS.map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(f.id)}
                      className={[
                        "px-space-md py-3 rounded-c57-md text-left font-label-sm text-label-sm uppercase tracking-widest",
                        "transition-all duration-200 focus-visible:outline focus-visible:outline-2",
                        "focus-visible:outline-offset-2 focus-visible:outline-c57-primary",
                        active
                          ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                          : "bg-c57-surface-container-lowest text-c57-on-surface-variant hover:bg-c57-surface-container",
                      ].join(" ")}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card variant="scrim" className="group relative overflow-hidden p-space-lg text-center">
              <div className="relative z-10">
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-primary-fixed-dim mb-1">
                  Total Dokumentasi
                </p>
                <p className="font-headline-lg text-headline-lg text-c57-on-scrim tabular-nums">
                  {verifications.length}
                </p>
              </div>
              <Icon
                name="photo_camera"
                size="3xl"
                className="absolute -right-3 -bottom-3 text-white/10 group-hover:scale-110 transition-transform pointer-events-none"
              />
            </Card>
          </div>

          {/* List */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden h-full flex flex-col">
              <div className="bg-c57-surface-container-low px-space-lg py-space-md border-b border-c57-surface-variant flex items-center justify-between gap-space-md">
                <h2 className="font-label-md text-label-md uppercase tracking-widest text-c57-on-surface">
                  Aset Visual Armada
                </h2>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                  {filteredVerifications.length} Reports
                </span>
              </div>

              <div className="divide-y divide-c57-surface-variant overflow-y-auto max-h-[600px] grow">
                {filteredVerifications.length === 0 ? (
                  <div className="p-space-xl">
                    <EmptyState
                      icon="photo_camera"
                      title="Belum ada verifikasi unit yang tercatat"
                      description="Dokumentasi visual yang diunggah mitra akan muncul di sini."
                    />
                  </div>
                ) : (
                  filteredVerifications.map((v) => (
                    <ReportRow
                      key={v.id}
                      verification={v}
                      formatDate={formatDate}
                      carName={carNameOf(v)}
                      clientEmail={clientOf(v)}
                      onInspect={() => setSelectedVerification(v)}
                    />
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <InspectionModal
        verification={selectedVerification}
        formatDate={formatDate}
        carName={carNameOf(selectedVerification)}
        clientEmail={clientOf(selectedVerification)}
        onClose={() => setSelectedVerification(null)}
      />
    </div>
  );
}

function ReportRow({ verification, formatDate, carName, clientEmail, onInspect }) {
  const phase = phaseOf(verification);

  return (
    <div className="p-space-lg sm:px-space-lg hover:bg-c57-surface-container-low transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex items-center gap-space-lg flex-1 min-w-0">
          <span
            className={[
              "shrink-0 w-14 h-14 rounded-c57-md flex items-center justify-center",
              phase.pill === "neutral"
                ? "bg-c57-surface-container text-c57-primary"
                : "bg-c57-available-bg text-c57-available-text",
            ].join(" ")}
          >
            <Icon name="directions_car" size="2xl" />
          </span>

          <div className="min-w-0">
            <div className="flex items-center gap-space-sm mb-1 flex-wrap">
              <h4 className="font-headline-sm text-headline-sm text-c57-on-surface uppercase">
                {carName}
              </h4>
              <Pill variant={phase.pill}>{phase.label}</Pill>
            </div>
            <p className="text-body-sm text-c57-on-surface-variant">
              Mitra: {verification.driverId} • {formatDate(verification.timestamp)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-lg">
          <div className="text-right hidden sm:block">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              Client Email
            </p>
            <p className="text-body-sm text-c57-on-surface truncate max-w-[150px]">
              {clientEmail}
            </p>
          </div>
          <Button variant="primary" size="sm" icon="visibility" onClick={onInspect}>
            Inspect
          </Button>
        </div>
      </div>
    </div>
  );
}

function InspectionModal({ verification, formatDate, carName, clientEmail, onClose }) {
  const phase = phaseOf(verification);

  return (
    <Modal
      open={Boolean(verification)}
      onClose={onClose}
      size="xl"
      title={
        verification ? `Inspection Detail: ${carName}` : "Inspection Detail"
      }
      subtitle={verification ? `Log #${verification.id.substring(0, 8)}` : undefined}
    >
      {verification && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-xl">
          <div className="space-y-space-lg">
            <Card variant="inset" className="p-space-lg text-center">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-1">
                Status Verifikasi
              </p>
              <p className={`font-headline-sm text-headline-sm ${phase.ink}`}>
                {phase.pill === "neutral" ? "SEBELUM RENTAL" : "SETELAH RENTAL"}
              </p>
            </Card>

            <div className="space-y-space-sm">
              {[
                { label: "Pengemudi", val: verification.driverId },
                { label: "Pelanggan", val: clientEmail },
                { label: "Waktu Input", val: formatDate(verification.timestamp) },
                { label: "Order ID", val: verification.orderId },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between items-start gap-space-md py-3 border-b border-c57-surface-variant last:border-0"
                >
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant shrink-0">
                    {item.label}
                  </span>
                  <span className="text-body-sm text-c57-on-surface text-right break-all">
                    {item.val}
                  </span>
                </div>
              ))}
            </div>

            {verification.notes && (
              <div className="p-space-md bg-c57-tertiary-container/10 border-l-2 border-c57-accent-line rounded-c57-md">
                <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-tertiary mb-2 italic">
                  Remark Driver:
                </p>
                <p className="text-body-md text-c57-on-surface italic leading-relaxed">
                  &ldquo;{verification.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-lg px-1">
              Visual Evidence ({verification.photos?.length || 0})
            </p>
            {verification.photos && verification.photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {verification.photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-c57-md overflow-hidden aspect-video border border-c57-surface-variant bg-c57-surface-container-low shadow-c57-card"
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-editorial"
                        alt="Evidence"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-c57-outline">
                        <Icon name="image_not_supported" size="2xl" className="mb-2" />
                        <p className="font-label-sm text-label-sm uppercase tracking-widest">
                          Image Unavailable
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-c57-scrim/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-c57-surface-container-lowest text-c57-on-surface px-space-md py-2.5 rounded-c57-md font-label-sm text-label-sm uppercase tracking-widest shadow-c57-overlay"
                      >
                        Full View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-c57-lg border-2 border-dashed border-c57-outline-variant py-32 flex flex-col items-center justify-center text-c57-outline">
                <Icon name="photo_camera" size="3xl" className="mb-space-md" />
                <p className="font-label-sm text-label-sm uppercase tracking-widest">
                  No Photos Recorded
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
