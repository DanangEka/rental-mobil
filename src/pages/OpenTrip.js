import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, Timestamp, increment, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { MapPin, Calendar, Clock, Car, Users, Ticket, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "../components/Toast";
import { useNavigate } from "react-router-dom";

export default function OpenTrip() {
  const toast = useToast();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [userData, setUserData] = useState(null);
  
  // Checkout State
  const [jumlahKursi, setJumlahKursi] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("Transfer Bank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    };
    fetchUserData();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "open_trips"), where("status", "in", ["Tersedia", "Penuh"]));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out past trips (optional but good practice)
      const now = new Date();
      const validTrips = data.filter(trip => new Date(trip.tanggalBerangkat) >= now);
      
      validTrips.sort((a, b) => new Date(a.tanggalBerangkat) - new Date(b.tanggalBerangkat));
      setTrips(validTrips);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat katalog Open Trip");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const openSewaModal = (trip) => {
    if (!auth.currentUser) {
      toast.warning("Silakan login untuk membooking tiket.");
      navigate("/login");
      return;
    }
    
    // User Verification
    if (userData?.verificationStatus !== "verified") {
      toast.error("Akun Anda belum diverifikasi.", "Silakan upload identitas di halaman profil.");
      return;
    }

    if (trip.kuotaTerisi >= trip.kapasitasMaks) {
      toast.error("Maaf, kuota untuk trip ini sudah penuh.");
      return;
    }

    setSelectedTrip(trip);
    setJumlahKursi(1); // reset
    setShowModal(true);
  };

  const handleBooking = async () => {
    if (jumlahKursi <= 0) return;
    const sisaKuota = selectedTrip.kapasitasMaks - selectedTrip.kuotaTerisi;
    if (jumlahKursi > sisaKuota) {
      toast.error(`Hanya tersisa ${sisaKuota} kursi.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const totalHarga = jumlahKursi * selectedTrip.hargaPerPax;
      
      // 1. Create order
      await addDoc(collection(db, "pemesanan"), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        namaClient: userData?.nama || userData?.namaLengkap || auth.currentUser.displayName || "",
        telepon: userData?.nomorTelepon || auth.currentUser.phoneNumber || "",
        tipe: "opentrip",
        openTripId: selectedTrip.id,
        namaMobil: selectedTrip.judul + " (" + selectedTrip.mobilUtama + ")",
        mobilId: selectedTrip.id, // using trip ID as mobil ID so history view doesn't break
        jumlahKursi: Number(jumlahKursi),
        perkiraanHarga: totalHarga,
        dpAmount: paymentMethod === "Transfer Bank" ? totalHarga * 0.5 : totalHarga, // or full payment
        status: paymentMethod === "Transfer Bank" ? "menunggu pembayaran" : "diproses", // Simulating cash vs tf
        paymentStatus: paymentMethod === "Transfer Bank" ? "pending" : "pending",
        paymentMethod: paymentMethod,
        tanggalMulai: selectedTrip.tanggalBerangkat,
        tanggalSelesai: selectedTrip.tanggalBerangkat, // 1 day trip usually
        tanggal: new Date().toISOString()
      });

      // 2. Update trip capacity
      const newKuota = selectedTrip.kuotaTerisi + Number(jumlahKursi);
      const isFull = newKuota >= selectedTrip.kapasitasMaks;
      
      await updateDoc(doc(db, "open_trips", selectedTrip.id), {
        kuotaTerisi: increment(jumlahKursi),
        status: isFull ? "Penuh" : "Tersedia"
      });

      // Also create notification
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        message: `Pesanan tiket Open Trip baru (${selectedTrip.judul}) 
          sebanyak ${jumlahKursi} pax dari ${auth.currentUser.email}`,
        read: false,
        timestamp: Timestamp.now()
      });

      toast.success("Hore! Tiket berhasil dipesan.", paymentMethod === "Transfer Bank" ? "Silakan menuju menu History Pesanan untuk pembayaran." : "Menunggu konfirmasi admin.");
      
      setShowModal(false);
      fetchTrips();
    } catch (err) {
      toast.error("Gagal memproses pemesanan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white pt-20 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="relative rounded-3xl overflow-hidden glass-card p-10 md:p-16 border border-gray-800 bg-gray-900/50">
          <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-brand-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <span className="inline-block py-1.5 px-4 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 font-bold text-xs uppercase tracking-widest mb-6">Explore the beauty</span>
            <h1 className="text-4xl md:text-6xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 tracking-tight">Eksplorasi Tanpa Batas dengan Open Trip</h1>
            <p className="text-gray-400 text-lg">Perjalanan lebih seru dan hemat. Dapatkan tiket kursi individual dengan kendaraan premium Innova Reborn atau Hiace Premio. Berangkat bersama, petualangan nyata.</p>
          </div>
        </div>

        {/* Trips Catalog */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-8">
          {loading ? (
            <div className="col-span-full py-20 text-center text-gray-500 font-bold">Mencari petualangan...</div>
          ) : trips.length === 0 ? (
            <div className="col-span-full border border-gray-800 border-dashed rounded-3xl p-16 text-center bg-gray-900/30">
               <Ticket size={64} className="mx-auto text-gray-700 mb-6" />
               <h3 className="text-2xl font-bold text-gray-300 mb-2">Belum Ada Trip Terjadwal</h3>
               <p className="text-gray-500 text-lg">Silakan periksa kembali beberapa saat lagi.</p>
            </div>
          ) : (
            trips.map((trip) => {
              const sisaKuota = trip.kapasitasMaks - trip.kuotaTerisi;
              const isFull = sisaKuota <= 0;

              return (
                <div key={trip.id} className="glass-card bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden flex flex-col group relative">
                  {/* Decorative Gradient Line */}
                  <div className="h-1.5 w-full bg-gradient-to-r from-brand-600 to-purple-600"></div>
                  
                  {isFull && (
                    <div className="absolute top-6 -right-12 bg-red-600 text-white font-black text-xs uppercase tracking-widest py-1.5 px-12 rotate-45 shadow-lg z-10 border border-red-400/50">
                      SOLD OUT
                    </div>
                  )}

                  <div className="p-6 md:p-8 flex flex-col flex-1 relative">
                    <span className="py-1 px-3 bg-gray-800/80 rounded-full text-[10px] font-black uppercase tracking-wider text-brand-400 w-fit mb-4 border border-gray-700">
                      {trip.mobilUtama}
                    </span>
                    
                    <h3 className="text-2xl font-black text-white mb-2 leading-tight">{trip.judul}</h3>
                    <p className="text-sm font-bold text-gray-500 tracking-wider uppercase flex items-center gap-1.5 mb-6">
                      <MapPin size={14} className="text-brand-500" /> {trip.destinasi}
                    </p>

                    <div className="space-y-4 mb-8 bg-black/40 p-5 rounded-2xl border border-gray-800/50">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400"><Calendar size={14} /></div>
                         <div>
                           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Tanggal</p>
                           <p className="text-sm text-gray-300 font-bold">{new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400"><Clock size={14} /></div>
                         <div>
                           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Kumpul</p>
                           <p className="text-sm text-gray-300 font-bold">{trip.waktuKumpul} WIB - {trip.titikKumpul}</p>
                         </div>
                       </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-800/50">
                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Biaya</p>
                          <p className="text-2xl font-black text-white">Rp {trip.hargaPerPax.toLocaleString()}<span className="text-xs text-gray-500 font-normal">/pax</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 shadow-sm">Ketersediaan</p>
                          <p className={`text-lg font-black ${isFull ? 'text-red-500' : sisaKuota <= 2 ? 'text-yellow-500' : 'text-green-500'}`}>
                            {isFull ? "Habis" : `${sisaKuota} Seat`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => openSewaModal(trip)}
                        disabled={isFull}
                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-all ${
                          isFull 
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                            : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-md'
                        }`}
                      >
                        <Ticket size={18} /> {isFull ? 'Kuota Habis' : 'Pesat Tiket Sekarang'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4 py-10 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl animate-popIn mt-auto mb-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-red-500"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-2xl font-black text-white mb-2">Beli Tiket Open Trip</h3>
            <p className="text-gray-400 text-sm mb-6 pb-4 border-b border-gray-800">{selectedTrip.judul}</p>

            <div className="space-y-6">
              <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-sm font-bold">Harga per Kursi</span>
                  <span className="text-white font-bold">Rp {selectedTrip.hargaPerPax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-800 border-dashed">
                  <span className="text-gray-400 text-sm font-bold">Sisa Kuota</span>
                  <span className="text-brand-400 font-bold">{selectedTrip.kapasitasMaks - selectedTrip.kuotaTerisi} Kursi</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-bold text-sm">Jumlah Tiket / Kursi</span>
                  <div className="flex border border-gray-700 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setJumlahKursi(Math.max(1, jumlahKursi - 1))}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                    >-</button>
                    <div className="px-6 py-2 bg-black text-white font-black text-center min-w-[50px] flex items-center justify-center">{jumlahKursi}</div>
                    <button 
                      onClick={() => setJumlahKursi(Math.min(selectedTrip.kapasitasMaks - selectedTrip.kuotaTerisi, jumlahKursi + 1))}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                    >+</button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider block mb-2">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 text-white rounded-xl p-4 focus:border-brand-500 outline-none appearance-none cursor-pointer text-sm"
                >
                  <option value="Transfer Bank">Transfer Bank / E-Wallet</option>
                  <option value="Cash">Cash di Titik Kumpul</option>
                </select>
              </div>

              <div className="bg-brand-900/20 border border-brand-500/30 p-4 rounded-2xl flex flex-col pt-3">
                <span className="text-[10px] text-brand-500 font-bold uppercase tracking-widest mb-1">Total Tagihan</span>
                <span className="text-3xl font-black text-brand-400">Rp {(jumlahKursi * selectedTrip.hargaPerPax).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleBooking}
              disabled={isSubmitting}
              className={`w-full py-4 mt-8 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2
                ${isSubmitting ? 'bg-gray-700 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 shadow-brand-md'}`}
            >
              {isSubmitting ? 'Memproses...' : <><Ticket size={20} /> Checkout Tiket</>}
            </button>
            <p className="text-center text-xs text-gray-500 mt-4 font-medium px-4">
              Dengan melakukan checkout, Anda menyetujui kumpul tepat waktu pada jadwal yang ditentukan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
