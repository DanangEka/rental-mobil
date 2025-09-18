import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
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
        backgroundColor: 'rgba(153, 0, 0, 0.6)',
        borderColor: 'rgba(153, 0, 0, 1)',
        borderWidth: 1,
      }],
    },
    monthly: {
      labels: [],
      datasets: [{
        label: 'Pendapatan Bulanan',
        data: [],
        borderColor: 'rgba(153, 0, 0, 1)',
        backgroundColor: 'rgba(153, 0, 0, 0.1)',
        tension: 0.4,
      }],
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch cars stats
        const carsQuery = collection(db, "mobil");
        const carsSnapshot = await getDocs(carsQuery);
        let available = 0;
        let rented = 0;

        carsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "tersedia") {
            available++;
          } else if (data.status === "disewa") {
            rented++;
          }
        });

        // Fetch customers count
        const customersQuery = collection(db, "users");
        const customersSnapshot = await getDocs(customersQuery);
        const totalCustomers = customersSnapshot.size;

        // Fetch orders for revenue calculation
        const ordersQuery = collection(db, "pemesanan");
        const ordersSnapshot = await getDocs(ordersQuery);

        let todayRevenue = 0;
        let monthlyRevenue = 0;
        const dailyRevenue = {};
        const monthlyRevenueData = {};

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        ordersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "selesai" && data.perkiraanHarga) {
            const orderDate = data.tanggalMulai?.toDate();

            if (orderDate) {
              // Daily revenue
              const dayKey = orderDate.toDateString();
              if (!dailyRevenue[dayKey]) {
                dailyRevenue[dayKey] = 0;
              }
              dailyRevenue[dayKey] += data.perkiraanHarga;

              // Monthly revenue
              const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth() + 1}`;
              if (!monthlyRevenueData[monthKey]) {
                monthlyRevenueData[monthKey] = 0;
              }
              monthlyRevenueData[monthKey] += data.perkiraanHarga;

              // Today's revenue
              if (orderDate.toDateString() === today.toDateString()) {
                todayRevenue += data.perkiraanHarga;
              }

              // Monthly revenue
              if (orderDate >= startOfMonth) {
                monthlyRevenue += data.perkiraanHarga;
              }
            }
          }
        });

        // Prepare chart data
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

        setStats({
          availableCars: available,
          rentedCars: rented,
          totalCustomers,
          todayRevenue,
          monthlyRevenue,
        });

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
        console.error("Error fetching dashboard stats:", error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'Rp ' + value.toLocaleString();
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Car className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mobil Tersedia</p>
                <p className="text-2xl font-bold text-gray-900">{stats.availableCars}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Car className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mobil Disewa</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rentedCars}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pelanggan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendapatan Hari Ini</p>
                <p className="text-2xl font-bold text-gray-900">Rp {stats.todayRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Pendapatan Bulan Ini</h2>
          </div>
          <p className="text-3xl font-bold text-red-600">Rp {stats.monthlyRevenue.toLocaleString()}</p>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grafik Pendapatan Harian (7 Hari Terakhir)</h2>
            {revenueData.daily.labels.length > 0 ? (
              <Bar data={revenueData.daily} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Memuat data grafik...
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grafik Pendapatan Bulanan (6 Bulan Terakhir)</h2>
            {revenueData.monthly.labels.length > 0 ? (
              <Line data={revenueData.monthly} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Memuat data grafik...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
