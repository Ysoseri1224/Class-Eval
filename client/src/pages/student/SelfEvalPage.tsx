import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { sessionApi, evalApi } from '../../api'
import type { Session, SelfEvalDimension } from '../../types'

export default function SelfEvalPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [dimensions, setDimensions] = useState<SelfEvalDimension[]>([])
  const [scores, setScores] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [grade, setGrade] = useState<{ grade: string; ratio: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sessionApi.active().then((data: any) => setSessions(data.filter((s: Session) => s.self_eval_open))).catch(() => {})
  }, [])

  const loadSession = async (s: Session) => {
    setSelected(s)
    setLoading(true)
    try {
      const [dims, myEvals, gradeRes]: any[] = await Promise.all([
        evalApi.getDimensions(s.id),
        evalApi.getMySelfEval(s.id),
        evalApi.getMyGrade(s.id)
      ])
      setDimensions(dims)
      if (myEvals.length > 0) {
        const sc: Record<number, number> = {}
        myEvals.forEach((e: any) => { sc[e.dimension_id] = e.score })
        setScores(sc)
        setSubmitted(true)
      }
      if (gradeRes?.grade) setGrade(gradeRes)
    } finally { setLoading(false) }
  }

  const handleSubmit = async () => {
    if (!selected) return
    const evals = dimensions.map(d => ({ dimension_id: d.id, score: scores[d.id] || 20 }))
    setSaving(true)
    try {
      await evalApi.submitSelfEval(selected.id, evals)
      const gradeRes: any = await evalApi.getMyGrade(selected.id)
      setGrade(gradeRes)
      setSubmitted(true)
    } catch (e: any) {
      alert(e.message)
    } finally { setSaving(false) }
  }

  const getLevelLabel = (dim: SelfEvalDimension, score: number) => {
    const map: Record<number, string> = {
      20: dim.level_20, 40: dim.level_40, 60: dim.level_60,
      80: dim.level_80, 100: dim.level_100
    }
    return map[score] || dim.level_20
  }

  if (!selected) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">自评</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">当前没有开放自评的课堂</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadSession(s)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.title || `课堂 #${s.id}`}</h3>
                    <p className="text-sm text-gray-500 mt-1">题集：{s.question_set_title}</p>
                  </div>
                  <span className="badge-green">自评开放</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="text-center py-16 text-gray-400">加载中...</div>

  if (dimensions.length === 0) {
    return (
      <div>
        <button className="btn-secondary mb-4" onClick={() => setSelected(null)}>← 返回</button>
        <div className="text-center py-16 text-gray-400">该课堂暂未设置自评维度</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{selected.title || `课堂 #${selected.id}`} - 自评</h2>
        <button className="btn-secondary text-sm" onClick={() => setSelected(null)}>返回列表</button>
      </div>

      {submitted && grade && (
        <div className={`card mb-6 border-2 text-center ${grade.grade === 'A' ? 'border-green-400 bg-green-50' : grade.grade === 'B' ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
          <CheckCircle className={`w-12 h-12 mx-auto mb-2 ${grade.grade === 'A' ? 'text-green-500' : grade.grade === 'B' ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-lg font-semibold text-gray-700">自评等级</p>
          <p className={`text-5xl font-bold mt-2 ${grade.grade === 'A' ? 'text-green-600' : grade.grade === 'B' ? 'text-blue-600' : 'text-gray-500'}`}>{grade.grade}</p>
          <p className="text-sm text-gray-400 mt-2">综合得分率：{grade.ratio}%</p>
        </div>
      )}

      <div className="space-y-4">
        {dimensions.map((dim) => (
          <div key={dim.id} className="card">
            <h3 className="font-semibold text-gray-800 mb-4">{dim.dimension_name}</h3>
            <div className="grid grid-cols-5 gap-2">
              {([20, 40, 60, 80, 100] as const).map(lv => {
                const label = getLevelLabel(dim, lv)
                const isSelected = (scores[dim.id] || 20) === lv
                return (
                  <button
                    key={lv}
                    onClick={() => !submitted && setScores(prev => ({ ...prev, [dim.id]: lv }))}
                    disabled={submitted}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    } ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="text-xs font-medium leading-tight">{label}</div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              当前选择：<span className="text-blue-600 font-medium">{getLevelLabel(dim, scores[dim.id] || 20)}</span>
            </p>
          </div>
        ))}
      </div>

      {!submitted && (
        <div className="flex justify-end mt-6">
          <button className="btn-primary px-8" onClick={handleSubmit} disabled={saving}>
            {saving ? '提交中...' : '提交自评'}
          </button>
        </div>
      )}
    </div>
  )
}
