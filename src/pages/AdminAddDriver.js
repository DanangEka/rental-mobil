import { useState } from "react";
import { auth, db } from "../services/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Textarea from "../components/ui/Textarea";

/**
 * Driver onboarding form.
 *
 * The auth and Firestore contract is unchanged: one
 * `createUserWithEmailAndPassword`, one `setDoc` onto `users/{uid}` with the
 * same pre-verified driver document, the same toast pair, and the same 2s
 * redirect to `/admin-driver-profiles`.
 *
 * The form is now `Field` + `Input` rather than placeholder-as-label. Every
 * control previously carried its only name in a `placeholder`, which means
 * screen readers announced an empty edit and the label vanished on focus.
 */

export default function AdminAddDriver() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    simNumber: "",
    birthDate: "",
    address: "",
    password: "",
    confirmPassword: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Konfirmasi password tidak sesuai", "Gagal");
      return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        displayName: formData.name,
        name: formData.name,
        phone: formData.phone,
        simNumber: formData.simNumber,
        birthDate: new Date(formData.birthDate),
        address: formData.address,
        role: "driver",
        status: "active",
        verificationStatus: "verified",
        totalOrders: 0,
        totalEarnings: 0,
        rating: 0,
        notes: formData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success("Mitra pengemudi telah terdaftar.", "Berhasil");
      setTimeout(() => navigate("/admin-driver-profiles"), 2000);
    } catch (err) {
      console.error(err);
      toast.error(err.message, "Gagal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-4xl mx-auto px-gutter-mobile sm:px-gutter">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon="arrow_back"
          onClick={() => navigate("/admin-driver-management")}
          className="mb-space-lg"
        >
          Kembali ke Menu
        </Button>

        <PageHeader
          eyebrow="Driver Operations"
          title="Tambah Driver Baru"
          subtitle="Daftarkan mitra pengemudi baru ke dalam ekosistem Cakra Lima Tujuh."
        />

        <Card className="mt-space-xl overflow-hidden">
          <div className="flex items-center gap-space-md border-b border-c57-surface-variant bg-c57-surface-container px-6 py-space-lg sm:px-space-xl sm:py-space-xl">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-c57-md bg-c57-primary-container text-c57-on-primary">
              <Icon name="person_add" size="3xl" />
            </span>
            <div className="min-w-0">
              <p className="font-label-sm uppercase tracking-[0.28em] text-c57-primary">
                Formulir Pendaftaran
              </p>
              <h2 className="font-headline-sm text-headline-sm text-c57-on-surface mt-1">
                Metadata Operasional Pengemudi
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-space-xl p-6 sm:p-space-xl">
            <div className="grid grid-cols-1 gap-space-xl md:grid-cols-2">
              <section>
                <FormSection step="01" title="Profil Fundamental" />
                <div className="mt-space-lg space-y-space-lg">
                  <Field label="Nama Lengkap" required hint="Sesuai KTP.">
                    {(p) => (
                      <Input
                        {...p}
                        type="text"
                        name="name"
                        icon="person"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Nama Lengkap Sesuai KTP"
                        required
                      />
                    )}
                  </Field>

                  <Field label="Alamat Email" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="email"
                        name="email"
                        icon="mail"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="nama@email.com"
                        required
                      />
                    )}
                  </Field>

                  <Field label="No. WhatsApp / HP" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="tel"
                        name="phone"
                        icon="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+62 812-3456-7890"
                        required
                      />
                    )}
                  </Field>
                </div>
              </section>

              <section>
                <FormSection step="02" title="Legalitas & Biometrik" />
                <div className="mt-space-lg space-y-space-lg">
                  <Field label="Nomor Seri SIM" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="text"
                        name="simNumber"
                        icon="badge"
                        value={formData.simNumber}
                        onChange={handleInputChange}
                        placeholder="Nomor Seri SIM"
                        required
                      />
                    )}
                  </Field>

                  <Field label="Tanggal Lahir" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="date"
                        name="birthDate"
                        icon="calendar_month"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                        required
                      />
                    )}
                  </Field>

                  <Field label="Domisili Lengkap" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="text"
                        name="address"
                        icon="location_on"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Domisili Lengkap"
                        required
                      />
                    )}
                  </Field>
                </div>
              </section>
            </div>

            <section className="border-t border-c57-surface-variant pt-space-xl">
              <FormSection step="03" title="Kredensial Login" />
              <div className="mt-space-lg grid grid-cols-1 gap-space-lg md:grid-cols-2">
                <Field label="Password Baru" required>
                  {(p) => (
                    <Input
                      {...p}
                      type="password"
                      name="password"
                      icon="lock"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Password Baru"
                      required
                    />
                  )}
                </Field>

                <Field label="Konfirmasi Password" required>
                  {(p) => (
                    <Input
                      {...p}
                      type="password"
                      name="confirmPassword"
                      icon="lock"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Konfirmasi Password"
                      required
                    />
                  )}
                </Field>
              </div>
            </section>

            <section>
              <FormSection step="04" title="Catatan Internal" hint="Opsional." />
              <div className="mt-space-lg">
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Informasi tambahan seperti pengalaman, area tugas, atau referensi..."
                />
              </div>
            </section>

            <div className="flex justify-end border-t border-c57-surface-variant pt-space-xl">
              <Button
                type="submit"
                size="lg"
                loading={loading}
                icon={loading ? undefined : "person_add"}
                iconPosition="right"
              >
                {loading ? "Mendaftarkan..." : "Daftarkan Driver"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

/**
 * Numbered group heading inside the form. An `h3` rather than `SectionHeading`'s
 * `h2`, because the card already owns the `h2` for this form.
 */
function FormSection({ step, title, hint }) {
  return (
    <div className="flex items-baseline gap-space-sm">
      <span className="font-label-sm uppercase tracking-[0.28em] text-c57-outline">
        {step}
      </span>
      <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">{title}</h3>
      {hint && (
        <span className="font-label-sm uppercase tracking-widest text-c57-outline">
          {hint}
        </span>
      )}
    </div>
  );
}
