import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
import authService from './service/authService';
import DashboardAdmin from './pages/admin/Dashboard';
import DashboardAnalyst from './pages/analyst/Dashboard';
import DashboardDoctor from './pages/doctor/Dashboard';
import PatientManagement from './pages/admin/PatientManagement';
import UserManagement from './pages/admin/UserManagement';
import ModelManagement from './pages/admin/ModelManagement';
import PatientList from './pages/analyst/PatientList';
import AnalysisProcess from './pages/analyst/AnalysisProcess';
import AnalystHistory from './pages/analyst/History';
import ValidationList from './pages/doctor/ValidationList';
import ValidationDetail from './pages/doctor/ValidationDetail';
import DoctorHistory from './pages/doctor/History';
import MedicalReport from './pages/doctor/MedicalReport';
import HistoryDetail from './pages/shared/HistoryDetail';

// Dummy component untuk halaman lain (biar link di sidebar tidak 404)
const PlaceholderPage = ({ title }) => <h1 className="text-xl text-gray-500">{title} (Segera Hadir)</h1>;

const homePathForRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'dokter') return '/doctor';
  if (role === 'analis') return '/analyst';
  return '/login';
};

const RequireRole = ({ requiredRole, children }) => {
  if (!authService.isLoggedIn()) {
    authService.clearSession();
    return <Navigate to="/login" replace />;
  }

  const currentRole = authService.getRole();
  if (!currentRole) {
    authService.clearSession();
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentRole !== requiredRole) {
    return <Navigate to={homePathForRole(currentRole)} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Route Login (Tanpa Layout Sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* --- ROUTE ADMIN --- */}
        <Route
          path="/admin"
          element={
            <RequireRole requiredRole="admin">
              <MainLayout role="admin" />
            </RequireRole>
          }
        >
          <Route index element={<DashboardAdmin />} />
          <Route path="patients" element={<PatientManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="models" element={<ModelManagement />} />
        </Route>

        {/* --- ROUTE DOKTER --- */}
        <Route
          path="/doctor"
          element={
            <RequireRole requiredRole="dokter">
              <MainLayout role="dokter" />
            </RequireRole>
          }
        >
          <Route index element={<DashboardDoctor />} />
          <Route path="validation" element={<ValidationList />} />
          <Route path="validate/:specimenId" element={<ValidationDetail />} />
          <Route path="validation/:specimenId" element={<ValidationDetail />} />
          <Route path="history" element={<DoctorHistory />} />
          <Route path="history/:id" element={<HistoryDetail />} />
        </Route>

        {/* Halaman cetak laporan (fullscreen, tanpa sidebar) */}
        <Route
          path="/doctor/report/:id"
          element={
            <RequireRole requiredRole="dokter">
              <MedicalReport />
            </RequireRole>
          }
        />

        {/* --- ROUTE ANALIS --- */}
        <Route
          path="/analyst"
          element={
            <RequireRole requiredRole="analis">
              <MainLayout role="analis" />
            </RequireRole>
          }
        >
          <Route index element={<DashboardAnalyst />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="classification/:id" element={<AnalysisProcess />} />
          <Route path="process/:id" element={<AnalysisProcess />} />
          <Route path="history" element={<AnalystHistory />} />
          <Route path="history/:id" element={<HistoryDetail />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<div className="p-10 text-center text-red-500">Halaman tidak ditemukan</div>} />
      </Routes>
    </Router>
  );
}

export default App;