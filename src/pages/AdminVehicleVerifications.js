import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Camera, Calendar, User, Car, Eye, Download } from "lucide-react";

export default function AdminVehicleVerifications() {
  const [user, setUser] = useState(null);
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [filter, setFilter] = useState("all"); // all, today, week, month

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch all vehicle verifications
    const q = query(
      collection(db, "vehicleVerifications"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const verificationsData = [];
      querySnapshot.forEach((doc) => {
        verificationsData.push({ id: doc.id, ...doc.data() });
      });
      setVerifications(verificationsData);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.toDate()).toLocaleString("id-ID");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sebelum":
        return "bg-blue-100 text-blue-800";
      case "sesudah":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "sebelum":
        return "Sebelum Sewa";
      case "sesudah":
        return "Sesudah Sewa";
      default:
        return status;
    }
  };

  const filteredVerifications = verifications.filter((verification) => {
    if (filter === "all") return true;

    const now = new Date();
    const verificationDate = new Date(verification.timestamp?.toDate());

    switch (filter) {
      case "today":
        return verificationDate.toDateString() === now.toDateString();
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return verificationDate >= weekAgo;
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return verificationDate >= monthAgo;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bukti Foto Keadaan Mobil</h1>
          <p className="text-gray-600 mt-2">Lihat foto verifikasi keadaan mobil sebelum dan sesudah disewa</p>
        </div>

        {/* Filter */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter("today")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "today"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilter("week")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "week"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setFilter("month")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "month"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Verifikasi</p>
                <p className="text-2xl font-bold text-gray-900">{verifications.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sebelum Sewa</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verifications.filter(v => v.status === "sebelum").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sesudah Sewa</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verifications.filter(v => v.status === "sesudah").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hari Ini</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verifications.filter(v => {
                    const today = new Date().toDateString();
                    const verificationDate = new Date(v.timestamp?.toDate()).toDateString();
                    return verificationDate === today;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verifications List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Daftar Verifikasi ({filteredVerifications.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredVerifications.length === 0 ? (
              <div className="p-8 text-center">
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada verifikasi mobil</p>
              </div>
            ) : (
              filteredVerifications.map((verification) => (
                <div
                  key={verification.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(verification.status)}`}>
                          {getStatusText(verification.status)}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          {formatDate(verification.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Order ID</p>
                          <p className="font-medium text-gray-900">{verification.orderId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Driver</p>
                          <p className="font-medium text-gray-900">{verification.driverId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Mobil</p>
                          <p className="font-medium text-gray-900">{verification.namaMobil}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Client</p>
                          <p className="font-medium text-gray-900">{verification.clientEmail}</p>
                        </div>
                      </div>

                      {verification.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600">Catatan</p>
                          <p className="text-gray-900 bg-gray-50 p-2 rounded">{verification.notes}</p>
                        </div>
                      )}

                      {/* Photo Preview */}
                      {verification.photos && verification.photos.length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Foto ({verification.photos.length})</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {verification.photos.map((photo, index) => (
                              <div key={index} className="relative">
                                <div className="bg-gray-100 rounded-lg p-2 text-center">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {photo.name || `Foto ${index + 1}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {(photo.size / 1024 / 1024).toFixed(2)} MB
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={() => setSelectedVerification(verification)}
                        className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {selectedVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detail Verifikasi Mobil
                  </h3>
                  <button
                    onClick={() => setSelectedVerification(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informasi Verifikasi</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedVerification.status)}`}>
                          {getStatusText(selectedVerification.status)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal:</span>
                        <span className="text-gray-900">{formatDate(selectedVerification.timestamp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order ID:</span>
                        <span className="text-gray-900">{selectedVerification.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Driver ID:</span>
                        <span className="text-gray-900">{selectedVerification.driverId}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informasi Order</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Mobil:</span>
                        <span className="text-gray-900">{selectedVerification.namaMobil}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Client:</span>
                        <span className="text-gray-900">{selectedVerification.clientEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedVerification.notes && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Catatan</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedVerification.notes}</p>
                  </div>
                )}

                {selectedVerification.photos && selectedVerification.photos.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Foto Bukti</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedVerification.photos.map((photo, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-2">
                            {photo.name || `Foto ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {(photo.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                          <div className="bg-gray-100 rounded p-8 text-center">
                            <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                            <p className="text-sm text-gray-500 mt-2">Foto tersimpan di database</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
