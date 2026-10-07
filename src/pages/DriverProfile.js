import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import StatCard from "../components/ui/StatCard";
import Textarea from "../components/ui/Textarea";

/**
 * Driver self-service profile.
 *
 * The five editable fields used to be five hand-copied label/input/read-only
 * blocks; they are one `FIELDS` table now. Read-only values (email, address,
 * SIM, birth date) render through `ReadOnlyValue` so the icon pairing and the
 * "Belum diisi" fallback live in one place.
 *
 * `handleSave` previously wrote the whole user document back with
 * `updateDoc(docRef, editForm)`, where `editForm` was seeded from the full
 * user doc. That wrote back `role`, `uid`, `verificationStatus` and anything
 * else an admin had changed since the page loaded, and it meant the write
 * surface was whatever happened to be on the object. It now sends an explicit
 * allowlist of the five fields this form actually owns.
 *
 * `stats.rating` is still never populated by the snapshot below, so the rating
 * bar renders empty. Left as-is — inventing a rating source is out of scope —
 * but it is dead UI until something writes it.
 */

const FIELDS = [
  { key: "nama", label: "Nama Lengkap", icon: "person", type: "text" },
  { key: "noTelepon", label: "Nomor Telepon", icon: "call", type: "tel" },
  { key: "simNumber", label: "Nomor SIM", icon: "verified_user", type: "text" },
  { key: "tanggalLahir", label: "Tanggal Lahir", icon: "calendar_month", type: "date" },
];

/** The only keys this form is allowed to write back. */
const EDITABLE_KEYS = [...FIELDS.map(f => f.key), "alamat"];

