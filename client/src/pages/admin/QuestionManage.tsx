import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { questionApi } from '../../api'
import Modal from '../../components/Modal'
import type { QuestionSet, Question, QuestionType } from '../../types'

const TYPE_LABELS: Record<QuestionType, string> = {
  choice: '选择题', judge: '判断题', fill: '填空题'
}

export default function QuestionManage() {
  const [sets, setSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [setDetail, setSetDetail] = useState<QuestionSet | null>(null)

  // 新建题集
  const [newSetModal, setNewSetModal] = useState(false)
  const [newSetTitle, setNewSetTitle] = useState('')
  const [newSetSingle, setNewSetSingle] = useState(false)

  // 编辑题目
  const [qModal, setQModal] = useState(false)
  const [editQ, setEditQ] = useState<Partial<Question> | null>(null)
  const [currentSetId, setCurrentSetId] = useState<number | null>(null)
  const [qError, setQError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data: any = await questionApi.sets()
      setSets(Array.isArray(data) ? data : [])
    } catch (e) {
      setSets([])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const loadDetail = async (setId: number) => {
    try {
      const data: any = await questionApi.set(setId)
      setSetDetail(data)
      setExpanded(setId)
    } catch (e) {
      console.error('加载题集详情失败', e)
    }
  }

  const toggleExpand = async (setId: number) => {
    if (expanded === setId) { setExpanded(null); setSetDetail(null) }
    else await loadDetail(setId)
  }

  const handleCreateSet = async () => {
    const data: any = await questionApi.createSet({ title: newSetTitle || undefined, is_single: newSetSingle })
    setNewSetModal(false); setNewSetTitle(''); load()
    // 自动展开新建的题集
    await loadDetail(data.id)
  }

  const handleDeleteSet = async (id: number) => {
    if (!confirm('确认删除该题集及其所有题目？')) return
    try {
      await questionApi.removeSet(id)
      if (expanded === id) { setExpanded(null); setSetDetail(null) }
      load()
    } catch (e: any) {
      alert('删除失败：' + (e.message || '请稍后重试'))
    }
  }

  const openCreateQ = (setId: number) => {
    const nextNo = setDetail ? String((setDetail.questions?.length || 0) + 1) : '1'
    setEditQ({ type: 'choice', content: '', options: ['', '', '', ''], answer: '', question_no: nextNo, score: 0 })
    setCurrentSetId(setId)
    setQError('')
    setQModal(true)
  }

  const openEditQ = (q: Question) => {
    setEditQ({ ...q })
    setCurrentSetId(q.set_id)
    setQError('')
    setQModal(true)
  }

  const handleDeleteQ = async (qId: number, setId: number) => {
    if (!confirm('确认删除该题目？')) return
    await questionApi.removeQuestion(qId)
    await loadDetail(setId)
  }

  const handleSaveQ = async () => {
    if (!editQ?.content?.trim()) return setQError('题目内容不能为空')
    if (editQ.answer === undefined || editQ.answer === '') return setQError('答案不能为空')
    try {
      if (editQ.id) {
        await questionApi.updateQuestion(editQ.id, editQ)
      } else {
        await questionApi.createQuestion(currentSetId!, editQ)
      }
      setQModal(false)
      if (currentSetId) await loadDetail(currentSetId)
    } catch (e: any) { setQError(e.message) }
  }


  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">试题管理</h2>
          <p className="text-sm text-gray-500 mt-1">共 {sets.length} 个题集</p>
        </div>
        <button className="btn-primary" onClick={() => setNewSetModal(true)}>
          <Plus className="w-4 h-4 mr-2" />新建题集
        </button>
      </div>

      <div className="space-y-3">
        {sets.map(s => (
          <div key={s.id} className="card p-0 overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(s.id)}
            >
              <div className="flex items-center gap-3">
                {expanded === s.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                <div>
                  <span className="font-semibold text-gray-800">{s.title || `题集 #${s.id}`}</span>
                  <span className="ml-3 badge-blue">{s.is_single ? '单题' : '套题'}</span>
                  <span className="ml-2 text-xs text-gray-400">{s.question_count} 道题</span>
                </div>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <button className="btn-danger text-xs py-1 px-2" onClick={() => handleDeleteSet(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {expanded === s.id && setDetail && setDetail.id === s.id && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="flex justify-end mb-3">
                  <button className="btn-primary text-xs py-1.5" onClick={() => openCreateQ(s.id)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />添加题目
                  </button>
                </div>
                {(!setDetail.questions || setDetail.questions.length === 0) ? (
                  <p className="text-center text-gray-400 py-4">暂无题目</p>
                ) : (
                  <div className="space-y-2">
                    {setDetail.questions.map((q, idx) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono mt-0.5 shrink-0">
                          {q.question_no}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="badge-gray text-xs">{TYPE_LABELS[q.type]}</span>
                          </div>
                          <p className="text-sm text-gray-700 truncate">{q.content}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button className="btn-secondary text-xs py-1 px-2" onClick={() => openEditQ(q)}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button className="btn-danger text-xs py-1 px-2" onClick={() => handleDeleteQ(q.id, s.id)}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {sets.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">暂无题集，请先创建</div>
        )}
      </div>

      {/* 新建题集弹窗 */}
      <Modal open={newSetModal} onClose={() => setNewSetModal(false)} title="新建题集">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">题集类型</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!newSetSingle} onChange={() => setNewSetSingle(false)} />
                <span className="text-sm">套题（多道题）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={newSetSingle} onChange={() => setNewSetSingle(true)} />
                <span className="text-sm">单题</span>
              </label>
            </div>
          </div>
          {!newSetSingle && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">套题标题</label>
              <input className="input" value={newSetTitle} onChange={e => setNewSetTitle(e.target.value)} placeholder="请输入套题标题" />
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setNewSetModal(false)}>取消</button>
            <button className="btn-primary" onClick={handleCreateSet}>创建</button>
          </div>
        </div>
      </Modal>

      {/* 编辑题目弹窗 */}
      <Modal open={qModal} onClose={() => setQModal(false)} title={editQ?.id ? '编辑题目' : '添加题目'} width="max-w-2xl">
        {editQ && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">题号</label>
                <input className="input" value={editQ.question_no || ''} onChange={e => setEditQ(p => ({ ...p, question_no: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">题目类型</label>
                <select className="input" value={editQ.type || 'choice'} onChange={e => setEditQ(p => ({ ...p, type: e.target.value as QuestionType, options: e.target.value === 'choice' ? ['', '', '', ''] : undefined, answer: '' }))}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">题目内容</label>
              <textarea className="input min-h-[80px] resize-none" value={editQ.content || ''} onChange={e => setEditQ(p => ({ ...p, content: e.target.value }))} placeholder="请输入题目内容" />
            </div>

            {/* 选择题选项 */}
            {editQ.type === 'choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选项</label>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((letter, i) => (
                    <div key={letter} className="flex items-center gap-2">
                      <span className="w-6 text-sm font-medium text-gray-500">{letter}.</span>
                      <input className="input flex-1" value={(editQ.options as string[])?.[i] || ''} onChange={e => { const opts = [...((editQ.options as string[]) || ['', '', '', ''])]; opts[i] = e.target.value; setEditQ(p => ({ ...p, options: opts })) }} placeholder={`选项 ${letter}`} />
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">正确答案</label>
                  <select className="input w-32" value={editQ.answer as string || ''} onChange={e => setEditQ(p => ({ ...p, answer: e.target.value }))}>
                    <option value="">选择</option>
                    {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* 判断题 */}
            {editQ.type === 'judge' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">正确答案</label>
                <select className="input w-32" value={String(editQ.answer ?? '')} onChange={e => setEditQ(p => ({ ...p, answer: e.target.value }))}>
                  <option value="">选择</option>
                  <option value="true">正确</option>
                  <option value="false">错误</option>
                </select>
              </div>
            )}

            {/* 填空题 */}
            {editQ.type === 'fill' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">参考答案</label>
                <input className="input" value={editQ.answer as string || ''} onChange={e => setEditQ(p => ({ ...p, answer: e.target.value }))} placeholder="请输入参考答案" />
              </div>
            )}


            {qError && <p className="text-red-500 text-sm">{qError}</p>}
            <div className="flex gap-3 justify-end">
              <button className="btn-secondary" onClick={() => setQModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSaveQ}>保存</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
