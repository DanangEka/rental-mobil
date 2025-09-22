import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, CreditCard, User, ArrowRight, Plus } from "lucide-react";

export default function AdminDriverManagement() {
  const [activeTab, setActiveTab] = useState("overview");

  const menuItems = [
    {
      id: "vehicle-verifications",
      title: "Bukti Foto Keadaan Mobil",
      description: "Lihat foto verifikasi keadaan mobil sebelum dan sesudah disewa",
      icon: <Camera className="h-8 w-8" />,
      path: "/admin-vehicle-verifications",
      color: "bg-blue-500"
    },
    {
      id: "payment-verifications",
      title: "Bukti Pembayaran Cash",
      description: "Lihat bukti pembayaran cash dari driver",
      icon: <CreditCard className="h-8 w-8" />,
      path: "/admin-payment-verifications",
      color: "bg-green-500"
    },
    {
      id: "driver-profiles",
      title: "Profil Driver",
      description: "Kelola profil dan informasi driver",
      icon: <User className="h-8 w-8" />,
      path: "/admin-driver-profiles",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Management Driver</h1>
              <p className="text-gray-600 mt-2">Kelola verifikasi dan profil driver</p>
            </div>
            <Link
              to="/admin-add-driver"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Tambah Driver
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`inline-flex p-3 rounded-lg ${item.color} text-white mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {item.description}
                  </p>
                  <div className="flex items-center text-blue-600 hover:text-blue-700 font-medium">
                    <span>Lihat Detail</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ringkasan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-gray-600">Verifikasi Mobil Hari Ini</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-gray-600">Pembayaran Terverifikasi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-gray-600">Driver Aktif</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
