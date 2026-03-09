import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { userApi, classApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import Modal from '../../components/Modal'
import type { Class, Student } from '../../types'

export default function UserManageTeacher() {
  const { user } = useAuthStore()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [filterClass, setFilterClass] = useState('')
  const [newModal, setNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newClass, setNewClass] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const [s, c]: any[] = await Promise.all([
      userApi.students(filterClass ? Number(filterClass) : undefined),
      classApi.list()
    ])
    setStudents(s); setClasses(c)
  }

  useEffect(() => { load() }, [filterClass])

  const handleCreate = async () => {
    if (!newName.trim()) return setError('用户名不能为空')
    try {
      await userApi.createStudent({ username: newName.trim(), class_id: newClass ? Number(newClass) : undefined })
      setNewModal(false); setNewName(''); setNewClass(''); load()
    } catch (e: any) { setError(e.message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该学生？')) return
    await userApi.remove(id); load()
  }

  const handleResetPwd = async (id: number) => {
    if (!confirm('确认重置密码为 123456？')) return
    await userApi.resetPassword(id)
    alert('密码已重置为 123456')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">学生管理</h2>
        <button className="btn-primary" onClick={() => { setError(''); setNewModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />新建学生
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">按班级筛选：</label>
        <select className="input w-48" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">全部班级</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">序号</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">姓名</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">所在班级</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((s, i) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{s.username}</td>
                <td className="px-4 py-3 text-gray-600">{s.class_name || <span className="text-gray-300">未分配</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button className="btn-secondary text-xs py-1 px-2" onClick={() => handleResetPwd(s.id)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button className="btn-danger text-xs py-1 px-2" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">暂无学生</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={newModal} onClose={() => setNewModal(false)} title="新建学生账号">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名（支持中文）</label>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="请输入学生姓名" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所在班级</label>
            <select className="input" value={newClass} onChange={e => setNewClass(e.target.value)}>
              <option value="">-- 不指定班级 --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400">默认密码：123456</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setNewModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleCreate}>创建</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
