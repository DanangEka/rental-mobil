import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "../components/Toast";
import { 
  User, Mail, Phone, MapPin, Map, Navigation, Edit2, 
  Save, X, Image as ImageIcon, CheckCircle, Clock, AlertTriangle, ShieldCheck
} from "lucide-react";

export default function Profile() {
  const toast = useToast();
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
  const [dataLoading, setDataLoading] = useState(true);
  const [showPenanggungJawab, setShowPenanggungJawab] = useState(false);
  const [previewKtp, setPreviewKtp] = useState(null);

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
      setDataLoading(true);
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
      setDataLoading(false);
    };
    fetchUserData();
  }, []);

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex justify-center items-start bg-gray-50">
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-card text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
          <p className="text-gray-500">Silakan masuk ke akun Anda terlebih dahulu untuk melihat Halaman Profil.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "ktpFile") {
      const file = files[0];
      setEditedData({ ...editedData, ktpFile: file });
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewKtp(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewKtp(null);
      }
    } else {
      setEditedData({ ...editedData, [name]: value });
      
      // Check penanggung jawab logic dynamically if provinsi changes
      if (name === "provinsi") {
        if (value.trim() && !javaProvinces.includes(value.toLowerCase())) {
          setShowPenanggungJawab(true);
        } else {
          setShowPenanggungJawab(false);
        }
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        toast.error("User tidak ditemukan", "Silakan login ulang.");
        setLoading(false);
        return;
      }
      const docRef = doc(db, "users", auth.currentUser.uid);
      let ktpURL = userData.ktpURL;
      let newVerificationStatus = userData.verificationStatus;

      if (editedData.ktpFile) {
        toast.info("Mengunggah foto KTP...");
        const uploadRes = await uploadToCloudinary(editedData.ktpFile);
        ktpURL = uploadRes.secure_url;
        // Set status to pending when KTP is uploaded
        newVerificationStatus = "pending";
      }

      // Remove email from update data to avoid Firestore error if email cannot be changed
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
        toast.success("Profil berhasil diperbarui!", "KTP Anda telah diunggah dan sedang dalam proses verifikasi admin.");
      } else {
        toast.success("Profil berhasil diperbarui!");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen pt-[72px] pb-12 bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-5xl space-y-8 animate-pulse">
           <div className="h-64 bg-gray-200 rounded-2xl w-full"></div>
           <div className="h-96 bg-gray-200 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-[72px] pb-12 bg-gray-50 flex flex-col items-center">
      {/* Dynamic Header Background */}
      <div className="w-full bg-brand-900 absolute top-0 left-0 h-64 z-0">
         <div className="absolute inset-0 bg-gradient-to-t from-gray-50 to-transparent"></div>
         <div className="absolute top-10 left-10 w-64 h-64 bg-red-600/20 rounded-full mix-blend-screen filter blur-[80px]"></div>
         <div className="absolute top-20 right-10 w-72 h-72 bg-brand-500/20 rounded-full mix-blend-screen filter blur-[80px]"></div>
      </div>

      <div className="w-full max-w-5xl px-4 sm:px-6 z-10 animate-fadeInUp mt-6 md:mt-8">
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8">
          
          {/* Left: Avatar & Identity Card */}
          <div className="w-full md:w-1/3 flex flex-col gap-4 md:gap-6">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 p-4 sm:p-6 md:p-8 flex flex-col items-center relative overflow-hidden group">
              {/* Top Accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-600 to-red-400"></div>

              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center mb-5 overflow-hidden z-10 relative group-hover:scale-105 transition-transform duration-300">
                {userData.photoURL ? (
                  <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-1 text-center">{userData.nama || "Nama Lengkap"}</h3>
              <p className="text-gray-500 text-sm font-medium flex items-center gap-2 mb-6 text-center">
                <Mail className="w-4 h-4" /> {userData.email}
              </p>

              {/* Verification Badge */}
              <div className="w-full">
                <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${
                  userData.verificationStatus === "verified"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : userData.verificationStatus === "pending"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {userData.verificationStatus === "verified" && (
                    <>
                      <ShieldCheck className="w-8 h-8 text-green-500 mb-2" />
                      <span className="font-bold text-sm">Akun Terverifikasi</span>
                      <span className="text-xs text-green-600 mt-1 text-center">Siap untuk melakukan pemesanan via app</span>
                    </>
                  )}
                  {userData.verificationStatus === "pending" && (
                     <>
                      <Clock className="w-8 h-8 text-yellow-500 mb-2" />
                      <span className="font-bold text-sm">Menunggu Verifikasi</span>
                      <span className="text-xs text-yellow-600 mt-1 text-center">Admin sedang meninjau KTP Anda</span>
                    </>
                  )}
                  {userData.verificationStatus === "unverified" && (
                     <>
                      <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                      <span className="font-bold text-sm">Belum Terverifikasi</span>
                      <span className="text-xs text-red-600 mt-1 text-center">Harap unggah KTP untuk verifikasi akun</span>
                    </>
                  )}
                </div>
              </div>

              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="mt-6 w-full py-3 rounded-xl font-bold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 flex items-center justify-center gap-2 transition-colors focus:ring-2 focus:ring-brand-400 focus:ring-offset-1"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profil
                </button>
              )}
            </div>

            {/* Quick Stats / Info Widget */}
            <div className="bg-gradient-to-br from-brand-800 to-gray-900 rounded-2xl md:rounded-3xl shadow-brand-lg p-4 md:p-6 relative overflow-hidden text-white">
              <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-white/10 rounded-full mix-blend-screen"></div>
              <h4 className="text-brand-100 font-bold uppercase tracking-wider text-xs mb-4">Informasi Akun</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-brand-700/50 pb-3">
                  <span className="text-brand-200 text-sm">Role</span>
                  <span className="font-bold capitalize">{userData.role || 'Client'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-brand-700/50 pb-3">
                  <span className="text-brand-200 text-sm">Bergabung</span>
                  <span className="font-bold text-sm">
                    {userData.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month:'long', year:'numeric'}) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form Data */}
          <div className="w-full md:w-2/3">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden relative">
              {editMode && (
                <div className="absolute top-0 left-0 right-0 p-4 bg-brand-50 border-b border-brand-100 flex items-center justify-between z-10">
                  <span className="text-brand-700 font-bold text-sm flex items-center gap-2">
                    <Edit2 className="w-4 h-4" /> Mode Edit Aktif
                  </span>
                  <div className="flex gap-2">
                     <button
                        onClick={() => {
                          setEditMode(false);
                          setEditedData(userData);
                          setPreviewKtp(null);
                        }}
                        className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        title="Batal Edit"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-brand-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Save className="w-4 h-4" />}
                        Simpan
                      </button>
                  </div>
                </div>
              )}

              <div className={`p-4 sm:p-6 md:p-8 md:p-10 ${editMode ? 'pt-24' : ''}`}>
                <div className="mb-6 md:mb-8 border-b border-gray-100 pb-4">
                  <h3 className="text-2xl font-black text-gray-900">Detail Personal</h3>
                  <p className="text-gray-500 text-sm mt-1">Pastikan data Anda selalu terkini dan sesuai dengan kartu identitas KTP Anda.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Nama */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                    {editMode ? (
                      <input type="text" name="nama" value={editedData.nama} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="Nama Sesuai KTP" />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.nama || '-'}</div>
                    )}
                  </div>

                  {/* Telepon */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Nomor Telepon</label>
                    {editMode ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input type="tel" name="nomorTelepon" value={editedData.nomorTelepon} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="08..." />
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 font-medium">{userData.nomorTelepon || '-'}</span>
                      </div>
                    )}
                  </div>

                  {/* Empty space for grid on non-edit view or padding */}
                  <div className="hidden lg:block md:col-span-1"></div>

                  {/* Alamat Section Divider */}
                  <div className="col-span-full pt-6 mt-2 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="text-brand-500 w-5 h-5"/> Domisili
                     </h4>
                  </div>

                  {/* Provinsi */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Provinsi</label>
                    {editMode ? (
                      <input type="text" name="provinsi" value={editedData.provinsi} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="Provinsi" />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.provinsi || '-'}</div>
                    )}
                  </div>

                  {/* Kabupaten */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Kabupaten / Kota</label>
                    {editMode ? (
                      <input type="text" name="kabupaten" value={editedData.kabupaten} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="Kabupaten" />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.kabupaten || '-'}</div>
                    )}
                  </div>

                  {/* Kecamatan */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Kecamatan</label>
                    {editMode ? (
                      <input type="text" name="kecamatan" value={editedData.kecamatan} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="Kecamatan" />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.kecamatan || '-'}</div>
                    )}
                  </div>

                  {/* Kelurahan */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Kelurahan / Desa</label>
                    {editMode ? (
                      <input type="text" name="kelurahan" value={editedData.kelurahan} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="Kelurahan" />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.kelurahan || '-'}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                     <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">RT</label>
                      {editMode ? (
                        <input type="text" name="rt" value={editedData.rt} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="RT" />
                      ) : (
                        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.rt || '-'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">RW</label>
                      {editMode ? (
                        <input type="text" name="rw" value={editedData.rw} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900" placeholder="RW" />
                      ) : (
                        <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium">{userData.rw || '-'}</div>
                      )}
                    </div>
                  </div>

                  {/* Alamat Lengkap */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Lengkap</label>
                    {editMode ? (
                      <textarea name="alamat" rows="2" value={editedData.alamat} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:bg-white transition-colors text-gray-900 resize-none" placeholder="Alamat rumah..." />
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 font-medium leading-relaxed">{userData.alamat || '-'}</div>
                    )}
                  </div>

                  {/* Penanggung Jawab */}
                  {showPenanggungJawab && (
                    <div className="col-span-full pt-6 mt-2 border-t border-gray-100">
                       <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <User className="text-brand-500 w-5 h-5"/> Data Penanggung Jawab
                       </h4>
                       <div className="bg-brand-50/50 p-4 md:p-6 rounded-2xl border border-brand-100 space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-2">Nama Penanggung Jawab</label>
                               {editMode ? (
                                <input type="text" name="penanggungJawab" value={editedData.penanggungJawab} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors text-gray-900" placeholder="Nama Kerabat" />
                               ) : (
                                <div className="px-4 py-3 bg-white rounded-xl shadow-sm text-gray-900 font-medium">{userData.penanggungJawab || '-'}</div>
                               )}
                            </div>
                            <div>
                               <label className="block text-sm font-bold text-gray-700 mb-2">Nomor Telepon</label>
                               {editMode ? (
                                <input type="tel" name="penanggungJawabTelepon" value={editedData.penanggungJawabTelepon} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors text-gray-900" placeholder="08..." />
                               ) : (
                                <div className="px-4 py-3 bg-white rounded-xl shadow-sm text-gray-900 font-medium">{userData.penanggungJawabTelepon || '-'}</div>
                               )}
                            </div>
                            <div className="md:col-span-2">
                               <label className="block text-sm font-bold text-gray-700 mb-2">Alamat</label>
                               {editMode ? (
                                <textarea name="penanggungJawabAlamat" rows="2" value={editedData.penanggungJawabAlamat} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors text-gray-900 resize-none" placeholder="Alamat kerabat..." />
                               ) : (
                                <div className="px-4 py-3 bg-white rounded-xl shadow-sm text-gray-900 font-medium">{userData.penanggungJawabAlamat || '-'}</div>
                               )}
                            </div>
                         </div>
                       </div>
                    </div>
                  )}

                  {/* KTP */}
                  <div className="col-span-full pt-6 mt-2 border-t border-gray-100">
                     <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ImageIcon className="text-brand-500 w-5 h-5"/> Dokumen Identitas
                     </h4>
                     
                     <div className="bg-gray-50 border border-gray-100 p-4 md:p-6 rounded-2xl">
                       {editMode && (
                        <div className="mb-6">
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Unggah Foto KTP Baru
                            {userData.verificationStatus === "unverified" && <span className="text-red-500 ml-1.5">*</span>}
                          </label>
                          <div className="mt-2 flex justify-center px-4 md:px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl overflow-hidden relative hover:bg-gray-100 transition-colors bg-white">
                            <div className="space-y-2 text-center z-10">
                              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                              <div className="flex justify-center text-sm text-gray-600">
                                <label htmlFor="ktpFile" className="relative cursor-pointer rounded-md bg-transparent font-medium text-brand-600 focus-within:outline-none hover:text-brand-500 inline-block focus:underline">
                                  <span>Pilih file gambar</span>
                                  <input id="ktpFile" name="ktpFile" type="file" className="sr-only" accept="image/*" onChange={handleChange} />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                              {editedData.ktpFile && <p className="text-xs font-bold text-brand-600 truncate max-w-[200px] mt-2 block">{editedData.ktpFile.name}</p>}
                            </div>
                          </div>
                        </div>
                       )}

                       <div className="w-full flex flex-col items-center">
                         {(previewKtp || userData.ktpURL) ? (
                            <div className="relative rounded-xl overflow-hidden shadow-card border-4 border-white max-w-sm w-full mx-auto">
                              <img src={previewKtp || userData.ktpURL} alt="KTP Document" className="w-full h-auto object-contain bg-black/5" />
                              {previewKtp && (
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-semibold">Pre-view</div>
                              )}
                            </div>
                         ) : (
                           <div className="text-center py-4 md:py-6">
                             <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                               <ImageIcon className="w-8 h-8 text-gray-400" />
                             </div>
                             <p className="text-gray-500 text-sm font-medium">Foto KTP belum diunggah</p>
                           </div>
                         )}

                         {/* Status Below Document */}
                         {!editMode && userData.ktpURL && (
                            <div className={`mt-4 px-4 py-2 rounded-full inline-flex items-center gap-2 text-sm font-bold ${
                              userData.verificationStatus === "verified" ? "text-green-700 bg-green-50" :
                              userData.verificationStatus === "pending" ? "text-yellow-700 bg-yellow-50" : "text-red-700 bg-red-50"
                            }`}>
                              {userData.verificationStatus === "verified" ? <CheckCircle className="w-4 h-4"/> :
                               userData.verificationStatus === "pending" ? <Clock className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                              {userData.verificationStatus === "verified" ? "Dokumen Valid" :
                               userData.verificationStatus === "pending" ? "Menunggu validasi admin" : "Dokumen tidak valid / Ditolak"}
                            </div>
                         )}
                       </div>
                     </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
