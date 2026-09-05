import { useEffect, useState } from "react";
import { Instagram, MapPin, Phone, ShieldCheck, Clock, Award, Star, CheckCircle, Users, Compass, Map, PenTool, Building2, Quote } from "lucide-react";
import logo from "../assets/logo.png";

export default function CompanyProfile() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className={`min-h-screen bg-[#FAFAF6] pt-48 md:pt-56 pb-24 relative overflow-hidden transition-all duration-1000 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

      {/* Decorative BG */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[#810100]/[0.04] rounded-full blur-[140px] -mr-20 -mt-20 z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-[#C9A84C]/[0.04] rounded-full blur-[120px] -ml-10 -mb-10 z-0 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 z-10 relative space-y-24">

        {/* ═══════════════════════════ HERO ═══════════════════════════ */}
        <div className="flex flex-col items-center text-center animate-fadeInUp">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-[#810100]/[0.08] rounded-full blur-3xl animate-breathe" />
            <div className="relative z-10">
              <img
                src={logo}
                alt="Logo Cakra Lima Tujuh"
                className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-4 border-white shadow-[0_20px_60px_rgba(0,0,0,0.15),0_0_0_1px_rgba(201,168,76,0.15)]"
              />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-[#1B1717] tracking-tight mb-5">Cakra Lima Tujuh</h1>
          <div className="flex items-center gap-4 justify-center mb-6">
            <div className="h-px w-10 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #C9A84C)" }} />
            <p className="text-[#C9A84C] font-bold tracking-[0.25em] uppercase text-[10px] md:text-xs">Premium Travel &amp; Tour Experience</p>
            <div className="h-px w-10 rounded-full" style={{ background: "linear-gradient(90deg, #C9A84C, transparent)" }} />
          </div>
          <p className="max-w-2xl text-[#3D3636]/60 text-lg leading-relaxed font-medium">
            Mewujudkan perjalanan impian Anda dengan layanan travel premium, personal, dan penuh pengalaman berharga.
          </p>
        </div>

        {/* ═══════════════════════════ TENTANG KAMI ═══════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: Mission card */}
          <div className="rounded-[2rem] p-10 md:p-14 text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B1717, #2A2525)" }}>
            <div className="absolute top-0 right-0 w-56 h-56 bg-[#810100]/15 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#C9A84C]/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-0.5 w-6 rounded-full" style={{ background: "linear-gradient(90deg, #C9A84C, transparent)" }} />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C9A84C]/70">Cita-Cita Kami</span>
              </div>
              <p className="text-2xl md:text-3xl font-black leading-snug mb-10">
                Menjadi partner perjalanan terpercaya yang menghadirkan pengalaman travel personal, premium, dan penuh makna.
              </p>
              <div className="border-t border-white/10 pt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-5">Yang Kami Jaga</p>
                <ul className="space-y-3.5">
                  {[
                    "Standar keamanan dan kenyamanan di setiap perjalanan",
                    "Itinerary yang dirancang dengan teliti dan personal",
                    "Tim profesional yang ramah dan berpengalaman",
                    "Kepuasan dan kepercayaan sebagai prioritas utama",
                    "Pengalaman travel yang melampaui ekspektasi",
                  ].map((m, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-md bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle size={11} className="text-[#C9A84C]/70" />
                      </div>
                      <span className="text-white/70 font-medium text-sm leading-relaxed">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Right: About text + stats */}
          <div className="space-y-6">
            <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.25em]">Tentang Kami</p>
            <h2 className="text-4xl font-black text-[#1B1717] tracking-tight leading-tight">Lebih Dari Sekadar <span className="text-[#810100]">Perjalanan</span></h2>
            <p className="text-[#3D3636]/70 text-lg leading-relaxed font-medium">
              Cakra Lima Tujuh hadir untuk Anda yang menginginkan pengalaman perjalanan yang istimewa. Kami tidak hanya menjual tiket atau paket wisata — kami merancang momen berharga yang akan Anda kenang seumur hidup.
            </p>
            <p className="text-[#3D3636]/50 leading-relaxed">
              Dari open trip yang seru, private trip yang eksklusif, hingga custom trip yang dirancang khusus sesuai impian Anda. Didukung tim profesional, armada terawat, dan jaringan partner terpercaya di seluruh destinasi Indonesia dan ASEAN.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { icon: <Compass size={18} />, label: "Travel Expert", sub: "Pengalaman Bertahun-Tahun" },
                { icon: <ShieldCheck size={18} />, label: "Aman & Nyaman", sub: "Standar Premium" },
                { icon: <Star size={18} />, label: "Review Bintang 5", sub: "Kepuasan Pelanggan" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#EDEBDD]/30 rounded-[1.25rem] p-5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all duration-500 hover:-translate-y-0.5 group" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                  <div className="w-10 h-10 bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#C9A84C] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#1B1717] group-hover:text-[#C9A84C] group-hover:border-[#1B1717] transition-all duration-500">
                    {item.icon}
                  </div>
                  <p className="font-black text-[#1B1717] text-xs">{item.label}</p>
                  <p className="text-[#3D3636]/40 text-[10px] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════ LAYANAN KAMI ═══════════════════════════ */}
        <div>
          <div className="mb-14 text-center">
            <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.35em] mb-3">Yang Kami Tawarkan</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1B1717] tracking-tight leading-tight">Layanan <span className="text-[#810100]">Kami</span></h2>
            <div className="w-16 h-px mx-auto mt-6" style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
            <p className="text-[#3D3636]/50 mt-6 max-w-2xl mx-auto leading-relaxed">
              Solusi perjalanan lengkap untuk setiap kebutuhan — dari petualangan personal hingga perjalanan korporat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Map size={24} />, title: "Private Trip", desc: "Perjalanan eksklusif yang dirancang khusus untuk Anda dan rombongan." },
              { icon: <Users size={24} />, title: "Open Trip", desc: "Gabung bersama traveler lain dan nikmati harga terjangkau." },
              { icon: <PenTool size={24} />, title: "Custom Trip", desc: "Rancang perjalanan impian sesuai keinginan Anda sepenuhnya." },
              { icon: <Building2 size={24} />, title: "Corporate Trip", desc: "Solusi perjalanan bisnis, gathering, dan corporate event." },
              { icon: <Compass size={24} />, title: "Tour Guide", desc: "Pemandu wisata berpengalaman di seluruh destinasi." },
              { icon: <Star size={24} />, title: "Luxury Experience", desc: "Perjalanan premium dengan layanan first-class." },
            ].map((item, i) => (
              <div
                key={i}
                className="relative bg-white border border-[#EDEBDD]/30 rounded-[1.25rem] overflow-hidden group transition-all duration-[600ms]"
                style={{ animation: `spotReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 80}ms both`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                {/* Top accent stripe */}
                <div className="h-0.5 w-0 group-hover:w-full transition-all duration-700"
                  style={{ background: "linear-gradient(90deg, #810100, #C9A84C)" }} />

                <div className="p-7">
                  {/* Icon */}
                  <div className="relative w-12 h-12 mb-5 inline-flex items-center justify-center">
                    <div className="absolute inset-0 rounded-[0.75rem] bg-[#1B1717] transition-all duration-500 group-hover:bg-[#810100] group-hover:shadow-[0_8px_24px_rgba(129,1,0,0.2)]" />
                    <div className="absolute inset-0 rounded-[0.75rem] border border-[#C9A84C]/0 group-hover:border-[#C9A84C]/20 transition-all duration-500" />
                    <div className="relative z-10 text-white transition-all duration-500 group-hover:scale-110">
                      {item.icon}
                    </div>
                  </div>

                  <h3 className="text-base font-black text-[#1B1717] mb-2 tracking-tight group-hover:text-[#810100] transition-colors duration-300">{item.title}</h3>
                  <p className="text-[#3D3636]/45 text-sm leading-relaxed">{item.desc}</p>

                  {/* Bottom accent */}
                  <div className="mt-4 pt-4 border-t border-[#EDEBDD]/30 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/50" />
                    <span className="text-[9px] font-black text-[#C9A84C]/50 uppercase tracking-[0.2em]">Selengkapnya</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════ DESTINASI ═══════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.25em] mb-3">Destinasi Populer</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1B1717] tracking-tight mb-6">Jelajahi <span className="text-[#810100]">Indonesia</span></h2>
            <div className="w-12 h-0.5 rounded-full mb-8" style={{ background: "linear-gradient(90deg, #810100, #C9A84C)" }} />
            <p className="text-[#3D3636]/60 mb-8 leading-relaxed">
              Dari keindahan Jawa yang kaya budaya, pesona Bali yang memesona, hingga eksotisme destinasi timur Indonesia dan ASEAN — kami hadir di mana pun petualangan Anda berada.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Jawa", desc: "Bromo, Yogyakarta, Dieng" },
                { label: "Bali", desc: "Ubud, Nusa Penida, Lombok" },
                { label: "Indonesia", desc: "Labuan Bajo, Raja Ampat" },
                { label: "ASEAN", desc: "Singapore, Malaysia, Thailand" },
              ].map((dest, i) => (
                <div key={i} className="bg-white border border-[#EDEBDD]/30 rounded-[1.25rem] p-5 hover:border-[#C9A84C]/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-500 group" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                  <div className="w-8 h-8 rounded-lg bg-[#FAFAF6] border border-[#EDEBDD]/40 flex items-center justify-center mb-2.5 group-hover:bg-[#810100] group-hover:border-[#810100] transition-all duration-500">
                    <MapPin size={13} className="text-[#C9A84C] group-hover:text-white transition-colors duration-500" />
                  </div>
                  <p className="font-black text-[#1B1717] text-sm mb-0.5">{dest.label}</p>
                  <p className="text-[#3D3636]/50 text-[11px]">{dest.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Commitment card */}
          <div className="rounded-[2rem] overflow-hidden relative min-h-[400px] flex flex-col justify-between p-10 md:p-14" style={{ background: "linear-gradient(135deg, #1B1717, #2A2525)" }}>
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
              alt="Komitmen Kami"
              className="absolute inset-0 w-full h-full object-cover opacity-15"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1B1717]/80 via-[#1B1717]/60 to-[#1B1717]/40" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#810100]/15 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Compass size={18} className="text-[#C9A84C]/60" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9A84C]/60">Komitmen Kami</span>
              </div>
              <p className="text-3xl md:text-4xl font-black leading-snug mb-6">
                Perjalanan Anda, <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #C9A84C, #E8D48B)" }}>Prioritas Kami</span>
              </p>
              <p className="text-white/45 leading-relaxed font-medium">
                Setiap detail perjalanan dirancang dengan penuh perhatian. Dari konsultasi awal hingga Anda kembali dengan senyum puas.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-6 mt-10 border-t border-white/10 pt-8">
              {[
                { num: "500+", label: "Pelanggan" },
                { num: "20+", label: "Destinasi" },
                { num: "4.9", label: "Rating" },
              ].map((stat, i) => (
                <div key={i} className={`text-white text-center ${i !== 2 ? "border-r border-white/10" : ""}`}>
                  <p className="text-2xl md:text-3xl font-black">{stat.num}</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════ PENGALAMAN & VALUE ═══════════════════════════ */}
        <div className="bg-white border border-[#EDEBDD]/30 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
          <div className="relative overflow-hidden px-10 py-14 md:px-16 md:py-20" style={{ background: "linear-gradient(135deg, #1B1717, #2A2525)" }}>
            <img
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80"
              alt="Pengalaman"
              className="absolute inset-0 w-full h-full object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1B1717]/80 to-[#1B1717]/40" />
            <div className="relative z-10">
              <p className="text-[10px] font-black text-[#C9A84C]/60 uppercase tracking-[0.25em] mb-4">Pengalaman &amp; Kepercayaan</p>
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Momen Berharga <br />
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #C9A84C, #E8D48B)" }}>Bermula dari Sini</span>
              </h2>
            </div>
          </div>

          <div className="p-10 md:p-16 space-y-8">
            <p className="text-[#3D3636]/70 leading-relaxed text-lg font-medium">
              Kami memahami bahwa perjalanan bukan sekadar berpindah tempat — ini tentang menciptakan kenangan, menjalin hubungan, dan menemukan sesuatu yang baru. Setiap trip yang kami rancang adalah cerita yang menunggu untuk diceritakan.
            </p>
            <p className="text-[#3D3636]/45 leading-relaxed">
              Dengan pengalaman menangani berbagai jenis perjalanan — mulai dari backpacker hingga luxury travel, keluarga hingga corporate team building — kami terus belajar dan berkembang untuk memberikan yang terbaik. Armada terawat, driver berpengalaman, jaringan hotel terpercaya, dan tim operasional yang responsif adalah fondasi layanan kami.
            </p>

            {/* Quote card */}
            <div className="rounded-2xl p-8 border border-[#C9A84C]/10" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.04), rgba(129,1,0,0.03))" }}>
              <Quote size={20} className="text-[#C9A84C]/40 mb-3" />
              <p className="text-[#1B1717]/80 leading-relaxed font-medium italic">
                "Kami percaya bahwa perjalanan terbaik adalah yang dirancang dengan hati. Itulah mengapa kami tidak hanya menjual paket — kami mendengarkan, memahami, dan mewujudkan perjalanan impian Anda."
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════ STANDAR PELAYANAN ═══════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.25em] mb-3">Standar Kami</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1B1717] tracking-tight mb-2">Komitmen <span className="text-[#810100]">Pelayanan</span></h2>
            <div className="w-12 h-0.5 rounded-full mt-6 mb-8" style={{ background: "linear-gradient(90deg, #810100, #C9A84C)" }} />
            <div className="rounded-2xl px-6 py-4 mb-8 inline-block" style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)" }}>
              <p className="text-white font-black text-[10px] uppercase tracking-[0.2em] leading-relaxed">
                Setiap perjalanan kami standarkan dengan penuh tanggung jawab:
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "Konsultasi perjalanan personal sebelum booking",
                "Itinerary detail dan transparan",
                "Driver & guide profesional yang terlatih",
                "Kendaraan bersih, nyaman, dan terawat",
                "Dukungan 24/7 selama perjalanan berlangsung",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110"
                    style={{ background: "linear-gradient(135deg, #1B1717, #3D3636)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                    <span className="text-[10px] font-black text-[#C9A84C]">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <span className="text-[#3D3636]/70 font-semibold text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-[#EDEBDD]/30 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.04)]">
            <div className="aspect-video relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1B1717, #2A2525)" }}>
              <img
                src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&q=80"
                alt="Standar Perjalanan"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B1717]/60 to-transparent" />
              <div className="relative z-10 text-center text-white h-full flex flex-col items-center justify-center">
                <Compass size={36} className="mx-auto mb-3 opacity-60" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Standar Perjalanan</p>
              </div>
            </div>
            <div className="p-8 space-y-4">
              <h3 className="text-xl font-black text-[#1B1717]">Kualitas yang Kami Jaga</h3>
              <p className="text-[#3D3636]/50 text-sm leading-relaxed">
                Setiap perjalanan yang kami layani mendapat perhatian penuh dari tim kami. Kepuasan dan keamanan Anda adalah ukuran keberhasilan kami.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="h-0.5 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
                <ShieldCheck size={14} className="text-[#C9A84C]/60" />
                <div className="h-0.5 flex-1 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-[#3D3636]/30">
                <span>Terpercaya</span>
                <span>Berkualitas</span>
                <span>Premium</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════ CONNECT WITH US ═══════════════════════════ */}
        <div>
          <div className="text-center mb-10">
            <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.35em] mb-3">Hubungi Kami</p>
            <h3 className="text-2xl md:text-3xl font-black text-[#1B1717] tracking-tight">Terhubung <span className="text-[#810100]">Dengan Kami</span></h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a href="https://wa.me/6287859660053" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-[#EDEBDD]/30 p-8 rounded-[1.5rem] hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-500 group hover:-translate-y-0.5" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
              <div className="w-12 h-12 bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#25D366] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#25D366] group-hover:text-white group-hover:border-[#25D366] transition-all duration-500">
                <Phone size={20} />
              </div>
              <p className="text-[10px] font-bold text-[#3D3636]/35 uppercase tracking-[0.2em] mb-1">WhatsApp</p>
              <p className="text-lg font-black text-[#1B1717]">+62 878-5966-0053</p>
            </a>

            <a href="https://instagram.com/cakralimatujuhtrans" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-[#EDEBDD]/30 p-8 rounded-[1.5rem] hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-500 group hover:-translate-y-0.5" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
              <div className="w-12 h-12 bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#E1306C] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#E1306C] group-hover:text-white group-hover:border-[#E1306C] transition-all duration-500">
                <Instagram size={20} />
              </div>
              <p className="text-[10px] font-bold text-[#3D3636]/35 uppercase tracking-[0.2em] mb-1">Instagram</p>
              <p className="text-lg font-black text-[#1B1717]">@cakralimatujuhtrans</p>
            </a>

            <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer"
              className="bg-white border border-[#EDEBDD]/30 p-8 rounded-[1.5rem] hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-500 group hover:-translate-y-0.5" style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
              <div className="w-12 h-12 bg-[#FAFAF6] border border-[#EDEBDD]/40 text-[#810100] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#810100] group-hover:text-white group-hover:border-[#810100] transition-all duration-500">
                <MapPin size={20} />
              </div>
              <p className="text-[10px] font-bold text-[#3D3636]/35 uppercase tracking-[0.2em] mb-1">Office Location</p>
              <p className="text-lg font-black text-[#1B1717]">Surabaya, Indonesia</p>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
