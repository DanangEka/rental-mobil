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
import DataTable from 'react-data-table-component';

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

  const columns = [
    {
      name: 'KTP',
      cell: row => (
        <img
          src={row.ktpURL}
          alt="KTP"
          className="w-16 h-16 object-cover rounded"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/64x64?text=KTP';
          }}
        />
      ),
      width: '100px'
    },
    {
      name: 'Nama Lengkap',
      cell: row => (
        <input
          type="text"
          value={row.nama}
          onChange={e => handleEditClient(row.id, "nama", e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      ),
      sortable: true
    },
    {
      name: 'Email',
      cell: row => (
        <input
          type="email"
          value={row.email}
          onChange={e => handleEditClient(row.id, "email", e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      ),
      sortable: true
    },
    {
      name: 'Alamat',
      cell: row => (
        <textarea
          value={row.alamat}
          onChange={e => handleEditClient(row.id, "alamat", e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
          rows={2}
        />
      ),
      sortable: true
    },
    {
      name: 'Nomor Telepon',
      cell: row => (
        <input
          type="text"
          value={row.nomorTelepon}
          onChange={e => handleEditClient(row.id, "nomorTelepon", e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      ),
      sortable: true
    },
    {
      name: 'Role',
      selector: row => row.role,
      sortable: true
    },
    {
      name: 'Dibuat',
      selector: row => row.createdAt ? new Date(row.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
      sortable: true
    },
    {
      name: 'Aksi',
      cell: row => (
        <div className="flex gap-2">
          <button
            onClick={() => handleResetPassword(row.email)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Reset Password
          </button>
          <button
            onClick={() => handleDeleteClient(row.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
          >
            Hapus
          </button>
        </div>
      ),
      width: '200px'
    }
  ];

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
        {/* Clients DataTable */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">Tidak ada client yang ditemukan</div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredClients}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={[5, 10, 15, 20]}
              highlightOnHover
              striped
              responsive
              customStyles={{
                headCells: {
                  style: {
                    backgroundColor: '#dc2626',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                },
                rows: {
                  style: {
                    minHeight: '72px'
                  }
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
