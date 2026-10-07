import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import Button from "../components/ui/Button";
import { uploadImage, validateImageFile } from "../utils/uploadImage";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Textarea from "../components/ui/Textarea";

/**
 * Tour-package catalogue authoring: a sticky create form beside a live list.
 *
 * Untouched contracts — the admin-claim gate, `paket_wisata` ordered by
 * `timestamp` desc, the Cloudinary direct upload to the `poster-promo` folder
 * with the local data-URL preview written into `form.imageUrl`, and the
 * `addDoc` payload including the unused `fasilitas` key. `alert()` and
 * `window.confirm()` are left as they are, matching the other admin pages that
 * have already been through this migration: swapping a blocking dialog for a
 * toast is a product decision, not a token change.
 */

export default function AdminTourPackages() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({
    judul: "",
    description: "",
    harga: "",
    durasi: "",
    destinasi: "",
    imageUrl: "",
    fasilitas: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const idTokenResult = await user.getIdTokenResult();
          if (idTokenResult.claims.admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error verifikasi admin:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "paket_wisata"), orderBy("timestamp", "desc"));
    const unsubscribeData = onSnapshot(q, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Gagal fetch data snapshot:", error);
    });

    return () => unsubscribeData();
  }, [isAdmin]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const problem = validateImageFile(file, "photo");
      if (problem) {
        alert(problem);
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setForm({ ...form, imageUrl: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadImage(selectedFile, { limit: "photo", folder: "poster-promo" });

      setForm({ ...form, imageUrl: downloadURL });
      setSelectedFile(null);
      alert("Gambar berhasil diunggah ke Cloudinary!");
    } catch (error) {
      console.error("Gagal upload gambar:", error);
      alert("Gagal upload gambar: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTambahPackage = async () => {
    if (!form.judul || !form.harga || !form.imageUrl || !form.durasi) {
      alert("Lengkapi data paket wisata!");
      return;
    }

    try {
      await addDoc(collection(db, "paket_wisata"), {
        ...form,
        harga: parseInt(form.harga),
        status: "Tersedia",
        timestamp: serverTimestamp()
      });
      setForm({
        judul: "",
        description: "",
        harga: "",
        durasi: "",
        destinasi: "",
        imageUrl: "",
        fasilitas: ""
      });
      setSelectedFile(null);
      alert("Paket Wisata berhasil ditambahkan!");
    } catch (error) {
      console.error("Gagal tambah paket:", error.message);
    }
  };

  const handleHapusPackage = async (id) => {
    if(window.confirm("Hapus paket wisata ini?")) {
      await deleteDoc(doc(db, "paket_wisata", id));
    }
  };


  const filteredPackages = packages.filter(p => {
    if (searchTerm === "") return true;
    return p.judul?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.destinasi?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center">
        <div
          className="w-10 h-10 border-4 border-c57-surface-container-highest border-t-c57-primary-container rounded-full animate-spin"
          role="status"
          aria-label="Memuat paket wisata"
        />
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center px-gutter-mobile sm:px-gutter text-center">
      <Card className="max-w-md w-full p-space-xl">
        <span className="w-20 h-20 rounded-full bg-c57-error-container text-c57-on-error-container flex items-center justify-center mx-auto mb-space-lg">
          <Icon name="lock" size="3xl" />
        </span>
        <h2 className="font-headline-md text-headline-md text-c57-on-surface mb-space-sm">
          Akses Terbatas
        </h2>
        <p className="text-body-md text-c57-on-surface-variant italic mb-space-lg">
          Halaman ini hanya dapat diakses oleh Administrator sistem Cakra Lima Tujuh.
        </p>
        <div className="h-1.5 w-12 bg-c57-primary-container mx-auto rounded-full" />
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Manajemen Layanan"
          title="Paket Wisata"
          subtitle="Buat dan kelola paket perjalanan wisata eksklusif."
          actions={
            <div className="w-full md:w-80">
              <Input
                icon="search"
                label="Cari paket"
                placeholder="Cari paket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-gutter mt-space-xl lg:grid-cols-3">
          {/* Form Create */}
          <div className="lg:col-span-1">
            <Card className="sticky top-[180px] max-h-[calc(100vh-210px)] overflow-y-auto p-space-lg sm:p-space-xl">
              <div className="mb-space-lg flex items-center gap-space-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-c57-md bg-c57-primary-container text-c57-on-primary">
                  <Icon name="add" size="xl" />
                </span>
                <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">Tambah Paket</h2>
              </div>

              <div className="space-y-space-md">
                <Field label="Judul Paket">
                  {(p) => (
                    <Input
                      {...p}
                      type="text"
                      value={form.judul}
                      onChange={e => setForm({ ...form, judul: e.target.value })}
                      placeholder="Contoh: Explore Bali 3D2N"
                    />
                  )}
                </Field>

                <div className="grid grid-cols-2 gap-space-md">
                  <Field label="Harga (Rp)">
                    {(p) => (
                      <Input
                        {...p}
                        type="number"
                        inputMode="numeric"
                        value={form.harga}
                        onChange={e => setForm({ ...form, harga: e.target.value })}
                        placeholder="0"
                      />
                    )}
                  </Field>

                  <Field label="Durasi">
                    {(p) => (
                      <Input
                        {...p}
                        type="text"
                        value={form.durasi}
                        onChange={e => setForm({ ...form, durasi: e.target.value })}
                        placeholder="3 Hari 2 Malam"
                      />
                    )}
                  </Field>
                </div>

                <Field label="Destinasi Utama">
                  {(p) => (
                    <Input
                      {...p}
                      type="text"
                      icon="location_on"
                      value={form.destinasi}
                      onChange={e => setForm({ ...form, destinasi: e.target.value })}
                      placeholder="Contoh: Kuta, Ubud, Uluwatu"
                    />
                  )}
                </Field>

                <Field label="Keterangan / Fasilitas">
                  {(p) => (
                    <Textarea
                      {...p}
                      rows={3}
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Detail paket..."
                    />
                  )}
                </Field>

                <Field label="Banner Paket">
                  {/* The file input covers the whole dashed target, which is what
                      makes the empty state clickable. Kept, but now carries a real
                      label association and a visible focus ring. */}
                  <div className="group relative overflow-hidden rounded-c57-lg border-2 border-dashed border-c57-outline-variant p-space-md transition-colors hover:border-c57-primary/30 focus-within:border-c57-primary-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      aria-label="Pilih gambar banner"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 focus-visible:opacity-100"
                    />
                    {form.imageUrl ? (
                      <div className="pointer-events-none flex items-center gap-space-md">
                        <img
                          src={form.imageUrl}
                          alt="Pratinjau banner"
                          className="h-12 w-16 rounded-c57-sm object-cover shadow-c57-card"
                        />
                        <span className="max-w-[120px] truncate text-body-sm font-semibold text-c57-on-surface-variant">
                          {selectedFile?.name || "Foto Terpilih"}
                        </span>
                      </div>
                    ) : (
                      <div className="pointer-events-none flex flex-col items-center gap-space-sm py-2 text-c57-outline">
                        <Icon name="add_photo_alternate" size="2xl" />
                        <span className="font-label-sm uppercase tracking-widest">Pilih Gambar</span>
                      </div>
                    )}
                  </div>
                </Field>

                {selectedFile && (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={isUploading}
                    onClick={handleUploadImage}
                    className="w-full"
                  >
                    {isUploading ? "Mengunggah..." : "Konfirmasi Unggah Foto"}
                  </Button>
                )}

                <Button type="button" size="lg" onClick={handleTambahPackage} className="w-full">
                  Publikasikan Paket
                </Button>
              </div>
            </Card>
          </div>

          {/* List View */}
          <div className="space-y-space-lg lg:col-span-2">
            {filteredPackages.map((p) => (
              <Card
                key={p.id}
                interactive
                className="group flex flex-col overflow-hidden md:flex-row"
              >
                <div className="relative h-48 w-full shrink-0 overflow-hidden bg-c57-surface-container md:w-64">
                  <img
                    src={p.imageUrl}
                    alt={p.judul}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute left-space-md top-space-md">
                    <Pill variant="onScrim">{p.durasi}</Pill>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-space-lg">
                  <div>
                    <div className="mb-space-sm flex items-start justify-between gap-space-md">
                      <h3 className="font-headline-sm text-headline-sm uppercase text-c57-on-surface">
                        {p.judul}
                      </h3>
                      <p className="shrink-0 font-headline-sm text-headline-sm text-c57-primary tabular-nums">
                        Rp. {(p.harga ?? 0).toLocaleString("id-ID")}
                      </p>
                    </div>

                    <div className="mb-space-md flex items-center gap-1.5 text-c57-on-surface-variant">
                      <Icon name="location_on" size="sm" className="text-c57-primary" />
                      <span className="font-label-sm uppercase tracking-widest">{p.destinasi}</span>
                    </div>

                    <p className="mb-space-md line-clamp-2 text-body-md text-c57-on-surface-variant italic leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-space-md border-t border-c57-surface-variant pt-space-md">
                    <Pill variant="available" icon="check">{p.status}</Pill>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleHapusPackage(p.id)}
                      aria-label={`Hapus paket ${p.judul}`}
                      icon="delete"
                    />
                  </div>
                </div>
              </Card>
            ))}

            {filteredPackages.length === 0 && (
              <EmptyState
                icon="checklist"
                title="Belum ada Paket Wisata"
                description="Mulai buat paket perjalanan menarik untuk klien Anda dengan formulir di samping."
                className="py-space-xl"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
