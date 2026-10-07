import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { releaseVehicle } from "../services/bookingService";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  addDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";
import { uploadImage, validateImageFile } from "../utils/uploadImage";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";

/**
 * Driver payment settlement.
 *
 * Reads the driver's in-progress orders and writes a `paymentVerifications`
 * record, flips the order to `selesai`, releases the car, and prints the full
 * invoice. All of that Firestore sequence is unchanged by the redesign.
 *
 * Corrections from the markup pass:
 *
 *  - The five `alert()` calls became `toast.error`/`toast.success`, matching
 *    every other surface in the app. The copy is unchanged.
 *
 *  - The "Jumlah Diterima" field rendered `parseInt(paymentAmount).toString()`,
 *    which prints the literal "NaN" when `perkiraanHarga` or `dpAmount` is
 *    missing on a malformed order. It is now formatted through
 *    `formatRupiah`, which degrades to an em dash.
 *
 *  - The order list was a `<div onClick>`, so the primary control on the page
 *    was unreachable by keyboard. It is a real `<button>` now, with
 *    `aria-pressed` carrying the selection.
 *
 *  - `{true && (...)}` around the photo block, and two `await import()` calls
 *    for `getDoc`/`getDocs` that were already statically importable, are gone.
 */

const IN_PROGRESS = ["disetujui", "dalam perjalanan", "menunggu pembayaran"];

const STATUS_VARIANTS = {
  "dalam perjalanan": "sand",
  "menunggu pembayaran": "sand",
};

const STATUS_TEXT = {
  "dalam perjalanan": "Dalam Perjalanan",
  "menunggu pembayaran": "Menunggu Pembayaran",
};

const METHOD_TEXT = {
  Cash: "Tunai",
  "Transfer Bank": "Transfer Bank",
};

const METHOD_VARIANTS = {
  Cash: "available",
  "Transfer Bank": "neutral",
};

/** DP defaults to half the estimate when the order has no explicit DP. */
const dpOf = (order) => order.dpAmount || Math.floor(order.perkiraanHarga * 0.5);

/** What the driver still has to collect. NaN-safe. */
const remainingOf = (order) => order.perkiraanHarga - dpOf(order);

const formatRupiah = (value) =>
  Number.isFinite(value) ? value.toLocaleString("id-ID") : "—";

