import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BookOpen, Users, School, FileText, Star, BarChart2, LogOut, Menu, X } from 'lucide-react'
import ClassManage from './ClassManage'
import UserManage from './UserManage'
import QuestionManage from './QuestionManage'
import SessionManage from './SessionManage'
import GradeManage from './GradeManage'

const navItems = [
  { to: '/admin/classes', icon: School, label: '班级管理' },
  { to: '/admin/users', icon: Users, label: '用户管理' },
  { to: '/admin/questions', icon: FileText, label: '试题管理' },
  { to: '/admin/sessions', icon: Star, label: '课堂管理' },
  { to: '/admin/grades', icon: BarChart2, label: '成绩管理' },
]

export default function AdminLayout() {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const [sideOpen, setSideOpen] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside className={`${sideOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          {sideOpen && <span className="font-bold text-gray-800 text-sm truncate">课堂评测系统</span>}
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sideOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-100">
          {sideOpen && (
            <div className="px-3 py-2 text-xs text-gray-400 truncate">
              管理员：{user?.username}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sideOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSideOpen(!sideOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sideOpen ? <X className="w-4 h-4 text-gray-600" /> : <Menu className="w-4 h-4 text-gray-600" />}
          </button>
          <h1 className="text-base font-semibold text-gray-800">管理员控制台</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="classes" element={<ClassManage />} />
            <Route path="users" element={<UserManage />} />
            <Route path="questions" element={<QuestionManage />} />
            <Route path="sessions" element={<SessionManage />} />
            <Route path="grades" element={<GradeManage />} />
            <Route path="*" element={<ClassManage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
