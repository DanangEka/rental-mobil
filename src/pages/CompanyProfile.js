import { useEffect, useState } from "react";
import { Instagram, MapPin, Phone, Car, ShieldCheck, Clock, Award, Star, CheckCircle, Users, Zap, Target, BookOpen, Settings } from "lucide-react";
import logo from "../assets/logo.png";

export default function CompanyProfile() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className={`min-h-screen bg-slate-50 pt-52 pb-20 relative overflow-hidden transition-all duration-1000 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

      {/* Decorative BG */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-red-100/30 rounded-full blur-[120px] -mr-20 -mt-20 z-0 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-slate-200/50 rounded-full blur-[100px] -ml-10 -mb-10 z-0 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 z-10 relative space-y-20">

        {/* ── HERO HEADER ── */}
        <div className="flex flex-col items-center text-center animate-fadeInUp">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-[#990000]/10 rounded-full blur-2xl animate-pulse"></div>
            <img src={logo} alt="Logo Cakra Lima Tujuh" className="h-32 w-32 md:h-44 md:w-44 rounded-full object-cover shadow-2xl border-4 border-white relative z-10" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">Cakra Lima Tujuh</h1>
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="h-0.5 w-8 bg-[#990000] rounded-full"></div>
            <p className="text-[#990000] font-bold tracking-widest uppercase text-xs md:text-sm">Your Trusted Transport Partner</p>
            <div className="h-0.5 w-8 bg-[#990000] rounded-full"></div>
          </div>
          <p className="max-w-2xl text-slate-500 text-lg leading-relaxed font-medium">
            Penyedia jasa transportasi untuk kebutuhan event, corporate, dan operasional harian dengan pelayanan profesional dan tepat waktu.
          </p>
        </div>

        {/* ── TENTANG KAMI ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="bg-[#990000] rounded-[2.5rem] p-10 md:p-14 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 blur-xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-0.5 w-6 bg-white/40 rounded-full"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">Visi Kami</span>
              </div>
              <p className="text-3xl md:text-4xl font-black leading-tight mb-10">
                Menjadi penyedia jasa transportasi terpercaya yang memberikan layanan profesional dan berkualitas di setiap kegiatan klien.
              </p>
              <div className="border-t border-white/10 pt-10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mb-6">Misi Kami</p>
                <ul className="space-y-4">
                  {[
                    "Memberikan pelayanan transportasi yang aman dan nyaman",
                    "Menjaga ketepatan waktu dalam setiap operasional",
                    "Menyediakan kendaraan yang terawat dan siap digunakan",
                    "Mengutamakan kepuasan dan kepercayaan klien",
                    "Menjadi partner transportasi yang dapat diandalkan",
                  ].map((m, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle size={16} className="text-white/50 shrink-0 mt-0.5" />
                      <span className="text-white/80 font-medium text-sm leading-relaxed">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tentang Kami</p>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Kenali Lebih Jauh <span className="text-[#990000]">Siapa Kami</span></h2>
            <p className="text-slate-600 text-lg leading-relaxed font-medium">
              Kami menghadirkan layanan sewa kendaraan baik lepas kunci maupun dengan driver profesional, didukung unit yang terawat dan siap digunakan.
            </p>
            <p className="text-slate-500 leading-relaxed">
              Fokus kami adalah memberikan kenyamanan, ketepatan waktu, serta kemudahan koordinasi bagi setiap klien, khususnya dalam kegiatan dengan mobilitas tinggi seperti event dan kebutuhan corporate.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: <Car size={20} />, label: "Armada Terawat", sub: "Kondisi Prima" },
                { icon: <ShieldCheck size={20} />, label: "Aman & Terjamin", sub: "Proteksi Penuh" },
                { icon: <Clock size={20} />, label: "Tepat Waktu", sub: "Selalu On-Time" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 bg-red-50 text-[#990000] rounded-xl flex items-center justify-center mb-3">
                    {item.icon}
                  </div>
                  <p className="font-black text-slate-900 text-xs">{item.label}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LAYANAN KAMI ── */}
        <div>
          <div className="mb-12 text-center">
            <p className="text-[10px] font-black text-[#990000] uppercase tracking-[0.25em] mb-3">Apa Yang Kami Tawarkan</p>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">Layanan <span className="text-[#990000]">Kami</span></h2>
            <div className="w-12 h-0.5 bg-[#990000] mx-auto mt-6 rounded-full"></div>
            <p className="text-slate-500 mt-6 max-w-2xl mx-auto leading-relaxed">
              Kami menyediakan berbagai layanan transportasi yang fleksibel dan dapat disesuaikan dengan kebutuhan klien.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Car size={24} />, title: "Sewa Harian", desc: "Sewa kendaraan harian untuk mobilitas personal maupun tim." },
              { icon: <Star size={24} />, title: "Event & Organisasi", desc: "Sewa kendaraan untuk event, gathering, dan kegiatan organisasi." },
              { icon: <Award size={24} />, title: "Corporate", desc: "Sewa kendaraan corporate untuk operasional perusahaan." },
              { icon: <Users size={24} />, title: "Antar Jemput VIP", desc: "Antar jemput tamu dan VIP dengan layanan profesional berdedikasi." },
              { icon: <Zap size={24} />, title: "Paket Lengkap", desc: "Sewa kendaraan + driver + BBM dalam kota, all-in-one solution." },
              { icon: <Settings size={24} />, title: "Sistem Fleksibel", desc: "Kami melayani kebutuhan transportasi dengan sistem yang fleksibel sesuai klien." },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-3xl p-8 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-2 transition-all group">
                <div className="w-14 h-14 bg-[#990000] text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-red-900/20">
                  {item.icon}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── KEUNGGULAN KAMI ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[10px] font-black text-[#990000] uppercase tracking-[0.25em] mb-3">Mengapa Memilih Kami</p>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-6">Keunggulan <span className="text-[#990000]">Kami</span></h2>
            <div className="w-12 h-0.5 bg-[#990000] rounded-full mb-8"></div>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Kami mengedepankan kualitas pelayanan dengan standar tertinggi untuk menjamin kepuasan dan kepercayaan setiap klien.
            </p>
            <ul className="space-y-4">
              {[
                "Driver profesional, ramah, dan berpengalaman",
                "Kendaraan bersih, terawat, dan siap pakai",
                "Ketepatan waktu dan kesiapan unit",
                "Respons komunikasi cepat dan mudah",
                "Siap menangani kegiatan event dengan mobilitas tinggi",
                "Sistem operasional dengan PIC khusus",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-6 py-4 hover:border-red-100 hover:bg-red-50/30 transition-all group">
                  <div className="w-8 h-8 bg-[#990000]/10 text-[#990000] rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#990000] group-hover:text-white transition-all">
                    <CheckCircle size={16} />
                  </div>
                  <span className="text-slate-700 font-semibold text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#990000] rounded-[2.5rem] overflow-hidden relative shadow-2xl shadow-red-900/25 min-h-[400px] flex flex-col justify-between p-10 md:p-14">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80')] bg-cover bg-center opacity-10"></div>
            <div className="relative z-10 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Target size={20} className="text-white/50" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Target Kami</span>
              </div>
              <p className="text-4xl md:text-5xl font-black leading-tight mb-6">
                Layanan Premium, <span className="text-red-200">Harga Kompetitif</span>
              </p>
              <p className="text-white/60 leading-relaxed font-medium">
                Kami berkomitmen menghadirkan standar layanan transportasi kelas atas yang dapat diakses oleh semua segmen klien, dari personal hingga corporate.
              </p>
            </div>
            <div className="relative z-10 grid grid-cols-3 gap-6 mt-10 border-t border-white/10 pt-10">
              <div className="text-white text-center">
                <p className="text-3xl font-black">24/7</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Layanan</p>
              </div>
              <div className="text-white text-center border-x border-white/10">
                <p className="text-3xl font-black">100%</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Profesional</p>
              </div>
              <div className="text-white text-center">
                <p className="text-3xl font-black">∞</p>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Kepuasan</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── STANDAR PELAYANAN ── */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[10px] font-black text-[#990000] uppercase tracking-[0.25em] mb-3">SOP Operasional</p>
              <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-2">Standar <span className="text-[#990000]">Pelayanan</span></h2>
              <div className="w-12 h-0.5 bg-[#990000] rounded-full mt-6 mb-8"></div>
              <div className="bg-[#990000] rounded-2xl px-7 py-5 mb-8 inline-block">
                <p className="text-white font-black text-xs uppercase tracking-widest leading-relaxed">
                  Untuk menjaga kualitas layanan, kami menerapkan standar operasional sebagai berikut:
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  "Driver menggunakan pakaian rapi dan sopan",
                  "Kendaraan dalam kondisi bersih sebelum digunakan",
                  "Briefing sebelum kegiatan operasional",
                  "Monitoring unit selama kegiatan berlangsung",
                  "Komunikasi aktif dengan pihak klien",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 group">
                    <div className="w-8 h-8 bg-[#990000] text-white rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-red-900/20">
                      <span className="text-[10px] font-black">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <span className="text-slate-600 font-semibold text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/60">
              <div className="bg-slate-900 aspect-video flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1563720223185-11069d2a2e66?w=800&q=80')] bg-cover bg-center opacity-40"></div>
                <div className="relative z-10 text-center text-white">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-80" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-60">Standar Operasional</p>
                </div>
              </div>
              <div className="p-8 space-y-4">
                <h3 className="text-xl font-black text-slate-900">Komitmen Kualitas Kami</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Setiap armada dan driver kami dipersiapkan dengan standar ketat sebelum bertugas. Kepercayaan Anda adalah prioritas utama kami dalam setiap perjalanan.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-0.5 flex-1 bg-slate-100 rounded-full"></div>
                  <ShieldCheck size={16} className="text-[#990000]" />
                  <div className="h-0.5 flex-1 bg-slate-100 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Terverifikasi</span>
                  <span>Terpercaya</span>
                  <span>Profesional</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SISTEM OPERASIONAL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="bg-[#990000] rounded-[2.5rem] p-10 md:p-14 text-white relative overflow-hidden min-h-[320px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-4">Cara Kami Bekerja</p>
              <h2 className="text-4xl md:text-5xl font-black leading-tight">
                Sistem <br /><span className="text-red-200">Operasional</span>
              </h2>
              <div className="w-12 h-0.5 bg-white/20 rounded-full mt-8"></div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-slate-600 text-lg leading-relaxed font-medium italic">
              Kami menggunakan sistem kerja yang terstruktur:
            </p>
            <ul className="space-y-4">
              {[
                "PIC khusus untuk koordinasi",
                "Penjadwalan unit dan driver",
                "Monitoring perjalanan",
                "Kesiapan unit cadangan",
                "Respon cepat terhadap perubahan di lapangan",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-6 py-4 hover:border-red-100 hover:bg-red-50/30 hover:-translate-x-1 transition-all group">
                  <div className="w-8 h-8 bg-[#990000]/10 text-[#990000] rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#990000] group-hover:text-white transition-all">
                    <span className="text-[10px] font-black">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <span className="text-slate-700 font-semibold text-sm italic">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-slate-500 leading-relaxed italic pt-2">
              Hal ini bertujuan memastikan kegiatan berjalan lancar tanpa kendala transportasi.
            </p>
          </div>
        </div>

        {/* ── PENGALAMAN & KOMITMEN ── */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="bg-slate-900 relative overflow-hidden px-10 py-14 md:px-16 md:py-20">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80')] bg-cover bg-center opacity-10"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] mb-4">Lebih Dari Sekadar Layanan</p>
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Pengalaman &amp; <br /><span className="text-[#cc3333]">Komitmen</span>
              </h2>
            </div>
          </div>

          <div className="p-10 md:p-16 space-y-8">
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              Kami memahami bahwa setiap kebutuhan transportasi memiliki tantangan dan dinamika tersendiri, terutama dalam kegiatan dengan mobilitas tinggi seperti event, operasional perusahaan, maupun kunjungan bisnis. Oleh karena itu, kami tidak hanya menyediakan kendaraan, tetapi juga menghadirkan solusi transportasi yang terintegrasi, fleksibel, dan dapat diandalkan.
            </p>
            <p className="text-slate-500 leading-relaxed">
              Dengan pengalaman dalam menangani berbagai kebutuhan klien, kami terus berkomitmen untuk menjaga kualitas layanan melalui armada yang terawat, driver yang profesional, serta sistem koordinasi yang responsif. Kami percaya bahwa ketepatan waktu, kenyamanan, dan kemudahan komunikasi adalah kunci utama dalam membangun kepercayaan jangka panjang.
            </p>
            <p className="text-slate-500 leading-relaxed">
              Kami juga membuka peluang kerja sama jangka panjang yang saling menguntungkan, dengan skema pelayanan yang jelas, transparan, dan berorientasi pada kepuasan klien. Setiap kerja sama yang terjalin kami anggap sebagai kemitraan strategis yang akan kami jaga dengan penuh tanggung jawab.
            </p>
            <div className="bg-[#990000]/5 border border-[#990000]/10 rounded-3xl p-8">
              <p className="text-slate-700 leading-relaxed font-medium italic">
                "Besar harapan kami untuk dapat menjadi bagian dari kebutuhan transportasi Anda, serta memberikan kontribusi nyata dalam mendukung kelancaran setiap kegiatan yang dijalankan. Kami siap menjadi partner transportasi yang tidak hanya hadir, tetapi juga memberikan nilai lebih dalam setiap perjalanan."
              </p>
            </div>
          </div>
        </div>

        {/* ── CONNECT WITH US ── */}
        <div>
          <h3 className="text-xl font-black text-slate-900 mb-8 text-center uppercase tracking-widest">Connect With Us</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a href="https://wa.me/6287859660053" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-slate-200 p-8 rounded-3xl hover:shadow-lg transition-all group hover:-translate-y-1">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Phone size={24} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp</p>
              <p className="text-lg font-black text-slate-900">+62 878-5966-0053</p>
            </a>

            <a href="https://instagram.com/cakralimatujuhtrans" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-slate-200 p-8 rounded-3xl hover:shadow-lg transition-all group hover:-translate-y-1">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-rose-600 group-hover:text-white transition-all">
                <Instagram size={24} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Instagram</p>
              <p className="text-lg font-black text-slate-900">@cakralimatujuhtrans</p>
            </a>

            <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-slate-200 p-8 rounded-3xl hover:shadow-lg transition-all group hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <MapPin size={24} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Office Location</p>
              <p className="text-lg font-black text-slate-900">Surabaya, Indonesia</p>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
