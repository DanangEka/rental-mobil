// PaymentVerification.js - Updated to fix composite index error (v2.0)
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { CreditCard, DollarSign, CheckCircle, Camera, FileText } from "lucide-react";
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
    const clientDP = selectedOrder.dpAmount || Math.floor(selectedOrder.perkiraanHarga * 0.5);
    const expectedRemaining = selectedOrder.perkiraanHarga - clientDP;
    if (amount !== expectedRemaining) {
      alert(`Jumlah pembayaran (Rp ${amount.toLocaleString()}) tidak sesuai dengan sisa pembayaran yang harus diselesaikan (Rp ${expectedRemaining.toLocaleString()})`);
      return;
    }

    setIsSubmitting(true);
    try {
      let proofUrl = null;
      if (paymentPhotos.length > 0) {
        const formData = new FormData();
        formData.append("file", paymentPhotos[0]);
        formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "rental-mobil");
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dnfruux8d"}/image/upload`, {
          method: "POST",
          body: formData
        });
        
        if (res.ok) {
          const data = await res.json();
          proofUrl = data.secure_url;
        } else {
          console.error("Cloudinary upload failed", await res.text());
        }
      }

      // Create payment verification record
      const paymentData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        userId: selectedOrder.uid, // Add userId for reference
        amount: amount,
        dpAmount: clientDP,
        totalAmount: selectedOrder.perkiraanHarga,
        method: paymentMethod,
        paymentProof: proofUrl, // Store direct image url
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
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-12 text-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-red-100 mix-blend-multiply filter blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200 mix-blend-multiply filter blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-10 lg:py-12">
        <div className="mb-8 md:mb-10 animate-fadeInUp">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
             <CreditCard size={14} />
             <span>Finance Settlement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3">Verifikasi Pembayaran</h1>
          <p className="text-slate-500 text-lg">Lakukan verifikasi bukti pembayaran untuk menyelesaikan order.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
          {/* Order List */}
          <div className="lg:col-span-1 space-y-4 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-[#990000] rounded-full"></div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Order Berlangsung</h2>
            </div>
            
            {orders.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-sm shadow-slate-200/50">
                <CreditCard className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Tidak ada order aktif</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    const clientDP = order.dpAmount || Math.floor(order.perkiraanHarga * 0.5);
                    const sisaBayar = order.perkiraanHarga - clientDP;
                    setPaymentAmount(sisaBayar.toString());
                    setPaymentMethod(order.paymentMethod || "cash");
                  }}
                  className={`p-6 rounded-[2rem] cursor-pointer transition-all duration-300 border ${
                    selectedOrder?.id === order.id
                      ? "bg-[#990000] border-[#990000] shadow-xl shadow-red-900/20 -translate-y-1"
                      : "bg-white border-slate-100 shadow-sm shadow-slate-200/50 hover:border-[#990000]/20"
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black tracking-tight text-base truncate mb-0.5 ${selectedOrder?.id === order.id ? 'text-white' : 'text-slate-900'}`}>{order.namaMobil}</h3>
                      <p className={`text-[10px] font-black uppercase tracking-widest truncate mb-4 ${selectedOrder?.id === order.id ? 'text-red-100' : 'text-slate-400'}`}>{order.email}</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className={`h-4 w-4 ${selectedOrder?.id === order.id ? 'text-white' : 'text-emerald-500'}`} />
                        <span className={`text-[15px] font-black leading-none ${selectedOrder?.id === order.id ? 'text-white' : 'text-emerald-600'}`}>
                          Rp {order.perkiraanHarga?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border ${selectedOrder?.id === order.id ? 'bg-black/10 border-white/10 text-white' : getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border ${selectedOrder?.id === order.id ? 'bg-white/10 border-white/10 text-white' : getPaymentMethodColor(order.paymentMethod)}`}>
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
              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="px-6 md:px-10 py-5 md:py-8 border-b border-slate-50 bg-slate-50/50">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
                    Verifikasi Pembayaran: <span className="text-[#990000]">{selectedOrder.namaMobil}</span>
                  </h2>
                </div>

                <div className="p-4 sm:p-6 md:p-8">
                  {/* Order Summary Grid */}
                  {/* Order Summary Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10 bg-slate-50 rounded-[2rem] p-8 md:p-10 border border-slate-100">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Mobil & Client</span>
                      <p className="font-black text-slate-900 text-[15px] uppercase tracking-tight">{selectedOrder.namaMobil}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedOrder.email}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tanggal & Total</span>
                      <p className="font-bold text-slate-700 text-[13px]">
                        {selectedOrder.tanggalMulai ? new Date(selectedOrder.tanggalMulai).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : 'N/A'}
                      </p>
                      <p className="text-[15px] font-black text-emerald-600 mt-1">
                        Rp {selectedOrder.perkiraanHarga?.toLocaleString()}
                      </p>
                    </div>
                    <div className="md:col-span-2 pt-6 border-t border-slate-200">
                      <span className="text-[10px] font-black text-[#990000] uppercase tracking-[0.2em] block mb-2">DP Diterima (Finance)</span>
                      <p className="font-black text-[#990000] text-3xl md:text-4xl tracking-tighter">
                        Rp {(selectedOrder.dpAmount || Math.floor(selectedOrder.perkiraanHarga * 0.5)).toLocaleString()}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Metode Pembayaran</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-5 text-sm font-black text-slate-800 focus:border-[#990000] focus:ring-1 focus:ring-[#990000] transition-all outline-none appearance-none cursor-pointer"
                          disabled={selectedOrder.status === "menunggu pembayaran"}
                        >
                          <option value="cash">Tunai (Cash)</option>
                          <option value="transfer">Transfer Bank</option>
                          <option value="other">Lainnya</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Jumlah Diterima (Rp)</label>
                        <input
                          type="text"
                          value={parseInt(paymentAmount).toLocaleString()}
                          readOnly
                          className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-5 text-sm font-black text-emerald-600 outline-none"
                        />
                      </div>
                    </div>

                    {/* Photos - Selalu Ada */}
                    {true && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block">
                          Foto Bukti Pembayaran {(paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash") && <span className="text-brand-500">*</span>}
                        </label>
                        
                        <div className="relative group">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            id="payment-photo-upload"
                          />
                          <div className="border-2 border-dashed border-slate-200 hover:border-[#990000] rounded-[2.5rem] p-10 text-center bg-slate-50/50 transition-all group-hover:bg-red-50/30">
                            <Camera className="h-12 w-12 text-slate-200 mx-auto mb-4 transition-colors group-hover:text-[#990000]" />
                            <div className="bg-[#990000] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3 shadow-lg shadow-red-900/10">Pilih Bukti</div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pilih atau ambil foto bukti fisik</p>
                          </div>
                        </div>

                        {/* Photo Previews */}
                        {paymentPhotos.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-4">
                            {paymentPhotos.map((photo, index) => (
                              <div key={index} className="relative group animate-fadeInUp">
                                <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 flex flex-col items-center justify-center h-28 overflow-hidden shadow-inner">
                                  <FileText className="h-8 w-8 text-slate-200 group-hover:text-[#990000] transition-colors mb-2" />
                                  <p className="text-[9px] text-slate-400 font-black uppercase truncate w-full text-center tracking-tighter">
                                    {photo.name}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                                  className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110 active:scale-95 z-20"
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
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Catatan Tambahan (Opsional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Pembayaran lunas di awal, kembalian diserahkan, dll."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-8 py-6 text-sm font-bold text-slate-800 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300 min-h-[120px]"
                      />
                    </div>

                    {/* Action Button */}
                    <div className="pt-10">
                      <button
                        onClick={submitPaymentVerification}
                        disabled={
                          isSubmitting ||
                          !paymentAmount ||
                          ((paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash") && paymentPhotos.length === 0)
                        }
                        className="w-full bg-[#990000] hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-300 text-white font-black py-6 rounded-[2rem] tracking-widest text-[11px] uppercase transition-all shadow-xl shadow-red-900/10 group overflow-hidden relative active:scale-95"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-4">
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                              Processing...
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
              <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[450px] shadow-xl shadow-slate-200/50">
                <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                  <CreditCard className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight uppercase tracking-widest">Pilih Order</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-[13px] font-bold leading-relaxed">
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
