import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Camera, Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";

export default function VehicleVerification() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [verificationType, setVerificationType] = useState("before"); // "before" or "after"
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch orders that need vehicle verification
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      where("status", "in", ["disetujui", "dalam perjalanan", "menunggu pembayaran"]),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitVerification = async () => {
    if (!selectedOrder || photos.length === 0) {
      alert("Mohon pilih order dan upload foto terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create verification record
      const verificationData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        type: verificationType,
        notes: notes,
        photos: photos.map(photo => ({
          name: photo.name,
          size: photo.size,
          type: photo.type
        })),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "vehicleVerifications"), verificationData);

      // Update order with verification status
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        [`vehicleVerification${verificationType === "before" ? "Before" : "After"}`]: true,
        updatedAt: new Date()
      });

      // Reset form
      setSelectedOrder(null);
      setNotes("");
      setPhotos([]);
      setVerificationType("before");

      alert("Verifikasi berhasil disimpan!");
    } catch (error) {
      console.error("Error submitting verification:", error);
      alert("Terjadi kesalahan saat menyimpan verifikasi");
    } finally {
      setIsSubmitting(false);
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
      default:
        return status;
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 md:py-8 md:py-12">
        <div className="mb-6 md:mb-10 animate-fadeInUp">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl md:text-5xl font-black text-white tracking-tight mb-3">Verifikasi Mobil</h1>
          <p className="text-gray-400 text-lg font-medium">Dokumentasi keadaan mobil untuk standar kualitas layanan.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
          {/* Order List */}
          <div className="lg:col-span-1 space-y-4 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Order Aktif</h2>
            </div>
            
            {orders.length === 0 ? (
              <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 text-center border border-gray-800 border-dashed">
                <AlertCircle className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 font-bold text-sm">Tidak ada order aktif</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`glass-card p-5 rounded-2xl md:rounded-3xl cursor-pointer transition-all duration-300 border ${
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
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${order.vehicleVerificationBefore ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                          {order.vehicleVerificationBefore ? 'V. Sebelum ✓' : 'V. Sebelum'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${order.vehicleVerificationAfter ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                          {order.vehicleVerificationAfter ? 'V. Sesudah ✓' : 'V. Sesudah'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border shrink-0 ${getStatusColor(order.status).replace('bg-', 'bg-opacity-20 bg-')}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Verification Form */}
          <div className="lg:col-span-2 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            {selectedOrder ? (
              <div className="glass-card bg-gray-900/60 rounded-2xl md:rounded-[2.5rem] border border-gray-800 overflow-hidden shadow-2xl">
                <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-800 bg-white/[0.02]">
                  <h2 className="text-xl font-black text-white tracking-tight">
                    Update Kondisi: <span className="text-brand-400">{selectedOrder.namaMobil}</span>
                  </h2>
                </div>

                <div className="p-4 sm:p-6 md:p-8">
                  {/* Verification Type Toggle */}
                  <div className="mb-6 md:mb-10">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block mb-3">Jenis Verifikasi</label>
                    <div className="flex p-1.5 bg-black/60 rounded-2xl border border-gray-800 w-fit">
                      <button
                        onClick={() => setVerificationType("before")}
                        className={`px-4 md:px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                          verificationType === "before"
                            ? "bg-brand-600 text-white shadow-brand-sm"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Sebelum Sewa
                      </button>
                      <button
                        onClick={() => setVerificationType("after")}
                        className={`px-4 md:px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                          verificationType === "after"
                            ? "bg-brand-600 text-white shadow-brand-sm"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        Sesudah Sewa
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Notes Field */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Catatan Kondisi Mobil</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Baret halus di bemper depan kanan, BBM 50%, Interior bersih..."
                        className="w-full bg-black/60 border border-gray-800 rounded-[2rem] px-4 md:px-6 py-5 text-sm font-medium text-white focus:border-brand-500 outline-none transition-all placeholder:text-gray-700 min-h-[150px]"
                      />
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 block">Dokumentasi Visual (Foto/Video)</label>
                      
                      <div className="relative group">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          id="photo-upload"
                        />
                        <div className="border-2 border-dashed border-gray-800 hover:border-brand-500/50 rounded-2xl md:rounded-[2.5rem] p-5 sm:p-8 md:p-10 text-center bg-gray-900/20 transition-all group-hover:bg-brand-500/[0.02]">
                          <Camera className="h-12 w-12 text-gray-700 mx-auto mb-4 transition-colors group-hover:text-brand-500" />
                          <div className="bg-brand-500 text-white px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3 shadow-brand-sm">Pilih Media</div>
                          <p className="text-sm font-bold text-gray-400">Upload bukti kondisi fisik mobil</p>
                        </div>
                      </div>

                      {/* Media Preview Grid */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4">
                          {photos.map((photo, index) => (
                            <div key={index} className="relative group animate-fadeInUp" style={{ animationDelay: `${index * 0.05}s` }}>
                              <div className="bg-gray-900 border border-gray-800 rounded-2xl md:rounded-3xl p-4 flex flex-col items-center justify-center h-32 overflow-hidden shadow-inner">
                                <FileText className="h-8 w-8 text-gray-700 mb-2 group-hover:text-brand-400 transition-colors" />
                                <p className="text-[9px] text-gray-600 font-black uppercase truncate w-full text-center tracking-tighter">
                                  {photo.name}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                                className="absolute -top-1.5 -right-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1.5 shadow-lg transition-transform hover:scale-110 active:scale-95"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Section */}
                    <div className="pt-6">
                      <button
                        onClick={submitVerification}
                        disabled={isSubmitting || photos.length === 0}
                        className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black py-5 rounded-[2rem] tracking-widest text-sm uppercase transition-all shadow-brand-sm relative overflow-hidden group active:scale-95"
                      >
                        <div className="relative z-10 flex items-center justify-center gap-3">
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              Simpan & Update Verifikasi
                            </>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </button>
                      <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-4">
                        Data akan disimpan ke sistem verifikasi operasional
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] p-16 text-center border border-gray-800 flex flex-col items-center justify-center min-h-[450px]">
                <div className="h-24 w-24 bg-gray-800/50 rounded-full flex items-center justify-center text-gray-700 mb-6 md:mb-8 border border-gray-800/50">
                  <Camera className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Pilih Tugas Aktif</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium leading-relaxed">
                  Silakan pilih order dari daftar di panel kiri untuk mulai melakukan verifikasi kondisi kendaraan.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
