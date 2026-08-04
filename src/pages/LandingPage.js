import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import {
  Car, ShieldCheck, Clock, Award, ChevronRight,
  Phone, Mail, MapPin, Key, UserCheck
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <ShieldCheck size={24} />,
      title: "Armada Terawat & Aman",
      desc: "Setiap unit kendaraan melalui inspeksi berkala dan pembersihan menyeluruh sebelum diserahkan.",
    },
    {
      icon: <Clock size={24} />,
      title: "Layanan 24/7",
      desc: "Tim customer service kami siap melayani kebutuhan sewa dan bantuan darurat kapan saja.",
    },
    {
      icon: <Award size={24} />,
      title: "Harga Transparan",
      desc: "Tidak ada biaya tersembunyi. Semua tarif sewa dan fasilitas dijelaskan di awal secara transparan.",
    },
  ];

  const services = [
    {
      icon: <Key size={32} className="text-[#990000]" />,
      label: "Sewa Lepas Kunci",
      desc: "Bawa sendiri tanpa driver",
      path: "/home?type=lepas",
    },
    {
      icon: <UserCheck size={32} className="text-[#990000]" />,
      label: "Sewa Dengan Driver",
      desc: "Termasuk sopir profesional",
      path: "/home?type=driver",
    },
    {
      icon: <MapPin size={32} className="text-[#990000]" />,
      label: "Open Trip",
      desc: "Perjalanan bersama",
      path: "/open-trip",
    },
    {
      icon: <ShieldCheck size={32} className="text-[#990000]" />,
      label: "Airport Transfer",
      desc: "Jemput & antar bandara",
      path: "/home?type=lepas",
    },
  ];

  const stats = [
    { value: "500+", label: "Pelanggan Puas" },
    { value: "50+", label: "Armada Premium" },
    { value: "24/7", label: "Dukungan Siap" },
    { value: "4.9/5", label: "Rating Layanan" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pt-24">
      {/* ===== HERO SECTION ===== */}
      <div className="relative overflow-hidden min-h-[85vh] flex items-center">
        {/* Background Charcoal Base + Subtle Red Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827] z-0" />

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] bg-red-900/10 rounded-full z-0 pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] bg-[#C5A059]/10 rounded-full z-0 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-[#990000]/25 rounded-full blur-3xl z-0 pointer-events-none" />

        {/* Car silhouette decoration */}
        <div className="absolute right-0 bottom-0 z-0 opacity-10 pointer-events-none">
          <Car size={500} className="text-white" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 text-white w-full">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium mb-8 animate-fadeInUp backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-[#990000] animate-pulse" />
              Premium Rent, Tour &amp; Travel
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-tight animate-fadeInUp delay-100">
              Perjalanan Anda,
              <br />
              <span className="text-[#FF4D4D]">Lebih Nyaman</span>
              <br />
              <span className="text-white/80 font-light text-3xl sm:text-4xl lg:text-5xl">Bersama Cakra Lima Tujuh</span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-white/70 mb-10 leading-relaxed max-w-xl animate-fadeInUp delay-200">
              Sewa mobil harian, dengan atau tanpa driver. Armada bersih, proses cepat, dan harga paling kompetitif untuk perjalanan Anda.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 animate-fadeInUp delay-300">
              <button
                onClick={() => {
                  if (auth.currentUser) navigate("/home");
                  else navigate("/login");
                }}
                className="inline-flex items-center gap-2 bg-[#990000] text-white hover:bg-[#7A0000] font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
              >
                Mulai Sewa Sekarang
                <ChevronRight size={18} />
              </button>
              <Link
                to="/company-profile"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-4 px-7 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-300 text-base"
              >
                Tentang Kami
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FLOATING SERVICE NAV CARD ===== */}
      <div className="relative z-20 -mt-16 px-4 md:px-10 max-w-6xl mx-auto w-full group">
        <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 p-8 md:p-12 transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(153,0,0,0.12)]">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
             <div>
               <p className="text-[10px] font-black text-[#990000] uppercase tracking-[0.3em] mb-2">Service Catalog</p>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pilih Layanan Terbaik Kami<span className="text-[#990000]">.</span></h2>
             </div>
             <div className="h-1 w-20 bg-slate-100 rounded-full hidden md:block" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {services.map((svc, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (auth.currentUser) navigate(svc.path);
                  else navigate("/login");
                }}
                className="flex flex-col items-center p-8 rounded-[2.5rem] bg-slate-50 hover:bg-white border border-transparent hover:border-[#990000]/20 transition-all duration-500 group/item cursor-pointer hover:shadow-xl hover:-translate-y-2 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[#990000]/5 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                
                <div className="relative z-10 w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm group-hover/item:shadow-md transition-all duration-500 group-hover/item:scale-110 group-hover/item:bg-red-50">
                  {svc.icon}
                </div>
                <div className="relative z-10 text-center">
                  <span className="block font-black text-slate-900 group-hover/item:text-[#990000] transition-colors mb-2 tracking-tight">{svc.label}</span>
                  <span className="block text-[10px] font-bold text-slate-600 group-hover/item:text-slate-800 transition-colors uppercase tracking-widest">{svc.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FEATURES SECTION ===== */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-14 animate-fadeInUp">
            <p className="text-xs font-bold text-[#990000] uppercase tracking-widest mb-3">Keunggulan Kami</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Mengapa Memilih Cakra Lima Tujuh?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Kami berkomitmen memberikan pengalaman sewa mobil terbaik dengan standar layanan yang selalu terjaga.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feat, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg border border-gray-100 hover:border-red-100 transition-all duration-300 group animate-fadeInUp"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-5 text-[#990000] group-hover:bg-[#990000] group-hover:text-white transition-all duration-300 group-hover:scale-110">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#990000] transition-colors">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PROMO / HIGHLIGHT SECTION ===== */}
      <div className="bg-[#111827] py-20 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#990000]/20 rounded-full opacity-40 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C5A059]/10 rounded-full opacity-30 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C5A059] mb-3">Mulai Perjalanan Anda</p>
              <h2 className="text-3xl md:text-4xl font-black mb-5 leading-tight">
                Daftar Sekarang &<br />
                Dapatkan Penawaran Terbaik
              </h2>
              <p className="text-white/70 text-sm md:text-base leading-relaxed mb-8 max-w-lg">
                Registrasi akun hanya butuh 1 menit. Akses langsung ke seluruh katalog armada mobil, opsi lepas kunci maupun dengan driver, dan sistem booking otomatis.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="inline-flex items-center gap-2 bg-[#990000] text-white hover:bg-[#7A0000] font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                Buat Akun Gratis
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((st, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-3xl md:text-4xl font-black text-white mb-1">{st.value}</p>
                  <p className="text-xs font-bold text-[#C5A059] uppercase tracking-wider">{st.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TESTIMONIALS SECTION ===== */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-12 animate-fadeInUp">
            <p className="text-xs font-bold text-[#990000] uppercase tracking-widest mb-3">Testimoni</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Kata Pelanggan Kami</h2>
          </div>

          <iframe
            src="https://widgets.sociablekit.com/google-reviews/iframe/25702612"
            className="w-full min-h-[500px] border-0"
            title="Google Reviews"
            loading="lazy"
          />
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#111827] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#990000] rounded-full flex items-center justify-center shadow-md">
                  <Car size={20} className="text-white" />
                </div>
                <span className="font-black text-xl tracking-wide">Cakra Lima Tujuh</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-sm mb-6">
                Penyedia jasa sewa mobil lepas kunci dan dengan driver profesional. Melayani perjalanan dinas, liburan keluarga, open trip, dan transfer airport.
              </p>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <ShieldCheck size={16} className="text-[#990000]" />
                <span>Terdaftar & Terpercaya</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-[#C5A059]">Navigasi</h4>
              <ul className="space-y-2.5 text-sm text-white/70">
                <li>
                  <Link to="/home" className="hover:text-white transition-colors">Sewa Mobil</Link>
                </li>
                <li>
                  <Link to="/open-trip" className="hover:text-white transition-colors">Open Trip</Link>
                </li>
                <li>
                  <Link to="/tour-packages" className="hover:text-white transition-colors">Paket Wisata</Link>
                </li>
                <li>
                  <Link to="/company-profile" className="hover:text-white transition-colors">Tentang Kami</Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-[#C5A059]">Kontak</h4>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-[#990000] shrink-0 mt-0.5" />
                  <span>Lembah Harapan Blok AA-57, Lidah Wetan, Lakarsantri, Surabaya</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone size={16} className="text-[#990000] shrink-0" />
                  <span>+62 878-5966-0053</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail size={16} className="text-[#990000] shrink-0" />
                  <span>cakralimatujuh@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
            <p>&copy; {new Date().getFullYear()} Cakra Lima Tujuh. All rights reserved.</p>
            <p>Premium Rent, Tour &amp; Travel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
