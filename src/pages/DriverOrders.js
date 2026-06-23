import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, getDocs, addDoc } from "firebase/firestore";
import axios from "axios";
import { CheckCircle, Clock, MapPin, Phone, Calendar, DollarSign, UserPlus, Car, FileText, Upload, CreditCard, Building, ExternalLink, AlertCircle, Camera, Search, Filter, ClipboardList } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";
import { useToast } from "../components/Toast";
import { serverTimestamp } from "firebase/firestore";
import { sendWhatsApp } from "../services/fonnte";

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
        (order.status === "pembayaran berhasil" || order.status === "approve sewa") &&
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

      // If order is completed, update driver stats and make car available again
      if (newStatus === "selesai" && orderData.mobilId) {
        await updateDoc(doc(db, "mobil", orderData.mobilId), {
          tersedia: true,
          status: "normal"
        });
        console.log(`Car ${orderData.mobilId} made available again`);
        toast.success("Order Berhasil", "Status order telah diperbarui menjadi Selesai.");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Gagal", "Tidak dapat memperbarui status order.");
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      if (!user || !user.uid) {
        toast.error("Error", "User tidak ditemukan. Silakan login kembali.");
        return;
      }

      const orderRef = doc(db, "pemesanan", orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        toast.error("Error", "Order tidak ditemukan.");
        return;
      }

      const orderData = orderDoc.data();
      if (orderData.driverId) {
        toast.error("Error", "Order telah diambil oleh driver lain.");
        return;
      }

      const now = new Date();
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
🏠 *Alamat:* ${getFullAddress(orderData)}

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

      toast.success("Order Diterima", "Berhasil menerima order. Silakan cek Tugas Aktif.");
      setActiveTab("active");
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Error", "Terjadi kesalahan saat menerima order.");
    }
  };



  const handlePaymentProofUpload = async (orderId, order) => {
    if (!paymentProof[orderId]) {
      toast.warning("File Belum Dipilih", "Silakan pilih file bukti pembayaran terlebih dahulu.");
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

      toast.success("Berhasil", "Bukti pembayaran berhasil diunggah dan order telah diverifikasi!");

    } catch (error) {
      console.error("Error uploading payment proof:", error);
      toast.error("Gagal", "Terjadi kesalahan saat mengunggah bukti pembayaran. Silakan coba lagi.");
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
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "dalam perjalanan":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "menunggu pembayaran":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "selesai":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "lunas":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "dibatalkan":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "driver_verified":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "cash_submitted":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
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
      <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 hover:border-[#990000]/30 transition-all duration-300 p-6 md:p-8 lg:p-10 mb-8 animate-fadeInUp shadow-sm shadow-slate-200/50">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-[#990000] shadow-sm border border-red-100">
                <Car size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{order.namaMobil}</h3>
              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-0.5">{order.email}</p>
              {order.paymentMethod && (
                <div className="flex items-center mt-2.5 px-3 py-1 bg-slate-50 rounded-xl w-fit border border-slate-100">
                  <CreditCard className="h-3.5 w-3.5 mr-2 text-slate-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">{order.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>
          <span className={`px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border shadow-sm ${getStatusColor(order.status)}`}>
            {order.status === "selesai" ? "Order Selesai" : getStatusText(order.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-10 pt-8 border-t border-slate-50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-400 border border-slate-100">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rent Period</p>
              <p className="text-[13px] font-bold text-slate-700">
                {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString('id-ID', {day:'numeric', month:'short'}) : 'N/A'} - {order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString('id-ID', {day:'numeric', month:'short'}) : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-400 border border-slate-100">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Contact</p>
              <p className="text-[13px] font-bold text-slate-700 truncate max-w-[150px]">
                {client?.nomorTelepon || order.noTelepon || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 col-span-1 sm:col-span-2 lg:col-span-1">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-400 border border-slate-100">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
              <p className="text-[13px] font-black text-slate-900 line-clamp-1">{order.lokasiPenyerahan || 'N/A'}</p>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 uppercase tracking-wide font-medium" title={getFullAddress(order)}>{getFullAddress(order)}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
              <DollarSign size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
              <p className="text-[15px] font-black text-emerald-600">Rp {order.perkiraanHarga?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {order.catatan && (
          <div className="mb-8 md:mb-10 p-5 bg-red-50/50 rounded-[1.5rem] border border-red-100/50 italic">
            <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
              <span className="text-[#990000] font-black not-italic mr-2 uppercase tracking-widest text-[10px]">Catatan:</span> {order.catatan}
            </p>
          </div>
        )}

        {/* Payment Proof Section - Only show for cash payments */}
        {order.paymentMethod === "Cash" && order.status === "menunggu pembayaran" && (
          <div className="mb-6 md:mb-8 p-4 md:p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl md:rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400">
                    <AlertCircle size={20} />
                 </div>
                 <h4 className="font-bold text-yellow-500 uppercase tracking-wider text-sm">Verifikasi Pembayaran Cash</h4>
              </div>
              <button
                onClick={() => togglePaymentSection(order.id)}
                className="text-[11px] font-black uppercase tracking-widest px-4 py-1.5 bg-gray-800 text-gray-300 rounded-full hover:bg-yellow-500 hover:text-white transition-all"
              >
                {showPaymentSection[order.id] ? "Tutup" : "Klik Verifikasi"}
              </button>
            </div>

            {showPaymentSection[order.id] && (
              <div className="space-y-4 pt-4 border-t border-yellow-500/10 animate-fadeInUp">
                <div className="group relative">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 ml-1">Upload Bukti Fisik</label>
                  <div className="relative h-14 bg-black/40 border border-gray-700 rounded-xl flex items-center px-4 hover:border-yellow-500/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentProof(prev => ({ ...prev, [order.id]: e.target.files[0] }))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="h-5 w-5 text-gray-500 mr-3" />
                    <span className="text-sm text-gray-400 truncate">
                       {paymentProof[order.id]?.name || "Pilih foto bukti pembayaran..."}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handlePaymentProofUpload(order.id, order)}
                  className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-900/20"
                >
                  <CheckCircle className="h-5 w-5" />
                  Konfirmasi Sekarang
                </button>
              </div>
            )}
          </div>
        )}

        {/* Digital Payment Info - Hide upload for digital payments */}
        {isDigitalPayment && order.status === "menunggu pembayaran" && (
          <div className="mb-6 md:mb-8 p-4 md:p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl md:rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-blue-400 uppercase tracking-wider text-sm mb-1">Pembayaran Digital</h4>
                <p className="text-gray-400 text-sm">
                   Verifikasi otomatis {order.paymentMethod} oleh sistem pusat.
                </p>
              </div>
            </div>
          </div>
        )}

        {isActive ? (
          <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-800/50">
            {/* Action Buttons for Active Orders */}
            {(order.lokasiPenyerahan === "Rumah" || order.lokasiPenyerahan === "Titik Temu") && (
              <div className="flex flex-col gap-4 w-full">
                {/* Step 1: Vehicle Verification */}
                <div className={`p-4 rounded-2xl border ${order.vehicleVerificationBefore ? 'bg-green-500/10 border-green-500/30' : 'bg-brand-500/5 border-brand-500/20'}`}>
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${order.vehicleVerificationBefore ? 'bg-green-500 text-white' : 'bg-brand-500 text-white'}`}>1</div>
                        <h4 className={`text-sm font-bold ${order.vehicleVerificationBefore ? 'text-green-400' : 'text-brand-400'}`}>Verifikasi Mobil</h4>
                      </div>
                      {order.vehicleVerificationBefore && <CheckCircle size={16} className="text-green-400" />}
                   </div>
                   <a
                     href={`/vehicle-verification?orderId=${order.id}`}
                     className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${order.vehicleVerificationBefore ? 'bg-gray-800 text-gray-400' : 'bg-brand-600 hover:bg-brand-500 text-white'}`}
                   >
                     <Camera size={14} /> {order.vehicleVerificationBefore ? 'Update Verifikasi' : 'Mulai Verifikasi Mobil'}
                   </a>
                </div>

                {/* Step 2: Journey / Payment Verification */}
                <div className={`p-4 rounded-2xl border ${(order.status === "pembayaran berhasil" || order.status === "selesai" || order.status === "lunas") ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/5 border-orange-500/20'}`}>
                   <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${(order.status === "pembayaran berhasil" || order.status === "selesai" || order.status === "lunas") ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>2</div>
                        <h4 className={`text-sm font-bold ${(order.status === "pembayaran berhasil" || order.status === "selesai" || order.status === "lunas") ? 'text-green-400' : 'text-orange-400'}`}>Verifikasi Pembayaran</h4>
                      </div>
                      {(order.status === "pembayaran berhasil" || order.status === "selesai" || order.status === "lunas") && <CheckCircle size={16} className="text-green-400" />}
                   </div>
                   
                   <div className="flex gap-2">
                     {order.status === "disetujui" && (
                       <button
                         onClick={() => updateOrderStatus(order.id, "dalam perjalanan")}
                         className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                       >
                         <Car size={14} /> Mulai Jalan
                       </button>
                     )}
                     {order.status === "dalam perjalanan" && (
                       <button
                         onClick={() => updateOrderStatus(order.id, "menunggu pembayaran")}
                         className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                       >
                         <CheckCircle size={14} /> Selesai Jalan
                       </button>
                     )}
                     <a
                       href={`/payment-verification?orderId=${order.id}`}
                       className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${(order.status === "pembayaran berhasil" || order.status === "selesai" || order.status === "lunas") ? 'bg-gray-800 text-gray-400' : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'}`}
                     >
                       <CreditCard size={14} /> Verifikasi Bayar
                     </a>
                   </div>
                </div>

                {order.status === "menunggu pembayaran" && order.paymentMethod !== "Cash" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "selesai")}
                    className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all shadow-green-900/20"
                  >
                    Konfirmasi Pembayaran Selesai (Digital)
                  </button>
                )}
              </div>
            )}

            {/* Invoices */}
            {order.status === "pembayaran berhasil" && (
              <button
                onClick={() => InvoiceGenerator.generateDriverInvoice(order, client)}
                className="w-full py-3.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <FileText className="h-5 w-5" />
                Cetak Invoice DP
              </button>
            )}
            {order.status === "selesai" && (
              <button
                onClick={() => InvoiceGenerator.generateFullInvoice(order, client)}
                className="w-full py-3.5 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                <FileText className="h-5 w-5" />
                Cetak Invoice Penuh
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-800/50">
            {/* Action Buttons for Tab and Available Orders */}
            {(!order.driverId && (order.status === "disetujui" || order.status === "pembayaran berhasil" || order.status === "approve sewa")) ? (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <button
                  onClick={() => handleAcceptOrder(order.id)}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-brand-sm flex items-center justify-center gap-2"
                >
                  <Car size={18} /> Terima Order
                </button>
              </div>
            ) : order.driverId && order.driverId !== user?.uid ? (
              <span className="w-full py-3 px-4 bg-gray-800/30 text-gray-500 rounded-xl text-xs font-bold border border-gray-800 flex items-center justify-center gap-2 uppercase tracking-widest">
                <AlertCircle className="h-4 w-4" /> Telah diambil driver lain
              </span>
            ) : order.status === "selesai" ? (
              <span className="w-full py-3 px-4 bg-green-500/5 text-green-400 rounded-xl text-sm font-black border border-green-500/20 flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" /> ORDER COMPLETED
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-12 text-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-red-100 mix-blend-multiply filter blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200 mix-blend-multiply filter blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 md:py-10 lg:py-12">
        <div className="mb-8 md:mb-10 animate-fadeInUp">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
             <ClipboardList size={14} />
             <span>Order Management</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3">Manajemen Order</h1>
          <p className="text-slate-500 text-lg">Kelola tugas aktif dan pantau riwayat perjalanan Anda.</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 md:mb-12 bg-white p-2 rounded-[2rem] border border-slate-100 animate-fadeInUp shadow-xl shadow-slate-200/50 overflow-x-auto" style={{ animationDelay: "0.1s" }}>
          <nav className="flex space-x-2">
            {[
              { id: "available", label: "Order Baru", count: availableOrders.length, icon: <Car size={16} /> },
              { id: "active", label: "Tugas Aktif", count: activeOrders.length, icon: <Clock size={16} /> },
              { id: "history", label: "Riwayat", count: orderHistory.length, icon: <CheckCircle size={16} /> },
              { id: "all", label: "Semua", count: allOrders.length, icon: <Search size={16} /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 py-4 px-6 md:px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#990000] text-white shadow-lg shadow-red-900/20 active:scale-95"
                    : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`ml-1 px-2.5 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                   {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Available Orders */}
        {/* Available Orders */}
        {activeTab === "available" && (
          <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-8">
               <div className="w-1.5 h-6 bg-[#990000] rounded-full"></div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Order Baru Tersedia</h2>
            </div>
            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-100 shadow-sm shadow-slate-200/50">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <Car className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Belum Ada Order Baru</h3>
                <p className="text-slate-500 max-w-xs mx-auto">Saat ini tidak ada order yang menunggu untuk diambil oleh driver.</p>
              </div>
            ) : (
              availableOrders.map((order) => (
                <OrderCard key={order.id} order={order} isActive={false} />
              ))
            )}
          </div>
        )}

        {/* All Orders */}
        {/* All Orders */}
        {activeTab === "all" && (
          <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-6 md:mb-8">
               <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
               <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Semua Order</h2>
            </div>
            {allOrders.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-16 text-center border border-gray-800">
                <Car className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Belum ada data order sama sekali.</p>
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
          <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-6 md:mb-8">
               <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
               <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Tugas Aktif</h2>
            </div>
            {activeOrders.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-16 text-center border border-gray-800">
                <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Tidak ada tugas aktif yang sedang Anda kerjakan.</p>
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
          <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-3 mb-6 md:mb-8">
               <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
               <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Riwayat Perjalanan</h2>
            </div>
            {orderHistory.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-16 text-center border border-gray-800">
                <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Anda belum memiliki riwayat order yang selesai.</p>
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
