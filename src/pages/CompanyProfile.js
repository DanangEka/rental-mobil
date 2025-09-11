import { auth } from "../services/firebase";
import { Instagram, MapPin, Phone } from "lucide-react";
import logo from "../assets/logo.png";

export default function CompanyProfile() {
  if (!auth.currentUser) {
    return <div className="p-4 text-white">Silakan login terlebih dahulu.</div>;
  }

  return (
    <div className="p-4 min-h-screen bg-black text-white">
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img src={logo} alt="Logo" className="h-24 w-24 rounded-full object-contain" />
      </div>

      {/* Informasi Usaha */}
      <div className="max-w-3xl mx-auto mt-4 bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 border-b border-red-600 pb-2 text-center">
          Tentang Cakra Lima Tujuh
        </h2>

        <p className="text-gray-300 mb-6 text-sm text-justify">
          Cakra Lima Tujuh adalah layanan rental mobil terpercaya yang menyediakan berbagai pilihan kendaraan berkualitas untuk keperluan pribadi, bisnis, dan perjalanan wisata. Kami berkomitmen untuk memberikan pelayanan terbaik dengan harga bersaing, serta kemudahan dalam proses pemesanan dan pengambilan mobil. Dengan tim profesional dan armada yang selalu terawat, kami siap menjadi partner perjalanan Anda.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-red-800/30 p-4 rounded-md">
            <Phone className="text-red-400" />
            <div>
              <p className="text-sm text-gray-400">WhatsApp</p>
              <a
                href="https://wa.me/6287859660053"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                +62 812-3456-7890
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-red-800/30 p-4 rounded-md">
            <Instagram className="text-red-400" />
            <div>
              <p className="text-sm text-gray-400">Instagram</p>
              <a
                href="https://instagram.com/cakralimatujuhtrans"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                @cakralimatujuhtrans
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-red-800/30 p-4 rounded-md">
            <MapPin className="text-red-400" />
            <div>
              <p className="text-sm text-gray-400">Lokasi Usaha</p>
              <a
                href="https://www.google.com/maps/search/MMM9%2BQ4C,+Lidah+Wetan,+Kec.+Lakarsantri,+Surabaya,+Jawa+Timur+60213,+Indonesia,+Kota+Surabaya,+Jawa+Timur+60264/@-7.3155,112.6677,17z?hl=id&entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
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
