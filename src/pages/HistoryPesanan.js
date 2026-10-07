import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { useToast } from "../components/Toast";
import { uploadImage, validateImageFile } from "../utils/uploadImage";
import { auth, db } from "../services/firebase";
import { releaseVehicle } from "../services/bookingService";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";
import StatCard from "../components/ui/StatCard";
import InvoiceGenerator from "../components/InvoiceGenerator";

/**
 * Client order history.
 *
 * The Firestore contract is unchanged and is the reason this page exists in
 * its current shape: one live `onSnapshot` on `pemesanan` filtered by `uid`
 * and ordered by `tanggal`. Nothing here mutates the document shape —
 *
 *   payment  → { paymentMethod, paymentStatus, waktuUpload, paymentProof?, dpAmount? }
 *   paymentStatus is "submitted" for Transfer Bank / E-Wallet, "cash_submitted"
 *   for a cash booking that was not approved as cash, and "dp_cash_submitted"
 *   for a cash booking whose status is "disetujui_cash".
 *   cancel   → pemesanan.status = "dibatalkan" plus the vehicle released back
 *   to { tersedia: true, status: "normal" }.
 *
 * The DP floor (50%) and the two notification writes — one to the client, one
 * to "admin" — are also preserved verbatim. `alert()` was the only thing that
 * changed shape: it became a toast, because a modal-blocking native dialog on
 * top of a modal is the one interaction the redesign must not preserve.
 */

const PAYMENT_METHODS = ["Transfer Bank", "E-Wallet", "Cash"];

const BANK_DETAILS = { label: "Bank BCA", account: "123456789 (Cakra)" };
const EWALLET_DETAILS = { label: "DANA / OVO", account: "08123456789 (Cakra)" };

/**
 * Display metadata for the raw `pemesanan.status` values. Unknown statuses
 * fall through to the raw string rather than disappearing, so a status added
 * on the admin side tomorrow is visible today.
 */
const STATUS_META = {
  diproses: { label: "Diproses", variant: "sand" },
  disetujui: { label: "Disetujui", variant: "available" },
  disetujui_cash: { label: "Disetujui Tunai", variant: "available" },
  "menunggu pembayaran": { label: "Menunggu Pembayaran", variant: "sand" },
  "pembayaran berhasil": { label: "Pembayaran Berhasil", variant: "available" },
  lunas: { label: "Lunas", variant: "signature" },
  selesai: { label: "Selesai", variant: "neutral" },
  ditolak: { label: "Ditolak", variant: "danger" },
  dibatalkan: { label: "Dibatalkan", variant: "outline" },
};

const CLOSED_STATUSES = ["selesai", "lunas", "dibatalkan", "ditolak"];
const INVOICE_STATUSES = ["pembayaran berhasil", "lunas", "selesai"];
const SETTLED_STATUSES = ["pembayaran berhasil", "lunas", "selesai"];

const rupiah = (value) => `Rp ${(Number(value) || 0).toLocaleString("id-ID")}`;

