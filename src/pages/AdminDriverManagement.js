import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CreditCard, User, ArrowRight, Plus } from "lucide-react";

export default function AdminDriverManagement() {
  const [activeTab, setActiveTab] = useState("overview");

  const menuItems = [
    {
      id: "vehicle-verifications",
      title: "Bukti Foto Keadaan Mobil",
      description: "Lihat foto verifikasi keadaan mobil sebelum dan sesudah disewa",
      icon: <Camera className="h-8 w-8" />,
      path: "/admin-vehicle-verifications",
      color: "bg-blue-500"
    },
    {
      id: "payment-verifications",
      title: "Bukti Pembayaran Cash",
      description: "Lihat bukti pembayaran cash dari driver",
      icon: <CreditCard className="h-8 w-8" />,
      path: "/admin-payment-verifications",
      color: "bg-green-500"
    },
    {
      id: "driver-profiles",
      title: "Profil Driver",
      description: "Kelola profil dan informasi driver",
      icon: <User className="h-8 w-8" />,
      path: "/admin-driver-profiles",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[5%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[5%] w-[45vw] h-[45vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 md:mb-12 pt-8 animate-fadeInUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Management Driver</h1>
              <p className="text-gray-400 text-lg">Kelola verifikasi, kinerja, dan database mitra pengemudi.</p>
            </div>
            <Link
              to="/admin-add-driver"
              className="group bg-brand-600 hover:bg-brand-500 text-white px-4 md:px-8 py-4 rounded-2xl font-black transition-all flex items-center shadow-brand-sm hover:shadow-brand-md"
            >
              <Plus className="h-5 w-5 mr-3 group-hover:rotate-90 transition-transform" />
              Tambah Driver Baru
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 md:mb-12 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          {menuItems.map((item, idx) => (
            <Link
              key={item.id}
              to={item.path}
              className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] p-5 sm:p-8 md:p-10 border border-gray-800 hover:border-brand-500/50 transition-all group relative overflow-hidden"
            >
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-brand-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative z-10 focus:outline-none">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 md:mb-8 shadow-2xl ${item.color.replace('bg-', 'bg-')}/20 border border-${item.color.replace('bg-', '')}/30`}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight group-hover:text-brand-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6 md:mb-8">
                  {item.description}
                </p>
                <div className="flex items-center text-brand-400 font-black text-[10px] uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                  <span>Telusuri Detail</span>
                  <ArrowRight className="h-4 w-4 ml-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats Section */}
        <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] p-5 sm:p-8 md:p-10 border border-gray-800">
            <div className="flex items-center gap-4 mb-6 md:mb-10">
               <div className="w-1.5 h-6 bg-brand-500 rounded-full"></div>
               <h2 className="text-xl font-bold text-white tracking-tight">Ringkasan Operasional</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-2 group">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Verifikasi Mobil Hari Ini</p>
                <div className="flex items-end gap-3">
                   <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">0</p>
                   <span className="text-blue-500 text-xs font-bold mb-2">Pemeriksaan</span>
                </div>
                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                   <div className="bg-blue-500 h-full w-0"></div>
                </div>
              </div>

              <div className="space-y-2 group">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-green-400 transition-colors">Pembayaran Terverifikasi</p>
                <div className="flex items-end gap-3">
                   <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">0</p>
                   <span className="text-green-500 text-xs font-bold mb-2">Berhasil</span>
                </div>
                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                   <div className="bg-green-500 h-full w-0"></div>
                </div>
              </div>

              <div className="space-y-2 group">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-purple-400 transition-colors">Total Driver Aktif</p>
                <div className="flex items-end gap-3">
                   <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">0</p>
                   <span className="text-purple-500 text-xs font-bold mb-2">Mitra</span>
                </div>
                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden">
                   <div className="bg-purple-500 h-full w-0"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
