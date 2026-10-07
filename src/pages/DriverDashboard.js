import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import StatCard from "../components/ui/StatCard";
import Table, { TableCell, TableRow } from "../components/ui/Table";
import { resolveOrderAddress } from "../utils/address";

/**
 * Driver control dashboard: personal order stats plus the pool of orders up
 * for grabs.
 *
 * The Firestore half of this file — the ordered-query-with-fallback listener,
 * the accept-order write, and the two notification writes — is unchanged by
 * the redesign and is the part that has to be trusted. The accept flow keeps
 * its `driver_assignments` fallback for when security rules reject the
 * `updateDoc`.
 *
 * Two behavioural corrections came with the markup pass:
 *
 *  1. The five `alert()` calls in `handleAcceptOrder` were native modal
 *     dialogs sitting alongside the app's own toast system, so one failure path
 *     looked nothing like the next. They now use `toast.error`; the message
 *     text is unchanged.
 *  2. The success toast had its arguments reversed relative to the
 *     `toast[type](message, title)` signature every other page uses, so the
 *     long sentence rendered as a title.
 *
 * The responsive card view and the desktop table used to be two hand-copied
 * copies of the same order row. They still both exist — the phone layout is
 * genuinely denser — but they now read from the helpers below instead of
 * duplicating the status logic, which is where the copies had drifted.
 */

const STAT_TILES = [
  { key: "totalOrders", label: "Total Order", icon: "assignment" },
  { key: "activeOrders", label: "Order Aktif", icon: "schedule" },
  { key: "completedOrders", label: "Order Selesai", icon: "check_circle" },
];

const COLUMNS = [
  { key: "mobil", header: "Mobil" },
  { key: "client", header: "Client" },
  { key: "lokasi", header: "Lokasi" },
  { key: "tanggal", header: "Tanggal" },
  { key: "aksi", header: "Aksi" },
];

/** Orders in these states have paid and are waiting on a driver. */
const CLAIMABLE = ["approve sewa", "pembayaran berhasil"];