/** `tanggal` arrives as an ISO string on some writes and a Timestamp on others. */
const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "-";
  return `${date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} • ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
};

const period = (order) => {
  const start = formatDate(order.tanggalMulai);
  const end = formatDate(order.tanggalSelesai);
  return start === end ? start : `${start} – ${end}`;
};

export default function HistoryPesanan() {
  const toast = useToast();

  const [pemesanan, setPemesanan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [cancelModal, setCancelModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceType, setServiceType] = useState("all");

  const [paymentForm, setPaymentForm] = useState({
    method: "",
    proof: null,
    dpAmount: "",
  });

  const pickProof = (event) => {
    const file = event.target.files[0];
    const problem = file && validateImageFile(file, "proof");
    if (problem) {
      toast.warning(problem, "File ditolak");
      event.target.value = "";
      return;
    }
    setPaymentForm((prev) => ({ ...prev, proof: file || null }));
  };

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLoading(false);
        setPemesanan([]);
        return;
      }

      const q = query(
        collection(db, "pemesanan"),
        where("uid", "==", user.uid),
        orderBy("tanggal", "desc")
      );

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          setPemesanan(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
          setLoading(false);
          setRefreshing(false);
          setLoadError(false);
        },
        (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
          setRefreshing(false);
          setLoadError(true);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const serviceTypes = useMemo(() => {
    const counts = new Map();
    pemesanan.forEach((order) => {
      const type = (order.rentalType || "").trim();
      if (type) counts.set(type, (counts.get(type) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [pemesanan]);

  const filteredPemesanan = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = [...pemesanan];

    if (filterStatus !== "all") {
      filtered =
        filterStatus === "ongoing"
          ? filtered.filter((order) => !CLOSED_STATUSES.includes(order.status))
          : filtered.filter((order) => order.status === filterStatus);
    }

    if (serviceType !== "all") {
      filtered = filtered.filter(
        (order) => (order.rentalType || "").toLowerCase() === serviceType.toLowerCase()
      );
    }

    if (term) {
      filtered = filtered.filter(
        (order) =>
          order.namaMobil?.toLowerCase().includes(term) ||
          order.id.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (toDate(a.tanggal) || 0) - (toDate(b.tanggal) || 0);
        case "price-high":
          return (b.perkiraanHarga || 0) - (a.perkiraanHarga || 0);
        case "price-low":
          return (a.perkiraanHarga || 0) - (b.perkiraanHarga || 0);
        case "newest":
        default:
          return (toDate(b.tanggal) || 0) - (toDate(a.tanggal) || 0);
      }
    });

    return filtered;
  }, [pemesanan, filterStatus, serviceType, searchTerm, sortBy]);

  const totals = useMemo(() => {
    const ongoing = pemesanan.filter((order) => !CLOSED_STATUSES.includes(order.status)).length;
    const settled = pemesanan.filter((order) => SETTLED_STATUSES.includes(order.status));
    return {
      total: pemesanan.length,
      ongoing,
      settled: settled.length,
      settledValue: settled.reduce((sum, order) => sum + (Number(order.perkiraanHarga) || 0), 0),
      invoices: pemesanan.filter((order) => INVOICE_STATUSES.includes(order.status)).length,
    };
  }, [pemesanan]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const addNotification = async (message, userId = auth.currentUser.uid) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        message,
        timestamp: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const closePayment = () => {
    setPaymentModal(false);
    setPaymentForm({ method: "", proof: null, dpAmount: "" });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrder) return;

    if (!paymentForm.method) {
      toast.warning("Pilih metode pembayaran terlebih dahulu.");
      return;
    }

    const isCash = paymentForm.method === "Cash";
    const needsProof = !isCash;

    if (needsProof && !paymentForm.proof) {
      toast.warning("Unggah bukti transfer sebelum mengirim.");
      return;
    }

    const dpFloor = selectedOrder.perkiraanHarga * 0.5;

    // Transfer Bank & E-Wallet: the DP floor is 50% of the estimate.
    if (paymentForm.method === "Transfer Bank" || paymentForm.method === "E-Wallet") {
      if (!paymentForm.dpAmount) {
        toast.warning("Masukkan nominal DP yang Anda bayarkan.");
        return;
      }
      if (parseFloat(paymentForm.dpAmount) < dpFloor) {
        toast.warning(`Nominal DP minimal adalah 50% (${rupiah(dpFloor)}).`);
        return;
      }
    }

    if (isCash && selectedOrder.status === "disetujui_cash" && !paymentForm.dpAmount) {
      toast.warning("Masukkan nominal DP yang akan Anda setor.");
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl = null;
      if (needsProof) {
        proofUrl = await uploadImage(paymentForm.proof, { limit: "proof" });
      }

      const updateData = {
        paymentMethod: paymentForm.method,
        paymentStatus: isCash
          ? selectedOrder.status === "disetujui_cash"
            ? "dp_cash_submitted"
            : "cash_submitted"
          : "submitted",
        waktuUpload: new Date().toISOString(),
      };

      if (proofUrl) updateData.paymentProof = proofUrl;
      if (paymentForm.dpAmount) updateData.dpAmount = parseFloat(paymentForm.dpAmount);

      await updateDoc(doc(db, "pemesanan", selectedOrder.id), updateData);

      addNotification(`Bukti pembayaran ${selectedOrder.namaMobil} berhasil dikirim`);
      addNotification(`Permintaan pembayaran dari ${auth.currentUser.email}`, "admin");

      closePayment();
      toast.success("Pembayaran berhasil diajukan", "Menunggu verifikasi admin.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim data pembayaran.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), { status: "dibatalkan" });
      await releaseVehicle(selectedOrder.mobilId, selectedOrder.id);
      setCancelModal(false);
      toast.success("Pesanan berhasil dibatalkan");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membatalkan pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setFilterStatus("all");
    setSortBy("newest");
    setSearchTerm("");
    setServiceType("all");
  };

  if (loading) {
    return (
      <div
        className="min-h-screen bg-c57-surface-container-low pt-30 pb-16 px-gutter-mobile sm:px-gutter"
        role="status"
        aria-label="Memuat riwayat pesanan"
      >
        <div className="w-full max-w-6xl mx-auto space-y-space-lg">
          <div className="h-14 w-1/2 bg-c57-surface-container rounded-c57-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-c57-lg bg-c57-surface-container animate-pulse" />
            ))}
          </div>
          <div className="h-24 rounded-c57-lg bg-c57-surface-container animate-pulse" />
          {[1, 2].map((i) => (
            <div key={i} className="h-72 rounded-c57-lg bg-c57-surface-container animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-16 px-gutter-mobile sm:px-gutter">
      <div className="w-full max-w-6xl mx-auto space-y-space-lg">
        <PageHeader
          eyebrow="Log Perjalanan Anda"
          title="History Pesanan"
          subtitle="Pantau status reservasi armada, jadwal keberangkatan, dan unduh dokumen invoice perjalanan Anda secara transparan bersama Cakra Lima Tujuh."
          actions={
            <Button
              variant="secondary"
              size="md"
              icon="sync"
              onClick={handleRefresh}
              loading={refreshing}
            >
              Refresh Data
            </Button>
          }
        />

        {loadError ? (
          <EmptyState
            icon="info"
            title="Riwayat Tidak Dapat Dimuat"
            description="Koneksi ke database pesanan terputus. Periksa jaringan Anda lalu muat ulang halaman ini."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Reservasi" value={totals.total} unit="Perjalanan" icon="directions_car" />
              <StatCard label="Sedang Berjalan" value={totals.ongoing} unit="Aktif" icon="calendar_month" />
              <StatCard label="Total Akumulasi" value={rupiah(totals.settledValue)} icon="account_balance_wallet" />
              <StatCard label="Dokumen Tersedia" value={totals.invoices} unit="Invoice" icon="receipt_long" />
            </div>

            <Card variant="inset" className="p-space-md lg:p-space-lg space-y-space-md">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-space-sm">
                <div className="flex-1">
                  <Input
                    icon="search"
                    label="Cari mobil"
                    placeholder="Cari nama mobil atau nomor pesanan..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm lg:w-auto">
                  <Select
                    label="Filter status"
                    value={filterStatus}
                    onChange={(event) => setFilterStatus(event.target.value)}
                    className="lg:w-48"
                  >
                    <option value="all">Semua Status</option>
                    <option value="ongoing">Berjalan</option>
                    <option value="lunas">Lunas</option>
                    <option value="selesai">Selesai</option>
                  </Select>
                  <Select
                    label="Urutkan pesanan"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="lg:w-48"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                    <option value="price-high">Biaya Tertinggi</option>
                  </Select>
                </div>
              </div>

              {serviceTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-space-xs pt-1">
                  <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mr-1">
                    Tipe Layanan:
                  </span>
                  {[
                    ["all", "Semua", pemesanan.length],
                    ...serviceTypes.map(([type, count]) => [type, type, count]),
                  ].map(([value, label, count]) => {
                    const active = serviceType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setServiceType(value)}
                        className={[
                          "px-3.5 py-1.5 rounded-full font-label-sm uppercase tracking-wider",
                          "transition-colors duration-200",
                          active
                            ? "bg-c57-primary-container text-c57-on-primary"
                            : "bg-c57-surface-container text-c57-on-surface-variant hover:text-c57-on-surface",
                        ].join(" ")}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {pemesanan.length === 0 ? (
              <EmptyState
                icon="history"
                title="Belum Ada Pesanan"
                description="Riwayat perjalanan Anda akan tampil di sini setelah memesan armada pertama."
                action="Pilih Armada"
                actionTo="/home"
                className="border-solid"
              />
            ) : filteredPemesanan.length === 0 ? (
              <EmptyState
                icon="search"
                title="Tidak Ada Pesanan yang Cocok"
                description="Coba ubah kata kunci pencarian atau atur ulang filter untuk melihat pesanan Anda."
                action="Atur Ulang Filter"
                actionIcon="refresh"
                onAction={resetFilters}
                className="border-solid"
              />
            ) : (
              <div className="space-y-space-md">
                {filteredPemesanan.map((order) => {
                  const meta = STATUS_META[order.status] || { label: order.status, variant: "neutral" };
                  const address = order.deliveryAddress || order.titikTemuAddress;

                  return (
                    <Card key={order.id} interactive className="p-space-lg space-y-space-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-space-md">
                        <div className="flex items-start gap-space-md min-w-0">
                          <span className="w-14 h-14 rounded-c57-md bg-c57-primary/10 text-c57-primary flex items-center justify-center shrink-0">
                            <Icon name="directions_car" size="2xl" />
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-space-sm">
                              <h2 className="font-headline-sm text-headline-sm text-c57-on-surface tracking-tight">
                                {order.namaMobil}
                              </h2>
                              <Pill variant={meta.variant}>{meta.label}</Pill>
                            </div>
                            <p className="flex flex-wrap items-center gap-2 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                              <span className="text-c57-primary tabular-nums">#{order.id.slice(0, 8)}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-c57-outline-variant" aria-hidden="true" />
                              <span>{order.rentalType || "-"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                            Estimasi Biaya
                          </p>
                          <p className="font-headline-sm text-headline-sm text-c57-primary tabular-nums">
                            {order.perkiraanHarga ? rupiah(order.perkiraanHarga) : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <Attribute icon="calendar_month" label="Periode Sewa">
                          {period(order)}
                        </Attribute>
                        <Attribute icon="location_on" label="Lokasi Pickup">
                          {order.lokasiPenyerahan || "-"}
                          {address && (
                            <span className="block text-body-sm text-c57-on-surface-variant">
                              {address}
                            </span>
                          )}
                        </Attribute>
                        <Attribute icon="account_balance_wallet" label="Pembayaran">
                          {order.paymentMethod || "Belum dipilih"}
                        </Attribute>
                        <Attribute icon="pin" label="Plat Nomor">
                          {order.platNomor || "TBA"}
                        </Attribute>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-2 border-t border-c57-surface-variant">
                        <div className="flex flex-wrap items-center gap-space-sm">
                          {INVOICE_STATUSES.includes(order.status) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="download"
                              onClick={() =>
                                InvoiceGenerator.generateDPInvoice(order, auth.currentUser)
                              }
                            >
                              Download Invoice DP
                            </Button>
                          )}

                          {["menunggu pembayaran", "disetujui_cash"].includes(order.status) && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon="credit_card"
                              onClick={() => {
                                setSelectedOrder(order);
                                setPaymentModal(true);
                              }}
                            >
                              Konfirmasi Pembayaran
                            </Button>
                          )}

                          {order.status === "diproses" && (
                            <Button
                              variant="danger"
                              size="sm"
                              icon="delete"
                              onClick={() => {
                                setSelectedOrder(order);
                                setCancelModal(true);
                              }}
                            >
                              Batalkan
                            </Button>
                          )}
                        </div>

                        <p className="flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          <Icon name="schedule" size="xs" />
                          Update {formatDateTime(order.tanggal)}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        open={paymentModal && Boolean(selectedOrder)}
        onClose={closePayment}
        title="Pembayaran DP"
        subtitle="Lakukan pembayaran DP sebesar 50% dari total biaya untuk mengunci jadwal armada pilihan Anda."
        size="md"
        footer={
          <div className="flex flex-col sm:flex-row gap-space-sm sm:justify-end">
            <Button variant="secondary" onClick={closePayment} disabled={submitting}>
              Batal
            </Button>
            <Button
              variant="primary"
              icon="task_alt"
              onClick={handlePaymentSubmit}
              loading={submitting}
            >
              Konfirmasi &amp; Kirim
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-space-lg">
            <div className="rounded-c57-md bg-c57-surface-container p-space-md space-y-1">
              <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                Pesanan
              </p>
              <p className="font-headline-sm text-headline-sm text-c57-on-surface">
                {selectedOrder.namaMobil}
              </p>
              <p className="text-body-sm text-c57-on-surface-variant tabular-nums">
                #{selectedOrder.id.slice(0, 8)} • Estimasi {rupiah(selectedOrder.perkiraanHarga)} • DP
                minimum {rupiah(selectedOrder.perkiraanHarga * 0.5)}
              </p>
            </div>

            <fieldset>
              <legend className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-sm">
                Metode Pembayaran
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                {PAYMENT_METHODS.map((method) => {
                  const active = paymentForm.method === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setPaymentForm((prev) => ({ ...prev, method, dpAmount: "" }))
                      }
                      className={[
                        "py-3 rounded-c57-md font-label-md uppercase tracking-wider",
                        "border transition-colors duration-200",
                        active
                          ? "bg-c57-secondary text-c57-on-secondary border-c57-secondary"
                          : "bg-c57-surface-container-low text-c57-on-surface-variant border-c57-surface-variant hover:text-c57-on-surface",
                      ].join(" ")}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {(paymentForm.method === "Transfer Bank" || paymentForm.method === "E-Wallet") && (
              <div className="rounded-c57-md bg-c57-surface-container p-space-md space-y-space-sm">
                <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                  Tujuan{" "}
                  {paymentForm.method === "Transfer Bank" ? "Transfer Bank" : "E-Wallet"}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-body-md text-c57-on-surface-variant">
                    {(paymentForm.method === "Transfer Bank" ? BANK_DETAILS : EWALLET_DETAILS).label}
                  </span>
                  <span className="font-label-md uppercase tracking-widest text-c57-on-surface tabular-nums">
                    {(paymentForm.method === "Transfer Bank" ? BANK_DETAILS : EWALLET_DETAILS).account}
                  </span>
                </div>
                <div>
                  <label
                    htmlFor="paymentProof"
                    className="block font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-sm"
                  >
                    Bukti Transfer
                  </label>
                  <input
                    id="paymentProof"
                    type="file"
                    accept="image/*"
                    onChange={pickProof}
                    className="w-full text-body-sm text-c57-on-surface-variant file:mr-space-sm file:py-2 file:px-space-sm file:rounded-full file:border-0 file:bg-c57-primary-container file:text-c57-on-primary file:font-label-sm file:uppercase file:tracking-wider"
                  />
                  {paymentForm.proof && (
                    <p className="mt-space-sm text-body-sm text-c57-primary truncate">
                      {paymentForm.proof.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {(paymentForm.method === "Transfer Bank" ||
              paymentForm.method === "E-Wallet" ||
              (paymentForm.method === "Cash" && selectedOrder.status === "disetujui_cash")) && (
              <div className="space-y-space-sm">
                <Input
                  label="Nominal Pembayaran DP (IDR)"
                  type="number"
                  min="0"
                  value={paymentForm.dpAmount}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, dpAmount: event.target.value }))
                  }
                  placeholder={`Contoh: ${Math.round(selectedOrder.perkiraanHarga * 0.5)}`}
                />
                <p className="text-body-sm text-c57-on-surface-variant">
                  {paymentForm.method === "Cash"
                    ? "Masukkan jumlah uang yang akan Anda berikan tunai."
                    : `Minimal DP 50% dari total: ${rupiah(selectedOrder.perkiraanHarga * 0.5)}`}
                </p>
              </div>
            )}

            {!paymentForm.method && (
              <p className="text-body-md text-c57-on-surface-variant">
                Pilih metode pembayaran untuk melanjutkan.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={cancelModal && Boolean(selectedOrder)}
        onClose={() => setCancelModal(false)}
        size="sm"
        footer={
          <div className="grid grid-cols-2 gap-space-sm">
            <Button
              variant="danger"
              onClick={handleCancelSubmit}
              loading={submitting}
            >
              Ya, Batal
            </Button>
            <Button variant="secondary" onClick={() => setCancelModal(false)} disabled={submitting}>
              Tutup
            </Button>
          </div>
        }
      >
        <div className="text-center space-y-space-sm">
          <span className="w-14 h-14 rounded-full bg-c57-error-container text-c57-on-error-container flex items-center justify-center mx-auto">
            <Icon name="info" size="2xl" />
          </span>
          <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">
            Batalkan Pesanan?
          </h2>
          <p className="text-body-md text-c57-on-surface-variant">
            {selectedOrder
              ? `${selectedOrder.namaMobil} akan dikembalikan ke armada tersedia dan tindakan ini tidak dapat dibatalkan.`
              : ""}
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Attribute({ icon, label, children }) {
  return (
    <div className="p-space-md rounded-c57-md bg-c57-surface-container space-y-1">
      <p className="flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
        <Icon name={icon} size="sm" />
        {label}
      </p>
      <div className="text-body-md font-semibold text-c57-on-surface">{children}</div>
    </div>
  );
}
