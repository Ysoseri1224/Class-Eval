import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { authApi, classApi } from '../api'
import type { Class } from '../types'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<Class[]>([])
  const [classId, setClassId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    classApi.list().then((data: any) => setClasses(data)).catch(() => {})
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!classId) return setError('请选择班级')
    if (!username.trim()) return setError('请输入用户名')
    setLoading(true)
    try {
      await authApi.register({ username: username.trim(), password: password || '123456', class_id: Number(classId) })
      navigate('/login', { replace: true })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">学生注册</h1>
          <p className="text-gray-500 mt-1 text-sm">初始密码为 123456，可注册后修改</p>
        </div>
        <div className="card">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择班级</label>
              <select className="input" value={classId} onChange={e => setClassId(e.target.value)}>
                <option value="">-- 请选择班级 --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名（支持中文）</label>
              <input
                className="input"
                placeholder="请输入用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码（可选，默认 123456）</label>
              <input
                type="password"
                className="input"
                placeholder="不填则使用默认密码 123456"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? '注册中...' : '确认注册'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            已有账号？
            <Link to="/login" className="text-blue-600 hover:underline ml-1">返回登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
