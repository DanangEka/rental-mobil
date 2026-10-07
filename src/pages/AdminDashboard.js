import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, getDoc } from "firebase/firestore";

import { db } from "../services/firebase";
import { resolveTokens, rgba, toHex } from "../utils/tokens";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Card from "../components/ui/Card";
import Icon from "../components/ui/Icon";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Admin overview: fleet counts, revenue tiles, and the 7-day / 6-month
 * revenue charts.
 *
 * Firestore contracts are untouched — `mobil` bucketed by status, `users`
 * counted wholesale, and `pemesanan` summed across the same six
 * revenue-generating statuses with the same
 * `actualPaymentAmount > perkiraanHarga > dpAmount` precedence.
 *
 * Chart.js draws to a canvas, so its palette cannot read `var(--c57-*)`. It
 * resolves the live custom properties through `utils/tokens` instead of
 * carrying its own copy of the colours, which is what it used to do — that
 * copy was still on the pre-redesign #810100.
 */

const FLEET_TILES = [
  { label: "Mobil Tersedia", key: "availableCars", icon: "directions_car" },
  { label: "Mobil Disewa", key: "rentedCars", icon: "directions_car" },
  { label: "Mobil Diservis", key: "serviceCars", icon: "car_repair" },
  { label: "Total Pelanggan", key: "totalCustomers", icon: "group" },
];

const CHART_TOKENS = [
  "--c57-primary",
  "--c57-primary-container",
  "--c57-on-surface",
  "--c57-on-surface-variant",
  "--c57-outline",
  "--c57-surface-container-lowest",
  "--c57-surface-variant",
  "--c57-surface-container-low",
];

/** Chart.js wants static colour strings, so the dataset recipes are built once
 *  from the resolved tokens rather than carrying literal hex. */
