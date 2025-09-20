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
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchClients = async () => {
    try {
      const snapC = await getDocs(collection(db, "users"));
      const clientsData = snapC.docs.map(doc => {
        const data = doc.data();
        // Set default verificationStatus for old clients
        if (!data.verificationStatus) {
          data.verificationStatus = "unverified";
        }
        return { id: doc.id, ...data };
      });
      setClients(clientsData);
    } catch (error) {
      console.error("Gagal fetch clients:", error);
      alert("Terjadi kesalahan saat mengambil data client. Error: " + error.message);
    }
  };

  const filteredClients = clients.filter(c => {
    // Filter by search term
    const matchesSearch = searchClients === "" ||
      c.nama?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.alamat?.toLowerCase().includes(searchClients.toLowerCase()) ||
      c.nomorTelepon?.includes(searchClients);

    // Filter by verification status
    const matchesStatus = filterStatus === "" || c.verificationStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      name: 'KTP',
      cell: row => (
        <div className="flex flex-col items-center space-y-2">
          <div className="relative">
            <img
              src={row.ktpURL}
              alt="KTP"
              className="w-12 h-12 object-cover rounded border-2 border-gray-200"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/48x48?text=KTP';
              }}
            />
            {row.ktpURL && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            row.verificationStatus === "verified"
              ? "bg-green-100 text-green-800"
              : row.verificationStatus === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}>
            {row.verificationStatus === "verified" ? "Terverifikasi" :
             row.verificationStatus === "pending" ? "Menunggu" : "Belum"}
          </span>
        </div>
      ),
      width: '100px'
    },
    {
      name: 'Nama Lengkap',
      selector: row => row.nama || 'N/A',
      sortable: true,
      cell: row => (
        <div className="font-medium text-gray-900">
          {row.nama || 'N/A'}
        </div>
      )
    },
    {
      name: 'Email',
      selector: row => row.email || 'N/A',
      sortable: true,
      cell: row => (
        <div className="text-gray-700">
          {row.email || 'N/A'}
        </div>
      )
    },
    {
      name: 'Alamat',
      selector: row => row.alamat || 'N/A',
      sortable: true,
      cell: row => (
        <div className="text-gray-700 max-w-xs truncate" title={row.alamat}>
          {row.alamat || 'N/A'}
        </div>
      )
    },
    {
      name: 'Nomor Telepon',
      selector: row => row.nomorTelepon || 'N/A',
      sortable: true,
      cell: row => (
        <div className="text-gray-700">
          {row.nomorTelepon || 'N/A'}
        </div>
      )
    },
    {
      name: 'Role',
      selector: row => row.role,
      sortable: true
    },
    {
      name: 'Status Verifikasi',
      cell: row => (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          row.verificationStatus === "verified"
            ? "bg-green-100 text-green-800"
            : row.verificationStatus === "pending"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}>
          {row.verificationStatus === "verified" ? "Terverifikasi" :
           row.verificationStatus === "pending" ? "Menunggu Verifikasi" : "Belum Terverifikasi"}
        </span>
      ),
      sortable: true
    },
    {
      name: 'Terdaftar',
      selector: row => row.createdAt ? new Date(row.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
      sortable: true,
      cell: row => (
        <div className="text-sm text-gray-600">
          {row.createdAt ? new Date(row.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}
        </div>
      )
    },
    {
      name: 'Terakhir Login',
      selector: row => row.lastLogin ? new Date(row.lastLogin.seconds * 1000).toLocaleDateString() : 'N/A',
      sortable: true,
      cell: row => (
        <div className="text-sm text-gray-600">
          {row.lastLogin ? new Date(row.lastLogin.seconds * 1000).toLocaleDateString('id-ID') : 'N/A'}
        </div>
      )
    },
    {
      name: 'Aksi',
      cell: row => (
        <div className="flex gap-2 flex-wrap">
          {row.verificationStatus === "unverified" && (
            <button
              onClick={() => handleVerifyClient(row.id, "verified")}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              title="Verifikasi akun client"
            >
              Verifikasi
            </button>
          )}
          {row.verificationStatus === "pending" && (
            <button
              onClick={() => handleVerifyClient(row.id, "verified")}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              title="Setujui verifikasi"
            >
              Setujui
            </button>
          )}
          {row.verificationStatus === "pending" && (
            <button
              onClick={() => handleVerifyClient(row.id, "unverified")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
              title="Tolak verifikasi"
            >
              Tolak
            </button>
          )}
          {row.verificationStatus === "verified" && (
            <button
              onClick={() => handleVerifyClient(row.id, "unverified")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
              title="Batalkan verifikasi"
            >
              Batalkan
            </button>
          )}
          <button
            onClick={() => handleResetPassword(row.email)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            title="Reset password client"
          >
            Reset Password
          </button>
          <button
            onClick={() => handleDeleteClient(row.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            title="Hapus client"
          >
            Hapus
          </button>
        </div>
      ),
      width: '320px'
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

  const handleVerifyClient = async (id, status) => {
    const client = clients.find(c => c.id === id);
    const clientName = client?.nama || client?.email || "Client";

    try {
      await updateDoc(doc(db, "users", id), {
        verificationStatus: status
      });

      fetchClients();

      if (status === "verified") {
        alert(`✅ ${clientName} berhasil diverifikasi!\n\nClient sekarang dapat melakukan pemesanan mobil.`);
      } else if (status === "unverified") {
        alert(`❌ Verifikasi ${clientName} berhasil dibatalkan.\n\nClient tidak dapat melakukan pemesanan sampai diverifikasi ulang.`);
      }
    } catch (error) {
      console.error("Gagal verifikasi client:", error);
      alert("❌ Gagal verifikasi client: " + error.message);
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

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cari Client</label>
              <input
                type="text"
                placeholder="Cari berdasarkan nama, email, alamat, telepon..."
                value={searchClients}
                onChange={(e) => setSearchClients(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter Status Verifikasi</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
              >
                <option value="">Semua Status</option>
                <option value="unverified">Belum Terverifikasi</option>
                <option value="pending">Menunggu Verifikasi</option>
                <option value="verified">Terverifikasi</option>
              </select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-sm font-semibold text-red-900">Belum Terverifikasi</h3>
              <p className="text-2xl font-bold text-red-600">
                {clients.filter(c => c.verificationStatus === "unverified").length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-sm font-semibold text-yellow-900">Menunggu Verifikasi</h3>
              <p className="text-2xl font-bold text-yellow-600">
                {clients.filter(c => c.verificationStatus === "pending").length}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold text-green-900">Terverifikasi</h3>
              <p className="text-2xl font-bold text-green-600">
                {clients.filter(c => c.verificationStatus === "verified").length}
              </p>
            </div>
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
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }
                },
                rows: {
                  style: {
                    minHeight: '60px',
                    fontSize: '13px'
                  }
                },
                cells: {
                  style: {
                    padding: '8px 12px'
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
