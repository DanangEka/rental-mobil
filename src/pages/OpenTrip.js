import React from "react";
import { Timer, Map, Sparkles, Send, Bell } from "lucide-react";

export default function OpenTrip() {
  return (
    <div className="min-h-screen bg-[#070707] text-white pt-52 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-4xl w-full relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-bold text-xs uppercase tracking-[0.2em] mb-8 animate-fadeIn">
          <Timer size={14} className="animate-pulse" />
          Coming Soon
        </div>

        {/* Title & Description */}
        <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter animate-fadeInUp">
          Sesuatu yang <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-red-400">Luar Biasa</span> <br />
          Sedang Disiapkan.
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          Kami sedang merancang pengalaman Open Trip terbaik untuk petualangan Anda berikutnya. Nikmati perjalanan premium dengan jadwal yang fleksibel dan harga yang lebih terjangkau.
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 px-4 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
          <div className="glass-card bg-gray-900/40 border border-gray-800/50 p-8 rounded-3xl group hover:border-brand-500/30 transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 mb-5 group-hover:scale-110 transition-transform">
              <Map size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Destinasi Pilihan</h3>
            <p className="text-gray-500 text-sm font-medium">Rute eksklusif ke tempat-tempat tersembunyi yang mempesona.</p>
          </div>

          <div className="glass-card bg-gray-900/40 border border-gray-800/50 p-8 rounded-3xl group hover:border-brand-500/30 transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 mb-5 group-hover:scale-110 transition-transform">
              <Sparkles size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Layanan Premium</h3>
            <p className="text-gray-500 text-sm font-medium">Armada terbaru dengan fasilitas lengkap untuk kenyamanan Anda.</p>
          </div>

          <div className="glass-card bg-gray-900/40 border border-gray-800/50 p-8 rounded-3xl group hover:border-brand-500/30 transition-all duration-500 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 mb-5 group-hover:scale-110 transition-transform">
              <Bell size={24} />
            </div>
            <h3 className="text-lg font-bold mb-2">Segera Hadir</h3>
            <p className="text-gray-500 text-sm font-medium">Nantikan peluncuran resmi kami dalam waktu dekat.</p>
          </div>
        </div>

        {/* Call to Action Placeholder */}
        <div className="relative group inline-block animate-fadeInUp" style={{ animationDelay: '600ms' }}>
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-red-600 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <button className="relative px-10 py-5 bg-gray-950 border border-gray-800 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-colors">
            Hubungi Customer Service <Send size={18} className="text-brand-500" />
          </button>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>
    </div>
  );
}
