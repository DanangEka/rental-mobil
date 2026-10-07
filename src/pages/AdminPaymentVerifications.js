import { useEffect, useRef, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot, doc as firestoreDoc, getDoc } from "firebase/firestore";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";

/**
 * Cash-deposit audit for driver settlements.
 *
 * The Firestore contract is untouched: `paymentVerifications` ordered by
 * `timestamp` desc behind the auth gate, plus the per-`orderId` `pemesanan`
 * reads that fill in `dpAmount` / `totalAmount` for the audit dialog. The
 * fallback chain for the client's down payment — verification field, then
 * linked order, then half of `totalAmount`, then half of `perkiraanHarga` — is
 * preserved exactly, because it is the number finance reconciles against.
 *
 * The dialog is now the `Modal` primitive. The hand-rolled version it replaced
 * closed on backdrop click only, so a keyboard user could not dismiss it and
 * body scroll was never locked.
 */

const FILTERS = [
  { id: "all", label: "Semua Laporan" },
  { id: "pending", label: "Menunggu Approval" },
  { id: "approved", label: "Disetujui" },
  { id: "rejected", label: "Ditolak" },
  { id: "today", label: "Hari Ini" },
];

/**
 * `approved` / `pending` / `rejected` -> one pill each. The old markup branched
 * on emerald/amber/red in four separate places, including an eight-pixel label
 * that a Pill with the 11px floor replaces.
 */
const STATUS_PILL = {
  approved: { variant: "available", icon: "check_circle" },
  rejected: { variant: "danger", icon: "cancel" },
  pending: { variant: "sand", icon: "hourglass_top" },
};

const statusPill = (status) => STATUS_PILL[status] || STATUS_PILL.pending;

