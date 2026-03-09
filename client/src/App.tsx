import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminLayout from './pages/admin/AdminLayout'
import TeacherLayout from './pages/teacher/TeacherLayout'
import StudentLayout from './pages/student/StudentLayout'
import ErrorBoundary from './components/ErrorBoundary'

function RequireAuth({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user, token } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin/*"
            element={
              <RequireAuth roles={['admin']}>
                <AdminLayout />
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/*"
            element={
              <RequireAuth roles={['teacher']}>
                <TeacherLayout />
              </RequireAuth>
            }
          />
          <Route
            path="/student/*"
            element={
              <RequireAuth roles={['student']}>
                <StudentLayout />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              user
                ? <Navigate to={`/${user.role}`} replace />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
