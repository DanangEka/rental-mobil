import { useEffect, useState } from "react";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
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

        {/* Stats Cards Mobil */}
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
              <div className="p-3 bg-red-100 rounded-full">
                <Car className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Mobil Diservis</p>
                <p className="text-2xl font-bold text-gray-900">{stats.serviceCars}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-full">
                <Car className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Mobil</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCars}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customers & Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingUp className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendapatan Bulan Ini</p>
                <p className="text-2xl font-bold text-red-600">Rp {stats.monthlyRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
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
