import { collection, doc, updateDoc, addDoc, query, where, onSnapshot, getDoc, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../services/firebase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Home() {
  const navigate = useNavigate();
  const [mobil, setMobil] = useState([]);
  const [tanggalMulai, setTanggalMulai] = useState({});
  const [tanggalSelesai, setTanggalSelesai] = useState({});
  const [rentalType, setRentalType] = useState({});
  const [paymentMethod, setPaymentMethod] = useState({});
  const [paymentProof, setPaymentProof] = useState({});
  const [userOrders, setUserOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  const addNotification = async (message) => {
    try {
      console.log("Adding notification for user:", auth.currentUser.uid, "message:", message);
      await addDoc(collection(db, "notifications"), {
        userId: auth.currentUser.uid,
        message,
        timestamp: Timestamp.now(),
        read: false,
      });
      console.log("Notification added successfully");
    } catch (error) {
      console.error("Failed to add notification:", error);
    }
  };

  const addAdminNotification = async (message) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        message,
        timestamp: Timestamp.now(),
        read: false,
      });
      console.log("Admin notification added successfully");
    } catch (error) {
      console.error("Failed to add admin notification:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log("User data fetched:", data);
        setUserData(data);
      } else {
        console.log("User document does not exist");
      }
    } catch (error) {
      console.error("Gagal fetch user data:", error);
    }
  };

  // Ambil data mobil
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    // Realtime listener mobil
    const unsubscribeMobil = onSnapshot(collection(db, "mobil"), (snapshot) => {
      setMobil(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          status: doc.data().status || "tersedia",
        }))
      );
    });

    // Cek admin role
    auth.currentUser.getIdTokenResult().then((idTokenResult) => {
      setIsAdmin(idTokenResult.claims.admin === true);
    });

    // Fetch user data
    fetchUserData();

    setLoading(false);

    return () => {
      unsubscribeMobil();
    };
  }, [navigate]);

  // Realtime listener pemesanan user or all orders if admin
  useEffect(() => {
    if (!auth.currentUser) return;

    let unsubscribeOrders;
    if (isAdmin) {
      unsubscribeOrders = onSnapshot(collection(db, "pemesanan"), (snapshot) => {
        setUserOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    } else {
      const ordersQuery = query(
        collection(db, "pemesanan"),
        where("uid", "==", auth.currentUser.uid)
      );
      unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        setUserOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [isAdmin]);

  const handleTanggalChange = (id, type, value) => {
    if (type === "mulai") {
      setTanggalMulai((prev) => ({ ...prev, [id]: value }));
    } else {
      setTanggalSelesai((prev) => ({ ...prev, [id]: value }));
    }
  };

  const getUserOrderForCar = (mobilId) => {
    // Return the order with status 'disetujui' or 'menunggu pembayaran' or 'diproses' for the car
    return userOrders.find((order) =>
      order.mobilId === mobilId &&
      (order.status === "disetujui" || order.status === "menunggu pembayaran" || order.status === "diproses")
    );
  };

  const handleSewa = async (m) => {
    if (!auth.currentUser) {
      alert("Silakan login terlebih dahulu.");
      return;
    }

    const existingOrder = getUserOrderForCar(m.id);
    if (
      existingOrder &&
      ["diproses", "disetujui", "approved", "menunggu pembayaran"].includes(
        existingOrder.status?.toLowerCase()
      )
    ) {
      alert("Anda sudah memiliki pemesanan aktif untuk mobil ini.");
      return;
    }

    const mulai = tanggalMulai[m.id];
    const selesai = tanggalSelesai[m.id];

    if (!mulai || !selesai) {
      alert("Pilih tanggal mulai dan selesai terlebih dahulu.");
      return;
    }

    const start = new Date(mulai);
    const end = new Date(selesai);
    const durasiHari = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (durasiHari <= 0) {
      alert("Tanggal selesai harus setelah tanggal mulai.");
      return;
    }

    let perkiraanHarga = durasiHari * m.harga;
    const selectedRentalType = rentalType[m.id] || "Lepas Kunci";
    if (selectedRentalType === "Driver") {
      perkiraanHarga += 250000;
    }
    
    try {
      await addDoc(collection(db, "pemesanan"), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        mobilId: m.id,
        namaMobil: m.nama,
        tanggal: new Date().toISOString(),
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        durasiHari,
        hargaPerhari: m.harga,
        perkiraanHarga,
        rentalType: selectedRentalType,
        status: "diproses",
        paymentStatus: "pending",
        namaClient: userData?.nama || userData?.NamaLengkap || auth.currentUser.displayName || "",
        telepon: userData?.nomorTelepon || userData?.NomorTelepon || auth.currentUser.phoneNumber || "",
        dpAmount: perkiraanHarga * 0.5,
      });

      await updateDoc(doc(db, "mobil", m.id), {
        status: "disewa",
        tersedia: false,
      });

      await addNotification("Pemesanan berhasil! Silakan tunggu konfirmasi.");
      await addAdminNotification(`Pesanan baru dari ${auth.currentUser.email}: ${m.nama}`);
    } catch (err) {
      console.error("Gagal menyewa:", err);
      alert("Terjadi kesalahan saat menyewa. Error: " + err.message);
    }
  };

const handlePaymentSubmit = async (order) => {
  if (!paymentMethod[order.id] && !order.paymentMethod) {
    alert("Silakan pilih metode pembayaran.");
    return;
  }
  if (!paymentProof[order.id]) {
    alert("Silakan unggah bukti pembayaran.");
    return;
  }

  try {
    // 1. Upload gambar ke Cloudinary
    const formData = new FormData();
    formData.append("file", paymentProof[order.id]);
    formData.append("upload_preset", process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);

    const cloudinaryRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );

    const paymentProofURL = cloudinaryRes.data.secure_url;

    // 2. Kirim data ke Google Sheets webhook / backend kamu
    const apiUrl =
      process.env.NODE_ENV === "production"
        ? "/api/payment-success"
        : process.env.SHEET_WEBHOOK_URL;

    await axios.post(apiUrl, {
      ...order,
      paymentMethod: paymentMethod[order.id] || order.paymentMethod,
      paymentProof: paymentProofURL,
      paymentStatus: "submitted",
      waktuUpload: new Date().toISOString(),
    });

    // 3. Update state lokal agar UI berubah
    await addNotification("Bukti Pembayaran Telah Terkirim");
    await addAdminNotification(`Pembayaran diterima dari ${order.email}: ${order.namaMobil}`);
    setUserOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { ...o, paymentStatus: "submitted", paymentProof: paymentProofURL }
          : o
      )
    );
  } catch (err) {
    console.error("Gagal mengirim bukti pembayaran:", err);
    alert("Terjadi kesalahan saat mengirim bukti pembayaran. Error: " + err.message);
  }
};



  return (
    <div
      className={`min-h-screen bg-black ${mobil.length > 0 ? "pb-20" : ""}`}
    >
      <div className="bg-red-900 text-white px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Sewa Mobil Terbaik
          </h1>
          <p className="text-base md:text-lg lg:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            Pilih mobil impian Anda dengan harga terjangkau dan layanan profesional
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-12 lg:px-8">
        {mobil.length === 0 ? (
          <div className="text-center py-16 md:py-20">
            <div className="text-gray-300 text-xl md:text-2xl font-medium">
              Tidak ada mobil tersedia saat ini
            </div>
            <p className="text-gray-400 mt-2">Silakan kembali lagi nanti</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-8 md:gap-10 lg:gap-12">
            {mobil.map((m) => {
              const statusLower = m.status?.toLowerCase();
              const order = getUserOrderForCar(m.id);
              const orderStatus = order?.status?.toLowerCase();

              return (
                <div
                  key={m.id}
                  className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 border border-gray-800 hover:border-red-600"
                >
                  <div className="relative aspect-video bg-gray-800">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div
                      className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                        ["servis", "service", "maintenance"].includes(statusLower)
                          ? "bg-yellow-500 text-yellow-900"
                          : ["disewa", "rented", "booked"].includes(statusLower)
                          ? "bg-red-600 text-white"
                          : "bg-green-600 text-white"
                      }`}
                    >
                      {["servis", "service", "maintenance"].includes(statusLower)
                        ? "Servis"
                        : ["disewa", "rented", "booked"].includes(statusLower)
                        ? "Disewa"
                        : "Tersedia"}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">{m.nama}</h3>
                    <p className="text-red-400 font-bold text-lg mb-4">
                      Rp {m.harga.toLocaleString()}{" "}
                      <span className="text-gray-400 text-sm font-normal">/ hari</span>
                    </p>

                    {/* Kondisi tampilan */}
                    {(() => {
                      // =============================
                      // Prioritas pertama: order user
                      // =============================
                      if (order && !isAdmin) {
                        if (orderStatus === "diproses") {
                          return (
                            <div className="text-center py-6">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-900 rounded-full mb-3">
                                <div className="w-6 h-6 bg-yellow-500 rounded-full animate-pulse"></div>
                              </div>
                              <div className="text-yellow-400 text-base font-semibold">
                                Mobil sedang diproses
                              </div>
                              <div className="text-gray-400 text-sm mt-1">
                                Mohon tunggu sebentar
                              </div>
                            </div>
                          );
                        } else if (
  ["disetujui", "menunggu pembayaran", "approved"].includes(orderStatus?.trim())
) {
  if (order.paymentStatus === "submitted") {
    return (
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-900 rounded-full mb-3">
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-green-400 text-base font-semibold">
          Bukti Pembayaran Berhasil Diupload
        </div>
        <div className="text-gray-400 text-sm mt-1">
          Menunggu konfirmasi admin
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="text-center bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-green-400 text-base font-semibold">
          Pesanan Disetujui
        </div>
        <div className="text-gray-300 text-sm mt-1">
          Silakan lakukan pembayaran DP untuk melanjutkan
        </div>
      </div>
      <div>
        <label className="text-sm text-gray-300 font-medium block mb-2">
          Metode Pembayaran
        </label>
        <select
          value={paymentMethod[order.id] || order.paymentMethod || ""}
          onChange={(e) =>
            setPaymentMethod((prev) => ({
              ...prev,
              [order.id]: e.target.value,
            }))
          }
          className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
        >
          <option value="">Pilih Metode</option>
          <option value="Transfer Bank">Transfer Bank</option>
          <option value="E-Wallet">E-Wallet</option>
          <option value="Cash">Cash</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-300 font-medium block mb-2">
          Bukti Pembayaran
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setPaymentProof((prev) => ({
              ...prev,
              [order.id]: e.target.files[0],
            }))
          }
          className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-600 file:text-white hover:file:bg-red-700 transition-colors"
        />
      </div>
      <button
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
        onClick={() => handlePaymentSubmit(order)}
      >
        Kirim Bukti Pembayaran
      </button>
    </div>
  );
                        } else if (orderStatus === "pembayaran berhasil") {
                          return (
                            <div className="text-center py-6">
                              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-900 rounded-full mb-3">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <div className="text-green-400 text-base font-semibold">
                                Pembayaran Telah Dikonfirmasi
                              </div>
                              <div className="text-gray-400 text-sm mt-1">Mobil siap diambil</div>
                            </div>
                          );
                        }
                      }

                      // =============================
                      // Kalau user tidak punya order
                      // =============================
                      if (
                        ["tersedia", "available", "ready", "normal"].includes(
                          statusLower
                        ) ||
                        m.tersedia === true
                      ) {
                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Tanggal Mulai
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={tanggalMulai[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "mulai", e.target.value)
                                    }
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Tanggal Selesai
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={tanggalSelesai[m.id] || ""}
                                    onChange={(e) =>
                                      handleTanggalChange(m.id, "selesai", e.target.value)
                                    }
                                    className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm text-red-400 font-medium block mb-2">
                                    Tipe Sewa
                                  </label>
                                  <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRentalType((prev) => ({
                                          ...prev,
                                          [m.id]: "Lepas Kunci",
                                        }))
                                      }
                                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                        rentalType[m.id] === "Lepas Kunci" || !rentalType[m.id]
                                          ? "bg-red-600 text-white shadow-md"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                      }`}
                                    >
                                      Lepas Kunci
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setRentalType((prev) => ({
                                          ...prev,
                                          [m.id]: "Driver",
                                        }))
                                      }
                                      className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                                        rentalType[m.id] === "Driver"
                                          ? "bg-red-600 text-white shadow-md"
                                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                      }`}
                                    >
                                      Driver
                                    </button>
                                  </div>
                                </div>
                            </div>

                            {tanggalMulai[m.id] && tanggalSelesai[m.id] && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-2 font-medium">Estimasi Biaya</p>
                                <p className="text-green-600 font-bold text-lg">
                                  Rp{" "}
                                  {(() => {
                                    const durasi = Math.ceil(
                                      (new Date(tanggalSelesai[m.id]) -
                                        new Date(tanggalMulai[m.id])) /
                                        (1000 * 60 * 60 * 24)
                                    );
                                    if (durasi <= 0) return "0";
                                    let total = durasi * m.harga;
                                    if ((rentalType[m.id] || "Lepas Kunci") === "Driver") {
                                      total += 250000;
                                    }
                                    return total.toLocaleString();
                                  })()}
                                </p>
                                {(rentalType[m.id] || "Lepas Kunci") === "Driver" && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Termasuk biaya driver: Rp 250.000
                                  </p>
                                )}
                              </div>
                            )}

                            <button
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                              onClick={() => handleSewa(m)}
                            >
                              Sewa Sekarang
                            </button>
                          </div>
                        );
                      }

                      if (statusLower === "disewa") {
                        return (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-900 rounded-full mb-3">
                              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                            <div className="text-red-400 text-base font-semibold">
                              Mobil sedang disewa
                            </div>
                            <div className="text-gray-400 text-sm mt-1">Cek kembali nanti</div>
                          </div>
                        );
                      }

                      if (statusLower === "servis") {
                        return (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-900 rounded-full mb-3">
                              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="text-yellow-400 text-base font-semibold">
                              Sedang dalam perawatan
                            </div>
                            <div className="text-gray-400 text-sm mt-1">
                              Akan tersedia segera
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section for Admin to view all incoming orders */}
        {isAdmin && userOrders.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-12 lg:px-8">
            <h2 className="text-2xl font-bold text-white mb-6">Pesanan Masuk</h2>
            <div className="space-y-4">
              {userOrders.map((order) => (
                <div key={order.id} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-gray-400">Mobil</span>
                      <p className="text-white font-semibold">{order.namaMobil}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Email Client</span>
                      <p className="text-white">{order.email}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Tanggal Sewa</span>
                      <p className="text-white">
                        {order.tanggalMulai ? new Date(order.tanggalMulai).toLocaleDateString() : 'N/A'} - {order.tanggalSelesai ? new Date(order.tanggalSelesai).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Status</span>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'diproses' ? 'bg-yellow-600 text-white' :
                        order.status === 'disetujui' ? 'bg-green-600 text-white' :
                        order.status === 'menunggu pembayaran' ? 'bg-orange-600 text-white' :
                        order.status === 'pembayaran berhasil' ? 'bg-blue-600 text-white' :
                        order.status === 'selesai' ? 'bg-purple-600 text-white' :
                        order.status === 'ditolak' ? 'bg-red-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-sm text-gray-400">Total Biaya</span>
                    <p className="text-green-400 font-bold">Rp {order.perkiraanHarga?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
