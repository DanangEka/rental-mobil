import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login"; // Ganti dari LoginClient/LoginAdmin jadi satu Login.jsx
import LandingPage from "./pages/LandingPage";
import ListMobil from "./pages/ListMobil";
import ManajemenPesanan from "./pages/ManajemenPesanan";
import CarManagement from "./pages/CarManagement";
import ClientManagement from "./pages/ClientManagement";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import CompanyProfile from "./pages/CompanyProfile";
import SignUp from "./pages/SignUp";
import HistoryPesanan from "./pages/HistoryPesanan";
import DriverDashboard from "./pages/DriverDashboard";
import DriverOrders from "./pages/DriverOrders";
import VehicleVerification from "./pages/VehicleVerification";
import PaymentVerification from "./pages/PaymentVerification";
import DriverProfile from "./pages/DriverProfile";
import AdminDriverManagement from "./pages/AdminDriverManagement";
import AdminVehicleVerifications from "./pages/AdminVehicleVerifications";
import AdminPaymentVerifications from "./pages/AdminPaymentVerifications";
import AdminDriverProfiles from "./pages/AdminDriverProfiles";
import AdminAddDriver from "./pages/AdminAddDriver";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/manajemen-pesanan"
          element={
            <ProtectedRoute role="admin">
              <ManajemenPesanan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/car-management"
          element={
            <ProtectedRoute role="admin">
              <CarManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-management"
          element={
            <ProtectedRoute role="admin">
              <ClientManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute role="client">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history-pesanan"
          element={
            <ProtectedRoute role="client">
              <HistoryPesanan />
            </ProtectedRoute>
          }
        />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute role={["client", "admin"]}>
              <ListMobil />
            </ProtectedRoute>
          }
        />

        {/* Driver Routes */}
        <Route
          path="/driver-dashboard"
          element={
            <ProtectedRoute role="driver">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-orders"
          element={
            <ProtectedRoute role="driver">
              <DriverOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicle-verification"
          element={
            <ProtectedRoute role="driver">
              <VehicleVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-verification"
          element={
            <ProtectedRoute role="driver">
              <PaymentVerification />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-profile"
          element={
            <ProtectedRoute role="driver">
              <DriverProfile />
            </ProtectedRoute>
          }
        />

        {/* Admin Driver Management Routes */}
        <Route
          path="/admin-driver-management"
          element={
            <ProtectedRoute role="admin">
              <AdminDriverManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-vehicle-verifications"
          element={
            <ProtectedRoute role="admin">
              <AdminVehicleVerifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-payment-verifications"
          element={
            <ProtectedRoute role="admin">
              <AdminPaymentVerifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-driver-profiles"
          element={
            <ProtectedRoute role="admin">
              <AdminDriverProfiles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-driver"
          element={
            <ProtectedRoute role="admin">
              <AdminAddDriver />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
