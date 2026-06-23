import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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

import AdminOpenTrip from "./pages/AdminOpenTrip";
import OpenTrip from "./pages/OpenTrip";
import AdminTourPackages from "./pages/AdminTourPackages";
import TourPackages from "./pages/TourPackages";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/Toast";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        {/* ... other routes wrapped in PageTransition ... */}
        <Route
          path="/manajemen-pesanan"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><ManajemenPesanan /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/car-management"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><CarManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-management"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><ClientManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute role="client">
              <PageTransition><Profile /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history-pesanan"
          element={
            <ProtectedRoute role="client">
              <PageTransition><HistoryPesanan /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/company-profile" element={<PageTransition><CompanyProfile /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignUp /></PageTransition>} />
        <Route
          path="/home"
          element={
            <ProtectedRoute role={["client", "admin"]}>
              <PageTransition><ListMobil /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/open-trip"
          element={
            <ProtectedRoute role={["client", "admin"]}>
              <PageTransition><OpenTrip /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/open-trip"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminOpenTrip /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tour-packages"
          element={
            <ProtectedRoute role={["client", "admin"]}>
              <PageTransition><TourPackages /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-tour-packages"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminTourPackages /></PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Driver Routes */}
        <Route
          path="/driver-dashboard"
          element={
            <ProtectedRoute role="driver">
              <PageTransition><DriverDashboard /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-orders"
          element={
            <ProtectedRoute role="driver">
              <PageTransition><DriverOrders /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicle-verification"
          element={
            <ProtectedRoute role="driver">
              <PageTransition><VehicleVerification /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-verification"
          element={
            <ProtectedRoute role="driver">
              <PageTransition><PaymentVerification /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver-profile"
          element={
            <ProtectedRoute role="driver">
              <PageTransition><DriverProfile /></PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Admin Driver Management Routes */}
        <Route
          path="/admin-driver-management"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminDriverManagement /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-vehicle-verifications"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminVehicleVerifications /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-payment-verifications"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminPaymentVerifications /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-driver-profiles"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminDriverProfiles /></PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-add-driver"
          element={
            <ProtectedRoute role="admin">
              <PageTransition><AdminAddDriver /></PageTransition>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

function App() {
  return (
    <ToastProvider>
      <Router>
        <Navbar />
        <AnimatedRoutes />
      </Router>
    </ToastProvider>
  );
}

export default App;
