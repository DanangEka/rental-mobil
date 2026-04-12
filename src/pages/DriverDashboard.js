import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { ClipboardList, CheckCircle, Clock, DollarSign, TrendingUp, UserPlus, MapPin, Search } from "lucide-react";
import { useToast } from "../components/Toast";

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

    return () => unsubscribe();
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (!user) return;

    // First, let's check all orders to see what's in the database
    // Try to order by tanggal, fallback to createdAt or timestamp
    let allOrdersQuery;
    try {
      allOrdersQuery = query(
        collection(db, "pemesanan"),
        orderBy("tanggal", "desc")
      );
    } catch (error) {
      console.log("tanggal field not found, trying createdAt");
      try {
        allOrdersQuery = query(
          collection(db, "pemesanan"),
          orderBy("createdAt", "desc")
        );
      } catch (error2) {
        console.log("createdAt field not found, trying timestamp");
        allOrdersQuery = query(
          collection(db, "pemesanan"),
          orderBy("timestamp", "desc")
        );
      }
    }

    const unsubscribeAll = onSnapshot(allOrdersQuery, (querySnapshot) => {
      console.log("=== ALL ORDERS IN DATABASE ===");
      console.log("Total orders in database:", querySnapshot.size);

      querySnapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        console.log("Order ID:", order.id, "Status:", order.status, "Payment Method:", order.paymentMethod, "Date:", order.tanggal);
      });
    });

    // First, let's find what status values actually exist in the database
    const statusAnalysisQuery = query(collection(db, "pemesanan"));
    const unsubscribeStatusAnalysis = onSnapshot(statusAnalysisQuery, (querySnapshot) => {
      console.log("🔍 === ANALYZING ALL ORDERS TO FIND CORRECT STATUSES ===");
      const statusCounts = {};
      const paymentMethods = {};
      const driverIdCounts = {};
      const allOrders = [];

      querySnapshot.forEach((doc) => {
        const order = doc.data();
        const status = order.status;
        const paymentMethod = order.paymentMethod;
        const driverId = order.driverId;

        statusCounts[status] = (statusCounts[status] || 0) + 1;
        if (paymentMethod) {
          paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + 1;
        }
        if (driverId !== undefined) {
          driverIdCounts[driverId] = (driverIdCounts[driverId] || 0) + 1;
        }

        allOrders.push({
          id: doc.id,
          status: status,
          paymentMethod: paymentMethod,
          driverId: driverId,
          uid: order.uid,
          namaMobil: order.namaMobil,
          tanggal: order.tanggal
        });

        console.log(`📋 Order ${doc.id}:`);
        console.log(`   Status: "${status}"`);
        console.log(`   Payment: "${paymentMethod}"`);
        console.log(`   Driver ID: "${driverId}"`);
        console.log(`   User ID: "${order.uid}"`);
        console.log(`   Car: "${order.namaMobil}"`);
        console.log(`   Date: "${order.tanggal}"`);
        console.log(`   ---`);
      });

      console.log("📊 Status distribution:", statusCounts);
      console.log("💳 Payment method distribution:", paymentMethods);
      console.log("🚗 Driver ID distribution:", driverIdCounts);
      console.log("📋 ALL ORDERS SUMMARY:", allOrders);

      // Find orders that should be available for drivers
      const availableOrders = allOrders.filter(order =>
        !order.driverId && // No driver assigned
        order.status &&
        !["selesai", "dibatalkan", "ditolak"].includes(order.status)
      );

      console.log("💡 ORDERS THAT SHOULD BE AVAILABLE FOR DRIVERS:");
      availableOrders.forEach(order => {
        console.log(`   ✅ ${order.id}: Status="${order.status}", Payment="${order.paymentMethod}"`);
      });

      if (availableOrders.length === 0) {
        console.log("❌ NO ORDERS AVAILABLE FOR DRIVERS");
        console.log("This could mean:");
        console.log("1. All orders have driverId assigned");
        console.log("2. All orders have status 'selesai', 'dibatalkan', or 'ditolak'");
        console.log("3. Firestore rules are blocking the query");
        console.log("4. Authentication issue");
      }
    });

    // Fetch latest orders that drivers can accept - show recent orders first
    let ordersQuery;

    console.log("🔍 Fetching latest orders for drivers...");

    // Get all orders and sort by date (newest first) - we'll filter client-side
    try {
      ordersQuery = query(
        collection(db, "pemesanan"),
        orderBy("tanggal", "desc")
      );
      console.log("✅ Querying orders ordered by date (newest first)");
    } catch (error) {
      console.log("❌ Error with date query:", error);
      try {
        // Fallback: try to get all orders without ordering
        ordersQuery = query(collection(db, "pemesanan"));
        console.log("✅ Querying all orders (will sort client-side)");
      } catch (error2) {
        console.log("❌ Error with fallback query:", error2);
        ordersQuery = query(collection(db, "pemesanan"));
      }
    }

    const unsubscribe = onSnapshot(ordersQuery, (querySnapshot) => {
      const ordersData = [];
      let totalEarnings = 0;
      let activeCount = 0;
      let completedCount = 0;

      console.log("=== DRIVER DASHBOARD ORDERS ===");
      console.log("Orders fetched:", querySnapshot.size);
      console.log("Query snapshot empty:", querySnapshot.empty);

      if (querySnapshot.empty) {
        console.log("❌ No orders found");
        console.log("This could mean:");
        console.log("1. No orders in database");
        console.log("2. Firestore rules are blocking the query");
        console.log("3. Authentication issue");
        console.log("4. Network connectivity issue");
      }

      querySnapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        console.log("📋 Order:", order.id, "Status:", order.status, "Payment Method:", order.paymentMethod, "Driver ID:", order.driverId);

        // Show orders that drivers can accept based on status and location
        // Orders with "approve sewa" (cash approved) or "pembayaran berhasil" (payment successful)
        // Exclude orders with location "Kantor" as they are handled by admin
        let needsDriver = false;

        // Skip orders that are already completed or rejected
        if (order.status === "lunas" || order.status === "selesai" ||
            order.status === "ditolak" || order.status === "tolak") {
          needsDriver = false;
        } else {
          // Show orders that are ready for driver assignment
          // 1. Orders with "approve sewa" (cash rental approved) OR "pembayaran berhasil" (payment successful)
          // 2. Location is not "Kantor" (admin handled)
          needsDriver = !order.driverId &&
            (order.status === "approve sewa" || order.status === "pembayaran berhasil") &&
            order.lokasiPenyerahan !== "Kantor";
        }

        if (needsDriver) {
          console.log("✅ Order available for driver:", order.id, "Status:", order.status, "Payment:", order.paymentMethod);
          ordersData.push(order);

          // Calculate stats
          if (order.status === "selesai") {
            completedCount++;
            totalEarnings += order.perkiraanHarga || 0;
          } else if (["disetujui", "dalam perjalanan", "approve sewa", "pembayaran berhasil"].includes(order.status)) {
            activeCount++;
          }
        } else {
          const reason = order.driverId ? "Has driver assigned" : "Wrong status: " + order.status;
          console.log("❌ Order not available for driver:", order.id, "Reason:", reason);
        }
      });

      // Sort orders by date (newest first) - client-side sorting
      ordersData.sort((a, b) => {
        const dateA = new Date(a.tanggal || a.createdAt || a.timestamp || 0);
        const dateB = new Date(b.tanggal || b.createdAt || b.timestamp || 0);
        return dateB - dateA;
      });

      console.log("📊 Available orders for driver:", ordersData.length);
      console.log("📊 Orders data:", ordersData.map(o => ({ id: o.id, status: o.status, paymentMethod: o.paymentMethod })));
      setOrders(ordersData);
      setStats({
        totalOrders: ordersData.length,
        activeOrders: activeCount,
        completedOrders: completedCount,
        totalEarnings: totalEarnings
      });
    }, (error) => {
      console.error("❌ Error in orders query:", error);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error message:", error.message);
    });

    return () => {
      unsubscribeAll();
      unsubscribeStatusAnalysis();
      unsubscribe();
    };
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case "disetujui":
        return "bg-blue-100 text-blue-800";
      case "dalam perjalanan":
        return "bg-yellow-100 text-yellow-800";
      case "selesai":
        return "bg-green-100 text-green-800";
      case "dibatalkan":
        return "bg-red-100 text-red-800";
      case "approve sewa":
        return "bg-purple-100 text-purple-800";
      case "pembayaran berhasil":
        return "bg-blue-100 text-blue-800";
      case "siap diambil":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

  const getFullAddress = (order) => {
    const client = users.find(u => u.id === order.uid);

    switch (order.lokasiPenyerahan) {
      case "Rumah":
        if (client) {
          const addressParts = [
            client.alamat,
            client.kelurahan,
            client.kecamatan,
            client.kabupaten,
            client.provinsi
          ].filter(part => part && part.trim() !== "");

          const rtRw = [];
          if (client.rt) rtRw.push(`RT ${client.rt}`);
          if (client.rw) rtRw.push(`RW ${client.rw}`);

          if (rtRw.length > 0) {
            addressParts.push(rtRw.join("/"));
          }

          return addressParts.length > 0 ? addressParts.join(", ") : "Alamat client tidak lengkap";
        }
        return "Alamat client tidak tersedia";
      case "Kantor":
        return companyProfile?.alamat || "Alamat perusahaan tidak tersedia";
      case "Titik Temu":
        return order.titikTemuAddress || "Alamat titik temu tidak tersedia";
      default:
        return "Lokasi tidak ditentukan";
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      console.log("handleAcceptOrder called with orderId:", orderId);
      console.log("Current user:", user);

      if (!user || !user.uid) {
        alert("User tidak ditemukan. Silakan login kembali.");
        return;
      }

      if (!orderId) {
        alert("Order ID tidak valid.");
        return;
      }

      // First, try to update the order to assign it to the current driver
      console.log("Updating order with driverId:", user.uid);
      try {
        // Check payment method to determine status
        const orderDoc = await getDoc(doc(db, "pemesanan", orderId));
        const orderData = orderDoc.data();
        const paymentMethod = orderData?.paymentMethod;

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
        console.log("Order data before update:", orderData);

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
            alert("Gagal menerima order. Firestore rules belum diupdate. Silakan hubungi admin.");
            return;
          }
        } else if (updateError.code === 'not-found') {
          alert("Order tidak ditemukan. Order mungkin sudah dihapus atau tidak valid.");
          return;
        } else if (updateError.code === 'failed-precondition') {
          alert("Data order tidak valid. Silakan coba lagi atau hubungi admin.");
          return;
        } else {
          alert(`Gagal menerima order. Error: ${updateError.message} (Code: ${updateError.code})`);
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

      toast.success("Order berhasil diterima!", "Order sekarang muncul di menu 'Order Aktif'.");
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

  return (
    <div className="min-h-screen bg-black pt-[72px] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/20 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 md:py-8 md:py-12">
        <div className="mb-6 md:mb-10 animate-fadeInUp">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Dashboard Driver</h1>
          <p className="text-gray-400 text-lg">Ringkasan operasional dan order tersedia untuk Anda.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          {[
            { label: "Total Order", value: stats.totalOrders, icon: <ClipboardList className="h-6 w-6" />, color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
            { label: "Order Aktif", value: stats.activeOrders, icon: <Clock className="h-6 w-6" />, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20" },
            { label: "Order Selesai", value: stats.completedOrders, icon: <CheckCircle className="h-6 w-6" />, color: "bg-green-500/20 text-green-400 border-green-500/20" },
            { label: "Total Pendapatan", value: `Rp ${stats.totalEarnings.toLocaleString()}`, icon: <DollarSign className="h-6 w-6" />, color: "bg-purple-500/20 text-purple-400 border-purple-500/20" },
          ].map((stat, idx) => (
            <div key={idx} className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-4 md:p-6 border border-gray-800 hover:border-gray-700 transition-all group">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-2xl ${stat.color} border group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Orders Section */}
        <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Order Terbaru Tersedia</h2>
            </div>
            <div className="bg-brand-500/10 text-brand-400 text-xs font-bold px-4 py-1.5 rounded-full border border-brand-500/20">
              {orders.length} Tersedia
            </div>
          </div>

          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-16 text-center border border-gray-800 border-dashed">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClipboardList className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Belum Ada Order</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Saat ini tidak ada order penyewaan yang tersedia untuk diambil.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Mobil</th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Client</th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Lokasi</th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Tanggal</th>
                      <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {orders.slice(0, 10).map((order) => (
                      <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 md:px-6 py-4 md:py-6 whitespace-nowrap">
                          <div className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors underline-offset-4 decoration-brand-500 decoration-2">{order.namaMobil}</div>
                          {order.status === "approve sewa" && (
                             <div className="text-[10px] text-brand-400 font-black uppercase tracking-tighter mt-1 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 w-fit">Siap diambil (Cash)</div>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-9 w-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 mr-3 overflow-hidden shadow-inner">
                              {(users.find(u => u.id === order.uid)?.nama || order.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="text-sm font-medium text-gray-300">
                              {users.find(u => u.id === order.uid)?.nama || order.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <div className="flex items-start text-sm text-gray-400">
                            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-brand-500/70" />
                            <div>
                              <span className="font-bold text-gray-200 block text-xs">{order.lokasiPenyerahan || "Lokasi Default"}</span>
                              <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5" title={getFullAddress(order)}>
                                {getFullAddress(order)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6 whitespace-nowrap">
                          <div className="text-xs font-bold text-gray-400 bg-gray-900/80 px-2.5 py-1 rounded-lg border border-gray-800">
                            {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6 whitespace-nowrap">
                          {(order.status === "approve sewa" || order.status === "pembayaran berhasil") && !order.driverId ? (
                            <button
                              onClick={() => handleAcceptOrder(order.id)}
                              className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-brand-sm hover:scale-105 active:scale-95"
                            >
                              Terima Order
                            </button>
                          ) : (
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-800">
                              {order.driverId ? "Diambil Driver" : getStatusText(order.status)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
