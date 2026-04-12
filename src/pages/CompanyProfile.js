import { useEffect, useState } from "react";
import { Instagram, MapPin, Phone, Car, ShieldCheck, Clock } from "lucide-react";
import logo from "../assets/logo.png";

export default function CompanyProfile() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div className={`min-h-screen bg-black pt-[72px] pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-1000 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/20 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-red-900/20 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-5xl mx-auto z-10 relative mt-6 md:mt-8 flex flex-col items-center">
        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8 md:mb-12 text-center group cursor-default">
          <div className="relative">
             <div className="absolute inset-0 bg-brand-500 rounded-full blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
             <img
               src={logo}
               alt="Logo Cakra Lima Tujuh"
               className="h-32 w-32 md:h-40 md:w-40 rounded-full object-cover shadow-[0_0_40px_rgba(153,0,0,0.5)] border-2 border-brand-500 relative z-10"
             />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl md:text-6xl font-black text-white tracking-tight mt-6 md:mt-8 mb-4">Cakra Lima Tujuh</h1>
          <p className="text-brand-300 font-bold tracking-widest uppercase text-sm md:text-base">Premium Car Rental Solution</p>
        </div>

        {/* About Section */}
        <div className="glass-card bg-gray-900/60 p-4 sm:p-6 md:p-8 sm:p-12 border border-gray-800 rounded-2xl md:rounded-3xl shadow-2xl relative overflow-hidden w-full mb-8 md:mb-12">
          {/* Subtle top glare */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                 <span className="w-8 h-1 bg-brand-500 rounded-full"></span>
                 Tentang Kami
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed text-left">
                Cakra Lima Tujuh adalah layanan rental mobil terpercaya yang menyediakan berbagai pilihan kendaraan berkualitas untuk keperluan pribadi, bisnis, dan perjalanan wisata. 
              </p>
              <br/>
              <p className="text-gray-300 text-lg leading-relaxed text-left">
                Kami berkomitmen untuk memberikan pelayanan terbaik dengan harga bersaing, serta kemudahan dalam proses pemesanan dan pengambilan mobil. Dengan tim profesional dan armada yang selalu terawat, kami siap menjadi partner perjalanan Anda.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-black/40 border border-gray-800 p-4 md:p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand-500/50 transition-colors">
                 <Car className="w-8 h-8 text-brand-400 mb-3 group-hover:text-brand-300" />
                 <h4 className="text-white font-bold mb-1">Armada Terawat</h4>
                 <p className="text-gray-400 text-sm">Kondisi prima & bersih</p>
              </div>
              <div className="bg-black/40 border border-gray-800 p-4 md:p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand-500/50 transition-colors">
                 <ShieldCheck className="w-8 h-8 text-brand-400 mb-3 group-hover:text-brand-300" />
                 <h4 className="text-white font-bold mb-1">Aman & Nyaman</h4>
                 <p className="text-gray-400 text-sm">Proteksi perjalanan</p>
              </div>
              <div className="bg-black/40 border border-gray-800 p-4 md:p-6 rounded-2xl flex flex-col items-center text-center group hover:border-brand-500/50 transition-colors sm:col-span-2">
                 <Clock className="w-8 h-8 text-brand-400 mb-3 group-hover:text-brand-300" />
                 <h4 className="text-white font-bold mb-1">Layanan 24/7</h4>
                 <p className="text-gray-400 text-sm">Dukungan operasional penuh</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Links */}
        <h3 className="text-2xl font-bold text-white mb-6 md:mb-8">Hubungi Kami</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
          <a
            href="https://wa.me/6287859660053"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-center gap-4 bg-gray-900/60 border border-gray-800 p-4 md:p-6 sm:p-8 rounded-2xl md:rounded-3xl hover:shadow-brand hover:border-brand-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-green-500 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
            <div className="bg-green-500/20 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Phone className="text-green-500 w-8 h-8 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-semibold mb-1">Telepon / WhatsApp</p>
              <span className="text-white font-bold text-lg">+62 812-3456-7890</span>
            </div>
          </a>

          <a
            href="https://instagram.com/cakralimatujuhtrans"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-center gap-4 bg-gray-900/60 border border-gray-800 p-4 md:p-6 sm:p-8 rounded-2xl md:rounded-3xl hover:shadow-brand hover:border-brand-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 via-pink-500 to-orange-500 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
            <div className="bg-pink-500/20 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Instagram className="text-pink-400 w-8 h-8 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-semibold mb-1">Instagram</p>
              <span className="text-white font-bold text-lg">@cakralimatujuhtrans</span>
            </div>
          </a>

          <a
            href="https://www.google.com/maps/search/MMM9%2BQ4C,+Lidah+Wetan,+Kec.+Lakarsantri,+Surabaya,+Jawa+Timur+60213,+Indonesia,+Kota+Surabaya,+Jawa+Timur+60264/@-7.3155,112.6677,17z?hl=id&entry=ttu"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col justify-center gap-4 bg-gray-900/60 border border-gray-800 p-4 md:p-6 sm:p-8 rounded-2xl md:rounded-3xl hover:shadow-brand hover:border-brand-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>
            <div className="bg-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0">
              <MapPin className="text-blue-400 w-8 h-8 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <p className="text-sm text-gray-400 font-semibold mb-1">Lokasi Garasi</p>
              <span className="text-white font-bold text-lg line-clamp-2">Lidah Wetan, Surabaya</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
