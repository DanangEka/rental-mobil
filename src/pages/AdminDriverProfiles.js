import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useToast } from "../components/Toast";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";

/**
 * Driver roster: identity, performance, and the per-driver status switch.
 *
 * The data contract is unchanged — `users` filtered to `role == "driver"`,
 * sorted newest-first by `createdAt` client-side, plus a live read of all
 * `pemesanan` documents that the per-driver order count and earnings are
 * derived from. The earnings basis stays "orders whose status is one of
 * selesai / lunas / cash_submitted", which is the same definition
 * `handleStatusChange` is written against.
 *
 * The detail dialog is now the `Modal` primitive. This file's hand-rolled
 * version had a `×` close button and no ESC, no focus trap and no scroll lock,
 * so the two-column profile could not be read without a mouse.
 */

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Aktif" },
  { id: "inactive", label: "Nonaktif" },
];

/** The status chip is the only place that decides active vs. not. */
const ACTIVE_PILL = {
  variant: "available",
  icon: "check_circle",
};

const INACTIVE_PILL = {
  variant: "danger",
  icon: "cancel",
};

const statusPill = (status) =>
  (status || "active") === "active" ? ACTIVE_PILL : INACTIVE_PILL;

export default function AdminDriverProfiles() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const driversData = [];
      querySnapshot.forEach((doc) => {
        driversData.push({ id: doc.id, ...doc.data() });
      });
      driversData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setDrivers(driversData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pemesanan"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersData);
    });
    return () => unsubscribe();
  }, [user]);

  const getDriverStats = (driverId) => {
    const driverOrders = orders.filter((o) => o.driverId === driverId);
    const totalOrders = driverOrders.length;
    const completedOrders = driverOrders.filter((o) =>
      ["selesai", "lunas", "cash_submitted"].includes(o.status)
    );
    const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.perkiraanHarga || 0), 0);
    return { totalOrders, totalEarnings };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === "all") return true;
    return driver.status === filter;
  });

  const handleStatusChange = async (driverId, newStatus) => {
    try {
      await updateDoc(doc(db, "users", driverId), {
        status: newStatus,
        updatedAt: new Date()
      });
      toast.success("Status mitra diperbarui.", "Berhasil");
    } catch (error) {
      console.error("Error updating driver status:", error);
      toast.error("Status mitra gagal diperbarui. Silakan coba lagi.", "Gagal");
    }
  };

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Mitra Pengemudi"
          title="Database Profil Driver"
          subtitle="Monitor kinerja, status aktif, dan data fundamental mitra pengemudi."
          actions={
            <div
              className="flex gap-1 rounded-full border border-c57-surface-variant bg-c57-surface-container-lowest p-1 shadow-c57-card"
              role="group"
              aria-label="Filter status mitra"
            >
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className={[
                      "rounded-full px-space-md py-2.5 font-label-sm uppercase tracking-widest",
                      "transition-colors duration-300 ease-editorial",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-c57-primary",
                      active
                        ? "bg-c57-primary-container text-c57-on-primary shadow-c57-card"
                        : "text-c57-on-surface-variant hover:text-c57-on-surface",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          }
        />

        {/* Dynamic Cards Grid */}
        <div className="mt-space-xl grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.length === 0 ? (
            <EmptyState
              icon="person"
              title="Belum ada mitra pengemudi"
              description="Belum ada mitra pengemudi yang terdaftar di ekosistem Cakra Lima Tujuh."
              className="col-span-full py-space-xl"
            />
          ) : (
            filteredDrivers.map((driver) => {
              const pill = statusPill(driver.status);
              return (
                <Card key={driver.id} interactive className="group flex flex-col overflow-hidden">
                  <div className="p-space-lg">
                    <div className="mb-space-lg flex items-start justify-between gap-space-md">
                      <span className="flex h-16 w-16 items-center justify-center rounded-c57-md border border-c57-surface-variant bg-c57-surface-container text-c57-outline transition-transform duration-500 ease-editorial group-hover:scale-110">
                        <Icon name="person" size="3xl" />
                      </span>
                      <Pill variant={pill.variant} icon={pill.icon}>
                        {driver.status || "active"}
                      </Pill>
                    </div>

                    <h3 className="font-headline-sm text-headline-sm text-c57-on-surface transition-colors duration-300 group-hover:text-c57-primary mb-1">
                      {driver.displayName || driver.name || driver.nama || "Anonymous Driver"}
                    </h3>
                    <p className="mb-space-lg text-body-sm text-c57-on-surface-variant">{driver.email}</p>

                    <dl className="mb-space-lg space-y-space-md">
                      <div className="flex items-center gap-space-sm text-body-md text-c57-on-surface">
                        <Icon name="phone" size="sm" className="text-c57-outline" />
                        <dd>{driver.phone || driver.noTelepon || "-"}</dd>
                      </div>
                      <div className="flex items-start gap-space-sm text-body-sm text-c57-on-surface-variant">
                        <Icon name="location_on" size="sm" className="shrink-0 text-c57-outline" />
                        <dd className="line-clamp-2 italic">
                          {driver.address || "Alamat belum diverifikasi"}
                        </dd>
                      </div>
                    </dl>

                    <div className="grid grid-cols-2 gap-space-md border-t border-c57-surface-variant pt-space-md">
                      <div>
                        <dt className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-1">
                          Total Order
                        </dt>
                        <dd className="flex items-baseline gap-1.5 font-headline-sm text-headline-sm text-c57-on-surface tabular-nums">
                          {getDriverStats(driver.id).totalOrders}
                          <span className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                            Poin
                          </span>
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant mb-1">
                          Rating
                        </dt>
                        <dd className="flex items-baseline justify-end gap-1 font-headline-sm text-headline-sm text-c57-on-surface tabular-nums">
                          <Icon name="star" size="sm" filled className="text-c57-tertiary" />
                          {driver.rating || 0}
                        </dd>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-space-md border-t border-c57-surface-variant bg-c57-surface-container px-space-lg py-space-md">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="arrow_forward"
                      iconPosition="right"
                      onClick={() => setSelectedDriver(driver)}
                      className="!px-0"
                    >
                      Lihat Detail Mitra
                    </Button>

                    <div className="w-36">
                      <Select
                        label={`Status ${driver.displayName || driver.name || driver.nama || "mitra"}`}
                        value={driver.status || "active"}
                        onChange={(e) => handleStatusChange(driver.id, e.target.value)}
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                      </Select>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Modal
        open={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        size="lg"
        title="Profil Lengkap Mitra"
        subtitle={
          selectedDriver
            ? `ID Log: ${selectedDriver.id.substring(0, 12).toUpperCase()}`
            : undefined
        }
      >
        {selectedDriver && (
          <div className="grid grid-cols-1 gap-space-xl md:grid-cols-2">
            <div className="space-y-space-lg">
              <section>
                <h4 className="border-b border-c57-surface-variant pb-2 font-label-md uppercase tracking-widest text-c57-on-surface-variant">
                  Informasi Autentikasi
                </h4>
                <dl className="mt-space-md space-y-space-sm">
                  <ProfileRow
                    label="Nama Terdaftar"
                    value={
                      selectedDriver.displayName
                      || selectedDriver.name
                      || selectedDriver.nama
                    }
                  />
                  <ProfileRow label="Email Sistem" value={selectedDriver.email} />
                  <ProfileRow
                    label="Telepon / WA"
                    value={selectedDriver.phone || selectedDriver.noTelepon || "-"}
                  />
                  <ProfileRow
                    label="Bergabung Pada"
                    value={formatDate(selectedDriver.createdAt)}
                  />
                </dl>
              </section>

              <div className="rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                <h4 className="mb-2 flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                  <Icon name="location_on" size="xs" />
                  Alamat Tinggal
                </h4>
                <p className="text-body-md text-c57-on-surface italic">
                  &ldquo;{selectedDriver.address || "Informasi alamat belum diinput atau diverifikasi oleh mitra."}&rdquo;
                </p>
              </div>
            </div>

            <div className="space-y-space-lg">
              <section>
                <h4 className="border-b border-c57-surface-variant pb-2 font-label-md uppercase tracking-widest text-c57-on-surface-variant">
                  Dashboard Performa
                </h4>

                <div className="mt-space-md grid grid-cols-2 gap-space-md">
                  <div className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-low p-space-md text-center">
                    <p className="mb-2 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                      Total Order
                    </p>
                    <p className="font-headline-md text-headline-md text-c57-on-surface tabular-nums">
                      {getDriverStats(selectedDriver.id).totalOrders}
                    </p>
                  </div>

                  <div className="rounded-c57-lg border border-c57-surface-variant bg-c57-surface-container-low p-space-md text-center">
                    <p className="mb-2 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                      Rating
                    </p>
                    <p className="flex items-center justify-center gap-1 font-headline-md text-headline-md text-c57-tertiary tabular-nums">
                      <Icon name="star" size="sm" filled />
                      {selectedDriver.rating || 0}
                    </p>
                  </div>

                  <div className="group relative col-span-2 overflow-hidden rounded-c57-lg border border-c57-available-bg bg-c57-available-bg p-space-lg text-center">
                    <div className="relative z-10">
                      <p className="mb-2 font-label-sm uppercase tracking-widest text-c57-available-text">
                        Total Pendapatan
                      </p>
                      <p className="font-headline-md text-headline-md text-c57-available-text tabular-nums">
                        Rp {getDriverStats(selectedDriver.id).totalEarnings.toLocaleString()}
                      </p>
                    </div>
                    <Icon
                      name="payments"
                      size={80}
                      className="pointer-events-none absolute -bottom-6 -right-4 text-c57-available-text/20 transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>
              </section>

              {selectedDriver.notes && (
                <div className="rounded-c57-lg border border-c57-error-container p-space-md">
                  <p className="mb-1 font-label-sm uppercase tracking-widest text-c57-on-error-container italic">
                    Internal Admin Notes
                  </p>
                  <p className="text-body-md text-c57-on-surface italic leading-relaxed">
                    &ldquo;{selectedDriver.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** One label/value pair in the profile dialog. */
function ProfileRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-space-md border-b border-c57-surface-variant py-1">
      <dt className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">{label}</dt>
      <dd className="text-body-md text-c57-on-surface text-right">{value}</dd>
    </div>
  );
}
