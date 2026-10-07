import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { uploadImage, validateImageFile } from "../utils/uploadImage";
import { db } from "../services/firebase";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import {
  CATEGORIES,
  RATING_LABELS,
  categoryLabel,
  initialsOf,
} from "../data/testimoni";

/**
 * Testimonial & documentation administration.
 *
 * One `testimoni` collection serves both this page and the public gallery, so a
 * guest submission on `/testimoni` arrives here as `status: "pending"` and is
 * invisible on the public side until approved below.
 *
 * The four stat cards and every count in the filter tabs are derived from the
 * collection rather than the mockup's hardcoded 48 / 3 / 4.95, so the page
 * reports what is actually stored.
 *
 * Image upload reuses the unsigned Cloudinary direct-upload already used by
 * `AdminTourPackages`, rather than adding Firebase Storage to the stack — the
 * app exports `storage` but nothing imports it.
 */

const PAGE_SIZE = 5;

const STATUS_META = {
  published: { label: "Tayang",      pill: "available", icon: "check_circle" },
  pending:   { label: "Menunggu",    pill: "sand",      icon: "hourglass_top" },
  rejected:  { label: "Ditolak",     pill: "danger",    icon: "cancel" },
};

const FILTERS = [
  { id: "all",       label: "Semua" },
  { id: "pending",   label: "Menunggu Validasi" },
  { id: "published", label: "Aktif Terpasang" },
  { id: "featured",  label: "Featured Beranda" },
  { id: "rejected",  label: "Ditolak" },
];

const SORTS = [
  { id: "newest", label: "Urutkan: Terbaru" },
  { id: "rating", label: "Urutkan: Rating Tertinggi" },
  { id: "oldest", label: "Urutkan: Terlama" },
];

function Stars({ value, size = "sm" }) {
  return (
    <div className="flex items-center gap-0.5 text-c57-primary-container">
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" size={size} className={i < value ? "opacity-100" : "opacity-25"} />
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone = "neutral" }) {
  const toneClass =
    tone === "warning"
      ? "bg-c57-tertiary-container text-c57-on-tertiary-container"
      : tone === "primary"
        ? "bg-c57-primary-container text-c57-on-primary"
        : "bg-c57-surface-container text-c57-primary-container";

  return (
    <Card className="flex items-start justify-between p-space-md">
      <div className="flex min-w-0 flex-col">
        <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
          {label}
        </span>
        <span className="mt-1 font-headline-md text-headline-md text-c57-on-surface tabular-nums">
          {value}
        </span>
        {sub && (
          <span className="mt-0.5 font-body-sm text-body-sm text-c57-on-surface-variant">
            {sub}
          </span>
        )}
      </div>
      <div className={["flex h-12 w-12 shrink-0 items-center justify-center rounded-c57-md", toneClass].join(" ")}>
        <Icon name={icon} size="2xl" />
      </div>
    </Card>
  );
}

