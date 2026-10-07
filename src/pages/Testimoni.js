import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import {
  BRAND_STATS,
  CATEGORIES,
  PUBLIC_FILTERS,
  RATING_LABELS,
  categoryLabel,
  initialsOf,
} from "../data/testimoni";
import Footer from "../components/Footer";

/**
 * Public testimonial & documentation gallery.
 *
 * Reads the `testimoni` collection live and shows only `status === "published"`,
 * so anything a guest submits through the modal below stays invisible here until
 * an admin approves it on `/admin-testimoni`. No editorial seed rows are merged
 * in: the grid renders whatever real, approved entries exist, and falls back to
 * the empty state when there are none.
 *
 * Two mockup icons are substituted: `cloud_upload` → `upload_file` and
 * `add_a_photo` → `add_photo_alternate`. Neither glyph exists in the project's
 * icon subset (`src/icon-codepoints.json`).
 */

/**
 * Normalizes any `createdAt` shape to epoch millis for client-side sorting:
 * Firestore Timestamp, Date, millis, an ISO string, or a pending
 * serverTimestamp placeholder (which has no date yet). Anything unparseable
 * sorts as oldest so one bad row can't break the whole list.
 */
const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

function Stars({ value, size = "sm", className = "" }) {
  return (
    <div className={["flex items-center gap-0.5 text-c57-primary-container", className].join(" ")}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          filled={i < value}
          className={i < value ? "opacity-100" : "opacity-25"}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ item }) {
  const initials = initialsOf(item.clientName);

  return (
    <article className="group flex flex-col overflow-hidden rounded-c57-xl bg-c57-surface-container-lowest shadow-c57-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-c57-card-hover">
      {item.photoUrl ? (
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-c57-surface-container">
          <img
            src={item.photoUrl}
            alt={`Dokumentasi perjalanan ${item.clientName}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
            }}
            className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
          />
          {item.label && (
            <div className="absolute left-space-md top-space-md z-10">
              <span className="rounded-full bg-c57-surface-container-lowest/90 px-space-md py-1 font-label-sm uppercase tracking-widest text-c57-on-surface shadow-c57-card backdrop-blur">
                {item.label}
              </span>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-space-lg">
        {item.verifiedBadge && !item.photoUrl && (
          <span className="mb-space-sm font-label-sm uppercase tracking-widest text-c57-on-secondary-fixed">
            {item.label}
          </span>
        )}

        <Stars value={item.rating} className="mb-space-sm" />

        <blockquote className="mb-space-md font-headline-sm text-headline-sm italic leading-relaxed text-c57-on-surface">
          &ldquo;{item.testimonial}&rdquo;
        </blockquote>

        <div className="mt-auto flex items-center gap-space-sm pt-space-sm">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-headline-sm text-headline-sm font-semibold",
              item.photoUrl
                ? "bg-c57-secondary-container text-c57-on-secondary-container"
                : "bg-c57-secondary-fixed text-c57-on-secondary-fixed",
            ].join(" ")}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-body-md text-body-md font-bold text-c57-on-surface">
              {item.clientName}
            </span>
            <span className="truncate font-body-sm text-body-sm text-c57-on-surface-variant">
              {item.meta || categoryLabel(item.category)}
            </span>
          </div>
          {item.verifiedBadge && (
            <Icon
              name="check_circle"
              size="sm"
              className="ml-auto shrink-0 text-c57-available-text"
              aria-label="Ulasan terverifikasi"
            />
          )}
        </div>
      </div>
    </article>
  );
}

export default function Testimoni() {
  const toast = useToast();
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    category: CATEGORIES[0].id,
    testimonial: "",
  });

  useEffect(() => {
    // Both filters are required, not just one: the rule only grants public read
    // when `status == "published" && published == true`, and a Firestore query
    // fails outright if it could return a document the caller may not read. So
    // the query has to constrain exactly what the rule requires.
    //
    // Deliberately NO `orderBy`: `status == x AND published == y` is servable by
    // the automatic single-field indexes, but adding `orderBy("createdAt")`
    // forces a composite index that has to be created by hand in the Firebase
    // console. This collection holds a handful of moderated entries, so sorting
    // in memory below is cheaper than making the page fail when the index is
    // missing.
    const q = query(
      collection(db, "testimoni"),
      where("status", "==", "published"),
      where("published", "==", true)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Newest first. `createdAt` is a serverTimestamp placeholder on a doc
        // that was written moments ago, and missing on very old rows, so treat
        // anything unparseable as oldest instead of letting it break the sort.
        rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setLive(rows);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        toast.error("Gagal memuat testimoni");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [toast]);

  const items = useMemo(
    () =>
      live
        .filter((t) => t.status === "published")
        .filter((t) => filter === "all" || t.category === filter),
    [live, filter]
  );

  const publishedCount = useMemo(
    () => live.filter((t) => t.status === "published").length,
    [live]
  );

  const submitTestimonial = async () => {
    if (!form.clientName.trim()) {
      toast.warning("Isi nama lengkap atau instansi terlebih dahulu.");
      return;
    }
    if (form.testimonial.trim().length < 20) {
      toast.warning("Ulasan minimal 20 karakter agar bermakna untuk tamu lain.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "testimoni"), {
        clientName: form.clientName.trim(),
        category: form.category,
        rating,
        testimonial: form.testimonial.trim(),
        tripDate: null,
        photoUrl: null,
        featured: false,
        published: false,
        status: "pending",
        source: "client",
        createdAt: serverTimestamp(),
      });
      toast.success("Ulasan Anda telah tersimpan dan akan diterbitkan oleh tim kurasi kami.");
      setModalOpen(false);
      setForm({ clientName: "", category: CATEGORIES[0].id, testimonial: "" });
      setRating(5);
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim ulasan", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-c57-surface pb-space-xl">
      {/* ── Hero ── */}
      <section className="relative w-full overflow-hidden bg-c57-inverse-surface px-margin-mobile pt-36 pb-space-xl md:px-margin-tablet lg:px-margin">
        <div className="relative z-10 mx-auto max-w-[1360px]">
          <span className="mb-space-md inline-flex items-center gap-1.5 rounded-full bg-c57-inverse-on-surface/10 px-space-md py-1.5 font-label-sm uppercase tracking-widest text-c57-inverse-on-surface/85 backdrop-blur">
            <Icon name="auto_awesome" size="sm" />
            Dokumentasi &amp; Cerita Otentik
          </span>

          <h1 className="mb-space-md max-w-3xl font-headline-xl text-headline-xl-mobile leading-[1.05] text-c57-inverse-on-surface md:text-headline-xl">
            Momen Berharga Bersama Mereka yang{" "}
            <span className="text-c57-primary-fixed">Telah Berkelana</span>
          </h1>

          <p className="mb-space-lg max-w-2xl font-body-lg text-body-lg leading-relaxed text-c57-inverse-on-surface/70">
            Kumpulan kisah tulus, dokumentasi visual lapangan, serta ulasan
            jujur dari tamu istimewa, rombongan keluarga, dan pelanggan
            korporat yang mempercayakan perjalanan mereka kepada kami.
          </p>

          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-xl text-headline-xl text-c57-inverse-on-surface">
                4.9
              </span>
              <div className="flex flex-col">
                <Stars value={5} className="[&_*]:!text-c57-primary-fixed" />
                <span className="font-label-sm uppercase tracking-widest text-c57-inverse-on-surface/70">
                  Sangat Puas · Google &amp; TripAdvisor
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat band ── */}
      <section className="relative z-10 mx-auto max-w-[1360px] px-margin-mobile md:px-margin-tablet lg:px-margin">
        <div className="-mt-space-lg grid grid-cols-2 gap-space-md lg:grid-cols-4">
          {BRAND_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-lowest p-space-lg shadow-c57-card"
            >
              <p className="mb-1 font-headline-md text-headline-md text-c57-on-surface tabular-nums">
                {stat.value}
              </p>
              <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category filters ── */}
      <section className="relative z-10 mx-auto mt-space-lg max-w-[1360px] px-margin-mobile md:px-margin-tablet lg:px-margin">
        <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-space-sm">
            {PUBLIC_FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={active}
                  className={[
                    "rounded-full px-space-md py-2 font-label-sm uppercase tracking-widest whitespace-nowrap",
                    "transition-all duration-300 ease-editorial",
                    active
                      ? "bg-c57-primary text-c57-on-primary shadow-c57-card"
                      : "bg-c57-surface-container text-c57-on-surface hover:bg-c57-surface-container-high",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <span className="shrink-0 font-label-sm uppercase tracking-widest text-c57-on-surface-variant tabular-nums hidden sm:block">
            {publishedCount} Cerita Tampil
          </span>
        </div>
      </section>

      {/* ── Masonry grid ── */}
      <section className="mx-auto mt-space-lg max-w-[1360px] px-margin-mobile md:px-margin-tablet lg:px-margin">
        {loading ? (
          <div className="flex flex-col items-center gap-space-md py-space-xl">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-c57-surface-container-highest border-t-c57-primary-container"
              role="status"
              aria-label="Memuat testimoni"
            />
            <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              Memuat cerita...
            </p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="rate_review"
            title="Belum ada cerita pada kategori ini"
            description="Coba pilih kategori lain, atau kirim Cerita Anda sendiri lewat tombol di bawah."
            className="py-space-xl"
          />
        ) : (
          <div className="masonry-grid columns-1 md:columns-2 lg:columns-3 gap-x-gutter [column-fill:balance]">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="mb-gutter break-inside-avoid"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <TestimonialCard item={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Submit CTA ── */}
      <section className="mx-auto mt-space-xl max-w-[1360px] px-margin-mobile md:px-margin-tablet lg:px-margin">
        <div className="flex flex-col items-start gap-space-lg rounded-c57-xl bg-c57-primary-container p-space-lg md:flex-row md:items-center md:justify-between md:p-space-xl">
          <div className="flex items-start gap-space-md">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-c57-primary text-c57-on-primary">
              <Icon name="rate_review" size="2xl" />
            </div>
            <div>
              <span className="font-label-sm uppercase tracking-widest text-c57-on-primary/70">
                Berbagi Pengalaman
              </span>
              <h2 className="mt-1 font-headline-sm text-headline-sm text-c57-on-primary md:text-headline-md">
                Punya Pengalaman Berkesan Bersama Kami?
              </h2>
              <p className="mt-2 max-w-xl text-body-md text-c57-on-primary/80">
                Bagikan cerita, foto estetik, dan ulasan tulus perjalanan Anda
                bersama armada Cakra Lima Tujuh. Cerita Anda menjadi bagian dari
                galeri kami.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            icon="add_photo_alternate"
            onClick={() => setModalOpen(true)}
            className="w-full shrink-0 md:w-auto"
          >
            Kirim Testimoni &amp; Foto
          </Button>
        </div>
      </section>

      {/* ── Site Footer ── */}
      <div className="mt-space-xl">
        <Footer />
      </div>

      {/* ── Submit modal ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Bagikan Cerita Perjalanan"
        subtitle="Pengalaman Anda membantu kami menjaga standar layanan bintang lima."
        footer={
          <Button
            type="button"
            size="lg"
            loading={submitting}
            onClick={submitTestimonial}
            className="w-full"
          >
            Kirim Cerita &amp; Ulasan
          </Button>
        }
      >
        <div className="space-y-space-lg">
          <Field label="Nama Lengkap / Instansi">
            {(p) => (
              <Input
                {...p}
                type="text"
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="Contoh: Keluarga Besar Pt. Surya Abadi"
              />
            )}
          </Field>

          <Field label="Layanan / Destinasi">
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

          <div>
            <span className="mb-2 block font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              Rating Pengalaman
            </span>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating pengalaman">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} bintang`}
                  onClick={() => setRating(n)}
                  className="rounded-full p-1 transition-transform hover:scale-110"
                >
                  <Icon
                    name="star"
                    size="xl"
                    className={n <= rating ? "text-c57-primary-container" : "text-c57-surface-variant"}
                  />
                </button>
              ))}
              <span className="ml-space-sm font-body-sm text-body-sm text-c57-on-surface-variant">
                {rating}.0 ({RATING_LABELS[rating]})
              </span>
            </div>
          </div>

          <Field label="Ulasan Singkat">
            {(p) => (
              <Textarea
                {...p}
                rows={5}
                value={form.testimonial}
                onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
                placeholder="Ceritakan momen terbaik perjalanan Anda bersama kami..."
              />
            )}
          </Field>

          <div className="flex items-start gap-space-sm rounded-c57-md bg-c57-surface-container-low p-space-md">
            <Icon name="check_circle" size="sm" className="mt-0.5 shrink-0 text-c57-available-text" />
            <p className="text-body-sm text-c57-on-surface-variant">
              Ulasan Anda akan ditinjau tim kurasi sebelum tayang. Foto
              dokumentasi dapat ditambahkan lewat WhatsApp concierge kami.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}