import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Search, UserCheck, UserX, Clock, Mail, Phone, MapPin, Key, Trash2, Eye } from "lucide-react";

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [searchClients, setSearchClients] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchClients = async () => {
    try {
      const snapC = await getDocs(collection(db, "users"));
      const clientsData = snapC.docs.map(doc => {
        const data = doc.data();
        // Set default verificationStatus for old clients
        if (!data.verificationStatus) {
          data.verificationStatus = "unverified";
        }
        return { id: doc.id, ...data };
      });
      setClients(clientsData);
    } catch (error) {
      console.error("Gagal fetch clients:", error);
      alert("Terjadi kesalahan saat mengambil data client. Error: " + error.message);
    }
  };

  const filteredClients = clients.filter(c => {
    // Filter by search term
    const matchesSearch = searchClients === "" ||
      c.nama?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.alamat?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.nomorTelepon?.includes(searchClients);

    // Filter by verification status
    const matchesStatus = filterStatus === "" || c.verificationStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Removed columns definition for DataTable as we are switching to card grid

  const checkAdmin = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Anda belum login.");
      setLoading(false);
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims.admin === true) {
        setIsAdmin(true);
        fetchClients();
      } else {
        alert("Akun ini bukan admin.");
      }
    } catch (error) {
      console.error("Error verifikasi admin:", error.message);
      alert("Gagal memverifikasi hak akses.");
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAdmin();
  }, []);



  const handleDeleteClient = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus client ini?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchClients();
      alert("Client berhasil dihapus.");
    } catch (error) {
      console.error("Gagal hapus client:", error);
      alert("Gagal menghapus client: " + error.message);
    }
  };

  const handleVerifyClient = async (id, status) => {
    const client = clients.find(c => c.id === id);
    const clientName = client?.nama || client?.email || "Client";

    try {
      await updateDoc(doc(db, "users", id), {
        verificationStatus: status
      });

      fetchClients();

      if (status === "verified") {
        alert(`✅ ${clientName} berhasil diverifikasi!\n\nClient sekarang dapat melakukan pemesanan mobil.`);
      } else if (status === "unverified") {
        alert(`❌ Verifikasi ${clientName} berhasil dibatalkan.\n\nClient tidak dapat melakukan pemesanan sampai diverifikasi ulang.`);
      }
    } catch (error) {
      console.error("Gagal verifikasi client:", error);
      alert("❌ Gagal verifikasi client: " + error.message);
    }
  };

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email reset password telah dikirim ke " + email);
    } catch (error) {
      console.error("Gagal reset password:", error);
      alert("Gagal mengirim email reset password: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="animate-pulse space-y-8 mt-6 md:mt-10">
            <div className="h-12 bg-gray-800 rounded-2xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 text-center">
       <div className="glass-card bg-gray-900/40 p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-red-500/20 max-w-md w-full">
          <p className="text-red-500 font-black text-xl mb-4 uppercase tracking-tighter">Akses Ditolak</p>
          <p className="text-gray-400 font-bold mb-6 md:mb-8 italic">Identitas Anda tidak terdaftar sebagai administrator sistem.</p>
          <div className="h-1 w-20 bg-red-500/50 mx-auto rounded-full"></div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[5%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[5%] w-[45vw] h-[45vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-6 md:mb-10 pt-8 animate-fadeInUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Manajemen Client</h1>
              <p className="text-gray-400 text-lg">Kelola verifikasi identitas dan database pelanggan sistem.</p>
            </div>
          </div>
        </div>

        {/* Status Dashboard Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10 animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
          <div className="glass-card bg-gray-900/40 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-red-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
               <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                  <UserX size={24} />
               </div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Belum Terverifikasi</span>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">{clients.filter(c => c.verificationStatus === "unverified").length}</p>
            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
               <div className="bg-red-500 h-full w-[20%]"></div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-yellow-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
               <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
                  <Clock size={24} />
               </div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Menunggu Validasi</span>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">{clients.filter(c => c.verificationStatus === "pending").length}</p>
            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
               <div className="bg-yellow-500 h-full w-[15%]"></div>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-gray-800 group hover:border-green-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
               <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                  <UserCheck size={24} />
               </div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Client Terakomodasi</span>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2">{clients.filter(c => c.verificationStatus === "verified").length}</p>
            <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
               <div className="bg-green-500 h-full w-[65%]"></div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="glass-card bg-gray-900/40 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-800 mb-8 md:mb-12 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cari Database Client</label>
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input
                  type="text"
                  placeholder="Nama, Email, Alamat, atau Telepon..."
                  value={searchClients}
                  onChange={(e) => setSearchClients(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl pl-14 pr-6 py-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold placeholder:text-gray-600"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Status Verifikasi</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-2xl px-4 md:px-6 py-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold appearance-none cursor-pointer"
              >
                <option value="">SEMUA STATUS CLIENT</option>
                <option value="unverified">BELUM TERVERIFIKASI</option>
                <option value="pending">MENUNGGU VERIFIKASI</option>
                <option value="verified">TERVERIFIKASI</option>
              </select>
            </div>
          </div>
        </div>

        {/* Client Grid List */}
        <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-4 mb-6 md:mb-8">
             <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
             <h2 className="text-2xl font-black text-white tracking-tight">Daftar Client Terdaftar ({filteredClients.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {filteredClients.length === 0 ? (
              <div className="col-span-full glass-card bg-gray-900/40 p-20 rounded-[3rem] border border-gray-800 text-center">
                 <Search size={48} className="text-gray-800 mx-auto mb-6" />
                 <p className="text-gray-500 font-bold uppercase tracking-widest text-xs italic">Tidak ada data client yang sesuai dengan kriteria.</p>
              </div>
            ) : (
              filteredClients.map((c) => (
                <div key={c.id} className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] border border-gray-800 overflow-hidden hover:border-brand-500/30 transition-all group flex flex-col">
                   <div className="p-4 sm:p-6 md:p-8 pb-4">
                      <div className="flex items-start justify-between mb-6 md:mb-8">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-brand-400 border border-gray-700 shadow-xl overflow-hidden">
                               <img 
                                 src={c.ktpURL || 'https://via.placeholder.com/48x48?text=KTP'} 
                                 className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                                 alt="KTP" 
                               />
                            </div>
                            <div>
                               <h4 className="text-lg font-black text-white tracking-tight">{c.nama || 'N/A'}</h4>
                               <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic">{c.role || 'Client'}</p>
                            </div>
                         </div>
                         <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-tighter rounded-full border ${
                            c.verificationStatus === "verified" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                            c.verificationStatus === "pending" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
                            "bg-red-500/10 border-red-500/30 text-red-500"
                         }`}>
                            {c.verificationStatus === "verified" ? "VERIFIED" :
                             c.verificationStatus === "pending" ? "PENDING" : "UNVERIFIED"}
                         </span>
                      </div>

                      <div className="space-y-4 mb-6 md:mb-8">
                         <div className="flex items-center gap-3">
                            <Mail size={14} className="text-gray-600" />
                            <p className="text-xs text-gray-400 font-bold truncate">{c.email}</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <Phone size={14} className="text-gray-600" />
                            <p className="text-xs text-gray-400 font-bold">{c.nomorTelepon || 'No Phone'}</p>
                         </div>
                         <div className="flex items-start gap-3">
                            <MapPin size={14} className="text-gray-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-gray-500 font-semibold leading-relaxed line-clamp-2 italic">{c.alamat || 'Alamat tidak tersedia.'}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 pt-6 border-t border-gray-800/50">
                         <div>
                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Terdaftar</p>
                            <div className="flex items-center gap-1.5 opacity-60">
                               <Clock size={10} className="text-gray-600" />
                               <span className="text-[10px] text-white font-bold">{c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}</span>
                            </div>
                         </div>
                         <div>
                            <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1">Login Terakhir</p>
                            <div className="flex items-center gap-1.5 opacity-60">
                               <Clock size={10} className="text-gray-600" />
                               <span className="text-[10px] text-white font-bold">{c.lastLogin ? new Date(c.lastLogin.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="mt-auto p-4 bg-gray-900/60 flex flex-wrap gap-2">
                      {c.verificationStatus === "unverified" && (
                        <button
                          onClick={() => handleVerifyClient(c.id, "verified")}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Verifikasi
                        </button>
                      )}
                      {c.verificationStatus === "pending" && (
                        <>
                          <button
                            onClick={() => handleVerifyClient(c.id, "verified")}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleVerifyClient(c.id, "unverified")}
                            className="flex-1 bg-yellow-600/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-600 hover:text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      {c.verificationStatus === "verified" && (
                        <button
                          onClick={() => handleVerifyClient(c.id, "unverified")}
                          className="flex-1 bg-yellow-600/10 border border-yellow-500/30 text-yellow-500 hover:bg-yellow-600 hover:text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Batalkan
                        </button>
                      )}
                      <div className="w-full flex gap-2">
                        <button
                          onClick={() => handleResetPassword(c.email)}
                          className="flex-1 bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600 hover:text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => handleDeleteClient(c.id)}
                          className="flex-1 bg-red-600/10 border border-red-500/30 text-red-500 hover:bg-red-600 hover:text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Hapus
                        </button>
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
