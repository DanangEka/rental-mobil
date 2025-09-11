import { collection, doc, updateDoc, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../services/firebase";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  // Ambil data mobil dan pemesanan user
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

    // Realtime listener pemesanan user
    const ordersQuery = query(
      collection(db, "pemesanan"),
      where("uid", "==", auth.currentUser.uid)
    );
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setUserOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // Cek admin role
    auth.currentUser.getIdTokenResult().then((idTokenResult) => {
      setIsAdmin(idTokenResult.claims.admin === true);
    });

    setLoading(false);

    return () => {
      unsubscribeMobil();
      unsubscribeOrders();
    };
  }, [navigate]);

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
        hargaPerHari: m.harga,
        perkiraanHarga,
        rentalType: selectedRentalType,
        status: "diproses",
        paymentStatus: "pending",
      });

      await updateDoc(doc(db, "mobil", m.id), {
        status: "disewa",
        tersedia: false,
      });

      alert("Pemesanan berhasil! Silakan tunggu konfirmasi.");
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
      const storageRef = ref(
        storage,
        `paymentProofs/${auth.currentUser.uid}_${order.mobilId}_${Date.now()}`
      );
      await uploadBytes(storageRef, paymentProof[order.id]);
      const paymentProofURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "pemesanan", order.id), {
        paymentMethod: paymentMethod[order.id] || order.paymentMethod,
        paymentProof: paymentProofURL,
        paymentStatus: "submitted",
      });

      alert("Bukti Pembayaran Telah Terkirim");
      // Refresh the orders to update the UI
      setUserOrders(prev => prev.map(o => o.id === order.id ? { ...o, paymentStatus: "submitted", paymentProof: paymentProofURL } : o));
    } catch (err) {
      console.error("Gagal mengirim bukti pembayaran:", err);
      alert("Terjadi kesalahan saat mengirim bukti pembayaran. Error: " + err.message);
    }
  };

  return (
    <div className={`min-h-screen bg-black ${mobil.length > 0 ? "pb-20" : ""}`}>
      <div className="bg-gradient-to-r from-[#990000] to-red-800 text-white px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Sewa Mobil Terbaik</h1>
          <p className="text-sm md:text-base opacity-90">
            Pilih mobil impian Anda dengan harga terjangkau
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 py-4 md:px-4 md:py-6">
        {mobil.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">Tidak ada mobil tersedia saat ini</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {mobil.map((m) => {
              const statusLower = m.status?.toLowerCase();
              const order = getUserOrderForCar(m.id);
              const orderStatus = order?.status?.toLowerCase();

              return (
                <div
                  key={m.id}
                  className="bg-gray-900 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                >
                  <div className="relative aspect-video bg-gray-800">
                    <img
                      src={m.gambar}
                      alt={m.nama}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div
                      className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        ["servis", "service", "maintenance"].includes(statusLower)
                          ? "bg-yellow-500 text-yellow-900"
                          : ["disewa", "rented", "booked"].includes(statusLower)
                          ? "bg-red-500 text-white"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {["servis", "service", "maintenance"].includes(statusLower)
                        ? "Servis"
                        : ["disewa", "rented", "booked"].includes(statusLower)
                        ? "Disewa"
                        : "Tersedia"}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1">{m.nama}</h3>
                    <p className="text-red-400 font-semibold text-sm mb-3">
                      Rp {m.harga.toLocaleString()}{" "}
                      <span className="text-gray-400 text-xs">/ hari</span>
                    </p>

                    {/* Kondisi tampilan */}
                    {(() => {
                      // =============================
                      // Prioritas pertama: order user
                      // =============================
                      if (order && !isAdmin) {
                        if (orderStatus === "diproses") {
                          return (
                            <div className="text-center py-4">
                              <div className="text-yellow-400 text-sm font-semibold">
                                Mobil sedang diproses
                              </div>
                              <div className="text-gray-500 text-xs mt-1">
                                Mohon tunggu sebentar
                              </div>
                            </div>
                          );
                        } else if (
  ["disetujui", "menunggu pembayaran", "approved"].includes(orderStatus?.trim())
) {
  if (order.paymentStatus === "submitted") {
    return (
      <div className="text-center py-4">
        <div className="text-green-400 text-sm font-semibold">
          Bukti Pembayaran Berhasil Diupload
        </div>
        <div className="text-gray-500 text-xs mt-1">
          Menunggu konfirmasi admin
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-green-400 text-sm font-semibold">
          Pesanan Disetujui
        </div>
        <div className="text-gray-500 text-xs mt-1">
          Silakan lakukan pembayaran DP untuk melanjutkan
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">
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
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2"
        >
          <option value="">Pilih Metode</option>
          <option value="Transfer Bank">Transfer Bank</option>
          <option value="E-Wallet">E-Wallet</option>
          <option value="Cash">Cash</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">
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
          className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2"
        />
      </div>
      <button
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm"
        onClick={() => handlePaymentSubmit(order)}
      >
        Kirim Bukti Pembayaran
      </button>
    </div>
  );
} else if (orderStatus === "pembayaran berhasil") {
                          return (
                            <div className="text-center py-4">
                              <div className="text-green-400 text-sm font-semibold">
                                Pembayaran Telah Dikonfirmasi
                              </div>
                              <div className="text-gray-500 text-xs mt-1">Mobil siap diambil</div>
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
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                  Tanggal Mulai
                                </label>
                                <input
                                  type="datetime-local"
                                  value={tanggalMulai[m.id] || ""}
                                  onChange={(e) =>
                                    handleTanggalChange(m.id, "mulai", e.target.value)
                                  }
                                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">
                                  Tanggal Selesai
                                </label>
                                <input
                                  type="datetime-local"
                                  value={tanggalSelesai[m.id] || ""}
                                  onChange={(e) =>
                                    handleTanggalChange(m.id, "selesai", e.target.value)
                                  }
                                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-2">
                                  Tipe Sewa
                                </label>
                                <div className="flex bg-gray-800 rounded-lg p-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRentalType((prev) => ({
                                        ...prev,
                                        [m.id]: "Lepas Kunci",
                                      }))
                                    }
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                                      rentalType[m.id] === "Lepas Kunci" || !rentalType[m.id]
                                        ? "bg-red-600 text-white"
                                        : "text-gray-300 hover:text-white hover:bg-gray-700"
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
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                                      rentalType[m.id] === "Driver"
                                        ? "bg-red-600 text-white"
                                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                                    }`}
                                  >
                                    Driver
                                  </button>
                                </div>
                              </div>
                            </div>

                            {tanggalMulai[m.id] && tanggalSelesai[m.id] && (
                              <div className="bg-gray-800 rounded-lg p-2">
                                <p className="text-xs text-gray-400 mb-1">Estimasi Biaya</p>
                                <p className="text-green-400 font-bold text-sm">
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
                                  <p className="text-xs text-gray-400 mt-1">
                                    Termasuk biaya driver: Rp 250.000
                                  </p>
                                )}
                              </div>
                            )}

                            <button
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-sm"
                              onClick={() => handleSewa(m)}
                            >
                              Sewa Sekarang
                            </button>
                          </div>
                        );
                      }

                      if (statusLower === "disewa") {
                        return (
                          <div className="text-center py-4">
                            <div className="text-red-400 text-sm font-semibold">
                              Mobil sedang disewa
                            </div>
                            <div className="text-gray-500 text-xs mt-1">Cek kembali nanti</div>
                          </div>
                        );
                      }

                      if (statusLower === "servis") {
                        return (
                          <div className="text-center py-4">
                            <div className="text-yellow-400 text-sm font-semibold">
                              Sedang dalam perawatan
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
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
      </div>
    </div>
  );
}
