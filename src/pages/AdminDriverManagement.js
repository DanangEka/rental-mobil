import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CreditCard, User, ArrowRight, Plus, LayoutGrid } from "lucide-react";
import { db, auth } from "../services/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function AdminDriverManagement() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    vehicleCount: 0,
    cashCount: 0,
    driverCount: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Vehicle Verifications Today
    const qVehicles = query(collection(db, "vehicleVerifications"));
    const unsubVehicles = onSnapshot(qVehicles, (snapshot) => {
      const today = new Date().toDateString();
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (date.toDateString() === today) {
          count++;
        }
      });
      setStats((prev) => ({ ...prev, vehicleCount: count }));
    });

    // 2. Cash Transactions (Payment Verifications) Approved Today
    const qPayments = query(collection(db, "paymentVerifications"), where("status", "==", "approved"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const today = new Date().toDateString();
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (date.toDateString() === today) {
          count++;
        }
      });
      setStats((prev) => ({ ...prev, cashCount: count }));
    });

    // 3. Active Drivers (Mitra Bertugas)
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
    const unsubDrivers = onSnapshot(qDrivers, (snapshot) => {
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'inactive') {
          count++;
        }
      });
      setStats((prev) => ({ ...prev, driverCount: count }));
    });

    return () => {
      unsubVehicles();
      unsubPayments();
      unsubDrivers();
    };
  }, [user]);

  const menuItems = [
    {
      id: "vehicle-verifications",
      title: "Verifikasi Unit",
      description: "Pantau kondisi armada sebelum & sesudah operasional.",
      icon: <Camera size={28} />,
      path: "/admin-vehicle-verifications",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      id: "payment-verifications",
      title: "Log Transaksi Cash",
      description: "Validasi setoran tunai dari mitra pengemudi.",
      icon: <CreditCard size={28} />,
      path: "/admin-payment-verifications",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      id: "driver-profiles",
      title: "Database Mitra",
      description: "Kelola biodata dan status aktifitas pengemudi.",
      icon: <User size={28} />,
      path: "/admin-driver-profiles",
      color: "text-[#990000]",
      bg: "bg-red-50"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-20 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
            <LayoutGrid size={14} />
            <span>Driver Operations</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Manajemen Driver</h1>
              <p className="text-slate-500 mt-1">Pusat kendali operasional mitra pengemudi Cakra Lima Tujuh.</p>
            </div>
            <Link
              to="/admin-add-driver"
              className="group bg-[#990000] hover:bg-[#7a0000] text-white px-8 py-4 rounded-2xl font-bold flex items-center shadow-lg shadow-red-900/10 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5 mr-3 group-hover:rotate-90 transition-transform" />
              Tambah Mitra Baru
            </Link>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col items-start"
            >
              <div className={`w-16 h-16 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-[#990000] transition-colors line-clamp-1">
                {item.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-10 min-h-[40px]">
                {item.description}
              </p>
              <div className="mt-auto flex items-center text-[#990000] font-bold text-xs uppercase tracking-widest group-hover:gap-4 gap-2 transition-all">
                <span>Akses Modul</span>
                <ArrowRight size={16} />
              </div>
              {/* Subtle background decoration */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
            </Link>
          ))}
        </div>

        {/* Summary Banner */}
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex items-center gap-4 mb-10 relative z-10">
              <div className="w-1.5 h-8 bg-[#990000] rounded-full"></div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Status Operasional Hari Ini</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
              {[
                { label: "Verifikasi Mobil", val: stats.vehicleCount, suffix: "Pemeriksaan", color: "text-blue-600" },
                { label: "Transaksi Cash", val: stats.cashCount, suffix: "Disetujui", color: "text-emerald-600" },
                { label: "Mitra Bertugas", val: stats.driverCount, suffix: "Pengemudi", color: "text-[#990000]" },
              ].map((stat, i) => (
                <div key={i} className="space-y-3 group">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                  <div className="flex items-baseline gap-3">
                     <p className="text-5xl font-black text-slate-900">{stat.val}</p>
                     <span className={`${stat.color} text-[10px] font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform inline-block`}>{stat.suffix}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                     <div className={`h-full opacity-30 ${stat.color === 'text-[#990000]' ? 'bg-[#990000]' : stat.color.replace('text-', 'bg-')} transition-all`} style={{ width: stat.val > 0 ? '100%' : '0%' }}></div>
                  </div>
                </div>
              ))}
           </div>
           
           {/* Abstract pattern */}
           <div className="absolute right-0 top-0 w-64 h-64 bg-slate-50 rounded-full -mr-20 -mt-20 opacity-50"></div>
        </div>

      </div>
    </div>
  );
}
