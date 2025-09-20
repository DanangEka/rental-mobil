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
    provinsi: "",
    kabupaten: "",
    kecamatan: "",
    kelurahan: "",
    rt: "",
    rw: "",
    nomorTelepon: "",
    email: "",
    password: "",
    penanggungJawab: "",
    penanggungJawabAlamat: "",
    penanggungJawabTelepon: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPenanggungJawab, setShowPenanggungJawab] = useState(false);

  const javaProvinces = ["banten", "dki jakarta", "jawa barat", "jawa tengah", "jawa timur", "di yogyakarta"];



  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.nama ||
      !form.alamat ||
      !form.provinsi ||
      !form.kabupaten ||
      !form.kecamatan ||
      !form.kelurahan ||
      !form.rt ||
      !form.rw ||
      !form.nomorTelepon ||
      !form.email ||
      !form.password
    ) {
      alert("Semua field harus diisi!");
      return;
    }

    if (showPenanggungJawab && (!form.penanggungJawab.trim() || !form.penanggungJawabAlamat.trim() || !form.penanggungJawabTelepon.trim())) {
      alert("Semua field penanggung jawab harus diisi untuk provinsi di luar Jawa!");
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

      // 2) Simpan data user ke Firestore (docId = UID user)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nama: form.nama,
        alamat: form.alamat,
        provinsi: form.provinsi,
        kabupaten: form.kabupaten,
        kecamatan: form.kecamatan,
        kelurahan: form.kelurahan,
        rt: form.rt,
        rw: form.rw,
        nomorTelepon: form.nomorTelepon,
        email: form.email,
        penanggungJawab: form.penanggungJawab,
        penanggungJawabAlamat: form.penanggungJawabAlamat,
        penanggungJawabTelepon: form.penanggungJawabTelepon,
        role: "client",
        verificationStatus: "unverified",
        createdAt: serverTimestamp(),
      });
      console.log("✅ User berhasil disimpan di Firestore:", user.uid);

      // 3) Logout & arahkan ke login
      await signOut(auth);
      console.log("✅ User berhasil logout setelah signup.");

      alert("Pendaftaran berhasil! Silakan login dan lengkapi verifikasi KTP di profil Anda.");
      navigate("/");
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
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors placeholder-gray-500"
                placeholder="Masukkan nama lengkap Anda"
                required
              />
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label htmlFor="email" className="block text-sm font-semibold text-red-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan email Anda"
                required
              />
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label htmlFor="password" className="block text-sm font-semibold text-red-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan password Anda"
                required
              />
            </div>

            {/* Nomor Telepon */}
            <div className="md:col-span-2">
              <label htmlFor="nomorTelepon" className="block text-sm font-semibold text-red-300 mb-2">
                Nomor Telepon
              </label>
              <input
                type="tel"
                id="nomorTelepon"
                name="nomorTelepon"
                value={form.nomorTelepon}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan nomor telepon"
                required
              />
            </div>

            {/* Provinsi */}
            <div>
              <label htmlFor="provinsi" className="block text-sm font-semibold text-red-300 mb-2">
                Provinsi
              </label>
              <input
                type="text"
                id="provinsi"
                name="provinsi"
                value={form.provinsi}
                onChange={handleChange}
                onBlur={() => {
                  if (form.provinsi.trim() && !javaProvinces.includes(form.provinsi.toLowerCase())) {
                    setShowPenanggungJawab(true);
                  } else {
                    setShowPenanggungJawab(false);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan Provinsi"
                required
              />
            </div>

            {/* Kabupaten */}
            <div>
              <label htmlFor="kabupaten" className="block text-sm font-semibold text-red-300 mb-2">
                Kabupaten
              </label>
              <input
                type="text"
                id="kabupaten"
                name="kabupaten"
                value={form.kabupaten}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan Kabupaten"
                required
              />
            </div>

            {/* Kecamatan */}
            <div>
              <label htmlFor="kecamatan" className="block text-sm font-semibold text-red-300 mb-2">
                Kecamatan
              </label>
              <input
                type="text"
                id="kecamatan"
                name="kecamatan"
                value={form.kecamatan}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan Kecamatan"
                required
              />
            </div>

            {/* Kelurahan */}
            <div>
              <label htmlFor="kelurahan" className="block text-sm font-semibold text-red-300 mb-2">
                Kelurahan / Desa
              </label>
              <input
                type="text"
                id="kelurahan"
                name="kelurahan"
                value={form.kelurahan}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan Kelurahan / Desa"
                required
              />
            </div>

            {/* RT */}
            <div>
              <label htmlFor="rt" className="block text-sm font-semibold text-red-300 mb-2">
                RT
              </label>
              <input
                type="text"
                id="rt"
                name="rt"
                value={form.rt}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan RT"
                required
              />
            </div>

            {/* RW */}
            <div>
              <label htmlFor="rw" className="block text-sm font-semibold text-red-300 mb-2">
                RW
              </label>
              <input
                type="text"
                id="rw"
                name="rw"
                value={form.rw}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                placeholder="Masukkan RW"
                required
              />
            </div>

            {/* Alamat */}
            <div className="md:col-span-2">
              <label htmlFor="alamat" className="block text-sm font-semibold text-red-300 mb-2">
                Alamat Lengkap
              </label>
              <textarea
                id="alamat"
                name="alamat"
                value={form.alamat}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                rows={4}
                placeholder="Masukkan alamat lengkap Anda"
                required
              />
            </div>

            {/* Penanggung Jawab */}
            {showPenanggungJawab && (
              <>
                <div className="md:col-span-2">
                  <label htmlFor="penanggungJawab" className="block text-sm font-semibold text-red-300 mb-2">
                    Nama Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    id="penanggungJawab"
                    name="penanggungJawab"
                    value={form.penanggungJawab}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                    placeholder="Masukkan nama penanggung jawab"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="penanggungJawabAlamat" className="block text-sm font-semibold text-red-300 mb-2">
                    Alamat Lengkap Penanggung Jawab
                  </label>
                  <textarea
                    id="penanggungJawabAlamat"
                    name="penanggungJawabAlamat"
                    value={form.penanggungJawabAlamat}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                    rows={4}
                    placeholder="Masukkan alamat lengkap penanggung jawab"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="penanggungJawabTelepon" className="block text-sm font-semibold text-red-300 mb-2">
                    Nomor Telepon Penanggung Jawab
                  </label>
                  <input
                    type="tel"
                    id="penanggungJawabTelepon"
                    name="penanggungJawabTelepon"
                    value={form.penanggungJawabTelepon}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                    placeholder="Masukkan nomor telepon penanggung jawab"
                    required
                  />
                </div>
              </>
            )}


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
