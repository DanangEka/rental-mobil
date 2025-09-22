import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { CreditCard, Upload, DollarSign, CheckCircle, Camera, FileText } from "lucide-react";

export default function PaymentVerification() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentPhotos, setPaymentPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch orders waiting for payment verification
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      where("status", "==", "menunggu pembayaran"),
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
    setPaymentPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPaymentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitPaymentVerification = async () => {
    if (!selectedOrder || !paymentAmount || paymentPhotos.length === 0) {
      alert("Mohon lengkapi semua field yang diperlukan");
      return;
    }

    const amount = parseInt(paymentAmount);
    if (amount !== selectedOrder.perkiraanHarga) {
      alert(`Jumlah pembayaran (Rp ${amount.toLocaleString()}) tidak sesuai dengan total order (Rp ${selectedOrder.perkiraanHarga.toLocaleString()})`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create payment verification record
      const paymentData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        amount: amount,
        method: paymentMethod,
        photos: paymentPhotos.map(photo => ({
          name: photo.name,
          size: photo.size,
          type: photo.type
        })),
        notes: notes,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "paymentVerifications"), paymentData);

      // Update order status to completed
      await updateDoc(doc(db, "pemesanan", selectedOrder.id), {
        status: "selesai",
        actualPaymentAmount: amount,
        paymentVerifiedAt: new Date(),
        updatedAt: new Date()
      });

      // Reset form
      setSelectedOrder(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentPhotos([]);
      setNotes("");

      alert("Verifikasi pembayaran berhasil! Order telah selesai.");
    } catch (error) {
      console.error("Error submitting payment verification:", error);
      alert("Terjadi kesalahan saat menyimpan verifikasi pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "menunggu pembayaran":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
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
          <h1 className="text-3xl font-bold text-gray-900">Verifikasi Pembayaran</h1>
          <p className="text-gray-600 mt-2">Verifikasi pembayaran cash dengan foto dan form jumlah pembayaran</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Menunggu Pembayaran</h2>
              </div>
              <div className="p-4">
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Tidak ada order yang menunggu pembayaran</p>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        setPaymentAmount(order.perkiraanHarga.toString());
                      }}
                      className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                        selectedOrder?.id === order.id
                          ? "bg-orange-100 border-2 border-orange-500"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{order.namaMobil}</h3>
                          <p className="text-sm text-gray-600">{order.email}</p>
                          <p className="text-sm font-semibold text-green-600">
                            Rp {order.perkiraanHarga?.toLocaleString()}
                          </p>
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

          {/* Payment Verification Form */}
          <div className="lg:col-span-2">
            {selectedOrder ? (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Verifikasi Pembayaran - {selectedOrder.namaMobil}
                  </h2>
                </div>

                <div className="p-6">
                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium text-gray-900 mb-2">Ringkasan Order</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Mobil:</span>
                        <p className="font-medium">{selectedOrder.namaMobil}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Client:</span>
                        <p className="font-medium">{selectedOrder.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Tanggal:</span>
                        <p className="font-medium">
                          {selectedOrder.tanggalMulai ? new Date(selectedOrder.tanggalMulai).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <p className="font-semibold text-green-600">
                          Rp {selectedOrder.perkiraanHarga?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah Pembayaran yang Diterima
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Masukkan jumlah pembayaran yang diterima dari client
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metode Pembayaran
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="cash">Tunai (Cash)</option>
                      <option value="transfer">Transfer Bank</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>

                  {/* Payment Photos */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto Bukti Pembayaran
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="payment-photo-upload"
                      />
                      <label
                        htmlFor="payment-photo-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Foto Bukti
                      </label>
                      <p className="text-sm text-gray-500 mt-2">
                        Upload foto bukti pembayaran (struk, transfer, dll)
                      </p>
                    </div>

                    {/* Photo Preview */}
                    {paymentPhotos.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {paymentPhotos.map((photo, index) => (
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
                              <span className="text-xs">×</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan (Opsional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Catatan tambahan mengenai pembayaran..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={submitPaymentVerification}
                      disabled={isSubmitting || !paymentAmount || paymentPhotos.length === 0}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Memproses...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Konfirmasi Pembayaran
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Pilih Order untuk Verifikasi Pembayaran
                </h3>
                <p className="text-gray-500">
                  Pilih order dari daftar di sebelah kiri untuk mulai verifikasi pembayaran
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
