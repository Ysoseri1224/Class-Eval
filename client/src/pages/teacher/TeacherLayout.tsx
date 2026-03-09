import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BookOpen, Users, FileText, Star, BarChart2, LogOut, Menu, X, KeyRound } from 'lucide-react'
import UserManageTeacher from './UserManageTeacher'
import QuestionManage from '../admin/QuestionManage'
import SessionManageTeacher from './SessionManageTeacher'
import GradeManage from '../admin/GradeManage'
import ChangePassword from './ChangePassword'

const navItems = [
  { to: '/teacher/users', icon: Users, label: '学生管理' },
  { to: '/teacher/questions', icon: FileText, label: '试题管理' },
  { to: '/teacher/sessions', icon: Star, label: '课堂管理' },
  { to: '/teacher/grades', icon: BarChart2, label: '查看成绩' },
  { to: '/teacher/password', icon: KeyRound, label: '修改密码' },
]

export default function TeacherLayout() {
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()
  const [sideOpen, setSideOpen] = useState(true)

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sideOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shrink-0`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          {sideOpen && <span className="font-bold text-gray-800 text-sm truncate">教师端</span>}
        </div>
        <nav className="flex-1 py-3 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              {sideOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-100">
          {sideOpen && <div className="px-3 py-2 text-xs text-gray-400 truncate">教师：{user?.username}</div>}
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            {sideOpen && <span>退出登录</span>}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSideOpen(!sideOpen)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {sideOpen ? <X className="w-4 h-4 text-gray-600" /> : <Menu className="w-4 h-4 text-gray-600" />}
          </button>
          <h1 className="text-base font-semibold text-gray-800">教师控制台</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="users" element={<UserManageTeacher />} />
            <Route path="questions" element={<QuestionManage />} />
            <Route path="sessions" element={<SessionManageTeacher />} />
            <Route path="grades" element={<GradeManage />} />
            <Route path="password" element={<ChangePassword />} />
            <Route path="*" element={<UserManageTeacher />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
