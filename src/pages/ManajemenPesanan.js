import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { useCalendarSync } from "../services/calendarSync";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Field from "../components/ui/Field";
import Icon from "../components/ui/Icon";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pill from "../components/ui/Pill";
import Select from "../components/ui/Select";

/**
 * Booking operations console: approve/reject, chase DP, settle balances,
 * print invoices, sync to Google Calendar, export to XLSX.
 *
 * The write graph here is the most tangled in the app and is preserved
 * exactly, branch for branch:
 *   disetujui + Cash    -> disetujui_cash / waiting_dp_input, notify client
 *   disetujui + non-Cash-> menunggu pembayaran, dpAmount = ceil(50%),
 *                         release the vehicle, notify client
 *   ditolak             -> release the vehicle, notify client
 *   selesai             -> release the vehicle, notify client
 *   mark as lunas       -> lunas / fully_paid, release, notify
 *   balance approved    -> lunas / fully_paid, release, notify
 *   balance rejected    -> balancePaymentRequest.status only
 *   payment approved    -> status + completed, notify
 * The `alert()` calls are left alone, as on the other admin pages.
 */

/**
 * Claim or release a car by flipping availability only.
 *
 * `mobil.status` is the *service* state ("normal" | "servis") and is owned
 * exclusively by the Set Servis toggle in CarManagement. These booking
 * transitions used to write `status: "normal"` on release and
 * `status: "disewa"` on claim, which meant a car an admin had marked
 * in-service was silently returned to normal the moment a booking was
 * rejected, completed or settled.
 *
 * Availability is the boolean `tersedia`, and the fleet counters on ListMobil
 * already read it directly (`m.tersedia === true` / `m.tersedia === false`),
 * so dropping the status write changes nothing they display.
 */
const setMobilTersedia = (mobilId, tersedia) =>
  updateDoc(doc(db, "mobil", mobilId), { tersedia });

const STATUS_FILTERS = [
  { value: "semua", label: "Semua Status" },
  { value: "diproses", label: "Masuk (Pending)" },  { value: "disetujui", label: "Disetujui" },
  { value: "menunggu pembayaran", label: "Menunggu DP" },
  { value: "pembayaran berhasil", label: "DP Diterima (Disewa)" },
  { value: "balance_pending", label: "Butuh Pelunasan" },
  { value: "lunas", label: "Selesai (Lunas)" },
  { value: "ditolak", label: "Dibatalkan" },
];

const RENTAL_TYPES = [
  { value: "semua", label: "Semua Kategori" },
  { value: "Lepas Kunci", label: "Lepas Kunci" },
  { value: "Driver", label: "Dengan Driver" },
];

const SORTS = [
  { value: "newest", label: "Paling Baru" },
  { value: "oldest", label: "Paling Lama" },
  { value: "price-high", label: "Harga Tertinggi" },
  { value: "price-low", label: "Harga Terendah" },
];

/**
 * One place for the order-status chip. The old markup inlined a five-way
 * emerald/amber/blue/slate/crimson ternary in two spots, which meant a new
 * status had to be remembered in both.
 */
const ORDER_STATUS = {
  diproses:                  { label: "Diproses",  pill: { variant: "sand",      icon: "pending" } },
  disetujui:                 { label: "Disetujui", pill: { variant: "available", icon: "check_circle" } },
  "menunggu pembayaran":     { label: "Menunggu DP", pill: { variant: "signature", icon: "hourglass_top" } },
  "pembayaran berhasil":     { label: "DP Diterima", pill: { variant: "signature", icon: "check_circle" } },
  disewa:                    { label: "Disewa",    pill: { variant: "signature", icon: "directions_car" } },
  "tugas aktif":             { label: "Tugas Aktif", pill: { variant: "signature", icon: "route" } },
  "menunggu konfirmasi lunas": { label: "Konfirmasi Pelunasan", pill: { variant: "sand", icon: "schedule" } },
  disetujui_cash:            { label: "Disetujui (Cash)", pill: { variant: "neutral", icon: "payments" } },
  lunas:                     { label: "Lunas",     pill: { variant: "available", icon: "check_circle" } },
  ditolak:                   { label: "Dibatalkan", pill: { variant: "outline",   icon: "cancel" } },
};

