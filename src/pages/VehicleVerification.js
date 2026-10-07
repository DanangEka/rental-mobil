import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
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
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Textarea from "../components/ui/Textarea";

/**
 * Driver vehicle condition check: photographs the car before handover and
 * after return, attached to the driver's in-progress orders.
 *
 * The `vehicleVerification` / `vehicleVerificationAfter` flags on the order
 * document and the `vehicleVerifications` record are the contract with
 * DriverOrders, which reads the former to decide whether step 1 of the active
 * checklist is done. Both are written exactly as before.
 *
 * Corrections from the markup pass:
 *
 *  - Both `alert()` calls became toasts.
 *
 *  - The order list was a `<div onClick>`; the page's primary control was
 *    unreachable by keyboard. It is a real `<button>` with `aria-pressed`.
 *
 *  - The listener had no error callback. This query is a three-clause
 *    `where + where + orderBy`, so it needs a composite index, and if that
 *    index is absent Firestore rejects the query — previously that failure was
 *    swallowed and the page just sat on a permanent "Tidak ada order aktif",
 *    indistinguishable from genuinely having no work. It now surfaces.
 */

const STATUS_VARIANTS = {
  disetujui: "neutral",
  "dalam perjalanan": "sand",
  "menunggu pembayaran": "sand",
};

const STATUS_TEXT = {
  disetujui: "Disetujui",
  "dalam perjalanan": "Dalam Perjalanan",
  "menunggu pembayaran": "Menunggu Pembayaran",
};

const TYPES = [
  { id: "before", label: "Sebelum Sewa" },
  { id: "after", label: "Sesudah Sewa" },
];

