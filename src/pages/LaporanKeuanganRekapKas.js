import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import { db } from "../services/firebase";
import { resolveTokens, rgba, toHex } from "../utils/tokens";
import { useToast } from "../components/Toast";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import Pill from "../components/ui/Pill";
import Table, { TableRow, TableCell } from "../components/ui/Table";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/*
 * Laporan Keuangan & Rekap Kas — the admin bookkeeping surface.
 *
 * The revenue basis is the exact contract the dashboard already uses:
 * the six revenue-generating `pemesanan` statuses, summed with the
 * `actualPaymentAmount > perkiraanHarga > dpAmount` precedence. Driver
 * setoran come from `paymentVerifications`. There is no separate expense
 * ledger in Firestore, so the operator-cost line is derived from the fleet's
 * recorded `driver_fee_per_day` where a with-driver booking resolves to its
 * `mobil`; orders that do not resolve fall back to DRIVER_FEE_RATIO of the
 * bundled fare. That makes Laba Bersih a live, honest estimate rather than a
 * hardcoded margin.
 */

const DRIVER_FEE_RATIO = 0.4;
const PAGE_SIZE = 8;

const REVENUE_STATUSES = [
  "selesai",
  "lunas",
  "cash_submitted",
  "pembayaran berhasil",
  "approve sewa",
  "disetujui",
];

const PERIODS = [
  { value: "this-month", label: "Bulan Ini" },
  { value: "last-month", label: "Bulan Lalu" },
  { value: "quarter", label: "3 Bulan Terakhir" },
  { value: "year", label: "Tahun Berjalan" },
  { value: "all", label: "Semua Waktu" },
];

const LEDGER_TABS = [
  { id: "all", label: "Semua Mutasi" },
  { id: "rental", label: "Penerimaan Sewa Mobil" },
  { id: "driver-cash", label: "Setoran Kas Driver (Cash)" },
  { id: "operational", label: "Biaya Ops & Fee Driver" },
  { id: "cashier", label: "Rekap Harian Kasir" },
];

const STATUS_GROUPS = [
  { value: "all", label: "Semua Status" },
  { value: "Lunas", label: "Lunas (Cleared)" },
  { value: "Terverifikasi", label: "Terverifikasi" },
  { value: "Pending Kasir", label: "Menunggu Validasi" },
  { value: "Ditolak", label: "Ditolak" },
];

const STATUS_PILL = {
  Lunas: { variant: "available", icon: "check_circle" },
  Terverifikasi: { variant: "neutral", icon: "verified" },
  "Pending Kasir": { variant: "sand", icon: "hourglass_top" },
  Ditolak: { variant: "danger", icon: "cancel" },
};

const CHART_TOKENS = [
  "--c57-primary",
  "--c57-primary-container",
  "--c57-on-surface",
  "--c57-on-surface-variant",
  "--c57-outline",
  "--c57-surface-variant",
  "--c57-surface-container-lowest",
  "--c57-surface-container-low",
];

const toJSDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value);
};

const revenueOf = (order) =>
  order.actualPaymentAmount || order.perkiraanHarga || order.dpAmount || 0;

const categoryOf = (order) => {
  if (order.tipe === "opentrip" || order.openTripId) return "Open Trip & Charter";
  if (order.rentalType === "Dengan Driver") return "Sewa Mobil + Driver";
  if (order.rentalType === "Lepas Kunci") return "Rental Mobil Lepas Kunci";
  if (/wisata|tour|paket/i.test(order.namaMobil || "")) return "Paket Wisata";
  return "Lainnya";
};

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(amount || 0);

const rupiah = (amount) => `Rp ${formatRupiah(amount)}`;

const formatClock = (date) =>
  date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

/**
 * A period's [start, end). `end` is exclusive so ranges compose cleanly.
 */
const periodRange = (period) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  switch (period) {
    case "this-month":
      return [startOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 1)];
    case "last-month":
      return [
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        startOfMonth,
      ];
    case "quarter":
      return [new Date(now.getFullYear(), now.getMonth() - 2, 1), now];
    case "year":
      return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear() + 1, 0, 1)];
    default:
      return [new Date(0), new Date(8640000000000000)];
  }
};

/**
 * Smallest ISO prefix used to derive a report reference from a doc id, so the
 * ledger shows the same `#INV-xxxx` style regardless of the source collection.
 */
const refFrom = (id, prefix) =>
  `${prefix}-${(id || "").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase() || "N/A"}`;

