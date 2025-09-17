import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login"; // Ganti dari LoginClient/LoginAdmin jadi satu Login.jsx
import LandingPage from "./pages/LandingPage";
import ListMobil from "./pages/ListMobil";
import AdminDashboard from "./pages/AdminDashboard";
import CarManagement from "./pages/CarManagement";
import ClientManagement from "./pages/ClientManagement";
import Profile from "./pages/Profile";
import CompanyProfile from "./pages/CompanyProfile";
import SignUp from "./pages/SignUp";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
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
          path="/profil"
          element={
            <ProtectedRoute role="client">
              <Profile />
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

        <Route path="/" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
