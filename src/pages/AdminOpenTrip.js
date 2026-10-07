import React, { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { useToast } from "../components/Toast";
import { useCalendarSync } from "../services/calendarSync";
import CalendarSyncBanner, { CalendarSyncBadge } from "../components/CalendarSync";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";
import Table, { TableRow, TableCell } from "../components/ui/Table";
import TripRequestsQueue from "./TripRequestsQueue";

/**
 * Open-trip operations: the published schedule catalogue on one tab, and the
 * private/open-trip request queue on the other.
 *
 * Every Firestore write and read is byte-for-byte the same as before —
 * `open_trips` add/delete, the `pemesanan` query filtered by both `tipe ==
 * "opentrip"` and `openTripId == trip.id`, and the `verifyPayment` patch to
 * `pemesanan/{orderId}`. The capacity heuristic (Hiace = 14 seats, everything
 * else = 6) is likewise unchanged, because `kapasitasMaks` is what existing
 * documents are compared against.
 *
 * What did change is the dialog layer. Both modals were hand-rolled inside a
 * single shared overlay: neither closed on ESC, neither locked body scroll,
 * and because the overlay was a sibling rather than a portal, the create form
 * sat above the sticky admin nav. They are now two `Modal` instances.
 */

const TABS = [
  { id: "catalog", label: "Katalog Open Trip", icon: "grid_view" },
  { id: "requests", label: "Private Trip & Open Trip Submitted", icon: "inbox" },
];

const FLEET = ["Innova Reborn", "Hiace Premio"];

const EMPTY_FORM = {
  judul: "",
  mobilUtama: "Innova Reborn",
  destinasi: "",
  tanggalBerangkat: "",
  waktuKumpul: "",
  titikKumpul: "",
  hargaPerPax: ""
};

const TRIP_STATUS = {
  Tersedia: { variant: "available", icon: "check_circle" },
};

const tripStatusPill = (status) =>
  TRIP_STATUS[status] || { variant: "danger", icon: "cancel" };

const MANIFEST_COLUMNS = [
  { key: "pax", header: "Penumpang" },
  { key: "seat", header: "Kursi" },
  { key: "payment", header: "Pembayaran" },
  { key: "action", header: "Aksi" },
];

export default function AdminOpenTrip() {
  const toast = useToast();
  const { status: syncStatus, getSyncState } = useCalendarSync();
  const calConnected = syncStatus === "connected";
  const [activeTab, setActiveTab] = useState("catalog"); // "catalog" | "requests"
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);

  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const getCapacity = (mobil) => {
    if (mobil.includes("Hiace")) return 14;
    return 6;
  };

  const fetchTrips = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "open_trips"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => new Date(b.tanggalBerangkat) - new Date(a.tanggalBerangkat));
      setTrips(data);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data Open Trip");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleCreate = async () => {
    if (!formData.judul || !formData.destinasi || !formData.tanggalBerangkat || !formData.hargaPerPax) {
      toast.warning("Lengkapi data trip!");
      return;
    }

    try {
      const kapasitas = getCapacity(formData.mobilUtama);
      await addDoc(collection(db, "open_trips"), {
        ...formData,
        kapasitasMaks: kapasitas,
        kuotaTerisi: 0,
        hargaPerPax: Number(formData.hargaPerPax),
        status: "Tersedia",
        createdAt: Timestamp.now()
      });
      toast.success("Open Trip berhasil dibuat");
      setShowModal(false);
      fetchTrips();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin hapus trip?")) {
      try {
        await deleteDoc(doc(db, "open_trips", id));
        toast.success("Trip dihapus");
        fetchTrips();
      } catch (err) {
        toast.error("Gagal hapus");
      }
    }
  };

  const openDetail = async (trip) => {
    setSelectedTrip(trip);
    setShowDetailModal(true);
    try {
      const q = query(collection(db, "pemesanan"), where("tipe", "==", "opentrip"), where("openTripId", "==", trip.id));
      const snapshot = await getDocs(q);
      setPassengers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      toast.error("Gagal memuat penumpang");
    }
  };

  const verifyPayment = async (orderId) => {
    if (window.confirm("Konfirmasi pembayaran ini?")) {
      try {
        await updateDoc(doc(db, "pemesanan", orderId), {
          status: "pembayaran berhasil",
          paymentStatus: "paid"
        });
        toast.success("Hore! Pembayaran diverifikasi");
        openDetail(selectedTrip);
      } catch (err) {
        toast.error("Gagal verifikasi");
      }
    }
  };

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Paket Wisata & Perjalanan"
          title="Manajemen Open Trip"
          subtitle="Kelola katalog open trip dan antrian pengajuan private/open trip dari client."
        />

        {/* ── Google Calendar connection ── */}
        <CalendarSyncBanner />

        {/* Tab navigation */}
        <div
          className="mt-space-lg flex w-fit gap-1.5 rounded-full border border-c57-surface-variant bg-c57-surface-container-lowest p-1.5 shadow-c57-card"
          role="tablist"
          aria-label="Tampilan Open Trip"
        >
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(t.id)}
                className={[
                  "flex items-center gap-1.5 rounded-full px-space-md py-2.5",
                  "font-label-sm uppercase tracking-widest transition-colors duration-300 ease-editorial",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary",
                  active
                    ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                    : "text-c57-on-surface-variant hover:text-c57-primary",
                ].join(" ")}
              >
                <Icon name={t.icon} size="sm" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Trip Requests Queue ── */}
        {activeTab === "requests" && <TripRequestsQueue />}

        {/* ── Tab: Catalog ── */}
        {activeTab === "catalog" && (<>
        <div className="mt-space-lg flex justify-end">
          <Button
            type="button"
            size="lg"
            icon="add"
            onClick={() => {
              setFormData({ ...EMPTY_FORM });
              setShowModal(true);
            }}
          >
            Pasang Jadwal Baru
          </Button>
        </div>

        {/* Trips Grid */}
        <div className="mt-space-lg grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex flex-col items-center py-space-xl">
              <div
                className="mb-space-md h-10 w-10 animate-spin rounded-full border-4 border-c57-surface-container-highest border-t-c57-primary-container"
                role="status"
                aria-label="Sinkronisasi jadwal"
              />
              <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                Sinkronisasi Jadwal...
              </p>
            </div>
          ) : trips.length === 0 ? (
            <EmptyState
              icon="location_on"
              title="Belum ada rute aktif"
              description="Belum ada rute Open Trip yang aktif. Pasang jadwal baru untuk memulai."
              className="col-span-full py-space-xl"
            />
          ) : (
            trips.map(trip => {
              const pill = tripStatusPill(trip.status);
              const full = trip.kuotaTerisi >= trip.kapasitasMaks;
              return (
                <Card key={trip.id} className="group flex flex-col overflow-hidden transition-shadow duration-300 ease-editorial hover:shadow-c57-card-hover">
                  <div className="p-space-lg">
                    <div className="mb-space-lg flex items-start justify-between gap-space-md">
                      <div className="flex flex-wrap items-center gap-space-sm">
                        <Pill variant={pill.variant} icon={pill.icon}>{trip.status}</Pill>
                        {calConnected && (
                          <CalendarSyncBadge
                            state={getSyncState("open_trips", trip)}
                            compact
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(trip.id)}
                        aria-label={`Hapus trip ${trip.judul}`}
                        className="!px-2"
                      >
                        <Icon name="delete" size="sm" />
                      </Button>
                    </div>

                    <h3 className="font-headline-sm text-headline-sm text-c57-on-surface mb-1 transition-colors duration-300 group-hover:text-c57-primary">
                      {trip.judul}
                    </h3>
                    <p className="mb-space-lg flex items-baseline gap-1 font-headline-sm text-headline-sm text-c57-primary tabular-nums">
                      Rp {trip.hargaPerPax?.toLocaleString()}
                      <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                        / Seat
                      </span>
                    </p>

                    <dl className="mb-space-lg space-y-space-md">
                      <div className="flex items-center gap-space-sm text-body-md text-c57-on-surface-variant">
                        <Icon name="location_on" size="sm" className="shrink-0 text-c57-outline" />
                        <dd className="truncate">{trip.destinasi}</dd>
                      </div>
                      <div className="flex items-center gap-space-sm text-body-md text-c57-on-surface-variant">
                        <Icon name="calendar_month" size="sm" className="shrink-0 text-c57-outline" />
                        <dd>
                          {new Date(trip.tanggalBerangkat).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </dd>
                      </div>
                      <div className="flex items-center gap-space-sm text-body-md text-c57-on-surface-variant">
                        <Icon name="directions_car" size="sm" className="shrink-0 text-c57-outline" />
                        <dd>{trip.mobilUtama}</dd>
                      </div>
                    </dl>

                    <div className="rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                      <div className="mb-3 flex justify-between font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                        <span>Occupancy</span>
                        <span className="tabular-nums">{trip.kuotaTerisi} / {trip.kapasitasMaks}</span>
                      </div>
                      {/* The bar alone would carry "full" by colour; the ratio is
                          exposed to assistive tech and the text above repeats it. */}
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-c57-surface-container-highest"
                        role="progressbar"
                        aria-valuenow={trip.kuotaTerisi}
                        aria-valuemin={0}
                        aria-valuemax={trip.kapasitasMaks}
                        aria-label={`Kursi terisi: ${trip.kuotaTerisi} dari ${trip.kapasitasMaks}`}
                      >
                        <div
                          className={`h-full transition-all duration-1000 ${
                            full ? "bg-c57-error" : "bg-c57-primary-container"
                          }`}
                          style={{ width: `${(trip.kuotaTerisi / trip.kapasitasMaks) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto p-space-sm bg-c57-surface-container-low">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => openDetail(trip)}
                      icon="group"
                      className="w-full"
                    >
                      Kelola Penumpang
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
        </>)}
      </div>

      {/* Create Trip Form */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Pasang Jadwal Trip"
        footer={
          <Button type="button" size="lg" onClick={handleCreate} className="w-full">
            Publish Jadwal Open Trip
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
          <Field label="Judul / Headline Trip" className="md:col-span-2">
            {(p) => (
              <Input
                {...p}
                type="text"
                value={formData.judul}
                onChange={(e) => setFormData({...formData, judul: e.target.value})}
                placeholder="Contoh: Explore Bromo Midnight"
              />
            )}
          </Field>

          <Field label="Armada Utama">
            {(p) => (
              <Select
                {...p}
                value={formData.mobilUtama}
                onChange={(e) => setFormData({...formData, mobilUtama: e.target.value})}
              >
                {FLEET.map((mobil) => (
                  <option key={mobil} value={mobil}>{mobil}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Rute Destinasi">
            {(p) => (
              <Input
                {...p}
                type="text"
                icon="location_on"
                value={formData.destinasi}
                onChange={(e) => setFormData({...formData, destinasi: e.target.value})}
                placeholder="Surabaya - Bromo - Malang"
              />
            )}
          </Field>

          <Field label="Tanggal & Waktu">
            <div className="flex gap-space-sm">
              <Input
                type="date"
                value={formData.tanggalBerangkat}
                onChange={(e) => setFormData({...formData, tanggalBerangkat: e.target.value})}
                aria-label="Tanggal berangkat"
              />
              <Input
                type="time"
                value={formData.waktuKumpul}
                onChange={(e) => setFormData({...formData, waktuKumpul: e.target.value})}
                aria-label="Waktu kumpul"
                className="w-28 shrink-0"
              />
            </div>
          </Field>

          <Field label="Harga Pax (Rp)">
            {(p) => (
              <Input
                {...p}
                type="number"
                inputMode="numeric"
                value={formData.hargaPerPax}
                onChange={(e) => setFormData({...formData, hargaPerPax: e.target.value})}
                placeholder="Nominal per kursi"
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Manifest Table */}
      <Modal
        open={showDetailModal && !!selectedTrip}
        onClose={() => setShowDetailModal(false)}
        size="full"
        title="Passenger Manifest"
        subtitle={
          selectedTrip
            ? `Rute: ${selectedTrip.destinasi} | ${selectedTrip.tanggalBerangkat}`
            : undefined
        }
      >
        {passengers.length === 0 ? (
          <EmptyState
            icon="group"
            title="Belum Ada Reservasi"
            description="Tidak ada penumpang yang mem-booking rute ini."
            className="border-0 bg-transparent"
          />
        ) : (
          <Table columns={MANIFEST_COLUMNS}>
            {passengers.map((pax) => {
              const paid = pax.paymentStatus === "paid";
              return (
                <TableRow key={pax.id}>
                  <TableCell>
                    <p className="whitespace-nowrap font-headline-sm text-body-md text-c57-on-surface">
                      {pax.namaClient || pax.namaPemesan}
                    </p>
                    <p className="max-w-[200px] truncate text-body-sm text-c57-on-surface-variant">
                      {pax.email}
                    </p>
                  </TableCell>

                  <TableCell className="text-center">
                    <Pill variant="neutral">{pax.jumlahKursi} Seats</Pill>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-headline-sm text-body-md text-c57-primary tabular-nums">
                        Rp {pax.perkiraanHarga?.toLocaleString()}
                      </span>
                      <Pill variant={paid ? "available" : "sand"}>
                        {paid ? "Settled" : "Pending"}
                      </Pill>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    {!paid && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => verifyPayment(pax.id)}
                      >
                        Konfirmasi
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        )}
      </Modal>
    </div>
  );
}
