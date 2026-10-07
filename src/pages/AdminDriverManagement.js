import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";

import { db, auth } from "../services/firebase";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import SectionHeading from "../components/ui/SectionHeading";
import StatCard from "../components/ui/StatCard";

/**
 * Driver-operations hub: three module links plus a same-day status roll-up.
 *
 * The three Firestore subscriptions are unchanged — `vehicleVerifications`
 * and approved `paymentVerifications` are both filtered to today, drivers are
 * filtered to `status !== "inactive"`. What the redesign replaced is only the
 * chrome: the per-module blue/emerald/red tinting, which was the last
 * multi-palette holdout, is gone in favour of one accent well per tile.
 */

const MODULES = [
  {
    id: "vehicle-verifications",
    title: "Verifikasi Unit",
    description: "Pantau kondisi armada sebelum & sesudah operasional.",
    icon: "camera_alt",
    path: "/admin-vehicle-verifications",
  },
  {
    id: "payment-verifications",
    title: "Log Transaksi Cash",
    description: "Validasi setoran tunai dari mitra pengemudi.",
    icon: "credit_card",
    path: "/admin-payment-verifications",
  },
  {
    id: "driver-profiles",
    title: "Database Mitra",
    description: "Kelola biodata dan status aktifitas pengemudi.",
    icon: "person",
    path: "/admin-driver-profiles",
  },
];

export default function AdminDriverManagement() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    vehicleCount: 0,
    cashCount: 0,
    driverCount: 0,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Vehicle Verifications Today
    const qVehicles = query(collection(db, "vehicleVerifications"));
    const unsubVehicles = onSnapshot(qVehicles, (snapshot) => {
      const today = new Date().toDateString();
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (date.toDateString() === today) {
          count++;
        }
      });
      setStats((prev) => ({ ...prev, vehicleCount: count }));
    });

    // 2. Cash Transactions (Payment Verifications) Approved Today
    const qPayments = query(collection(db, "paymentVerifications"), where("status", "==", "approved"));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const today = new Date().toDateString();
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (date.toDateString() === today) {
          count++;
        }
      });
      setStats((prev) => ({ ...prev, cashCount: count }));
    });

    // 3. Active Drivers (Mitra Bertugas)
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
    const unsubDrivers = onSnapshot(qDrivers, (snapshot) => {
      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'inactive') {
          count++;
        }
      });
      setStats((prev) => ({ ...prev, driverCount: count }));
    });

    return () => {
      unsubVehicles();
      unsubPayments();
      unsubDrivers();
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Driver Operations"
          title="Manajemen Driver"
          subtitle="Pusat kendali operasional mitra pengemudi Cakra Lima Tujuh."
          actions={
            <Button as={Link} to="/admin-add-driver" icon="add" size="md">
              Tambah Mitra Baru
            </Button>
          }
        />

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-space-xl">
          {MODULES.map((item) => (
            <ModuleCard key={item.id} module={item} />
          ))}
        </div>

        {/* Summary */}
        <Card variant="inset" className="relative overflow-hidden mt-space-xl p-space-lg sm:p-space-xl">
          <SectionHeading
            eyebrow="Ringkasan"
            title="Status Operasional Hari Ini"
            className="mb-space-lg"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg relative z-10">
            <StatCard
              label="Verifikasi Mobil"
              value={stats.vehicleCount}
              unit="Pemeriksaan"
              icon="camera_alt"
            />
            <StatCard
              label="Transaksi Cash"
              value={stats.cashCount}
              unit="Disetujui"
              icon="credit_card"
            />
            <StatCard
              label="Mitra Bertugas"
              value={stats.driverCount}
              unit="Pengemudi"
              icon="person"
            />
          </div>

          <div
            className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-c57-primary/5 pointer-events-none"
            aria-hidden="true"
          />
        </Card>
      </div>
    </div>
  );
}

function ModuleCard({ module }) {
  return (
    <Link to={module.path} className="group block">
      <Card
        interactive
        className="relative overflow-hidden flex flex-col items-start h-full p-space-lg sm:p-space-xl"
      >
        <span className="relative z-10 w-14 h-14 rounded-c57-md bg-c57-primary-container text-c57-on-primary flex items-center justify-center mb-space-lg transition-transform duration-500 ease-editorial group-hover:scale-110">
          <Icon name={module.icon} size="2xl" />
        </span>

        <h3 className="relative z-10 font-headline-sm text-headline-sm text-c57-on-surface group-hover:text-c57-primary transition-colors duration-300 mb-space-sm">
          {module.title}
        </h3>

        <p className="relative z-10 text-body-sm text-c57-on-surface-variant leading-relaxed mb-space-xl">
          {module.description}
        </p>

        <span className="relative z-10 mt-auto inline-flex items-center gap-space-sm font-label-sm text-label-sm uppercase tracking-widest text-c57-primary transition-all duration-300 group-hover:gap-space-md">
          Akses Modul
          <Icon name="arrow_forward" size="sm" />
        </span>

        <div
          className="absolute -right-10 -bottom-10 w-28 h-28 rounded-full bg-c57-surface-container-low group-hover:scale-150 transition-transform duration-700 ease-editorial pointer-events-none"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}
