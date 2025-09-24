import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDoc, getDocs } from "firebase/firestore";
import { ClipboardList, CheckCircle, Clock, DollarSign, TrendingUp, UserPlus, MapPin } from "lucide-react";

export default function DriverDashboard() {
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

        // Show latest orders that need driver assignment
        // Include orders that are approved and don't have a driver assigned yet
        const needsDriver = !order.driverId &&
          (order.status === "approve sewa" ||
           order.status === "disetujui" ||
           order.status === "pembayaran berhasil");

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
        await updateDoc(doc(db, "pemesanan", orderId), {
          driverId: user.uid,
          status: "disetujui",
          assignedAt: new Date().toISOString()
        });
        console.log("✅ Order updated successfully");
      } catch (updateError) {
        console.error("❌ Error updating order:", updateError);

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
        } else {
          alert(`Gagal menerima order. Error: ${updateError.message}`);
          return;
        }
      }

      // Send notification to admin
      console.log("Sending admin notification");
      try {
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          message: `Driver ${user.email} telah menerima order dari Driver Dashboard`,
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
            message: `Driver telah menerima order Anda. Mobil ${orderData.namaMobil} akan segera diantar.`,
            read: false,
            timestamp: serverTimestamp()
          });
          console.log("✅ Client notification sent");
        }
      } catch (clientNotifError) {
        console.error("❌ Error sending client notification:", clientNotifError);
        // Don't fail the whole process for notification errors
      }

      alert("Order berhasil diterima! Silakan cek email untuk detail lebih lanjut.");
    } catch (error) {
      console.error("❌ Error accepting order:", error);
      console.error("❌ Error details:", {
        code: error.code,
        message: error.message,
        orderId: orderId,
        user: user
      });
      alert(`Gagal menerima order. Error: ${error.message}`);
    }
  };

  const handleAcceptOrderWithoutProof = async (orderId) => {
    try {
      console.log("handleAcceptOrderWithoutProof called with orderId:", orderId);
      console.log("Current user:", user);

      if (!user || !user.uid) {
        alert("User tidak ditemukan. Silakan login kembali.");
        return;
      }

      if (!orderId) {
        alert("Order ID tidak valid.");
        return;
      }

      // Update order to assign driver and mark as ready for pickup (no payment proof needed)
      console.log("Updating order with driverId (no proof required):", user.uid);
      try {
        await updateDoc(doc(db, "pemesanan", orderId), {
          driverId: user.uid,
          status: "siap diambil",
          assignedAt: new Date().toISOString(),
          acceptedWithoutProof: true,
          acceptedAt: new Date().toISOString()
        });
        console.log("✅ Order updated successfully (no proof required)");
      } catch (updateError) {
        console.error("❌ Error updating order:", updateError);

        // If it's a permission error, try a different approach
        if (updateError.code === 'permission-denied') {
          console.log("🔄 Permission denied - trying alternative approach...");

          // Try to create a driver assignment record instead
          try {
            await addDoc(collection(db, "driver_assignments"), {
              orderId: orderId,
              driverId: user.uid,
              driverEmail: user.email,
              status: "accepted_without_proof",
              assignedAt: new Date().toISOString(),
              createdAt: serverTimestamp()
            });
            console.log("✅ Driver assignment record created (no proof required)");
          } catch (assignmentError) {
            console.error("❌ Error creating driver assignment:", assignmentError);
            alert("Gagal menerima order. Firestore rules belum diupdate. Silakan hubungi admin.");
            return;
          }
        } else {
          alert(`Gagal menerima order. Error: ${updateError.message}`);
          return;
        }
      }

      // Send notification to admin
      console.log("Sending admin notification");
      try {
        await addDoc(collection(db, "notifications"), {
          userId: "admin",
          message: `Driver ${user.email} telah menerima order tanpa bukti pembayaran dari Driver Dashboard`,
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
            message: `Driver telah menerima order Anda tanpa bukti pembayaran. Mobil ${orderData.namaMobil} siap untuk diambil.`,
            read: false,
            timestamp: serverTimestamp()
          });
          console.log("✅ Client notification sent");
        }
      } catch (clientNotifError) {
        console.error("❌ Error sending client notification:", clientNotifError);
        // Don't fail the whole process for notification errors
      }

      alert("Order berhasil diterima tanpa bukti pembayaran! Mobil siap untuk diambil.");
    } catch (error) {
      console.error("❌ Error accepting order without proof:", error);
      console.error("❌ Error details:", {
        code: error.code,
        message: error.message,
        orderId: orderId,
        user: user
      });
      alert(`Gagal menerima order. Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Driver</h1>
          <p className="text-gray-600 mt-2">Ringkasan Order dan Aktivitas Anda</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Order</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Order Aktif</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Order Selesai</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                <p className="text-2xl font-bold text-gray-900">Rp {stats.totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Order Terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            {orders.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Belum ada order</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lokasi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Harga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.namaMobil}
                        </div>
                        {order.status === "approve sewa" && (
                          <div className="text-xs text-blue-600 font-medium">Tersedia untuk diambil</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-start text-sm text-gray-900">
                          <MapPin className="h-4 w-4 mr-1 mt-0.5 text-gray-500 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{order.lokasiPenyerahan || "Belum ditentukan"}</div>
                            <div className="text-xs text-gray-600 max-w-xs truncate" title={getFullAddress(order)}>
                              {getFullAddress(order)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Rp {order.perkiraanHarga?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col gap-2">
                          {/* Office Location - Processed by Admin */}
                          {order.lokasiPenyerahan === "Kantor" && (
                            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium">
                              Diproses oleh Admin
                            </span>
                          )}

                          {/* Home or Meeting Point Location - Driver can accept */}
                          {(order.lokasiPenyerahan === "Rumah" || order.lokasiPenyerahan === "Titik Temu") && (
                            <>
                              {order.status === "approve sewa" && (
                                <>
                                  <button
                                    onClick={() => handleAcceptOrder(order.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Terima Order
                                  </button>
                                  <button
                                    onClick={() => handleAcceptOrderWithoutProof(order.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Terima Tanpa Bukti
                                  </button>
                                </>
                              )}
                              {order.status === "disetujui" && (
                                <button
                                  onClick={() => handleAcceptOrder(order.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Terima Order
                                </button>
                              )}
                              {order.status === "pembayaran berhasil" && (
                                <span className="text-gray-500 text-xs">Menunggu Driver</span>
                              )}
                            </>
                          )}

                          {/* Default case for other locations */}
                          {order.lokasiPenyerahan !== "Kantor" &&
                           order.lokasiPenyerahan !== "Rumah" &&
                           order.lokasiPenyerahan !== "Titik Temu" && (
                            <>
                              {order.status === "approve sewa" && (
                                <>
                                  <button
                                    onClick={() => handleAcceptOrder(order.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Terima Order
                                  </button>
                                  <button
                                    onClick={() => handleAcceptOrderWithoutProof(order.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Terima Tanpa Bukti
                                  </button>
                                </>
                              )}
                              {order.status === "disetujui" && (
                                <button
                                  onClick={() => handleAcceptOrder(order.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Terima Order
                                </button>
                              )}
                              {order.status === "pembayaran berhasil" && (
                                <span className="text-gray-500 text-xs">Menunggu Driver</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
