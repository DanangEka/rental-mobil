import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { Plus, Edit, Trash2, Users, MapPin, Calendar, Clock, Car, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "../components/Toast";

export default function AdminOpenTrip() {
  const toast = useToast();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);
  
  // Form State
  const [formData, setFormData] = useState({
    judul: "",
    mobilUtama: "Innova Reborn",
    destinasi: "",
    tanggalBerangkat: "",
    waktuKumpul: "",
    titikKumpul: "",
    hargaPerPax: ""
  });

  const getCapacity = (mobil) => {
    if (mobil.includes("Hiace")) return 14;
    if (mobil.includes("Innova")) return 6;
    return 6;
  };

  const fetchTrips = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "open_trips"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by tanggal berangkat
      data.sort((a, b) => new Date(b.tanggalBerangkat) - new Date(a.tanggalBerangkat));
      setTrips(data);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data Open Trip");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreate = async () => {
    if (!formData.judul || !formData.destinasi || !formData.tanggalBerangkat || !formData.hargaPerPax) {
      toast.warning("Lengkapi semua data utama!");
      return;
    }

    try {
      const kapasitas = getCapacity(formData.mobilUtama);
      await addDoc(collection(db, "open_trips"), {
        ...formData,
        kapasitasMaks: kapasitas,
        kuotaTerisi: 0,
        hargaPerPax: Number(formData.hargaPerPax),
        status: "Tersedia",
        createdAt: Timestamp.now()
      });
      toast.success("Open Trip berhasil dibuat");
      setShowModal(false);
      fetchTrips();
    } catch (err) {
      toast.error("Gagal membuat trip: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus trip ini? Semua data penumpang terkait akan kehilangan rujukan trip-nya.")) {
      try {
        await deleteDoc(doc(db, "open_trips", id));
        toast.success("Trip dihapus");
        fetchTrips();
      } catch (err) {
        toast.error("Gagal menghapus: " + err.message);
      }
    }
  };

  const openDetail = async (trip) => {
    setSelectedTrip(trip);
    setShowDetailModal(true);
    // Fetch passengers from pemesanan collection
    try {
      const q = query(collection(db, "pemesanan"), where("tipe", "==", "opentrip"), where("openTripId", "==", trip.id));
      const snapshot = await getDocs(q);
      const pax = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPassengers(pax);
    } catch (err) {
      toast.error("Gagal memuat penumpang");
    }
  };

  const verifyPayment = async (orderId) => {
    if (window.confirm("Verifikasi pembayaran dan terima pesanan ini?")) {
      try {
        await updateDoc(doc(db, "pemesanan", orderId), {
          status: "approve sewa",
          paymentStatus: "paid"
        });
        toast.success("Pembayaran diverifikasi");
        openDetail(selectedTrip); // refresh passengers
      } catch (err) {
        toast.error("Gagal verifikasi pembayaran");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-8 glass-card border border-gray-800 bg-gray-900/50 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10">
            <h1 className="text-3xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2">
              Manajemen Open Trip
            </h1>
            <p className="text-gray-400 font-medium max-w-xl">
              Atur dan pantau jadwal Open Trip (Sharing Seat), atur rute, harga, dan manajemen penumpang.
            </p>
          </div>
          <button
            onClick={() => {
              setFormData({ judul: "", mobilUtama: "Innova Reborn", destinasi: "", tanggalBerangkat: "", waktuKumpul: "", titikKumpul: "", hargaPerPax: "" });
              setShowModal(true);
            }}
            className="btn-brand px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-brand-lg whitespace-nowrap z-10"
          >
            <Plus size={20} /> Buat Trip Baru
          </button>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-20 text-gray-500 font-bold animate-pulse">Memuat data trip...</div>
          ) : trips.length === 0 ? (
            <div className="col-span-full border border-gray-800 border-dashed rounded-3xl p-12 text-center bg-gray-900/30">
              <Users size={48} className="mx-auto text-gray-700 mb-4" />
              <h3 className="text-xl font-bold text-gray-300 mb-2">Belum Ada Open Trip</h3>
              <p className="text-gray-500">Buat jadwal Open Trip pertama Anda sekarang.</p>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip.id} className="glass-card bg-gray-900/80 border border-gray-800 rounded-3xl p-6 flex flex-col hover:border-brand-500/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    trip.status === "Tersedia" ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                    trip.status === "Penuh" ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                    "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  }`}>
                    {trip.status}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleDelete(trip.id)} className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-2">{trip.judul}</h3>
                <h4 className="text-xl font-black text-brand-400 mb-4">Rp {trip.hargaPerPax.toLocaleString()} <span className="text-xs font-normal text-gray-500 uppercase tracking-widest">/ Pax</span></h4>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <MapPin size={16} className="text-gray-500" />
                    <span>{trip.destinasi}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Calendar size={16} className="text-gray-500" />
                    <span>{new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Clock size={16} className="text-gray-500" />
                    <span>Kumpul: {trip.waktuKumpul} di {trip.titikKumpul}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-300">
                    <Car size={16} className="text-gray-500" />
                    <span>{trip.mobilUtama}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    <span>Kuota Terisi</span>
                    <span>{trip.kuotaTerisi} / {trip.kapasitasMaks} Kursi</span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${trip.kuotaTerisi === trip.kapasitasMaks ? 'bg-red-500' : 'bg-brand-500'}`} 
                      style={{ width: `${(trip.kuotaTerisi / trip.kapasitasMaks) * 100}%` }}
                    />
                  </div>
                </div>

                <button 
                  onClick={() => openDetail(trip)}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm rounded-xl transition-colors border border-gray-700 hover:border-gray-600 flex justify-center items-center gap-2"
                >
                  <Users size={16} /> Kelola Penumpang
                </button>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Modal Create Trip */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4 py-10 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-2xl relative shadow-2xl mt-auto mb-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-red-500"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-2xl font-black text-white mb-6">Buat Jadwal Open Trip</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Judul Trip / Tema</label>
                <input
                  type="text"
                  value={formData.judul}
                  onChange={(e) => setFormData({...formData, judul: e.target.value})}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                  placeholder="Cth: Bromo Midnight Explore"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Kendaraan & Kapasitas</label>
                <select
                  value={formData.mobilUtama}
                  onChange={(e) => setFormData({...formData, mobilUtama: e.target.value})}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-500 outline-none appearance-none"
                >
                  <option value="Innova Reborn">Innova Reborn (6 Seats)</option>
                  <option value="Hiace Premio">Hiace Premio (14 Seats)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Destinasi Rute</label>
                <input
                  type="text"
                  value={formData.destinasi}
                  onChange={(e) => setFormData({...formData, destinasi: e.target.value})}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                  placeholder="Cth: Surabaya - Malang - Bromo"
                />
              </div>
              <div className="col-span-full grid grid-cols-3 gap-4 border-t border-gray-800 pt-4 mt-2">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Tanggal Berangkat</label>
                  <input
                    type="date"
                    value={formData.tanggalBerangkat}
                    onChange={(e) => setFormData({...formData, tanggalBerangkat: e.target.value})}
                    style={{colorScheme: 'dark'}}
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Jam Kumpul</label>
                  <input
                    type="time"
                    value={formData.waktuKumpul}
                    onChange={(e) => setFormData({...formData, waktuKumpul: e.target.value})}
                    style={{colorScheme: 'dark'}}
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">Titik Kumpul (Meeting Poin)</label>
                  <input
                    type="text"
                    value={formData.titikKumpul}
                    onChange={(e) => setFormData({...formData, titikKumpul: e.target.value})}
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brand-500 outline-none"
                    placeholder="Cth: Stasiun Gubeng"
                  />
                </div>
              </div>
              <div className="col-span-full border-t border-gray-800 pt-4 mt-2">
                <label className="text-xs text-brand-400 font-bold uppercase tracking-wider mb-2 block">Harga Per Kursi (Pax)</label>
                <div className="flex relative">
                  <span className="absolute left-4 top-3.5 text-gray-400 font-bold">Rp</span>
                  <input
                    type="number"
                    value={formData.hargaPerPax}
                    onChange={(e) => setFormData({...formData, hargaPerPax: e.target.value})}
                    className="w-full bg-brand-900/10 border border-brand-500/50 rounded-xl p-3 pl-12 text-white font-bold focus:border-brand-500 outline-none text-xl"
                    placeholder="350000"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              className="w-full py-4 mt-8 bg-brand-600 hover:bg-brand-500 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-brand-md"
            >
              Simpan Jadwal Trip
            </button>
          </div>
        </div>
      )}

      {/* Modal Detail / Penumpang */}
      {showDetailModal && selectedTrip && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4 py-10 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 w-full max-w-4xl relative shadow-2xl mt-auto mb-auto">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-5 right-5 p-2 bg-gray-800 text-gray-400 hover:text-white rounded-full transition-colors hover:bg-red-500"
            >
              <XCircle size={20} />
            </button>
            <h3 className="text-2xl font-black text-white mb-2">Manifest Penumpang</h3>
            <p className="text-brand-400 text-sm font-bold mb-6 pb-4 border-b border-gray-800">{selectedTrip.judul} - {selectedTrip.mobilUtama}</p>

            {passengers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Users size={40} className="mx-auto mb-3 opacity-50" />
                <p>Belum ada kursi yang dipesan untuk trip ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 bg-black/20">
                      <th className="p-4 font-bold rounded-tl-xl">Penyewa (Kontak)</th>
                      <th className="p-4 font-bold">Qty Kursi</th>
                      <th className="p-4 font-bold">Total Bayar</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold rounded-tr-xl">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {passengers.map((pax) => (
                      <tr key={pax.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">{pax.namaClient || pax.namaPemesan}</p>
                          <p className="text-xs text-gray-400">{pax.telepon} • {pax.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-800 text-white px-3 py-1 rounded-lg font-bold">
                            {pax.jumlahKursi} Seat
                          </span>
                        </td>
                        <td className="p-4 font-bold text-brand-400">
                          Rp {pax.perkiraanHarga?.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                            pax.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {pax.paymentStatus === 'paid' ? 'LUNAS' : pax.status || 'MENUNGGU VERIFIKASI'}
                          </span>
                        </td>
                        <td className="p-4">
                          {pax.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => verifyPayment(pax.id)}
                              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 max-w-[120px] text-center text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle size={14} /> Trima Bayar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
