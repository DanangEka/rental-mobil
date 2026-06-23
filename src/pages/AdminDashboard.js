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
  Filler,
} from "chart.js";
import { Car, Users, DollarSign, TrendingUp, ChevronRight, LayoutDashboard } from "lucide-react";

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
        backgroundColor: 'rgba(153, 0, 0, 0.7)',
        borderColor: '#990000',
        borderWidth: 0,
        borderRadius: 6,
        hoverBackgroundColor: '#990000',
        barThickness: 20,
      }],
    },
    monthly: {
      labels: [],
      datasets: [{
        label: 'Pendapatan Bulanan',
        data: [],
        borderColor: '#990000',
        backgroundColor: 'rgba(153, 0, 0, 0.05)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#990000',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3,
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

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (usersSnapshot) => {
      setStats((prev) => ({ ...prev, totalCustomers: usersSnapshot.size }));
    });

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

        const last7Days = [];
        const dailyValues = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayKey = date.toDateString();
          last7Days.push(date.toLocaleDateString('id-ID', { weekday: 'short' }));
          dailyValues.push(dailyRevenue[dayKey] || 0);
        }

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
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#111827',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#9ca3af', 
          font: { size: 10, weight: '500' },
          padding: 8
        }
      },
      y: {
        beginAtZero: true,
        grid: { 
          color: '#f3f4f6',
          drawBorder: false
        },
        ticks: {
          color: '#9ca3af',
          font: { size: 10, weight: '500' },
          padding: 8,
          callback: (value) => value >= 1000000 ? (value / 1000000).toFixed(1) + 'jt' : value.toLocaleString(),
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-[160px] pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-gray-200 rounded-lg w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-2xl shadow-sm border border-gray-100"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-[160px] pb-12 text-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-bold text-xs uppercase tracking-widest mb-2">
              <LayoutDashboard size={14} />
              <span>Admin Control Panel</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Ringkasan performa sistem dan armada Cakra Lima Tujuh.</p>
          </div>
        </div>

        {/* Stats Cards Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Mobil Tersedia", val: stats.availableCars, icon: <Car size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
            { label: "Mobil Disewa", val: stats.rentedCars, icon: <Car size={20} />, color: "text-[#990000]", bg: "bg-red-50", border: "border-red-100" },
            { label: "Mobil Diservis", val: stats.serviceCars, icon: <Car size={20} />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
            { label: "Total Pelanggan", val: stats.totalCustomers, icon: <Users size={20} />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${item.bg} ${item.color} rounded-xl group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <ChevronRight size={16} className="text-gray-300" />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{item.label}</p>
              <p className="text-3xl font-black text-slate-900">{item.val.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Revenue Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex items-center gap-6 group">
            <div className="w-16 h-16 bg-red-50 text-[#990000] rounded-2xl flex items-center justify-center flex-shrink-0">
              <DollarSign size={32} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pendapatan Hari Ini</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-gray-400">Rp</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">{stats.todayRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#990000] rounded-2xl shadow-lg p-8 flex items-center gap-6 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
            <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center flex-shrink-0 relative z-10 backdrop-blur-sm">
              <TrendingUp size={32} />
            </div>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-bold text-red-200 uppercase tracking-widest mb-1">Pendapatan Bulan Ini</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-red-200">Rp</span>
                <span className="text-3xl font-black text-white tracking-tighter">{stats.monthlyRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Analisis Harian</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">7 Hari Terakhir</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#990000]" />
            </div>
            <div className="h-64">
              {revenueData.daily.labels.length > 0 ? (
                <Bar data={revenueData.daily} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">Memuat Data...</div>
              )}
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Performa Bulanan</h3>
                <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">6 Bulan Terakhir</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="h-64">
              {revenueData.monthly.labels.length > 0 ? (
                <Line data={revenueData.monthly} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">Memuat Data...</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Fleet Summary Card */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
              <Car size={28} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Total Armada Terdaftar</h4>
              <p className="text-slate-500 pr-4">Total unit kendaraan dalam sistem manajemen saat ini.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8 w-full md:w-auto">
             <div className="flex-1 md:w-48">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Utilisasi Armada</span>
                  <span className="text-xs font-black text-slate-900">{Math.round(((stats.totalCars - stats.availableCars) / stats.totalCars) * 100) || 0}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#990000] transition-all duration-1000 ease-out" 
                    style={{ width: `${((stats.totalCars - stats.availableCars) / stats.totalCars) * 100}%` }}
                  />
                </div>
             </div>
             <div className="text-4xl font-black text-slate-900">{stats.totalCars}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
