import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Camera, Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";

export default function VehicleVerification() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [verificationType, setVerificationType] = useState("before"); // "before" or "after"
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch orders that need vehicle verification
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      where("status", "in", ["disetujui", "dalam perjalanan", "menunggu pembayaran"]),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersData);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    setPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitVerification = async () => {
    if (!selectedOrder || photos.length === 0) {
      alert("Mohon pilih order dan upload foto terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create verification record
      const verificationData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        type: verificationType,
        notes: notes,
        photos: photos.map(photo => ({
          name: photo.name,
          size: photo.size,
          type: photo.type
        })),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "vehicleVerifications"), verificationData);

      // Update order with verification status
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        [`vehicleVerification${verificationType === "before" ? "Before" : "After"}`]: true,
        updatedAt: new Date()
      });

      // Reset form
      setSelectedOrder(null);
      setNotes("");
      setPhotos([]);
      setVerificationType("before");

      alert("Verifikasi berhasil disimpan!");
    } catch (error) {
      console.error("Error submitting verification:", error);
      alert("Terjadi kesalahan saat menyimpan verifikasi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "disetujui":
        return "bg-blue-100 text-blue-800";
      case "dalam perjalanan":
        return "bg-yellow-100 text-yellow-800";
      case "menunggu pembayaran":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "disetujui":
        return "Disetujui";
      case "dalam perjalanan":
        return "Dalam Perjalanan";
      case "menunggu pembayaran":
        return "Menunggu Pembayaran";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Verifikasi Mobil</h1>
          <p className="text-gray-600 mt-2">Dokumentasi keadaan mobil sebelum dan sesudah sewa</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Aktif</h2>
              </div>
              <div className="p-4">
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Tidak ada order aktif</p>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                        selectedOrder?.id === order.id
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{order.namaMobil}</h3>
                          <p className="text-sm text-gray-600">{order.email}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Verification Form */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Verifikasi - {selectedOrder.namaMobil}
                  </h2>
                </div>

                <div className="p-6">
                  {/* Verification Type Toggle */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jenis Verifikasi
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setVerificationType("before")}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          verificationType === "before"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sebelum Sewa
                      </button>
                      <button
                        onClick={() => setVerificationType("after")}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          verificationType === "after"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sesudah Sewa
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan Verifikasi
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Baret pada bagian pintu depan kiri, kondisi ban depan kiri kurang baik, dll."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Catat kondisi mobil yang perlu didokumentasikan
                    </p>
                  </div>

                  {/* Photo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto/Video Dokumentasi
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Foto/Video
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        Upload foto atau video kondisi mobil
                      </p>
                    </div>

                    {/* Photo Preview */}
                    {photos.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {photos.map((photo, index) => (
                          <div key={index} className="relative">
                            <div className="bg-gray-100 rounded-lg p-2">
                              <div className="text-xs text-gray-600 mb-1">
                                {photo.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(photo.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                            <button
                              onClick={() => removePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={submitVerification}
                      disabled={isSubmitting || photos.length === 0}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Simpan Verifikasi
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Pilih Order untuk Verifikasi
                </h3>
                <p className="text-gray-500">
                  Pilih order dari daftar di sebelah kiri untuk mulai verifikasi mobil
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