export default function AdminPaymentVerifications() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filter, setFilter] = useState("all");
  const [orderDataMap, setOrderDataMap] = useState({});

  /**
   * Mirror of `orderDataMap` for reads inside the onSnapshot callback.
   *
   * The snapshot callback closes over the `orderDataMap` that existed when the
   * effect ran, not the one being built now, so the `!orderDataMap[v.orderId]`
   * cache check below was reading a permanently-empty object and re-fetching
   * every linked pemesanan document on every snapshot. A ref is the right
   * container because it is a cache lookup, not reactive state: the rule
   * ignores refs in the dependency array, so the effect still subscribes once
   * per `user` rather than once per cache miss.
   */
  const orderDataMapRef = useRef({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "paymentVerifications"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const verificationsData = [];
      querySnapshot.forEach((docSnap) => {
        verificationsData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setVerifications(verificationsData);

      // Fetch linked pemesanan documents to get dpAmount & totalAmount
      const newOrderDataMap = {};
      const fetchPromises = verificationsData.map(async (v) => {
        if (v.orderId && !orderDataMapRef.current[v.orderId]) {
          try {
            const orderDoc = await getDoc(firestoreDoc(db, "pemesanan", v.orderId));
            if (orderDoc.exists()) {
              newOrderDataMap[v.orderId] = orderDoc.data();
              orderDataMapRef.current[v.orderId] = orderDoc.data();
            }
          } catch (err) {
            console.error("Error fetching order:", v.orderId, err);
          }
        }
      });
      await Promise.all(fetchPromises);
      if (Object.keys(newOrderDataMap).length > 0) {
        setOrderDataMap(prev => ({ ...prev, ...newOrderDataMap }));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;
    if (["pending", "approved", "rejected"].includes(filter)) {
      return verification.status === filter;
    }
    const now = new Date();
    const verificationDate = verification.timestamp?.toDate ? verification.timestamp.toDate() : new Date(verification.timestamp);
    if (filter === "today") return verificationDate.toDateString() === now.toDateString();
    return true;
  });

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  // Mirrors the original four-term fallback. Kept as a function so the audit
  // dialog and any future summary read the same reconciliation figure.
  const resolveDownPayment = (verification) =>
    verification.dpAmount
    || orderDataMap[verification.orderId]?.dpAmount
    || (verification.totalAmount ? verification.totalAmount * 0.5 : 0)
    || ((orderDataMap[verification.orderId]?.perkiraanHarga || 0) * 0.5);

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Financial Logistics"
          title="Verifikasi Pembayaran"
          subtitle="Audit setoran tunai dari mitra pengemudi untuk validasi harian."
        />

        <div className="grid grid-cols-1 gap-space-xl lg:grid-cols-4 mt-space-xl">
          <div className="space-y-space-lg">
            <Card variant="inset" className="p-space-lg sm:p-space-xl">
              <h3 className="flex items-center gap-space-sm font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-lg">
                <Icon name="filter_list" size="sm" />
                Log Filter
              </h3>

              <div className="flex flex-col gap-space-sm" role="group" aria-label="Filter log pembayaran">
                {FILTERS.map((f) => {
                  const active = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      aria-pressed={active}
                      className={[
                        "rounded-full px-space-md py-2.5 text-left font-label-sm uppercase tracking-widest",
                        "transition-colors duration-300 ease-editorial",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary",
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

            <PendingPanel count={pendingCount} />
          </div>

          <div className="lg:col-span-3">
            <Card className="h-full overflow-hidden">
              <div className="flex items-center justify-between gap-space-md border-b border-c57-surface-variant bg-c57-surface-container px-space-lg py-space-md">
                <h2 className="font-label-md uppercase tracking-widest text-c57-on-surface">
                  Daftar Setoran
                </h2>
                <Pill variant="outline">{filteredVerifications.length} Entri</Pill>
              </div>

              <div className="divide-y divide-c57-surface-variant overflow-y-auto max-h-[600px]">
                {filteredVerifications.length === 0 ? (
                  <EmptyState
                    icon="description"
                    title="Tidak ada log pembayaran"
                    description="Belum ada setoran tunai yang cocok dengan filter ini."
                    className="m-space-lg border-0 bg-transparent py-space-xl"
                  />
                ) : (
                  filteredVerifications.map((v) => {
                    const pill = statusPill(v.status);
                    return (
                      <div
                        key={v.id}
                        className="p-space-lg transition-colors hover:bg-c57-surface-container-low"
                      >
                        <div className="flex flex-col gap-space-md md:flex-row md:items-center md:justify-between">
                          <div className="flex flex-1 items-center gap-space-md">
                            <span
                              className={[
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-c57-md",
                                v.status === "approved"
                                  ? "bg-c57-available-bg text-c57-available-text"
                                  : "bg-c57-tertiary-container text-c57-on-tertiary-container",
                              ].join(" ")}
                              aria-hidden="true"
                            >
                              <Icon name="credit_card" size="2xl" />
                            </span>

                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-space-sm">
                                <h4 className="font-headline-sm text-body-lg text-c57-on-surface tabular-nums">
                                  {formatCurrency(v.amount)}
                                </h4>
                                <Pill variant={pill.variant} icon={pill.icon}>
                                  {v.status}
                                </Pill>
                              </div>
                              <p className="text-body-sm text-c57-on-surface-variant">
                                Driver: {v.driverId} &bull; {formatDate(v.timestamp)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-space-md">
                            <div className="hidden text-right sm:block">
                              <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                                Order ID
                              </p>
                              <p className="font-mono text-body-sm text-c57-on-surface">
                                #{v.orderId?.substring(0, 8)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setSelectedVerification(v)}
                            >
                              Detail
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={!!selectedVerification}
        onClose={() => setSelectedVerification(null)}
        title="Audit Transaksi"
        subtitle={
          selectedVerification
            ? `Report #${selectedVerification.id.substring(0, 8)}`
            : undefined
        }
        size="lg"
      >
        {selectedVerification && (
          <div className="grid grid-cols-1 gap-space-xl md:grid-cols-2">
            <div className="space-y-space-lg">
              <div className="grid grid-cols-2 gap-space-md">
                <div className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                  <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-2">
                    DP Diterima (Client)
                  </p>
                  <p className="font-headline-sm text-headline-sm text-c57-available-text tabular-nums">
                    {formatCurrency(resolveDownPayment(selectedVerification))}
                  </p>
                </div>

                <div className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                  <p className="font-label-sm uppercase tracking-widest text-c57-primary mb-2">
                    Pelunasan (Driver)
                  </p>
                  <p className="font-headline-sm text-headline-sm text-c57-primary tabular-nums">
                    {formatCurrency(selectedVerification.amount || 0)}
                  </p>
                </div>
              </div>

              <dl className="space-y-space-sm">
                <AuditRow label="Driver ID" value={selectedVerification.driverId} />
                <AuditRow
                  label="Waktu Setor"
                  value={formatDate(selectedVerification.timestamp)}
                  emphasis
                />
                <AuditRow
                  label="Metode Pembayaran"
                  value={
                    selectedVerification.method
                    || selectedVerification.paymentMethod
                    || "Tunai (Cash)"
                  }
                  emphasis
                />
              </dl>

              {selectedVerification.notes && (
                <blockquote className="rounded-c57-md border border-c57-error-container bg-c57-error-container/40 p-space-md">
                  <p className="font-label-sm uppercase tracking-widest text-c57-on-error-container mb-1">
                    Catatan Driver
                  </p>
                  <p className="text-body-md text-c57-on-surface italic">
                    &ldquo;{selectedVerification.notes}&rdquo;
                  </p>
                </blockquote>
              )}
            </div>

            <div>
              <p className="font-label-md uppercase tracking-widest text-c57-on-surface-variant mb-space-md">
                Lampiran Bukti
              </p>
              {selectedVerification.paymentProof ? (
                <div className="group relative aspect-[3/4] overflow-hidden rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container">
                  <img
                    src={selectedVerification.paymentProof}
                    alt="Bukti pembayaran"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-c57-scrim/50 p-space-md opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                      as="a"
                      href={selectedVerification.paymentProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      icon="open_in_new"
                    >
                      Buka Gambar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-80 flex-col items-center justify-center rounded-c57-lg border-2 border-dashed border-c57-outline-variant bg-c57-surface-container-low text-c57-outline">
                  <Icon name="description" size="3xl" className="mb-space-md" />
                  <p className="font-label-sm uppercase tracking-widest">No Image Provided</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * The one crimson panel on the page: how many deposits are still waiting. Kept
 * out of `StatCard` because that primitive pins its own label and value colours
 * for use on a light surface, and a crimson fill needs the on-primary pair.
 */
function PendingPanel({ count }) {
  return (
    <div className="relative overflow-hidden rounded-c57-lg bg-c57-primary-container p-space-lg text-c57-on-primary shadow-c57-card sm:p-space-xl">
      <div className="relative z-10">
        <p className="font-label-sm uppercase tracking-widest text-c57-on-primary/70">
          Menunggu Review
        </p>
        <p className="mt-1 font-headline-lg text-headline-lg text-c57-on-primary tabular-nums">
          {count}
        </p>
        <p className="mt-space-sm text-body-sm text-c57-on-primary/70">
          Setoran perlu diverifikasi sebelum masuk ke pembukuan harian.
        </p>
      </div>
      <span
        className="pointer-events-none absolute -bottom-4 -right-4 text-c57-on-primary/10"
        aria-hidden="true"
      >
        <Icon name="hourglass_top" size={96} />
      </span>
    </div>
  );
}

/** One label/value pair in the audit dialog. `emphasis` marks the operative figure. */
function AuditRow({ label, value, emphasis = false }) {
  return (
    <div className="flex items-center justify-between gap-space-md border-b border-c57-surface-variant py-2">
      <dt className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
        {label}
      </dt>
      <dd
        className={
          emphasis
            ? "text-body-md text-c57-on-surface"
            : "text-body-sm text-c57-on-surface-variant"
        }
      >
        {value}
      </dd>
    </div>
  );
}
