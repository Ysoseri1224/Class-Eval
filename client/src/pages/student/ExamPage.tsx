import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { sessionApi, questionApi, submissionApi } from '../../api'
import type { Session, Question, QuestionSet } from '../../types'

const TYPE_LABELS: Record<string, string> = {
  choice: '选择题', judge: '判断题', fill: '填空题'
}

export default function ExamPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [qSet, setQSet] = useState<QuestionSet | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Record<string, { correct: boolean; correctAnswer: any }>>({})
  const [score, setScore] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    sessionApi.active().then((data: any) => setSessions(data)).catch(() => {})
  }, [])

  const loadSession = async (s: Session) => {
    setSelectedSession(s)
    setLoading(true)
    try {
      const qs: any = await questionApi.set(s.question_set_id)
      setQSet(qs)
      // 加载已有答题记录
      const sub: any = await submissionApi.my(s.id)
      if (sub) {
        setAnswers(sub.answers || {})
        if (sub.status === 'submitted') {
          setSubmitted(true)
          setScore(sub.score)
        }
      }
      // 计算剩余时间
      if (s.duration_minutes && s.start_time && !sub?.submitted_at) {
        const start = new Date(s.start_time).getTime()
        const end = start + s.duration_minutes * 60 * 1000
        const left = Math.max(0, Math.floor((end - Date.now()) / 1000))
        setTimeLeft(left)
      }
    } finally { setLoading(false) }
  }

  // 倒计时
  useEffect(() => {
    if (timeLeft === null || submitted) return
    if (timeLeft <= 0) { handleSubmit(); return }
    const t = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, submitted])

  const setAnswer = (qId: number, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
    // 自动保存
    if (selectedSession) {
      submissionApi.save(selectedSession.id, { ...answers, [qId]: val }).catch(() => {})
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!selectedSession || submitted || submitting) return
    setSubmitting(true)
    try {
      const res: any = await submissionApi.submit(selectedSession.id, answers)
      setScore(res.score)
      setResults(res.questionResults)
      setSubmitted(true)
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }, [selectedSession, submitted, submitting, answers])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  // 渲染单道题
  const renderQuestion = (q: Question, idx: number) => {
    const ans = answers[q.id]
    const result = results[q.id]

    return (
      <div key={q.id} className={`card border-2 transition-colors ${submitted && result ? (result.correct ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50') : 'border-transparent'}`}>
        <div className="flex items-start gap-3 mb-4">
          <span className="bg-blue-100 text-blue-700 text-xs font-mono px-2 py-0.5 rounded shrink-0 mt-0.5">{q.question_no}</span>
          <div className="flex-1">
            <span className="badge-gray text-xs mr-2">{TYPE_LABELS[q.type]}</span>
            <p className="text-gray-800 font-medium mt-1">{q.content}</p>
          </div>
          {submitted && result && (
            <div className="shrink-0">
              {result.correct
                ? <CheckCircle className="w-6 h-6 text-green-500" />
                : <XCircle className="w-6 h-6 text-red-500" />
              }
            </div>
          )}
        </div>

        {/* 选择题 */}
        {q.type === 'choice' && (
          <div className="space-y-2 ml-10">
            {(['A', 'B', 'C', 'D'] as const).map((letter, i) => {
              const opt = (q.options as string[])?.[i]
              if (!opt) return null
              const isSelected = ans === letter
              const isCorrect = submitted && result?.correctAnswer === letter
              const isWrong = submitted && isSelected && !result?.correct
              return (
                <label key={letter} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${isCorrect ? 'bg-green-100 border-green-400' : isWrong ? 'bg-red-100 border-red-400' : isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200 hover:bg-gray-50'} ${submitted ? 'cursor-default' : ''}`}>
                  <input type="radio" name={`q_${q.id}`} value={letter} checked={isSelected} onChange={() => !submitted && setAnswer(q.id, letter)} disabled={submitted} className="shrink-0" />
                  <span className="font-medium text-gray-500 w-4">{letter}.</span>
                  <span className="text-gray-700">{opt}</span>
                </label>
              )
            })}
            {submitted && !result?.correct && (
              <p className="text-sm text-green-600 mt-2 ml-3">✓ 正确答案：{String(result?.correctAnswer)}</p>
            )}
          </div>
        )}

        {/* 判断题 */}
        {q.type === 'judge' && (
          <div className="flex gap-4 ml-10">
            {[{ val: 'true', label: '✓ 正确' }, { val: 'false', label: '✗ 错误' }].map(({ val, label }) => {
              const isSelected = String(ans) === val
              const isCorrect = submitted && String(result?.correctAnswer) === val
              const isWrong = submitted && isSelected && !result?.correct
              return (
                <label key={val} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${isCorrect ? 'bg-green-100 border-green-400' : isWrong ? 'bg-red-100 border-red-400' : isSelected ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200 hover:bg-gray-50'} ${submitted ? 'cursor-default' : ''}`}>
                  <input type="radio" name={`q_${q.id}`} value={val} checked={isSelected} onChange={() => !submitted && setAnswer(q.id, val)} disabled={submitted} />
                  <span className="font-medium">{label}</span>
                </label>
              )
            })}
            {submitted && !result?.correct && (
              <p className="text-sm text-green-600 self-center">✓ 正确答案：{result?.correctAnswer === 'true' ? '正确' : '错误'}</p>
            )}
          </div>
        )}

        {/* 填空题 */}
        {q.type === 'fill' && (
          <div className="ml-10">
            <input
              className={`input ${submitted && result ? (result.correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : ''}`}
              value={ans || ''}
              onChange={e => !submitted && setAnswer(q.id, e.target.value)}
              disabled={submitted}
              placeholder="请输入答案"
            />
            {submitted && !result?.correct && (
              <p className="text-sm text-green-600 mt-2">✓ 正确答案：{String(result?.correctAnswer)}</p>
            )}
          </div>
        )}

      </div>
    )
  }

  if (!selectedSession) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">答题</h2>
        {sessions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">当前没有开放的课堂</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadSession(s)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.title || `课堂 #${s.id}`}</h3>
                    <p className="text-sm text-gray-500 mt-1">题集：{s.question_set_title}</p>
                  </div>
                  <div className="flex gap-2">
                    {s.exam_open ? <span className="badge-green">答题开放</span> : <span className="badge-gray">答题已关闭</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="text-center py-16 text-gray-400">加载中...</div>

  return (
    <div>
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{selectedSession.title || `课堂 #${selectedSession.id}`}</h2>
          {submitted && score !== null && (
            <p className="text-lg font-bold text-blue-600 mt-1">得分：{score} 分</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && !submitted && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <button className="btn-secondary text-sm" onClick={() => { setSelectedSession(null); setQSet(null); setAnswers({}); setSubmitted(false); setResults({}); setScore(null); setTimeLeft(null) }}>
            返回列表
          </button>
          {!submitted && selectedSession.exam_open && (
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '提交答案'}
            </button>
          )}
        </div>
      </div>

      {qSet?.questions && qSet.questions.length > 0 ? (
        <div className="space-y-4">
          {qSet.questions.map((q, idx) => renderQuestion(q, idx))}
          {!submitted && selectedSession.exam_open && (
            <div className="flex justify-end pt-2">
              <button className="btn-primary px-8" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '提交中...' : '提交答案'}
              </button>
            </div>
          )}
          {submitted && (
            <div className="card bg-blue-50 border-2 border-blue-200 text-center">
              <p className="text-2xl font-bold text-blue-600 mb-1">答题完成！</p>
              <p className="text-gray-600">本次得分：<span className="text-blue-600 font-bold text-xl">{score} 分</span></p>
              <p className="text-sm text-gray-400 mt-2">答对的题目绿色显示，答错的题目红色显示并提示正确答案</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">该课堂暂无题目</div>
      )}
    </div>
  )
}

