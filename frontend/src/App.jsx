import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentTool from './pages/StudentTool';
import AdminDashboard from './pages/AdminDashboard';
import BridgePage from './pages/BridgePage';
import AcademicIntegrityGuide from './pages/AcademicIntegrityGuide';
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<StudentTool />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/baca/:id" element={<BridgePage />} />
        <Route path="/panduan-integritas" element={<AcademicIntegrityGuide />} />
      </Routes>
    </div>
  );
}

export default App;