export default function LaporanKeuanganRekapKas() {
  const navigate = useNavigate();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [mobilMap, setMobilMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("this-month");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [validating, setValidating] = useState(false);

  /* ── Live subscriptions ────────────────────────────────────────────────── */
  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, "pemesanan"), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubVerifications = onSnapshot(
      collection(db, "paymentVerifications"),
      (snap) => {
        setVerifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.forEach((d) => {
        map[d.id] = d.data();
      });
      setUsersMap(map);
    });
    const unsubMobil = onSnapshot(collection(db, "mobil"), (snap) => {
      const map = {};
      snap.forEach((d) => {
        map[d.id] = d.data();
      });
      setMobilMap(map);
    });
    return () => {
      unsubOrders();
      unsubVerifications();
      unsubUsers();
      unsubMobil();
    };
  }, []);

  useEffect(() => {
    if (orders.length || verifications.length) setLoading(false);
  }, [orders, verifications]);

  /* ── Derived: period window + a same-length window before it ───────────── */
  const { start, end, prevStart, prevEnd } = useMemo(() => {
    const [s, e] = periodRange(period);
    const len = e.getTime() - s.getTime() || 0;
    return { start: s, end: e, prevStart: new Date(s.getTime() - len), prevEnd: s };
  }, [period]);

  const inWindow = (date, from, to) =>
    date && date >= from && date < to;

  /**
   * Estimated operator cost for a with-driver booking: the fleet's recorded
   * daily driver fee when the order resolves to its `mobil`, else a ratio of
   * the bundled fare. There is no standalone expense ledger in Firestore, so
   * this stands in for the "Biaya Ops & Fee Driver" line of the report.
   */
  const expenseOf = (order) => {
    if (order.rentalType !== "Dengan Driver" && !order.driverId) return 0;
    const mobil = mobilMap[order.mobilId];
    const feePerDay = Number(mobil?.driver_fee_per_day) || 0;
    const days = order.durasiHari || 1;
    if (feePerDay > 0) return feePerDay * days;
    return Math.round(revenueOf(order) * DRIVER_FEE_RATIO);
  };

  /**
   * The single source of truth for figures. `orders`, `verifications`,
   * `usersMap` and `mobilMap` are all live snapshots, so every derived value
   * below recomputes when any of them change.
   */
  const aggregates = useMemo(() => {
    let grossRevenue = 0;
    let opsExpense = 0;
    let incomeCount = 0;
    let approvedCashIn = 0;
    let pendingCashIn = 0;
    let pendingCount = 0;

    const prevGross = { value: 0 };
    const prevExpense = { value: 0 };

    orders.forEach((order) => {
      const amount = revenueOf(order);
      if (!REVENUE_STATUSES.includes(order.status) || amount <= 0) return;
      const date = toJSDate(order.tanggalMulai) || toJSDate(order.tanggal);
      if (!date) return;

      const expense = expenseOf(order);
      const cur = inWindow(date, start, end);
      const prev = inWindow(date, prevStart, prevEnd);

      if (cur) {
        grossRevenue += amount;
        incomeCount += 1;
        opsExpense += expense;
      }
      if (prev) prevGross.value += amount;
      if (prev) prevExpense.value += expense;
    });

    verifications.forEach((v) => {
      const date = toJSDate(v.timestamp);
      if (!date) return;
      const amount = Number(v.amount) || 0;
      const cur = inWindow(date, start, end);
      const prev = inWindow(date, prevStart, prevEnd);
      if (!cur) return;

      if (v.status === "approved") approvedCashIn += amount;
      if (v.status === "pending") {
        pendingCashIn += amount;
        pendingCount += 1;
      }
      if (prev) prevGross.value += amount;
    });

    const netProfit = grossRevenue - opsExpense;
    const margin =
      grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 1000) / 10 : 0;

    return {
      grossRevenue,
      opsExpense,
      incomeCount,
      netProfit,
      margin,
      approvedCashIn,
      pendingCashIn,
      pendingCount,
      expenseRatio:
        grossRevenue > 0 ? Math.round((opsExpense / grossRevenue) * 1000) / 10 : 0,
      grossTrend:
        prevGross.value > 0
          ? Math.round(((grossRevenue - prevGross.value) / prevGross.value) * 1000) / 10
          : null,
      expenseTrend:
        prevExpense.value > 0
          ? Math.round(((opsExpense - prevExpense.value) / prevExpense.value) * 1000) / 10
          : null,
    };
  }, [orders, verifications, start, end, prevStart, prevEnd, mobilMap]);

  /* ── Ledger rows ───────────────────────────────────────────────────────── */
  const ledgerRows = useMemo(() => {
    const rows = [];

    orders.forEach((order) => {
      const amount = revenueOf(order);
      if (!REVENUE_STATUSES.includes(order.status) || amount <= 0) return;
      const date = toJSDate(order.tanggalMulai) || toJSDate(order.tanggal);
      if (!date || !inWindow(date, start, end)) return;

      const client =
        order.namaClient || usersMap[order.uid]?.nama || order.email || "-";
      const subLine = [client, order.platNomor].filter(Boolean).join(" • ");

      rows.push({
        id: `inc-${order.id}`,
        kind: "rental",
        date,
        noRef: order.invoiceNo || order.orderNumber || refFrom(order.id, "INV"),
        uraian: order.uraian || `${order.namaMobil || "Unit Armada"}${order.durasiHari ? ` (${order.durasiHari} Hari)` : ""}`,
        sub: subLine,
        kategori: categoryOf(order),
        metode: order.paymentMethod || "Transfer",
        amount: amount,
        statusLabel: statusLabelOf(order.status),
        order,
      });

      const expense = expenseOf(order);
      if (expense > 0) {
        rows.push({
          id: `exp-${order.id}`,
          kind: "expense",
          date,
          noRef: refFrom(order.id, "EXP"),
          uraian: `Beban Fee Mitra — ${order.namaMobil || "Unit Armada"}`,
          sub: `${client}${order.rentalType ? ` • ${order.rentalType}` : ""}`,
          kategori: "Fee Mitra Driver",
          metode: "Allokasi Internal",
          amount: -expense,
          statusLabel: "Terverifikasi",
          order,
        });
      }
    });

    verifications.forEach((v) => {
      const date = toJSDate(v.timestamp);
      if (!date || !inWindow(date, start, end)) return;
      const amount = Number(v.amount) || 0;
      if (amount <= 0) return;

      const driver =
        usersMap[v.driverId]?.nama || v.driverName || `Driver ${v.driverId}`;

      rows.push({
        id: `set-${v.id}`,
        kind: "setoran",
        date,
        noRef: refFrom(v.id, "STR"),
        uraian: "Setoran Tunai Kas Driver",
        sub: `${driver} • ${v.orderId ? "#" + v.orderId.slice(-6).toUpperCase() : "Laporan Kasir"}`,
        kategori: "Kas Masuk Driver",
        metode: v.method || v.paymentMethod || "Tunai (Cash)",
        amount: amount,
        statusLabel:
          v.status === "approved"
            ? "Lunas"
            : v.status === "rejected"
              ? "Ditolak"
              : "Pending Kasir",
        order: null,
      });
    });

    return rows.sort((a, b) => b.date - a.date);
  }, [orders, verifications, usersMap, mobilMap, start, end]);

  /* ── Cashier recap rows grouped per day ────────────────────────────────── */
  const cashierRows = useMemo(() => {
    const byDay = {};
    ledgerRows
      .filter((r) => r.kind !== "expense")
      .forEach((r) => {
        const key = r.date.toDateString();
        if (!byDay[key]) byDay[key] = { sum: 0, count: 0 };
        byDay[key].sum += r.amount;
        byDay[key].count += 1;
      });
    return Object.keys(byDay)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((key) => {
        const date = new Date(key);
        return {
          id: `rek-${key}`,
          kind: "cashier",
          date,
          noRef: refFrom(key.replace(/ /g, "-"), "REK"),
          uraian: `Rekap Harian Kasir — ${byDay[key].count} transaksi`,
          sub: `Penerimaan tunai & setoran driver`,
          kategori: "Kas Masuk Harian",
          metode: "—",
          amount: byDay[key].sum,
          statusLabel: "Terverifikasi",
          order: null,
        };
      });
  }, [ledgerRows]);

  /* ── Active rows per tab + filters ─────────────────────────────────────── */
  const baseRows = useMemo(() => {
    if (activeTab === "all") return ledgerRows;
    if (activeTab === "rental")
      return ledgerRows.filter((r) => r.kind === "rental");
    if (activeTab === "driver-cash")
      return ledgerRows.filter((r) => r.kind === "setoran");
    if (activeTab === "operational")
      return ledgerRows.filter((r) => r.kind === "expense");
    return cashierRows;
  }, [activeTab, ledgerRows, cashierRows]);

  const methodOptions = useMemo(() => {
    const set = new Set(baseRows.map((r) => r.metode).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [baseRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const effectiveMethod = methodOptions.includes(methodFilter)
      ? methodFilter
      : "all";
    return baseRows.filter((r) => {
      const matchStatus =
        statusFilter === "all" || r.statusLabel === statusFilter;
      const matchMethod =
        effectiveMethod === "all" || r.metode === effectiveMethod;
      const haystack = [
        r.noRef,
        r.uraian,
        r.sub,
        r.kategori,
        r.metode,
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch = term === "" || haystack.includes(term);
      return matchStatus && matchMethod && matchSearch;
    });
  }, [baseRows, search, statusFilter, methodFilter, methodOptions]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const tabCounts = useMemo(() => {
    return {
      all: ledgerRows.length,
      rental: ledgerRows.filter((r) => r.kind === "rental").length,
      "driver-cash": ledgerRows.filter((r) => r.kind === "setoran").length,
      operational: ledgerRows.filter((r) => r.kind === "expense").length,
      cashier: cashierRows.length,
    };
  }, [ledgerRows, cashierRows]);

  const pendingInLedger = useMemo(
    () => ledgerRows.filter((r) => r.statusLabel === "Pending Kasir").length,
    [ledgerRows]
  );

  /* ── Analytics: 6-month cashflow + distribution ────────────────────────── */
  const chartData = useMemo(() => {
    const monthKeys = [];
    const labels = [];
    const revenue = [];
    const expense = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${date.getFullYear()}-${date.getMonth()}`);
      labels.push(date.toLocaleDateString("id-ID", { month: "short" }));
      revenue.push(0);
      expense.push(0);
    }
    const index = Object.fromEntries(monthKeys.map((k, i) => [k, i]));
    orders.forEach((order) => {
      const amount = revenueOf(order);
      if (!REVENUE_STATUSES.includes(order.status) || amount <= 0) return;
      const d = toJSDate(order.tanggalMulai) || toJSDate(order.tanggal);
      if (!d) return;
      const idx = index[`${d.getFullYear()}-${d.getMonth()}`];
      if (idx !== undefined) {
        revenue[idx] += amount;
        expense[idx] += expenseOf(order);
      }
    });
    return { labels, revenue, expense };
  }, [orders, mobilMap]);

  const distribution = useMemo(() => {
    const buckets = {
      "Rental Mobil Lepas Kunci": 0,
      "Sewa Mobil + Driver": 0,
      "Paket Wisata": 0,
      "Open Trip & Charter": 0,
    };
    const colors = {
      "Rental Mobil Lepas Kunci": {
        dot: "bg-c57-primary",
        bar: "bg-c57-primary",
      },
      "Sewa Mobil + Driver": {
        dot: "bg-c57-secondary",
        bar: "bg-c57-secondary",
      },
      "Paket Wisata": {
        dot: "bg-c57-tertiary",
        bar: "bg-c57-tertiary",
      },
      "Open Trip & Charter": {
        dot: "bg-c57-outline",
        bar: "bg-c57-outline",
      },
    };
    let total = 0;
    orders.forEach((order) => {
      const amount = revenueOf(order);
      if (!REVENUE_STATUSES.includes(order.status) || amount <= 0) return;
      const d = toJSDate(order.tanggalMulai) || toJSDate(order.tanggal);
      if (!d || !inWindow(d, start, end)) return;
      const label = { "Rental Mobil Lepas Kunci": "Rental Mobil Lepas Kunci", "Sewa Mobil + Driver": "Sewa Mobil + Driver" }[categoryOf(order)]
        || (/wisata|tour|paket/i.test(order.namaMobil || "") ? "Paket Wisata" : (order.tipe === "opentrip" || order.openTripId ? "Open Trip & Charter" : "Lainnya"));
      if (label in buckets) buckets[label] += amount;
      total += amount;
    });
    return Object.keys(buckets)
      .map((label) => ({
        label,
        amount: buckets[label],
        pct: total > 0 ? Math.round((buckets[label] / total) * 100) : 0,
        ...colors[label],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [orders, start, end]);

  const totalArmada = useMemo(() => Object.keys(mobilMap).length, [mobilMap]);
  const rentedArmada = useMemo(
    () =>
      Object.values(mobilMap).filter(
        (m) => m.status === "disewa" || m.tersedia === false
      ).length,
    [mobilMap]
  );
  const utilisasi =
    totalArmada > 0 ? Math.round((rentedArmada / totalArmada) * 100) : 0;

  const avgOrder =
    aggregates.incomeCount > 0
      ? Math.round(aggregates.grossRevenue / aggregates.incomeCount)
      : 0;

  const nowOnShelf = useMemo(() => {
    const today = new Date();
    const todayApproved = verifications
      .filter(
        (v) =>
          v.status === "approved" &&
          toJSDate(v.timestamp)?.toDateString() === today.toDateString()
      )
      .reduce((s, v) => s + (Number(v.amount) || 0), 0);
    return todayApproved;
  }, [verifications]);

  const lastSyncMinutes = useMemo(() => {
    const stamps = [
      ...verifications.map((v) => toJSDate(v.timestamp)),
      ...orders.map((o) => toJSDate(o.tanggalMulai) || toJSDate(o.tanggal)),
    ].filter(Boolean);
    if (stamps.length === 0) return null;
    const newest = Math.max(...stamps.map((d) => d.getTime()));
    return Math.max(0, Math.round((Date.now() - newest) / 60000));
  }, [verifications, orders]);

  const chartTokens = resolveTokens(CHART_TOKENS);
  const chartOptions = buildChartOptions(chartTokens);

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const dataToExport = filteredRows.map((r) => ({
        "Tanggal & Waktu": `${r.date.toLocaleDateString("id-ID")} ${formatClock(r.date)}`,
        "No. Invoice / Ref": r.noRef,
        "Uraian Transaksi": r.uraian + (r.sub ? ` (${r.sub})` : ""),
        Kategori: r.kategori,
        "Metode Bayar": r.metode,
        Nominal: r.amount,
        Status: r.statusLabel,
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Kas");
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Laporan_Keuangan_Rekap_Kas_${dateStr}.xlsx`);
      toast.success("Ekspor Excel berhasil", "File .xlsx telah diunduh.");
    } catch (err) {
      console.error("Gagal ekspor ke Excel:", err);
      toast.error("Ekspor Excel gagal", "Pastikan data tersedia lalu coba lagi.");
    }
  };

  const exportPdf = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const t = resolveTokens(CHART_TOKENS);
      const heading = toHex(t["--c57-on-surface"]);

      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(...t["--c57-on-surface"]);
      doc.text("Laporan Keuangan & Rekap Kas", 15, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...t["--c57-outline"]);
      const periodLabel = PERIODS.find((p) => p.value === period)?.label || "Periode";
      doc.text(
        `Periode: ${periodLabel} — Cakra Lima Tujuh • Pembukuan Kas`,
        15,
        25
      );

      doc.setFontSize(11);
      doc.setTextColor(heading);
      doc.text(`Total Pendapatan Kotor: ${rupiah(aggregates.grossRevenue)}`, 15, 36);
      doc.text(`Biaya Ops & Fee Driver: ${rupiah(aggregates.opsExpense)}`, 15, 42);
      doc.text(`Laba Bersih (Nett): ${rupiah(aggregates.netProfit)}`, 15, 48);

      autoTable(doc, {
        startY: 54,
        head: [
          [
            "Tanggal & Waktu",
            "No. Invoice / Ref",
            "Uraian Transaksi",
            "Kategori",
            "Metode Bayar",
            "Nominal",
            "Status",
          ],
        ],
        body: filteredRows.map((r) => [
          `${r.date.toLocaleDateString("id-ID")} ${formatClock(r.date)}`,
          r.noRef,
          r.uraian + (r.sub ? ` (${r.sub})` : ""),
          r.kategori,
          r.metode,
          rupiah(r.amount),
          r.statusLabel,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: t["--c57-primary-container"], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [250, 242, 238] },
        margin: { left: 15, right: 15 },
      });

      const dateStr = new Date().toISOString().split("T")[0];
      doc.save(`Laporan_Keuangan_Rekap_Kas_${dateStr}.pdf`);
      toast.success("Cetak PDF berhasil", "File .pdf telah diunduh.");
    } catch (err) {
      console.error("Gagal cetak PDF:", err);
      toast.error("Cetak PDF gagal", "File PDF gagal dibuat, coba lagi.");
    }
  };

  const validateAllSetoran = async () => {
    setValidating(true);
    try {
      const pending = verifications.filter(
        (v) => v.status === "pending" && v.id
      );
      await Promise.all(
        pending.map((v) =>
          updateDoc(doc(db, "paymentVerifications", v.id), {
            status: "approved",
          })
        )
      );
      toast.success(
        "Semua setoran kas telah divalidasi",
        `${pending.length} setoran diverifikasi ke pembukuan.`
      );
    } catch (err) {
      console.error("Gagal validasi setoran:", err);
      toast.error("Validasi setoran gagal", err.message);
    } finally {
      setValidating(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setPage(1);
  };

  const selectTab = (id) => {
    setActiveTab(id);
    setPage(1);
  };

  const periodOptionLabel = () => {
    const base = PERIODS.find((p) => p.value === period)?.label || "Periode";
    if (period !== "this-month") return base;
    const now = new Date();
    return `${base} — ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
        <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
          <div className="animate-pulse space-y-space-xl">
            <div className="h-10 bg-c57-surface-container-high rounded-c57-md w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-c57-surface-container-lowest rounded-c57-lg border border-c57-surface-variant"
                />
              ))}
            </div>
            <div className="h-80 bg-c57-surface-container-lowest rounded-c57-lg border border-c57-surface-variant" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        {/* ── Header + action suite ── */}
        <Header
          period={period}
          periodLabel={periodOptionLabel()}
          onPeriodChange={setPeriod}
          onExportExcel={exportExcel}
          onExportPdf={exportPdf}
        />

        {/* ── 4 KPI cards ── */}
        <div className="mt-space-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <KpiCard
            label="Total Pendapatan Kotor"
            value={rupiah(aggregates.grossRevenue)}
            icon="trending_up"
            iconCls="bg-c57-primary-fixed/30 text-c57-primary"
            footer={
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1 font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold ${
                    aggregates.grossTrend === null
                      ? "bg-c57-surface-container text-c57-on-surface-variant"
                      : aggregates.grossTrend >= 0
                        ? "bg-c57-available-bg text-c57-available-text"
                        : "bg-c57-error-container text-c57-on-error-container"
                  }`}
                >
                  <Icon name="north_east" size="xs" />
                  {aggregates.grossTrend === null
                    ? "Belum ada data"
                    : `${aggregates.grossTrend >= 0 ? "+" : ""}${aggregates.grossTrend}%`}
                </span>
                <span className="font-body-sm text-body-sm text-c57-outline">
                  vs periode lalu
                </span>
              </div>
            }
          />
          <KpiCard
            label="Biaya Ops & Fee Driver"
            value={rupiah(aggregates.opsExpense)}
            icon="receipt_long"
            iconCls="bg-c57-secondary-container/40 text-c57-secondary"
            footer={
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-c57-on-secondary-container">
                  Estimasi fee mitra saat ini
                </span>
                <span className="font-label-sm text-label-sm font-semibold text-c57-on-error-container">
                  {aggregates.expenseRatio}% Rasio
                </span>
              </div>
            }
          />
          <KpiCard
            label="Laba Bersih (Nett)"
            value={rupiah(aggregates.netProfit)}
            icon="query_stats"
            iconCls="bg-c57-primary/10 text-c57-primary"
            accentValue
            footer={
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-c57-on-primary-fixed font-bold">
                  Margin Laba: {aggregates.margin}%
                </span>
                <span className="font-label-sm text-label-sm text-c57-primary font-semibold">
                  Target &gt; 55% {aggregates.margin >= 55 ? "✓" : ""}
                </span>
              </div>
            }
          />
          <KpiCard
            label="Kas Fisik & Setoran Driver"
            value={rupiah(aggregates.approvedCashIn)}
            icon="payments"
            iconCls="bg-c57-tertiary-fixed/30 text-c57-tertiary"
            footer={
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-c57-primary-container font-semibold">
                  <span className="w-2 h-2 rounded-full bg-c57-primary animate-pulse" />
                  {aggregates.pendingCount} Setoran Pending
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/admin-payment-verifications")}
                  className="font-label-sm text-label-sm text-c57-primary underline underline-offset-4"
                >
                  Cek Kas
                </button>
              </div>
            }
          />
        </div>

        {/* ── Analytics: cashflow + distribution ── */}
        <div className="mt-gutter grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
          <CashflowCard
            tokens={chartTokens}
            data={chartData}
            options={chartOptions}
            metrics={{
              avgOrder,
              utilisasi,
              expenseTrend: aggregates.expenseTrend,
            }}
          />

          <DistributionCard segments={distribution} />
        </div>

        {/* ── Ledger & bookkeeping ── */}
        <div className="mt-gutter flex flex-col gap-space-md">
          <TabBar
            tabs={LEDGER_TABS}
            counts={tabCounts}
            active={activeTab}
            pendingCount={pendingInLedger}
            onSelect={selectTab}
          />

          <FilterBar
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatus={setStatusFilter}
            methodFilter={methodFilter}
            onMethod={setMethodFilter}
            methodOptions={methodOptions}
            onReset={resetFilters}
          />

          <LedgerTable
            rows={pagedRows}
            subtotal={filteredRows.length}
            page={safePage}
            totalPages={totalPages}
            onPage={setPage}
          />
        </div>

        {/* ── Reconciliation dock ── */}
        <ReconciliationDock
          pettyCash={nowOnShelf}
          pendingAmount={aggregates.pendingCashIn}
          pendingCount={aggregates.pendingCount}
          lastSyncMinutes={lastSyncMinutes}
          validating={validating}
          onValidate={validateAllSetoran}
        />
      </div>
    </div>
  );
}

/* ── Local helpers ──────────────────────────────────────────────────────── */

const statusLabelOf = (status) => {
  if (["selesai", "lunas", "cash_submitted", "pembayaran berhasil"].includes(status))
    return "Lunas";
  return "Terverifikasi";
};

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
      legend: {
        position: "bottom",
        align: "end",
        labels: {
          color: toHex(ink),
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
          font: { size: 11, weight: "500" },
        },
      },
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
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${rupiah(ctx.parsed.y)}`,
        },
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

function Header({ period, periodLabel, onPeriodChange, onExportExcel, onExportPdf }) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
      <div className="flex flex-col gap-1 max-w-2xl">
        <div className="flex items-center gap-space-xs text-c57-primary font-label-md text-label-md tracking-wider uppercase">
          <Icon name="account_balance_wallet" size="md" />
          <span>Sistem Keuangan &amp; Pembukuan Kas</span>
          <span className="text-c57-outline-variant font-normal">/</span>
          <span className="text-c57-on-surface-variant font-normal">
            Tahun Anggaran {(new Date()).getFullYear()}
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md text-c57-on-surface tracking-tight mt-1">
          Laporan Keuangan &amp; Rekap Kas
        </h1>
        <p className="text-body-md text-c57-on-surface-variant mt-1">
          Pantau arus kas masuk, margin operasional rental &amp; tour travel,
          validasi setoran kas driver, serta pembukuan laba bersih Cakra Lima
          Tujuh.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-space-sm pt-2 lg:pt-0">
        <label className="flex items-center gap-2 bg-c57-surface-container-low hover:bg-c57-surface-container px-3.5 py-2 rounded-full cursor-pointer transition-colors shadow-sm">
          <Icon name="calendar_month" size="md" className="text-c57-primary" />
          <span className="sr-only">Periode laporan</span>
          <select
            aria-label="Periode laporan"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="bg-transparent font-label-md text-label-md text-c57-on-surface font-semibold focus:outline-none cursor-pointer"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Icon name="expand_more" size="md" className="text-c57-outline" />
        </label>
        <Button variant="secondary" size="md" icon="table_view" onClick={onExportExcel}>
          Ekspor Excel (.xlsx)
        </Button>
        <Button icon="print" onClick={onExportPdf}>
          Cetak / Unduh PDF
        </Button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, iconCls, footer, accentValue = false }) {
  return (
    <div className="relative overflow-hidden bg-c57-surface-container-lowest p-5 rounded-c57-lg shadow-c57-card flex flex-col justify-between group transition-shadow hover:shadow-c57-card-hover">
      <span
        className={`absolute -right-3 -top-3 w-16 h-16 rounded-full flex items-center justify-center pointer-events-none ${iconCls}`}
        aria-hidden="true"
      >
        <Icon name={icon} size="3xl" className="opacity-40" />
      </span>
      <div className="flex flex-col">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-c57-outline">
          {label}
        </span>
        <span
          className={`font-headline-sm text-headline-sm font-semibold mt-1 tabular-nums ${
            accentValue ? "text-c57-primary" : "text-c57-on-surface"
          }`}
        >
          {value}
        </span>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 bg-c57-surface-container-low/50 -mx-5 -mb-5 px-5 py-3">
        {footer}
      </div>
    </div>
  );
}

function CashflowCard({ tokens, data, options, metrics }) {
  const primary = toHex(tokens["--c57-primary"]);
  const container = toHex(tokens["--c57-primary-container"]);
  const rule = toHex(tokens["--c57-surface-variant"]);

  return (
    <Card className="lg:col-span-7 p-space-lg sm:p-space-xl flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-c57-on-surface font-semibold">
              Arus Kas &amp; Tren Pertumbuhan
            </h3>
            <p className="text-body-sm text-c57-outline mt-1">
              Perbandingan Pendapatan Kotor vs Beban Operasional — 6 bulan
              terakhir
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-c57-on-surface">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: container }} />
              Pendapatan
            </span>
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-c57-outline">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: rule }} />
              Beban
            </span>
          </div>
        </div>

        <div className="h-56">
          <Bar
            data={{
              labels: data.labels,
              datasets: [
                {
                  label: "Pendapatan",
                  data: data.revenue,
                  backgroundColor: rgba(tokens["--c57-primary-container"], 0.85),
                  borderColor: primary,
                  borderWidth: 0,
                  borderRadius: 6,
                  barThickness: 18,
                },
                {
                  label: "Beban Operasional",
                  data: data.expense,
                  backgroundColor: rgba(tokens["--c57-surface-variant"], 0.9),
                  borderColor: rule,
                  borderWidth: 0,
                  borderRadius: 6,
                  barThickness: 18,
                },
              ],
            }}
            options={options}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 bg-c57-surface-container-low p-4 rounded-c57-lg">
        <div>
          <span className="text-body-sm text-c57-outline block">Rata-rata Order</span>
          <span className="font-label-lg text-label-lg font-bold text-c57-on-surface tabular-nums">
            {rupiah(metrics.avgOrder)}
          </span>
        </div>
        <div>
          <span className="text-body-sm text-c57-outline block">Utilisasi Armada</span>
          <span className="font-label-lg text-label-lg font-bold text-c57-on-surface tabular-nums">
            {metrics.utilisasi}% Efektif
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-body-sm text-c57-outline block">Efisiensi Biaya</span>
          <span className="font-label-lg text-label-lg font-bold text-c57-primary">
            {metrics.expenseTrend === null
              ? "—"
              : `↓ ${Math.abs(metrics.expenseTrend)}% MoM`}
          </span>
        </div>
      </div>
    </Card>
  );
}

function DistributionCard({ segments }) {
  return (
    <Card className="lg:col-span-5 p-space-lg sm:p-space-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-c57-on-surface font-semibold">
            Distribusi Pendapatan
          </h3>
          <span className="font-label-sm text-label-sm text-c57-outline uppercase tracking-wider">
            Per Sektor Armada
          </span>
        </div>
        <p className="text-body-sm text-c57-on-surface-variant mt-1">
          Kontribusi per unit operasional periode berjalan.
        </p>

        <div className="flex flex-col gap-4 mt-6">
          {segments.length === 0 && (
            <p className="text-body-sm text-c57-outline italic">
              Belum ada pendapatan tercatat pada periode ini.
            </p>
          )}
          {segments.map((seg) => (
            <div key={seg.label} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-c57-on-surface font-medium flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${seg.dot}`} />
                  {seg.label}
                </span>
                <span className="text-c57-on-surface font-semibold tabular-nums">
                  {rupiah(seg.amount)} ({seg.pct}%)
                </span>
              </div>
              <div className="w-full bg-c57-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-editorial ${seg.bar}`}
                  style={{ width: `${seg.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-3.5 bg-c57-surface-container-low rounded-c57-lg flex items-center gap-3">
        <Icon name="workspace_premium" size="xl" className="text-c57-primary" />
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm font-bold text-c57-on-surface">
            Pembukuan Real-time
          </span>
          <span className="text-body-sm text-c57-on-surface-variant">
            Setiap mutasi mensinkron langsung dari pesanan &amp; setoran driver.
          </span>
        </div>
      </div>
    </Card>
  );
}

function TabBar({ tabs, counts, active, pendingCount, onSelect }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2" role="tablist">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const isCash = tab.id === "driver-cash";
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={[
              "px-4 py-2 rounded-full font-label-md text-label-md shadow-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-c57-primary-container text-c57-on-primary"
                : "bg-c57-surface-container-lowest hover:bg-c57-surface-container text-c57-on-surface-variant",
            ].join(" ")}
          >
            {tab.label} ({counts[tab.id] ?? 0})
            {isCash && pendingCount > 0 && (
              <span className="ml-1.5 bg-c57-primary text-c57-on-primary text-label-sm font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FilterBar({
  search,
  onSearch,
  statusFilter,
  onStatus,
  methodFilter,
  onMethod,
  methodOptions,
  onReset,
}) {
  return (
    <Card variant="flat" className="p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
      <div className="flex items-center gap-2 bg-c57-surface-container-low px-3.5 py-2 rounded-c57-md flex-1">
        <Icon name="search" size="lg" className="text-c57-outline" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Cari no. invoice, nama client, ID driver, atau unit armada..."
          className="w-full bg-transparent text-body-sm text-c57-on-surface focus:outline-none placeholder:text-c57-outline"
          aria-label="Cari transaksi"
        />
      </div>

      <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
        <div className="bg-c57-surface-container-low px-3 py-2 rounded-c57-md flex items-center gap-2 flex-1 sm:flex-initial">
          <span className="font-label-sm text-label-sm text-c57-outline uppercase">Status:</span>
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => onStatus(e.target.value)}
            className="bg-transparent font-label-md text-label-md text-c57-on-surface focus:outline-none cursor-pointer"
          >
            {STATUS_GROUPS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-c57-surface-container-low px-3 py-2 rounded-c57-md flex items-center gap-2 flex-1 sm:flex-initial">
          <span className="font-label-sm text-label-sm text-c57-outline uppercase">Metode:</span>
          <select
            aria-label="Filter metode"
            value={methodFilter}
            onChange={(e) => onMethod(e.target.value)}
            className="bg-transparent font-label-md text-label-md text-c57-on-surface focus:outline-none cursor-pointer"
          >
            {methodOptions.map((m) => (
              <option key={m} value={m}>
                {m === "all" ? "Semua Metode" : m}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="px-4 py-2 bg-c57-surface-container-high hover:bg-c57-surface-container-highest text-c57-on-surface rounded-c57-md font-label-md text-label-md font-semibold transition-colors flex items-center gap-1"
        >
          <Icon name="tune" size="md" />
          Filter
        </button>
        <button
          type="button"
          onClick={onReset}
          className="p-2 text-c57-outline hover:text-c57-on-surface transition-colors"
          title="Reset filter"
          aria-label="Reset filter"
        >
          <Icon name="refresh" size="lg" />
        </button>
      </div>
    </Card>
  );
}

function LedgerTable({ rows, subtotal, page, totalPages, onPage }) {
  const COLUMNS = [
    { key: "tanggal", header: "Tanggal & Waktu" },
    { key: "noRef", header: "No. Invoice / Ref" },
    { key: "uraian", header: "Uraian Transaksi & Unit" },
    { key: "kategori", header: "Kategori" },
    { key: "metode", header: "Metode Bayar" },
    { key: "nominal", header: "Nominal (IDR)" },
    { key: "status", header: "Status" },
  ];

  return (
    <Table columns={COLUMNS}>
      {rows.length === 0 ? (
        <TableRow>
          <TableCell colSpan={COLUMNS.length}>
            <EmptyState
              icon="description"
              title="Tidak ada mutasi"
              description="Tidak ada transaksi yang cocok dengan filter ini."
              className="border-0 bg-transparent py-space-xl"
            />
          </TableCell>
        </TableRow>
      ) : (
        rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap">
              <div className="font-medium text-c57-on-surface">
                {row.date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <div className="text-[11px] text-c57-outline">{formatClock(row.date)}</div>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Pill variant="outline">{row.noRef}</Pill>
            </TableCell>
            <TableCell>
              <div className="font-semibold text-c57-on-surface">{row.uraian}</div>
              <div className="text-[12px] text-c57-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <Icon name="person" size="xs" className="text-c57-outline" />
                <span>{row.sub}</span>
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Pill variant="neutral">{row.kategori}</Pill>
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <div className="text-body-sm text-c57-on-surface font-medium">
                {row.metode}
              </div>
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              <span
                className={`font-label-md text-label-md font-bold tabular-nums ${
                  row.amount >= 0 ? "text-c57-available-text" : "text-c57-on-error-container"
                }`}
              >
                {row.amount >= 0 ? "+" : "−"}{rupiah(Math.abs(row.amount))}
              </span>
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
              <Pill variant={STATUS_PILL[row.statusLabel]?.variant || "neutral"} icon={STATUS_PILL[row.statusLabel]?.icon}>
                {row.statusLabel}
              </Pill>
            </TableCell>
          </TableRow>
        ))
      )}

      <TableRow>
        <TableCell colSpan={COLUMNS.length} className="bg-c57-surface-container-low !py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-body-sm text-c57-outline">
              <span>Menampilkan</span>
              <span className="font-semibold text-c57-on-surface">
                {subtotal === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1} – ${Math.min(page * PAGE_SIZE, subtotal)}`}
              </span>
              <span>dari</span>
              <span className="font-semibold text-c57-on-surface">{subtotal}</span>
              <span>transaksi tercatat</span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPage(page - 1)}
                  className="p-1.5 rounded bg-c57-surface-container-lowest text-c57-outline hover:text-c57-on-surface disabled:opacity-30"
                  aria-label="Halaman sebelumnya"
                >
                  <Icon name="chevron_left" size="lg" />
                </button>

                {pageItems(page, totalPages).map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-c57-outline">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPage(item)}
                      className={[
                        "w-8 h-8 rounded font-label-md text-label-md flex items-center justify-center",
                        item === page
                          ? "bg-c57-primary text-c57-on-primary font-bold"
                          : "bg-c57-surface-container-lowest hover:bg-c57-surface-container text-c57-on-surface",
                      ].join(" ")}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPage(page + 1)}
                  className="p-1.5 rounded bg-c57-surface-container-lowest text-c57-outline hover:text-c57-on-surface disabled:opacity-30"
                  aria-label="Halaman berikutnya"
                >
                  <Icon name="chevron_right" size="lg" />
                </button>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
    </Table>
  );
}