export default function AdminTestimoni() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [rating, setRating] = useState(5);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    category: CATEGORIES[0].id,
    tripDate: "",
    testimonial: "",
    photoUrl: "",
    featured: false,
    published: true,
    watermark: true,
  });

  useEffect(() => {
    const q = query(collection(db, "testimoni"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Gagal memuat data testimoni");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [toast]);

  const stats = useMemo(() => {
    const published = items.filter((t) => t.status === "published");
    const pending = items.filter((t) => t.status === "pending");
    const featured = published.filter((t) => t.featured);
    const rated = items.filter((t) => Number(t.rating) > 0);
    const avg = rated.length
      ? (rated.reduce((s, t) => s + Number(t.rating), 0) / rated.length).toFixed(2)
      : "—";

    const byCategory = new Map();
    items.forEach((t) => {
      const key = t.category || "lainnya";
      byCategory.set(key, (byCategory.get(key) || 0) + 1);
    });
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    return { published, pending, featured, avg, total: items.length, top };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "all") list = list.filter((t) => t.status !== "rejected");
    else if (filter === "featured") list = list.filter((t) => t.featured);
    else list = list.filter((t) => t.status === filter);

    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter((t) =>
        `${t.clientName || ""} ${t.testimonial || ""} ${categoryLabel(t.category)}`
          .toLowerCase()
          .includes(term)
      );
    }

    const stamp = (t) => (t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0);
    const sorted = [...list];
    if (sort === "rating") sorted.sort((a, b) => Number(b.rating) - Number(a.rating));
    else if (sort === "oldest") sorted.sort((a, b) => stamp(a) - stamp(b));
    else sorted.sort((a, b) => stamp(b) - stamp(a));
    return sorted;
  }, [items, filter, search, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter, search, sort]);

  const patch = async (id, changes) => {
    try {
      await updateDoc(doc(db, "testimoni", id), changes);
    } catch (e) {
      console.error(e);
      toast.error("Gagal: " + e.message);
    }
  };

  const approve = (item) => {
    patch(item.id, { status: "published", published: true, reviewedAt: serverTimestamp() });
    toast.success(`"${item.clientName}" kini tayang di galeri publik`);
  };

  const reject = (item) => {
    patch(item.id, { status: "rejected", published: false, featured: false, reviewedAt: serverTimestamp() });
    toast.info(`"${item.clientName}" ditolak dari publik`);
  };

  const toggleFeatured = (item) => {
    patch(item.id, { featured: !item.featured });
    toast.success(item.featured ? "Dihapus dari featured" : "Ditandai featured beranda");
  };

  const remove = async (item) => {
    if (!window.confirm(`Hapus testimoni "${item.clientName}" secara permanen?`)) return;
    try {
      await deleteDoc(doc(db, "testimoni", item.id));
      toast.success("Testimoni dihapus");
    } catch (e) {
      toast.error("Gagal hapus: " + e.message);
    }
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0] || null;
    const problem = file && validateImageFile(file, "photo");
    if (problem) {
      toast.error(problem, "File ditolak");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const photoUrl = await uploadImage(selectedFile, { limit: "photo", folder: "poster-promo" });
      setForm((f) => ({ ...f, photoUrl }));
      setSelectedFile(null);
      toast.success("Foto dokumentasi berhasil diunggah");
    } catch (e) {
      console.error(e);
      toast.error("Gagal upload foto: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const submitTestimonial = async () => {
    if (!form.clientName.trim()) {
      toast.warning("Nama client wajib diisi");
      return;
    }
    if (form.testimonial.trim().length < 10) {
      toast.warning("Teks ulasan terlalu pendek");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "testimoni"), {
        clientName: form.clientName.trim(),
        category: form.category,
        tripDate: form.tripDate || null,
        rating,
        testimonial: form.testimonial.trim(),
        photoUrl: form.photoUrl || null,
        featured: form.featured,
        published: form.published,
        watermark: form.watermark,
        status: form.published ? "published" : "pending",
        source: "admin",
        createdAt: serverTimestamp(),
      });
      toast.success(form.published ? "Testimoni tayang di galeri publik" : "Testimoni disimpan ke antrean moderasi");
      setForm({
        clientName: "",
        category: CATEGORIES[0].id,
        tripDate: "",
        testimonial: "",
        photoUrl: "",
        featured: false,
        published: true,
        watermark: true,
      });
      setRating(5);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan testimoni", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filterCounts = {
    all: items.filter((t) => t.status !== "rejected").length,
    pending: stats.pending.length,
    published: stats.published.length,
    featured: stats.featured.length,
    rejected: items.filter((t) => t.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="mx-auto max-w-7xl px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Konten & Dokumentasi Client"
          title="Manajemen Testimoni & Galeri Dokumentasi"
          subtitle="Unggah foto dokumentasi nyata dari lapangan, kelola ulasan client, dan atur kurasi visual konten galeri."
        />

        {/* ── Stats ── */}
        <div className="mt-space-lg grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="photo_camera"
            label="Total Foto Terpublikasi"
            value={stats.published.length}
            sub="Tayang di galeri publik"
            tone="primary"
          />
          <StatCard
            icon="hourglass_top"
            label="Testimoni Menunggu Review"
            value={stats.pending.length}
            sub="Perlu validasi kurasi"
            tone="warning"
          />
          <StatCard
            icon="star"
            label="Rata-rata Rating Client"
            value={stats.avg}
            sub={`${stats.total} ulasan tercatat`}
          />
          <StatCard
            icon="landscape"
            label="Kategori Terpopuler"
            value={stats.top ? categoryLabel(stats.top[0]) : "—"}
            sub={stats.top ? `${stats.top[1]} dari ${stats.total} testimoni` : "Belum ada data"}
          />
        </div>

        <div className="mt-space-lg grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          {/* ── Upload form ── */}
          <div className="lg:col-span-5">
            <Card className="p-space-lg">
              <div className="mb-space-lg flex items-center gap-space-sm border-b border-c57-surface-variant pb-space-md">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-c57-primary-fixed text-c57-primary-container">
                  <Icon name="add_circle" size="md" />
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-c57-on-surface">
                    Form Upload Foto Client
                  </h2>
                  <p className="font-body-sm text-body-sm text-c57-on-surface-variant">
                    Lengkapi metadata testimoni sebelum disiarkan ke publik.
                  </p>
                </div>
              </div>

              <div className="space-y-space-md">
                <Field label="Nama Client / Rombongan">
                  {(p) => (
                    <Input
                      {...p}
                      type="text"
                      value={form.clientName}
                      onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                      placeholder="Contoh: Rombongan Komunitas Gowes Surabaya"
                    />
                  )}
                </Field>

                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                  <Field label="Kategori Layanan">
                    {(p) => (
                      <Select
                        {...p}
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>

                  <Field label="Tanggal Perjalanan">
                    {(p) => (
                      <Input
                        {...p}
                        type="date"
                        value={form.tripDate}
                        onChange={(e) => setForm({ ...form, tripDate: e.target.value })}
                      />
                    )}
                  </Field>
                </div>

                <div>
                  <span className="mb-2 block font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                    Kepuasan / Star Rating
                  </span>
                  <div className="flex w-fit items-center gap-1 rounded-c57-md bg-c57-surface-container-low p-space-sm">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} bintang`}
                        aria-pressed={n === rating}
                        onClick={() => setRating(n)}
                        className="rounded-full p-0.5 transition-transform hover:scale-110"
                      >
                        <Icon
                          name="star"
                          size="lg"
                          className={n <= rating ? "text-c57-primary-container" : "text-c57-surface-variant"}
                        />
                      </button>
                    ))}
                    <span className="ml-space-sm font-body-sm text-body-sm text-c57-on-surface-variant">
                      {rating}.0 ({RATING_LABELS[rating]})
                    </span>
                  </div>
                </div>

                {/* Photo dropzone */}
                <div>
                  <span className="mb-2 block font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                    Unggah Berkas Foto Dokumentasi
                  </span>
                  <label
                    htmlFor="testimoni-photo"
                    className="flex cursor-pointer flex-col items-center gap-space-sm rounded-c57-md border-2 border-dashed border-c57-surface-variant bg-c57-surface-container-lowest px-space-md py-space-lg text-center transition-colors hover:border-c57-primary/40 hover:bg-c57-surface-container-low"
                  >
                    <Icon name="upload_file" size="3xl" className="text-c57-primary-container" />
                    <span className="font-body-md text-body-md text-c57-on-surface">
                      Tarik &amp; lepas foto dokumentasi di sini
                    </span>
                    <span className="font-body-sm text-body-sm text-c57-on-surface-variant">
                      atau pilih berkas dari perangkat
                    </span>
                    <input
                      id="testimoni-photo"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={pickFile}
                    />
                  </label>

                  {(selectedFile || form.photoUrl) && (
                    <div className="mt-space-sm flex items-center gap-space-sm rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-lowest p-3">
                      {form.photoUrl ? (
                        <img
                          src={form.photoUrl}
                          alt="Pratinjau foto dokumentasi"
                          className="h-12 w-12 shrink-0 rounded-c57-sm object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-c57-sm bg-c57-surface-container">
                          <Icon name="photo_camera" size="md" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body-md text-body-md text-c57-on-surface">
                          {selectedFile?.name || "Foto dokumentasi"}
                        </p>
                        <p className="font-body-sm text-body-sm text-c57-on-surface-variant">
                          {selectedFile
                            ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
                            : "Sudah diunggah"}
                        </p>
                      </div>
                      {selectedFile && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={uploadPhoto}
                            loading={uploading}
                            icon="sync"
                            aria-label="Unggah foto"
                            className="!px-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                            icon="delete"
                            aria-label="Hapus pilihan foto"
                            className="!px-2"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Field label="Teks Ulasan / Cerita Perjalanan Client">
                  {(p) => (
                    <Textarea
                      {...p}
                      rows={4}
                      value={form.testimonial}
                      onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
                      placeholder="Tuliskan kutipan ulasan client apa adanya..."
                    />
                  )}
                </Field>

                <div className="space-y-space-sm rounded-c57-md bg-c57-surface-container-low p-space-md">
                  {[
                    { key: "featured", label: "Tampilkan di Beranda Utama (Featured Home Carousel)" },
                    { key: "published", label: "Tampilkan di Katalog Publik & Tab Testimoni" },
                    { key: "watermark", label: 'Cantumkan Watermark Resmi "Cakra Lima Tujuh"' },
                  ].map((row) => (
                    <label key={row.key} className="flex cursor-pointer items-center gap-space-sm">
                      <input
                        type="checkbox"
                        checked={form[row.key]}
                        onChange={(e) => setForm({ ...form, [row.key]: e.target.checked })}
                        className="h-4 w-4 accent-c57-primary"
                      />
                      <span className="font-body-md text-body-md text-c57-on-surface">
                        {row.label}
                      </span>
                    </label>
                  ))}
                </div>

                <Button
                  type="button"
                  size="lg"
                  icon="publish"
                  loading={submitting}
                  onClick={submitTestimonial}
                  className="w-full"
                >
                  {form.published ? "Terbitkan ke Galeri" : "Simpan ke Antrean Moderasi"}
                </Button>
              </div>
            </Card>

            <div className="mt-space-md flex items-start gap-space-sm rounded-c57-md border border-c57-tertiary-container bg-c57-tertiary-container/40 p-space-md">
              <Icon name="security" size="md" className="mt-0.5 shrink-0 text-c57-on-tertiary-container" />
              <p className="text-body-sm text-c57-on-tertiary-container">
                Pastikan telah mendapatkan persetujuan lisan maupun tertulis dari
                client sebelum foto wajah dipublikasikan. Foto berwatermark aktif
                secara default untuk konten kiriman client.
              </p>
            </div>
          </div>

          {/* ── Moderation list ── */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-space-sm">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className={[
                      "rounded-full px-space-md py-2 font-label-sm uppercase tracking-widest",
                      "transition-colors duration-300 ease-editorial",
                      active
                        ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                        : "border border-c57-surface-variant bg-c57-surface-container-lowest text-c57-on-surface-variant hover:text-c57-primary",
                    ].join(" ")}
                  >
                    {f.label} ({filterCounts[f.id]})
                  </button>
                );
              })}
            </div>

            <div className="mt-space-md flex flex-wrap items-center gap-space-sm">
              <Input
                type="search"
                icon="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama client atau isi ulasan..."
                aria-label="Cari testimoni"
                className="min-w-[220px] flex-1"
              />
              <Select
                label="Urutkan"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-auto"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="ghost" icon="format_list_bulleted" aria-label="Tampilan daftar" />
            </div>

            {loading ? (
              <div className="mt-space-lg flex flex-col items-center gap-space-md py-space-xl">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-4 border-c57-surface-container-highest border-t-c57-primary-container"
                  role="status"
                  aria-label="Memuat testimoni"
                />
                <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                  Sinkronisasi galeri...
                </p>
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon="rate_review"
                title="Tidak ada testimoni"
                description={
                  items.length === 0
                    ? "Belum ada testimoni di Firestore. Terbitkan kiriman pertama agar galeri publik mulai terisi."
                    : "Tidak ada entri yang cocok dengan filter atau pencarian ini."
                }
                className="mt-space-lg py-space-xl"
              />
            ) : (
              <div className="mt-space-md space-y-space-md">
                {visible.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.pending;
                  const created = item.createdAt?.toDate ? item.createdAt.toDate() : null;
                  return (
                    <Card key={item.id} className="space-y-space-md p-space-md">
                      <div className="flex flex-wrap items-center gap-space-sm">
                        <Pill variant={meta.pill} icon={meta.icon}>
                          {meta.label}
                        </Pill>
                        {item.featured && (
                          <Pill variant="signature" icon="star">
                            Featured
                          </Pill>
                        )}
                        <Pill variant="outline" icon={item.source === "client" ? "person" : "photo_camera"}>
                          {item.source === "client" ? "Kiriman Client" : "Kurasi Admin"}
                        </Pill>
                        <span className="ml-auto font-body-sm text-body-sm text-c57-on-surface-variant tabular-nums">
                          {created
                            ? created.toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>

                      <div className="flex gap-space-md">
                        {item.photoUrl && (
                          <img
                            src={item.photoUrl}
                            alt={`Dokumentasi ${item.clientName}`}
                            loading="lazy"
                            className="h-20 w-20 shrink-0 rounded-c57-md object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">
                            {item.clientName}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-body-sm text-body-sm text-c57-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <Icon name="pin_drop" size="sm" className="text-c57-outline" />
                              {categoryLabel(item.category)}
                            </span>
                            <Stars value={Number(item.rating) || 0} />
                            <span className="tabular-nums">{Number(item.rating) || 0}.0</span>
                          </div>
                          <p className="mt-2 line-clamp-3 text-body-md text-body-md text-c57-on-surface">
                            &ldquo;{item.testimonial}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-space-sm border-t border-c57-surface-variant pt-space-sm">
                        {item.status === "pending" ? (
                          <>
                            <Button type="button" size="sm" icon="check" onClick={() => approve(item)}>
                              Setujui Tayang
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon="close"
                              onClick={() => reject(item)}
                            >
                              Tolak
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon="edit"
                              onClick={() => toggleFeatured(item)}
                            >
                              {item.featured ? "Hapus Featured" : "Jadikan Featured"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              icon="delete"
                              onClick={() => remove(item)}
                            >
                              Hapus
                            </Button>
                          </>
                        )}
                        <span className="ml-auto flex items-center gap-2 font-body-sm text-body-sm text-c57-on-surface-variant">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-c57-secondary-container font-label-sm text-c57-on-secondary-container"
                            aria-hidden="true"
                          >
                            {initialsOf(item.clientName)}
                          </span>
                          {item.watermark ? "Watermark aktif" : "Tanpa watermark"}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pageCount > 1 && (
              <nav
                className="mt-space-lg flex items-center justify-center gap-space-sm"
                aria-label="Navigasi halaman testimoni"
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon="chevron_left"
                  disabled={current === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Halaman sebelumnya"
                  className="!px-2"
                />
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={n === current ? "page" : undefined}
                    className={[
                      "h-9 w-9 rounded-full font-label-sm uppercase tracking-widest tabular-nums transition-colors",
                      n === current
                        ? "bg-c57-primary text-c57-on-primary"
                        : "text-c57-on-surface-variant hover:bg-c57-surface-container-high",
                    ].join(" ")}
                  >
                    {n}
                  </button>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon="chevron_right"
                  disabled={current === pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  aria-label="Halaman berikutnya"
                  className="!px-2"
                />
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}