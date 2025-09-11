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
    <div className="p-6 min-h-screen bg-gradient-to-r from-red-900 via-red-700 to-red-900 text-white max-w-3xl mx-auto rounded-lg shadow-lg">
      <h2 className="text-3xl font-extrabold mb-8 border-b border-red-600 pb-3 text-center tracking-wide">
        Profil Pengguna
      </h2>
      <div className="mb-4 text-center">
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Edit Profil
          </button>
        ) : (
          <div className="space-x-2">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Simpan
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setEditedData(userData);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Batal
            </button>
          </div>
        )}
      </div>
      <div className="space-y-6 bg-gray-900 bg-opacity-90 rounded-lg shadow-inner p-8">
        <div className="text-lg">
          <span className="font-semibold">Nama Lengkap:</span>{" "}
          {editMode ? (
            <input
              type="text"
              value={editedData.nama}
              onChange={(e) => setEditedData({ ...editedData, nama: e.target.value })}
              className="w-full mt-1 p-2 bg-gray-800 text-white border border-gray-600 rounded"
            />
          ) : (
            <span className="text-red-300">{userData.nama}</span>
          )}
        </div>
        <div className="text-lg">
          <span className="font-semibold">Alamat:</span>{" "}
          {editMode ? (
            <textarea
              value={editedData.alamat}
              onChange={(e) => setEditedData({ ...editedData, alamat: e.target.value })}
              className="w-full mt-1 p-2 bg-gray-800 text-white border border-gray-600 rounded"
              rows="3"
            />
          ) : (
            <span className="text-red-300">{userData.alamat}</span>
          )}
        </div>
        <div className="text-lg">
          <span className="font-semibold">Nomor Telepon:</span>{" "}
          {editMode ? (
            <input
              type="text"
              value={editedData.nomorTelepon}
              onChange={(e) => setEditedData({ ...editedData, nomorTelepon: e.target.value })}
              className="w-full mt-1 p-2 bg-gray-800 text-white border border-gray-600 rounded"
            />
          ) : (
            <span className="text-red-300">{userData.nomorTelepon}</span>
          )}
        </div>
        <div className="text-lg">
          <span className="font-semibold">Email:</span>{" "}
          <span className="text-red-300">{userData.email}</span>
        </div>
        <div>
          <span className="font-semibold">Foto KTP:</span>
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