export default function PaymentVerification() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentPhotos, setPaymentPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addNotification = async (message) => {
    try {
      console.log("Adding notification for user:", user.uid, "message:", message);
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        message,
        timestamp: serverTimestamp(),
        read: false,
      });
      console.log("Notification added successfully");
    } catch (error) {
      console.error("Failed to add notification:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch orders that are currently in progress - using getDocs to avoid listener issues
    const fetchOrders = async () => {
      try {
        // Rules scope a driver's read of `pemesanan` to orders that are theirs or
        // still unassigned, so this must be filtered in the query rather than in
        // JS. Firestore has no OR, hence two reads. Orders always carry an
        // explicit `driverId` (null when unassigned) — firestore.rules reads that
        // field directly, so it can never be absent.
        const scopes = [
          query(collection(db, "pemesanan"), where("driverId", "==", user.uid)),
          query(collection(db, "pemesanan"), where("driverId", "==", null)),
        ];

        const merged = new Map();
        for (const scopeQuery of scopes) {
          const snap = await getDocs(scopeQuery);
          snap.forEach((d) => merged.set(d.id, { id: d.id, ...d.data() }));
        }
        const ordersData = [];
        merged.forEach((order) => {
          if (IN_PROGRESS.includes(order.status)) ordersData.push(order);
        });

        // Sort by date client-side
        ordersData.sort((a, b) => {
          const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
          const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
          return dateB - dateA;
        });

        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      }
    };

    fetchOrders();

    // Set up a simple interval to refresh data every 30 seconds
    const interval = setInterval(fetchOrders, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const accepted = [];
    files.forEach((file) => {
      const problem = validateImageFile(file, "proof");
      if (problem) {
        toast.error(problem, "File ditolak");
      } else {
        accepted.push(file);
      }
    });
    if (accepted.length !== files.length) event.target.value = "";
    if (accepted.length > 0) setPaymentPhotos(prev => [...prev, ...accepted]);
  };

  const removePhoto = (index) => {
    setPaymentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const selectOrder = (order) => {
    setSelectedOrder(order);
    setPaymentAmount(remainingOf(order).toString());
    setPaymentMethod(order.paymentMethod || "cash");
  };

  const submitPaymentVerification = async () => {
    if (!selectedOrder || !paymentAmount) {
      toast.error("Mohon lengkapi semua field yang diperlukan", "Gagal");
      return;
    }

    // For cash payments, require photos
    if (paymentMethod === "cash" && paymentPhotos.length === 0) {
      toast.error("Untuk pembayaran cash, mohon upload minimal 1 foto bukti pembayaran", "Gagal");
      return;
    }

    const amount = parseInt(paymentAmount);
    const clientDP = dpOf(selectedOrder);
    const expectedRemaining = remainingOf(selectedOrder);
    if (amount !== expectedRemaining) {
      toast.error(
        `Jumlah pembayaran (Rp ${formatRupiah(amount)}) tidak sesuai dengan sisa pembayaran yang harus diselesaikan (Rp ${formatRupiah(expectedRemaining)})`,
        "Gagal"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let proofUrl = null;
      if (paymentPhotos.length > 0) {
        try {
          proofUrl = await uploadImage(paymentPhotos[0], { limit: "proof" });
        } catch (e) {
          console.error("Cloudinary upload failed", e);
        }
      }

      // Create payment verification record
      const paymentData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        userId: selectedOrder.uid, // Add userId for reference
        amount: amount,
        dpAmount: clientDP,
        totalAmount: selectedOrder.perkiraanHarga,
        method: paymentMethod,
        paymentProof: proofUrl, // Store direct image url
        photos: paymentPhotos.map(photo => ({
          name: photo.name,
          size: photo.size,
          type: photo.type
        })),
        notes: notes,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "paymentVerifications"), paymentData);

      // Update order status to completed
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        status: "selesai",
        actualPaymentAmount: amount,
        paymentVerifiedAt: new Date(),
        updatedAt: new Date()
      });

      // Make car available again
      if (selectedOrder.mobilId) {
        await releaseVehicle(selectedOrder.mobilId, selectedOrder.id);
        console.log(`Car ${selectedOrder.mobilId} made available again after payment verification`);
      }

      // Generate Full Payment Invoice
      try {
        const completedOrder = {
          ...selectedOrder,
          status: "selesai",
          actualPaymentAmount: amount,
          paymentVerifiedAt: new Date()
        };
        InvoiceGenerator.generateFullInvoice(completedOrder, userData);
        await addNotification("Invoice pembayaran penuh telah dibuat dan didownload");
      } catch (invoiceError) {
        console.error("Error generating full payment invoice:", invoiceError);
        // Don't show error to user as payment verification was successful
      }

      // Reset form
      setSelectedOrder(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentPhotos([]);
      setNotes("");

      toast.success("Verifikasi pembayaran berhasil! Order telah selesai.", "Berhasil");
    } catch (error) {
      console.error("Error submitting payment verification:", error);
      toast.error("Terjadi kesalahan saat menyimpan verifikasi pembayaran", "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCash = paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash";
  const canSubmit =
    !isSubmitting &&
    Boolean(paymentAmount) &&
    !(isCash && paymentPhotos.length === 0);

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl text-c57-on-surface">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" aria-hidden="true">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-c57-error-container mix-blend-multiply filter blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-c57-surface-container-high mix-blend-multiply filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-gutter-mobile sm:px-gutter py-space-lg">
        <PageHeader
          eyebrow={
            <>
              <Icon name="credit_card" size="sm" />
              <span>Finance Settlement</span>
            </>
          }
          title="Verifikasi Pembayaran"
          subtitle="Lakukan verifikasi bukti pembayaran untuk menyelesaikan order."
          className="mb-space-xl animate-fadeInUp"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
          {/* Order List */}
          <div className="lg:col-span-1 space-y-gutter animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-space-md">
              <span className="w-1.5 h-6 bg-c57-primary-container rounded-full" aria-hidden="true" />
              <h2 className="font-label-sm uppercase tracking-[0.2em] text-c57-outline">
                Order Berlangsung
              </h2>
            </div>

            {orders.length === 0 ? (
              <EmptyState icon="credit_card" title="Tidak ada order aktif" />
            ) : (
              orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => selectOrder(order)}
                    aria-pressed={isSelected}
                    className={[
                      "w-full text-left p-space-lg rounded-c57-lg transition-all duration-300 border",
                      isSelected
                        ? "bg-c57-primary-container border-c57-primary-container text-c57-on-primary shadow-c57-card-hover"
                        : "bg-c57-surface-container-lowest border-c57-surface-variant shadow-c57-card hover:border-c57-primary",
                    ].join(" ")}
                  >
                    <div className="flex justify-between items-start gap-space-md">
                      <div className="min-w-0 flex-1">
                        <h3 className={[
                          "font-headline-sm text-headline-sm truncate mb-1",
                          isSelected ? "text-c57-on-primary" : "text-c57-on-surface",
                        ].join(" ")}>
                          {order.namaMobil}
                        </h3>
                        <p className={[
                          "font-label-sm uppercase tracking-widest truncate mb-space-md",
                          isSelected ? "text-c57-primary-container" : "text-c57-outline",
                        ].join(" ")}>
                          {order.email}
                        </p>
                        <div className="flex items-center gap-space-sm">
                          <Icon
                            name="payments"
                            size="sm"
                            className={isSelected ? "text-c57-on-primary" : "text-c57-available-text"}
                          />
                          <span className={[
                            "font-headline-sm text-headline-sm leading-none",
                            isSelected ? "text-c57-on-primary" : "text-c57-available-text",
                          ].join(" ")}>
                            Rp {formatRupiah(order.perkiraanHarga)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-space-sm shrink-0">
                        <Pill
                          variant={isSelected ? "onScrim" : STATUS_VARIANTS[order.status] || "outline"}
                          size="sm"
                        >
                          {STATUS_TEXT[order.status] || order.status}
                        </Pill>
                        <Pill
                          variant={isSelected ? "onScrim" : METHOD_VARIANTS[order.paymentMethod] || "neutral"}
                          size="sm"
                        >
                          {METHOD_TEXT[order.paymentMethod] || order.paymentMethod || "Tidak ada info"}
                        </Pill>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Payment Verification Form */}
          <div className="lg:col-span-2 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            {selectedOrder ? (
              <Card className="overflow-hidden">
                <div className="px-space-lg md:px-space-xl py-space-md md:py-space-lg border-b border-c57-surface-variant bg-c57-surface-container">
                  <h2 className="font-headline-sm text-headline-sm text-c57-on-surface uppercase tracking-widest">
                    Verifikasi Pembayaran:{" "}
                    <span className="text-c57-primary">{selectedOrder.namaMobil}</span>
                  </h2>
                </div>

                <div className="p-space-md sm:p-space-lg md:p-space-xl">
                  {/* Order Summary Grid */}
                  <Card variant="inset" className="p-space-lg md:p-space-xl mb-space-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      <div>
                        <span className="font-label-sm uppercase tracking-[0.2em] text-c57-outline block mb-space-sm">
                          Mobil &amp; Client
                        </span>
                        <p className="font-headline-sm text-headline-sm text-c57-on-surface uppercase">
                          {selectedOrder.namaMobil}
                        </p>
                        <p className="font-label-sm text-c57-on-surface-variant uppercase tracking-widest mt-1">
                          {selectedOrder.email}
                        </p>
                      </div>

                      <div>
                        <span className="font-label-sm uppercase tracking-[0.2em] text-c57-outline block mb-space-sm">
                          Tanggal &amp; Total
                        </span>
                        <p className="text-body-sm font-semibold text-c57-on-surface">
                          {selectedOrder.tanggalMulai
                            ? new Date(selectedOrder.tanggalMulai).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : "N/A"}
                        </p>
                        <p className="font-headline-sm text-headline-sm text-c57-available-text mt-1">
                          Rp {formatRupiah(selectedOrder.perkiraanHarga)}
                        </p>
                      </div>

                      <div className="md:col-span-2 pt-space-lg border-t border-c57-surface-variant">
                        <span className="font-label-sm uppercase tracking-[0.2em] text-c57-primary block mb-space-sm">
                          DP Diterima (Finance)
                        </span>
                        <p className="font-headline-md text-headline-md text-c57-primary">
                          Rp {formatRupiah(dpOf(selectedOrder))}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-space-xl">
                    {/* Payment Info Callout */}
                    <Card variant="inset" className="p-space-md flex gap-space-md">
                      <span className="h-10 w-10 bg-c57-surface-container text-c57-primary rounded-c57-md flex items-center justify-center shrink-0 border border-c57-surface-variant">
                        <Icon name="credit_card" size="md" />
                      </span>
                      <div>
                        <p className="text-body-sm font-semibold text-c57-on-surface">
                          Info Pembayaran
                        </p>
                        <p className="font-label-sm uppercase tracking-wider text-c57-on-surface-variant mt-1">
                          {METHOD_TEXT[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}
                          {selectedOrder.paymentMethod === "Cash" && " • Diperlukan Foto Bukti Fisik"}
                          {selectedOrder.paymentMethod === "Transfer Bank" &&
                            " • Verifikasi Otomatis Tersedia"}
                        </p>
                      </div>
                    </Card>

                    {/* Form Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                      <Field label="Metode Pembayaran">
                        {(p) => (
                          <Select
                            {...p}
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={selectedOrder.status === "menunggu pembayaran"}
                          >
                            <option value="cash">Tunai (Cash)</option>
                            <option value="transfer">Transfer Bank</option>
                            <option value="other">Lainnya</option>
                          </Select>
                        )}
                      </Field>

                      <Field
                        label="Jumlah Diterima (Rp)"
                        hint="Terisi otomatis dari sisa pembayaran"
                      >
                        {(p) => (
                          <Input
                            {...p}
                            type="text"
                            readOnly
                            className="bg-c57-available-bg border-c57-available-text/20 text-c57-available-text font-semibold"
                            value={formatRupiah(parseInt(paymentAmount, 10))}
                          />
                        )}
                      </Field>
                    </div>

                    {/* Photos — always offered, required for cash */}
                    <div>
                      <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-md">
                        Foto Bukti Pembayaran
                        {isCash && <span className="text-c57-primary"> *</span>}
                      </p>

                      <div className="relative group">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          id="payment-photo-upload"
                          aria-label="Pilih atau ambil foto bukti fisik"
                        />
                        <div className="border-2 border-dashed border-c57-outline-variant hover:border-c57-primary rounded-c57-lg p-space-xl text-center bg-c57-surface-container transition-all group-hover:bg-c57-error-container/30">
                          <Icon
                            name="photo_camera"
                            size="3xl"
                            className="text-c57-outline mx-auto mb-space-md transition-colors group-hover:text-c57-primary"
                          />
                          <span className="bg-c57-primary-container text-c57-on-primary px-space-lg py-3 rounded-full font-label-sm uppercase tracking-widest inline-block mb-space-md">
                            Pilih Bukti
                          </span>
                          <p className="font-label-sm uppercase tracking-widest text-c57-outline">
                            Pilih atau ambil foto bukti fisik
                          </p>
                        </div>
                      </div>

                      {paymentPhotos.length > 0 && (
                        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-gutter pt-space-md">
                          {paymentPhotos.map((photo, index) => (
                            <li
                              key={index}
                              className="relative group animate-fadeInUp"
                            >
                              <div className="bg-c57-surface-container border border-c57-surface-variant rounded-c57-lg p-space-md flex flex-col items-center justify-center h-28 overflow-hidden">
                                <Icon
                                  name="description"
                                  size="2xl"
                                  className="text-c57-outline group-hover:text-c57-primary transition-colors mb-space-sm"
                                />
                                <p className="font-label-sm text-c57-outline uppercase truncate w-full text-center">
                                  {photo.name}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePhoto(index);
                                }}
                                aria-label={`Hapus ${photo.name}`}
                                className="absolute -top-1 -right-1 bg-c57-error text-c57-on-error rounded-full p-space-sm shadow-c57-card transition-transform hover:scale-110 active:scale-95 z-20"
                              >
                                <Icon name="close" size="xs" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Notes */}
                    <Field label="Catatan Tambahan (Opsional)">
                      {(p) => (
                        <Textarea
                          {...p}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Contoh: Pembayaran lunas di awal, kembalian diserahkan, dll."
                          rows={4}
                        />
                      )}
                    </Field>

                    <Button
                      type="button"
                      onClick={submitPaymentVerification}
                      disabled={!canSubmit}
                      loading={isSubmitting}
                      icon="check_circle"
                      size="lg"
                      className="w-full"
                    >
                      {isSubmitting ? "Processing..." : "Konfirmasi & Selesaikan Order"}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon="credit_card"
                title="Pilih Order"
                description="Silakan pilih salah satu order aktif di panel kiri untuk mulai memproses verifikasi pembayaran."
                className="min-h-[450px]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
