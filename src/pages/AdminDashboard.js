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
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: '#ef4444',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: '#ef4444',
      }],
    },
    monthly: {
      labels: [],
      datasets: [{
        label: 'Pendapatan Bulanan',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
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
      legend: { 
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: { weight: 'bold', family: 'Inter' },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        padding: 16,
        cornerRadius: 16,
        displayColors: true,
        boxPadding: 8,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#6b7280', 
          font: { weight: 'bold', size: 11 },
          padding: 10
        }
      },
      y: {
        beginAtZero: true,
        grid: { 
          color: 'rgba(75, 85, 99, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: { weight: 'bold', size: 11 },
          padding: 10,
          callback: (value) => 'Rp ' + (value >= 1000000 ? (value / 1000000).toFixed(1) + 'jt' : value.toLocaleString()),
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="animate-pulse space-y-8 mt-6 md:mt-10">
            <div className="h-12 bg-gray-800 rounded-2xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-[72px] pb-12 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0000] to-black"></div>
        <div className="absolute top-[5%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-900/10 mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[5%] w-[45vw] h-[45vw] rounded-full bg-red-900/10 mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-6 md:mb-10 pt-8 animate-fadeInUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Admin Dashboard</h1>
              <p className="text-gray-400 text-lg">Ringkasan performa dan metrik ekosistem armada.</p>
            </div>
          </div>
        </div>

        {/* Stats Cards Mobil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-10 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800 p-4 md:p-6 flex flex-col justify-between group hover:border-green-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Mobil Tersedia</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{stats.availableCars}</p>
              </div>
              <div className="p-3 bg-green-500/20 text-green-400 rounded-2xl">
                <Car size={24} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800/50">
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Siap Disewakan</span>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800 p-4 md:p-6 flex flex-col justify-between group hover:border-blue-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Mobil Disewa</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{stats.rentedCars}</p>
              </div>
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
                <Car size={24} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800/50">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Sedang Berjalan</span>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800 p-4 md:p-6 flex flex-col justify-between group hover:border-red-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Mobil Diservis</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{stats.serviceCars}</p>
              </div>
              <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl">
                <Car size={24} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800/50">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Sedang Perbaikan</span>
            </div>
          </div>

          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-3xl border border-gray-800 p-4 md:p-6 flex flex-col justify-between group hover:border-brand-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Armada</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{stats.totalCars}</p>
              </div>
              <div className="p-3 bg-brand-500/20 text-brand-400 rounded-2xl">
                <Car size={24} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800/50 space-y-2">
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(stats.availableCars / stats.totalCars) * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-400 text-right font-black uppercase tracking-widest italic">{Math.round((stats.availableCars / stats.totalCars) * 100)}% Ketersediaan</p>
            </div>
          </div>
        </div>

        {/* Customers & Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-800/20 glass-card rounded-2xl md:rounded-3xl border border-indigo-500/20 p-4 sm:p-6 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-indigo-500/40 transition-all">
            <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Users size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Total Pelanggan</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{stats.totalCustomers}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-teal-800/20 glass-card rounded-2xl md:rounded-3xl border border-emerald-500/20 p-4 sm:p-6 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-emerald-500/40 transition-all">
            <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-500/10">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">Pendapatan Hari Ini</p>
              <p className="text-2xl md:text-3xl font-black text-white tracking-tighter">Rp {stats.todayRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600/20 to-red-800/20 glass-card rounded-2xl md:rounded-3xl border border-brand-500/20 p-4 sm:p-6 md:p-8 flex items-center gap-4 md:gap-6 group hover:border-brand-500/40 transition-all md:col-span-2 lg:col-span-1">
            <div className="p-4 bg-brand-500/20 rounded-2xl text-brand-400 shadow-lg shadow-brand-500/10">
              <TrendingUp size={32} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-300 uppercase tracking-widest mb-1">Pendapatan Bulan Ini</p>
              <p className="text-2xl md:text-3xl font-black text-white tracking-tighter">Rp {stats.monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 animate-fadeInUp" style={{ animationDelay: "0.4s" }}>
          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] border border-gray-800 p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Grafik Harian</h2>
              <span className="text-[10px] font-black px-4 py-1.5 bg-gray-800/50 text-brand-400 border border-brand-500/20 rounded-full uppercase tracking-widest">7 Hari Terakhir</span>
            </div>
            {revenueData.daily.labels.length > 0 ? (
              <div className="h-80">
                <Bar data={revenueData.daily} options={{...chartOptions, maintainAspectRatio: false}} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-600 space-y-4">
                <div className="w-12 h-12 border-4 border-gray-800 border-t-brand-500 rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest">Sinkronisasi Data...</p>
              </div>
            )}
          </div>

          <div className="glass-card bg-gray-900/40 rounded-2xl md:rounded-[2.5rem] border border-gray-800 p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Grafik Bulanan</h2>
              <span className="text-[10px] font-black px-4 py-1.5 bg-gray-800/50 text-blue-400 border border-blue-500/20 rounded-full uppercase tracking-widest">6 Bulan Terakhir</span>
            </div>
            {revenueData.monthly.labels.length > 0 ? (
              <div className="h-80">
                <Line data={revenueData.monthly} options={{...chartOptions, maintainAspectRatio: false}} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-80 text-gray-600 space-y-4">
                <div className="w-12 h-12 border-4 border-gray-800 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest">Sinkronisasi Data...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
