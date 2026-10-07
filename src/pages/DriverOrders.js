import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { releaseVehicle } from "../services/bookingService";
import { collection, query, onSnapshot, doc, updateDoc, getDoc, getDocs, addDoc, serverTimestamp, where } from "firebase/firestore";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";
import { uploadImage, validateImageFile } from "../utils/uploadImage";
import { sendWhatsApp } from "../services/fonnte";
import { resolveOrderAddress } from "../utils/address";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import SectionHeading from "../components/ui/SectionHeading";

/**
 * Driver order management: available pool, active tasks, history, and an
 * "all" tab.
 *
 * Firestore behaviour is preserved exactly, including the two-step
 * `mobil` write on completion (`tersedia: true` alongside `status: "normal"`)
 * and the Fonnte WhatsApp reminder to the driver on delivery jobs.
 *
 * Three corrections came out of the redesign pass:
 *
 *  1. The ordered-query listener had a leak. On index failure the error
 *     callback built a second `onSnapshot` and assigned it to
 *     `unsubscribeFallback`, but it *returned* from inside a callback, so the
 *     effect's cleanup only ever held the first (already-dead) unsubscribe.
 *     The fallback listener was never torn down. DriverDashboard had already
 *     solved this with a shared `let`, so it uses the same pattern now.
 *
 *  2. `OrderCard` was declared inside the component body, so it was a new
 *     component type on every render and React remounted the whole card
 *     subtree — including the file input and its selected-file state — on
 *     every snapshot. It is hoisted to module scope and receives callbacks as
 *     props.
 *
 *  3. All ten `toast` calls passed (shortLabel, longSentence) against the
 *     `toast[type](message, title)` signature, so every title rendered as the
 *     long sentence and the real message was dropped.
 */

const TABS = [
  { id: "available", label: "Order Baru", icon: "directions_car" },
  { id: "active", label: "Tugas Aktif", icon: "schedule" },
  { id: "history", label: "Riwayat", icon: "check_circle" },
  { id: "all", label: "Semua", icon: "search" },
];

const EMPTY_COPY = {
  available: {
    icon: "directions_car",
    title: "Belum Ada Order Baru",
    description: "Saat ini tidak ada order yang menunggu untuk diambil oleh driver.",
  },
  active: {
    icon: "schedule",
    title: "Tidak Ada Tugas Aktif",
    description: "Tidak ada tugas aktif yang sedang Anda kerjakan.",
  },
  history: {
    icon: "check_circle",
    title: "Belum Ada Riwayat",
    description: "Anda belum memiliki riwayat order yang selesai.",
  },
  all: {
    icon: "directions_car",
    title: "Belum Ada Data Order",
    description: "Belum ada data order sama sekali.",
  },
};

const SECTION_TITLES = {
  available: "Order Baru Tersedia",
  active: "Tugas Aktif",
  history: "Riwayat Perjalanan",
  all: "Semua Order",
};

/** Order status → Pill variant. Replaces nine hand-written colour triples. */
const STATUS_VARIANTS = {
  disetujui: "neutral",
  "dalam perjalanan": "sand",
  "menunggu pembayaran": "sand",
  selesai: "available",
  lunas: "available",
  dibatalkan: "danger",
  driver_verified: "available",
  cash_submitted: "neutral",
};

const STATUS_TEXT = {
  disetujui: "Disetujui",
  "dalam perjalanan": "Dalam Perjalanan",
  "menunggu pembayaran": "Menunggu Pembayaran",
  selesai: "Selesai",
  lunas: "Lunas",
  dibatalkan: "Dibatalkan",
  driver_verified: "Driver Verified",
  cash_submitted: "Cash Submitted",
};

/** Payment-verification step counts as done at any of these states. */
const PAYMENT_DONE = ["pembayaran berhasil", "selesai", "lunas"];

