import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, getDocs, addDoc } from "firebase/firestore";
import axios from "axios";
import { CheckCircle, Clock, MapPin, Phone, Calendar, DollarSign, UserPlus, Car, FileText, Upload, CreditCard, Building } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";

export default function DriverOrders() {
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("available");
  const [users, setUsers] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [paymentProof, setPaymentProof] = useState({});
  const [showPaymentSection, setShowPaymentSection] = useState({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Try to fetch users, but handle permission errors gracefully
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        // If permission denied, set empty array and continue
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

    // Only fetch users if we have a user and it's a driver
    if (user) {
      fetchUsers();
      fetchCompanyProfile();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch all orders from the same source as admin
    const fetchOrders = async () => {
      try {
        // Try with ordered query first
        const unsubscribe = onSnapshot(
          query(collection(db, "pemesanan"), orderBy("tanggal", "desc")),
          (querySnapshot) => {
            const ordersData = [];
            querySnapshot.forEach((doc) => {
              ordersData.push({ id: doc.id, ...doc.data() });
            });

            processOrders(ordersData);
          },
          (error) => {
            console.error("Error with ordered query:", error);
            // Fallback to unordered query if ordered query fails
            const unsubscribeFallback = onSnapshot(
              collection(db, "pemesanan"),
              (querySnapshot) => {
                const ordersData = [];
                querySnapshot.forEach((doc) => {
                  ordersData.push({ id: doc.id, ...doc.data() });
                });

                // Sort by date client-side as fallback
                ordersData.sort((a, b) => {
                  const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
                  const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
                  return dateB - dateA;
                });

                processOrders(ordersData);
              }
            );

            return unsubscribeFallback;
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error setting up orders listener:", error);
        return () => {};
      }
    };

    const processOrders = (ordersData) => {
      // Separate orders by status and driver assignment
      const available = ordersData.filter(order =>
        (order.status === "disetujui" || order.status === "pembayaran berhasil") &&
        !order.driverId // Only show orders without driver assigned
      );

      const active = ordersData.filter(order =>
        order.driverId === user.uid &&
        ["disetujui", "dalam perjalanan", "menunggu pembayaran"].includes(order.status)
      );

      const history = ordersData.filter(order =>
        order.driverId === user.uid &&
        ["selesai", "dibatalkan"].includes(order.status)
      );

      setAllOrders(ordersData);
      setAvailableOrders(available);
      setActiveOrders(active);
      setOrderHistory(history);
    };

    const unsubscribe = fetchOrders();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user]);

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

      // If order is completed, make car available again
      if (newStatus === "selesai" && orderData.mobilId) {
        await updateDoc(doc(db, "mobil", orderData.mobilId), {
          tersedia: true,
          status: "normal"
        });
        console.log(`Car ${orderData.mobilId} made available again`);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const handlePaymentProofUpload = async (orderId, order) => {
    if (!paymentProof[orderId]) {
      alert("Silakan pilih file bukti pembayaran terlebih dahulu.");
      return;
    }

    try {
      // Upload image to Cloudinary
      const formData = new FormData();
      formData.append("file", paymentProof[orderId]);
      formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData
      );

      const paymentProofURL = cloudinaryRes.data.secure_url;

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

      alert("Bukti pembayaran berhasil diunggah dan order telah diverifikasi!");

    } catch (error) {
      console.error("Error uploading payment proof:", error);
      alert("Terjadi kesalahan saat mengunggah bukti pembayaran. Silakan coba lagi.");
    }
  };

  const togglePaymentSection = (orderId) => {
    setShowPaymentSection(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "disetujui":
        return "bg-blue-100 text-blue-800";
      case "dalam perjalanan":
        return "bg-yellow-100 text-yellow-800";
      case "menunggu pembayaran":
        return "bg-orange-100 text-orange-800";
      case "selesai":
        return "bg-green-100 text-green-800";
      case "lunas":
        return "bg-emerald-100 text-emerald-800";
      case "dibatalkan":
        return "bg-red-100 text-red-800";
      case "driver_verified":
        return "bg-purple-100 text-purple-800";
      case "cash_submitted":
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
      case "menunggu pembayaran":
        return "Menunggu Pembayaran";
      case "selesai":
        return "Selesai";
      case "lunas":
        return "Lunas";
      case "dibatalkan":
        return "Dibatalkan";
      case "driver_verified":
        return "Driver Verified";
      case "cash_submitted":
        return "Cash Submitted";
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

  const OrderCard = ({ order, isActive = true }) => {
    // Get client data from users collection
    const client = users.find(u => u.id === order.uid);

    // Check if payment method is digital (transfer bank or QRIS)
    const isDigitalPayment = order.paymentMethod === "Transfer Bank" || order.paymentMethod === "E-Wallet";

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{order.namaMobil}</h3>
            <p className="text-gray-600">{order.email}</p>
            {order.paymentMethod && (
              <div className="flex items-center mt-1">
                <CreditCard className="h-4 w-4 mr-1 text-gray-500" />
                <span className="text-sm text-gray-500">{order.paymentMethod}</span>
              </div>
            )}
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString() : 'N/A'} - {order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="h-4 w-4 mr-2" />
            <span>{client?.nomorTelepon || order.noTelepon || 'No. telepon tidak tersedia'}</span>
          </div>
          <div className="flex items-start text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-900">{order.lokasiPenyerahan || 'Lokasi tidak ditentukan'}</div>
              <div className="text-xs text-gray-600 max-w-xs" title={getFullAddress(order)}>
                {getFullAddress(order)}
              </div>
            </div>
          </div>
          <div className="flex items-center text-sm font-semibold text-green-600">
            <DollarSign className="h-4 w-4 mr-2" />
            <span>Rp {order.perkiraanHarga?.toLocaleString()}</span>
          </div>
        </div>

        {order.catatan && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Catatan:</strong> {order.catatan}
            </p>
          </div>
        )}

        {/* Payment Proof Section - Only show for cash payments */}
        {order.paymentMethod === "Cash" && order.status === "menunggu pembayaran" && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-yellow-800">Verifikasi Pembayaran Cash</h4>
              <button
                onClick={() => togglePaymentSection(order.id)}
                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
              >
                {showPaymentSection[order.id] ? "Tutup" : "Verifikasi"}
              </button>
            </div>

            {showPaymentSection[order.id] && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-700 font-medium block mb-2">
                    Upload Bukti Pembayaran Cash
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentProof(prev => ({ ...prev, [order.id]: e.target.files[0] }))}
                    className="w-full bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg p-2 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-yellow-600 file:text-white hover:file:bg-yellow-700"
                  />
                </div>
                <button
                  onClick={() => handlePaymentProofUpload(order.id, order)}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload & Verifikasi Pembayaran
                </button>
              </div>
            )}
          </div>
        )}

        {/* Digital Payment Info - Hide upload for digital payments */}
        {isDigitalPayment && order.status === "menunggu pembayaran" && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h4 className="font-semibold text-blue-800">Pembayaran Digital</h4>
                <p className="text-sm text-blue-700">
                  Pembayaran melalui {order.paymentMethod} akan diverifikasi otomatis oleh sistem
                </p>
              </div>
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex flex-wrap gap-2">
            {/* Office Location - Processed by Admin */}
            {order.lokasiPenyerahan === "Kantor" && (
              <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium">
                Diproses oleh Admin
              </span>
            )}

            {/* Home or Meeting Point Location - Driver can manage */}
            {(order.lokasiPenyerahan === "Rumah" || order.lokasiPenyerahan === "Titik Temu") && (
              <>
                {order.status === "disetujui" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "dalam perjalanan")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mulai Perjalanan
                  </button>
                )}
                {order.status === "dalam perjalanan" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "menunggu pembayaran")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Selesai Perjalanan
                  </button>
                )}
                {order.status === "menunggu pembayaran" && order.paymentMethod !== "Cash" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "selesai")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Konfirmasi Pembayaran
                  </button>
                )}
                {order.status === "pembayaran berhasil" && (
                  <button
                    onClick={() => InvoiceGenerator.generateDriverInvoice(order, client)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Cetak Invoice DP
                  </button>
                )}
                {order.status === "selesai" && (
                  <button
                    onClick={() => InvoiceGenerator.generateFullInvoice(order, client)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Cetak Invoice Penuh
                  </button>
                )}
              </>
            )}

            {/* Default case for other locations */}
            {order.lokasiPenyerahan !== "Kantor" &&
             order.lokasiPenyerahan !== "Rumah" &&
             order.lokasiPenyerahan !== "Titik Temu" && (
              <>
                {order.status === "disetujui" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "dalam perjalanan")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mulai Perjalanan
                  </button>
                )}
                {order.status === "dalam perjalanan" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "menunggu pembayaran")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Selesai Perjalanan
                  </button>
                )}
                {order.status === "menunggu pembayaran" && order.paymentMethod !== "Cash" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "selesai")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Konfirmasi Pembayaran
                  </button>
                )}
                {order.status === "pembayaran berhasil" && (
                  <button
                    onClick={() => InvoiceGenerator.generateDriverInvoice(order, client)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Cetak Invoice DP
                  </button>
                )}
                {order.status === "selesai" && (
                  <button
                    onClick={() => InvoiceGenerator.generateFullInvoice(order, client)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Cetak Invoice Penuh
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Kelola tugas aktif dan riwayat order Anda</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "all"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Semua Order ({allOrders.length})
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Tugas Aktif ({activeOrders.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "history"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Riwayat Order ({orderHistory.length})
              </button>
            </nav>
          </div>
        </div>

        {/* All Orders */}
        {activeTab === "all" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Semua Order</h2>
            {allOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada order masuk</p>
              </div>
            ) : (
              allOrders.map((order) => (
                <OrderCard key={order.id} order={order} isActive={false} />
              ))
            )}
          </div>
        )}

        {/* Active Orders */}
        {activeTab === "active" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tugas Aktif</h2>
            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Tidak ada tugas aktif saat ini</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} isActive={true} />
              ))
            )}
          </div>
        )}

        {/* Order History */}
        {activeTab === "history" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Riwayat Order</h2>
            {orderHistory.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada riwayat order</p>
              </div>
            ) : (
              orderHistory.map((order) => (
                <OrderCard key={order.id} order={order} isActive={false} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
