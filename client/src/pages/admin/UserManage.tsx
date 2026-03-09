import { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, Settings } from 'lucide-react'
import { userApi, classApi } from '../../api'
import Modal from '../../components/Modal'
import type { Class, Teacher, Student } from '../../types'

export default function UserManage() {
  const [tab, setTab] = useState<'teacher' | 'student'>('teacher')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)

  // 新建教师
  const [newTeacherModal, setNewTeacherModal] = useState(false)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherPwd, setNewTeacherPwd] = useState('')

  // 新建学生
  const [newStudentModal, setNewStudentModal] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentClass, setNewStudentClass] = useState('')

  // 编辑教师班级权限
  const [editTeacherModal, setEditTeacherModal] = useState(false)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<{ class_id: number; permission: 'view' | 'edit'; is_head_teacher: number }[]>([])

  // 编辑学生班级
  const [editStudentModal, setEditStudentModal] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editStudentClass, setEditStudentClass] = useState('')

  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [t, s, c]: any[] = await Promise.all([
        userApi.teachers(), userApi.students(), classApi.list()
      ])
      setTeachers(t); setStudents(s); setClasses(c)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreateTeacher = async () => {
    if (!newTeacherName.trim() || !newTeacherPwd.trim()) return setError('用户名和密码不能为空')
    try {
      await userApi.createTeacher({ username: newTeacherName.trim(), password: newTeacherPwd.trim() })
      setNewTeacherModal(false); setNewTeacherName(''); setNewTeacherPwd(''); load()
    } catch (e: any) { setError(e.message) }
  }

  const handleCreateStudent = async () => {
    if (!newStudentName.trim()) return setError('用户名不能为空')
    try {
      await userApi.createStudent({ username: newStudentName.trim(), class_id: newStudentClass ? Number(newStudentClass) : undefined })
      setNewStudentModal(false); setNewStudentName(''); setNewStudentClass(''); load()
    } catch (e: any) { setError(e.message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该用户？')) return
    await userApi.remove(id); load()
  }

  const handleResetPwd = async (id: number) => {
    if (!confirm('确认重置密码为 123456？')) return
    await userApi.resetPassword(id)
    alert('密码已重置为 123456')
  }

  const openEditTeacher = (t: Teacher) => {
    setEditTeacher(t)
    setTeacherClasses(t.classes.map(c => ({ class_id: c.id, permission: c.permission, is_head_teacher: c.is_head_teacher })))
    setError('')
    setEditTeacherModal(true)
  }

  const handleSaveTeacherClasses = async () => {
    if (!editTeacher) return
    try {
      await userApi.updateTeacherClasses(editTeacher.id, teacherClasses)
      setEditTeacherModal(false); load()
    } catch (e: any) { setError(e.message) }
  }

  const addTeacherClass = () => {
    const available = classes.find(c => !teacherClasses.find(tc => tc.class_id === c.id))
    if (available) setTeacherClasses([...teacherClasses, { class_id: available.id, permission: 'view', is_head_teacher: 0 }])
  }

  const openEditStudent = (s: Student) => {
    setEditStudent(s)
    setEditStudentClass(String(s.class_id || ''))
    setError('')
    setEditStudentModal(true)
  }

  const handleSaveStudentClass = async () => {
    if (!editStudent) return
    try {
      await userApi.updateStudentClass(editStudent.id, editStudentClass ? Number(editStudentClass) : null)
      setEditStudentModal(false); load()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">用户管理</h2>
        <button
          className="btn-primary"
          onClick={() => { setError(''); tab === 'teacher' ? setNewTeacherModal(true) : setNewStudentModal(true) }}
        >
          <Plus className="w-4 h-4 mr-2" />新建{tab === 'teacher' ? '教师' : '学生'}
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {(['teacher', 'student'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
          >
            {t === 'teacher' ? `教师（${teachers.length}）` : `学生（${students.length}）`}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {tab === 'teacher' ? (
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">序号</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">姓名</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">管理班级</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">权限</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">操作</th>
                </tr>
              ) : (
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">序号</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">姓名</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">所在班级</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-medium">操作</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tab === 'teacher' ? teachers.map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.username}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {t.classes.length > 0 ? t.classes.map(c => c.name).join('、') : <span className="text-gray-300">未分配</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.classes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.classes.map(c => (
                          <span key={c.id} className={c.permission === 'edit' ? 'badge-blue' : 'badge-gray'}>
                            {c.name}:{c.permission === 'edit' ? '可编辑' : '仅查看'}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => openEditTeacher(t)}>
                        <Settings className="w-3.5 h-3.5 mr-1" />管理班级
                      </button>
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => handleResetPwd(t.id)}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button className="btn-danger text-xs py-1 px-2" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : students.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.username}</td>
                  <td className="px-4 py-3 text-gray-600">{s.class_name || <span className="text-gray-300">未分配</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-secondary text-xs py-1 px-2" onClick={() => openEditStudent(s)}>选择班级</button>
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
              {tab === 'teacher' && teachers.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无教师用户</td></tr>
              )}
              {tab === 'student' && students.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">暂无学生用户</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新建教师弹窗 */}
      <Modal open={newTeacherModal} onClose={() => setNewTeacherModal(false)} title="新建教师账号">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input className="input" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} placeholder="请输入用户名" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">初始密码</label>
            <input className="input" value={newTeacherPwd} onChange={e => setNewTeacherPwd(e.target.value)} placeholder="请设置初始密码" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setNewTeacherModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleCreateTeacher}>创建</button>
          </div>
        </div>
      </Modal>

      {/* 新建学生弹窗 */}
      <Modal open={newStudentModal} onClose={() => setNewStudentModal(false)} title="新建学生账号">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名（支持中文）</label>
            <input className="input" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="请输入学生姓名" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">所在班级</label>
            <select className="input" value={newStudentClass} onChange={e => setNewStudentClass(e.target.value)}>
              <option value="">-- 不指定班级 --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400">默认密码：123456</p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setNewStudentModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleCreateStudent}>创建</button>
          </div>
        </div>
      </Modal>

      {/* 编辑教师班级权限弹窗 */}
      <Modal open={editTeacherModal} onClose={() => setEditTeacherModal(false)} title={`管理 ${editTeacher?.username} 的班级`} width="max-w-xl">
        <div className="space-y-3">
          {teacherClasses.map((tc, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <select
                className="input flex-1"
                value={tc.class_id}
                onChange={e => setTeacherClasses(prev => prev.map((x, j) => j === i ? { ...x, class_id: Number(e.target.value) } : x))}
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                className="input w-28"
                value={tc.permission}
                onChange={e => setTeacherClasses(prev => prev.map((x, j) => j === i ? { ...x, permission: e.target.value as 'view' | 'edit' } : x))}
              >
                <option value="view">仅查看</option>
                <option value="edit">可编辑</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 whitespace-nowrap">
                <input type="checkbox" checked={tc.is_head_teacher === 1}
                  onChange={e => setTeacherClasses(prev => prev.map((x, j) => j === i ? { ...x, is_head_teacher: e.target.checked ? 1 : 0 } : x))}
                />班主任
              </label>
              <button className="text-red-400 hover:text-red-600" onClick={() => setTeacherClasses(prev => prev.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button className="btn-secondary w-full" onClick={addTeacherClass}>
            <Plus className="w-4 h-4 mr-2" />添加班级
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setEditTeacherModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleSaveTeacherClasses}>保存</button>
          </div>
        </div>
      </Modal>

      {/* 编辑学生班级弹窗 */}
      <Modal open={editStudentModal} onClose={() => setEditStudentModal(false)} title={`修改 ${editStudent?.username} 的班级`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择班级</label>
            <select className="input" value={editStudentClass} onChange={e => setEditStudentClass(e.target.value)}>
              <option value="">-- 不在任何班级 --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setEditStudentModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleSaveStudentClass}>保存</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
