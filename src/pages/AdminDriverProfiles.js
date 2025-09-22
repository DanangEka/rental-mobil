import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { User, Mail, Phone, MapPin, Calendar, Car, Star, DollarSign, Edit, Eye } from "lucide-react";

export default function AdminDriverProfiles() {
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filter, setFilter] = useState("all"); // all, active, inactive

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch all drivers
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const driversData = [];
      querySnapshot.forEach((doc) => {
        driversData.push({ id: doc.id, ...doc.data() });
      });
      setDrivers(driversData);
    });

    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.toDate()).toLocaleDateString("id-ID");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Aktif";
      case "inactive":
        return "Tidak Aktif";
      default:
        return status;
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === "all") return true;
    return driver.status === filter;
  });

  const handleStatusChange = async (driverId, newStatus) => {
    try {
      await updateDoc(doc(db, "users", driverId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating driver status:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profil Driver</h1>
          <p className="text-gray-600 mt-2">Kelola profil dan informasi driver</p>
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
              Semua Driver
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "active"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilter("inactive")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "inactive"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tidak Aktif
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Driver</p>
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Driver Aktif</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drivers.filter(d => d.status === "active").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Order</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drivers.reduce((total, driver) => total + (driver.totalOrders || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                <p className="text-2xl font-bold text-gray-900">
                  Rp {drivers.reduce((total, driver) => total + (driver.totalEarnings || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Drivers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Daftar Driver ({filteredDrivers.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada driver terdaftar</p>
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(driver.status)}`}>
                          {getStatusText(driver.status)}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          ID: {driver.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Nama</p>
                          <p className="font-medium text-gray-900">{driver.displayName || driver.name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{driver.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">No. Telepon</p>
                          <p className="font-medium text-gray-900">{driver.phone || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">No. SIM</p>
                          <p className="font-medium text-gray-900">{driver.simNumber || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Tanggal Lahir</p>
                          <p className="font-medium text-gray-900">{formatDate(driver.birthDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Alamat</p>
                          <p className="font-medium text-gray-900">{driver.address || "N/A"}</p>
                        </div>
                      </div>

                      {/* Driver Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center">
                            <Car className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-sm text-gray-600">Total Order</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">{driver.totalOrders || 0}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-600 mr-2" />
                            <span className="text-sm text-gray-600">Rating</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">{driver.rating || 0}/5</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm text-gray-600">Total Pendapatan</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            Rp {(driver.totalEarnings || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Bergabung: {formatDate(driver.createdAt)}</span>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </button>

                      <select
                        value={driver.status || "active"}
                        onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak Aktif</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {selectedDriver && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detail Profil Driver
                  </h3>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Informasi Pribadi</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama:</span>
                        <span className="text-gray-900">{selectedDriver.displayName || selectedDriver.name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="text-gray-900">{selectedDriver.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">No. Telepon:</span>
                        <span className="text-gray-900">{selectedDriver.phone || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">No. SIM:</span>
                        <span className="text-gray-900">{selectedDriver.simNumber || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tanggal Lahir:</span>
                        <span className="text-gray-900">{formatDate(selectedDriver.birthDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Alamat:</span>
                        <span className="text-gray-900">{selectedDriver.address || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDriver.status)}`}>
                          {getStatusText(selectedDriver.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Statistik Driver</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Order:</span>
                        <span className="text-gray-900 font-bold">{selectedDriver.totalOrders || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-gray-900 font-bold">{selectedDriver.rating || 0}/5</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Pendapatan:</span>
                        <span className="text-gray-900 font-bold text-green-600">
                          Rp {(selectedDriver.totalEarnings || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bergabung:</span>
                        <span className="text-gray-900">{formatDate(selectedDriver.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Terakhir Update:</span>
                        <span className="text-gray-900">{formatDate(selectedDriver.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedDriver.notes && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3">Catatan Admin</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedDriver.notes}</p>
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
