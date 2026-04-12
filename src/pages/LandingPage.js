import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { Car, ShieldCheck, Clock, Star, MapPin, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-brand-500 selection:text-white flex flex-col pt-[72px]">
      {/* Hero Section */}
      <div className="relative overflow-hidden flex-1 flex flex-col justify-center min-h-[calc(100vh-72px)]">
        {/* Background gradient & particles */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#1a0000] to-black z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none z-0">
          <div className="absolute top-20 right-10 w-96 h-96 bg-brand-600 rounded-full mix-blend-screen filter blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-red-900 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 md:py-20 relative z-10 w-full flex-1 flex flex-col justify-center">
          <div className="text-center md:text-left md:w-2/3 lg:w-3/5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-900/30 border border-brand-500/30 text-brand-200 font-medium text-sm md:text-base mb-6 md:mb-8 animate-fadeInUp">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
              Jasa Rental Mobil Terpercaya
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-tight animate-fadeInUp delay-100">
              Perjalanan <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                Lebih Mudah
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-300 mb-6 md:mb-10 max-w-xl leading-relaxed animate-fadeInUp delay-200 font-light hidden sm:block">
              Pilih dari koleksi mobil premium kami dengan harga terjangkau, layanan profesional, dan jaminan kondisi armada terbaik.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp delay-300">
              <button
                onClick={() => {
                  if (auth.currentUser) {
                    navigate("/home");
                  } else {
                    navigate("/login");
                  }
                }}
                className="btn-brand text-lg px-4 md:px-8 py-4 w-full sm:w-auto text-center"
              >
                Mulai Sewa Sekarang
              </button>
              <button
                onClick={() => navigate("/company-profile")}
                className="btn-outline text-lg px-4 md:px-8 py-4 w-full sm:w-auto text-center"
              >
                Tentang Kami
              </button>
            </div>

            {/* Stats / Trust Indicators */}
            <div className="mt-16 grid grid-cols-3 gap-4 md:gap-6 pt-8 border-t border-white/10 animate-fadeInUp delay-400">
              <div>
                <p className="text-2xl md:text-3xl font-black text-white mb-1">50+</p>
                <p className="text-sm text-brand-200 font-medium">Pilihan Mobil</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-white mb-1">99%</p>
                <p className="text-sm text-brand-200 font-medium">Pelanggan Puas</p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-white mb-1">24/7</p>
                <p className="text-sm text-brand-200 font-medium">Layanan Bantuan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Vehicle Icon */}
        <div className="hidden lg:block absolute right-10 bottom-20 z-0 opacity-20 transform -scale-x-100 animate-float text-brand-800 pointer-events-none">
          <Car size={400} strokeWidth={0.5} />
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-[#0a0a0a] py-24 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-2xl md:text-3xl md:text-5xl font-bold mb-4">Mengapa Memilih Kami?</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Kami menyediakan pengalaman sewa mobil yang tak tertandingi dengan komitmen penuh pada kualitas armada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="glass-card bg-gray-900/40 p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-3xl card-hover animate-fadeInUp delay-100 group border-gray-800">
              <div className="w-16 h-16 bg-brand-900/30 border border-brand-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-600 transition-all duration-300">
                <Car className="text-brand-400 group-hover:text-white transition-colors" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Mobil Berkualitas</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                Koleksi mobil premium yang selalu dalam kondisi prima, terawat secara berkala, dan berasuransi penuh.
              </p>
            </div>

            <div className="glass-card bg-gray-900/40 p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-3xl card-hover animate-fadeInUp delay-200 group border-gray-800">
              <div className="w-16 h-16 bg-brand-900/30 border border-brand-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-600 transition-all duration-300">
                <ShieldCheck className="text-brand-400 group-hover:text-white transition-colors" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Harga Terjangkau</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                Tarif sewa kompetitif dengan transparansi harga 100% tanpa adanya biaya tersembunyi yang mengejutkan.
              </p>
            </div>

            <div className="glass-card bg-gray-900/40 p-5 sm:p-8 md:p-10 rounded-2xl md:rounded-3xl card-hover animate-fadeInUp delay-300 group border-gray-800">
              <div className="w-16 h-16 bg-brand-900/30 border border-brand-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-brand-600 transition-all duration-300">
                <Clock className="text-brand-400 group-hover:text-white transition-colors" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Layanan 24/7</h3>
              <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                Dukungan pelanggan dan bantuan darurat yang siap membantu Anda kapan saja diperlukan di mana pun.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 overflow-hidden bg-brand-900 mt-auto">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-0"></div>
        <div className="max-w-4xl mx-auto text-center px-4 relative z-10 animate-fadeInUp">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl md:text-5xl font-black mb-6 text-white drop-shadow-lg">
            Siap Memulai Perjalanan Anda?
          </h2>
          <p className="text-xl text-brand-100 mb-6 md:mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Daftar sekarang dan nikmati kemudahan sewa mobil dengan berbagai penawaran menarik khusus untuk pelanggan.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="bg-white text-brand-900 hover:bg-gray-100 focus:ring-4 focus:ring-white/30 font-bold py-4 px-10 rounded-xl transition-all duration-300 text-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(0,0,0,0.4)]"
          >
            Daftar Sekarang
          </button>
        </div>
      </div>

      <footer className="bg-black py-4 md:py-6 text-center text-gray-500 text-sm relative z-10 border-t border-white/5">
        <p>&copy; {new Date().getFullYear()} Cakra Lima Tujuh. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}