export default function DriverProfile() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [stats, setStats] = useState({
    totalTrips: 0,
    rating: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Fetch driver profile data
    const fetchDriverData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDriverData(data);
        setEditForm(data);
      }
    };

    fetchDriverData();

    // Fetch driver statistics
    const q = query(
      collection(db, "pemesanan"),
      where("driverId", "==", user.uid),
      where("status", "==", "selesai"),
      orderBy("tanggal", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let totalEarnings = 0;
      querySnapshot.forEach((doc) => {
        totalEarnings += doc.data().perkiraanHarga || 0;
      });

      setStats(prev => ({
        ...prev,
        totalTrips: querySnapshot.size,
        totalEarnings: totalEarnings
      }));
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    // Build the patch from the allowlist rather than spreading the form, so
    // nothing outside this form can reach Firestore.
    const patch = {};
    for (const key of EDITABLE_KEYS) {
      if (key in editForm) patch[key] = editForm[key];
    }

    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, patch);
      setDriverData(prev => ({ ...prev, ...patch }));
      setIsEditing(false);
      toast.success("Profil Anda telah diperbarui.", "Berhasil");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Terjadi kesalahan saat memperbarui profil.", "Gagal");
    }
  };

  const handleCancel = () => {
    setEditForm(driverData);
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Belum diisi";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  if (!user || !driverData) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-space-md">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-c57-primary-container"
            role="status"
            aria-label="Memuat profil driver"
          />
          <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
            Memuat profil driver...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl text-c57-on-surface">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40" aria-hidden="true">
        <div className="absolute top-[10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-c57-error-container mix-blend-multiply filter blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-c57-surface-container-high mix-blend-multiply filter blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-gutter-mobile sm:px-gutter py-space-lg">
        <PageHeader
          eyebrow="Driver Identity"
          title="Profil Driver"
          subtitle="Pantau aktivitas, statistik, dan kelola data pribadi Anda."
          className="mb-space-xl animate-fadeInUp"
        />

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              <div className="px-space-lg md:px-space-xl py-space-md md:py-space-lg border-b border-c57-surface-variant flex flex-wrap justify-between items-center gap-space-md bg-c57-surface-container-low">
                <div className="flex items-center gap-space-md">
                  <span className="p-space-sm bg-c57-primary-container text-c57-on-primary rounded-c57-md">
                    <Icon name="person" size="xl" />
                  </span>
                  <h2 className="font-headline-sm text-headline-sm text-c57-on-surface uppercase tracking-widest">
                    Data Pribadi
                  </h2>
                </div>

                {!isEditing ? (
                  <Button type="button" icon="edit" onClick={() => setIsEditing(true)}>
                    Edit Profil
                  </Button>
                ) : (
                  <div className="flex gap-space-sm">
                    <Button type="button" variant="success" icon="check" onClick={handleSave}>
                      Simpan
                    </Button>
                    <Button type="button" variant="secondary" icon="close" onClick={handleCancel}>
                      Batal
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-space-sm sm:p-space-lg">
                <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
                  {FIELDS.map(({ key, label, icon, type }) =>
                    isEditing ? (
                      <Field key={key} label={label}>
                        {(p) => (
                          <Input
                            {...p}
                            type={type}
                            value={editForm[key] || ""}
                            onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                        )}
                      </Field>
                    ) : (
                      <ReadOnlyField key={key} label={label} icon={icon}>
                        {key === "tanggalLahir"
                          ? formatDate(driverData[key])
                          : driverData[key] || "—"}
                      </ReadOnlyField>
                    )
                  )}

                  <ReadOnlyField label="Alamat Email" icon="mail">
                    {user.email}
                  </ReadOnlyField>

                  {isEditing ? (
                    <Field label="Alamat Lengkap" className="md:col-span-2">
                      {(p) => (
                        <Textarea
                          {...p}
                          rows={3}
                          value={editForm.alamat || ""}
                          onChange={e => setEditForm(prev => ({ ...prev, alamat: e.target.value }))}
                        />
                      )}
                    </Field>
                  ) : (
                    <ReadOnlyField
                      label="Alamat Lengkap"
                      icon="place"
                      className="md:col-span-2"
                    >
                      {driverData.alamat || "Belum melengkapi data alamat."}
                    </ReadOnlyField>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Statistics Section */}
          <div className="space-y-gutter">
            <Card className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <h3 className="font-label-sm uppercase tracking-widest mb-space-lg flex items-center gap-space-sm text-c57-on-surface-variant">
                <Icon name="star" size="md" className="text-c57-tertiary" filled />
                Statistik Driver
              </h3>

              <div className="space-y-space-lg">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                      Rating Keseluruhan
                    </span>
                    <span className="font-headline-sm text-headline-sm text-c57-on-surface">
                      {stats.rating.toFixed(1)}
                      <span className="text-body-sm text-c57-outline"> / 5.0</span>
                    </span>
                  </div>
                  <div
                    className="h-2.5 bg-c57-surface-container rounded-full overflow-hidden border border-c57-surface-variant"
                    role="progressbar"
                    aria-valuenow={Number(stats.rating.toFixed(1))}
                    aria-valuemin={0}
                    aria-valuemax={5}
                    aria-label="Rating keseluruhan"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-c57-accent-line to-c57-tertiary-container transition-all duration-1000"
                      style={{ width: `${(stats.rating / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-gutter">
                  <StatCard
                    label="Total Perjalanan"
                    value={stats.totalTrips}
                    icon="directions_car"
                  />
                  <StatCard
                    label="Total Pendapatan"
                    value={`Rp ${stats.totalEarnings.toLocaleString("id-ID")}`}
                    icon="payments"
                  />
                </div>
              </div>
            </Card>

            {/* Account Info Card */}
            <Card className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              <h3 className="font-label-sm uppercase tracking-widest mb-space-md border-b border-c57-surface-variant pb-space-sm">
                Info Akun
              </h3>
              <div className="space-y-space-md">
                <div className="flex justify-between items-center gap-space-sm">
                  <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                    Status
                  </span>
                  <Pill variant="available" icon="verified_user">
                    Verified Driver
                  </Pill>
                </div>
                <div className="flex justify-between items-center gap-space-sm">
                  <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                    Tipe Akun
                  </span>
                  <span className="text-body-sm font-semibold flex items-center gap-1.5 uppercase text-c57-on-surface">
                    <Icon name="badge" size="xs" className="text-c57-primary" />
                    {driverData.role}
                  </span>
                </div>
                <div>
                  <p className="font-label-sm uppercase tracking-widest text-c57-outline mb-1">
                    Bergabung Sejak
                  </p>
                  <p className="text-body-sm font-semibold">
                    {formatDate(driverData.createdAt?.toDate())}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Static value display for a field that is not currently editable.
 *
 * Deliberately not a `Field`: that component renders `<label htmlFor>`, which
 * would dangle when the child is a `<div>` rather than a form control. The
 * caption is a `<p>` because there is nothing to label.
 */
function ReadOnlyField({ label, icon, className = "", children }) {
  return (
    <div className={className}>
      <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-space-sm">
        {label}
      </p>
      <div className="flex items-start gap-space-sm bg-c57-surface-container-low border border-c57-surface-variant rounded-c57-md px-space-md py-3">
        <Icon name={icon} size="sm" className="text-c57-primary shrink-0 mt-0.5" />
        <span className="text-body-sm font-semibold text-c57-on-surface break-words">
          {children}
        </span>
      </div>
    </div>
  );
}
