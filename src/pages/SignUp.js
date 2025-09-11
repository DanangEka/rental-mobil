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
    <div className="min-h-screen bg-gradient-to-r from-red-900 via-red-700 to-red-900 text-white flex justify-center items-center p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 bg-opacity-90 p-10 rounded-xl shadow-2xl w-full max-w-lg space-y-8 border border-red-800"
      >
        <h2 className="text-3xl font-extrabold mb-8 text-center tracking-wide border-b border-red-600 pb-3">
          Daftar Akun Baru
        </h2>

        <div className="space-y-6">
          {/* Nama */}
          <div>
            <label htmlFor="nama" className="block mb-3 font-semibold text-lg text-red-300">
              Nama Lengkap
            </label>
            <input
              type="text"
              id="nama"
              name="nama"
              value={form.nama}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-4 focus:ring-red-600 focus:border-red-600 transition-all duration-300 hover:bg-gray-750"
              placeholder="Masukkan nama lengkap Anda"
              required
            />
          </div>

          {/* Alamat */}
          <div>
            <label htmlFor="alamat" className="block mb-3 font-semibold text-lg text-red-300">
              Alamat
            </label>
            <textarea
              id="alamat"
              name="alamat"
              value={form.alamat}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-4 focus:ring-red-600 focus:border-red-600 transition-all duration-300 hover:bg-gray-750 resize-none"
              rows={4}
              placeholder="Masukkan alamat lengkap Anda"
              required
            />
          </div>

          {/* Nomor Telepon */}
          <div>
            <label
              htmlFor="nomorTelepon"
              className="block mb-3 font-semibold text-lg text-red-300"
            >
              Nomor Telepon
            </label>
            <input
              type="tel"
              id="nomorTelepon"
              name="nomorTelepon"
              value={form.nomorTelepon}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-4 focus:ring-red-600 focus:border-red-600 transition-all duration-300 hover:bg-gray-750"
              placeholder="Masukkan nomor telepon Anda"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block mb-3 font-semibold text-lg text-red-300"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-4 focus:ring-red-600 focus:border-red-600 transition-all duration-300 hover:bg-gray-750"
              placeholder="Masukkan email Anda"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block mb-3 font-semibold text-lg text-red-300"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="w-full p-4 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-4 focus:ring-red-600 focus:border-red-600 transition-all duration-300 hover:bg-gray-750"
              placeholder="Masukkan password Anda"
              required
            />
          </div>

          {/* KTP */}
          <div>
            <label
              htmlFor="ktpFile"
              className="block mb-3 font-semibold text-lg text-red-300"
            >
              Upload Foto KTP
            </label>
            <input
              type="file"
              id="ktpFile"
              name="ktpFile"
              accept="image/*"
              onChange={handleChange}
              className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition-all duration-300"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-red-700 hover:bg-red-800 text-white font-extrabold py-4 px-6 rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105 ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
        </button>
      </form>
    </div>
  );
}