export default function VehicleVerification() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [verificationType, setVerificationType] = useState("before"); // "before" or "after"
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch orders that need vehicle verification
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      where("status", "in", ["disetujui", "dalam perjalanan", "menunggu pembayaran"]),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ordersData = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() });
        });
        setOrders(ordersData);
      },
      (error) => {
        // Almost always a missing composite index for driverId + status + tanggal.
        console.error("Error with vehicle verification query:", error);
        setOrders([]);
        toast.error(
          "Daftar order gagal dimuat. Kemungkinan index Firestore belum dibuat.",
          "Gagal"
        );
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitVerification = async () => {
    if (!selectedOrder || photos.length === 0) {
      toast.error("Mohon pilih order dan upload foto terlebih dahulu", "Gagal");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create verification record
      const verificationData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        type: verificationType,
        // Denormalised from the order so the admin audit list can label a row
        // without a `pemesanan` read per report. `AdminVehicleVerifications`
        // falls back to that join for rows written before this existed.
        namaMobil: selectedOrder.namaMobil,
        clientEmail: selectedOrder.email,
        notes: notes,
        photos: photos.map(photo => ({
          name: photo.name,
          size: photo.size,
          type: photo.type
        })),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "vehicleVerifications"), verificationData);

      // Update order with verification status
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        [`vehicleVerification${verificationType === "before" ? "Before" : "After"}`]: true,
        updatedAt: new Date()
      });

      // Reset form
      setSelectedOrder(null);
      setNotes("");
      setPhotos([]);
      setVerificationType("before");

      toast.success("Verifikasi berhasil disimpan!", "Berhasil");
    } catch (error) {
      console.error("Error submitting verification:", error);
      toast.error("Terjadi kesalahan saat menyimpan verifikasi", "Gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Icon name="photo_camera" size="sm" />
              <span>Fleet Standard Quality Control</span>
            </>
          }
          title="Verifikasi Mobil"
          subtitle="Dokumentasi keadaan mobil untuk standar kualitas layanan."
          className="mb-space-xl animate-fadeInUp"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
          {/* Order List */}
          <div className="lg:col-span-1 space-y-gutter animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-space-md">
              <span className="w-1.5 h-6 bg-c57-primary-container rounded-full" aria-hidden="true" />
              <h2 className="font-label-sm uppercase tracking-[0.2em] text-c57-outline">
                Order Aktif
              </h2>
            </div>

            {orders.length === 0 ? (
              <EmptyState icon="warning" title="Tidak ada order aktif" />
            ) : (
              orders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrder(order)}
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

                        <div className="flex flex-wrap items-center gap-space-sm">
                          <CheckPill
                            done={order.vehicleVerificationBefore}
                            label="Sebelum"
                            selected={isSelected}
                          />
                          <CheckPill
                            done={order.vehicleVerificationAfter}
                            label="Sesudah"
                            selected={isSelected}
                          />
                        </div>
                      </div>

                      <Pill
                        variant={isSelected ? "onScrim" : STATUS_VARIANTS[order.status] || "outline"}
                        size="sm"
                        className="shrink-0"
                      >
                        {STATUS_TEXT[order.status] || order.status}
                      </Pill>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Verification Form */}
          <div className="lg:col-span-2 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            {selectedOrder ? (
              <Card className="overflow-hidden">
                <div className="px-space-lg md:px-space-xl py-space-md md:py-space-lg border-b border-c57-surface-variant bg-c57-surface-container">
                  <h2 className="font-headline-sm text-headline-sm text-c57-on-surface uppercase tracking-widest">
                    Update Kondisi:{" "}
                    <span className="text-c57-primary">{selectedOrder.namaMobil}</span>
                  </h2>
                </div>

                <div className="p-space-md sm:p-space-lg md:p-space-xl">
                  {/* Verification Type Toggle */}
                  <div className="mb-space-xl">
                    <p className="font-label-sm uppercase tracking-[0.2em] text-c57-on-surface-variant mb-space-md">
                      Jenis Verifikasi
                    </p>
                    <div
                      className="flex p-space-sm bg-c57-surface-container rounded-c57-md border border-c57-surface-variant w-fit"
                      role="radiogroup"
                      aria-label="Jenis Verifikasi"
                    >
                      {TYPES.map((type) => {
                        const isActive = verificationType === type.id;

                        return (
                          <button
                            key={type.id}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => setVerificationType(type.id)}
                            className={[
                              "px-space-lg py-3 rounded-c57-sm font-label-sm uppercase tracking-widest transition-all",
                              isActive
                                ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                                : "text-c57-on-surface-variant hover:text-c57-on-surface",
                            ].join(" ")}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-space-xl">
                    {/* Notes Field */}
                    <Field label="Catatan Kondisi Mobil">
                      {(p) => (
                        <Textarea
                          {...p}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Contoh: Baret halus di bemper depan kanan, BBM 50%, Interior bersih..."
                          rows={5}
                        />
                      )}
                    </Field>

                    {/* Photo Upload */}
                    <div>
                      <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-md">
                        Dokumentasi Visual (Foto/Video)
                      </p>

                      <div className="relative group">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          id="photo-upload"
                          aria-label="Upload bukti kondisi fisik mobil"
                        />
                        <div className="border-2 border-dashed border-c57-outline-variant hover:border-c57-primary rounded-c57-lg p-space-xl text-center bg-c57-surface-container transition-all group-hover:bg-c57-error-container/30">
                          <Icon
                            name="photo_camera"
                            size="3xl"
                            className="text-c57-outline mx-auto mb-space-md transition-colors group-hover:text-c57-primary"
                          />
                          <span className="bg-c57-primary-container text-c57-on-primary px-space-lg py-3 rounded-full font-label-sm uppercase tracking-widest inline-block mb-space-md">
                            Pilih Media
                          </span>
                          <p className="font-label-sm uppercase tracking-widest text-c57-outline">
                            Upload bukti kondisi fisik mobil
                          </p>
                        </div>
                      </div>

                      {photos.length > 0 && (
                        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-gutter pt-space-lg">
                          {photos.map((photo, index) => (
                            <li
                              key={index}
                              className="relative group animate-fadeInUp"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                              <div className="bg-c57-surface-container border border-c57-surface-variant rounded-c57-lg p-space-md flex flex-col items-center justify-center h-36 overflow-hidden">
                                <Icon
                                  name="description"
                                  size="2xl"
                                  className="text-c57-outline mb-space-md group-hover:text-c57-primary transition-colors"
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

                    {/* Submit Section */}
                    <div className="pt-space-md">
                      <Button
                        type="button"
                        onClick={submitVerification}
                        disabled={isSubmitting || photos.length === 0}
                        loading={isSubmitting}
                        icon="check_circle"
                        size="lg"
                        className="w-full"
                      >
                        {isSubmitting ? "Processing..." : "Simpan & Perbarui Verifikasi"}
                      </Button>
                      <p className="text-center font-label-sm uppercase tracking-[0.2em] text-c57-outline mt-space-lg">
                        Data akan disimpan ke sistem verifikasi operasional Cakra Lima Tujuh
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState
                icon="photo_camera"
                title="Pilih Tugas Aktif"
                description="Silakan pilih order dari daftar di panel kiri untuk mulai melakukan verifikasi kondisi kendaraan."
                className="min-h-[500px]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Before/after checkpoint on the order card. Reads `done` for the completed
 * state and `selected` so the inverted colours still work on the crimson fill.
 */
function CheckPill({ done, label, selected }) {
  const classes = done
    ? "bg-c57-available-bg text-c57-available-text border-c57-available-text/20"
    : "bg-c57-surface-container text-c57-outline border-c57-surface-variant";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-space-sm py-1 rounded-c57-sm border",
        "font-label-sm uppercase tracking-widest",
        selected
          ? done
            ? "bg-white/20 border-white/20 text-c57-on-primary"
            : "bg-black/10 border-c57-on-primary/20 text-c57-primary-container"
          : classes,
      ].join(" ")}
    >
      {done && <Icon name="check" size="xs" />}
      {label}
    </span>
  );
}
