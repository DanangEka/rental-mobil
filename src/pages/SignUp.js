import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nama: "",
    alamat: "",
    nomorTelepon: "",
    email: "",
    password: "",
    ktpFile: null,
  });
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "ktpFile") {
      setForm({ ...form, ktpFile: files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.nama ||
      !form.alamat ||
      !form.nomorTelepon ||
      !form.email ||
      !form.password ||
      !form.ktpFile
    ) {
      alert("Semua field harus diisi!");
      return;
    }

    setLoading(true);

    try {
      console.log("👉 Mulai proses signup...");

      // 1) Buat user di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;
      console.log("✅ User dibuat di Auth:", user.uid, user.email);

      // 2) Upload file KTP ke Cloudinary
      const uploadRes = await uploadToCloudinary(form.ktpFile);
      const ktpURL = uploadRes.secure_url;
      console.log("✅ File KTP berhasil diupload ke Cloudinary:", ktpURL);

      // 3) Simpan data user ke Firestore (docId = UID user)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nama: form.nama,
        alamat: form.alamat,
        nomorTelepon: form.nomorTelepon,
        email: form.email,
        ktpURL: ktpURL,
        role: "client",
        createdAt: serverTimestamp(),
      });
      console.log("✅ User berhasil disimpan di Firestore:", user.uid);

      // 4) Logout & arahkan ke login
      await signOut(auth);
      console.log("✅ User berhasil logout setelah signup.");

      alert("Pendaftaran berhasil! Silakan login dengan akun Anda.");
      navigate("/login");
    } catch (error) {
      console.error("❌ Gagal di step signup:", error);
      alert("Gagal mendaftar: " + error.message);
    } finally {
      setLoading(false);
      console.log("👉 Proses signup selesai.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-red-900 via-red-700 to-red-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 bg-opacity-90 rounded-2xl shadow-2xl p-8 md:p-12 space-y-8 border border-red-800"
        >
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Daftar Akun Baru
            </h2>
            <p className="text-red-300 text-base md:text-lg">
              Lengkapi data Anda untuk membuat akun
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nama */}
            <div className="md:col-span-2">
              <label htmlFor="nama" className="block text-sm font-semibold text-red-300 mb-2">
                Nama Lengkap
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={form.nama}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-400"
                placeholder="Masukkan nama lengkap Anda"
                required
              />
            </div>

            {/* Alamat */}
            <div className="md:col-span-2">
              <label htmlFor="alamat" className="block text-sm font-semibold text-gray-700 mb-2">
                Alamat
              </label>
              <textarea
                id="alamat"
                name="alamat"
                value={form.alamat}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                rows={4}
                placeholder="Masukkan alamat lengkap Anda"
                required
              />
            </div>

            {/* Nomor Telepon */}
            <div>
              <label htmlFor="nomorTelepon" className="block text-sm font-semibold text-gray-700 mb-2">
                Nomor Telepon
              </label>
              <input
                type="tel"
                id="nomorTelepon"
                name="nomorTelepon"
                value={form.nomorTelepon}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan nomor telepon"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan email Anda"
                required
              />
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan password Anda"
                required
              />
            </div>

            {/* KTP */}
            <div className="md:col-span-2">
              <label htmlFor="ktpFile" className="block text-sm font-semibold text-gray-700 mb-2">
                Upload Foto KTP
              </label>
              <input
                type="file"
                id="ktpFile"
                name="ktpFile"
                accept="image/*"
                onChange={handleChange}
                className="w-full text-gray-700 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition-colors file:cursor-pointer"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload foto KTP yang jelas untuk verifikasi
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#990000] hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 text-base shadow-md hover:shadow-lg ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
          </button>

          <div className="text-center">
            <span className="text-gray-600 text-sm">Sudah punya akun? </span>
            <a
              href="/login"
              className="text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
            >
              Masuk di sini
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
