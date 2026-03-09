import { useState, useEffect } from 'react'
import { CheckCircle, Star } from 'lucide-react'
import { sessionApi, evalApi, submissionApi, questionApi } from '../../api'
import type { Session, Question, QuestionSet } from '../../types'

export default function PeerEvalPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selected, setSelected] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [currentTask, setCurrentTask] = useState<any | null>(null)
  const [submission, setSubmission] = useState<any | null>(null)
  const [qSet, setQSet] = useState<QuestionSet | null>(null)
  const [peerScore, setPeerScore] = useState(60)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [myGrade, setMyGrade] = useState<any | null>(null)
  const [myResult, setMyResult] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sessionApi.active().then((data: any) => setSessions(data)).catch(() => {})
  }, [])

  const loadSession = async (s: Session) => {
    setSelected(s)
    setLoading(true)
    try {
      const [t, grade, result]: any[] = await Promise.all([
        evalApi.getMyPeerTasks(s.id),
        evalApi.getMyGrade(s.id),
        evalApi.getMyPeerResult(s.id)
      ])
      setTasks(t)
      if (grade?.peer_grade) setMyGrade(grade)
      setMyResult(result)
    } finally { setLoading(false) }
  }

  const loadTask = async (task: any) => {
    setCurrentTask(task)
    setLoading(true)
    try {
      const [sub, qs]: any[] = await Promise.all([
        submissionApi.getOne(task.assignment_id),
        questionApi.set(selected!.question_set_id)
      ])
      setSubmission(sub)
      setQSet(qs)
      setPeerScore(task.score || 60)
      setComment(task.comment || '')
      setSubmitted(!!task.score)
    } finally { setLoading(false) }
  }

  const handleSubmitPeer = async () => {
    if (!currentTask || !selected) return
    setSaving(true)
    try {
      await evalApi.submitPeerEval(currentTask.assignment_id, { score: peerScore, comment })
      setSubmitted(true)
      // 刷新任务列表
      const t: any = await evalApi.getMyPeerTasks(selected.id)
      setTasks(t)
      const grade: any = await evalApi.getMyGrade(selected.id)
      if (grade?.peer_grade) setMyGrade(grade)
    } catch (e: any) {
      alert(e.message)
    } finally { setSaving(false) }
  }

  if (!selected) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">互评</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">当前没有可用的课堂</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadSession(s)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.title || `课堂 #${s.id}`}</h3>
                    <p className="text-sm text-gray-500 mt-1">题集：{s.question_set_title}</p>
                  </div>
                  <span className={s.peer_eval_open ? 'badge-green' : 'badge-gray'}>
                    {s.peer_eval_open ? '互评进行中' : '待开始'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="text-center py-16 text-gray-400">加载中...</div>

  if (currentTask) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">查看同学答卷</h2>
          <button className="btn-secondary text-sm" onClick={() => { setCurrentTask(null); setSubmission(null); setQSet(null) }}>← 返回</button>
        </div>

        {/* 显示对方答题内容 */}
        {qSet?.questions && submission && (
          <div className="space-y-4 mb-6">
            {qSet.questions.map((q: Question) => {
              const ans = submission.answers?.[q.id]
              return (
                <div key={q.id} className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-gray font-mono">{q.question_no}</span>
                    <span className="text-sm text-gray-500">{q.type}</span>
                  </div>
                  <p className="text-gray-800 mb-2">{q.content}</p>
                  <div className="p-2 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                    答案：{ans !== undefined ? String(ans) : <span className="text-gray-400">未作答</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 打分区域 */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">
            {submitted ? '已提交评分' : '给出你的评分'}
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              综合评分：<span className="text-blue-600 font-bold text-xl">{peerScore} 分</span>
            </label>
            <input
              type="range"
              min="0" max="100" step="5"
              value={peerScore}
              onChange={e => !submitted && setPeerScore(Number(e.target.value))}
              disabled={submitted}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {/* 快速打分按钮 */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[20, 40, 60, 80, 100].map(v => (
              <button
                key={v}
                onClick={() => !submitted && setPeerScore(v)}
                disabled={submitted}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${peerScore === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'} ${submitted ? 'cursor-default' : ''}`}
              >
                {v}分
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">评语（可选）</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={comment}
              onChange={e => !submitted && setComment(e.target.value)}
              disabled={submitted}
              placeholder="请写下你的评价..."
            />
          </div>

          {!submitted ? (
            <button className="btn-primary w-full" onClick={handleSubmitPeer} disabled={saving}>
              {saving ? '提交中...' : '提交评分'}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-600 justify-center">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">评分已提交：{peerScore} 分</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{selected.title || `课堂 #${selected.id}`} - 互评</h2>
        <button className="btn-secondary text-sm" onClick={() => { setSelected(null); setTasks([]); setMyGrade(null); setMyResult(null) }}>返回列表</button>
      </div>

      {/* 我收到的互评结果 */}
      {myResult && myResult.grade && (
        <div className={`card mb-4 border-2 ${myResult.grade === 'A' ? 'border-green-400 bg-green-50' : myResult.grade === 'B' ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">同学对我的评价</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">平均分 <span className="font-bold text-gray-800">{myResult.avg_score?.toFixed(1)}</span> 分</span>
              <span className={`text-2xl font-bold ${myResult.grade === 'A' ? 'text-green-600' : myResult.grade === 'B' ? 'text-blue-600' : 'text-gray-500'}`}>
                {myResult.grade}
              </span>
            </div>
          </div>
          {myResult.records?.length > 0 && (
            <div className="space-y-2">
              {myResult.records.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-white rounded-lg border border-gray-100">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-sm font-bold ${r.score >= 80 ? 'bg-green-100 text-green-700' : r.score >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {r.score}分
                  </span>
                  <span className="text-sm text-gray-600">{r.comment || <span className="text-gray-400 italic">（未留评语）</span>}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {myResult && !myResult.grade && (
        <div className="card mb-4 bg-gray-50 text-center py-3 text-sm text-gray-400">同学尚未完成对你的评价</div>
      )}

      {/* 待评任务 */}
      {!selected.peer_eval_open ? (
        <div className="text-center py-12 text-gray-400">互评尚未开始，请等待教师分配</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无待评任务</div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-700 mb-2">待评任务（{tasks.length} 份）</h3>
          {tasks.map((task, i) => (
            <div key={task.assignment_id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadTask(task)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">{i + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">同学答卷 #{i + 1}</p>
                    <p className="text-xs text-gray-400">{task.score ? `已评分：${task.score} 分` : '待评分'}</p>
                  </div>
                </div>
                <div>
                  {task.score
                    ? <span className="badge-green flex items-center gap-1"><CheckCircle className="w-3 h-3" />已完成</span>
                    : <span className="badge-yellow flex items-center gap-1"><Star className="w-3 h-3" />待评</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
