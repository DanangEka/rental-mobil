import { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
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
} from "chart.js";
import { Car, Users, DollarSign, TrendingUp } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

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

  const [revenueData, setRevenueData] = useState({
    daily: {
      labels: [],
      datasets: [{
        label: 'Pendapatan Harian',
        data: [],
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgba(185, 28, 28, 1)',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    monthly: {
      labels: [],
      datasets: [{
        label: 'Pendapatan Bulanan',
        data: [],
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(185, 28, 28, 1)',
      }],
    },
  });

  const [loading, setLoading] = useState(true);

  // Initialize company profile data
  useEffect(() => {
    const initializeCompanyProfile = async () => {
      try {
        const companyDocRef = doc(db, "company_profile", "main");
        const companyDoc = await getDoc(companyDocRef);

        if (!companyDoc.exists()) {
          // Create company profile with the specified address
          await setDoc(companyDocRef, {
            nama: "Cakra Lima Tujuh",
            alamat: "Lembah Harapan, Blok AA-57, Lidah Wetan Kec. Lakarsantri, Surabaya",
            email: "limatujuhcakra@gmail.com",
            telepon: "+62 812-3456-7890",
            whatsapp: "6287859660053",
            instagram: "cakralimatujuhtrans",
            createdAt: new Date(),
            updatedAt: new Date()
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
    // Listener mobil
    const unsubscribeCars = onSnapshot(collection(db, "mobil"), (carsSnapshot) => {
      let available = 0;
      let rented = 0;
      let servis = 0;

      carsSnapshot.forEach((doc) => {
        const data = doc.data();
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

    // Listener user
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (usersSnapshot) => {
      setStats((prev) => ({ ...prev, totalCustomers: usersSnapshot.size }));
    });

    // Hitung pendapatan
    const fetchRevenue = async () => {
      try {
        const ordersSnapshot = await getDocs(collection(db, "pemesanan"));

        let todayRevenue = 0;
        let monthlyRevenue = 0;
        const dailyRevenue = {};
        const monthlyRevenueData = {};

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        ordersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "selesai" && data.perkiraanHarga) {
            let orderDate;
            if (data.tanggalMulai?.toDate) {
              orderDate = data.tanggalMulai.toDate();
            } else if (data.tanggalMulai instanceof Date) {
              orderDate = data.tanggalMulai;
            }

            if (orderDate) {
              const dayKey = orderDate.toDateString();
              dailyRevenue[dayKey] = (dailyRevenue[dayKey] || 0) + data.perkiraanHarga;

              const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
              monthlyRevenueData[monthKey] = (monthlyRevenueData[monthKey] || 0) + data.perkiraanHarga;

              if (orderDate.toDateString() === today.toDateString()) {
                todayRevenue += data.perkiraanHarga;
              }
              if (orderDate >= startOfMonth) {
                monthlyRevenue += data.perkiraanHarga;
              }
            }
          }
        });

        // Data harian (7 hari terakhir)
        const last7Days = [];
        const dailyValues = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayKey = date.toDateString();
          last7Days.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));
          dailyValues.push(dailyRevenue[dayKey] || 0);
        }

        // Data bulanan (6 bulan terakhir)
        const last6Months = [];
        const monthlyValues = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          last6Months.push(date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }));
          monthlyValues.push(monthlyRevenueData[monthKey] || 0);
        }

        setStats((prev) => ({
          ...prev,
          todayRevenue,
          monthlyRevenue,
        }));

        setRevenueData({
          daily: {
            labels: last7Days,
            datasets: [{
              ...revenueData.daily.datasets[0],
              data: dailyValues,
            }],
          },
          monthly: {
            labels: last6Months,
            datasets: [{
              ...revenueData.monthly.datasets[0],
              data: monthlyValues,
            }],
          },
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching revenue:", error);
        setLoading(false);
      }
    };

    fetchRevenue();

    return () => {
      unsubscribeCars();
      unsubscribeUsers();
    };
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => 'Rp ' + value.toLocaleString(),
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-7xl space-y-8 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
            <div className="h-80 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-fadeInUp">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Ringkasan performa penyewaan armada mobil.</p>
          </div>
        </div>

        {/* Stats Cards Mobil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-card-hover transition-all">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Mobil Tersedia</p>
                <p className="text-3xl font-black text-gray-900">{stats.availableCars}</p>
              </div>
              <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                <Car className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 relative z-10">
              <span className="text-sm text-green-600 font-medium">Siap disewakan</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-card-hover transition-all">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Mobil Disewa</p>
                <p className="text-3xl font-black text-gray-900">{stats.rentedCars}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Car className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 relative z-10">
              <span className="text-sm text-blue-600 font-medium">Sedang berjalan</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-card-hover transition-all">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-in-out"></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Mobil Diservis</p>
                <p className="text-3xl font-black text-gray-900">{stats.serviceCars}</p>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                <Car className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 relative z-10">
              <span className="text-sm text-red-600 font-medium">Sedang perbaikan</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-brand border border-gray-700 p-6 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Armada</p>
                <p className="text-3xl font-black text-white">{stats.totalCars}</p>
              </div>
              <div className="p-3 bg-gray-700/50 text-white rounded-xl backdrop-blur-sm">
                <Car className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 relative z-10 space-y-1">
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="bg-white h-1.5 rounded-full" style={{ width: `${(stats.availableCars / stats.totalCars) * 100}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 text-right">{Math.round((stats.availableCars / stats.totalCars) * 100)}% Ketersediaan</p>
            </div>
          </div>
        </div>

        {/* Customers & Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-card p-6 text-white relative overflow-hidden group hover:shadow-card-hover transition-all">
            <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-100 mb-1">Total Pelanggan</p>
                <p className="text-3xl font-bold">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-card p-6 text-white relative overflow-hidden group hover:shadow-card-hover transition-all">
            <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-100 mb-1">Pendapatan Hari Ini</p>
                <p className="text-2xl lg:text-3xl font-bold">Rp {stats.todayRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl shadow-brand-lg p-6 text-white relative overflow-hidden group hover:-translate-y-1 transition-all md:col-span-2 lg:col-span-1">
            <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-white/10 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-100 mb-1">Pendapatan Bulan Ini</p>
                <p className="text-2xl lg:text-3xl font-bold">Rp {stats.monthlyRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Grafik Harian</h2>
              <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">7 Hari Terakhir</span>
            </div>
            {revenueData.daily.labels.length > 0 ? (
              <div className="h-72">
                <Bar data={revenueData.daily} options={{...chartOptions, maintainAspectRatio: false}} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-gray-400 space-y-3">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Memuat data...</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Grafik Bulanan</h2>
              <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">6 Bulan Terakhir</span>
            </div>
            {revenueData.monthly.labels.length > 0 ? (
              <div className="h-72">
                <Line data={revenueData.monthly} options={{...chartOptions, maintainAspectRatio: false}} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-72 text-gray-400 space-y-3">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Memuat data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
