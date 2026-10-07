import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  addDoc,
  updateDoc
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
import Select from "../components/ui/Select";

/**
 * Fleet inventory: create, inline-edit, price, service status, delete.
 *
 * The Firestore document shape is unchanged, including the eight derived
 * fields written by `addDoc` and the `harga` total being the sum of the two
 * daily fees rather than a client-side preview. `mobil.status` stays the
 * service state ("normal" | "servis") that this page alone owns; ManajemenPesanan
 * deliberately writes only `tersedia` so a booking transition cannot knock a
 * serviced car back to normal.
 *
 * Two inline-edit write paths were tightened. The price box commits on blur or
 * Enter instead of writing on every keystroke, and the `layanan` select sends
 * `layanan` and `withDriver` in one `updateDoc` rather than two — same stored
 * document, half the writes and half the collection reads.
 *
 * The four amenity tiles and the two checkbox rows were copy-pasted between
 * the create form and the edit form; they are now `AmenityTile` and
 * `Toggle` so a change lands in both.
 */

const LAYANAN = ["Lepas Kunci", "Dengan Driver"];

const EMPTY_FORM = {
  nama: "",
  rental_fee_per_day: "",
  driver_fee_per_day: "",
  gambar: "",
  layanan: "Lepas Kunci",
  seats: 4,
  chargingPort: true,
  luggage: true
};

/** `harga` is the sum, not the client-side preview — kept in one place. */
const dailyTotal = (rentalFee, driverFee, layanan) =>
  parseInt(rentalFee || 0) + (layanan === "Dengan Driver" ? parseInt(driverFee || 0) : 0);

