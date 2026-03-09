import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, BookOpen } from 'lucide-react'
import { authApi, classApi, userApi } from '../api'
import { useAuthStore } from '../store/authStore'
import type { Class } from '../types'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'student' | 'teacher' | null>(null)
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<{ id: number; username: string }[]>([])
  const [classId, setClassId] = useState('')
  const [usernameSearch, setUsernameSearch] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSelectMode = async (m: 'student' | 'teacher') => {
    setMode(m)
    setError('')
    if (m === 'student') {
      try {
        const data: any = await classApi.list()
        setClasses(data)
      } catch {}
    }
  }

  const handleClassChange = async (cid: string) => {
    setClassId(cid)
    setUsername('')
    setUsernameSearch('')
    setStudents([])
    if (cid) {
      try {
        const data: any = await userApi.studentsByClass(Number(cid))
        setStudents(data)
      } catch {}
    }
  }

  const handleUsernameSearch = async (val: string) => {
    setUsernameSearch(val)
    setUsername(val)
    if (classId) {
      try {
        const data: any = await userApi.studentsByClass(Number(classId), val)
        setStudents(data)
      } catch {}
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username) return setError('请输入用户名')
    if (!password) return setError('请输入密码')
    setLoading(true)
    try {
      const data: any = await authApi.login({
        username,
        password,
        role: mode === 'student' ? 'student' : undefined,
      })
      setAuth(data.token, data.user)
      const role = data.user.role
      navigate(`/${role}`, { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!mode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">课堂评测系统</h1>
            <p className="text-gray-500 mt-2">请选择您的身份</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSelectMode('teacher')}
              className="card flex flex-col items-center py-10 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                <GraduationCap className="w-8 h-8 text-indigo-600" />
              </div>
              <span className="text-lg font-semibold text-gray-800">我是教师</span>
              <span className="text-sm text-gray-400 mt-1">教师 / 管理员</span>
            </button>
            <button
              onClick={() => handleSelectMode('student')}
              className="card flex flex-col items-center py-10 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <span className="text-lg font-semibold text-gray-800">我是学生</span>
              <span className="text-sm text-gray-400 mt-1">学生端登录</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'student' ? '学生登录' : '教师 / 管理员登录'}
          </h1>
        </div>
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            {mode === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择班级</label>
                <select
                  className="input"
                  value={classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <option value="">-- 请选择班级 --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'student' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  className="input"
                  placeholder="搜索或输入用户名"
                  value={usernameSearch}
                  onChange={(e) => handleUsernameSearch(e.target.value)}
                  list="student-list"
                  disabled={!classId}
                />
                <datalist id="student-list">
                  {students.map((s) => (
                    <option key={s.id} value={s.username} />
                  ))}
                </datalist>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  className="input"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                className="input"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? '登录中...' : '确认登录'}
            </button>
          </form>

          {mode === 'student' && (
            <p className="text-center text-sm text-gray-500 mt-4">
              没有账号？
              <Link to="/register" className="text-blue-600 hover:underline ml-1">立即注册</Link>
            </p>
          )}
          <button
            onClick={() => setMode(null)}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3"
          >
            ← 返回选择身份
          </button>
        </div>
      </div>
    </div>
  )
}
