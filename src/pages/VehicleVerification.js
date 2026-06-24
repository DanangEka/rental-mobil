import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Camera, FileText, AlertCircle, CheckCircle, X } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-12 text-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-red-100 mix-blend-multiply filter blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-slate-200 mix-blend-multiply filter blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 md:py-10 lg:py-12">
        <div className="mb-8 md:mb-10 animate-fadeInUp">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
             <Camera size={14} />
             <span>Fleet Standard Quality Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-3">Verifikasi Mobil</h1>
          <p className="text-slate-500 text-lg">Dokumentasi keadaan mobil untuk standar kualitas layanan.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
          {/* Order List */}
          <div className="lg:col-span-1 space-y-4 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-[#990000] rounded-full"></div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Order Aktif</h2>
            </div>
            
            {orders.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-sm shadow-slate-200/50">
                <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Tidak ada order aktif</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-colors ${selectedOrder?.id === order.id ? (order.vehicleVerificationBefore ? 'bg-white/20 border-white/20 text-white' : 'bg-black/10 border-black/5 text-red-200') : (order.vehicleVerificationBefore ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400')}`}>
                          {order.vehicleVerificationBefore ? 'Sebelum ✓' : 'Sebelum'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-colors ${selectedOrder?.id === order.id ? (order.vehicleVerificationAfter ? 'bg-white/20 border-white/20 text-white' : 'bg-black/10 border-black/5 text-red-200') : (order.vehicleVerificationAfter ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400')}`}>
                          {order.vehicleVerificationAfter ? 'Sesudah ✓' : 'Sesudah'}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border shrink-0 ${selectedOrder?.id === order.id ? 'bg-black/10 border-white/10 text-white' : getStatusColor(order.status)}`}>
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
              <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
                <div className="px-6 md:px-10 py-5 md:py-8 border-b border-slate-50 bg-slate-50/50">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">
                    Update Kondisi: <span className="text-[#990000]">{selectedOrder.namaMobil}</span>
                  </h2>
                </div>

                <div className="p-4 sm:p-6 md:p-8">
                  {/* Verification Type Toggle */}
                  <div className="mb-10">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block mb-4">Jenis Verifikasi</label>
                    <div className="flex p-2 bg-slate-50 rounded-2xl border border-slate-100 w-fit">
                      <button
                        onClick={() => setVerificationType("before")}
                        className={`px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          verificationType === "before"
                            ? "bg-[#990000] text-white shadow-lg shadow-red-900/20 active:scale-95"
                            : "text-slate-400 hover:text-slate-900 hover:bg-white"
                        }`}
                      >
                        Sebelum Sewa
                      </button>
                      <button
                        onClick={() => setVerificationType("after")}
                        className={`px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          verificationType === "after"
                            ? "bg-[#990000] text-white shadow-lg shadow-red-900/20 active:scale-95"
                            : "text-slate-400 hover:text-slate-900 hover:bg-white"
                        }`}
                      >
                        Sesudah Sewa
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Notes Field */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Catatan Kondisi Mobil</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Baret halus di bemper depan kanan, BBM 50%, Interior bersih..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-8 py-6 text-sm font-bold text-slate-800 focus:border-[#990000] outline-none transition-all placeholder:text-slate-300 min-h-[160px]"
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
                        <div className="border-2 border-dashed border-slate-200 hover:border-[#990000] rounded-[2.5rem] p-10 text-center bg-slate-50/50 transition-all group-hover:bg-red-50/30">
                          <Camera className="h-12 w-12 text-slate-200 mx-auto mb-4 transition-colors group-hover:text-[#990000]" />
                          <div className="bg-[#990000] text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3 shadow-lg shadow-red-900/10">Pilih Media</div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Upload bukti kondisi fisik mobil</p>
                        </div>
                      </div>

                      {/* Media Preview Grid */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 pt-6">
                          {photos.map((photo, index) => (
                            <div key={index} className="relative group animate-fadeInUp" style={{ animationDelay: `${index * 0.05}s` }}>
                              <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] p-5 flex flex-col items-center justify-center h-36 overflow-hidden shadow-inner">
                                <FileText className="h-10 w-10 text-slate-200 mb-3 group-hover:text-[#990000] transition-colors" />
                                <p className="text-[9px] text-slate-400 font-black uppercase truncate w-full text-center tracking-tighter">
                                  {photo.name}
                                </p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                                className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-transform hover:scale-110 active:scale-95 z-20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Section */}
                    <div className="pt-10">
                      <button
                        onClick={submitVerification}
                        disabled={isSubmitting || photos.length === 0}
                        className="w-full bg-[#990000] hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-300 text-white font-black py-6 rounded-[2rem] tracking-widest text-[11px] uppercase transition-all shadow-xl shadow-red-900/10 relative overflow-hidden group active:scale-95"
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
                              Simpan & Perbarui Verifikasi
                            </>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </button>
                      <p className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-6">
                        Data akan disimpan ke sistem verifikasi operasional Cakra Lima Tujuh
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 flex flex-col items-center justify-center min-h-[500px] shadow-xl shadow-slate-200/50">
                <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                  <Camera className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight uppercase tracking-widest">Pilih Tugas Aktif</h3>
                <p className="text-slate-500 max-w-xs mx-auto text-[13px] font-bold leading-relaxed">
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