const orderStatus = (status) =>
  ORDER_STATUS[status] || { label: status, pill: { variant: "outline" } };

export default function ManajemenPesanan() {
  const [pemesanan, setPemesanan] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterRentalType, setFilterRentalType] = useState("semua");
  const [searchPemesanan, setSearchPemesanan] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { syncNow } = useCalendarSync();

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Gagal fetch users:", error);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult.claims.admin === true) {
          setIsAdmin(true);
          fetchUsers();
        }
      } catch (error) {
        console.error("Error verifikasi admin:", error.message);
      }
      setLoading(false);
    };
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribe = onSnapshot(collection(db, "pemesanan"), (snapshot) => {
      const pemesananData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      pemesananData.sort((a, b) => {
        const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
        const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
        return dateB - dateA;
      });
      setPemesanan(pemesananData);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleStatus = async (id, status, mobilId) => {
    try {
      const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
      const pemesananData = pemesananDoc.data();
      const userId = pemesananData.uid;

      await updateDoc(doc(db, "pemesanan", id), { status });
      if (status === "disetujui") {
        if (pemesananData.paymentMethod === 'Cash') {
          await updateDoc(doc(db, "pemesanan", id), {
            status: "disetujui_cash",
            paymentStatus: "waiting_dp_input"
          });
          await addDoc(collection(db, "notifications"), {
            userId,
            message: `Pengajuan pembayaran Cash untuk ${pemesananData.namaMobil} telah disetujui. Silakan masukkan nominal DP yang akan Anda bayarkan di halaman History Pesanan.`,
            read: false,
            timestamp: serverTimestamp()
          });
        } else {
          const dpAmount = Math.ceil(pemesananData.perkiraanHarga * 0.5);
          await updateDoc(doc(db, "pemesanan", id), {
            status: "menunggu pembayaran",
            dpAmount: dpAmount,
            paymentStatus: "pending"
          });
          await setMobilTersedia(mobilId, false);
          await addDoc(collection(db, "notifications"), {
            userId,
            message: `Pemesanan mobil ${pemesananData.namaMobil} telah disetujui. Silakan lakukan pembayaran DP sebesar Rp ${dpAmount.toLocaleString()}.`,
            read: false,
            timestamp: serverTimestamp()
          });
        }
      } else if (status === "ditolak") {
        await setMobilTersedia(mobilId, true);
        await addDoc(collection(db, "notifications"), {
          userId,
          message: `Pemesanan mobil ${pemesananData.namaMobil} telah ditolak.`,
          read: false,
          timestamp: serverTimestamp()
        });
      } else if (status === "selesai") {
        await setMobilTersedia(mobilId, true);
        await addDoc(collection(db, "notifications"), {
          userId,
          message: `Pemesanan mobil ${pemesananData.namaMobil} telah selesai. Terima kasih telah menggunakan layanan kami.`,
          read: false,
          timestamp: serverTimestamp()
        });
      }
      alert("Status pesanan diperbarui.");
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui status.");
    }
  };

  const handleMarkAsLunas = async (id, mobilId) => {
    try {
      const pemesananDoc = await getDoc(doc(db, "pemesanan", id));
      const pemesananData = pemesananDoc.data();
      const userId = pemesananData.uid;

      await updateDoc(doc(db, "pemesanan", id), {
        status: "lunas",
        paymentStatus: "fully_paid",
        lunasAt: new Date().toISOString()
      });

      await setMobilTersedia(mobilId, true);

      await addDoc(collection(db, "notifications"), {
        userId,
        message: `Pemesanan mobil ${pemesananData.namaMobil} telah lunas (pembayaran penuh).`,
        read: false,
        timestamp: serverTimestamp()
      });
      alert("Pesanan ditandai Lunas.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleBalancePaymentApproval = async (id, status) => {
    try {
      const orderDoc = await getDoc(doc(db, "pemesanan", id));
      const order = { id, ...orderDoc.data() };

      if (status === "approved") {
        await updateDoc(doc(db, "pemesanan", id), {
          status: "lunas",
          paymentStatus: "fully_paid",
          balancePaymentRequest: {
            ...order.balancePaymentRequest,
            status: "approved",
            approvedAt: new Date().toISOString()
          },
          lunasAt: new Date().toISOString()
        });
        await setMobilTersedia(order.mobilId, true);
        await addDoc(collection(db, "notifications"), {
          userId: order.uid,
          message: `Pelunasan mobil ${order.namaMobil} telah dikonfirmasi.`,
          read: false,
          timestamp: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, "pemesanan", id), {
          balancePaymentRequest: { ...order.balancePaymentRequest, status: "rejected" }
        });
      }
      alert("Status pelunasan diperbarui.");
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentApproval = async (id, status) => {
    try {
      const orderDoc = await getDoc(doc(db, "pemesanan", id));
      const order = { id, ...orderDoc.data() };
      await updateDoc(doc(db, "pemesanan", id), {
        status: status,
        paymentStatus: "completed"
      });
      await addDoc(collection(db, "notifications"), {
        userId: order.uid,
        message: `Pembayaran untuk ${order.namaMobil} telah dikonfirmasi.`,
        read: false,
        timestamp: serverTimestamp()
      });
      alert("Pembayaran dikonfirmasi.");
    } catch (err) {
      console.error(err);
    }
  };

  const calculatePenalty = (order) => {
    if (!order.tanggalSelesai || !order.perkiraanHarga || !order.durasiHari) return { amount: 0, hours: 0 };
    const activeStatuses = ["pembayaran berhasil", "disewa", "approve sewa"];
    if (!activeStatuses.includes(order.status)) return { amount: 0, hours: 0 };

    const end = new Date(order.tanggalSelesai);
    const now = new Date();
    if (now <= end) return { amount: 0, hours: 0 };

    const diffMs = now - end;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const dailyRate = Math.ceil(order.perkiraanHarga / order.durasiHari);
    const penaltyPerHour = Math.ceil(dailyRate * 0.1);
    return { amount: penaltyPerHour * diffHours, hours: diffHours };
  };

  const generateInvoicePDF = async (order, user, type = "full") => {
    try {
      const InvoiceGenerator = (await import("../components/InvoiceGenerator")).default;
      if (type === "dp") {
        InvoiceGenerator.generateDPInvoice(order, user);
      } else {
        const { amount, hours } = calculatePenalty(order);
        InvoiceGenerator.generateFullInvoice(order, user, amount, hours);
      }
    } catch (err) {
      console.error("Gagal memuat invoice generator:", err);
      alert("Format cetak PDF gagal dimuat. Silakan coba lagi.");
    }
  };

  /**
   * Manual push for a single order.
   *
   * The auto-sync engine normally owns the calendar; this button is the
   * escape hatch for "put this one on my calendar now" — it connects on the
   * spot if the admin has not linked Google yet.
   */
  const handleSyncToCalendar = async (order) => {
    try {
      await syncNow("pemesanan", order);
      alert("Pesanan berhasil disinkronkan ke Google Calendar.");
    } catch (error) {
      console.error(error);
      alert(error?.message || "Gagal sinkronisasi. Pastikan Anda sudah login Google.");
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const dataToExport = filteredPemesanan.map(p => {
        const user = users.find(u => u.id === p.uid);

        // Determine delivery address based on user requirements
        let alamatLengkap = "-";
        if (p.deliveryAddress) {
          alamatLengkap = p.deliveryAddress;
        } else if (user) {
          alamatLengkap = user.alamat || user.Alamat || "-";
        }

        return {
          "ID Pesanan": p.id,
          "Nama Client": p.namaClient || "-",
          "Email": p.email || "-",
          "Telepon": p.telepon || "-",
          "Mobil": p.namaMobil || "-",
          "Tipe Sewa": p.rentalType || "Lepas Kunci",
          "Tujuan Pengiriman": p.lokasiPenyerahan || "Ambil di Garasi",
          "Alamat Lengkap": alamatLengkap,
          "Sewa Dari": p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString('id-ID') : "-",
          "Sewa Sampai": p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString('id-ID') : "-",
          "Durasi (Hari)": p.durasiHari || 0,
          "Total Harga": p.perkiraanHarga || 0,
          "Status": p.status,
          "Tgl Dibuat": new Date(p.tanggal).toLocaleDateString('id-ID')
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pesanan");

      // Generate filename based on filters
      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Laporan_Pesanan_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Gagal ekspor ke Excel:", err);
      alert("Format cetak Excel gagal dimuat. Silakan coba lagi.");
    }
  };

  const filteredPemesanan = pemesanan
    .filter(p => {
      const user = users.find(u => u.id === p.uid);
      let matchesStatus = filterStatus === "semua" || p.status === filterStatus;
      if (filterStatus === "balance_pending") {
        matchesStatus = p.balancePaymentRequest && p.balancePaymentRequest.status === "pending";
      }
      const matchesRentalType = filterRentalType === "semua" || (p.rentalType === filterRentalType || (filterRentalType === "Driver" && p.rentalType === "Dengan Driver"));
      const matchesSearch = searchPemesanan === "" ||
        p.namaMobil?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchPemesanan.toLowerCase()) ||
        user?.nama?.toLowerCase().includes(searchPemesanan.toLowerCase());

      // Date Range Filter
      let matchesDate = true;
      if (startDate && endDate) {
        const orderDate = new Date(p.tanggal);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59); // End of day
        matchesDate = orderDate >= start && orderDate <= end;
      }

      return matchesStatus && matchesRentalType && matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      const dateA = a.tanggal ? new Date(a.tanggal) : new Date(0);
      const dateB = b.tanggal ? new Date(b.tanggal) : new Date(0);
      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "price-high") return (b.perkiraanHarga || 0) - (a.perkiraanHarga || 0);
      if (sortBy === "price-low") return (a.perkiraanHarga || 0) - (b.perkiraanHarga || 0);
      return 0;
    });

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-c57-surface-container-highest border-t-c57-primary-container"
          role="status"
          aria-label="Memuat pesanan"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-c57-surface-container-low pt-30 flex items-center justify-center px-gutter-mobile sm:px-gutter">
        <Card className="max-w-md w-full p-space-xl text-center">
          <span className="mx-auto mb-space-lg flex h-16 w-16 items-center justify-center text-c57-on-error-container">
            <Icon name="lock" size="3xl" />
          </span>
          <h2 className="mb-space-sm font-headline-md text-headline-md text-c57-on-surface">
            Akses Ditolak
          </h2>
          <p className="mb-space-lg text-body-md text-c57-on-surface-variant italic">
            Anda tidak memiliki kredensial untuk manajemen keuangan &amp; operasional.
          </p>
          <div className="mx-auto h-1.5 w-12 rounded-full bg-c57-primary-container" />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-c57-surface-container-low pt-30 pb-space-xl">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter">
        <PageHeader
          eyebrow="Sistem Operasional Armada"
          title="Manajemen Pesanan"
          subtitle="Konfirmasi pembayaran, monitor durasi, dan kelola logistik persewaan."
          actions={
            <>
              <Button type="button" variant="success" icon="download" onClick={exportToExcel}>
                Export Excel
              </Button>
              <Button
                type="button"
                variant="secondary"
                icon="refresh"
                onClick={handleRefresh}
                className={refreshing ? "rotate-180 transition-transform duration-500" : ""}
              >
                Refresh Data
              </Button>
            </>
          }
        />

        {/* Dynamic Filters Section */}
        <Card className="mt-space-xl p-space-md sm:p-space-lg">
          <div className="grid grid-cols-1 gap-space-lg sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status Transaksi">
              {(p) => (
                <Select
                  {...p}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Kategori Sewa">
              {(p) => (
                <Select
                  {...p}
                  value={filterRentalType}
                  onChange={(e) => setFilterRentalType(e.target.value)}
                >
                  {RENTAL_TYPES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label="Rentang Awal">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              )}
            </Field>

            <Field label="Rentang Akhir">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              )}
            </Field>
          </div>

          <div className="mt-space-lg flex flex-col gap-space-lg border-t border-c57-surface-variant pt-space-lg lg:flex-row">
            <Field label="Pencarian Cepat" className="flex-1">
              {(p) => (
                <Input
                  {...p}
                  type="text"
                  icon="search"
                  value={searchPemesanan}
                  onChange={(e) => setSearchPemesanan(e.target.value)}
                  placeholder="Nama client, mobil, atau email..."
                />
              )}
            </Field>

            <Field label="Urutkan" className="lg:w-1/4">
              {(p) => (
                <Select {...p} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  {SORTS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Card>

        {/* Orders List */}
        <div className="mt-space-lg space-y-space-lg">
          {filteredPemesanan.length === 0 ? (
            <EmptyState
              icon="description"
              title="Tidak ada transaksi"
              description="Tidak ada transaksi ditemukan pada kriteria ini."
              className="py-space-xl"
            />
          ) : (
            filteredPemesanan.map((p) => {
              const user = users.find(u => u.id === p.uid);
              const driverUser = users.find(u => u.id === p.driverId);
              const penalty = calculatePenalty(p);
              const status = orderStatus(p.status);

              return (
                <Card key={p.id} interactive className="group overflow-hidden">
                  <div className="p-space-md sm:p-space-lg">
                    {/* Item Top: Header & Status */}
                    <div className="mb-space-lg flex flex-col justify-between gap-space-md border-b border-c57-surface-variant pb-space-md md:flex-row md:items-center">
                      <div className="flex items-center gap-space-md">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-c57-md bg-c57-primary-container text-c57-on-primary transition-transform duration-500 ease-editorial group-hover:scale-110">
                          <Icon name="directions_car" size="3xl" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-space-sm">
                            <h3 className="font-headline-sm text-headline-sm uppercase text-c57-on-surface">
                              {p.namaMobil}
                            </h3>
                            <Pill variant={status.pill.variant} icon={status.pill.icon}>
                              {status.label}
                            </Pill>
                          </div>
                          <p className="mt-1 text-body-sm text-c57-on-surface-variant">
                            Order #{p.id.substring(0, 8).toUpperCase()} &bull; {p.rentalType}
                          </p>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="mb-1 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          Dibuat Pada
                        </p>
                        <p className="flex items-center gap-1.5 text-body-md text-c57-on-surface md:justify-end">
                          <Icon name="calendar_month" size="sm" className="text-c57-primary" />
                          {new Date(p.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Item Middle: Data Grid */}
                    <div
                      className={[
                        "mb-space-lg grid grid-cols-1 gap-space-md sm:grid-cols-2",
                        p.rentalType === "Dengan Driver" ? "lg:grid-cols-5" : "lg:grid-cols-4",
                      ].join(" ")}
                    >
                      {/* Client Info */}
                      <div className="rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                        <p className="mb-3 flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          <Icon name="person" size="xs" />
                          Data Pelanggan
                        </p>
                        <h4 className="mb-1 truncate font-headline-sm text-body-md text-c57-on-surface">
                          {user?.nama || p.email}
                        </h4>
                        <p className="mb-1 text-body-sm text-c57-on-surface-variant">
                          {user?.nomorTelepon || "No Phone"}
                        </p>
                        <p className="truncate text-body-sm text-c57-on-surface-variant">{p.email}</p>
                      </div>

                      {/* Driver Info */}
                      {p.rentalType === "Dengan Driver" && (
                        <div className="flex flex-col justify-between rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                          <div>
                            <p className="mb-3 flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                              <Icon name="person" size="xs" className="text-c57-primary" />
                              Driver Penerima
                            </p>
                            {p.driverId ? (
                              <>
                                <h4 className="mb-1 truncate font-headline-sm text-body-md text-c57-on-surface">
                                  {driverUser?.displayName || driverUser?.nama || driverUser?.name || 'Driver Aktif'}
                                </h4>
                                <p className="mb-1 text-body-sm text-c57-on-surface-variant">
                                  ID: {p.driverId.substring(0, 12).toUpperCase()}
                                </p>
                              </>
                            ) : (
                              <Pill variant="sand">Menunggu Driver</Pill>
                            )}
                          </div>
                          {p.driverId && (driverUser?.email || p.driverEmail) && (
                            <p className="mt-2 truncate text-body-sm text-c57-on-surface-variant">
                              {driverUser?.email || p.driverEmail}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Duration Info */}
                      <div className="rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md text-center">
                        <p className="mb-3 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          Durasi Sewa ({p.durasiHari} Hari)
                        </p>
                        <div className="flex items-center justify-center gap-space-sm">
                          <div className="text-center">
                            <p className="mb-0.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                              Mulai
                            </p>
                            <p className="font-headline-sm text-body-md text-c57-on-surface">
                              {p.tanggalMulai ? new Date(p.tanggalMulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                            </p>
                          </div>
                          <Icon name="arrow_forward" size="sm" className="mt-4 text-c57-primary" />
                          <div className="text-center">
                            <p className="mb-0.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                              Selesai
                            </p>
                            <p className="font-headline-sm text-body-md text-c57-on-surface">
                              {p.tanggalSelesai ? new Date(p.tanggalSelesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Location Info */}
                      <div className="rounded-c57-md border border-c57-surface-variant bg-c57-surface-container-low p-space-md">
                        <p className="mb-3 flex items-center gap-1.5 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          <Icon name="location_on" size="xs" />
                          Penyerahan
                        </p>
                        <p className="mb-1 font-headline-sm text-body-md text-c57-on-surface">
                          {p.lokasiPenyerahan || 'Antar ke Alamat'}
                        </p>
                        {(p.deliveryAddress || p.titikTemuAddress) && (
                          <p className="line-clamp-2 text-body-sm text-c57-on-surface-variant italic leading-tight">
                            &ldquo;{p.deliveryAddress || p.titikTemuAddress}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Financial Info */}
                      <div className="flex flex-col justify-center rounded-c57-md border border-c57-primary-container bg-c57-primary-container/10 p-space-md text-right">
                        <p className="mb-1 font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                          Estimasi Total
                        </p>
                        <p className="font-headline-sm text-headline-sm text-c57-primary tabular-nums">
                          Rp {p.perkiraanHarga?.toLocaleString()}
                        </p>
                        {p.dpAmount && (
                          <p className="mt-1 text-body-sm text-c57-primary/80 tabular-nums">
                            DP: Rp {p.dpAmount.toLocaleString()}
                          </p>
                        )}
                        {penalty.amount > 0 && (
                          <div className="mt-2">
                            <Pill variant="danger">
                              Denda: Rp {penalty.amount.toLocaleString()} ({penalty.hours}j)
                            </Pill>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item Bottom: Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-space-md">
                      {/* Action Group 1: Decisions */}
                      <div className="flex flex-wrap gap-space-sm">
                        {p.status === "diproses" && (
                          <>
                            <Button
                              type="button"
                              variant="success"
                              onClick={() => handleStatus(p.id, "disetujui", p.mobilId)}
                            >
                              Setujui
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => handleStatus(p.id, "ditolak", p.mobilId)}
                            >
                              Tolak
                            </Button>
                          </>
                        )}

                        {p.status === "disetujui_cash" && p.paymentStatus === "dp_cash_submitted" && (
                          <div className="flex flex-col items-center gap-space-md rounded-c57-md border border-c57-tertiary-container bg-c57-tertiary-container/40 p-space-md md:flex-row">
                            <div className="flex items-center gap-space-sm">
                              <Icon name="payments" size="xl" className="text-c57-on-tertiary-container" />
                              <div>
                                <p className="font-label-sm uppercase tracking-widest text-c57-on-surface-variant">
                                  Nominal DP Tunai
                                </p>
                                <p className="font-headline-sm text-body-lg text-c57-on-surface tabular-nums">
                                  Rp {p.dpAmount?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="success"
                              onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")}
                            >
                              Konfirmasi Terima Uang
                            </Button>
                          </div>
                        )}

                        {p.status === "menunggu pembayaran" && p.paymentProof && (
                          <div className="flex items-center gap-space-sm">
                            <Button
                              as="a"
                              href={p.paymentProof}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="secondary"
                              size="sm"
                              icon="visibility"
                            >
                              Bukti DP
                            </Button>
                            <Button
                              type="button"
                              variant="success"
                              onClick={() => handlePaymentApproval(p.id, "pembayaran berhasil")}
                            >
                              Verifikasi DP
                            </Button>
                          </div>
                        )}

                        {p.balancePaymentRequest?.status === "pending" && (
                          <div className="flex items-center gap-space-sm">
                            <Button
                              as="a"
                              href={p.balancePaymentRequest.paymentProof}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="secondary"
                              size="sm"
                              icon="visibility"
                            >
                              Bukti Lunas
                            </Button>
                            <Button
                              type="button"
                              variant="success"
                              onClick={() => handleBalancePaymentApproval(p.id, "approved")}
                            >
                              Selesaikan Order
                            </Button>
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleBalancePaymentApproval(p.id, "rejected")}
                            >
                              Tolak
                            </Button>
                          </div>
                        )}

                        {(p.status === "pembayaran berhasil" || p.status === "disewa" || p.status === "tugas aktif") && (
                          <Button
                            type="button"
                            variant="success"
                            onClick={() => handleStatus(p.id, "selesai", p.mobilId)}
                          >
                            Tandai Selesai
                          </Button>
                        )}

                        {p.status === "menunggu konfirmasi lunas" && (
                          <Button
                            type="button"
                            variant="success"
                            onClick={() => handleMarkAsLunas(p.id, p.mobilId)}
                          >
                            Konfirmasi Pelunasan
                          </Button>
                        )}
                      </div>

                      {/* Action Group 2: Document Printing */}
                      <div className="ml-auto flex items-center gap-space-sm">
                        {(p.status === "pembayaran berhasil" || p.status === "menunggu pembayaran" || p.status === "disetujui") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon="download"
                            onClick={() => generateInvoicePDF(p, user, "dp")}
                            className="!px-1"
                          >
                            Invoice DP
                          </Button>
                        )}
                        {(p.status === "selesai" || p.status === "tugas aktif" || p.status === "pembayaran berhasil" || p.status === "lunas") && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon="download"
                            onClick={() => generateInvoicePDF(p, user, "full")}
                          >
                            Cetak Invoice Full
                          </Button>
                        )}
                        {(p.status === "pembayaran berhasil" || p.status === "lunas" || p.status === "disetujui") && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon="calendar_month"
                            onClick={() => handleSyncToCalendar(p)}
                          >
                            Sync Calendar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
