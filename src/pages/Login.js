import { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useToast } from "../components/Toast";
import { Button, Field, Icon, Input, Pill } from "../components/ui";
import logo from "../assets/logo.png";

/**
 * Layout follows the `login_cakra_lima_tujuh_redesign` mockup: a 5/7 split,
 * brand panel left on `surface-container`, form card right on
 * `surface-container-lowest`.
 *
 * Auth logic below is unchanged from the pre-redesign page. The redesign
 * constraint is that business logic does not move; only markup and classes do.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const loginLocation = useLocation();
  const toast = useToast();
  const returnTo = loginLocation.state?.returnTo || null;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      toast.warning("Mohon isi email dan password Anda.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Jika belum ada, buat otomatis dengan role client
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          role: "client",
          verificationStatus: "unverified",
          createdAt: new Date(),
        });
        toast.success("Berhasil masuk. Selamat datang!");
        navigate(returnTo || "/");
      } else {
        const userData = userDoc.data();
        const role = userData.role;
        const verificationStatus = userData.verificationStatus;

        if (role === "admin") {
          toast.success("Selamat datang, Admin!");
          navigate(returnTo || "/");
        } else if (role === "client") {
          // Check verification status for client
          if (verificationStatus === "unverified") {
            toast.warning("Akun Anda belum diverifikasi. Silakan upload KTP di profil.", "Verifikasi Diperlukan");
          } else if (verificationStatus === "pending") {
            toast.info("Akun Anda sedang dalam proses verifikasi oleh Admin.", "Menunggu Verifikasi");
          } else {
            toast.success("Berhasil masuk.");
          }
          navigate(returnTo || "/");
        } else if (role === "driver") {
          toast.success("Selamat datang, Driver!");
          navigate("/driver-dashboard");
        } else {
          setError("Role tidak dikenali.");
          toast.error("Role tidak dikenali.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      let errMsg = "Email atau password salah.";
      if (err.code === "auth/too-many-requests") errMsg = "Terlalu banyak percobaan. Silakan coba lagi nanti.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Avoid redirect loops if already logged in and simply revisiting
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;

          if (role === "admin" || role === "client") {
            navigate("/");
          } else if (role === "driver") {
            navigate("/driver-dashboard");
          }
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const features = [
    {
      icon: "history_edu",
      title: "Riwayat & Jadwal Perjalanan Terpusat",
      body: "Lacak status armada, waktu penjemputan sopir, serta arsip invoice korporasi.",
    },
    {
      icon: "workspace_premium",
      title: "Tarif Charter & Prive Eksklusif",
      body: "Armada premium, greet-and-meet protokol, dan itinerary yang disusun personal.",
    },
    {
      icon: "support_agent",
      title: "Dedicated 24/7 Butler & Dispatcher",
      body: "Satu titik kontak khusus yang memproses seluruh kebutuhan perjalanan tanpa friksi, kapan pun Anda butuh.",
    },
  ];

  return (
    <div className="min-h-screen bg-c57-surface text-body-md text-c57-on-surface antialiased pt-[120px] pb-8 lg:pb-16">
      <div className="w-full max-w-[1360px] mx-auto px-margin-mobile sm:px-margin-tablet lg:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-stretch">
          {/* ---- Brand panel ---- */}
          <div className="lg:col-span-5 flex flex-col justify-between relative overflow-hidden rounded-c57-xl bg-c57-surface-container p-8 sm:p-12">
            <div
              className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-c57-primary/5 blur-3xl pointer-events-none"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-c57-secondary-container/40 blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10">
              <div className="flex items-center gap-space-md mb-8">
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <img src={logo} alt="Logo Cakra Lima Tujuh" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md tracking-widest uppercase text-c57-primary font-bold">
                    Cakra Lima Tujuh
                  </span>
                  <span className="font-label-sm text-label-sm text-c57-secondary tracking-wider uppercase">
                    Premium Travel Agen
                  </span>
                </div>
              </div>

              <Pill variant="neutral" className="mb-6 shadow-c57-card">
                <span className="w-1.5 h-1.5 rounded-full bg-c57-primary-container" aria-hidden="true" />
                Kenyamanan Eksklusif Setiap Destinasi
              </Pill>

              <h1 className="font-headline-lg text-headline-lg text-c57-on-surface mb-6 leading-tight">
                Selamat Datang Kembali ke Pengalaman Mobilitas Terbaik.
              </h1>
              <p className="font-body-md text-body-md text-c57-on-surface-variant mb-10 leading-relaxed">
                Menghadirkan harmoni perjalanan antarkota berkelas tinggi, sewa
                armada privat premium, dan layanan kepanduan personal di seluruh
                Indonesia.
              </p>

              <div className="space-y-space-md mb-10">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-space-md p-3.5 rounded-c57-md bg-c57-surface/70 shadow-c57-card backdrop-blur-sm"
                  >
                    <span className="w-8 h-8 rounded-full bg-c57-primary/10 flex items-center justify-center text-c57-primary flex-shrink-0 mt-0.5">
                      <Icon name={f.icon} size="md" />
                    </span>
                    <div>
                      <h2 className="font-label-lg text-label-lg text-c57-on-surface font-semibold">
                        {f.title}
                      </h2>
                      <p className="font-body-sm text-body-sm text-c57-on-surface-variant">
                        {f.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Form panel ---- */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="w-full max-w-xl mx-auto bg-c57-surface-container-lowest p-8 sm:p-12 rounded-c57-xl shadow-c57-overlay">
              <div className="flex items-center justify-between gap-space-md mb-space-lg">
                <Pill variant="neutral" icon="badge" className="bg-c57-secondary-container text-c57-on-secondary-fixed font-bold">
                  Akun Pelanggan &amp; Mitra
                </Pill>
                <span className="font-label-sm text-label-sm text-c57-secondary uppercase tracking-wider">
                  Langkah 1 dari 1
                </span>
              </div>

              <div className="mb-8">
                <h2 className="font-headline-md text-headline-md text-c57-on-surface mb-space-sm">
                  Masuk ke Akun Anda
                </h2>
                <p className="font-body-md text-body-md text-c57-on-surface-variant">
                  Masukkan identitas terverifikasi Anda untuk mengelola trip
                  perjalanan, pesanan sewa mobil, dan tagihan.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 bg-c57-error-container border border-c57-error/20 p-4 rounded-c57-md flex items-start gap-space-sm animate-popIn"
                >
                  <Icon name="info" size="md" className="text-c57-on-error-container mt-0.5 shrink-0" />
                  <p className="text-body-sm font-semibold text-c57-on-error-container">
                    {error}
                  </p>
                </div>
              )}

              <form className="space-y-space-lg" onSubmit={handleLogin}>
                <Field label="Email atau Nomor WhatsApp Terdaftar">
                  {(p) => (
                    <Input
                      {...p}
                      type="email"
                      icon="account_circle"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="nama@email.com"
                      required
                    />
                  )}
                </Field>

                <Field
                  label="Kata Sandi Akun"
                  labelAction={
                    <a
                      href="#forgot"
                      className="font-label-sm text-c57-primary hover:text-c57-primary-container transition-colors"
                    >
                      Lupa Kata Sandi?
                    </a>
                  }
                >
                  {(p) => (
                    <Input
                      {...p}
                      type={showPass ? "text" : "password"}
                      icon="lock"
                      trailing={
                        <button
                          type="button"
                          aria-label={
                            showPass
                              ? "Sembunyikan kata sandi"
                              : "Tampilkan kata sandi"
                          }
                          aria-pressed={showPass}
                          onClick={() => setShowPass((v) => !v)}
                          className="p-1 flex items-center"
                        >
                          <Icon
                            name={showPass ? "visibility_off" : "visibility"}
                            size="lg"
                          />
                        </button>
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Masukkan kata sandi rahasia"
                      required
                    />
                  )}
                </Field>

                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 rounded bg-c57-surface-container text-c57-primary accent-c57-primary cursor-pointer"
                    />
                    <span className="font-body-sm text-body-sm text-c57-on-surface-variant">
                      Ingat saya di perangkat ini
                    </span>
                  </label>
                  <span className="hidden sm:inline-block font-label-sm text-label-sm text-c57-secondary">
                    Akses Terproteksi
                  </span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={isLoading}
                  disabled={!email || !password}
                  icon="arrow_forward"
                  iconPosition="right"
                  className="w-full"
                >
                  {isLoading ? "Memproses" : "Masuk ke Sistem"}
                </Button>
              </form>

              <div className="text-center p-4 rounded-c57-md bg-c57-surface-container-low mb-6 mt-8">
                <span className="font-body-sm text-body-sm text-c57-on-surface-variant">
                  Belum memiliki akun reservasi Cakra 57?{" "}
                </span>
                <Link
                  to="/signup"
                  className="font-label-md text-label-md text-c57-primary font-bold hover:underline ml-1"
                >
                  Daftar Sekarang →
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-c57-on-surface-variant font-label-sm text-label-sm pt-2">
                <span className="flex items-center gap-1.5">
                  <Icon name="verified_user" size="sm" className="text-c57-secondary" />
                  Enkripsi SSL 256-bit
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="lock" size="sm" className="text-c57-secondary" />
                  Privasi Terlindungi
                </span>
                <a
                  href="https://wa.me/6281234567890"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="flex items-center gap-1.5 text-c57-primary hover:underline font-semibold"
                >
                  <Icon name="headset_mic" size="sm" />
                  Bantuan Concierge 24 Jam
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
