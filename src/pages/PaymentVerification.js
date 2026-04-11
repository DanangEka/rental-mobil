// PaymentVerification.js - Updated to fix composite index error (v2.0)
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { CreditCard, Upload, DollarSign, CheckCircle, Camera, FileText } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";

export default function PaymentVerification() {
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
        const { getDoc, doc } = await import("firebase/firestore");
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
        // Use getDocs instead of onSnapshot to avoid real-time listener issues
        const { getDocs } = await import("firebase/firestore");
        const querySnapshot = await getDocs(collection(db, "pemesanan"));

        const ordersData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter by driverId and status client-side to completely avoid composite index
          if (data.driverId === user.uid && ["disetujui", "dalam perjalanan", "menunggu pembayaran"].includes(data.status)) {
            ordersData.push({ id: doc.id, ...data });
          }
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
    setPaymentPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPaymentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitPaymentVerification = async () => {
    if (!selectedOrder || !paymentAmount) {
      alert("Mohon lengkapi semua field yang diperlukan");
      return;
    }

    // For cash payments, require photos
    if (paymentMethod === "cash" && paymentPhotos.length === 0) {
      alert("Untuk pembayaran cash, mohon upload minimal 1 foto bukti pembayaran");
      return;
    }

    const amount = parseInt(paymentAmount);
    const expectedDP = Math.floor(selectedOrder.perkiraanHarga * 0.5);
    if (amount !== expectedDP) {
      alert(`Jumlah pembayaran (Rp ${amount.toLocaleString()}) tidak sesuai dengan DP 50% yang seharusnya (Rp ${expectedDP.toLocaleString()}) dari total Rp ${selectedOrder.perkiraanHarga.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create payment verification record
      const paymentData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        userId: selectedOrder.uid, // Add userId for reference
        amount: amount,
        method: paymentMethod,
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
        await updateDoc(doc(db, "mobil", selectedOrder.mobilId), {
          tersedia: true,
          status: "normal"
        });
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

      alert("Verifikasi pembayaran berhasil! Order telah selesai.");
    } catch (error) {
      console.error("Error submitting payment verification:", error);
      alert("Terjadi kesalahan saat menyimpan verifikasi pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "dalam perjalanan":
        return "bg-yellow-100 text-yellow-800";
      case "menunggu pembayaran":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "dalam perjalanan":
        return "Dalam Perjalanan";
      case "menunggu pembayaran":
        return "Menunggu Pembayaran";
      default:
        return status;
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case "Cash":
        return "bg-green-100 text-green-800";
      case "Transfer Bank":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "Cash":
        return "Tunai";
      case "Transfer Bank":
        return "Transfer Bank";
      default:
        return method || "Tidak ada info";
    }
  };

  return (
    <div className="min-h-screen bg-black pt-[72px] relative overflow-hidden text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/20 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-10 animate-fadeInUp">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Verifikasi Pembayaran</h1>
          <p className="text-gray-400 text-lg font-medium">Lakukan verifikasi bukti pembayaran untuk menyelesaikan order.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Order List */}
          <div className="lg:col-span-1 space-y-4 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Order Sedang Berlangsung</h2>
            </div>
            
            {orders.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-3xl p-8 text-center border border-gray-800 border-dashed">
                <CreditCard className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-bold text-sm">Tidak ada order aktif</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    const dpAmount = Math.floor(order.perkiraanHarga * 0.5);
                    setPaymentAmount(dpAmount.toString());
                    setPaymentMethod(order.paymentMethod || "cash");
                  }}
                  className={`glass-card p-5 rounded-3xl cursor-pointer transition-all duration-300 border ${
                    selectedOrder?.id === order.id
                      ? "bg-brand-500/10 border-brand-500/50 shadow-brand-sm translate-x-2"
                      : "bg-gray-900/40 border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white text-base truncate mb-0.5">{order.namaMobil}</h3>
                      <p className="text-xs text-gray-500 font-bold truncate mb-3">{order.email}</p>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-green-400" />
                        <span className="text-sm font-black text-green-400 leading-none">
                          Rp {order.perkiraanHarga?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(order.status).replace('bg-', 'bg-opacity-20 bg-')}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${getPaymentMethodColor(order.paymentMethod).replace('bg-', 'bg-opacity-20 bg-')}`}>
                        {getPaymentMethodText(order.paymentMethod)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment Verification Form */}
          <div className="lg:col-span-2 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            {selectedOrder ? (
              <div className="glass-card bg-gray-900/60 rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
                <div className="px-8 py-6 border-b border-gray-800 bg-white/[0.02]">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Verifikasi Pembayaran: <span className="text-brand-400">{selectedOrder.namaMobil}</span>
                  </h2>
                </div>

                <div className="p-8">
                  {/* Order Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 bg-black/40 rounded-3xl p-6 border border-gray-800/50">
                    <div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Mobil & Client</span>
                      <p className="font-bold text-white text-sm">{selectedOrder.namaMobil}</p>
                      <p className="text-xs text-gray-400 font-medium">{selectedOrder.email}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Tanggal & Total</span>
                      <p className="font-bold text-white text-sm">
                        {selectedOrder.tanggalMulai ? new Date(selectedOrder.tanggalMulai).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : 'N/A'}
                      </p>
                      <p className="text-sm font-black text-green-400 mt-0.5">
                        Rp {selectedOrder.perkiraanHarga?.toLocaleString()}
                      </p>
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-gray-800/50">
                      <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block mb-1">DP 50% yang harus dibayar</span>
                      <p className="font-black text-brand-400 text-3xl tracking-tighter">
                        Rp {parseInt(paymentAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Payment Info Callout */}
                    <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4 flex gap-4">
                      <div className="h-10 w-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-400 shrink-0 border border-brand-500/20">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-200 text-sm">Info Pembayaran</p>
                        <p className="text-xs text-brand-400/80 font-medium mt-0.5 uppercase tracking-wider">
                          {getPaymentMethodText(selectedOrder.paymentMethod)}
                          {selectedOrder.paymentMethod === "Cash" && " • Diperlukan Foto Bukti Fisik"}
                          {selectedOrder.paymentMethod === "Transfer Bank" && " • Verifikasi Otomatis Tersedia"}
                        </p>
                      </div>
                    </div>

                    {/* Form Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Metode Pembayaran</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none appearance-none cursor-pointer"
                          disabled={selectedOrder.status === "menunggu pembayaran"}
                        >
                          <option value="cash">Tunai (Cash)</option>
                          <option value="transfer">Transfer Bank</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Jumlah Diterima (Rp)</label>
                        <input
                          type="text"
                          value={parseInt(paymentAmount).toLocaleString()}
                          readOnly
                          className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-4 text-sm font-black text-green-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Photos - Only for Cash */}
                    {(paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash") && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block">Foto Bukti Pembayaran <span className="text-brand-500">*</span></label>
                        
                        <div className="relative group">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="payment-photo-upload"
                          />
                          <div className="border-2 border-dashed border-gray-800 hover:border-brand-500/50 rounded-[2rem] p-8 text-center bg-gray-900/20 transition-all group-hover:bg-brand-500/[0.02]">
                            <Camera className="h-10 w-10 text-gray-700 mx-auto mb-3 transition-colors group-hover:text-brand-500" />
                            <p className="text-sm font-bold text-gray-400">Pilih atau ambil foto bukti</p>
                            <p className="text-[10px] text-gray-600 font-black uppercase mt-2 tracking-widest">Minimal 1 foto diperlukan</p>
                          </div>
                        </div>

                        {/* Photo Previews */}
                        {paymentPhotos.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                            {paymentPhotos.map((photo, index) => (
                              <div key={index} className="relative group animate-fadeInUp">
                                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex flex-col items-center justify-center h-24 overflow-hidden">
                                  <FileText className="h-6 w-6 text-gray-600 group-hover:text-brand-400 transition-colors mb-2" />
                                  <p className="text-[10px] text-gray-500 font-black uppercase truncate w-full text-center tracking-tighter">
                                    {photo.name}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition-transform hover:scale-110 active:scale-95"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 4.293z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Catatan Tambahan (Opsional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Pembayaran lunas di awal, kembalian diserahkan, dll."
                        className="w-full bg-black/60 border border-gray-800 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:border-brand-500 outline-none transition-all placeholder:text-gray-700 min-h-[100px]"
                      />
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      <button
                        onClick={submitPaymentVerification}
                        disabled={
                          isSubmitting ||
                          !paymentAmount ||
                          ((paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash") && paymentPhotos.length === 0)
                        }
                        className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-5 rounded-[1.5rem] tracking-widest text-sm uppercase transition-all shadow-brand-sm group overflow-hidden relative"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                              Memproses Verifikasi...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              Konfirmasi & Selesaikan Order
                            </>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card bg-gray-900/40 rounded-[2.5rem] p-16 text-center border border-gray-800 flex flex-col items-center justify-center min-h-[400px]">
                <div className="h-20 w-20 bg-gray-800/50 rounded-full flex items-center justify-center text-gray-600 mb-6">
                  <CreditCard className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Pilih Order Terlebih Dahulu</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
                  Silakan pilih salah satu order aktif di panel kiri untuk mulai memproses verifikasi pembayaran.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
