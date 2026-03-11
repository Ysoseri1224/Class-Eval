import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, Camera } from 'lucide-react'
import html2canvas from 'html2canvas'
import { sessionApi, questionApi, submissionApi } from '../../api'
import QuestionViewer from '../../components/QuestionViewer'
import type { Session, Question, QuestionSet } from '../../types'

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
  const [attachments, setAttachments] = useState<Record<string, string[]>>({})
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null)
  const examRef = useRef<HTMLDivElement>(null)

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
        const savedAnswers = sub.answers || {}
        setAnswers(savedAnswers)
        // 恢复附件（存在 answers 里以 __attach_qid 为 key）
        const savedAttachments: Record<string, string[]> = {}
        for (const key of Object.keys(savedAnswers)) {
          if (key.startsWith('__attach_')) {
            const qid = key.replace('__attach_', '')
            savedAttachments[qid] = savedAnswers[key]
          }
        }
        setAttachments(savedAttachments)
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
    setAnswers(prev => {
      const next = { ...prev, [qId]: val }
      if (selectedSession) {
        submissionApi.save(selectedSession.id, next).catch(() => {})
      }
      return next
    })
  }

  const setQuestionAttachments = (qId: number, urls: string[]) => {
    setAttachments(prev => {
      const next = { ...prev, [qId]: urls }
      // 把附件 URL 也存到 answers（以 __attach_qid 为 key），确保自动保存
      if (selectedSession) {
        const attachKey = `__attach_${qId}`
        submissionApi.save(selectedSession.id, { ...answers, [attachKey]: urls }).catch(() => {})
      }
      return next
    })
  }

  const handleSubmit = useCallback(async () => {
    if (!selectedSession || submitted || submitting) return
    setSubmitting(true)
    try {
      // 提交时合并附件信息
      const attachKeys: Record<string, any> = {}
      for (const [qId, urls] of Object.entries(attachments)) {
        attachKeys[`__attach_${qId}`] = urls
      }
      const res: any = await submissionApi.submit(selectedSession.id, { ...answers, ...attachKeys })
      setScore(res.score)
      setResults(res.questionResults)
      setSubmitted(true)
    } catch (e: any) {
      alert(e.message)
    } finally { setSubmitting(false) }
  }, [selectedSession, submitted, submitting, answers, attachments])

  const handleScreenshot = async () => {
    if (!examRef.current) return
    try {
      const canvas = await html2canvas(examRef.current, { scale: 1.5, useCORS: true })
      const dataUrl = canvas.toDataURL('image/png')

      // 方案C：复制到剪贴板
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard?.write) {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          } catch { /* 不支持则跳过 */ }
        }
      })

      // 方案A：触发下载
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `答题截图_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.png`
      a.click()

      setScreenshotModal(dataUrl)
    } catch (e) {
      alert('截图失败，请重试')
    }
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

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
          <button className="btn-secondary text-sm" onClick={() => { setSelectedSession(null); setQSet(null); setAnswers({}); setAttachments({}); setSubmitted(false); setResults({}); setScore(null); setTimeLeft(null) }}>
            返回列表
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            onClick={handleScreenshot}
            title="截图保存"
          >
            <Camera className="w-4 h-4" />截图
          </button>
          {!submitted && selectedSession.exam_open && (
            <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提交中...' : '提交答案'}
            </button>
          )}
        </div>
      </div>

      <div ref={examRef}>
      {qSet?.questions && qSet.questions.length > 0 ? (
        <div className="space-y-4">
          {qSet.questions.map((q: Question) => (
            <QuestionViewer
              key={q.id}
              question={q}
              answer={answers[q.id]}
              result={results[q.id]}
              readonly={submitted || !selectedSession.exam_open}
              onAnswer={val => setAnswer(q.id, val)}
              attachments={attachments[String(q.id)]}
              onAttachmentsChange={q.type === 'fill' ? (urls) => setQuestionAttachments(q.id, urls) : undefined}
            />
          ))}
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

      {/* 截图弹窗 */}
      {screenshotModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setScreenshotModal(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-800">截图已保存到下载文件夹</p>
              <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={() => setScreenshotModal(null)}>×</button>
            </div>
            <img src={screenshotModal} alt="截图预览" className="w-full rounded-lg border border-gray-200 mb-3" />
            <p className="text-xs text-gray-400 text-center">图片已复制到剪贴板，也已自动下载到「下载」文件夹</p>
          </div>
        </div>
      )}
    </div>
  )
}

