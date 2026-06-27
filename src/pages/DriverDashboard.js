import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { ClipboardList, CheckCircle, Clock, DollarSign, MapPin, Gauge, ChevronRight } from "lucide-react";
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
      let totalCount = 0;

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

        // Calculate stats for logged-in driver's personal performance
        if (order.driverId === user.uid) {
          totalCount++;
          if (["selesai", "lunas", "cash_submitted"].includes(order.status)) {
            completedCount++;
            totalEarnings += order.perkiraanHarga || 0;
          } else if (["disetujui", "dalam perjalanan", "menunggu pembayaran"].includes(order.status)) {
            activeCount++;
          }
        }

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
        totalOrders: totalCount,
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
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-12 text-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-red-100 mix-blend-multiply filter blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200 mix-blend-multiply filter blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-10 lg:py-12">
        <div className="mb-8 md:mb-10 animate-fadeInUp">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
             <Gauge size={14} />
             <span>Driver Control Dashboard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3">Dashboard Driver</h1>
          <p className="text-slate-500 text-lg">Ringkasan operasional dan order tersedia untuk Anda.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          {[
            { label: "Total Order", value: stats.totalOrders, icon: <ClipboardList className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { label: "Order Aktif", value: stats.activeOrders, icon: <Clock className="h-5 w-5" />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Order Selesai", value: stats.completedOrders, icon: <CheckCircle className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Total Pendapatan", value: `Rp ${stats.totalEarnings.toLocaleString()}`, icon: <DollarSign className="h-5 w-5" />, color: "text-[#990000]", bg: "bg-red-50", border: "border-red-100" },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  {stat.icon}
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Recent Orders Section */}
        <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#990000] rounded-full"></div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Order Terbaru Tersedia</h2>
            </div>
            <div className="bg-red-50 text-[#990000] text-[10px] font-black px-4 py-2 rounded-full border border-red-100 uppercase tracking-widest">
              {orders.length} Order Tersedia
            </div>
          </div>

          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-16 text-center border border-gray-100 shadow-sm shadow-slate-200/50">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <ClipboardList className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Belum Ada Order</h3>
                <p className="text-slate-500 max-w-xs mx-auto">Saat ini tidak ada order penyewaan yang tersedia untuk diambil.</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:border-[#990000]/30 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Armada</div>
                          <div className="text-sm font-black text-slate-900">{order.namaMobil}</div>
                          {order.status === "approve sewa" && (
                            <div className="text-[8px] text-[#990000] font-black uppercase tracking-widest mt-1 bg-red-50 px-2 py-0.5 rounded border border-red-100 w-fit">Siap diambil (Cash)</div>
                          )}
                        </div>
                        <div className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-widest">
                          {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short'}) : '-'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-[#990000] shadow-sm">
                          {(users.find(u => u.id === order.uid)?.nama || order.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="text-[11px] font-bold text-slate-600 truncate">{users.find(u => u.id === order.uid)?.nama || order.email}</div>
                      </div>
                      <div className="flex items-start text-xs text-slate-400 mb-5">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-[#990000]/70 flex-shrink-0" />
                        <div>
                          <span className="font-black text-slate-700 text-[11px] block">{order.lokasiPenyerahan || "Lokasi Default"}</span>
                          <span className="text-[10px] text-slate-400 line-clamp-1 block mt-0.5 uppercase tracking-wide">{getFullAddress(order)}</span>
                        </div>
                      </div>
                      {(order.status === "approve sewa" || order.status === "pembayaran berhasil") && !order.driverId ? (
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          className="w-full bg-[#990000] hover:bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-red-900/10 active:scale-95"
                        >
                          Terima Order
                        </button>
                      ) : (
                        <div className="text-center bg-slate-50 py-3 rounded-xl border border-slate-100">
                          <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">
                            {order.driverId ? "Diambil Driver" : getStatusText(order.status)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-[2rem] border border-gray-200 overflow-hidden shadow-sm">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobil</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Client</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                        <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.slice(0, 10).map((order) => (
                        <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="text-[13px] font-black text-slate-900 group-hover:text-[#990000] transition-colors">{order.namaMobil}</div>
                            {order.status === "approve sewa" && (
                               <div className="text-[8px] text-[#990000] font-black uppercase tracking-widest mt-1 bg-red-50 px-2 py-0.5 rounded border border-red-100 w-fit">Siap diambil (Cash)</div>
                            )}
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[11px] font-black text-[#990000] mr-3 overflow-hidden shadow-inner uppercase">
                                {(users.find(u => u.id === order.uid)?.nama || order.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="text-[12px] font-bold text-slate-600">
                                {users.find(u => u.id === order.uid)?.nama || (order.email ? order.email.split('@')[0] : 'Unknown')}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-start text-xs text-slate-500">
                              <MapPin className="h-4 w-4 mr-2 mt-0.5 text-[#990000]/70" />
                              <div>
                                <span className="font-black text-slate-700 block text-[11px]">{order.lokasiPenyerahan || "Lokasi Default"}</span>
                                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={getFullAddress(order)}>
                                  {getFullAddress(order)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-tighter">
                              {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap text-center">
                            {(order.status === "approve sewa" || order.status === "pembayaran berhasil") && !order.driverId ? (
                              <button
                                onClick={() => handleAcceptOrder(order.id)}
                                className="bg-[#990000] hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/10 hover:scale-105 active:scale-95"
                              >
                                Terima Order
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                {order.driverId ? "Diambil Driver" : getStatusText(order.status)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
