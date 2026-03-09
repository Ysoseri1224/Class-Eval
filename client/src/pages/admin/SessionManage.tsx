import { useState, useEffect } from 'react'
import { Plus, Trash2, Play, Square, Users, Star, BarChart2 } from 'lucide-react'
import { sessionApi, classApi, questionApi, evalApi } from '../../api'
import Modal from '../../components/Modal'
import type { Session, Class, QuestionSet, SelfEvalDimension } from '../../types'

export default function SessionManage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(false)

  const [createModal, setCreateModal] = useState(false)
  const [form, setForm] = useState({ title: '', class_id: '', question_set_id: '', duration_minutes: '' })

  const [evalModal, setEvalModal] = useState(false)
  const [evalSession, setEvalSession] = useState<Session | null>(null)
  const [evalTab, setEvalTab] = useState<'self' | 'peer'>('self')
  const [dimensions, setDimensions] = useState<SelfEvalDimension[]>([])
  const [evalError, setEvalError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [s, c, qs]: any[] = await Promise.all([sessionApi.list(), classApi.list(), questionApi.sets()])
      setSessions(s); setClasses(c); setSets(qs)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!form.class_id || !form.question_set_id) return
    await sessionApi.create({ title: form.title || undefined, class_id: Number(form.class_id), question_set_id: Number(form.question_set_id), duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined })
    setCreateModal(false)
    setForm({ title: '', class_id: '', question_set_id: '', duration_minutes: '' })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该课堂？')) return
    try {
      await sessionApi.remove(id); load()
    } catch (e: any) {
      alert('删除失败：' + (e.message || '请稍后重试'))
    }
  }

  const toggleExam = async (s: Session) => {
    const newOpen = s.exam_open ? 0 : 1
    await sessionApi.update(s.id, { exam_open: newOpen, status: newOpen ? 'open' : s.status })
    load()
  }

  const toggleSelfEval = async (s: Session) => {
    await sessionApi.update(s.id, { self_eval_open: s.self_eval_open ? 0 : 1 })
    load()
  }

  const openEvalEdit = async (s: Session) => {
    setEvalSession(s)
    setEvalTab('self')
    const dims: any = await evalApi.getDimensions(s.id)
    setDimensions(dims.length > 0 ? dims : [{ id: 0, session_id: s.id, dimension_name: '', level_20: '初步了解', level_40: '基本掌握', level_60: '较好掌握', level_80: '熟练掌握', level_100: '完全掌握', sort_order: 0 }])
    setEvalError('')
    setEvalModal(true)
  }

  const handleSaveDimensions = async () => {
    if (!evalSession) return
    const valid = dimensions.every(d => d.dimension_name.trim())
    if (!valid) return setEvalError('维度名称不能为空')
    try {
      await evalApi.saveDimensions(evalSession.id, dimensions)
      setEvalModal(false)
      alert('自评维度保存成功')
    } catch (e: any) {
      setEvalError(e.message || '保存失败，请重试')
    }
  }

  const handleAssignPeer = async (sessionId: number) => {
    if (!confirm('确认随机分配互评？分配后不可撤销。')) return
    try {
      const res: any = await evalApi.assignPeerEval(sessionId)
      alert(`互评分配成功，共 ${res.assigned_count} 人`)
      load()
    } catch (e: any) { alert(e.message) }
  }

  const statusBadge = (s: Session) => {
    if (s.status === 'open') return <span className="badge-green">进行中</span>
    if (s.status === 'closed') return <span className="badge-gray">已结束</span>
    return <span className="badge-yellow">草稿</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">课堂管理</h2>
          <p className="text-sm text-gray-500 mt-1">共 {sessions.length} 个课堂</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />新建课堂
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800">{s.title || `课堂 #${s.id}`}</h3>
                    {statusBadge(s)}
                    <span className="badge-blue">{s.class_name}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">题集：{s.question_set_title || '-'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>答题：{s.exam_open ? '✅ 开放' : '⏸ 关闭'}</span>
                    <span>自评：{s.self_eval_open ? '✅ 开放' : '⏸ 关闭'}</span>
                    <span>互评：{s.peer_eval_open ? '✅ 已分配' : '⏸ 未分配'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    onClick={() => toggleExam(s)}
                    className={s.exam_open ? 'btn-secondary text-xs py-1.5' : 'btn-success text-xs py-1.5'}
                  >
                    {s.exam_open ? <><Square className="w-3.5 h-3.5 mr-1" />停止答题</> : <><Play className="w-3.5 h-3.5 mr-1" />开始答题</>}
                  </button>
                  <button
                    onClick={() => toggleSelfEval(s)}
                    className={s.self_eval_open ? 'btn-secondary text-xs py-1.5' : 'btn-primary text-xs py-1.5'}
                  >
                    <Star className="w-3.5 h-3.5 mr-1" />{s.self_eval_open ? '关闭自评' : '开放自评'}
                  </button>
                  <button className="btn-secondary text-xs py-1.5" onClick={() => openEvalEdit(s)}>
                    <Star className="w-3.5 h-3.5 mr-1" />编辑自评
                  </button>
                  <button className="btn-secondary text-xs py-1.5" onClick={() => handleAssignPeer(s.id)}>
                    <Users className="w-3.5 h-3.5 mr-1" />随机互评
                  </button>
                  <button className="btn-danger text-xs py-1.5" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <div className="text-center py-12 text-gray-400">暂无课堂</div>}
        </div>
      )}

      {/* 新建课堂弹窗 */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="新建课堂">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">课堂标题（可选）</label>
            <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="不填自动生成" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择班级 *</label>
            <select className="input" value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}>
              <option value="">-- 请选择 --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择题集 *</label>
            <select className="input" value={form.question_set_id} onChange={e => setForm(p => ({ ...p, question_set_id: e.target.value }))}>
              <option value="">-- 请选择 --</option>
              {sets.map(s => <option key={s.id} value={s.id}>{s.title || `题集 #${s.id}`}（{s.question_count}题）</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">答题时限（分钟，可选）</label>
            <input className="input" type="number" min="1" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="不填则无时限" />
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setCreateModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleCreate} disabled={!form.class_id || !form.question_set_id}>创建</button>
          </div>
        </div>
      </Modal>

      {/* 编辑自评维度弹窗 */}
      <Modal open={evalModal} onClose={() => setEvalModal(false)} title={`编辑自评 - ${evalSession?.title || `课堂 #${evalSession?.id}`}`} width="max-w-2xl">
        <div className="flex gap-2 mb-4">
          {(['self', 'peer'] as const).map(t => (
            <button key={t} onClick={() => setEvalTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${evalTab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === 'self' ? '自评设置' : '互评说明'}
            </button>
          ))}
        </div>

        {evalTab === 'self' ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">每个维度满分100分，分为5级：20/40/60/80/100，学生只看到文字描述不看分数。</p>
            {dimensions.map((d, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <input className="input flex-1" placeholder="维度名称，如：课堂参与度" value={d.dimension_name} onChange={e => setDimensions(prev => prev.map((x, j) => j === i ? { ...x, dimension_name: e.target.value } : x))} />
                  <button className="text-red-400 hover:text-red-600 text-sm px-2" onClick={() => setDimensions(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[20, 40, 60, 80, 100].map(lv => (
                    <div key={lv}>
                      <p className="text-xs text-gray-400 mb-0.5">{lv}分</p>
                      <input className="input text-xs py-1" value={(d as any)[`level_${lv}`] || ''} onChange={e => setDimensions(prev => prev.map((x, j) => j === i ? { ...x, [`level_${lv}`]: e.target.value } : x))} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn-secondary w-full text-sm" onClick={() => setDimensions(prev => [...prev, { id: 0, session_id: evalSession?.id || 0, dimension_name: '', level_20: '初步了解', level_40: '基本掌握', level_60: '较好掌握', level_80: '熟练掌握', level_100: '完全掌握', sort_order: prev.length }])}>
              <Plus className="w-4 h-4 mr-2" />添加维度
            </button>
            {evalError && <p className="text-red-500 text-sm">{evalError}</p>}
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setEvalModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSaveDimensions}>保存</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-600">
            <p>互评流程说明：</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>等学生答题提交后，点击课堂卡片中的「随机互评」按钮</li>
              <li>系统将自动随机分配，确保每人评一份、不重复不交叉</li>
              <li>单数时最后一份由两人同时打分取平均值</li>
              <li>学生端会出现待评卷子，满分100分任意打分</li>
              <li>打分提交后系统自动计算互评等级（A/B/C）</li>
            </ol>
            <div className="flex justify-end pt-2">
              <button className="btn-secondary" onClick={() => setEvalModal(false)}>关闭</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
