import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/user/HomePage';
import RegisterPage from './pages/user/RegisterPage';
import MyPage from './pages/user/MyPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCreate from './pages/admin/AdminCreate';
import AdminCreateStep2 from './pages/admin/AdminCreateStep2';
import AdminStatus from './pages/admin/AdminStatus';
import AdminHistory from './pages/admin/AdminHistory';
import AdminWhitelist from './pages/admin/AdminWhitelist';
import AdminMail from './pages/admin/AdminMail';
import AdminMailCreate from './pages/admin/AdminMailCreate';
import AdminUsers from './pages/admin/AdminUsers';
import AdminManagers from './pages/admin/AdminManagers';
import AdminCopyPage from './pages/admin/AdminCopyPage';
import AdminDetailPage from './pages/admin/AdminDetailPage';
import AdminQuestionConfig from './pages/admin/AdminQuestionConfig';

function ProtectedRoute({ children, requireAdmin }) {
  const { isLoggedIn, isAdmin } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/register" element={<ProtectedRoute><RegisterPage /></ProtectedRoute>} />
      <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/create" element={<ProtectedRoute requireAdmin><AdminCreate /></ProtectedRoute>} />
      <Route path="/admin/create/step2" element={<ProtectedRoute requireAdmin><AdminCreateStep2 /></ProtectedRoute>} />
      <Route path="/admin/copy" element={<ProtectedRoute requireAdmin><AdminCopyPage /></ProtectedRoute>} />
      <Route path="/admin/status" element={<ProtectedRoute requireAdmin><AdminStatus /></ProtectedRoute>} />
      <Route path="/admin/history" element={<ProtectedRoute requireAdmin><AdminHistory /></ProtectedRoute>} />
      <Route path="/admin/whitelist" element={<ProtectedRoute requireAdmin><AdminWhitelist /></ProtectedRoute>} />
      <Route path="/admin/mail" element={<ProtectedRoute requireAdmin><AdminMail /></ProtectedRoute>} />
      <Route path="/admin/mail/create" element={<ProtectedRoute requireAdmin><AdminMailCreate /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/managers" element={<ProtectedRoute requireAdmin><AdminManagers /></ProtectedRoute>} />
      <Route path="/admin/templates/:templateId" element={<ProtectedRoute requireAdmin><AdminDetailPage /></ProtectedRoute>} />
      <Route path="/admin/questions" element={<ProtectedRoute requireAdmin><AdminQuestionConfig /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