export default function DriverOrders() {
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("available");
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [paymentProof, setPaymentProof] = useState({});
  const [showPaymentSection, setShowPaymentSection] = useState({});

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUsers();
        fetchCompanyProfile();
      }
    });

    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      }
    };

    const fetchCompanyProfile = async () => {
      try {
        const companyDocRef = doc(db, "company_profile", "main");
        const companyDoc = await getDoc(companyDocRef);
        if (companyDoc.exists()) {
          setCompanyProfile(companyDoc.data());
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
      }
    };

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Rules scope a driver's read of `pemesanan` to orders that are theirs or
    // still unassigned, so the filter has to live in the query. Firestore has no
    // OR, so this runs two listeners and merges them. Orders always carry an
    // explicit `driverId` (null when unassigned) — firestore.rules reads that
    // field directly, so it can never be absent.
    const scopes = [
      query(collection(db, "pemesanan"), where("driverId", "==", user.uid)),
      query(collection(db, "pemesanan"), where("driverId", "==", null)),
    ];

    // One map per scope: a snapshot replaces only its own scope's rows, so one
    // branch updating cannot evict the other branch's documents.
    const byScope = scopes.map(() => new Map());
    const unsubscribes = [];

    scopes.forEach((scopeQuery, index) => {
      try {
        unsubscribes.push(
          onSnapshot(
            scopeQuery,
            (snap) => {
              const rows = new Map();
              snap.forEach((d) => rows.set(d.id, { id: d.id, ...d.data() }));
              byScope[index] = rows;
              const merged = new Map();
              byScope.forEach((m) => m.forEach((v, k) => merged.set(k, v)));
              processOrders([...merged.values()]);
            },
            (error) => {
              console.error("Error with scoped pemesanan query in DriverOrders:", error);
            }
          )
        );
      } catch (error) {
        console.error("Error setting up orders listener:", error);
      }
    });

    // Declared as a function so it is hoisted — the listener callbacks above
    // call it synchronously on their first snapshot.
    function processOrders(ordersData) {
      // Separate orders by status and driver assignment
      const available = ordersData.filter(order =>
        (order.status === "pembayaran berhasil" || order.status === "approve sewa" || order.status === "disetujui") &&
        !order.driverId // Only show orders without driver assigned
      );

      const active = ordersData.filter(order =>
        order.driverId === user.uid &&
        ["disetujui", "dalam perjalanan", "menunggu pembayaran"].includes(order.status)
      );

      const history = ordersData.filter(order =>
        order.driverId === user.uid &&
        ["selesai", "dibatalkan", "lunas", "cash_submitted"].includes(order.status)
      );

      setAllOrders(ordersData);
      setAvailableOrders(available);
      setActiveOrders(active);
      setOrderHistory(history);
    };

    return () => {
      unsubscribes.forEach((un) => {
        if (typeof un === "function") un();
      });
    };
  }, [user]);

  const addressFor = (order) => resolveOrderAddress(order, { users, companyProfile });

  const clientFor = (order) => users.find((u) => u.id === order.uid);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "pemesanan", orderId);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();

      // Update order status
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // If order is completed, update driver stats and make car available again
      if (newStatus === "selesai" && orderData.mobilId) {
        await releaseVehicle(orderData.mobilId, orderId);
        console.log(`Car ${orderData.mobilId} made available again`);
        toast.success("Status order telah diperbarui menjadi Selesai.", "Order Berhasil");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Tidak dapat memperbarui status order.", "Gagal");
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      if (!user || !user.uid) {
        toast.error("User tidak ditemukan. Silakan login kembali.", "Error");
        return;
      }

      const orderRef = doc(db, "pemesanan", orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        toast.error("Order tidak ditemukan.", "Error");
        return;
      }

      const orderData = orderDoc.data();
      if (orderData.driverId) {
        toast.error("Order telah diambil oleh driver lain.", "Error");
        return;
      }

      await updateDoc(orderRef, {
        driverId: user.uid,
        status: "disetujui", // Ensure it goes to active tasks
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Notifications
      try {
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          message: `Driver ${user.email} telah menerima order ${orderData.namaMobil}.`,
          read: false,
          timestamp: serverTimestamp()
        });

        if (orderData.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: orderData.uid,
            orderId: orderId,
            message: `Driver telah menerima order Anda untuk mobil ${orderData.namaMobil}. Mobil akan diantar ke ${orderData.lokasiPenyerahan || 'lokasi Anda'}.`,
            read: false,
            timestamp: serverTimestamp()
          });
        }

        // Fonnte WhatsApp Notification for Driver
        const isDelivery = orderData.lokasiPenyerahan === "Rumah" || orderData.lokasiPenyerahan === "Titik Temu";
        if (isDelivery) {
          const driverPhone = user.phone || user.nomorTelepon;
          const client = users.find(u => u.id === orderData.uid);

          if (driverPhone) {
            const message = `*🔔 REMINDER TUGAS PENGANTARAN*
            
Halo, Driver Cakra Lima Tujuh!
Anda telah menerima tugas baru untuk pengantaran unit.

*DETAIL PESANAN:*
🚗 *Mobil:* ${orderData.namaMobil}
👤 *Customer:* ${client?.nama || orderData.email}
📞 *Telp Customer:* ${client?.nomorTelepon || orderData.noTelepon || '-'}

*LOKASI PENYERAHAN:*
📍 *Tipe:* ${orderData.lokasiPenyerahan}
🏠 *Alamat:* ${addressFor(orderData)}

*JAM MULAI:*
⏰ ${orderData.tanggalMulai ? new Date(orderData.tanggalMulai).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}

Mohon hubungi customer sebelum berangkat dan pastikan unit dalam keadaan prima.

_Terima kasih, selamat bertugas!_`;

            await sendWhatsApp(driverPhone, message);
          }
        }
      } catch (notifErr) {
        console.error("Notification/WA error:", notifErr);
      }

      toast.success("Berhasil menerima order. Silakan cek Tugas Aktif.", "Order Diterima");
      setActiveTab("active");
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Terjadi kesalahan saat menerima order.", "Error");
    }
  };

  const handlePaymentProofUpload = async (orderId, order) => {
    if (!paymentProof[orderId]) {
      toast.warning("Silakan pilih file bukti pembayaran terlebih dahulu.", "File Belum Dipilih");
      return;
    }
    const problem = validateImageFile(paymentProof[orderId], "proof");
    if (problem) {
      toast.warning(problem, "File ditolak");
      return;
    }

    try {
      const paymentProofURL = await uploadImage(paymentProof[orderId], { limit: "proof" });
      // Update order with payment proof
      const orderRef = doc(db, "pemesanan", orderId);
      await updateDoc(orderRef, {
        paymentProof: paymentProofURL,
        paymentStatus: "driver_verified",
        driverVerifiedAt: new Date().toISOString()
      });

      // Add notification
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Pembayaran Anda telah diverifikasi oleh driver untuk order ${order.namaMobil}`,
        timestamp: new Date(),
        read: false,
      });

      // Hide payment section
      setShowPaymentSection(prev => ({ ...prev, [orderId]: false }));
      setPaymentProof(prev => ({ ...prev, [orderId]: null }));

      toast.success("Bukti pembayaran berhasil diunggah dan order telah diverifikasi!", "Berhasil");
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast.error("Terjadi kesalahan saat mengunggah bukti pembayaran. Silakan coba lagi.", "Gagal");
    }
  };

  const togglePaymentSection = (orderId) => {
    setShowPaymentSection(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const pickProof = (orderId, file) => {
    const problem = file && validateImageFile(file, "proof");
    if (problem) {
      toast.warning(problem, "File ditolak");
      return;
    }
    setPaymentProof(prev => ({ ...prev, [orderId]: file || null }));
  };

  const tabOrders = {
    available: availableOrders,
    active: activeOrders,
    history: orderHistory,
    all: allOrders,
  }[activeTab];

  const tabCounts = {
    available: availableOrders.length,
    active: activeOrders.length,
    history: orderHistory.length,
    all: allOrders.length,
  };

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl text-c57-on-surface">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" aria-hidden="true">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-c57-error-container mix-blend-multiply filter blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-c57-surface-container-high mix-blend-multiply filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-gutter-mobile sm:px-gutter py-space-lg">
        <PageHeader
          eyebrow={
            <>
              <Icon name="assignment" size="sm" />
              <span>Order Management</span>
            </>
          }
          title="Manajemen Order"
          subtitle="Kelola tugas aktif dan pantau riwayat perjalanan Anda."
          className="mb-space-xl animate-fadeInUp"
        />

        <nav
          className="mb-space-xl rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-space-sm shadow-c57-card overflow-x-auto animate-fadeInUp"
          style={{ animationDelay: "0.1s" }}
          aria-label="Filter order"
        >
          <ul className="flex gap-space-sm min-w-max">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "flex items-center gap-space-sm py-3 px-space-lg rounded-c57-md",
                      "font-label-sm uppercase tracking-widest transition-all whitespace-nowrap",
                      isActive
                        ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                        : "text-c57-on-surface-variant hover:text-c57-on-surface hover:bg-c57-surface-container",
                    ].join(" ")}
                  >
                    <Icon name={tab.icon} size="sm" />
                    {tab.label}
                    <span
                      className={[
                        "ml-1 px-space-sm py-0.5 rounded-full font-label-sm tabular-nums",
                        isActive ? "bg-white/20" : "bg-c57-surface-container text-c57-on-surface-variant",
                      ].join(" ")}
                    >
                      {tabCounts[tab.id]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <SectionHeading title={SECTION_TITLES[activeTab]} className="mb-space-lg" />

          {tabOrders.length === 0 ? (
            <EmptyState {...EMPTY_COPY[activeTab]} />
          ) : (
            <div className="space-y-gutter">
              {tabOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isActive={activeTab === "active"}
                  client={clientFor(order)}
                  address={addressFor(order)}
                  currentUserId={user?.uid}
                  proofFile={paymentProof[order.id]}
                  proofOpen={Boolean(showPaymentSection[order.id])}
                  onToggleProof={() => togglePaymentSection(order.id)}
                  onPickProof={pickProof}
                  onUploadProof={() => handlePaymentProofUpload(order.id, order)}
                  onAccept={handleAcceptOrder}
                  onAdvance={updateOrderStatus}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * One order, its summary tiles, and whichever action set its tab implies.
 *
 * Module scope on purpose: declaring this inside the page component made it a
 * new component type per render, remounting the file input and dropping the
 * selected file on every snapshot.
 */
function OrderCard({
  order,
  isActive,
  client,
  address,
  currentUserId,
  proofFile,
  proofOpen,
  onToggleProof,
  onPickProof,
  onUploadProof,
  onAccept,
  onAdvance,
}) {
  // Transfer Bank and E-Wallet are settled by the payment gateway, so the
  // driver never uploads proof for them.
  const isDigitalPayment =
    order.paymentMethod === "Transfer Bank" || order.paymentMethod === "E-Wallet";
  const awaitingPayment = order.status === "menunggu pembayaran";
  const isDelivery = order.lokasiPenyerahan === "Rumah" || order.lokasiPenyerahan === "Titik Temu";
  const paymentDone = PAYMENT_DONE.includes(order.status);
  const claimable =
    !order.driverId && ["disetujui", "pembayaran berhasil", "approve sewa"].includes(order.status);

  const shortDate = (value) =>
    value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "N/A";

  return (
    <Card className="p-space-lg md:p-space-xl animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-space-md mb-space-lg">
        <div className="flex items-center gap-space-lg min-w-0">
          <span className="w-16 h-16 rounded-c57-lg bg-c57-primary-container text-c57-on-primary flex items-center justify-center shrink-0">
            <Icon name="directions_car" size="3xl" />
          </span>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">
              {order.namaMobil}
            </h3>
            <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mt-1 truncate">
              {order.email}
            </p>
            {order.paymentMethod && (
              <Pill variant="neutral" icon="credit_card" className="mt-space-sm">
                {order.paymentMethod}
              </Pill>
            )}
          </div>
        </div>
        <Pill
          variant={STATUS_VARIANTS[order.status] || "outline"}
          size="md"
          className="shrink-0"
        >
          {order.status === "selesai" ? "Order Selesai" : STATUS_TEXT[order.status] || order.status}
        </Pill>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter pt-space-lg mb-space-lg border-t border-c57-surface-variant">
        <SummaryTile
          icon="calendar_month"
          label="Rent Period"
          value={
            <>
              {shortDate(order.tanggalMulai)} - {shortDate(order.tanggalSelesai)}
            </>
          }
        />
        <SummaryTile
          icon="phone"
          label="Client Contact"
          value={client?.nomorTelepon || order.noTelepon || "N/A"}
          className="lg:max-w-[180px]"
        />
        <SummaryTile icon="place" label="Location" value={order.lokasiPenyerahan || "N/A"} title={address}>
          <span className="text-body-sm text-c57-outline line-clamp-1 mt-0.5 block uppercase tracking-wide">
            {address}
          </span>
        </SummaryTile>
        <SummaryTile
          icon="payments"
          label="Total Amount"
          value={`Rp ${order.perkiraanHarga?.toLocaleString("id-ID")}`}
          tone="positive"
        />
      </div>

      {order.catatan && (
        <div className="mb-space-lg p-space-lg bg-c57-surface-container rounded-c57-lg border border-c57-outline-variant">
          <p className="text-body-sm text-c57-on-surface-variant leading-relaxed font-medium">
            <span className="text-c57-primary font-semibold not-italic mr-2 uppercase tracking-widest font-label-sm">
              Catatan:
            </span>{" "}
            {order.catatan}
          </p>
        </div>
      )}

      {/* Cash: driver uploads physical proof of payment */}
      {order.paymentMethod === "Cash" && awaitingPayment && (
        <Card variant="inset" className="p-space-lg mb-space-lg">
          <div className="flex flex-wrap justify-between items-center gap-space-md">
            <div className="flex items-center gap-space-md">
              <span className="w-9 h-9 rounded-c57-md bg-c57-tertiary-container text-c57-on-tertiary-container flex items-center justify-center">
                <Icon name="warning" size="md" />
              </span>
              <h4 className="font-label-md uppercase tracking-wider text-c57-on-tertiary-container">
                Verifikasi Pembayaran Cash
              </h4>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={onToggleProof}>
              {proofOpen ? "Tutup" : "Klik Verifikasi"}
            </Button>
          </div>

          {proofOpen && (
            <div className="space-y-space-md pt-space-md mt-space-md border-t border-c57-surface-variant animate-fadeInUp">
              <div>
                <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-sm">
                  Upload Bukti Fisik
                </p>
                <div className="relative h-14 bg-c57-surface-container-lowest border border-c57-outline-variant rounded-c57-md flex items-center px-space-lg hover:border-c57-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload bukti pembayaran"
                    onChange={(e) => onPickProof(order.id, e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <Icon name="upload_file" size="md" className="text-c57-outline mr-space-md" />
                  <span className="text-body-sm text-c57-on-surface-variant truncate">
                    {proofFile?.name || "Pilih foto bukti pembayaran..."}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                onClick={onUploadProof}
                disabled={!proofFile}
                className="w-full"
                icon="check_circle"
              >
                Konfirmasi Sekarang
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Digital: gateway handles it, no upload */}
      {isDigitalPayment && awaitingPayment && (
        <Card variant="inset" className="p-space-lg mb-space-lg">
          <div className="flex items-center gap-space-lg">
            <span className="w-10 h-10 rounded-c57-md bg-c57-surface-container text-c57-primary flex items-center justify-center shrink-0">
              <Icon name="credit_card" size="xl" />
            </span>
            <div>
              <h4 className="font-label-md uppercase tracking-wider text-c57-on-surface">
                Pembayaran Digital
              </h4>
              <p className="text-body-sm text-c57-on-surface-variant mt-1">
                Verifikasi otomatis {order.paymentMethod} oleh sistem pusat.
              </p>
            </div>
          </div>
        </Card>
      )}

      {isActive ? (
        <ActiveActions
          order={order}
          isDelivery={isDelivery}
          paymentDone={paymentDone}
          onAdvance={onAdvance}
          client={client}
        />
      ) : (
        <InactiveActions
          order={order}
          claimable={claimable}
          currentUserId={currentUserId}
          onAccept={onAccept}
        />
      )}

    </Card>
  );
}

/**
 * The two-step in-progress flow: verify the vehicle, then run the trip and
 * verify payment. Only rendered for delivery jobs — Kantor and Titik Temu
 * pickups have no vehicle-checkout step.
 */
const ActiveActions = ({ order, isDelivery, paymentDone, onAdvance, client }) => {
  if (!isDelivery) return null;

  return (
    <div className="flex flex-col gap-space-md pt-space-lg border-t border-c57-surface-variant">
      <StepCard
        step={1}
        done={Boolean(order.vehicleVerificationBefore)}
        title="Verifikasi Mobil"
      >
        <Button
          as="a"
          href={`/vehicle-verification?orderId=${order.id}`}
          variant={order.vehicleVerificationBefore ? "secondary" : "primary"}
          size="sm"
          icon="photo_camera"
          className="w-full"
        >
          {order.vehicleVerificationBefore ? "Update Verifikasi" : "Mulai Verifikasi Mobil"}
        </Button>
      </StepCard>

      <StepCard step={2} done={paymentDone} title="Verifikasi Pembayaran">
        <div className="flex flex-col sm:flex-row gap-space-sm">
          {order.status === "disetujui" && (
            <Button
              type="button"
              onClick={() => onAdvance(order.id, "dalam perjalanan")}
              size="sm"
              icon="directions_car"
              className="flex-1"
            >
              Mulai Jalan
            </Button>
          )}
          {order.status === "dalam perjalanan" && (
            <Button
              type="button"
              variant="success"
              onClick={() => onAdvance(order.id, "menunggu pembayaran")}
              size="sm"
              icon="check_circle"
              className="flex-1"
            >
              Selesai Jalan
            </Button>
          )}
          <Button
            as="a"
            href={`/payment-verification?orderId=${order.id}`}
            variant={paymentDone ? "secondary" : "primary"}
            size="sm"
            icon="credit_card"
            className="flex-1"
          >
            Verifikasi Bayar
          </Button>
        </div>
      </StepCard>

      {order.status === "menunggu pembayaran" && order.paymentMethod !== "Cash" && (
        <Button
          type="button"
          variant="success"
          onClick={() => onAdvance(order.id, "selesai")}
          className="w-full"
          icon="done_all"
        >
          Konfirmasi Pembayaran Selesai (Digital)
        </Button>
      )}

      {order.status === "selesai" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => InvoiceGenerator.generateFullInvoice(order, client)}
          icon="description"
          className="w-full"
        >
          Cetak Invoice Penuh
        </Button>
      )}

      {order.status === "pembayaran berhasil" && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => InvoiceGenerator.generateDriverInvoice(order, client)}
          icon="description"
          className="w-full"
        >
          Cetak Invoice DP
        </Button>
      )}
    </div>
  );
}

/** Claim / already-taken / completed banner for the non-active tabs. */
function InactiveActions({ order, claimable, currentUserId, onAccept }) {
  const takenByOther = order.driverId && order.driverId !== currentUserId;

  return (
    <div className="pt-space-lg border-t border-c57-surface-variant">
      {claimable ? (
        <Button
          type="button"
          onClick={() => onAccept(order.id)}
          className="w-full"
          icon="directions_car"
        >
          Terima Order
        </Button>
      ) : takenByOther ? (
        <Pill variant="outline" icon="warning" size="md" className="w-full justify-center">
          Telah diambil driver lain
        </Pill>
      ) : order.status === "selesai" ? (
        <Pill variant="available" icon="check_circle" size="md" className="w-full justify-center">
          Order Completed
        </Pill>
      ) : null}
    </div>
  );
}

/** Numbered checklist step that fills in once its condition is met. */
function StepCard({ step, done, title, children }) {
  return (
    <div
      className={[
        "p-space-lg rounded-c57-lg border",
        done
          ? "bg-c57-available-bg border-c57-available-text/20"
          : "bg-c57-surface-container border-c57-surface-variant",
      ].join(" ")}
    >
      <div className="flex justify-between items-center mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span
            className={[
              "w-8 h-8 rounded-full flex items-center justify-center text-body-sm font-semibold",
              done
                ? "bg-c57-available-text text-c57-on-primary"
                : "bg-c57-primary-container text-c57-on-primary",
            ].join(" ")}
            aria-hidden="true"
          >
            {step}
          </span>
          <h4
            className={[
              "font-label-md uppercase tracking-wider",
              done ? "text-c57-available-text" : "text-c57-on-surface",
            ].join(" ")}
          >
            {title}
          </h4>
        </div>
        {done && <Icon name="check_circle" size="sm" className="text-c57-available-text" filled />}
      </div>
      {children}
    </div>
  );
}

/** Icon + uppercase caption + value, the four-up summary row. */
function SummaryTile({ icon, label, value, title, tone = "default", className = "" }) {
  return (
    <div className={`flex items-start gap-space-md ${className}`}>
      <span
        className={[
          "p-space-sm rounded-c57-md border shrink-0",
          tone === "positive"
            ? "bg-c57-available-bg text-c57-available-text border-c57-available-text/20"
            : "bg-c57-surface-container text-c57-on-surface-variant border-c57-surface-variant",
        ].join(" ")}
      >
        <Icon name={icon} size="md" />
      </span>
      <div className="min-w-0">
        <p className="font-label-sm uppercase tracking-widest text-c57-outline mb-1">{label}</p>
        <p
          className={[
            "text-body-sm font-semibold truncate",
            tone === "positive" ? "text-c57-available-text" : "text-c57-on-surface",
          ].join(" ")}
          title={title}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
