import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { Send, Map, Sparkles, ChevronRight, Info, Clock, MapPin, X } from "lucide-react";

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
      <div className="min-h-screen bg-[#FAFAF6] pt-32 md:pt-48 pb-24 px-6 md:px-8">
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
    <div className="min-h-screen bg-[#FAFAF6] pt-24 md:pt-40 pb-24 px-4 sm:px-6 lg:px-8">

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <div className="relative rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-[#1B1717] mb-14 md:mb-20 min-h-[320px] md:min-h-[420px] flex items-center">
        {/* Background image (same URL) */}
        <img
          src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1600&q=80"
          alt="Destinasi wisata Indonesia"
          className="absolute inset-0 w-full h-full object-cover opacity-30 scale-[1.03]"
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1B1717]/95 via-[#1B1717]/70 to-[#1B1717]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B1717] via-transparent to-[#1B1717]/20" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom, rgba(129,1,0,0.12) 0%, transparent 70%)" }} />
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 md:px-14 py-16 md:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2.5 py-2 px-4 rounded-full bg-[#810100]/20 border border-[#810100]/30 text-[#ff9999] font-bold text-[10px] uppercase tracking-[0.25em] mb-7 animate-fadeIn backdrop-blur-sm">
              <Sparkles size={12} />
              Exclusive Experiences
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-[1.05] tracking-tight animate-fadeInUp" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
              Jelajahi Keindahan<br />Nusantara
              <span className="text-transparent bg-clip-text ml-2" style={{ backgroundImage: "linear-gradient(135deg, #C9A84C, #E8D48B, #C9A84C)" }}>Bersama Kami</span>
            </h1>
            <p className="text-white/50 text-base md:text-lg font-medium leading-relaxed animate-fadeInUp delay-100 max-w-xl">
              Temukan paket wisata impian dengan pilihan destinasi terbaik dan layanan premium yang tak terlupakan.
            </p>
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                <Clock size={12} className="text-[#C9A84C]/60" />
                Konsultasi Gratis
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
                <MapPin size={12} className="text-[#C9A84C]/60" />
                20+ Destinasi
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ CONTENT HEADER ═══════════════════════════ */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.35em] mb-3">Katalog Paket Wisata</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1B1717] tracking-tight">Pilih Destinasi <span className="text-[#810100]">Favorit Anda</span></h2>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#EDEBDD]/30 rounded-full text-[10px] font-bold text-[#3D3636]/50 uppercase tracking-[0.15em] shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
            <Info size={12} className="text-[#C9A84C]" />
            Harga sudah termasuk Driver Profesional
          </div>
        </div>

        {/* ═══════════════════════════ PACKAGES GRID ═══════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
          {packages.length > 0 ? (
            packages.map((pkg, idx) => (
              <div
                key={pkg.id}
                className="group bg-white rounded-[1.5rem] border border-[#EDEBDD]/30 overflow-hidden hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-[600ms] flex flex-col"
                style={{ animation: `spotReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 100}ms both`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                {/* Image Container */}
                <div className="h-56 md:h-64 relative overflow-hidden">
                  <img
                    src={pkg.imageUrl}
                    alt={pkg.judul}
                    className="w-full h-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                    style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                  />
                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1B1717]/70 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#810100]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Shimmer sweep */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] pointer-events-none"
                    style={{ background: "linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.06) 50%, transparent 75%)" }} />

                  {/* Duration badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B1717]/80 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-[#C9A84C] border border-[#C9A84C]/20">
                      <Clock size={10} />
                      {pkg.durasi}
                    </span>
                  </div>

                  {/* Description reveal on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 group-hover:translate-y-0 transition-all duration-500 z-10">
                    <p className="text-[10px] text-white/70 font-medium line-clamp-2 leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Destination tag */}
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={11} className="text-[#C9A84C]/60" />
                    <span className="text-[10px] font-black text-[#C9A84C]/60 uppercase tracking-[0.2em]">{pkg.destinasi}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-black text-[#1B1717] mb-4 leading-snug group-hover:text-[#810100] transition-colors duration-300">{pkg.judul}</h3>

                  {/* Price */}
                  <div className="flex items-center justify-between py-3 border-t border-[#EDEBDD]/30 mb-5">
                    <span className="text-[10px] font-bold text-[#3D3636]/40 uppercase tracking-[0.15em]">Mulai Dari</span>
                    <p className="text-xl font-black text-[#1B1717]">Rp {pkg.harga.toLocaleString()}</p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={() => setSelectedPackage(pkg)}
                      className="flex-1 py-3.5 bg-[#FAFAF6] hover:bg-white text-[#3D3636] rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-300 border border-[#EDEBDD]/40 hover:border-[#EDEBDD]/60"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => handleBooking(pkg)}
                      className="flex-1 py-3.5 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-300"
                      style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                    >
                      Tanya Detail <Send size={11} />
                    </button>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-0.5 w-0 group-hover:w-full transition-all duration-700" style={{ background: "linear-gradient(90deg, #810100, #C9A84C)" }} />
              </div>
            ))
          ) : (
            /* ═══════════════════════════ EMPTY STATE ═══════════════════════════ */
            <div className="col-span-full animate-fadeInUp">
              <div className="relative overflow-hidden rounded-[2rem] bg-[#1B1717] py-20 md:py-28 px-8">
                {/* Background decorations */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#810100]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#C9A84C]/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

                {/* Floating icons */}
                <div className="absolute top-10 right-16 opacity-[0.05]" style={{ animation: "floatSlow 8s ease-in-out infinite" }}>
                  <Map size={80} className="text-white" />
                </div>
                <div className="absolute bottom-12 left-12 opacity-[0.05]" style={{ animation: "floatSlow 7s ease-in-out infinite 1s" }}>
                  <Sparkles size={48} className="text-[#C9A84C]" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
                  <div className="mb-8 relative">
                    <div className="w-24 h-24 bg-white/[0.04] border border-white/[0.08] rounded-[1.5rem] flex items-center justify-center" style={{ animation: "pulseSoft 3s ease-in-out infinite" }}>
                      <Map size={40} className="text-[#C9A84C]/60" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#810100] rounded-full flex items-center justify-center" style={{ animation: "pulseSoft 2s ease-in-out infinite" }}>
                      <Sparkles size={10} className="text-white" />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full mb-6">
                    <div className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full" style={{ animation: "pulseSoft 2s ease-in-out infinite" }} />
                    <span className="text-[10px] font-black text-[#C9A84C]/80 uppercase tracking-[0.2em]">Segera Hadir</span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight tracking-tight">
                    Belum ada Paket Wisata
                  </h3>
                  <p className="text-white/35 text-sm md:text-base leading-relaxed mb-10 max-w-md">
                    Kami sedang menyiapkan petualangan seru untuk Anda.
                    <span className="text-white/50 font-semibold"> Nantikan penawaran menarik dari kami segera!</span>
                  </p>

                  <a
                    href="https://wa.me/6287859660053?text=Halo%20Cakra%20Lima%20Tujuh%2C%20apakah%20ada%20paket%20wisata%20yang%20tersedia%3F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white transition-all duration-300 active:scale-[0.97]"
                    style={{ background: "linear-gradient(135deg, #810100, #630000)", boxShadow: "0 8px 32px rgba(129,1,0,0.25)" }}
                  >
                    <Send size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    Tanyakan Jadwal Wisata
                  </a>

                  <div className="flex items-center gap-3 mt-10">
                    <div className="w-8 h-px bg-white/10 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-[#C9A84C]/40 rounded-full" />
                    <div className="w-8 h-px bg-white/10 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════ FOOTER CTA ═══════════════════════════ */}
        <div className="mt-20 rounded-[1.5rem] p-10 md:p-14 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B1717, #2A2525)" }}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#810100]/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#C9A84C]/5 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left max-w-xl">
              <p className="text-[10px] font-black text-[#C9A84C]/60 uppercase tracking-[0.3em] mb-3">Custom Trip</p>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight leading-tight">Punya Destinasi Impian Sendiri?</h2>
              <p className="text-white/40 text-sm leading-relaxed">Konsultasikan rencana perjalanan Anda, kami siap merancang paket wisata custom sesuai keinginan Anda.</p>
            </div>
            <a href="https://wa.me/6287859660053" target="_blank" rel="noopener noreferrer"
              className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white flex items-center gap-2.5 shrink-0 transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #810100, #630000)", boxShadow: "0 8px 24px rgba(129,1,0,0.2)" }}>
              Konsultasi Sekarang <ChevronRight size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════ DETAIL MODAL ═══════════════════════════ */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-[#1B1717]/70 backdrop-blur-md flex items-center justify-center z-[100] px-4 overflow-y-auto py-10 animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg relative animate-popIn shadow-[0_24px_64px_rgba(0,0,0,0.2)] border border-[#EDEBDD]/30 my-auto">
            {/* Close button */}
            <button
              onClick={() => setSelectedPackage(null)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-[#FAFAF6] text-[#3D3636]/30 hover:text-white hover:bg-[#810100] transition-all duration-300 font-bold text-lg z-10"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col">
              {/* Image */}
              <div className="h-48 w-full rounded-[1.25rem] overflow-hidden mb-6 relative">
                <img
                  src={selectedPackage.imageUrl}
                  alt={selectedPackage.judul}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B1717]/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B1717]/80 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-[#C9A84C] border border-[#C9A84C]/20">
                    <Clock size={10} />
                    {selectedPackage.durasi}
                  </span>
                </div>
              </div>

              {/* Destination tag */}
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={11} className="text-[#C9A84C]/60" />
                <span className="text-[10px] font-black text-[#C9A84C]/60 uppercase tracking-[0.2em]">{selectedPackage.destinasi}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-black text-[#1B1717] mb-5 leading-tight tracking-tight">
                {selectedPackage.judul}
              </h3>

              {/* Facilities */}
              <div className="border-t border-[#EDEBDD]/30 pt-5 mb-6">
                <h4 className="text-[10px] font-black text-[#3D3636]/40 uppercase tracking-[0.2em] mb-3">Fasilitas Paket</h4>
                <div className="bg-[#FAFAF6] p-5 rounded-[1.25rem] border border-[#EDEBDD]/30 max-h-60 overflow-y-auto">
                  <ul className="space-y-2.5">
                    {(() => {
                      const desc = selectedPackage.description || "";
                      const regex = /(?=\d+\.\s)/g;
                      const items = desc.split(regex).map(item => item.trim()).filter(Boolean);
                      const displayItems = items.length > 0 ? items : [desc];

                      return displayItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-xs text-[#3D3636]/60 font-bold leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/60 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between py-3 border-t border-[#EDEBDD]/30 mb-6">
                <span className="text-[10px] font-bold text-[#3D3636]/40 uppercase tracking-[0.15em]">Harga Mulai Dari</span>
                <p className="text-2xl font-black text-[#1B1717]">Rp {selectedPackage.harga?.toLocaleString()}</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  handleBooking(selectedPackage);
                  setSelectedPackage(null);
                }}
                className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 active:scale-[0.97] transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              >
                Tanya Detail <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
