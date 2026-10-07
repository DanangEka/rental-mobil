import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { uploadImage, validateImageFile } from "../utils/uploadImage";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const JAVA_PROVINCES = [
  "banten", "dki jakarta", "jawa barat", "jawa tengah", "jawa timur", "di yogyakarta",
];

const EMPTY_FORM = {
  nama: "",
  nomorTelepon: "",
  email: "",
  tanggalLahir: "",
  jenisKelamin: "",
  // Domisili
  alamat: "",
  provinsi: "",
  kabupaten: "",
  kecamatan: "",
  kelurahan: "",
  rt: "",
  rw: "",
  kotaBasisUtama: "",
  titikAntarFavorit: "",
  // Dokumen
  ktpFile: null,
  // Kontak Darurat
  kontakDaruratNama: "",
  kontakDaruratHubungan: "",
  kontakDaruratTelepon: "",
  // Penanggung Jawab (luar Jawa)
  penanggungJawab: "",
  penanggungJawabAlamat: "",
  penanggungJawabTelepon: "",
};

/** Every form field read back from Firestore (everything but the File object). */
const FORM_FIELDS = Object.keys(EMPTY_FORM).filter((key) => key !== "ktpFile");

/** Every field written back to Firestore — the form minus the read-only email. */
const WRITABLE_FIELDS = FORM_FIELDS.filter((key) => key !== "email");

const VERIFICATION = {
  verified: {
    label: "Terverifikasi (KYC Approved)",
    shortLabel: "Terverifikasi",
    ktpLabel: "Valid",
    icon: "verified",
    pillClass: "bg-c57-secondary-container/60 text-c57-on-secondary-container",
    docPillClass: "bg-c57-secondary-container text-c57-on-secondary-container",
    iconClass: "text-c57-primary",
  },
  pending: {
    label: "Menunggu Verifikasi",
    shortLabel: "Menunggu",
    ktpLabel: "Menunggu",
    icon: "schedule",
    // token-lint-disable-next-line
    pillClass: "bg-amber-100 text-amber-700",
    // token-lint-disable-next-line
    docPillClass: "bg-amber-100 text-amber-700",
    // token-lint-disable-next-line
    iconClass: "text-amber-500",
  },
  unverified: {
    label: "Belum Terverifikasi",
    shortLabel: "Belum Verifikasi",
    ktpLabel: "Belum Diunggah",
    icon: "info",
    // token-lint-disable-next-line
    pillClass: "bg-red-100 text-red-700",
    docPillClass: "bg-c57-surface-container text-c57-on-surface-variant",
    // token-lint-disable-next-line
    iconClass: "text-red-500",
  },
};

const inputCls =
  "w-full px-4 py-3 rounded-xl bg-c57-surface-container-low text-c57-on-surface font-body-md text-body-md " +
  "focus:bg-c57-surface-container-lowest focus:ring-1 focus:ring-c57-primary focus:outline-none transition-all shadow-inner";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const getMeta = (status) => VERIFICATION[status] || VERIFICATION.unverified;

const maskNik = (nik) => {
  if (!nik || typeof nik !== "string" || nik.length < 8) return "-";
  return `${nik.slice(0, 4)} •••• •••• ${nik.slice(-4)}`;
};

const needsPJ = (prov) => Boolean(prov) && !JAVA_PROVINCES.includes(prov.toLowerCase());