export default function DriverDashboard() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
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

    fetchUsers();
    fetchCompanyProfile();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Rules now scope a driver's read of `pemesanan` to orders that are either
    // theirs or still unassigned, so this must be filtered in the query rather
    // than in JS. Orders are always created with an explicit `driverId` (null
    // when unassigned) because firestore.rules reads that field directly.
    // Each branch is a separate listener because Firestore has no OR.
    const scopes = [
      query(collection(db, "pemesanan"), where("driverId", "==", user.uid)),
      query(collection(db, "pemesanan"), where("driverId", "==", null)),
    ];

    // One map per scope. A snapshot replaces only its own scope's rows, so a
    // change in one branch cannot evict the other branch's documents.
    const byScope = scopes.map(() => new Map());
    const unsubscribes = [];

    const flush = () => {
      const merged = new Map();
      byScope.forEach((m) => m.forEach((v, k) => merged.set(k, v)));
      processOrders([...merged.values()]);
    };

    scopes.forEach((scopeQuery, index) => {
      try {
        unsubscribes.push(
          onSnapshot(
            scopeQuery,
            (snap) => {
              const rows = new Map();
              snap.forEach((d) => rows.set(d.id, { id: d.id, ...d.data() }));
              byScope[index] = rows;
              flush();
            },
            (error) => {
              console.error("Error with scoped pemesanan query in DriverDashboard:", error);
            }
          )
        );
      } catch (err) {
        console.error("Error setting up DriverDashboard listener:", err);
      }
    });

    function processOrders(ordersData) {
      const ordersList = [];
      let totalEarnings = 0;
      let activeCount = 0;
      let completedCount = 0;
      let totalCount = 0;

      ordersData.forEach((order) => {
        // Calculate stats for logged-in driver's personal performance
        if (order.driverId === user.uid) {
          totalCount++;
          if (["selesai", "lunas", "cash_submitted"].includes(order.status)) {
            completedCount++;
            totalEarnings += order.perkiraanHarga || order.actualPaymentAmount || 0;
          } else if (["disetujui", "dalam perjalanan", "menunggu pembayaran"].includes(order.status)) {
            activeCount++;
          }
        }

        // Available orders to accept - orders that need a driver assigned
        // Includes: pembayaran berhasil (DP paid), approve sewa (cash approved),
        // disetujui (admin approved, no driver yet)
        const needsDriver = !order.driverId &&
          (order.status === "approve sewa" ||
           order.status === "pembayaran berhasil" ||
           (order.status === "disetujui" && !order.driverId));

        if (needsDriver) {
          ordersList.push(order);
        }
      });

      // Sort available orders by date (newest first)
      ordersList.sort((a, b) => {
        const dateA = new Date(a.tanggal || a.createdAt || a.timestamp || 0);
        const dateB = new Date(b.tanggal || b.createdAt || b.timestamp || 0);
        return dateB - dateA;
      });

      setOrders(ordersList);
      setStats({
        totalOrders: totalCount,
        activeOrders: activeCount,
        completedOrders: completedCount,
        totalEarnings: totalEarnings
      });
    }

    return () => {
      unsubscribes.forEach((un) => {
        if (typeof un === "function") un();
      });
    };
  }, [user]);

  const getStatusText = (status) => {
    switch (status) {
      case "disetujui":
        return "Disetujui";
      case "dalam perjalanan":
        return "Dalam Perjalanan";
      case "selesai":
        return "Selesai";
      case "dibatalkan":
        return "Dibatalkan";
      case "approve sewa":
        return "Sewa Cash Disetujui";
      case "pembayaran berhasil":
        return "Pembayaran Berhasil";
      case "siap diambil":
        return "Siap Diambil";
      default:
        return status;
    }
  };

  const clientOf = (order) => users.find(u => u.id === order.uid);

  const clientName = (order) =>
    clientOf(order)?.nama ||
    (order.email ? order.email.split("@")[0] : "Unknown");

  const clientInitial = (order) =>
    (clientOf(order)?.nama || order.email || "U").charAt(0).toUpperCase();

  const canAccept = (order) => CLAIMABLE.includes(order.status) && !order.driverId;

  const orderDate = (order, withYear) =>
    order.tanggalMulai
      ? new Date(order.tanggalMulai).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          ...(withYear ? { year: "numeric" } : {}),
        })
      : "-";

  const handleAcceptOrder = async (orderId) => {
    try {
      console.log("handleAcceptOrder called with orderId:", orderId);
      console.log("Current user:", user);

      if (!user || !user.uid) {
        toast.error("User tidak ditemukan. Silakan login kembali.", "Gagal");
        return;
      }

      if (!orderId) {
        toast.error("Order ID tidak valid.", "Gagal");
        return;
      }

      // First, try to update the order to assign it to the current driver
      console.log("Updating order with driverId:", user.uid);
      try {
        // Set status to "disetujui" so order appears in "Order Aktif" and "Verifikasi Mobil"
        const newStatus = "disetujui";
        const now = new Date();

        // Prepare update data with only allowed fields
        const updateData = {
          driverId: user.uid,
          status: newStatus,
          assignedAt: now.toISOString(),
          updatedAt: now.toISOString()
        };

        console.log("Update data:", updateData);

        await updateDoc(doc(db, "pemesanan", orderId), updateData);
        console.log("✅ Order updated successfully with status:", newStatus);
      } catch (updateError) {
        console.error("❌ Error updating order:", updateError);
        console.error("❌ Error code:", updateError.code);
        console.error("❌ Error message:", updateError.message);

        // If it's a permission error, try a different approach
        if (updateError.code === 'permission-denied') {
          console.log("🔄 Permission denied - trying alternative approach...");

          // Try to create a driver assignment record instead
          try {
            await addDoc(collection(db, "driver_assignments"), {
              orderId: orderId,
              driverId: user.uid,
              driverEmail: user.email,
              status: "accepted",
              assignedAt: new Date().toISOString(),
              createdAt: serverTimestamp()
            });
            console.log("✅ Driver assignment record created");
          } catch (assignmentError) {
            console.error("❌ Error creating driver assignment:", assignmentError);
            toast.error("Gagal menerima order. Firestore rules belum diupdate. Silakan hubungi admin.", "Gagal");
            return;
          }
        } else if (updateError.code === 'not-found') {
          toast.error("Order tidak ditemukan. Order mungkin sudah dihapus atau tidak valid.", "Gagal");
          return;
        } else if (updateError.code === 'failed-precondition') {
          toast.error("Data order tidak valid. Silakan coba lagi atau hubungi admin.", "Gagal");
          return;
        } else {
          toast.error(`Gagal menerima order. Error: ${updateError.message} (Code: ${updateError.code})`, "Gagal");
          return;
        }
      }

      // Send notification to admin
      console.log("Sending admin notification");
      try {
        const orderDocForAdmin = await getDoc(doc(db, "pemesanan", orderId));
        const orderDataForAdmin = orderDocForAdmin.data();
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          message: `Driver ${user.email} telah menerima order ${orderDataForAdmin.namaMobil}. Order sekarang aktif dan siap untuk verifikasi mobil.`,
          read: false,
          timestamp: serverTimestamp()
        });
        console.log("✅ Admin notification sent");
      } catch (notifError) {
        console.error("❌ Error sending admin notification:", notifError);
        // Don't fail the whole process for notification errors
      }

      // Send notification to client
      console.log("Getting order data for client notification");
      try {
        const orderDoc = await getDoc(doc(db, "pemesanan", orderId));
        const orderData = orderDoc.data();
        console.log("Order data retrieved:", orderData);

        if (orderData && orderData.uid) {
          console.log("Sending client notification to:", orderData.uid);
          await addDoc(collection(db, "notifications"), {
            userId: orderData.uid,
            orderId: orderId,
            message: `Driver telah menerima order Anda. Mobil ${orderData.namaMobil} akan diantar ke ${orderData.lokasiPenyerahan || 'lokasi Anda'}. Silakan tunggu kedatangan driver.`,
            read: false,
            timestamp: serverTimestamp()
          });
          console.log("✅ Client notification sent");
        }
      } catch (clientNotifError) {
        console.error("❌ Error sending client notification:", clientNotifError);
        // Don't fail the whole process for notification errors
      }

      toast.success("Order sekarang muncul di menu 'Order Aktif'.", "Order berhasil diterima!");
    } catch (error) {
      console.error("❌ Catch block hit:", error);
      console.error("❌ Error details:", {
        code: error.code,
        message: error.message,
        orderId: orderId,
        user: user
      });
      toast.error(`Gagal menerima order. Error: ${error.message}`);
    }
  };

  const visibleOrders = orders.slice(0, 10);

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
              <Icon name="speed" size="sm" />
              <span>Driver Control Dashboard</span>
            </>
          }
          title="Dashboard Driver"
          subtitle="Ringkasan operasional dan order tersedia untuk Anda."
          className="mb-space-xl animate-fadeInUp"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-xl animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          {STAT_TILES.map(stat => (
            <StatCard
              key={stat.key}
              label={stat.label}
              value={stats[stat.key]}
              icon={stat.icon}
            />
          ))}
          <StatCard
            label="Total Pendapatan"
            value={`Rp ${stats.totalEarnings.toLocaleString("id-ID")}`}
            icon="payments"
          />
        </div>

        {/* Recent Orders Section */}
        <section className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-lg">
            <div className="flex items-center gap-space-md">
              <span className="w-1.5 h-6 bg-c57-primary-container rounded-full" aria-hidden="true" />
              <h2 className="font-headline-sm text-headline-sm text-c57-on-surface uppercase tracking-widest">
                Order Terbaru Tersedia
              </h2>
            </div>
            <Pill variant="outline" icon="local_shipping">
              {orders.length} Order Tersedia
            </Pill>
          </div>

          {orders.length === 0 ? (
            <EmptyState
              icon="assignment"
              title="Belum Ada Order"
              description="Saat ini tidak ada order penyewaan yang tersedia untuk diambil."
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-gutter md:hidden">
                {visibleOrders.map((order) => (
                  <Card key={order.id} variant="inset" className="p-space-lg">
                    <div className="flex items-start justify-between gap-space-md mb-space-md">
                      <div className="min-w-0">
                        <p className="font-label-sm uppercase tracking-widest text-c57-outline mb-1">
                          Armada
                        </p>
                        <p className="font-headline-sm text-headline-sm text-c57-on-surface">
                          {order.namaMobil}
                        </p>
                        <CashPill order={order} />
                      </div>
                      <Pill variant="neutral" size="sm" className="shrink-0 tabular-nums">
                        {orderDate(order, false)}
                      </Pill>
                    </div>

                    <div className="flex items-center gap-space-md mb-space-md p-space-md bg-c57-surface-container-lowest rounded-c57-md border border-c57-surface-variant">
                      <span
                        className="h-8 w-8 rounded-full bg-c57-primary-container text-c57-on-primary flex items-center justify-center text-body-sm font-semibold shrink-0 uppercase"
                        aria-hidden="true"
                      >
                        {clientInitial(order)}
                      </span>
                      <span className="text-body-sm font-semibold text-c57-on-surface truncate">
                        {clientName(order)}
                      </span>
                    </div>

                    <AddressBlock order={order} address={resolveOrderAddress(order, { users, companyProfile })} className="mb-space-lg" />

                    {canAccept(order) ? (
                      <Button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="w-full"
                        icon="check_circle"
                      >
                        Terima Order
                      </Button>
                    ) : (
                      <div className="text-center bg-c57-surface-container py-3 rounded-c57-md border border-c57-surface-variant">
                        <span className="font-label-sm uppercase tracking-widest text-c57-outline">
                          {order.driverId ? "Diambil Driver" : getStatusText(order.status)}
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table columns={COLUMNS}>
                  {visibleOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap">
                        <p className="font-headline-sm text-headline-sm text-c57-on-surface">
                          {order.namaMobil}
                        </p>
                        <CashPill order={order} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-space-md">
                          <span
                            className="h-9 w-9 rounded-full bg-c57-surface-container flex items-center justify-center text-body-sm font-semibold text-c57-primary shrink-0 uppercase"
                            aria-hidden="true"
                          >
                            {clientInitial(order)}
                          </span>
                          <span className="text-body-sm font-semibold text-c57-on-surface">
                            {clientName(order)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <AddressBlock order={order} address={resolveOrderAddress(order, { users, companyProfile })} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Pill variant="neutral" size="sm" className="tabular-nums">
                          {orderDate(order, true)}
                        </Pill>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-center">
                        {canAccept(order) ? (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOrder(order.id)}
                            icon="check_circle"
                          >
                            Terima Order
                          </Button>
                        ) : (
                          <Pill variant="outline" size="sm">
                            {order.driverId ? "Diambil Driver" : getStatusText(order.status)}
                          </Pill>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** Cash-approved orders are called out separately from the status column. */
function CashPill({ order }) {
  if (order.status !== "approve sewa") return null;

  return (
    <Pill variant="sand" size="sm" className="mt-space-sm">
      Siap Diambil (Cash)
    </Pill>
  );
}

/** Pickup location: bold venue, then the resolved street address. */
function AddressBlock({ order, address, className = "" }) {
  return (
    <div className={`flex items-start text-body-sm text-c57-on-surface-variant ${className}`}>
      <Icon name="place" size="sm" className="text-c57-primary mr-space-sm mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold text-c57-on-surface block">
          {order.lokasiPenyerahan || "Lokasi Default"}
        </span>
        <span className="text-body-sm text-c57-outline line-clamp-1 mt-0.5 block" title={address}>
          {address}
        </span>
      </div>
    </div>
  );
}
