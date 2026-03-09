import { useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BookOpen, Star, Users, LogOut } from 'lucide-react'
import { io, Socket } from 'socket.io-client'
import ExamPage from './ExamPage'
import SelfEvalPage from './SelfEvalPage'
import PeerEvalPage from './PeerEvalPage'

export default function StudentLayout() {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] })
    if (user?.id) socketRef.current.emit('user_login', user.id)
    return () => { socketRef.current?.disconnect() }
  }, [user?.id])

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  const navItems = [
    { to: '/student/exam', icon: BookOpen, label: '答题' },
    { to: '/student/self-eval', icon: Star, label: '自评' },
    { to: '/student/peer-eval', icon: Users, label: '互评' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-800">课堂评测</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.username}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
              <LogOut className="w-4 h-4" />退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Routes>
          <Route path="exam" element={<ExamPage />} />
          <Route path="self-eval" element={<SelfEvalPage />} />
          <Route path="peer-eval" element={<PeerEvalPage />} />
          <Route path="*" element={<ExamPage />} />
        </Routes>
      </main>
    </div>
  )
}