const buildForm = (data) => {
  const form = { ...EMPTY_FORM };
  FORM_FIELDS.forEach((key) => { form[key] = data[key] || ""; });
  return form;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

const joinedOn = (createdAt) => (createdAt?.toDate ? createdAt.toDate() : null);

/* ─── Main Component ────────────────────────────────────────────────────────── */

export default function Profile() {
  const navigate = useNavigate();
  const toast = useToast();

  const [userData, setUserData]         = useState(null);
  const [editMode, setEditMode]         = useState(false);
  const [editedData, setEditedData]     = useState(EMPTY_FORM);
  const [savedData, setSavedData]       = useState(EMPTY_FORM);
  const [loading, setLoading]           = useState(false);
  const [dataLoading, setDataLoading]   = useState(true);
  const [showPJ, setShowPJ]           = useState(false);
  const [previewKtp, setPreviewKtp]   = useState(null);
  const [loadFailed, setLoadFailed]   = useState(false);

  /* ── Fetch user data ───────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      try {
        if (!auth.currentUser) return;
        const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (!snap.exists() || cancelled) return;
        const d = snap.data();
        setUserData(d);
        const form = buildForm(d);
        setEditedData(form);
        setSavedData(form);
        setShowPJ(needsPJ(d.provinsi));
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadFailed(true);
        toast.error("Gagal memuat profil.");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "ktpFile") {
      const file = files[0];
      const problem = file && validateImageFile(file, "document");
      if (problem) {
        toast.error(problem, "File ditolak");
        e.target.value = "";
        setEditedData((p) => ({ ...p, ktpFile: null }));
        setPreviewKtp(null);
        return;
      }
      setEditedData((p) => ({ ...p, ktpFile: file }));
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviewKtp(reader.result);
        reader.readAsDataURL(file);
      } else {
        setPreviewKtp(null);
      }
      return;
    }
    setEditedData((p) => ({ ...p, [name]: value }));
    if (name === "provinsi") setShowPJ(needsPJ(value));
  };

  const handleCancel = () => {
    setEditedData(savedData);
    setPreviewKtp(null);
    setShowPJ(needsPJ(savedData.provinsi));
    setEditMode(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) { toast.error("Login ulang diperlukan."); return; }
      const ref = doc(db, "users", auth.currentUser.uid);
      let ktpURL = userData.ktpURL;
      let verStatus = userData.verificationStatus;

      if (editedData.ktpFile) {
        toast.info("Mengunggah KTP...");
        ktpURL = await uploadImage(editedData.ktpFile, { limit: "document" });
        verStatus = "pending";
      }

      const payload = Object.fromEntries(WRITABLE_FIELDS.map((key) => [key, editedData[key] || ""]));
      payload.ktpURL = ktpURL || null;
      payload.verificationStatus = verStatus;

      await updateDoc(ref, payload);
      const next = { ...editedData, ktpFile: null };
      setSavedData(next);
      setUserData((p) => ({ ...p, ...next, ktpURL, verificationStatus: verStatus }));
      setPreviewKtp(null);
      setEditMode(false);
      toast.success(
        "Profil diperbarui!",
        verStatus === "pending" ? "KTP sedang diproses admin." : ""
      );
    } catch (e) {
      console.error(e);
      toast.error("Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Guard: not logged in ──────────────────────────────────────────────── */
  if (!auth.currentUser) return <AccessDeniedState />;

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (dataLoading) return <ProfileSkeleton />;

  /* ── Read failed / no document on file ────────────────────────────────── */
  if (loadFailed) return <ProfileErrorState />;
  if (!userData) return <ProfileMissingState />;

  const meta       = getMeta(userData.verificationStatus);
  const initials   = (userData.nama || userData.email || "?").charAt(0).toUpperCase();
  const joined     = joinedOn(userData.createdAt);
  const joinedYear = joined ? joined.getFullYear() : null;
  const joinedFull = joined
    ? joined.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "-";

  const form = { editMode, edited: editedData, user: userData, onChange: handleChange };

  return (
    <div className="min-h-screen pt-28 pb-16 bg-c57-surface-container-low">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter py-8">

        <PageHeader
          editMode={editMode}
          joinedYear={joinedYear}
          onHome={() => navigate("/home")}
          onEdit={() => setEditMode(true)}
          onHistory={() => navigate("/history-pesanan")}
        />

        {/* ── Main grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ════════ LEFT COLUMN ════════ */}
          <div className="lg:col-span-4 space-y-6">
            <IdentityCard user={userData} initials={initials} meta={meta} joinedFull={joinedFull} />
            <SecurityCard />
          </div>

          {/* ════════ RIGHT COLUMN ════════ */}
          <div className="lg:col-span-8 space-y-8">
            <PersonalInfoCard {...form} />
            <DocumentCard
              {...form}
              meta={meta}
              previewKtp={previewKtp}
              onEditMode={() => setEditMode(true)}
            />
            <AddressCard {...form} />
            {showPJ && <ResponsiblePartyCard {...form} />}
            {editMode && (
              <EditActions loading={loading} onCancel={handleCancel} onSave={handleSave} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page states ───────────────────────────────────────────────────────────── */

function AccessDeniedState() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-gutter-mobile sm:px-gutter bg-c57-surface-container-low flex justify-center items-start">
      <div className="bg-c57-surface-container-lowest rounded-2xl border border-c57-outline-variant/20 shadow-sm p-10 max-w-md w-full text-center">
        <span className="w-12 h-12 rounded-full bg-c57-surface-container-high flex items-center justify-center mx-auto mb-4 text-c57-outline">
          <Icon name="lock" size="xl" />
        </span>
        <h2 className="font-headline-sm text-c57-on-surface mb-2">Akses Ditolak</h2>
        <p className="font-body-md text-c57-on-surface-variant">Silakan masuk ke akun Anda terlebih dahulu.</p>
      </div>
    </div>
  );
}

function ProfileMissingState() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-gutter-mobile sm:px-gutter bg-c57-surface-container-low flex justify-center items-start">
      <div className="bg-c57-surface-container-lowest rounded-2xl border border-c57-outline-variant/20 shadow-sm p-10 max-w-md w-full text-center">
        <span className="w-12 h-12 rounded-full bg-c57-surface-container-high flex items-center justify-center mx-auto mb-4 text-c57-outline">
          <Icon name="person_search" size="xl" />
        </span>
        <h2 className="font-headline-sm text-c57-on-surface mb-2">Data Profil Tidak Ditemukan</h2>
        <p className="font-body-md text-c57-on-surface-variant">
          Belum ada data tersimpan untuk akun ini. Silakan hubungi admin agar profil Anda dilengkapi.
        </p>
      </div>
    </div>
  );
}

function ProfileErrorState() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-gutter-mobile sm:px-gutter bg-c57-surface-container-low flex justify-center items-start">
      <div className="bg-c57-surface-container-lowest rounded-2xl border border-c57-outline-variant/20 shadow-sm p-10 max-w-md w-full text-center">
        <span className="w-12 h-12 rounded-full bg-c57-error-container flex items-center justify-center mx-auto mb-4 text-c57-error">
          <Icon name="error" size="xl" />
        </span>
        <h2 className="font-headline-sm text-c57-on-surface mb-2">Profil Gagal Dimuat</h2>
        <p className="font-body-md text-c57-on-surface-variant mb-5">
          Terjadi kesalahan saat mengambil data profil. Coba muat ulang halaman.
        </p>
        <Button size="sm" icon="refresh" onClick={() => window.location.reload()}>
          Muat Ulang
        </Button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-gutter-mobile sm:px-gutter bg-c57-surface-container-low animate-pulse">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="h-12 bg-c57-surface-container rounded-xl w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <div className="h-80 bg-c57-surface-container rounded-2xl" />
            <div className="h-64 bg-c57-surface-container rounded-2xl" />
            <div className="h-36 bg-c57-surface-container rounded-2xl" />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <div className="h-64 bg-c57-surface-container rounded-2xl" />
            <div className="h-48 bg-c57-surface-container rounded-2xl" />
            <div className="h-64 bg-c57-surface-container rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Breadcrumb & header ───────────────────────────────────────────────────── */

function PageHeader({ editMode, joinedYear, onHome, onEdit, onHistory }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-c57-on-surface-variant mb-3">
        <button
          type="button"
          onClick={onHome}
          className="font-label-sm text-label-sm uppercase tracking-widest hover:text-c57-primary transition-colors"
        >
          Portal Klien
        </button>
        <Icon name="chevron_right" size="xs" className="text-c57-on-surface-variant" />
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-c57-primary font-bold">
          Profil Akun &amp; Keanggotaan
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-c57-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-c57-primary/10 text-c57-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Client Center VIP
            </span>
            {joinedYear && (
              <>
                <span className="text-c57-on-surface-variant font-label-sm text-label-sm">•</span>
                <span className="text-c57-on-surface-variant font-label-sm text-label-sm">
                  Akun Terdaftar sejak {joinedYear}
                </span>
              </>
            )}
          </div>
          <h1 className="font-headline-lg text-headline-lg text-c57-on-surface font-semibold tracking-tight">
            Profil Akun &amp; Keanggotaan
          </h1>
          <p className="font-body-md text-body-md text-c57-on-surface-variant mt-2 max-w-2xl">
            Kelola data pribadi, verifikasi identitas KTP untuk kemudahan sewa lepas kunci, dan preferensi layanan Cakra Lima Tujuh.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!editMode && (
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2.5 rounded-full bg-c57-surface-container-high text-c57-on-surface hover:bg-c57-surface-container-highest transition-colors font-label-md text-label-md flex items-center gap-2 shadow-sm"
            >
              <Icon name="edit" size="sm" />
              Edit Profil
            </button>
          )}
          <button
            type="button"
            onClick={onHistory}
            className="px-5 py-2.5 rounded-full bg-c57-primary text-c57-on-primary hover:brightness-110 transition-all font-label-md text-label-md font-semibold tracking-wide flex items-center gap-2 shadow-md"
          >
            <Icon name="history" size="sm" />
            Riwayat Booking
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Left column ───────────────────────────────────────────────────────────── */

function IdentityCard({ user, initials, meta, joinedFull }) {
  return (
    <div className="bg-c57-surface-container-lowest rounded-2xl p-6 shadow-sm border border-c57-outline-variant/20 flex flex-col items-center text-center relative overflow-hidden">
      {/* Gradient banner */}
      <div className="w-full h-24 bg-gradient-to-r from-c57-primary via-c57-primary-container to-c57-secondary-container rounded-xl mb-12 relative flex items-end justify-center">
        <div className="absolute -bottom-10 w-24 h-24 rounded-full bg-c57-surface-container-lowest p-1.5 shadow-lg">
          <div className="w-full h-full rounded-full bg-c57-primary flex items-center justify-center text-c57-on-primary font-headline-lg text-headline-lg font-bold shadow-inner overflow-hidden">
            {user.photoURL
              ? <img src={user.photoURL} alt={user.nama || "avatar"} className="w-full h-full object-cover" />
              : initials
            }
          </div>
        </div>
        <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full bg-c57-surface-container-lowest/80 backdrop-blur text-c57-primary font-label-sm text-label-sm font-bold">
          VIP MEMBER
        </div>
      </div>

      <h2 className="font-headline-sm text-headline-sm text-c57-on-surface font-semibold">
        {user.nama || "Nama Belum Diisi"}
      </h2>
      <span className="font-body-sm text-body-sm text-c57-on-surface-variant mt-0.5">
        {user.email || "-"}
      </span>

      {/* Verification badge */}
      <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold ${meta.pillClass}`}>
        <Icon name={meta.icon} size="xs" filled className={meta.iconClass} />
        {meta.label}
      </div>

      {/* Mini stats */}
      <div className="w-full mt-6 pt-5 border-t border-c57-outline-variant/20 grid grid-cols-2 gap-3 text-left">
        <MiniStat label="Nomor ID" value={maskNik(user.nik)} />
        <MiniStat label="Bergabung" value={joinedFull} />
      </div>

      {/* Quick actions */}
      <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
        <button
          type="button"
          disabled
          title="Fitur segera hadir"
          className="px-3 py-2 rounded-xl bg-c57-surface-container-high text-c57-on-surface font-label-md text-label-md font-medium flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
        >
          <Icon name="photo_camera" size="sm" />
          Ganti Foto
        </button>
        <button
          type="button"
          disabled
          title="Fitur segera hadir"
          className="px-3 py-2 rounded-xl bg-c57-surface-container-high text-c57-on-surface font-label-md text-label-md font-medium flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
        >
          <Icon name="lock_reset" size="sm" />
          Kata Sandi
        </button>
      </div>
    </div>
  );
}

function SecurityCard() {
  return (
    <div className="bg-c57-surface-container-lowest rounded-2xl p-5 shadow-sm border border-c57-outline-variant/20">
      <h4 className="font-label-md text-label-md text-c57-on-surface uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
        <Icon name="security" size="md" className="text-c57-primary shrink-0" />
        Status Keamanan Akun
      </h4>
      <ul className="space-y-2.5 text-c57-on-surface-variant font-body-sm text-body-sm">
        <SecurityRow label="Autentikasi 2 Langkah" status="Aktif" active />
        <SecurityRow label="Email Notifikasi Booking" status="Aktif" active />
        <SecurityRow label="PIN Pembayaran Cepat" status="Belum diatur" active={false} />
      </ul>
    </div>
  );
}

/* ─── Right column ──────────────────────────────────────────────────────────── */

function PersonalInfoCard({ editMode, edited, user, onChange }) {
  return (
    <SectionCard
      icon="badge"
      title="Informasi Pribadi"
      description="Pastikan data sesuai dengan kartu identitas resmi untuk kelancaran manifest."
      badge="Langkah 1/3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TextField
          label="Nama Lengkap (Sesuai KTP)"
          required
          icon="person"
          name="nama"
          placeholder="Nama Sesuai KTP"
          wrapperClass={editMode ? undefined : "md:col-span-2"}
          editMode={editMode}
          edited={edited}
          user={user}
          onChange={onChange}
        />

        {/* Nomor WA */}
        <div>
          <FieldLabel>Nomor WhatsApp / Seluler {editMode && <Req />}</FieldLabel>
          {editMode
            ? (
              <div className="relative">
                <IconInput icon="call" name="nomorTelepon" type="tel" value={edited.nomorTelepon} onChange={onChange} placeholder="08..." />
                {user.nomorTelepon && (
                  <span className="absolute inset-y-0 right-2 flex items-center">
                    <span className="px-2 py-1 rounded bg-c57-secondary-container text-c57-on-secondary-container text-[11px] font-semibold flex items-center gap-1">
                      <Icon name="check_circle" size="xs" className="text-c57-primary" />
                      Aktif
                    </span>
                  </span>
                )}
              </div>
            )
            : <ReadValue icon="call" value={user.nomorTelepon} />
          }
        </div>

        {/* Email (read-only) */}
        <TextField
          readOnly
          label="Alamat Email Utama"
          icon="mail"
          name="email"
          hint="Diubah melalui pengaturan akun"
          user={user}
        />

        {/* Tanggal Lahir + Jenis Kelamin */}
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Tanggal Lahir"
            name="tanggalLahir"
            type="date"
            readValue={formatDate(user.tanggalLahir)}
            editMode={editMode}
            edited={edited}
            user={user}
            onChange={onChange}
          />
          <TextField
            label="Jenis Kelamin"
            name="jenisKelamin"
            options={["", "Laki-laki", "Perempuan"]}
            editMode={editMode}
            edited={edited}
            user={user}
            onChange={onChange}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function DocumentCard({ editMode, edited, user, onChange, meta, previewKtp, onEditMode }) {
  return (
    <SectionCard
      icon="verified_user"
      title="Verifikasi Dokumen Perjalanan"
      description="Dibutuhkan untuk asuransi perjalanan, verifikasi hotel, serta rental lepas kunci."
      badge={
        <span className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full font-semibold shrink-0 ${meta.docPillClass}`}>
          {meta.shortLabel}
        </span>
      }
    >
      {/* KTP */}
      <div className="p-4 rounded-xl bg-c57-surface-container-low border border-c57-outline-variant/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="credit_card" size="md" className="text-c57-primary shrink-0" />
            <span className="font-label-md text-label-md font-bold text-c57-on-surface">KTP Elektronik (e-KTP)</span>
          </div>
          <span className={`inline-flex items-center gap-1 font-label-sm text-label-sm font-bold ${
            user.verificationStatus === "verified" ? "text-c57-primary" : "text-c57-on-surface-variant"
          }`}>
            {user.verificationStatus === "verified" && (
              <Icon name="check_circle" size="xs" className="text-c57-primary" />
            )}
            {meta.ktpLabel}
          </span>
        </div>

        {/* NIK masked */}
        <div className="p-3 bg-c57-surface-container-lowest rounded-lg border border-c57-outline-variant/10 flex items-center gap-3">
          <div className="w-12 h-14 bg-c57-surface-container-high rounded flex items-center justify-center text-c57-on-surface-variant shrink-0">
            <Icon name="account_box" size="xl" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-label-sm text-label-sm text-c57-on-surface-variant block uppercase">NIK Nasional</span>
            <span className="font-label-md text-label-md font-bold text-c57-on-surface tracking-wider">
              {maskNik(user.nik)}
            </span>
            <span className="text-[11px] text-c57-on-surface-variant block mt-0.5">
              {user.verificationStatus === "verified" ? "Tervalidasi Kemendagri" : "Menunggu verifikasi"}
            </span>
          </div>
        </div>

        {/* KTP upload preview */}
        {editMode && (
          <div>
            <label
              htmlFor="ktpFile"
              className="flex flex-col items-center gap-2 px-4 py-5 border-2 border-dashed border-c57-outline-variant rounded-xl cursor-pointer hover:border-c57-primary/40 hover:bg-c57-surface-container-lowest transition-colors text-center"
            >
              <Icon name="add_photo_alternate" size="xl" className="text-c57-on-surface-variant" />
              <span className="font-label-sm text-c57-primary font-semibold">Perbarui Dokumen</span>
              {edited.ktpFile && (
                <span className="text-[11px] text-c57-primary truncate max-w-[160px]">📎 {edited.ktpFile.name}</span>
              )}
              <input id="ktpFile" name="ktpFile" type="file" accept="image/*" onChange={onChange} className="sr-only" />
            </label>
          </div>
        )}

        {(previewKtp || user.ktpURL) && (
          <div className="relative rounded-lg overflow-hidden border border-c57-outline-variant/20">
            <img src={previewKtp || user.ktpURL} alt="KTP" className="w-full h-auto object-contain bg-c57-surface-dim" />
            {previewKtp && (
              <span className="absolute top-1.5 right-1.5 bg-c57-scrim/80 text-c57-on-scrim text-[11px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                Pratinjau
              </span>
            )}
          </div>
        )}

        {!editMode && (
          <div className="flex items-center justify-between pt-1 text-c57-on-surface-variant font-label-sm text-label-sm">
            <span>{user.ktpURL ? "Dokumen diunggah" : "Belum diunggah"}</span>
            {!user.ktpURL && (
              <button type="button" onClick={onEditMode} className="text-c57-primary font-semibold hover:underline">
                Unggah KTP
              </button>
            )}
          </div>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="mt-6 pt-5 border-t border-c57-outline-variant/20">
        <h4 className="font-label-md text-label-md font-bold text-c57-on-surface mb-3 flex items-center gap-2">
          <Icon name="emergency" size="md" className="text-c57-primary shrink-0" />
          Kontak Darurat Terdaftar (Emergency Contact)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TextField
            label="Nama Kerabat"
            name="kontakDaruratNama"
            placeholder="Nama kerabat"
            editMode={editMode}
            edited={edited}
            user={user}
            onChange={onChange}
          />
          <TextField
            label="Hubungan"
            name="kontakDaruratHubungan"
            placeholder="Pasangan / Orang tua"
            editMode={editMode}
            edited={edited}
            user={user}
            onChange={onChange}
          />
          <TextField
            label="Nomor Seluler Kerabat"
            name="kontakDaruratTelepon"
            type="tel"
            placeholder="08..."
            editMode={editMode}
            edited={edited}
            user={user}
            onChange={onChange}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function AddressCard({ editMode, edited, user, onChange }) {
  const fields = [
    { label: "Provinsi", name: "provinsi", placeholder: "Provinsi" },
    { label: "Kabupaten / Kota", name: "kabupaten", placeholder: "Kabupaten" },
    { label: "Kecamatan", name: "kecamatan", placeholder: "Kecamatan" },
    { label: "Kelurahan / Desa", name: "kelurahan", placeholder: "Kelurahan" },
    { label: "RT", name: "rt", placeholder: "RT" },
    { label: "RW", name: "rw", placeholder: "RW" },
    { label: "Kota Basis Utama", name: "kotaBasisUtama", placeholder: "Surabaya (Cakra Hub East Java)" },
    { label: "Titik Antar Favorit Alternatif", name: "titikAntarFavorit", placeholder: "Bandara Juanda..." },
  ];

  return (
    <SectionCard
      icon="location_on"
      title="Alamat Domisili & Pengiriman Unit"
      description="Titik serah terima default ketika Anda memesan armada antar-jemput atau sewa privat."
      badge="Lokasi Terdaftar"
    >
      <div className="space-y-4">
        <TextField
          label="Alamat Rumah / Kantor Domisili"
          name="alamat"
          rows={2}
          placeholder="Jl. Raya ..."
          editMode={editMode}
          edited={edited}
          user={user}
          onChange={onChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              name={field.name}
              placeholder={field.placeholder}
              editMode={editMode}
              edited={edited}
              user={user}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ResponsiblePartyCard({ editMode, edited, user, onChange }) {
  return (
    <SectionCard
      icon="groups"
      title="Data Penanggung Jawab"
      description="Wajib diisi untuk domisili di luar Pulau Jawa."
      badge={<span className="px-2.5 py-1 rounded-full bg-c57-primary/10 text-c57-primary font-label-sm text-label-sm font-semibold shrink-0">Wajib</span>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TextField
          label="Nama Penanggung Jawab"
          name="penanggungJawab"
          placeholder="Nama Kerabat"
          editMode={editMode}
          edited={edited}
          user={user}
          onChange={onChange}
        />
        <TextField
          label="Nomor Telepon Kerabat"
          name="penanggungJawabTelepon"
          type="tel"
          placeholder="08..."
          editMode={editMode}
          edited={edited}
          user={user}
          onChange={onChange}
        />
        <TextField
          wrapperClass="md:col-span-2"
          label="Alamat Kerabat"
          name="penanggungJawabAlamat"
          rows={2}
          placeholder="Alamat kerabat..."
          editMode={editMode}
          edited={edited}
          user={user}
          onChange={onChange}
        />
      </div>
    </SectionCard>
  );
}

function EditActions({ loading, onCancel, onSave }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <div className="flex items-center gap-2 text-c57-on-surface-variant font-body-sm text-body-sm">
        <Icon name="lock" size="sm" className="text-c57-primary shrink-0" />
        <span>Data Anda dilindungi enkripsi standar SSL 256-bit PT Cakra Lima Tujuh Transindo</span>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-c57-surface-container-high text-c57-on-surface hover:bg-c57-surface-container-highest transition-colors font-label-md text-label-md font-semibold"
        >
          Batalkan
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3 rounded-full bg-c57-primary text-c57-on-primary hover:brightness-110 transition-all font-label-md text-label-md font-semibold tracking-wider uppercase shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Icon name="check" size="sm" />
          }
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}

/* ─── Field primitives ──────────────────────────────────────────────────────── */

function Req() {
  return <span className="text-c57-primary ml-0.5">*</span>;
}

function FieldLabel({ children }) {
  return (
    <label className="font-label-md text-label-md text-c57-on-surface block mb-2 font-medium">
      {children}
    </label>
  );
}

/**
 * One label + read/edit pair. Renders the read-only value unless `editMode` is
 * on, then swaps in the matching control (input, textarea or select).
 */
function TextField({
  label, name, editMode, edited, user, onChange,
  required, readOnly, icon, type = "text", placeholder, hint, rows,
  options, emptyLabel = "Pilih...", readValue, wrapperClass,
}) {
  if (readOnly || !editMode) {
    return (
      <div className={wrapperClass}>
        <FieldLabel>{label}</FieldLabel>
        <ReadValue icon={icon} value={readValue !== undefined ? readValue : user[name]} hint={hint} />
      </div>
    );
  }

  let control;
  if (rows) {
    control = (
      <textarea name={name} rows={rows} value={edited[name]} onChange={onChange} placeholder={placeholder} className={`${inputCls} resize-none`} />
    );
  } else if (options) {
    control = (
      <select name={name} value={edited[name]} onChange={onChange} className={inputCls}>
        {options.map((value) => (
          <option key={value || "empty"} value={value}>{value || emptyLabel}</option>
        ))}
      </select>
    );
  } else if (icon) {
    control = <IconInput icon={icon} name={name} type={type} value={edited[name]} onChange={onChange} placeholder={placeholder} />;
  } else {
    control = <input type={type} name={name} value={edited[name]} onChange={onChange} placeholder={placeholder} className={inputCls} />;
  }

  return (
    <div className={wrapperClass}>
      <FieldLabel>
        {label}
        {required && <Req />}
      </FieldLabel>
      {control}
    </div>
  );
}

function IconInput({ icon, name, type = "text", value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-c57-on-surface-variant">
        <Icon name={icon} size="md" />
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${inputCls} pl-11`}
      />
    </div>
  );
}

function ReadValue({ icon, value, hint }) {
  return (
    <div>
      <div className={`w-full px-4 py-3 rounded-xl bg-c57-surface-container-low text-c57-on-surface font-body-md text-body-md ${icon ? "flex items-center gap-2" : ""}`}>
        {icon && <Icon name={icon} size="sm" className="text-c57-on-surface-variant shrink-0" />}
        <span className="truncate">{value || "-"}</span>
      </div>
      {hint && <p className="text-body-sm text-c57-on-surface-variant mt-1">{hint}</p>}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="p-3 bg-c57-surface-container-low rounded-xl min-w-0">
      <span className="font-label-sm text-label-sm text-c57-on-surface-variant block uppercase">{label}</span>
      <span className="font-label-md text-label-md text-c57-on-surface font-bold truncate block" title={value}>{value}</span>
    </div>
  );
}

function SecurityRow({ label, status, active }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-c57-primary" : "bg-c57-outline-variant"}`} />
        {label}
      </span>
      <span className={`font-label-sm text-label-sm font-semibold ${active ? "text-c57-primary" : "text-c57-on-surface-variant"}`}>
        {status}
      </span>
    </li>
  );
}

function SectionCard({ icon, title, description, badge, children }) {
  return (
    <div className="bg-c57-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-sm border border-c57-outline-variant/20">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-c57-outline-variant/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-c57-primary/10 text-c57-primary flex items-center justify-center shrink-0">
            <Icon name={icon} size="lg" />
          </div>
          <div className="min-w-0">
            <h3 className="font-headline-sm text-headline-sm text-c57-on-surface font-semibold truncate">
              {title}
            </h3>
            {description && <p className="font-body-sm text-body-sm text-c57-on-surface-variant">{description}</p>}
          </div>
        </div>
        {typeof badge === "string"
          ? <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-c57-surface-container text-c57-on-surface-variant font-semibold shrink-0">{badge}</span>
          : badge
        }
      </div>
      {children}
    </div>
  );
}
