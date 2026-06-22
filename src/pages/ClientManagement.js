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
import { Search, UserCheck, UserX, Clock, Mail, Phone, MapPin, Key, Trash2, Eye, User, ShieldCheck } from "lucide-react";

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
        if (!data.verificationStatus) {
          data.verificationStatus = "unverified";
        }
        return { id: doc.id, ...data };
      });
      setClients(clientsData);
    } catch (error) {
      console.error("Gagal fetch clients:", error);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = searchClients === "" ||
      c.nama?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.nomorTelepon?.includes(searchClients);

    const matchesStatus = filterStatus === "" || c.verificationStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const checkAdmin = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims.admin === true) {
        setIsAdmin(true);
        fetchClients();
      }
    } catch (error) {
      console.error("Error verifikasi admin:", error.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Hapus client ini?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchClients();
    } catch (error) {
      console.error("Gagal hapus client:", error);
    }
  };

  const handleVerifyClient = async (id, status) => {
    try {
      await updateDoc(doc(db, "users", id), {
        verificationStatus: status
      });
      fetchClients();
      alert("Status verifikasi diperbarui.");
    } catch (error) {
      console.error("Gagal verifikasi client:", error);
    }
  };

  const handleResetPassword = async (email) => {
    if (!window.confirm(`Kirim email reset password ke ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email reset paksa terkirim.");
    } catch (error) {
      console.error("Gagal reset password:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[100px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#990000] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-slate-50 pt-[100px] flex items-center justify-center p-6 text-center">
       <div className="bg-white p-10 rounded-3xl shadow-xl shadow-red-900/5 max-w-md w-full border border-red-50">
          <div className="w-20 h-20 bg-red-50 text-[#990000] rounded-full flex items-center justify-center mx-auto mb-6">
            <UserX size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Akses Terbatas</h2>
          <p className="text-slate-500 mb-8 italic">Otoritas administrator diperlukan untuk akses database client.</p>
          <div className="h-1.5 w-12 bg-[#990000] mx-auto rounded-full"></div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-[100px] pb-20 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
            <ShieldCheck size={14} />
            <span>Keamanan & Data Pengguna</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Client</h1>
              <p className="text-slate-500 mt-1">Kelola hak akses, verifikasi identitas, dan aktivitas pelanggan.</p>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <div className="relative group flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#990000] transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari nama, email, atau telepon..."
                  value={searchClients}
                  onChange={(e) => setSearchClients(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-12 pr-6 py-3.5 focus:ring-2 focus:ring-red-100 focus:border-[#990000] outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status Dashboard Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Belum Verifikasi", count: clients.filter(c => c.verificationStatus === "unverified").length, icon: <UserX size={20} />, color: "text-red-600", bg: "bg-red-50" },
            { label: "Menunggu Validasi", count: clients.filter(c => c.verificationStatus === "pending").length, icon: <Clock size={20} />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Client Terverifikasi", count: clients.filter(c => c.verificationStatus === "verified").length, icon: <ShieldCheck size={20} />, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900">{stat.count}</p>
              </div>
              <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl`}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-10 shadow-sm">
           <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filter Status:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: "", label: "Semua Client" },
                  { val: "unverified", label: "Unverified" },
                  { val: "pending", label: "Pending" },
                  { val: "verified", label: "Verified" },
                ].map((f) => (
                  <button
                    key={f.val}
                    onClick={() => setFilterStatus(f.val)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filterStatus === f.val ? 'bg-[#990000] text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* Client Table-like List */}
        <div className="space-y-4">
          <div className="bg-slate-200/50 rounded-2xl p-4 hidden md:flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-8">
            <div className="w-[30%]">Client / Identitas</div>
            <div className="w-[20%]">Kontak</div>
            <div className="w-[15%] text-center">Status</div>
            <div className="w-[15%] text-center">Bergabung</div>
            <div className="flex-1 text-right">Aksi</div>
          </div>

          {filteredClients.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-6 md:px-8 hover:shadow-md transition-shadow group">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                
                {/* Identity */}
                <div className="md:w-[30%] flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-300">
                    {c.ktpURL ? (
                      <img src={c.ktpURL} className="w-full h-full object-cover" alt="KTP" />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-slate-900 truncate">{c.nama || 'User Baru'}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.role || 'Pelanggan'}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="md:w-[20%] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Mail size={12} className="text-slate-300" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Phone size={12} className="text-slate-300" />
                    <span>{c.nomorTelepon || '-'}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="md:w-[15%] flex justify-center">
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                    c.verificationStatus === "verified" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    c.verificationStatus === "pending" ? "bg-amber-50 text-amber-600 border-amber-100" :
                    "bg-red-50 text-[#990000] border-red-100"
                  }`}>
                    {c.verificationStatus}
                  </span>
                </div>

                {/* Joined */}
                <div className="md:w-[15%] text-center">
                   <p className="text-xs font-bold text-slate-900">
                    {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-1 flex justify-end gap-2">
                   {c.verificationStatus !== "verified" ? (
                      <button 
                        onClick={() => handleVerifyClient(c.id, "verified")}
                        className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                        title="Verifikasi"
                      >
                        <UserCheck size={18} />
                      </button>
                   ) : (
                      <button 
                        onClick={() => handleVerifyClient(c.id, "unverified")}
                        className="p-2.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all"
                        title="Batalkan Verifikasi"
                      >
                        <UserX size={18} />
                      </button>
                   )}
                   <button 
                    onClick={() => handleResetPassword(c.email)}
                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                    title="Reset Password"
                   >
                    <Key size={18} />
                   </button>
                   <button 
                    onClick={() => handleDeleteClient(c.id)}
                    className="p-2.5 bg-red-50 text-[#990000] hover:bg-[#990000] hover:text-white rounded-xl transition-all"
                    title="Hapus Client"
                   >
                    <Trash2 size={18} />
                   </button>
                </div>

              </div>
            </div>
          ))}

          {filteredClients.length === 0 && (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold italic text-sm">Database tidak ditemukan untuk kriteria ini.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
