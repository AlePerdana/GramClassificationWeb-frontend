import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Login from './pages/auth/Login';
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Route Login (Tanpa Layout Sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* --- ROUTE ADMIN --- */}
        <Route path="/admin" element={<MainLayout role="admin" />}>
          <Route index element={<DashboardAdmin />} />
          <Route path="patients" element={<PatientManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="models" element={<ModelManagement />} />
        </Route>

        {/* --- ROUTE DOKTER --- */}
        <Route path="/doctor" element={<MainLayout role="dokter" />}>
          <Route index element={<DashboardDoctor />} />
          <Route path="validation" element={<ValidationList />} />
          <Route path="validate/:specimenId" element={<ValidationDetail />} />
          <Route path="validation/:specimenId" element={<ValidationDetail />} />
          <Route path="history" element={<DoctorHistory />} />
          <Route path="history/:id" element={<HistoryDetail />} />
        </Route>

        {/* Halaman cetak laporan (fullscreen, tanpa sidebar) */}
        <Route path="/doctor/report/:id" element={<MedicalReport />} />

        {/* --- ROUTE ANALIS --- */}
        <Route path="/analyst" element={<MainLayout role="analis" />}>
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