const makeRevenueData = (t) => {
  const primary = toHex(t["--c57-primary"]);
  const container = toHex(t["--c57-primary-container"]);

  return {
    daily: {
      labels: [],
      datasets: [
        {
          label: "Pendapatan Harian",
          data: [],
          backgroundColor: rgba(t["--c57-primary-container"], 0.7),
          borderColor: primary,
          borderWidth: 0,
          borderRadius: 6,
          hoverBackgroundColor: container,
          barThickness: 20,
        },
      ],
    },
    monthly: {
      labels: [],
      datasets: [
        {
          label: "Pendapatan Bulanan",
          data: [],
          borderColor: primary,
          backgroundColor: rgba(t["--c57-primary-container"], 0.05),
          fill: true,
          tension: 0.4,
          pointBackgroundColor: toHex(t["--c57-surface-container-lowest"]),
          pointBorderColor: primary,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
        },
      ],
    },
  };
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    availableCars: 0,
    rentedCars: 0,
    serviceCars: 0,
    totalCars: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
  });

  const [revenueData, setRevenueData] = useState(() => makeRevenueData(resolveTokens(CHART_TOKENS)));

  const [loading, setLoading] = useState(true);

  // Initialize company profile data
  useEffect(() => {
    const initializeCompanyProfile = async () => {
      try {
        const companyDocRef = doc(db, "company_profile", "main");
        const companyDoc = await getDoc(companyDocRef);

        if (!companyDoc.exists()) {
          await setDoc(companyDocRef, {
            nama: "Cakra Lima Tujuh",
            alamat: "Lembah Harapan, Blok AA-57, Lidah Wetan Kec. Lakarsantri, Surabaya",
            email: "limatujuhcakra@gmail.com",
            telepon: "+62 812-3456-7890",
            whatsapp: "6287859660053",
            instagram: "cakralimatujuhtrans",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log("Company profile initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing company profile:", error);
      }
    };

    initializeCompanyProfile();
  }, []);

  useEffect(() => {
    const unsubscribeCars = onSnapshot(collection(db, "mobil"), (carsSnapshot) => {
      let available = 0;
      let rented = 0;
      let servis = 0;

      carsSnapshot.forEach((car) => {
        const data = car.data();
        if (data.status === "normal") {
          available++;
        } else if (data.status === "disewa") {
          rented++;
        } else if (data.status === "servis") {
          servis++;
        }
      });

      setStats((prev) => ({
        ...prev,
        availableCars: available,
        rentedCars: rented,
        serviceCars: servis,
        totalCars: carsSnapshot.size,
      }));
    });

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (usersSnapshot) => {
      setStats((prev) => ({ ...prev, totalCustomers: usersSnapshot.size }));
    });

    // Real-time revenue listener - includes all revenue-generating statuses
    const revenueStatuses = ["selesai", "lunas", "cash_submitted", "pembayaran berhasil", "approve sewa", "disetujui"];

    const unsubscribeOrders = onSnapshot(collection(db, "pemesanan"), (ordersSnapshot) => {
      try {
        let todayRevenue = 0;
        let monthlyRevenue = 0;
        const dailyRevenue = {};
        const monthlyRevenueData = {};

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        ordersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // Include all orders that have generated any revenue
          if (!revenueStatuses.includes(data.status)) return;

          // Determine the actual revenue amount
          // Priority: actualPaymentAmount > perkiraanHarga > dpAmount
          const revenueAmount = data.actualPaymentAmount || data.perkiraanHarga || data.dpAmount || 0;
          if (revenueAmount <= 0) return;

          // Parse order date
          let orderDate;
          if (data.tanggalMulai) {
            if (data.tanggalMulai.toDate) {
              orderDate = data.tanggalMulai.toDate();
            } else if (data.tanggalMulai instanceof Date) {
              orderDate = data.tanggalMulai;
            } else {
              orderDate = new Date(data.tanggalMulai);
            }
          }
          if (!orderDate || isNaN(orderDate.getTime())) {
            // Fallback to tanggal (order creation date)
            if (data.tanggal) {
              if (data.tanggal.toDate) {
                orderDate = data.tanggal.toDate();
              } else if (data.tanggal instanceof Date) {
                orderDate = data.tanggal;
              } else {
                orderDate = new Date(data.tanggal);
              }
            }
          }

          if (orderDate && !isNaN(orderDate.getTime())) {
            const dayKey = orderDate.toDateString();
            dailyRevenue[dayKey] = (dailyRevenue[dayKey] || 0) + revenueAmount;

            const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
            monthlyRevenueData[monthKey] = (monthlyRevenueData[monthKey] || 0) + revenueAmount;

            if (orderDate.toDateString() === today.toDateString()) {
              todayRevenue += revenueAmount;
            }
            if (orderDate >= startOfMonth) {
              monthlyRevenue += revenueAmount;
            }
          }
        });

        const last7Days = [];
        const dailyValues = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayKey = date.toDateString();
          last7Days.push(date.toLocaleDateString("id-ID", { weekday: "short" }));
          dailyValues.push(dailyRevenue[dayKey] || 0);
        }

        const last6Months = [];
        const monthlyValues = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          last6Months.push(date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }));
          monthlyValues.push(monthlyRevenueData[monthKey] || 0);
        }

        setStats((prev) => ({
          ...prev,
          todayRevenue,
          monthlyRevenue,
        }));

        setRevenueData((prev) => ({
          daily: {
            labels: last7Days,
            datasets: [{ ...prev.daily.datasets[0], data: dailyValues }],
          },
          monthly: {
            labels: last6Months,
            datasets: [{ ...prev.monthly.datasets[0], data: monthlyValues }],
          },
        }));

        setLoading(false);
      } catch (error) {
        console.error("Error processing revenue data:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeCars();
      unsubscribeUsers();
      unsubscribeOrders();
    };
  }, []);

  const chartOptions = buildChartOptions(resolveTokens(CHART_TOKENS));

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
        <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
          <div className="animate-pulse space-y-space-xl">
            <div className="h-10 bg-c57-surface-container-high rounded-c57-md w-1/4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-32 bg-c57-surface-container-lowest rounded-c57-lg border border-c57-surface-variant"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Admin Control Panel"
          title="Admin Dashboard"
          subtitle="Ringkasan performa sistem dan armada Cakra Lima Tujuh."
        />

        {/* Fleet counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mt-space-xl">
          {FLEET_TILES.map((tile) => (
            <StatCard
              key={tile.key}
              label={tile.label}
              value={stats[tile.key].toLocaleString()}
              icon={tile.icon}
            />
          ))}
        </div>

        {/* Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mt-gutter">
          <RevenueTile
            label="Pendapatan Hari Ini"
            amount={stats.todayRevenue}
            icon="payments"
          />
          <RevenueTile
            label="Pendapatan Bulan Ini"
            amount={stats.monthlyRevenue}
            icon="trending_up"
            emphasis
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mt-gutter">
          <ChartCard
            title="Analisis Harian"
            eyebrow="7 Hari Terakhir"
            accent
            empty={revenueData.daily.labels.length === 0}
          >
            <Bar data={revenueData.daily} options={chartOptions} />
          </ChartCard>

          <ChartCard
            title="Performa Bulanan"
            eyebrow="6 Bulan Terakhir"
            empty={revenueData.monthly.labels.length === 0}
          >
            <Line data={revenueData.monthly} options={chartOptions} />
          </ChartCard>
        </div>

        {/* Fleet utilisation */}
        <FleetUtilisation
          total={stats.totalCars}
          available={stats.availableCars}
        />
      </div>
    </div>
  );
}

