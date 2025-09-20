import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({
    nama: "",
    alamat: "",
    provinsi: "",
    kabupaten: "",
    kecamatan: "",
    kelurahan: "",
    rt: "",
    rw: "",
    nomorTelepon: "",
    email: "",
    ktpFile: null,
    penanggungJawab: "",
    penanggungJawabAlamat: "",
    penanggungJawabTelepon: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPenanggungJawab, setShowPenanggungJawab] = useState(false);

  const javaProvinces = ["banten", "dki jakarta", "jawa barat", "jawa tengah", "jawa timur", "di yogyakarta"];

  // 🔹 fungsi upload ke Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "rental-mobil"); // ganti sesuai Cloudinary
    formData.append("cloud_name", "dnfruux8d"); // ganti sesuai Cloudinary

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/dnfruux8d/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error("Upload ke Cloudinary gagal");
    }

    return res.json(); // hasilnya ada secure_url
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setEditedData({
            nama: data.nama || "",
            alamat: data.alamat || "",
            provinsi: data.provinsi || "",
            kabupaten: data.kabupaten || "",
            kecamatan: data.kecamatan || "",
            kelurahan: data.kelurahan || "",
            rt: data.rt || "",
            rw: data.rw || "",
            nomorTelepon: data.nomorTelepon || "",
            email: data.email || "",
            ktpFile: null,
            penanggungJawab: data.penanggungJawab || "",
            penanggungJawabAlamat: data.penanggungJawabAlamat || "",
            penanggungJawabTelepon: data.penanggungJawabTelepon || "",
          });
          if (data.provinsi && !javaProvinces.includes(data.provinsi.toLowerCase())) {
            setShowPenanggungJawab(true);
          }
        }
      }
    };
    fetchUserData();
  }, []);

  if (!auth.currentUser) {
    return <div className="p-4 text-white">Silakan login terlebih dahulu.</div>;
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "ktpFile") {
      setEditedData({ ...editedData, ktpFile: files[0] });
    } else {
      setEditedData({ ...editedData, [name]: value });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        alert("User tidak ditemukan. Silakan login ulang.");
        setLoading(false);
        return;
      }
      const docRef = doc(db, "users", auth.currentUser.uid);
      let ktpURL = userData.ktpURL;
      let newVerificationStatus = userData.verificationStatus;

      if (editedData.ktpFile) {
        const uploadRes = await uploadToCloudinary(editedData.ktpFile);
        ktpURL = uploadRes.secure_url;
        // Set status to pending when KTP is uploaded
        newVerificationStatus = "pending";
      }

      // Remove email from update data to avoid Firestore error
      const updateData = {
        nama: editedData.nama || "",
        alamat: editedData.alamat || "",
        provinsi: editedData.provinsi || "",
        kabupaten: editedData.kabupaten || "",
        kecamatan: editedData.kecamatan || "",
        kelurahan: editedData.kelurahan || "",
        rt: editedData.rt || "",
        rw: editedData.rw || "",
        nomorTelepon: editedData.nomorTelepon || "",
        penanggungJawab: editedData.penanggungJawab || "",
        penanggungJawabAlamat: editedData.penanggungJawabAlamat || "",
        penanggungJawabTelepon: editedData.penanggungJawabTelepon || "",
        ktpURL: ktpURL || null,
        verificationStatus: newVerificationStatus,
      };

      await updateDoc(docRef, updateData);
      setUserData({ ...userData, ...editedData, ktpURL, verificationStatus: newVerificationStatus });
      setEditMode(false);

      if (newVerificationStatus === "pending") {
        alert("Profil berhasil diperbarui! KTP Anda telah diupload dan sedang dalam proses verifikasi admin.");
      } else {
        alert("Profil berhasil diperbarui!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return <div className="p-4 text-white">Memuat data pengguna...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-red-50 w-full rounded-2xl shadow-lg">
      <h2 className="text-3xl font-extrabold mb-8 border-b border-red-600 pb-3 text-center tracking-wide text-gray-900">
        Profil Pengguna
      </h2>
      <div className="flex flex-col md:flex-row gap-8 w-full">
        {/* Left: Avatar and Name */}
        <div className="md:w-1/3 bg-white rounded-2xl shadow-inner p-8 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mb-4 overflow-hidden">
            {/* Avatar */}
            <img
              src={userData.photoURL || "https://via.placeholder.com/150"}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{userData.nama || "Nama Lengkap"}</h3>
          <p className="text-gray-600">{userData.email}</p>

          {/* Verification Status */}
          <div className="mt-4 w-full">
            <div className={`px-4 py-2 rounded-lg text-center text-sm font-medium ${
              userData.verificationStatus === "verified"
                ? "bg-green-100 text-green-800 border border-green-200"
                : userData.verificationStatus === "pending"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}>
              {userData.verificationStatus === "verified" && "✅ Akun Terverifikasi"}
              {userData.verificationStatus === "pending" && "⏳ Menunggu Verifikasi"}
              {userData.verificationStatus === "unverified" && "❌ Belum Terverifikasi"}
            </div>
            {userData.verificationStatus === "unverified" && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Upload KTP untuk verifikasi akun
              </p>
            )}
          </div>
        </div>

        {/* Right: Profile Form */}
        <div className="md:w-2/3 bg-white rounded-2xl shadow-inner p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Detail Profil</h3>
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200"
              >
                Edit Profil
              </button>
            ) : (
              <div className="space-x-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {loading ? "Menyimpan..." : "Simpan"}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedData(userData);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg shadow-md transition-all duration-200"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Nama */}
            <div className="md:col-span-2">
              <label htmlFor="nama" className="block text-sm font-semibold text-red-300 mb-2">
                Nama Lengkap
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="nama"
                  name="nama"
                  value={editedData.nama}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-500"
                  placeholder="Masukkan nama lengkap Anda"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.nama}</p>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-semibold text-red-300 mb-2">
                Email
              </label>
              <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.email}</p>
            </div>

            {/* Nomor Telepon */}
            <div className="md:col-span-2">
              <label htmlFor="nomorTelepon" className="block text-sm font-semibold text-red-300 mb-2">
                Nomor Telepon
              </label>
              {editMode ? (
                <input
                  type="tel"
                  id="nomorTelepon"
                  name="nomorTelepon"
                  value={editedData.nomorTelepon}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan nomor telepon"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.nomorTelepon}</p>
              )}
            </div>

            {/* Provinsi */}
            <div>
              <label htmlFor="provinsi" className="block text-sm font-semibold text-red-300 mb-2">
                Provinsi
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="provinsi"
                  name="provinsi"
                  value={editedData.provinsi}
                  onChange={(e) => {
                    handleChange(e);
                    if (e.target.value.trim() && !javaProvinces.includes(e.target.value.toLowerCase())) {
                      setShowPenanggungJawab(true);
                    } else {
                      setShowPenanggungJawab(false);
                    }
                  }}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan Provinsi"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.provinsi}</p>
              )}
            </div>

            {/* Kabupaten */}
            <div>
              <label htmlFor="kabupaten" className="block text-sm font-semibold text-red-300 mb-2">
                Kabupaten
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="kabupaten"
                  name="kabupaten"
                  value={editedData.kabupaten}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan Kabupaten"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.kabupaten}</p>
              )}
            </div>

            {/* Kecamatan */}
            <div>
              <label htmlFor="kecamatan" className="block text-sm font-semibold text-red-300 mb-2">
                Kecamatan
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="kecamatan"
                  name="kecamatan"
                  value={editedData.kecamatan}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan Kecamatan"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.kecamatan}</p>
              )}
            </div>

            {/* Kelurahan */}
            <div>
              <label htmlFor="kelurahan" className="block text-sm font-semibold text-red-300 mb-2">
                Kelurahan / Desa
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="kelurahan"
                  name="kelurahan"
                  value={editedData.kelurahan}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan Kelurahan / Desa"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.kelurahan}</p>
              )}
            </div>

            {/* RT */}
            <div>
              <label htmlFor="rt" className="block text-sm font-semibold text-red-300 mb-2">
                RT
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="rt"
                  name="rt"
                  value={editedData.rt}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan RT"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.rt}</p>
              )}
            </div>

            {/* RW */}
            <div>
              <label htmlFor="rw" className="block text-sm font-semibold text-red-300 mb-2">
                RW
              </label>
              {editMode ? (
                <input
                  type="text"
                  id="rw"
                  name="rw"
                  value={editedData.rw}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Masukkan RW"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.rw}</p>
              )}
            </div>

            {/* Alamat */}
            <div className="md:col-span-2">
              <label htmlFor="alamat" className="block text-sm font-semibold text-red-300 mb-2">
                Alamat Lengkap
              </label>
              {editMode ? (
                <textarea
                  id="alamat"
                  name="alamat"
                  value={editedData.alamat}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                  rows={4}
                  placeholder="Masukkan alamat lengkap Anda"
                />
              ) : (
                <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.alamat}</p>
              )}
            </div>

            {/* Penanggung Jawab */}
            {showPenanggungJawab && (
              <>
                <div className="md:col-span-2">
                  <label htmlFor="penanggungJawab" className="block text-sm font-semibold text-red-300 mb-2">
                    Nama Penanggung Jawab
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      id="penanggungJawab"
                      name="penanggungJawab"
                      value={editedData.penanggungJawab}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan nama penanggung jawab"
                    />
                  ) : (
                    <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.penanggungJawab}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="penanggungJawabAlamat" className="block text-sm font-semibold text-red-300 mb-2">
                    Alamat Lengkap Penanggung Jawab
                  </label>
                  {editMode ? (
                    <textarea
                      id="penanggungJawabAlamat"
                      name="penanggungJawabAlamat"
                      value={editedData.penanggungJawabAlamat}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                      rows={4}
                      placeholder="Masukkan alamat lengkap penanggung jawab"
                    />
                  ) : (
                    <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.penanggungJawabAlamat}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="penanggungJawabTelepon" className="block text-sm font-semibold text-red-300 mb-2">
                    Nomor Telepon Penanggung Jawab
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      id="penanggungJawabTelepon"
                      name="penanggungJawabTelepon"
                      value={editedData.penanggungJawabTelepon}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                      placeholder="Masukkan nomor telepon penanggung jawab"
                    />
                  ) : (
                    <p className="p-3 bg-gray-100 rounded-lg text-gray-900">{userData.penanggungJawabTelepon}</p>
                  )}
                </div>
              </>
            )}

            {/* KTP */}
            <div className="md:col-span-2">
              <label htmlFor="ktpFile" className="block text-sm font-semibold text-red-300 mb-2">
                Foto KTP
                {userData.verificationStatus === "unverified" && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>

              {editMode ? (
                <div className="space-y-3">
                  <input
                    type="file"
                    id="ktpFile"
                    name="ktpFile"
                    accept="image/*"
                    onChange={handleChange}
                    className="w-full text-gray-900 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition-colors file:cursor-pointer"
                  />
                  {userData.verificationStatus === "unverified" && (
                    <p className="text-sm text-red-600 font-medium">
                      Upload KTP diperlukan untuk verifikasi akun
                    </p>
                  )}
                </div>
              ) : null}

              <div className="mt-4 flex justify-center">
                {userData.ktpURL ? (
                  <div className="text-center">
                    <img
                      src={userData.ktpURL}
                      alt="Foto KTP"
                      className="max-w-xs rounded-lg shadow-lg border-2 border-red-600"
                    />
                    {userData.verificationStatus === "pending" && (
                      <p className="text-yellow-600 text-sm mt-2 font-medium">
                        KTP sedang dalam proses verifikasi admin
                      </p>
                    )}
                    {userData.verificationStatus === "verified" && (
                      <p className="text-green-600 text-sm mt-2 font-medium">
                        KTP telah diverifikasi
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-400 mb-2">Foto KTP tidak tersedia</p>
                    {userData.verificationStatus === "unverified" && (
                      <p className="text-red-600 text-sm font-medium">
                        Upload KTP untuk verifikasi akun
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
