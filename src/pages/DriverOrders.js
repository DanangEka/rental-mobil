import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { CheckCircle, Clock, MapPin, Phone, Calendar, DollarSign } from "lucide-react";

export default function DriverOrders() {
  const [user, setUser] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch driver orders
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });

      // Separate active and completed orders
      const active = ordersData.filter(order =>
        ["disetujui", "dalam perjalanan", "menunggu pembayaran"].includes(order.status)
      );
      const history = ordersData.filter(order =>
        ["selesai", "dibatalkan"].includes(order.status)
      );

      setActiveOrders(active);
      setOrderHistory(history);
    });

    return () => unsubscribe();
  }, [user]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "pemesanan", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating order status:", error);
    }
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
      case "dibatalkan":
        return "bg-red-100 text-red-800";
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
      case "dibatalkan":
        return "Dibatalkan";
      default:
        return status;
    }
  };

  const OrderCard = ({ order, isActive = true }) => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{order.namaMobil}</h3>
          <p className="text-gray-600">{order.email}</p>
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
          <MapPin className="h-4 w-4 mr-2" />
          <span>{order.lokasiPenjemputan || 'Lokasi tidak tersedia'}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="h-4 w-4 mr-2" />
          <span>{order.noTelepon || 'No. telepon tidak tersedia'}</span>
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

      {isActive && (
        <div className="flex space-x-2">
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
          {order.status === "menunggu pembayaran" && (
            <button
              onClick={() => updateOrderStatus(order.id, "selesai")}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Konfirmasi Pembayaran
            </button>
          )}
        </div>
      )}
    </div>
  );

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
