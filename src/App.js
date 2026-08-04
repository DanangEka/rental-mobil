import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/Toast";

// ── Lazy-loaded pages ──────────────────────────────────────────────────────
const Login                    = lazy(() => import("./pages/Login"));
const LandingPage              = lazy(() => import("./pages/LandingPage"));
const ListMobil                = lazy(() => import("./pages/ListMobil"));
const ManajemenPesanan         = lazy(() => import("./pages/ManajemenPesanan"));
const CarManagement            = lazy(() => import("./pages/CarManagement"));
const ClientManagement         = lazy(() => import("./pages/ClientManagement"));
const AdminDashboard           = lazy(() => import("./pages/AdminDashboard"));
const Profile                  = lazy(() => import("./pages/Profile"));
const CompanyProfile           = lazy(() => import("./pages/CompanyProfile"));
const SignUp                   = lazy(() => import("./pages/SignUp"));
const HistoryPesanan           = lazy(() => import("./pages/HistoryPesanan"));
const DriverDashboard          = lazy(() => import("./pages/DriverDashboard"));
const DriverOrders             = lazy(() => import("./pages/DriverOrders"));
const VehicleVerification      = lazy(() => import("./pages/VehicleVerification"));
const PaymentVerification      = lazy(() => import("./pages/PaymentVerification"));
const DriverProfile            = lazy(() => import("./pages/DriverProfile"));
const AdminDriverManagement    = lazy(() => import("./pages/AdminDriverManagement"));
const AdminVehicleVerifications= lazy(() => import("./pages/AdminVehicleVerifications"));
const AdminPaymentVerifications= lazy(() => import("./pages/AdminPaymentVerifications"));
const AdminDriverProfiles      = lazy(() => import("./pages/AdminDriverProfiles"));
const AdminAddDriver           = lazy(() => import("./pages/AdminAddDriver"));
const AdminOpenTrip            = lazy(() => import("./pages/AdminOpenTrip"));
const OpenTrip                 = lazy(() => import("./pages/OpenTrip"));
const AdminTourPackages        = lazy(() => import("./pages/AdminTourPackages"));
const TourPackages             = lazy(() => import("./pages/TourPackages"));

// ── Suspense fallback — full-screen charcoal/gold spinner ──────────────────
function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#C9A84C] animate-spin" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Memuat…
        </p>
      </div>
    </div>
  );
}

// ── Page transition wrapper ────────────────────────────────────────────────
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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login"   element={<PageTransition><Login /></PageTransition>} />
        <Route path="/signup"  element={<PageTransition><SignUp /></PageTransition>} />
        <Route path="/company-profile" element={<PageTransition><CompanyProfile /></PageTransition>} />

        {/* Client / Admin routes */}
        <Route
          path="/manajemen-pesanan"
          element={<ProtectedRoute role="admin"><PageTransition><ManajemenPesanan /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/car-management"
          element={<ProtectedRoute role="admin"><PageTransition><CarManagement /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/client-management"
          element={<ProtectedRoute role="admin"><PageTransition><ClientManagement /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/admin-dashboard"
          element={<ProtectedRoute role="admin"><PageTransition><AdminDashboard /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/profil"
          element={<ProtectedRoute role="client"><PageTransition><Profile /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/history-pesanan"
          element={<ProtectedRoute role="client"><PageTransition><HistoryPesanan /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/home"
          element={<PageTransition><ListMobil /></PageTransition>}
        />
        <Route
          path="/open-trip"
          element={<PageTransition><OpenTrip /></PageTransition>}
        />
        <Route
          path="/admin/open-trip"
          element={<ProtectedRoute role="admin"><PageTransition><AdminOpenTrip /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/tour-packages"
          element={<PageTransition><TourPackages /></PageTransition>}
        />
        <Route
          path="/admin-tour-packages"
          element={<ProtectedRoute role="admin"><PageTransition><AdminTourPackages /></PageTransition></ProtectedRoute>}
        />

        {/* Driver routes */}
        <Route
          path="/driver-dashboard"
          element={<ProtectedRoute role="driver"><PageTransition><DriverDashboard /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/driver-orders"
          element={<ProtectedRoute role="driver"><PageTransition><DriverOrders /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/vehicle-verification"
          element={<ProtectedRoute role="driver"><PageTransition><VehicleVerification /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/payment-verification"
          element={<ProtectedRoute role="driver"><PageTransition><PaymentVerification /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/driver-profile"
          element={<ProtectedRoute role="driver"><PageTransition><DriverProfile /></PageTransition></ProtectedRoute>}
        />

        {/* Admin driver management */}
        <Route
          path="/admin-driver-management"
          element={<ProtectedRoute role="admin"><PageTransition><AdminDriverManagement /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/admin-vehicle-verifications"
          element={<ProtectedRoute role="admin"><PageTransition><AdminVehicleVerifications /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/admin-payment-verifications"
          element={<ProtectedRoute role="admin"><PageTransition><AdminPaymentVerifications /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/admin-driver-profiles"
          element={<ProtectedRoute role="admin"><PageTransition><AdminDriverProfiles /></PageTransition></ProtectedRoute>}
        />
        <Route
          path="/admin-add-driver"
          element={<ProtectedRoute role="admin"><PageTransition><AdminAddDriver /></PageTransition></ProtectedRoute>}
        />

        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Navbar />
        <Suspense fallback={<PageLoadingFallback />}>
          <AnimatedRoutes />
        </Suspense>
      </Router>
    </ToastProvider>
  );
}

export default App;
