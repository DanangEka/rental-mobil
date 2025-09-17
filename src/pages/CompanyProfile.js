import { useEffect, useState } from "react";
import { Instagram, MapPin, Phone } from "lucide-react";
import logo from "../assets/logo.png";

export default function CompanyProfile() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <div
      className={`p-4 min-h-screen transition-opacity duration-700 ${
        animate ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "#010101" }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img
          src={logo}
          alt="Logo"
          className="h-32 w-32 rounded-full object-contain shadow-2xl border-4 border-red-600"
        />
      </div>

      {/* Informasi Usaha */}
      <div className="max-w-3xl mx-auto mt-8 bg-gray-900 rounded-3xl shadow-2xl p-10 md:p-16 border border-gray-800">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-8 border-b border-red-600 pb-6 text-center text-white tracking-wide">
          Tentang Cakra Lima Tujuh
        </h2>

        <p className="text-gray-300 mb-10 text-lg md:text-xl text-justify leading-relaxed tracking-wide">
          Cakra Lima Tujuh adalah layanan rental mobil terpercaya yang menyediakan berbagai pilihan kendaraan berkualitas untuk keperluan pribadi, bisnis, dan perjalanan wisata. Kami berkomitmen untuk memberikan pelayanan terbaik dengan harga bersaing, serta kemudahan dalam proses pemesanan dan pengambilan mobil. Dengan tim profesional dan armada yang selalu terawat, kami siap menjadi partner perjalanan Anda.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col items-center text-center gap-4 bg-gray-800 border border-gray-700 p-8 rounded-3xl hover:shadow-2xl hover:border-red-600 transition-all duration-300">
            <div className="bg-red-600 p-5 rounded-full shadow-lg flex items-center justify-center">
              <Phone className="text-white w-10 h-10" />
            </div>
            <div>
              <p className="text-base text-gray-400 font-semibold mb-1">WhatsApp</p>
              <a
                href="https://wa.me/6287859660053"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 font-semibold transition-colors text-lg break-words"
              >
                +62 812-3456-7890
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-4 bg-gray-800 border border-gray-700 p-8 rounded-3xl hover:shadow-2xl hover:border-red-600 transition-all duration-300">
            <div className="bg-red-600 p-5 rounded-full shadow-lg flex items-center justify-center">
              <Instagram className="text-white w-10 h-10" />
            </div>
            <div>
              <p className="text-base text-gray-400 font-semibold mb-1">Instagram</p>
              <a
                href="https://instagram.com/cakralimatujuhtrans"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 font-semibold transition-colors text-lg break-words"
              >
                @cakralimatujuhtrans
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-4 bg-gray-800 border border-gray-700 p-8 rounded-3xl hover:shadow-2xl hover:border-red-600 transition-all duration-300 md:col-span-2">
            <div className="bg-red-600 p-5 rounded-full shadow-lg flex items-center justify-center">
              <MapPin className="text-white w-10 h-10" />
            </div>
            <div>
              <p className="text-base text-gray-400 font-semibold mb-1">Lokasi Usaha</p>
              <a
                href="https://www.google.com/maps/search/MMM9%2BQ4C,+Lidah+Wetan,+Kec.+Lakarsantri,+Surabaya,+Jawa+Timur+60213,+Indonesia,+Kota+Surabaya,+Jawa+Timur+60264/@-7.3155,112.6677,17z?hl=id&entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 font-semibold transition-colors text-lg break-words"
              >
                Lihat di Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
