import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { Send, Map, Sparkles, ChevronRight, Info } from "lucide-react";

import { PackageSkeleton, PageHeaderSkeleton } from "../components/SkeletonLoader";

export default function TourPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "paket_wisata"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBooking = (pkg) => {
    const message = `Halo Cakra Lima Tujuh, saya tertarik dengan Paket Wisata: ${pkg.judul}. Boleh minta informasi lebih lanjut?`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/6287859660053?text=${encodedMessage}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 md:pt-48 pb-24 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {[1, 2, 3].map(i => <PackageSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-28 md:pt-48 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <div className="relative rounded-[2.5rem] md:rounded-[3rem] overflow-hidden bg-slate-900 mb-12 md:mb-20 min-h-[300px] md:aspect-[21/9] flex items-center px-6 md:px-16">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80')] bg-cover bg-center opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent"></div>
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-[10px] uppercase tracking-widest mb-6 animate-fadeIn">
              <Sparkles size={14} />
              Exclusive Experiences
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tighter animate-fadeInUp">
              Jelajahi Keindahan Nusantara <br /> 
              <span className="text-red-500 underline underline-offset-8 decoration-4">Bersama Kami</span>
            </h1>
            <p className="text-slate-300 text-lg md:text-xl font-medium leading-relaxed animate-fadeInUp delay-100">
              Temukan paket wisata impian dengan pilihan destinasi terbaik dan layanan premium yang tak terlupakan.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <p className="text-[10px] font-black text-[#990000] uppercase tracking-[0.25em] mb-3">Katalog Paket Wisata</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Pilih Destinasi <span className="text-[#990000]">Favorit Anda</span></h2>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
            <Info size={14} className="text-[#990000]" />
            Harga sudah termasuk Driver Profesional
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packages.length > 0 ? (
            packages.map((pkg, idx) => (
              <div 
                key={pkg.id} 
                className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-2 animate-fadeInUp"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Image Container */}
                <div className="h-64 relative overflow-hidden">
                  <img 
                    src={pkg.imageUrl} 
                    alt={pkg.judul} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="absolute top-5 left-5 flex flex-col gap-2">
                    <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-lg">
                      {pkg.durasi}
                    </span>
                  </div>
                  
                  <div className="absolute bottom-5 left-5 right-5 translate-y-10 group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-xs text-white/90 font-medium italic line-clamp-2">
                      {pkg.description}
                    </p>
                  </div>
                </div>

                {/* Content Container */}
                <div className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-[#990000] rounded-full"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{pkg.destinasi}</span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-6 leading-tight group-hover:text-[#990000] transition-colors">{pkg.judul}</h3>
                  
                  <div className="flex flex-col space-y-4 mb-8">
                    <div className="flex items-center justify-between py-3 border-b border-slate-50">
                      <div className="flex items-center gap-3 text-slate-500">
                        <span className="text-sm font-black text-[#990000] tracking-tighter">Rp</span>
                        <span className="text-xs font-bold uppercase tracking-widest">Mulai Dari</span>
                      </div>
                      <p className="text-xl font-black text-slate-900">Rp {pkg.harga.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setSelectedPackage(pkg)}
                      className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      Detail Selengkapnya
                    </button>
                    <button 
                      onClick={() => handleBooking(pkg)}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#990000] shadow-xl hover:shadow-red-900/20 active:scale-95 transition-all"
                    >
                      Tanya Detail <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full animate-fadeInUp">
              {/* Main Empty State Card */}
              <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 md:py-28 px-8">
                
                {/* Animated Background Decorations */}
                <div className="absolute top-0 left-0 w-72 h-72 bg-[#990000]/15 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3" style={{ animation: 'floatSlow 8s ease-in-out infinite' }}></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#990000]/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" style={{ animation: 'floatSlow 10s ease-in-out infinite reverse' }}></div>
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-red-500/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" style={{ animation: 'pulseSoft 4s ease-in-out infinite' }}></div>
                
                {/* Floating Decorative Elements */}
                <div className="absolute top-8 right-12 opacity-10" style={{ animation: 'floatSlow 6s ease-in-out infinite' }}>
                  <Map size={80} className="text-white" />
                </div>
                <div className="absolute bottom-10 left-10 opacity-10" style={{ animation: 'floatSlow 7s ease-in-out infinite 1s' }}>
                  <Sparkles size={48} className="text-red-400" />
                </div>
                <div className="absolute top-16 left-20 opacity-5" style={{ animation: 'floatSlow 9s ease-in-out infinite 2s' }}>
                  <Map size={32} className="text-white" />
                </div>
                
                {/* Dotted Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
                  
                  {/* Animated Icon */}
                  <div className="mb-8 relative">
                    <div className="w-28 h-28 bg-white/5 backdrop-blur-sm border border-white/10 rounded-[2rem] flex items-center justify-center" style={{ animation: 'pulseSoft 3s ease-in-out infinite' }}>
                      <Map size={48} className="text-red-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#990000] rounded-full flex items-center justify-center" style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}>
                      <Sparkles size={12} className="text-white" />
                    </div>
                  </div>
                  
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-full mb-6">
                    <div className="w-2 h-2 bg-amber-400 rounded-full" style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}></div>
                    <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-[0.2em]">Segera Hadir</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-5 leading-tight tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-[#990000]">Belum ada Paket Wisata</span> <br />
                    <span className="text-slate-400 text-xl md:text-2xl font-bold">yang tersedia untuk saat ini</span>
                  </h3>

                  {/* Description */}
                  <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-10 max-w-md">
                    Jangan khawatir! Kami sedang menyiapkan petualangan seru untuk Anda. 
                    <span className="text-slate-300 font-semibold block mt-2">Nantikan penawaran menarik dari kami segera!</span>
                  </p>

                  {/* CTA */}
                  <a 
                    href="https://wa.me/6287859660053?text=Halo%20Cakra%20Lima%20Tujuh%2C%20apakah%20ada%20paket%20wisata%20yang%20tersedia%3F" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#990000] to-red-700 hover:from-red-700 hover:to-[#990000] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-2xl shadow-red-900/30 hover:shadow-red-900/50 active:scale-95 transition-all duration-300"
                  >
                    <Send size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    Tanyakan Jadwal Wisata
                  </a>

                  {/* Bottom decoration */}
                  <div className="flex items-center gap-3 mt-10">
                    <div className="w-8 h-[2px] bg-slate-700 rounded-full"></div>
                    <div className="w-2 h-2 bg-[#990000] rounded-full" style={{ animation: 'pulseSoft 2s ease-in-out infinite' }}></div>
                    <div className="w-8 h-[2px] bg-slate-700 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Banner */}
        <div className="mt-24 bg-[#990000] rounded-[3rem] p-10 md:p-16 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-2xl"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="text-center md:text-left max-w-xl">
                 <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Punya Destinasi Impian Sendiri?</h2>
                 <p className="text-red-100 text-lg">Konsultasikan rencana perjalanan Anda, kami siap merancang paket wisata custom sesuai keinginan Anda.</p>
              </div>
              <a href="https://wa.me/6287859660053" target="_blank" rel="noopener noreferrer" 
                className="px-10 py-5 bg-white text-[#990000] rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-2xl flex items-center gap-3">
                 Konsultasi Sekarang <ChevronRight size={18} />
              </a>
           </div>
        </div>

      </div>

      {/* Detail Selengkapnya Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] px-4 overflow-y-auto py-10 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg relative animate-popIn shadow-2xl border border-slate-200 my-auto">
            <button
              onClick={() => setSelectedPackage(null)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-[#990000] hover:bg-red-50 transition-all font-bold text-xl z-10 shadow-sm"
            >
              ×
            </button>

            {/* Modal Content */}
            <div className="flex flex-col">
              <div className="h-48 w-full rounded-2xl overflow-hidden mb-6 relative">
                <img 
                  src={selectedPackage.imageUrl} 
                  alt={selectedPackage.judul} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-md">
                    {selectedPackage.durasi}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-[#990000] rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{selectedPackage.destinasi}</span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight">
                {selectedPackage.judul}
              </h3>

              <div className="border-t border-slate-100 pt-4 mb-6">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3">Fasilitas Paket</h4>
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 max-h-60 overflow-y-auto">
                  <ul className="space-y-3">
                    {(() => {
                      const desc = selectedPackage.description || "";
                      const regex = /(?=\d+\.\s)/g;
                      const items = desc.split(regex).map(item => item.trim()).filter(Boolean);
                      const displayItems = items.length > 0 ? items : [desc];

                      return displayItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs text-slate-600 font-bold leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#990000] mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-100 mb-6">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Harga Mulai Dari</span>
                <p className="text-2xl font-black text-slate-900">Rp {selectedPackage.harga?.toLocaleString()}</p>
              </div>

              <button 
                onClick={() => {
                  handleBooking(selectedPackage);
                  setSelectedPackage(null);
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#990000] shadow-xl hover:shadow-red-900/20 active:scale-95 transition-all"
              >
                Tanya Detail <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
