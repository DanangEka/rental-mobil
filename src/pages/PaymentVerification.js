// PaymentVerification.js - Updated to fix composite index error (v2.0)
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { CreditCard, Upload, DollarSign, CheckCircle, Camera, FileText } from "lucide-react";
import InvoiceGenerator from "../components/InvoiceGenerator";

export default function PaymentVerification() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentPhotos, setPaymentPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addNotification = async (message) => {
    try {
      console.log("Adding notification for user:", user.uid, "message:", message);
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        message,
        timestamp: serverTimestamp(),
        read: false,
      });
      console.log("Notification added successfully");
    } catch (error) {
      console.error("Failed to add notification:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch orders that are currently in progress - using getDocs to avoid listener issues
    const fetchOrders = async () => {
      try {
        // Use getDocs instead of onSnapshot to avoid real-time listener issues
        const { getDocs } = await import("firebase/firestore");
        const querySnapshot = await getDocs(collection(db, "pemesanan"));

        const ordersData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter by driverId and status client-side to completely avoid composite index
          if (data.driverId === user.uid && ["dalam perjalanan", "menunggu pembayaran"].includes(data.status)) {
            ordersData.push({ id: doc.id, ...data });
          }
        });

        // Sort by date client-side
        ordersData.sort((a, b) => {
          const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
          const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
          return dateB - dateA;
        });

        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      }
    };

    fetchOrders();

    // Set up a simple interval to refresh data every 30 seconds
    const interval = setInterval(fetchOrders, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    setPaymentPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPaymentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitPaymentVerification = async () => {
    if (!selectedOrder || !paymentAmount) {
      alert("Mohon lengkapi semua field yang diperlukan");
      return;
    }

    // For cash payments, require photos
    if (paymentMethod === "cash" && paymentPhotos.length === 0) {
      alert("Untuk pembayaran cash, mohon upload minimal 1 foto bukti pembayaran");
      return;
    }

    const amount = parseInt(paymentAmount);
    const expectedDP = Math.floor(selectedOrder.perkiraanHarga * 0.5);
    if (amount !== expectedDP) {
      alert(`Jumlah pembayaran (Rp ${amount.toLocaleString()}) tidak sesuai dengan DP 50% yang seharusnya (Rp ${expectedDP.toLocaleString()}) dari total Rp ${selectedOrder.perkiraanHarga.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Create payment verification record
      const paymentData = {
        orderId: selectedOrder.id,
        driverId: user.uid,
        userId: selectedOrder.uid, // Add userId for reference
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

      // Make car available again
      if (selectedOrder.mobilId) {
        await updateDoc(doc(db, "mobil", selectedOrder.mobilId), {
          tersedia: true,
          status: "normal"
        });
        console.log(`Car ${selectedOrder.mobilId} made available again after payment verification`);
      }

      // Generate Full Payment Invoice
      try {
        const completedOrder = {
          ...selectedOrder,
          status: "selesai",
          actualPaymentAmount: amount,
          paymentVerifiedAt: new Date()
        };
        InvoiceGenerator.generateFullInvoice(completedOrder, userData);
        await addNotification("Invoice pembayaran penuh telah dibuat dan didownload");
      } catch (invoiceError) {
        console.error("Error generating full payment invoice:", invoiceError);
        // Don't show error to user as payment verification was successful
      }

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
      case "dalam perjalanan":
        return "Dalam Perjalanan";
      case "menunggu pembayaran":
        return "Menunggu Pembayaran";
      default:
        return status;
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case "Cash":
        return "bg-green-100 text-green-800";
      case "Transfer Bank":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "Cash":
        return "Tunai";
      case "Transfer Bank":
        return "Transfer Bank";
      default:
        return method || "Tidak ada info";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Verifikasi Pembayaran</h1>
          <p className="text-gray-600 mt-2">Tampilkan order yang sedang berlangsung dan verifikasi pembayaran cash dengan upload foto bukti</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Sedang Berlangsung</h2>
              </div>
              <div className="p-4">
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Tidak ada order yang sedang berlangsung</p>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrder(order);
                        // Automatically set payment amount to 50% of total (DP system)
                        const dpAmount = Math.floor(order.perkiraanHarga * 0.5);
                        setPaymentAmount(dpAmount.toString());
                        setPaymentMethod(order.paymentMethod || "cash");
                      }}
                      className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                        selectedOrder?.id === order.id
                          ? "bg-orange-100 border-2 border-orange-500"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{order.namaMobil}</h3>
                          <p className="text-sm text-gray-600">{order.email}</p>
                          <p className="text-sm font-semibold text-green-600">
                            Rp {order.perkiraanHarga?.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(order.paymentMethod)}`}>
                            {getPaymentMethodText(order.paymentMethod)}
                          </span>
                        </div>
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
                        <span className="text-gray-600">Total Order:</span>
                        <p className="font-semibold text-green-600">
                          Rp {selectedOrder.perkiraanHarga?.toLocaleString()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">DP (50%) yang harus dibayar:</span>
                        <p className="font-bold text-orange-600 text-lg">
                          Rp {paymentAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah DP (50%) yang Diterima
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 font-medium">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      DP otomatis dihitung 50% dari total order (Rp {selectedOrder.perkiraanHarga?.toLocaleString()})
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metode Pembayaran
                    </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-800">
                        <strong>Info:</strong> {getPaymentMethodText(selectedOrder.paymentMethod)}
                        {selectedOrder.paymentMethod === "Cash" && " - Upload foto bukti pembayaran diperlukan"}
                        {selectedOrder.paymentMethod === "Transfer Bank" && " - Verifikasi pembayaran otomatis"}
                      </p>
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      disabled={selectedOrder.status === "menunggu pembayaran"}
                    >
                      <option value="cash">Tunai (Cash)</option>
                      <option value="transfer">Transfer Bank</option>
                      <option value="other">Lainnya</option>
                    </select>
                    {selectedOrder.status === "menunggu pembayaran" && (
                      <p className="text-sm text-gray-500 mt-1">
                        Metode pembayaran tidak dapat diubah saat verifikasi pembayaran
                      </p>
                    )}
                  </div>

                  {/* Payment Photos - Only for Cash */}
                  {(paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash") && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto Bukti Pembayaran <span className="text-red-500">*</span>
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
                          Upload foto bukti pembayaran (minimal 1 foto diperlukan untuk pembayaran cash)
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
                  )}

                  {/* Info for Transfer Payment */}
                  {paymentMethod === "transfer" && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <p className="text-sm text-green-800">
                          <strong>Pembayaran Transfer Bank:</strong> Bukti transfer akan diverifikasi otomatis oleh sistem
                        </p>
                      </div>
                    </div>
                  )}

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
                      disabled={
                        isSubmitting ||
                        !paymentAmount ||
                        ((paymentMethod === "cash" || selectedOrder?.paymentMethod === "Cash") && paymentPhotos.length === 0)
                      }
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
                  Pilih order yang sedang berlangsung dari daftar di sebelah kiri untuk verifikasi pembayaran
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Info:</strong> Upload foto bukti pembayaran hanya diperlukan untuk pembayaran cash/tunai
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
