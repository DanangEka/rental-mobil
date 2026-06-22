import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import {
  Car,
  ShieldCheck,
  Clock,
  Star,
  MapPin,
  Users,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  ChevronRight,
  CheckCircle,
  Award,
  UserCheck,
  Key,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

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

  const features = [
    {
      icon: <Car size={28} />,
      title: "Armada Beragam",
      desc: "Pilih dari armada mobil MPV, SUV, hingga sedan premium — selalu terawat dan diasuransikan.",
    },
    {
      icon: <ShieldCheck size={28} />,
      title: "Harga Transparan",
      desc: "Tarif kompetitif tanpa biaya tersembunyi. Bayar sesuai yang sudah disepakati.",
    },
    {
      icon: <Clock size={28} />,
      title: "Layanan 24/7",
      desc: "Tim kami siap membantu kapan pun Anda membutuhkan, siang maupun malam.",
    },
    {
      icon: <Award size={28} />,
      title: "Driver Profesional",
      desc: "Sopir berpengalaman, ramah, dan mengenal rute lokal dengan baik.",
    },
    {
      icon: <CheckCircle size={28} />,
      title: "Booking Mudah",
      desc: "Pesan secara online kapan saja, konfirmasi cepat, tanpa antri.",
    },
    {
      icon: <Star size={28} />,
      title: "Pelanggan Puas",
      desc: "Lebih dari 99% pelanggan kami puas dan kembali menggunakan layanan kami.",
    },
  ];

  const testimonials = [
    { name: "Budi Santoso", city: "Jakarta", rating: 5, text: "Mobilnya bersih, driver tepat waktu. Sangat direkomendasikan!" },
    { name: "Rina Wulandari", city: "Bandung", rating: 5, text: "Proses booking mudah dan harganya sangat transparan, tidak ada biaya aneh." },
    { name: "Ahmad Fauzi", city: "Surabaya", rating: 5, text: "Layanan terbaik yang pernah saya gunakan. Pasti akan pakai lagi!" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">

      {/* ===== HERO SECTION ===== */}
      <div className="relative overflow-hidden min-h-[90vh] flex items-center">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7a0000] via-[#990000] to-[#5a0000] z-0" />

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] bg-white/5 rounded-full z-0 pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-60px] w-[400px] h-[400px] bg-black/20 rounded-full z-0 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-red-600/20 rounded-full blur-3xl z-0 pointer-events-none" />

        {/* Car silhouette decoration */}
        <div className="absolute right-0 bottom-0 z-0 opacity-10 pointer-events-none">
          <Car size={520} strokeWidth={0.4} className="text-white" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 w-full py-20">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium mb-8 animate-fadeInUp backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-red-300 animate-pulse" />
              Jasa Rental Mobil Terpercaya
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 animate-fadeInUp delay-100">
              Perjalanan Anda,
              <br />
              <span className="text-red-200">Lebih Nyaman</span>
              <br />
              <span className="text-white/80 font-light text-3xl sm:text-4xl lg:text-5xl">Bersama Cakra Lima Tujuh</span>
            </h1>

            <p className="text-lg text-white/75 mb-10 leading-relaxed max-w-xl animate-fadeInUp delay-200">
              Pilih dari koleksi armada premium kami, dapatkan driver profesional, dan nikmati kemudahan booking secara online.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 animate-fadeInUp delay-300">
              <button
                onClick={() => {
                  if (auth.currentUser) navigate("/home");
                  else navigate("/login");
                }}
                className="inline-flex items-center gap-2 bg-white text-[#990000] hover:bg-red-50 font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-base"
              >
                Mulai Sewa Sekarang
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => navigate("/company-profile")}
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white/60 text-white hover:bg-white/10 font-semibold py-4 px-8 rounded-full transition-all duration-300 text-base backdrop-blur-sm"
              >
                Tentang Kami
              </button>
            </div>

            {/* Stats */}
            <div className="mt-14 grid grid-cols-3 gap-6 pt-8 border-t border-white/20 animate-fadeInUp delay-400">
              <div>
                <p className="text-3xl font-black text-white mb-1">50+</p>
                <p className="text-sm text-white/60 font-medium">Pilihan Armada</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white mb-1">99%</p>
                <p className="text-sm text-white/60 font-medium">Pelanggan Puas</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white mb-1">24/7</p>
                <p className="text-sm text-white/60 font-medium">Layanan Aktif</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FLOATING SERVICE NAV CARD (Enterprise Style) ===== */}
      <div className="relative z-20 -mt-20 px-4 md:px-10 max-w-6xl mx-auto w-full group">
        <div className="bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 p-8 md:p-12 transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(153,0,0,0.15)]">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
             <div>
               <p className="text-[10px] font-black text-[#990000] uppercase tracking-[0.3em] mb-2">Service Catalog</p>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pilih Layanan Terbaik Kami<span className="text-[#990000]">.</span></h2>
             </div>
             <div className="h-1 w-20 bg-slate-100 rounded-full hidden md:block" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {services.map((svc, i) => (
              <button
                key={i}
                onClick={() => {
                  if (auth.currentUser) navigate(svc.path);
                  else navigate("/login");
                }}
                className="flex flex-col items-center p-8 rounded-[2.5rem] bg-slate-50 hover:bg-white border border-transparent hover:border-red-100 transition-all duration-500 group/item cursor-pointer hover:shadow-xl hover:-translate-y-2 relative overflow-hidden"
              >
                {/* Subtle background glow on hover */}
                <div className="absolute inset-0 bg-red-50 opacity-0 group-hover/item:opacity-40 transition-opacity" />
                
                <div className="relative z-10 w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm group-hover/item:shadow-md transition-all duration-500 group-hover/item:scale-110 group-hover/item:bg-red-50">
                  {svc.icon}
                </div>
                <div className="relative z-10 text-center">
                  <span className="block font-black text-slate-900 group-hover/item:text-[#990000] transition-colors mb-2 tracking-tight">{svc.label}</span>
                  <span className="block text-[10px] font-bold text-slate-400 group-hover/item:text-slate-500 transition-colors uppercase tracking-widest">{svc.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== WHY US — FEATURES SECTION ===== */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-14 animate-fadeInUp">
            <p className="text-xs font-bold text-[#990000] uppercase tracking-widest mb-3">Keunggulan Kami</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Mengapa Memilih Cakra Lima Tujuh?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Kami berkomitmen memberikan pengalaman sewa mobil terbaik dengan standar layanan yang selalu terjaga.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* ===== PROMO / HIGHLIGHT SECTION (like Bluebird's dark promo) ===== */}
      <div className="bg-[#990000] py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-800 rounded-full opacity-30 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-900 rounded-full opacity-20 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-red-300 mb-3">Mulai Perjalanan Anda</p>
              <h2 className="text-3xl md:text-4xl font-black mb-5 leading-tight">
                Daftar Sekarang &<br />
                Dapatkan Penawaran Terbaik
              </h2>
              <p className="text-white/70 mb-8 leading-relaxed">
                Bergabunglah bersama ribuan pelanggan kami. Nikmati kemudahan booking online, harga transparan, dan armada premium siap antar jemput Anda.
              </p>
              <button
                onClick={() => navigate("/signup")}
                className="inline-flex items-center gap-2 bg-white text-[#990000] hover:bg-red-50 font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                Buat Akun Gratis
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Checklist highlights */}
            <div className="space-y-4">
              {[
                "Armada lebih dari 50 unit pilihan",
                "Driver profesional berpengalaman",
                "Harga transparan, tanpa biaya tambahan",
                "Booking online 24 jam penuh",
                "Layanan jemput & antar bandara",
                "Asuransi perjalanan inklusif",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white group">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-colors">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                  <span className="text-white/85 font-medium text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== TESTIMONIALS ===== */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-12 animate-fadeInUp">
            <p className="text-xs font-bold text-[#990000] uppercase tracking-widest mb-3">Testimoni</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">Kata Pelanggan Kami</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-red-100 hover:shadow-md transition-all duration-300 animate-fadeInUp"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#990000] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} /> {t.city}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FOOTER (multi-column like Bluebird) ===== */}
      <footer className="bg-[#7a0000] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Car size={20} className="text-[#990000]" />
                </div>
                <span className="font-black text-xl tracking-wide">Cakra Lima Tujuh</span>
              </div>
              <p className="text-white/65 text-sm leading-relaxed mb-6 max-w-xs">
                Layanan rental mobil terpercaya dengan armada premium, driver profesional, dan harga transparan. Melayani seluruh wilayah Anda.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Phone size={14} />
                  <span>+62 812-3456-7890</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70 mt-2">
                <Mail size={14} />
                <span>info@cakralimatujuh.com</span>
              </div>

              {/* Social icons */}
              <div className="flex gap-3 mt-5">
                {[Instagram, Facebook, Twitter].map((Icon, i) => (
                  <div key={i} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200">
                    <Icon size={15} />
                  </div>
                ))}
              </div>
            </div>

            {/* Layanan column */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-5">Layanan</h4>
              <ul className="space-y-3">
                {[
                  { label: "Rental Mobil", path: "/home" },
                  { label: "Open Trip", path: "/open-trip" },
                  { label: "Dengan Driver", path: "/home" },
                  { label: "Airport Transfer", path: "/home" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.path}
                      className="text-white/65 hover:text-white text-sm transition-colors duration-200 flex items-center gap-1.5 group"
                    >
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 -ml-1.5 transition-all" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Perusahaan column */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-white/50 mb-5">Perusahaan</h4>
              <ul className="space-y-3">
                {[
                  { label: "Tentang Kami", path: "/company-profile" },
                  { label: "Daftar Akun", path: "/signup" },
                  { label: "Login", path: "/login" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.path}
                      className="text-white/65 hover:text-white text-sm transition-colors duration-200 flex items-center gap-1.5 group"
                    >
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 -ml-1.5 transition-all" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-5">
          <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-white/45 text-xs">
              &copy; {new Date().getFullYear()} Cakra Lima Tujuh. Hak Cipta Dilindungi.
            </p>
            <div className="flex gap-6 text-xs text-white/45">
              <span className="hover:text-white/70 cursor-pointer transition-colors">Kebijakan Privasi</span>
              <span className="hover:text-white/70 cursor-pointer transition-colors">Syarat &amp; Ketentuan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
