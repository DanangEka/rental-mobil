import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Icon from "../components/ui/Icon";
import Pill from "../components/ui/Pill";

export default function SignUp() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    nama: "",
    email: "",
    password: "",
    nomorTelepon: "",
    alamat: "",
    provinsi: "",
    kabupaten: "",
    kecamatan: "",
    kelurahan: "",
    rt: "",
    rw: "",
    penanggungJawab: "",
    penanggungJawabAlamat: "",
    penanggungJawabTelepon: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPenanggungJawab, setShowPenanggungJawab] = useState(false);

  const javaProvinces = ["banten", "dki jakarta", "jawa barat", "jawa tengah", "jawa timur", "di yogyakarta"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const calculatePasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) score += 25;
    if (pass.match(/\d/)) score += 25;
    if (pass.match(/[^a-zA-Z\d]/)) score += 25;
    return score;
  };

  const passStrength = calculatePasswordStrength(form.password);
  const strengthLabel =
    passStrength <= 25 ? 'Weak' : passStrength <= 50 ? 'Moderate' : passStrength <= 75 ? 'Strong' : 'Excellent';
  // Strength is a progress bar plus a word — colour alone must not carry the
  // signal, so each band also gets its own label.
  const strengthBar =
    passStrength <= 25
      ? 'w-1/4 bg-c57-error'
      : passStrength <= 50
        ? 'w-2/4 bg-c57-tertiary'
        : passStrength <= 75
          ? 'w-3/4 bg-c57-outline'
          : 'w-full bg-c57-available-text';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.nama || !form.email || !form.password || !form.nomorTelepon ||
      !form.alamat || !form.provinsi || !form.kabupaten || !form.kecamatan ||
      !form.kelurahan || !form.rt || !form.rw
    ) {
      toast.warning("Mohon lengkapi seluruh field wajib.");
      return;
    }

    if (showPenanggungJawab && (!form.penanggungJawab.trim() || !form.penanggungJawabAlamat.trim() || !form.penanggungJawabTelepon.trim())) {
      toast.warning("Mohon lengkapi seluruh field penanggung jawab untuk domisili luar pulau Jawa.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password minimal harus 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        ...form,
        role: "client",
        verificationStatus: "unverified",
        createdAt: serverTimestamp(),
      });

      await signOut(auth);

      toast.success("Pendaftaran berhasil!", "Silakan masuk dan lakukan verifikasi KTP.");
      navigate("/login");
    } catch (error) {
      console.error("Signup error:", error);
      let errMsg = error.message;
      if (error.code === 'auth/email-already-in-use') errMsg = "Email sudah digunakan.";
      toast.error(errMsg, "Pendaftaran Gagal");
    } finally {
      setLoading(false);
    }
  };

  const SectionTitle = ({ step, icon, title, description }) => (
    <div className="flex items-start gap-space-md border-b border-c57-surface-variant pb-space-md">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-c57-md bg-c57-surface-container text-c57-primary"
        aria-hidden="true"
      >
        <Icon name={icon} size="lg" />
      </span>
      <div className="min-w-0">
        <p className="font-label-sm uppercase tracking-[0.28em] text-c57-outline">
          Langkah {step}
        </p>
        <h3 className="font-headline-sm text-headline-sm text-c57-on-surface mt-1">
          {title}
        </h3>
        {description && (
          <p className="text-body-sm text-c57-on-surface-variant mt-1">{description}</p>
        )}
      </div>
    </div>
  );

  const PassToggle = (
    <button
      type="button"
      onClick={() => setShowPass(!showPass)}
      className="rounded-full p-1 text-c57-on-surface-variant transition-colors hover:text-c57-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary"
      aria-label={showPass ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      aria-pressed={showPass}
    >
      <Icon name={showPass ? "visibility_off" : "visibility"} size="md" />
    </button>
  );

  return (
    <div className="relative min-h-screen bg-c57-surface pt-30 pb-16 px-gutter-mobile sm:px-gutter">
      {/* Warm ambient wash. Subtle enough to stay under the 4.5:1 contrast
          floor for the body copy that sits on top of it. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-c57-surface-container-low" />
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-c57-primary-container/5 blur-[120px]" />
        <div className="absolute -right-32 top-32 h-[360px] w-[360px] rounded-full bg-c57-secondary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl animate-fadeInUp">
        <header className="mb-space-xl text-center">
          <Pill variant="signature" icon="verified_user" className="mb-space-md">
            Registrasi Member Baru
          </Pill>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-c57-on-surface leading-[1.1]">
            Mulai Perjalanan Anda
            <em className="font-normal italic text-c57-primary-container"> bersama kami</em>
          </h1>
          <p className="text-body-lg text-c57-on-surface-variant mt-space-md max-w-2xl mx-auto font-light">
            Daftar untuk verifikasi sewa lepas kunci, reservasi chauffeur, dan akses tarif
            khusus paket open trip kurasi kami.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-6 shadow-c57-card sm:p-10 md:p-14"
        >
          <div className="space-y-space-xl">
            {/* Step 1 — Account */}
            <section className="space-y-space-lg">
              <SectionTitle
                step="01"
                icon="shield"
                title="Informasi Akun"
                description="Kredensial login dan kontak resmi untuk konfirmasi reservasi."
              />

              <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
                <Field label="Nama Lengkap" required>
                  {(p) => (
                    <Input
                      {...p}
                      name="nama"
                      icon="person"
                      value={form.nama}
                      onChange={handleChange}
                      placeholder="Sesuai KTP"
                      required
                    />
                  )}
                </Field>

                <Field
                  label="Nomor WhatsApp"
                  required
                  hint="Dipakai untuk e-voucher dan koordinasi driver."
                >
                  {(p) => (
                    <Input
                      {...p}
                      type="tel"
                      name="nomorTelepon"
                      icon="phone"
                      value={form.nomorTelepon}
                      onChange={handleChange}
                      placeholder="+62 812-3456-7890"
                      required
                    />
                  )}
                </Field>

                <Field label="Alamat Email" required hint="Faktur resmi dikirim ke sini.">
                  {(p) => (
                    <Input
                      {...p}
                      type="email"
                      name="email"
                      icon="mail"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="nama@email.com"
                      required
                    />
                  )}
                </Field>

                <Field label="Kata Sandi" required hint="Minimal 6 karakter.">
                  {(p) => (
                    <Input
                      {...p}
                      type={showPass ? "text" : "password"}
                      name="password"
                      icon="lock"
                      trailing={PassToggle}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Minimal 6 karakter"
                      minLength="6"
                      required
                    />
                  )}
                </Field>
              </div>

              {form.password && (
                <div className="px-1">
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-c57-surface-container"
                    role="progressbar"
                    aria-valuenow={passStrength}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Kekuatan kata sandi: ${strengthLabel}`}
                  >
                    <div className={`h-full transition-all duration-500 ${strengthBar}`} />
                  </div>
                  <p className="font-label-sm uppercase tracking-widest text-c57-outline mt-2 text-right">
                    {strengthLabel}
                  </p>
                </div>
              )}
            </section>

            {/* Step 2 — Address */}
            <section className="space-y-space-lg">
              <SectionTitle
                step="02"
                icon="home_pin"
                title="Domisili Sesuai KTP"
                description="Wajib untuk standardisasi verifikasi sewa dan polis asuransi."
              />

              <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 lg:grid-cols-4">
                <Field label="Provinsi" required className="md:col-span-2 lg:col-span-4">
                  {(p) => (
                    <Input
                      {...p}
                      name="provinsi"
                      icon="location_on"
                      value={form.provinsi}
                      onChange={handleChange}
                      onBlur={() => {
                        const prov = form.provinsi.toLowerCase().trim();
                        setShowPenanggungJawab(prov && !javaProvinces.some((jp) => prov.includes(jp)));
                      }}
                      placeholder="Contoh: Jawa Timur"
                      required
                    />
                  )}
                </Field>

                <Field label="Kabupaten / Kota" required>
                  {(p) => (
                    <Input
                      {...p}
                      name="kabupaten"
                      icon="location_city"
                      value={form.kabupaten}
                      onChange={handleChange}
                      placeholder="Contoh: Surabaya"
                      required
                    />
                  )}
                </Field>

                <Field label="Kecamatan" required>
                  {(p) => (
                    <Input
                      {...p}
                      name="kecamatan"
                      value={form.kecamatan}
                      onChange={handleChange}
                      required
                    />
                  )}
                </Field>

                <Field label="Kelurahan / Desa" required>
                  {(p) => (
                    <Input
                      {...p}
                      name="kelurahan"
                      value={form.kelurahan}
                      onChange={handleChange}
                      required
                    />
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-space-md md:col-span-2">
                  <Field label="RT" required>
                    {(p) => (
                      <Input {...p} name="rt" value={form.rt} onChange={handleChange} placeholder="001" required />
                    )}
                  </Field>
                  <Field label="RW" required>
                    {(p) => (
                      <Input {...p} name="rw" value={form.rw} onChange={handleChange} placeholder="002" required />
                    )}
                  </Field>
                </div>

                <Field
                  label="Alamat Spesifik"
                  required
                  hint="Nama jalan, komplek, atau nomor rumah."
                  className="md:col-span-2 lg:col-span-4"
                >
                  {(p) => (
                    <Textarea
                      {...p}
                      name="alamat"
                      value={form.alamat}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Nama Jalan, Gedung, No. Rumah"
                      required
                    />
                  )}
                </Field>
              </div>
            </section>

            {/* Step 3 — Guarantor, only for non-Java addresses */}
            {showPenanggungJawab && (
              <section className="space-y-space-lg rounded-c57-lg border border-c57-outline-variant bg-c57-surface-container p-6 animate-fadeInUp md:p-10">
                <SectionTitle
                  step="03"
                  icon="family_restroom"
                  title="Data Penanggung Jawab"
                  description="Domisili luar pulau Jawa memerlukan data kerabat sebagai penanggung jawab."
                />

                <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
                  <Field label="Nama Penanggung Jawab" required>
                    {(p) => (
                      <Input
                        {...p}
                        name="penanggungJawab"
                        value={form.penanggungJawab}
                        onChange={handleChange}
                        required
                      />
                    )}
                  </Field>

                  <Field label="Nomor Telepon" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="tel"
                        name="penanggungJawabTelepon"
                        icon="phone"
                        value={form.penanggungJawabTelepon}
                        onChange={handleChange}
                        required
                      />
                    )}
                  </Field>

                  <Field label="Alamat Lengkap Penanggung Jawab" required className="md:col-span-2">
                    {(p) => (
                      <Textarea
                        {...p}
                        name="penanggungJawabAlamat"
                        value={form.penanggungJawabAlamat}
                        onChange={handleChange}
                        rows={2}
                        required
                      />
                    )}
                  </Field>
                </div>
              </section>
            )}
          </div>

          <div className="mt-space-xl border-t border-c57-surface-variant pt-space-xl">
            <Button type="submit" size="lg" loading={loading} className="w-full">
              {loading ? "Memproses Pendaftaran" : "Daftar Akun Sekarang"}
            </Button>

            <p className="mt-space-lg text-center text-body-sm text-c57-on-surface-variant">
              Sudah memiliki akun terdaftar?{" "}
              <Link
                to="/login"
                className="font-label-md uppercase tracking-wider text-c57-primary underline decoration-c57-primary/40 underline-offset-4 transition-colors hover:text-c57-primary-container hover:decoration-c57-primary-container"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </form>

        {/* Member privileges */}
        <section className="mt-space-xl">
          <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
            {[
              {
                icon: "directions_car",
                title: "Lepas Kunci Tanpa Ribet",
                body: "Verifikasi KTP sekali di awal, reservasi armada instan untuk perjalanan berikutnya.",
              },
              {
                icon: "star",
                title: "Chauffeur Berpengalaman",
                body: "Pengemudi profesional beretika perhotelan untuk perjalanan bisnis dan keluarga.",
              },
              {
                icon: "verified",
                title: "Tarif Transparan & Asuransi",
                body: "Bebas biaya tersembunyi dengan perlindungan perjalanan di setiap kilometer.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-6 shadow-c57-card"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-c57-md bg-c57-surface-container text-c57-primary"
                  aria-hidden="true"
                >
                  <Icon name={item.icon} size="lg" />
                </span>
                <h4 className="font-headline-sm text-body-lg text-c57-on-surface mt-space-md">
                  {item.title}
                </h4>
                <p className="text-body-sm text-c57-on-surface-variant mt-space-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