export default function CarManagement() {
  const [mobil, setMobil] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchMobil, setSearchMobil] = useState("");
  const [editingCarId, setEditingCarId] = useState(null);
  const [priceDraft, setPriceDraft] = useState({});
  const [savedId, setSavedId] = useState(null);
  const [editForm, setEditForm] = useState({
    nama: "", rental_fee_per_day: "", driver_fee_per_day: "",
    layanan: "Lepas Kunci", seats: 4, chargingPort: true, luggage: true
  });

  const fetchData = useCallback(async () => {
    try {
      const snapM = await getDocs(collection(db, "mobil"));
      setMobil(snapM.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch data:", error);
    }
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin === true) {
          setIsAdmin(true);
          fetchData();
        }
      } catch (error) {
        console.error("Error verifikasi admin:", error.message);
      }

      setLoading(false);
    };

    checkAdmin();
  }, [fetchData]);

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
        setForm({ ...form, gambar: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const downloadURL = await uploadImage(selectedFile, { limit: "photo", folder: "mobil" });

      setForm({ ...form, gambar: downloadURL });
      setSelectedFile(null);
      alert("Gambar armada berhasil diunggah ke Cloudinary!");
    } catch (error) {
      console.error("Gagal upload gambar:", error);
      alert("Gagal upload gambar: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTambahMobil = async () => {
    if (!form.nama || !form.rental_fee_per_day || !form.gambar) {
      alert("Lengkapi data mobil!");
      return;
    }

    try {
      await addDoc(collection(db, "mobil"), {
        nama: form.nama,
        harga: dailyTotal(form.rental_fee_per_day, form.driver_fee_per_day, form.layanan),
        rental_fee_per_day: parseInt(form.rental_fee_per_day),
        driver_fee_per_day: form.layanan === "Dengan Driver" ? parseInt(form.driver_fee_per_day || 0) : 0,
        gambar: form.gambar,
        layanan: form.layanan,
        withDriver: form.layanan === "Dengan Driver",
        seats: parseInt(form.seats),
        chargingPort: form.chargingPort,
        luggage: form.luggage,
        tersedia: true,
        status: "normal"
      });
      setForm({ ...EMPTY_FORM });
      setSelectedFile(null);
      fetchData();
      alert("Mobil berhasil ditambahkan!");
    } catch (error) {
      console.error("Gagal tambah mobil:", error.message);
    }
  };

  const handleHapusMobil = async (id) => {
    if(window.confirm("Hapus armada ini dari daftar?")) {
      await deleteDoc(doc(db, "mobil", id));
      fetchData();
    }
  };

  const handleEditMobil = async (id, fields) => {
    await updateDoc(doc(db, "mobil", id), fields);
    await fetchData();
  };

  /**
   * The inline price box keeps a local draft and commits on blur or Enter.
   *
   * It used to write `harga` straight to Firestore on every keystroke, so
   * typing a seven-digit figure cost seven `updateDoc` calls and seven full
   * `mobil` collection reads — and the intermediate states were persisted,
   * including the `parseInt("")` -> NaN that Firestore rejects. The stored
   * value is still a plain number; it is just reached once per edit instead
   * of once per character.
   */
  const commitPrice = async (car) => {
    const raw = priceDraft[car.id];
    if (raw === undefined) return;

    const clearDraft = () =>
      setPriceDraft(prev => {
        if (!(car.id in prev)) return prev;
        const next = { ...prev };
        delete next[car.id];
        return next;
      });

    const next = parseInt(raw, 10);
    // An empty or negative field is a half-typed value, not a price of 0.
    // Drop the draft and leave the stored figure alone.
    if (!Number.isFinite(next) || next < 0) {
      clearDraft();
      return;
    }
    if (next === car.harga) {
      clearDraft();
      return;
    }

    await handleEditMobil(car.id, { harga: next });
    clearDraft();
    setJustSaved(car.id);
  };

  const setJustSaved = (id) => {
    setSavedId(id);
    setTimeout(() => setSavedId(cur => (cur === id ? null : cur)), 1600);
  };

  const startEdit = (car) => {
    setEditingCarId(car.id);
    setEditForm({
      nama: car.nama || "",
      rental_fee_per_day: car.rental_fee_per_day || car.harga || "",
      driver_fee_per_day: car.driver_fee_per_day || "",
      layanan: car.layanan || "Lepas Kunci",
      seats: car.seats || 4,
      chargingPort: car.chargingPort !== false,
      luggage: car.luggage !== false
    });
  };

  const cancelEdit = () => {
    setEditingCarId(null);
  };

  const saveEdit = async (id) => {
    try {
      await updateDoc(doc(db, "mobil", id), {
        nama: editForm.nama,
        harga: dailyTotal(editForm.rental_fee_per_day, editForm.driver_fee_per_day, editForm.layanan),
        rental_fee_per_day: parseInt(editForm.rental_fee_per_day),
        driver_fee_per_day: editForm.layanan === "Dengan Driver" ? parseInt(editForm.driver_fee_per_day || 0) : 0,
        layanan: editForm.layanan,
        withDriver: editForm.layanan === "Dengan Driver",
        seats: parseInt(editForm.seats),
        chargingPort: editForm.chargingPort,
        luggage: editForm.luggage
      });
      setEditingCarId(null);
      fetchData();
      alert("Armada berhasil diperbarui!");
    } catch (error) {
      console.error("Gagal edit mobil:", error.message);
      alert("Gagal menyimpan perubahan: " + error.message);
    }
  };

  const toggleServis = async (id, currentStatus) => {
    const newStatus = currentStatus === "servis" ? "normal" : "servis";
    const tersedia = newStatus === "normal";
    await updateDoc(doc(db, "mobil", id), { status: newStatus, tersedia });
    fetchData();
  };

  const filteredMobil = mobil.filter(m => {
    if (searchMobil === "") return true;
    return m.nama?.toLowerCase().includes(searchMobil.toLowerCase()) ||
           m.status?.toLowerCase().includes(searchMobil.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-c57-surface-container-highest border-t-c57-primary-container"
          role="status"
          aria-label="Memuat armada"
        />
      </div>
    );
  }

  if (!isAdmin) return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center px-gutter-mobile sm:px-gutter text-center">
      <Card className="max-w-md w-full p-space-xl">
        <span className="mx-auto mb-space-lg flex h-20 w-20 items-center justify-center rounded-full bg-c57-error-container text-c57-on-error-container">
          <Icon name="lock" size="3xl" />
        </span>
        <h2 className="mb-space-sm font-headline-md text-headline-md text-c57-on-surface">
          Akses Terbatas
        </h2>
        <p className="mb-space-lg text-body-md text-c57-on-surface-variant italic">
          Halaman ini hanya dapat diakses oleh Administrator sistem Cakra Lima Tujuh.
        </p>
        <div className="mx-auto h-1.5 w-12 rounded-full bg-c57-primary-container" />
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Manajemen Inventaris"
          title="Katalog Armada"
          subtitle="Kelola data kendaraan, ketersediaan, dan status layanan."
          actions={
            <div className="w-full md:w-80">
              <Input
                icon="search"
                label="Cari armada"
                placeholder="Cari armada..."
                value={searchMobil}
                onChange={(e) => setSearchMobil(e.target.value)}
              />
            </div>
          }
        />

        <div className="mt-space-xl grid grid-cols-1 gap-gutter lg:grid-cols-3">
          {/* Form Create (Sticky left) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-[120px] p-space-lg sm:p-space-xl">
              <div className="mb-space-lg flex items-center gap-space-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-c57-md bg-c57-primary-container text-c57-on-primary">
                  <Icon name="add" size="xl" />
                </span>
                <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">Tambah Armada</h2>
              </div>

              <div className="space-y-space-md">
                <Field label="Identitas Mobil">
                  {(p) => (
                    <Input
                      {...p}
                      type="text"
                      value={form.nama}
                      onChange={e => setForm({ ...form, nama: e.target.value })}
                      placeholder="Contoh: Toyota Alphard Gen 4"
                    />
                  )}
                </Field>

                <Field label="Tarif Sewa / Hari (Rp)">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      inputMode="numeric"
                      value={form.rental_fee_per_day}
                      onChange={e => setForm({ ...form, rental_fee_per_day: e.target.value })}
                      placeholder="1.100.000"
                    />
                  )}
                </Field>

                {/* Biaya Driver — hanya tampil saat Dengan Driver */}
                <Field
                  label="Biaya Driver / Hari (Rp)"
                  hint={form.layanan !== "Dengan Driver" ? "N/A untuk Lepas Kunci" : undefined}
                  className={form.layanan === "Dengan Driver" ? "" : "opacity-40"}
                >
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      inputMode="numeric"
                      value={form.driver_fee_per_day}
                      onChange={e => setForm({ ...form, driver_fee_per_day: e.target.value })}
                      placeholder="200.000"
                      disabled={form.layanan !== "Dengan Driver"}
                    />
                  )}
                </Field>

                {/* Preview Total */}
                {form.rental_fee_per_day && (
                  <div className="flex items-center justify-between rounded-c57-md bg-c57-scrim px-space-md py-3 text-c57-on-scrim">
                    <span className="font-label-sm uppercase tracking-widest text-c57-on-scrim/60">
                      Total / Hari
                    </span>
                    <span className="font-headline-sm text-headline-sm text-c57-on-scrim tabular-nums">
                      Rp {dailyTotal(form.rental_fee_per_day, form.driver_fee_per_day, form.layanan).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}

                <Field label="Layanan">
                  {(p) => (
                    <Select
                      {...p}
                      value={form.layanan}
                      onChange={e => setForm({ ...form, layanan: e.target.value })}
                    >
                      {LAYANAN.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </Select>
                  )}
                </Field>

                <div className="space-y-space-md rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                  <span className="block border-b border-c57-surface-variant pb-2 font-label-sm uppercase tracking-widest text-c57-primary">
                    Fasilitas Armada
                  </span>

                  <div className="grid grid-cols-2 gap-space-md">
                    <Field label="Jumlah Kursi">
                      {(p) => (
                        <Input
                          {...p}
                          type="number"
                          inputMode="numeric"
                          value={form.seats}
                          onChange={e => setForm({ ...form, seats: e.target.value })}
                        />
                      )}
                    </Field>
                    <div className="flex flex-col justify-center gap-space-sm pt-6">
                      <Toggle
                        id="new-port"
                        label="Port Charger"
                        checked={form.chargingPort}
                        onChange={(v) => setForm({ ...form, chargingPort: v })}
                      />
                      <Toggle
                        id="new-luggage"
                        label="Bagasi"
                        checked={form.luggage}
                        onChange={(v) => setForm({ ...form, luggage: v })}
                      />
                    </div>
                  </div>
                </div>

                <Field label="Foto Armada">
                  {(p) => (
                    /* The file input covers the whole dashed target, which is
                       what makes the empty state clickable. It stays focusable
                       and is named by the visible "Foto Armada" label above. */
                    <div className="relative overflow-hidden rounded-c57-lg border-2 border-dashed border-c57-outline-variant p-space-md transition-colors hover:border-c57-primary/30 focus-within:border-c57-primary-container">
                      <input
                        {...p}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      />
                      {form.gambar ? (
                        <div className="pointer-events-none flex items-center gap-space-md">
                          <img
                            src={form.gambar}
                            alt="Pratinjau armada"
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
                  )}
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

                <Button type="button" size="lg" onClick={handleTambahMobil} className="w-full">
                  Simpan Unit Baru
                </Button>
              </div>
            </Card>
          </div>

          {/* Table/List View */}
          <div className="space-y-space-lg lg:col-span-2">
            {filteredMobil.map((m) => (
              <Card
                key={m.id}
                className="flex flex-col gap-space-lg p-space-sm transition-shadow duration-300 ease-editorial hover:shadow-c57-card-hover sm:p-space-md md:flex-row"
              >
                {/* Car Image Area */}
                <div className="h-36 w-full shrink-0 overflow-hidden rounded-c57-md border border-c57-surface-variant bg-c57-surface-container md:w-48">
                  <img src={m.gambar} alt={m.nama} className="h-full w-full object-cover" />
                </div>

                {/* Content Area */}
                {editingCarId === m.id ? (
                  <div className="flex-1 space-y-space-md">
                    <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                      <Field label="Nama Mobil">
                        {(p) => (
                          <Input
                            {...p}
                            type="text"
                            value={editForm.nama}
                            onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                          />
                        )}
                      </Field>
                      <Field label="Tarif Sewa (/hari)">
                        {(p) => (
                          <Input
                            {...p}
                            type="number"
                            inputMode="numeric"
                            value={editForm.rental_fee_per_day}
                            onChange={(e) => setEditForm({ ...editForm, rental_fee_per_day: e.target.value })}
                          />
                        )}
                      </Field>
                    </div>

                    {/* Biaya Driver di form edit */}
                    <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                      <Field
                        label="Biaya Driver (/hari)"
                        className={editForm.layanan === "Dengan Driver" ? "" : "opacity-40"}
                      >
                        {(p) => (
                          <Input
                            {...p}
                            type="number"
                            inputMode="numeric"
                            value={editForm.driver_fee_per_day}
                            onChange={(e) => setEditForm({ ...editForm, driver_fee_per_day: e.target.value })}
                            disabled={editForm.layanan !== "Dengan Driver"}
                          />
                        )}
                      </Field>
                      {editForm.rental_fee_per_day && (
                        <div className="flex flex-col justify-center rounded-c57-md bg-c57-scrim px-3 py-2 text-c57-on-scrim">
                          <span className="font-label-sm uppercase tracking-widest text-c57-on-scrim/60">
                            Total / Hari
                          </span>
                          <span className="font-headline-sm text-headline-sm text-c57-on-scrim tabular-nums">
                            Rp {dailyTotal(editForm.rental_fee_per_day, editForm.driver_fee_per_day, editForm.layanan).toLocaleString("id-ID")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-space-md sm:grid-cols-4">
                      <Field label="Layanan">
                        {(p) => (
                          <Select
                            {...p}
                            value={editForm.layanan}
                            onChange={(e) => setEditForm({ ...editForm, layanan: e.target.value })}
                          >
                            {LAYANAN.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </Select>
                        )}
                      </Field>
                      <Field label="Kursi">
                        {(p) => (
                          <Input
                            {...p}
                            type="number"
                            inputMode="numeric"
                            value={editForm.seats}
                            onChange={(e) => setEditForm({ ...editForm, seats: e.target.value })}
                          />
                        )}
                      </Field>
                      <div className="flex items-center gap-space-sm pt-6">
                        <Toggle
                          id={`edit-port-${m.id}`}
                          label="Port Charger"
                          checked={editForm.chargingPort}
                          onChange={(v) => setEditForm({ ...editForm, chargingPort: v })}
                        />
                      </div>
                      <div className="flex items-center gap-space-sm pt-6">
                        <Toggle
                          id={`edit-luggage-${m.id}`}
                          label="Bagasi"
                          checked={editForm.luggage}
                          onChange={(v) => setEditForm({ ...editForm, luggage: v })}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-space-sm border-t border-c57-surface-variant pt-space-md">
                      <Button type="button" variant="secondary" onClick={cancelEdit}>
                        Batal
                      </Button>
                      <Button type="button" variant="success" onClick={() => saveEdit(m.id)}>
                        Simpan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-space-md">
                    <div className="flex flex-col items-start justify-between gap-space-md sm:flex-row">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-space-sm">
                          <h3 className="break-words font-headline-sm text-headline-sm uppercase text-c57-on-surface">
                            {m.nama}
                          </h3>
                          <Pill
                            variant={m.tersedia ? "available" : "danger"}
                            icon={m.tersedia ? "check_circle" : "cancel"}
                          >
                            {m.tersedia ? "Tersedia" : "Disewa"}
                          </Pill>
                        </div>
                        <p className="text-body-sm text-c57-on-surface-variant">
                          ID: {m.id.substring(0, 10)}...
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          Tarif Sewa
                        </p>
                        <p className="font-headline-sm text-headline-sm text-c57-primary tabular-nums">
                          Rp. {(m.rental_fee_per_day || m.harga || 0).toLocaleString("id-ID")}
                          <span className="text-body-sm text-c57-on-surface-variant">/hari</span>
                        </p>
                        {m.layanan === "Dengan Driver" && (m.driver_fee_per_day > 0 || m.withDriver) && (
                          <p className="mt-0.5 text-body-sm text-c57-on-surface-variant">
                            +Rp {(m.driver_fee_per_day || 250000).toLocaleString("id-ID")} driver ={" "}
                            <span className="font-semibold text-c57-on-surface tabular-nums">
                              Rp {((m.rental_fee_per_day || m.harga || 0) + (m.driver_fee_per_day || 250000)).toLocaleString("id-ID")}/hari
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-space-md pt-2 sm:grid-cols-4">
                      <AmenityTile icon="group" label={`${m.seats || 4} Seat`} />
                      <AmenityTile
                        icon="electric_car"
                        label="Port"
                        active={m.chargingPort !== false}
                        activeTone="available"
                      />
                      <AmenityTile
                        icon="luggage"
                        label="Bagasi"
                        active={m.luggage !== false}
                        activeTone="tertiary"
                      />
                      <AmenityTile icon="settings" label={m.status} emphasis />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-space-md border-t border-c57-surface-variant pt-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-40">
                          <Select
                            label={`Layanan ${m.nama}`}
                            value={m.layanan || "Lepas Kunci"}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleEditMobil(m.id, {
                                layanan: val,
                                withDriver: val === "Dengan Driver",
                              });
                            }}
                          >
                            {LAYANAN.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </Select>
                        </div>

                        <div className="w-32">
                          <Input
                            type="number"
                            inputMode="numeric"
                            label={`Harga harian ${m.nama}`}
                            value={
                              priceDraft[m.id] !== undefined
                                ? priceDraft[m.id]
                                : m.harga ?? ""
                            }
                            onChange={(e) =>
                              setPriceDraft(prev => ({ ...prev, [m.id]: e.target.value }))
                            }
                            onBlur={() => commitPrice(m)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitPrice(m);
                              }
                            }}
                          />
                        </div>

                        {priceDraft[m.id] !== undefined ? (
                          <span
                            className="rounded-c57-sm p-1.5 text-c57-outline"
                            title="Belum disimpan — klik-away atau tekan Enter"
                          >
                            <Icon name="edit" size="sm" />
                          </span>
                        ) : (
                          <span
                            className={[
                              "rounded-c57-sm p-1.5",
                              savedId === m.id
                                ? "bg-c57-available-bg text-c57-available-text"
                                : "text-c57-outline",
                            ].join(" ")}
                            title={savedId === m.id ? "Tersimpan" : "Otomatis tersimpan"}
                          >
                            <Icon name="check" size="sm" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-space-sm">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => startEdit(m)}
                          aria-label={`Edit unit ${m.nama}`}
                        >
                          <Icon name="edit" size="sm" />
                        </Button>
                        <Button
                          type="button"
                          variant={m.status === "servis" ? "success" : "secondary"}
                          size="sm"
                          onClick={() => toggleServis(m.id, m.status)}
                        >
                          {m.status === "servis" ? "Kembali Normal" : "Set Servis"}
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => handleHapusMobil(m.id)}
                          aria-label={`Hapus armada ${m.nama}`}
                        >
                          <Icon name="delete" size="sm" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}

            {filteredMobil.length === 0 && (
              <EmptyState
                icon="directions_car"
                title="Armada Kosong"
                description="Tidak ada armada ditemukan."
                className="py-space-xl"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One amenity readout. `activeTone` picks the token pair rather than a raw
 * colour, so the on/off state is legible even where the label alone ("Port")
 * does not say which way round it is.
 */
function AmenityTile({ icon, label, active, activeTone, emphasis = false }) {
  const tone = active
    ? activeTone === "available"
      ? "text-c57-available-text"
      : "text-c57-tertiary"
    : "text-c57-outline";

  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-3">
      <Icon
        name={icon}
        size="sm"
        className={emphasis ? "text-c57-on-surface-variant" : tone}
      />
      <span
        className={[
          "text-center font-label-sm uppercase tracking-widest",
          emphasis ? "text-c57-primary italic" : "text-c57-on-surface-variant",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

/** Labelled checkbox. The native control is kept; only the accent is tokenised. */
function Toggle({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer accent-c57-primary-container"
      />
      <label
        htmlFor={id}
        className="cursor-pointer font-label-sm uppercase tracking-widest text-c57-on-surface-variant"
      >
        {label}
      </label>
    </div>
  );
}
