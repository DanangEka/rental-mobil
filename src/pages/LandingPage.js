import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ElfsightWidget } from "react-elfsight-widget";
import { auth } from "../services/firebase";
import OpenTripTestimonials from "../components/OpenTripTestimonials";
import {
  Map, Users, Compass, Building2, Car, Hotel, Ticket, MapPin, PenTool,
  ChevronRight, Phone, Mail, MapPin as MapPinIcon, Star, ShieldCheck, Clock, Award,
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const services = [
    {
      icon: <Map size={28} />,
      label: "Private Trip",
      desc: "Perjalanan eksklusif hanya untuk Anda dan rombongan",
      path: "/tour-packages",
    },
    {
      icon: <Users size={28} />,
      label: "Open Trip",
      desc: "Gabung bersama traveler lain dengan harga terjangkau",
      path: "/open-trip",
    },
    {
      icon: <PenTool size={28} />,
      label: "Custom Trip",
      desc: "Rancang perjalanan impian sesuai keinginan Anda",
      path: "/tour-packages",
    },
    {
      icon: <Building2 size={28} />,
      label: "Corporate Trip",
      desc: "Solusi perjalanan bisnis dan corporate gathering",
      path: "/tour-packages",
    },
    {
      icon: <Car size={28} />,
      label: "Rental Kendaraan",
      desc: "Sewa kendaraan lepas kunci atau dengan driver",
      path: "/home",
    },
    {
      icon: <Hotel size={28} />,
      label: "Hotel & Tiket",
      desc: "Reservasi hotel dan tiket perjalanan terbaik",
      path: "/tour-packages",
    },
    {
      icon: <Compass size={28} />,
      label: "Tour Guide",
      desc: "Pemandu wisata berpengalaman di seluruh destinasi",
      path: "/tour-packages",
    },
    {
      icon: <MapPin size={28} />,
      label: "Travel Planning",
      desc: "Perencanaan perjalanan lengkap dari awal hingga akhir",
      path: "/tour-packages",
    },
  ];

  const tripByDest = [
    {
      label: "Jawa",
      slug: "jawa",
      count: "12+ Destinasi",
      image: "https://images.unsplash.com/photo-1566559532224-6d65e9fc0f37?w=900&auto=format&fit=crop&q=80",
    },
    {
      label: "Bali",
      slug: "bali",
      count: "8+ Destinasi",
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&auto=format&fit=crop&q=80",
    },
    {
      label: "Indonesia",
      slug: "indonesia",
      count: "20+ Destinasi",
      image: "https://images.unsplash.com/photo-1745917784557-a93bf209232c?w=900&auto=format&fit=crop&q=80",
    },
    {
      label: "ASEAN",
      slug: "asean",
      count: "6+ Destinasi",
      image: "https://images.unsplash.com/photo-1770848125591-2e97455bf21d?w=900&auto=format&fit=crop&q=80",
    },
  ];

  const tripByType = [
    { label: "Open Trip", icon: <Users size={18} /> },
    { label: "Private Trip", icon: <Map size={18} /> },
    { label: "Custom Trip", icon: <PenTool size={18} /> },
    { label: "Family Trip", icon: <Users size={18} /> },
    { label: "Corporate Trip", icon: <Building2 size={18} /> },
    { label: "Luxury Experience", icon: <Star size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF6] text-gray-800 font-sans pt-24">

      {/* ===== HERO SECTION ===== */}
      <div className="relative min-h-[75vh] sm:h-[75vh] sm:min-h-[560px] flex items-center justify-center overflow-hidden py-16 sm:py-0">
        {/* Bromo background */}
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&auto=format&fit=crop&q=80"
          alt="Gunung Bromo saat sunrise"
          className="absolute inset-0 w-full h-full object-cover scale-[1.02]"
        />

        {/* Multi-layer luxury gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-neutral-900/60 to-[#810100]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
        {/* Subtle vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)" }} />
        {/* Red accent glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom, rgba(129,1,0,0.15) 0%, transparent 70%)" }} />

        <div className="relative z-10 text-center px-4 w-full max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.12] text-white/90 text-[10px] sm:text-xs font-bold mb-6 sm:mb-10 animate-fadeInUp backdrop-blur-md whitespace-nowrap tracking-[0.2em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#810100] animate-pulse shrink-0" />
            Premium Travel &amp; Tour Experience
          </div>

          {/* Headline */}
          <h1 className="text-white font-black uppercase text-3xl sm:text-5xl md:text-[3.5rem] tracking-tight leading-[1.1] animate-fadeInUp delay-100">
            Rencanakan Perjalananmu
            <br className="hidden md:block" />
            <span className="italic font-light normal-case text-2xl sm:text-4xl md:text-5xl block mt-2 sm:mt-3 text-white/80">
              bersama Cakra Lima Tujuh
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/70 mt-4 sm:mt-5 text-base sm:text-lg md:text-xl animate-fadeInUp delay-200 max-w-xl mx-auto leading-relaxed">
            Wujudkan trip impianmu — open trip, private trip, hingga custom travel premium.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-10 sm:mt-12 animate-fadeInUp delay-300 w-full">
            <button
              onClick={() => {
                if (auth.currentUser) navigate("/open-trip");
                else navigate("/login");
              }}
              className="inline-flex items-center justify-center gap-2.5 bg-[#810100] text-white hover:bg-[#630000] font-bold py-4 sm:py-[1.1rem] px-10 rounded-full transition-all duration-400 shadow-[0_8px_32px_rgba(129,1,0,0.35)] hover:shadow-[0_12px_48px_rgba(129,1,0,0.45)] hover:-translate-y-0.5 text-sm w-full sm:w-auto tracking-wide"
              style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              Lihat Open Trip
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
            <Link
              to="/company-profile"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] text-white/90 font-semibold py-4 sm:py-[1.1rem] px-10 rounded-full backdrop-blur-md border border-white/[0.1] transition-all duration-400 text-sm w-full sm:w-auto tracking-wide"
              style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              Tentang Kami
            </Link>
          </div>
        </div>
      </div>

      {/* ===== SERVICE CATALOG ===== */}
      <div className="relative z-20 -mt-20 px-3 sm:px-4 md:px-10 max-w-7xl mx-auto w-full">
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-[#EDEBDD]/30 overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #810100 0%, #C9A84C 50%, #810100 100%)" }} />

          <div className="p-5 sm:p-8 md:p-10 lg:p-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 sm:mb-14 gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.35em] mb-3">Layanan Kami</p>
                <h2 className="text-2xl sm:text-3xl font-black text-[#1B1717] tracking-tight leading-tight">Perjalanan Impian Anda<span className="text-[#810100]">.</span></h2>
                <p className="text-[#3D3636]/50 text-sm mt-2 max-w-lg hidden md:block">Setiap layanan dirancang untuk memberikan pengalaman perjalanan yang tak terlupakan.</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-[#3D3636]/25 uppercase tracking-[0.2em] shrink-0">
                <div className="w-8 h-px bg-[#EDEBDD]" />
                8 Layanan
                <div className="w-8 h-px bg-[#EDEBDD]" />
              </div>
            </div>

            {/* Service grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {services.map((svc, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (auth.currentUser) navigate(svc.path);
                    else navigate("/login");
                  }}
                  className="relative flex flex-col items-center p-6 sm:p-7 md:p-8 rounded-[1.25rem] sm:rounded-[1.5rem] border border-transparent hover:border-[#EDEBDD]/60 transition-all duration-[500ms] group/item cursor-pointer hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] hover:-translate-y-1.5 overflow-hidden"
                  style={{ background: "linear-gradient(145deg, #FAFAF6 0%, #F8F6F0 100%)", transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                >
                  {/* Subtle corner accent */}
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover/item:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: "radial-gradient(circle at top right, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />

                  {/* Inner red glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#810100]/[0.025] to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500 pointer-events-none" />

                  {/* Icon */}
                  <div className="relative z-10 w-14 h-14 sm:w-[3.75rem] sm:h-[3.75rem] rounded-[0.875rem] flex items-center justify-center mb-4 sm:mb-5 transition-all duration-500 group-hover/item:scale-110"
                    style={{ background: "linear-gradient(135deg, #810100 0%, #630000 100%)", boxShadow: "0 4px 16px rgba(129,1,0,0.15)" }}>
                    <div className="text-white transition-all duration-500 group-hover/item:scale-110">
                      {svc.icon}
                    </div>
                    {/* Hover ring */}
                    <div className="absolute inset-0 rounded-[0.875rem] border-2 border-[#C9A84C]/0 group-hover/item:border-[#C9A84C]/20 transition-all duration-500" />
                  </div>

                  {/* Label */}
                  <div className="relative z-10 text-center w-full">
                    <span className="block font-black text-[#1B1717] group-hover/item:text-[#810100] transition-colors duration-300 mb-1.5 sm:mb-2 tracking-tight text-xs sm:text-sm leading-snug">{svc.label}</span>
                    <span className="hidden sm:block text-[10px] font-medium text-[#3D3636]/45 group-hover/item:text-[#3D3636]/65 transition-colors duration-300 leading-relaxed">{svc.desc}</span>
                  </div>

                  {/* Bottom gold accent line on hover */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover/item:w-12 h-0.5 rounded-full bg-[#C9A84C]/40 transition-all duration-700" />
                </button>
              ))}
            </div>

            {/* Bottom divider + CTA */}
            <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-[#EDEBDD]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[#3D3636]/30 text-[10px] font-bold uppercase tracking-[0.2em]">
                Semua layanan termasuk konsultasi gratis & support 24/7
              </p>
              <Link to="/tour-packages" className="inline-flex items-center gap-2 text-[10px] font-black text-[#810100] uppercase tracking-[0.2em] hover:gap-3 transition-all duration-300">
                Lihat Semua Layanan
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== TRIP CLASSIFICATION ===== */}
      <div className="section-luxury bg-[#FAFAF6]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-16 animate-fadeInUp">
            <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.3em] mb-3">Kategori Perjalanan</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1B1717] mb-4 tracking-tight">Temukan Trip yang Tepat</h2>
            <div className="w-12 h-px bg-[#810100]/30 mx-auto mt-5 mb-5" />
            <p className="text-[#3D3636]/70 max-w-2xl mx-auto leading-relaxed">
              Pilih perjalanan berdasarkan destinasi favorit atau jenis pengalaman yang Anda inginkan.
            </p>
          </div>

          {/* By Destination */}
          <div className="mb-16">
            <p className="text-[10px] font-black text-[#3D3636]/50 uppercase tracking-[0.25em] mb-6 text-center">Berdasarkan Destinasi</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
              {tripByDest.map((dest, i) => (
                <Link
                  key={i}
                  to={`/destinasi/${dest.slug}`}
                  className="relative aspect-[3/4] rounded-[1.25rem] overflow-hidden group cursor-pointer text-left block shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.15)] hover:-translate-y-1 transition-all duration-500 animate-fadeInUp"
                  style={{ animationDelay: `${i * 120}ms`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                >
                  <img
                    src={dest.image}
                    alt={dest.label}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#810100]/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Shimmer sweep on hover */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"
                    style={{ background: "linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)" }} />

                  {/* Corner accent */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#810100]/90 text-white text-[8px] font-black uppercase tracking-[0.2em] backdrop-blur-sm group-hover:bg-[#810100] transition-colors duration-300 shadow-[0_2px_8px_rgba(129,1,0,0.3)]">
                      <span className="w-1 h-1 rounded-full bg-white/60" />
                      Destinasi
                    </span>
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 p-4 md:p-5 w-full">
                    <h3 className="text-white font-black text-lg md:text-xl tracking-tight group-hover:text-[#EDEBDD] transition-colors duration-300">{dest.label}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[#EDEBDD]/70 text-[10px] font-bold uppercase tracking-[0.2em]">{dest.count}</p>
                      <span className="text-white/0 group-hover:text-white/70 transition-all duration-500 translate-x-2 group-hover:translate-x-0">
                        <ChevronRight size={16} />
                      </span>
                    </div>
                    {/* Bottom accent line */}
                    <div className="w-0 group-hover:w-8 h-0.5 rounded-full bg-[#C9A84C]/60 mt-2 transition-all duration-700" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* By Trip Type */}
          <div>
            <p className="text-[10px] font-black text-[#3D3636]/50 uppercase tracking-[0.25em] mb-6 text-center">Berdasarkan Jenis Perjalanan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {tripByType.map((trip, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (auth.currentUser) navigate("/open-trip");
                    else navigate("/login");
                  }}
                  className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 border border-[#EDEBDD]/40 hover:border-[#810100]/15 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-[500ms] group cursor-pointer hover:-translate-y-0.5 animate-fadeInUp"
                  style={{ animationDelay: `${i * 80}ms`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                >
                  <div className="w-10 h-10 bg-[#F5E6E6] text-[#810100] rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#810100] group-hover:text-white group-hover:scale-110 group-hover:shadow-[0_4px_16px_rgba(129,1,0,0.25)] transition-all duration-500">
                    {trip.icon}
                  </div>
                  <span className="font-bold text-[#1B1717] group-hover:text-[#810100] transition-colors duration-300 text-sm sm:text-base text-left leading-snug">
                    {trip.label}
                  </span>
                  <ChevronRight size={16} className="ml-auto text-[#3D3636]/15 group-hover:text-[#810100]/50 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== WHY CHOOSE US ===== */}
      <div className="section-luxury bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#810100]/[0.02] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 md:px-10 relative z-10">
          <div className="text-center mb-16 animate-fadeInUp">
            <p className="text-[10px] font-black text-[#810100] uppercase tracking-[0.3em] mb-3">Keunggulan Kami</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1B1717] mb-4 tracking-tight">Mengapa Cakra Lima Tujuh?</h2>
            <div className="w-12 h-px bg-[#810100]/30 mx-auto mt-5 mb-5" />
            <p className="text-[#3D3636]/70 max-w-2xl mx-auto leading-relaxed">
              Kami tidak hanya menyediakan perjalanan — kami menciptakan pengalaman berharga yang akan Anda kenang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: <ShieldCheck size={24} />,
                title: "Terpercaya & Aman",
                desc: "Setiap perjalanan dirancang dengan standar keamanan tinggi dan didukung tim profesional berpengalaman.",
              },
              {
                icon: <Award size={24} />,
                title: "Pengalaman Premium",
                desc: "Dari akomodasi hingga itinerary, kami pastikan setiap detail memberikan kenyamanan dan kepuasan maksimal.",
              },
              {
                icon: <Clock size={24} />,
                title: "Layanan 24/7",
                desc: "Tim kami selalu siap membantu Anda kapan saja, dari konsultasi perjalanan hingga dukungan saat di destinasi.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="bg-[#FAFAF6] rounded-[1.5rem] p-7 md:p-8 border border-[#EDEBDD]/30 hover:border-[#810100]/10 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 group animate-fadeInUp relative overflow-hidden"
                style={{ animationDelay: `${i * 0.1}s`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#810100]/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-[#F5E6E6] rounded-xl flex items-center justify-center mb-5 text-[#810100] group-hover:bg-[#810100] group-hover:text-white transition-all duration-500 group-hover:scale-105">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-black text-[#1B1717] mb-2 group-hover:text-[#810100] transition-colors duration-300 tracking-tight">{feat.title}</h3>
                  <p className="text-sm text-[#3D3636]/60 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TESTIMONI OPEN TRIP ===== */}
      <OpenTripTestimonials />

      {/* ===== ULASAN GOOGLE (Elfsight) ===== */}
      <div className="section-luxury bg-[#1B1717] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#810100]/[0.06] rounded-full opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#EDEBDD]/[0.03] rounded-full opacity-40 translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 dot-pattern opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#EDEBDD]/40 mb-3">Rating & Ulasan</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Ulasan Google</h2>
            <div className="w-12 h-px bg-[#810100]/40 mx-auto mt-5" />
          </div>

          <ElfsightWidget
            widgetId="9e1ea109-b04f-462c-9b6f-a2d202491384"
            lazy="in-viewport"
            className="mt-2"
          />
        </div>
      </div>

      {/* ===== CTA SECTION ===== */}
      <div className="section-luxury bg-[#FAFAF6] relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-[0.02] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 md:px-10 text-center relative z-10">
          <p className="text-[10px] font-bold text-[#810100] uppercase tracking-[0.3em] mb-4">Siap Berpetualang?</p>
          <h2 className="text-3xl md:text-5xl font-black text-[#1B1717] mb-6 tracking-tight">
            Wujudkan Perjalanan Impian Anda
          </h2>
          <div className="w-12 h-px bg-[#810100]/30 mx-auto mt-5 mb-8" />
          <p className="text-[#3D3636]/70 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
            Konsultasikan rencana perjalanan Anda bersama kami. Tim Cakra Lima Tujuh akan merancang itinerary terbaik sesuai keinginan Anda.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                if (auth.currentUser) navigate("/tour-packages");
                else navigate("/login");
              }}
              className="inline-flex items-center gap-2.5 bg-[#810100] text-white hover:bg-[#630000] font-bold py-4 px-10 rounded-full transition-all duration-400 shadow-[0_8px_32px_rgba(129,1,0,0.25)] hover:shadow-[0_12px_48px_rgba(129,1,0,0.35)] hover:-translate-y-0.5 text-sm tracking-wide"
              style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              Mulai Rencanakan
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
            <a
              href="https://wa.me/6287859660053"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#EDEBDD] text-[#1B1717] hover:bg-[#D8D5C7] font-bold py-4 px-10 rounded-full transition-all duration-400 text-sm tracking-wide"
              style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              <Phone size={16} strokeWidth={2.5} />
              Hubungi Kami
            </a>
          </div>
        </div>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#1B1717] text-white border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            {/* Brand column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-[#810100] rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(129,1,0,0.3)]">
                  <Compass size={18} className="text-white" />
                </div>
                <span className="font-black text-xl tracking-wide">Cakra Lima Tujuh</span>
              </div>
              <p className="text-white/30 text-sm leading-relaxed max-w-sm mb-6">
                Premium travel &amp; tour experience. Melayani private trip, open trip, custom trip, corporate trip, rental kendaraan, dan perencanaan perjalanan.
              </p>
              <div className="flex items-center gap-2.5 text-xs text-white/20">
                <ShieldCheck size={14} className="text-[#810100]/60" />
                <span>Terdaftar &amp; Terpercaya</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] mb-5 text-[#EDEBDD]/40">Navigasi</h4>
              <ul className="space-y-3 text-sm text-white/40">
                <li>
                  <Link to="/open-trip" className="hover:text-white transition-colors duration-300">Open Trip</Link>
                </li>
                <li>
                  <Link to="/tour-packages" className="hover:text-white transition-colors duration-300">Paket Wisata</Link>
                </li>
                <li>
                  <Link to="/home" className="hover:text-white transition-colors duration-300">Rental Kendaraan</Link>
                </li>
                <li>
                  <Link to="/company-profile" className="hover:text-white transition-colors duration-300">Tentang Kami</Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="font-bold text-[10px] uppercase tracking-[0.2em] mb-5 text-[#EDEBDD]/40">Kontak</h4>
              <ul className="space-y-3.5 text-sm text-white/40">
                <li className="flex items-start gap-2.5">
                  <MapPinIcon size={14} className="text-[#810100]/50 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">Lembah Harapan Blok AA-57, Lidah Wetan, Lakarsantri, Surabaya</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone size={14} className="text-[#810100]/50 shrink-0" />
                  <span>+62 878-5966-0053</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail size={14} className="text-[#810100]/50 shrink-0" />
                  <span>cakralimatujuh@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.04] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-[10px] text-white/15 gap-4 tracking-widest uppercase">
            <p>&copy; {new Date().getFullYear()} Cakra Lima Tujuh. All rights reserved.</p>
            <p>Premium Travel &amp; Tour Experience</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