/**
 * Chart options are rebuilt on every render from the resolved tokens. The
 * `use` prefix is deliberately absent: nothing here subscribes or holds
 * state, and a plain call keeps that honest.
 */
function buildChartOptions(t) {
  const {
    "--c57-on-surface": ink,
    "--c57-on-surface-variant": inkMuted,
    "--c57-outline": axis,
    "--c57-surface-container-lowest": surface,
    "--c57-surface-variant": rule,
  } = t;

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: toHex(surface),
        titleColor: toHex(ink),
        bodyColor: toHex(inkMuted),
        borderColor: toHex(rule),
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: 12, weight: "600" },
        bodyFont: { size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: toHex(axis), font: { size: 11, weight: "500" }, padding: 8 },
      },
      y: {
        beginAtZero: true,
        grid: { color: rgba(rule, 0.6), drawBorder: false },
        ticks: {
          color: toHex(axis),
          font: { size: 11, weight: "500" },
          padding: 8,
          callback: (value) =>
            value >= 1000000 ? `${(value / 1000000).toFixed(1)}jt` : value.toLocaleString(),
        },
      },
    },
  };
}

function RevenueTile({ label, amount, icon, emphasis = false }) {
  return (
    <Card
      variant={emphasis ? "scrim" : "flat"}
      className="relative overflow-hidden flex items-center gap-space-lg p-space-lg sm:p-space-xl"
    >
      {emphasis && (
        <span
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none"
          aria-hidden="true"
        />
      )}

      <span
        className={[
          "relative z-10 shrink-0 w-16 h-16 rounded-c57-md flex items-center justify-center",
          emphasis
            ? "bg-white/15 text-c57-on-scrim backdrop-blur-sm"
            : "bg-c57-primary-container text-c57-on-primary",
        ].join(" ")}
      >
        <Icon name={icon} size="3xl" />
      </span>

      <div className="relative z-10 min-w-0">
        <p
          className={[
            "font-label-sm text-label-sm uppercase tracking-widest mb-1",
            emphasis ? "text-c57-primary-fixed-dim" : "text-c57-on-surface-variant",
          ].join(" ")}
        >
          {label}
        </p>
        <p
          className={[
            "flex items-baseline gap-1.5",
            emphasis ? "text-c57-on-scrim" : "text-c57-on-surface",
          ].join(" ")}
        >
          <span className="font-label-md text-label-md uppercase tracking-wider opacity-70">Rp</span>
          <span className="font-headline-lg text-headline-lg tabular-nums">
            {amount.toLocaleString()}
          </span>
        </p>
      </div>
    </Card>
  );
}

function ChartCard({ title, eyebrow, accent = false, empty, children }) {
  return (
    <Card className="p-space-lg sm:p-space-xl">
      <div className="flex justify-between items-center mb-space-lg">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-c57-on-surface">{title}</h3>
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant mt-1">
            {eyebrow}
          </p>
        </div>
        <span
          className={[
            "w-2.5 h-2.5 rounded-full shrink-0",
            accent ? "bg-c57-primary-container" : "bg-c57-surface-container-highest",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>

      <div className="h-64">
        {empty ? (
          <div className="h-full flex items-center justify-center font-label-sm text-label-sm uppercase tracking-widest text-c57-outline">
            Memuat Data...
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

function FleetUtilisation({ total, available }) {
  // total is 0 before the first `mobil` snapshot lands, and an unguarded
  // division here produced a `NaN%` bar width on an empty fleet.
  const utilisation = total > 0 ? Math.round(((total - available) / total) * 100) : 0;

  return (
    <Card className="mt-gutter p-space-lg sm:p-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg">
      <div className="flex items-center gap-space-lg">
        <span className="shrink-0 w-14 h-14 rounded-c57-md bg-c57-surface-container border border-c57-surface-variant flex items-center justify-center text-c57-on-surface-variant">
          <Icon name="directions_car" size="2xl" />
        </span>
        <div>
          <h4 className="font-headline-sm text-headline-sm text-c57-on-surface">
            Total Armada Terdaftar
          </h4>
          <p className="text-body-sm text-c57-on-surface-variant mt-1">
            Total unit kendaraan dalam sistem manajemen saat ini.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-space-lg w-full md:w-auto">
        <div className="flex-1 md:w-48">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-c57-on-surface-variant">
              Utilisasi Armada
            </span>
            <span className="font-label-lg text-label-lg text-c57-on-surface tabular-nums">
              {utilisation}%
            </span>
          </div>
          <div className="h-2 bg-c57-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-c57-primary-container transition-all duration-1000 ease-editorial"
              style={{ width: `${utilisation}%` }}
            />
          </div>
        </div>
        <div className="font-headline-lg text-headline-lg text-c57-on-surface tabular-nums">
          {total}
        </div>
      </div>
    </Card>
  );
}
