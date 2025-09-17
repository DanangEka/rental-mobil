import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="text-center animate-fadeInUp">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight animate-fadeInUp delay-100">
              Sewa Mobil Impian Anda
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl opacity-90 mb-8 max-w-3xl mx-auto leading-relaxed animate-fadeInUp delay-200">
              Pilih dari koleksi mobil premium kami dengan harga terjangkau dan layanan profesional
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp delay-300">
              <button
                onClick={() => {
                  navigate("/company-profile");
                }}
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-red-900 font-semibold py-4 px-8 rounded-lg transition-all duration-200 text-lg inline-block text-center"
              >
                Tentang Kami
              </button>
              <button
                onClick={() => {
                  if (auth.currentUser) {
                    navigate("/home");
                  } else {
                    navigate("/login");
                  }
                }}
                className="bg-white text-red-900 font-semibold py-4 px-8 rounded-lg transition-all duration-200 text-lg inline-block text-center hover:bg-red-900 hover:text-white ml-4"
              >
                Sewa Sekarang
              </button>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-10 w-24 h-24 bg-red-300 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-red-400 rounded-full"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 animate-fadeInUp delay-400">
        <div className="text-center mb-16 animate-fadeInUp delay-500">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Mengapa Memilih Kami?</h2>
          <p className="text-xl opacity-80 max-w-2xl mx-auto">
            Kami menyediakan pengalaman sewa mobil yang tak tertandingi dengan komitmen penuh pada kualitas dan kepuasan pelanggan
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm animate-fadeInUp delay-600">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Mobil Berkualitas</h3>
            <p className="opacity-80">Koleksi mobil premium yang selalu dalam kondisi prima dan terawat</p>
          </div>

          <div className="text-center p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm animate-fadeInUp delay-700">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Harga Terjangkau</h3>
            <p className="opacity-80">Tarif sewa kompetitif dengan transparansi harga tanpa biaya tersembunyi</p>
          </div>

          <div className="text-center p-6 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm animate-fadeInUp delay-800">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Layanan 24/7</h3>
            <p className="opacity-80">Dukungan pelanggan siap membantu Anda kapan saja diperlukan</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-red-700 py-16 animate-fadeInUp delay-900">
        <div className="max-w-4xl mx-auto text-center px-4 animate-fadeInUp delay-1000">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap Memulai Perjalanan Anda?</h2>
          <p className="text-xl opacity-90 mb-8">
            Daftar sekarang dan nikmati kemudahan sewa mobil bersama kami
          </p>
          <Link
            to="/signup"
            className="bg-white text-red-700 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-200 text-lg shadow-lg hover:shadow-xl"
          >
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
