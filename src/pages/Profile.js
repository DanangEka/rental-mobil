import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setEditedData(data);
        }
      }
    };
    fetchUserData();
  }, []);

  if (!auth.currentUser) {
    return <div className="p-4 text-white">Silakan login terlebih dahulu.</div>;
  }

  const handleSave = async () => {
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, {
        nama: editedData.nama,
        alamat: editedData.alamat,
        nomorTelepon: editedData.nomorTelepon,
      });
      setUserData(editedData);
      setEditMode(false);
      alert("Profil berhasil diperbarui!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Gagal memperbarui profil.");
    }
  };

  if (!userData) {
    return <div className="p-4 text-white">Memuat data pengguna...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-red-50 max-w-4xl mx-auto rounded-2xl shadow-lg">
      <h2 className="text-3xl font-extrabold mb-8 border-b border-red-600 pb-3 text-center tracking-wide text-gray-900">
        Profil Pengguna
      </h2>
      <div className="mb-6 text-center">
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-md transition-all duration-200"
          >
            Edit Profil
          </button>
        ) : (
          <div className="space-x-4">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md transition-all duration-200"
            >
              Simpan
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setEditedData(userData);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg shadow-md transition-all duration-200"
            >
              Batal
            </button>
          </div>
        )}
      </div>
      <div className="space-y-8 bg-white rounded-2xl shadow-inner p-8">
        <div className="text-lg">
          <span className="font-semibold text-gray-900">Nama Lengkap:</span>{" "}
          {editMode ? (
            <input
              type="text"
              value={editedData.nama}
              onChange={(e) => setEditedData({ ...editedData, nama: e.target.value })}
              className="w-full mt-1 p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          ) : (
            <span className="text-red-600">{userData.nama}</span>
          )}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-gray-900">Alamat:</span>{" "}
          {editMode ? (
            <textarea
              value={editedData.alamat}
              onChange={(e) => setEditedData({ ...editedData, alamat: e.target.value })}
              className="w-full mt-1 p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none"
              rows="3"
            />
          ) : (
            <span className="text-red-600">{userData.alamat}</span>
          )}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-gray-900">Nomor Telepon:</span>{" "}
          {editMode ? (
            <input
              type="text"
              value={editedData.nomorTelepon}
              onChange={(e) => setEditedData({ ...editedData, nomorTelepon: e.target.value })}
              className="w-full mt-1 p-3 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          ) : (
            <span className="text-red-600">{userData.nomorTelepon}</span>
          )}
        </div>
        <div className="text-lg">
          <span className="font-semibold text-gray-900">Email:</span>{" "}
          <span className="text-red-600">{userData.email}</span>
        </div>
        <div>
          <span className="font-semibold text-gray-900">Foto KTP:</span>
          <div className="mt-4 flex justify-center">
            {userData.ktpURL ? (
              <img
                src={userData.ktpURL}
                alt="Foto KTP"
                className="max-w-xs rounded-lg shadow-lg border-2 border-red-600"
              />
            ) : (
              <p className="text-gray-400">Foto KTP tidak tersedia</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
