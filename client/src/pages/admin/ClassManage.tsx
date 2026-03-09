import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { classApi, userApi } from '../../api'
import Modal from '../../components/Modal'
import type { Class, Student } from '../../types'

export default function ClassManage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Class | null>(null)
  const [editName, setEditName] = useState('')
  const [studentsModal, setStudentsModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data: any = await classApi.list()
      setClasses(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditTarget(null)
    setEditName('')
    setError('')
    setEditModal(true)
  }

  const openEdit = (cls: Class) => {
    setEditTarget(cls)
    setEditName(cls.name)
    setError('')
    setEditModal(true)
  }

  const handleSave = async () => {
    if (!editName.trim()) return setError('班级名称不能为空')
    try {
      if (editTarget) {
        await classApi.update(editTarget.id, editName.trim())
      } else {
        await classApi.create(editName.trim())
      }
      setEditModal(false)
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该班级？班级内学生将失去班级归属。')) return
    await classApi.remove(id)
    load()
  }

  const openStudents = async (cls: Class) => {
    setSelectedClass(cls)
    const data: any = await userApi.students(cls.id)
    setStudents(data)
    setStudentsModal(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">班级管理</h2>
          <p className="text-sm text-gray-500 mt-1">共 {classes.length} 个班级</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />新建班级
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无班级，请先创建</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-lg">{cls.name}</h3>
                <span className="badge-blue">ID: {cls.id}</span>
              </div>
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                <button
                  className="btn-secondary flex-1 text-xs py-1.5"
                  onClick={() => openStudents(cls)}
                >
                  <Users className="w-3.5 h-3.5 mr-1" />查看学生
                </button>
                <button
                  className="btn-secondary text-xs px-3 py-1.5"
                  onClick={() => openEdit(cls)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  className="btn-danger text-xs px-3 py-1.5"
                  onClick={() => handleDelete(cls.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={editTarget ? '编辑班级' : '新建班级'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">班级名称</label>
            <input
              className="input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="请输入班级名称"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setEditModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleSave}>保存</button>
          </div>
        </div>
      </Modal>

      {/* 查看学生弹窗 */}
      <Modal
        open={studentsModal}
        onClose={() => setStudentsModal(false)}
        title={`${selectedClass?.name} - 学生列表`}
        width="max-w-md"
      >
        {students.length === 0 ? (
          <p className="text-gray-400 text-center py-4">该班级暂无学生</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {students.map(s => (
              <li key={s.id} className="py-2.5 flex items-center justify-between">
                <span className="text-gray-800">{s.username}</span>
                <span className="text-xs text-gray-400">ID: {s.id}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