/**
 * Compressed page list: first, current ±1 and last, joined with ellipses.
 */
function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...items].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  sorted.forEach((n) => {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  });
  return out;
}

function ReconciliationDock({
  pettyCash,
  pendingAmount,
  pendingCount,
  lastSyncMinutes,
  validating,
  onValidate,
}) {
  return (
    <Card variant="inset" className="mt-gutter p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 sm:gap-8 w-full md:w-auto">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-c57-surface-container-highest flex items-center justify-center text-c57-primary">
            <Icon name="point_of_sale" size="xl" />
          </span>
          <div>
            <span className="font-label-sm text-label-sm text-c57-outline uppercase tracking-wider block">
              Kas Kecil di Kasir (Hari Ini)
            </span>
            <span className="font-label-lg text-label-lg font-bold text-c57-on-surface tabular-nums">
              {rupiah(pettyCash)}
            </span>
          </div>
        </div>

        <div className="hidden sm:block h-8 w-px bg-c57-outline-variant/50" />

        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-c57-secondary-container/50 flex items-center justify-center text-c57-on-secondary-container">
            <Icon name="pending_actions" size="xl" />
          </span>
          <div>
            <span className="font-label-sm text-label-sm text-c57-outline uppercase tracking-wider block">
              Total Setoran Driver Tertahan
            </span>
            <span className="font-label-lg text-label-lg font-bold text-c57-primary tabular-nums">
              {rupiah(pendingAmount)}{" "}
              <span className="text-xs font-normal text-c57-outline">
                ({pendingCount} Titipan)
              </span>
            </span>
          </div>
        </div>

        <div className="hidden lg:block h-8 w-px bg-c57-outline-variant/50" />

        <div className="flex items-center gap-2">
          <Icon name="verified" size="xl" className="text-c57-available-text" />
          <div>
            <span className="font-label-sm text-label-sm text-c57-on-surface font-semibold block">
              Sinkronisasi Data Otomatis
            </span>
            <span className="text-body-sm text-c57-outline">
              {lastSyncMinutes === null
                ? "Belum ada data masuk"
                : `Mutasi terakhir ${lastSyncMinutes} mnt lalu`}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-auto flex items-center justify-end">
        <Button
          type="button"
          size="md"
          icon="rule"
          loading={validating}
          disabled={pendingCount === 0 || validating}
          onClick={onValidate}
          className="w-full sm:w-auto"
        >
          Validasi Semua Setoran Kas
        </Button>
      </div>
    </Card>
  );
}