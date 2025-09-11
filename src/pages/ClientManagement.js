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
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-[#990000] mb-6">Manajemen Client</h1>
      <div className="mb-4">
        <label className="font-semibold mr-2">Cari Client:</label>
        <input
          type="text"
          placeholder="Cari berdasarkan nama, email, alamat, telepon..."
          value={searchClients}
          onChange={(e) => setSearchClients(e.target.value)}
          className="border rounded px-3 py-1 w-64"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filteredClients.map(c => (
          <div key={c.id} className="border p-4 rounded bg-white shadow-sm">
            <img src={c.ktpURL} alt="KTP" className="h-32 w-full object-cover rounded mb-2" />
            <input type="text" value={c.nama} onChange={e => handleEditClient(c.id, "nama", e.target.value)} className="text-lg font-bold w-full border p-1 rounded" />
            <input type="text" value={c.alamat} onChange={e => handleEditClient(c.id, "alamat", e.target.value)} className="w-full border p-1 rounded mt-1" />
            <input type="text" value={c.nomorTelepon} onChange={e => handleEditClient(c.id, "nomorTelepon", e.target.value)} className="w-full border p-1 rounded mt-1" />
            <input type="email" value={c.email} onChange={e => handleEditClient(c.id, "email", e.target.value)} className="w-full border p-1 rounded mt-1" />
            <p className="text-sm text-gray-600 mt-1">Role: {c.role} | Dibuat: {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => handleResetPassword(c.email)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Reset Password</button>
              <button onClick={() => handleDeleteClient(c.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
