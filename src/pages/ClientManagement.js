import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [searchClients, setSearchClients] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchClients = async () => {
    try {
      const snapC = await getDocs(collection(db, "users"));
      setClients(snapC.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch clients:", error);
      alert("Terjadi kesalahan saat mengambil data client. Error: " + error.message);
    }
  };

  const filteredClients = clients.filter(c => {
    if (searchClients === "") return true;
    return c.nama?.toLowerCase().includes(searchClients.toLowerCase()) ||
           c.email?.toLowerCase().includes(searchClients.toLowerCase()) ||
           c.alamat?.toLowerCase().includes(searchClients.toLowerCase()) ||
           c.nomorTelepon?.includes(searchClients);
  });

  const checkAdmin = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Anda belum login.");
      setLoading(false);
      return;
    }

    try {
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims.admin === true) {
        setIsAdmin(true);
        fetchClients();
      } else {
        alert("Akun ini bukan admin.");
      }
    } catch (error) {
      console.error("Error verifikasi admin:", error.message);
      alert("Gagal memverifikasi hak akses.");
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const handleEditClient = async (id, field, value) => {
    try {
      await updateDoc(doc(db, "users", id), { [field]: value });
      fetchClients();
    } catch (error) {
      console.error("Gagal edit client:", error);
      alert("Gagal mengedit data client: " + error.message);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus client ini?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      fetchClients();
      alert("Client berhasil dihapus.");
    } catch (error) {
      console.error("Gagal hapus client:", error);
      alert("Gagal menghapus client: " + error.message);
    }
  };

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email reset password telah dikirim ke " + email);
    } catch (error) {
      console.error("Gagal reset password:", error);
      alert("Gagal mengirim email reset password: " + error.message);
    }
  };

  if (loading) return <p className="p-4">Memuat data...</p>;
  if (!isAdmin) return <p className="p-4 text-red-600 font-semibold">Anda tidak memiliki akses ke halaman ini.</p>;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-red-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Client</h1>
          <p className="text-gray-600">Kelola data pengguna dan informasi klien</p>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Client</label>
            <input
              type="text"
              placeholder="Cari berdasarkan nama, email, alamat, telepon..."
              value={searchClients}
              onChange={(e) => setSearchClients(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>
        </div>
        {/* Clients Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-lg">Tidak ada client yang ditemukan</div>
            </div>
          ) : (
            filteredClients.map(c => (
              <div key={c.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 overflow-hidden">
                {/* KTP Image */}
                <div className="aspect-video bg-gray-100">
                  <img
                    src={c.ktpURL}
                    alt="KTP"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x200?text=KTP+Not+Available';
                    }}
                  />
                </div>

                {/* Client Info */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      value={c.nama}
                      onChange={e => handleEditClient(c.id, "nama", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={c.email}
                      onChange={e => handleEditClient(c.id, "email", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <textarea
                      value={c.alamat}
                      onChange={e => handleEditClient(c.id, "alamat", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                    <input
                      type="text"
                      value={c.nomorTelepon}
                      onChange={e => handleEditClient(c.id, "nomorTelepon", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span>Role: <span className="font-medium text-gray-900">{c.role}</span></span>
                      <span>Dibuat: <span className="font-medium text-gray-900">
                        {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </span></span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleResetPassword(c.email)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => handleDeleteClient(c.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
