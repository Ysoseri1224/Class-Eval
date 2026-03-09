import { useState } from 'react'
import { authApi } from '../../api'

export default function ChangePassword() {
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(false)
    if (!oldPwd || !newPwd || !confirm) return setError('请填写所有字段')
    if (newPwd !== confirm) return setError('两次新密码不一致')
    if (newPwd.length < 4) return setError('新密码至少4位')
    setLoading(true)
    try {
      await authApi.changePassword({ old_password: oldPwd, new_password: newPwd })
      setSuccess(true)
      setOldPwd(''); setNewPwd(''); setConfirm('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold text-gray-900 mb-6">修改密码</h2>
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
            <input type="password" className="input" value={oldPwd} onChange={e => setOldPwd(e.target.value)} placeholder="请输入当前密码" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
            <input type="password" className="input" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="请输入新密码" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
            <input type="password" className="input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="请再次输入新密码" />
          </div>
          {error && <div className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2">密码修改成功！</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '提交中...' : '确认修改'}
          </button>
        </form>
      </div>
    </div>
  )
}
