import React, { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { Plus, Trash2, Users, MapPin, Calendar, Car } from "lucide-react";
import { useToast } from "../components/Toast";

export default function AdminOpenTrip() {
  const toast = useToast();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);
  
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
    return 6;
  };

  const fetchTrips = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "open_trips"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.tanggalBerangkat) - new Date(a.tanggalBerangkat));
      setTrips(data);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data Open Trip");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCreate = async () => {
    if (!formData.judul || !formData.destinasi || !formData.tanggalBerangkat || !formData.hargaPerPax) {
      toast.warning("Lengkapi data trip!");
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
      toast.error("Gagal: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin hapus trip?")) {
      try {
        await deleteDoc(doc(db, "open_trips", id));
        toast.success("Trip dihapus");
        fetchTrips();
      } catch (err) {
        toast.error("Gagal hapus");
      }
    }
  };

  const openDetail = async (trip) => {
    setSelectedTrip(trip);
    setShowDetailModal(true);
    try {
      const q = query(collection(db, "pemesanan"), where("tipe", "==", "opentrip"), where("openTripId", "==", trip.id));
      const snapshot = await getDocs(q);
      setPassengers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      toast.error("Gagal memuat penumpang");
    }
  };

  const verifyPayment = async (orderId) => {
    if (window.confirm("Konfirmasi pembayaran ini?")) {
      try {
        await updateDoc(doc(db, "pemesanan", orderId), {
          status: "pembayaran berhasil",
          paymentStatus: "paid"
        });
        toast.success("Hore! Pembayaran diverifikasi");
        openDetail(selectedTrip);
      } catch (err) {
        toast.error("Gagal verifikasi");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
              <Users size={14} />
              <span>Sharing Economy Program</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Open Trip</h1>
            <p className="text-slate-500 mt-1">Kelola kuota, rute destinasi, dan manifest penumpang sharing seat.</p>
          </div>
          <button
            onClick={() => {
              setFormData({ judul: "", mobilUtama: "Innova Reborn", destinasi: "", tanggalBerangkat: "", waktuKumpul: "", titikKumpul: "", hargaPerPax: "" });
              setShowModal(true);
            }}
            className="group bg-[#990000] hover:bg-[#7a0000] text-white px-8 py-4 rounded-2xl font-bold flex items-center shadow-lg shadow-red-900/10 transition-all active:scale-95"
          >
            <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform" /> 
            Pasang Jadwal Baru
          </button>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
               <div className="w-10 h-10 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin mb-4"></div>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sinkronisasi Jadwal...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-200 py-24 text-center">
              <MapPin size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold italic text-sm">Belum ada rute Open Trip yang aktif.</p>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col overflow-hidden">
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      trip.status === "Tersedia" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                      "bg-red-50 text-[#990000] border-red-100"
                    }`}>
                      {trip.status}
                    </span>
                    <button onClick={() => handleDelete(trip.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-[#990000] transition-colors">{trip.judul}</h3>
                  <p className="text-xl font-black text-[#990000] tracking-tighter mb-6">
                    Rp {trip.hargaPerPax?.toLocaleString()} 
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">/ Seat</span>
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <MapPin size={14} className="text-slate-300" />
                      <span className="truncate">{trip.destinasi}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <Calendar size={14} className="text-slate-300" />
                      <span>{new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <Car size={14} className="text-slate-300" />
                      <span>{trip.mobilUtama}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                      <span>Occupancy</span>
                      <span>{trip.kuotaTerisi} / {trip.kapasitasMaks}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${trip.kuotaTerisi >= trip.kapasitasMaks ? 'bg-red-600' : 'bg-[#990000]'}`} 
                        style={{ width: `${(trip.kuotaTerisi / trip.kapasitasMaks) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-2 bg-slate-50">
                  <button 
                    onClick={() => openDetail(trip)}
                    className="w-full py-4 text-slate-900 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white rounded-2xl transition-all"
                  >
                    <Users size={16} /> Kelola Penumpang
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Modal Container */}
      {(showModal || showDetailModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          
          {/* Create Trip Form */}
          {showModal && (
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-scaleUp">
              <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Pasang Jadwal Trip</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-[#990000] text-3xl font-black">×</button>
              </div>
              
              <div className="p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Judul / Headline Trip</label>
                    <input
                      type="text" value={formData.judul} onChange={(e) => setFormData({...formData, judul: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:border-[#990000] outline-none"
                      placeholder="Contoh: Explore Bromo Midnight"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Armada Utama</label>
                    <select
                      value={formData.mobilUtama} onChange={(e) => setFormData({...formData, mobilUtama: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-[#990000] focus:border-[#990000] outline-none"
                    >
                      <option value="Innova Reborn">Innova Reborn</option>
                      <option value="Hiace Premio">Hiace Premio</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rute Destinasi</label>
                    <input
                      type="text" value={formData.destinasi} onChange={(e) => setFormData({...formData, destinasi: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-semibold focus:border-[#990000] outline-none"
                      placeholder="Surabaya - Bromo - Malang"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tanggal & Waktu</label>
                    <div className="flex gap-2">
                      <input
                        type="date" value={formData.tanggalBerangkat} onChange={(e) => setFormData({...formData, tanggalBerangkat: e.target.value})}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-semibold focus:border-[#990000] outline-none"
                      />
                      <input
                        type="time" value={formData.waktuKumpul} onChange={(e) => setFormData({...formData, waktuKumpul: e.target.value})}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-semibold focus:border-[#990000] outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Harga Pax (Rp)</label>
                    <input
                      type="number" value={formData.hargaPerPax} onChange={(e) => setFormData({...formData, hargaPerPax: e.target.value})}
                      className="w-full bg-red-50/50 border border-red-100 rounded-xl px-4 py-3.5 text-sm font-black text-[#990000] focus:border-[#990000] outline-none"
                      placeholder="Nominal per kursi"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full py-4 mt-6 bg-[#990000] hover:bg-[#7a0000] text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-900/10 active:scale-[0.98]"
                >
                  Publish Jadwal Open Trip
                </button>
              </div>
            </div>
          )}

          {/* Manifest Table */}
          {showDetailModal && selectedTrip && (
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-scaleUp max-h-[85vh] flex flex-col">
              <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-black text-slate-900">Passenger Manifest</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rute: {selectedTrip.destinasi} | {selectedTrip.tanggalBerangkat}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-300 hover:text-[#990000] text-3xl font-black">×</button>
              </div>

              <div className="p-10 overflow-y-auto">
                {passengers.length === 0 ? (
                  <div className="text-center py-16 text-slate-300">
                    <Users size={60} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest">Belum Ada Reservasi</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-100 overflow-hidden bg-white">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                          <th className="px-8 py-5">Penumpang</th>
                          <th className="px-8 py-5 text-center">Kursi</th>
                          <th className="px-8 py-5 text-right">Pembayaran</th>
                          <th className="px-8 py-5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {passengers.map((pax) => (
                          <tr key={pax.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6">
                              <p className="font-black text-slate-900 text-sm whitespace-nowrap">{pax.namaClient || pax.namaPemesan}</p>
                              <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{pax.email}</p>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black">
                                {pax.jumlahKursi} Seats
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex flex-col items-end">
                                 <span className="text-sm font-black text-[#990000]">Rp {pax.perkiraanHarga?.toLocaleString()}</span>
                                 <span className={`text-[8px] font-black px-2 py-0.5 rounded mt-1 ${pax.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {pax.paymentStatus === 'paid' ? 'SETTLED' : 'PENDING'}
                                 </span>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              {pax.paymentStatus !== 'paid' && (
                                <button
                                  onClick={() => verifyPayment(pax.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                >
                                  Konfirmasi
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
      )}

    </div>
  );
}
