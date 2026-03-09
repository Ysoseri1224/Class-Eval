import { useState, useEffect } from 'react'
import { sessionApi, classApi, submissionApi, evalApi } from '../../api'
import type { Session, Class, GradeResult, QuestionStat } from '../../types'

export default function GradeManage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [grades, setGrades] = useState<GradeResult[]>([])
  const [qStats, setQStats] = useState<QuestionStat[]>([])
  const [tab, setTab] = useState<'overview' | 'detail'>('overview')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([classApi.list(), sessionApi.list()]).then(([c, s]: any[]) => {
      setClasses(c); setSessions(s)
    })
  }, [])

  const filteredSessions = selectedClass
    ? sessions.filter(s => String(s.class_id) === selectedClass)
    : sessions

  const loadGrades = async () => {
    if (!selectedSession) return
    setLoading(true)
    try {
      const [g, r]: any[] = await Promise.all([
        evalApi.getGrades(Number(selectedSession)),
        submissionApi.sessionResults(Number(selectedSession))
      ])
      setGrades(g)
      setQStats(r.question_stats || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { if (selectedSession) loadGrades() }, [selectedSession])

  const gradeBadge = (g: 'A' | 'B' | 'C' | null) => {
    if (!g) return <span className="text-gray-300">-</span>
    return <span className={`badge ${g === 'A' ? 'badge-green' : g === 'B' ? 'badge-blue' : 'badge-red'}`}>{g}</span>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">成绩管理</h2>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择班级</label>
            <select className="input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSession('') }}>
              <option value="">全部班级</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择课堂</label>
            <select className="input" value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
              <option value="">-- 请选择课堂 --</option>
              {filteredSessions.map(s => <option key={s.id} value={s.id}>{s.title || `课堂 #${s.id}`}（{s.class_name}）</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedSession && (
        <>
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
            {([['overview', '概览 / 题目统计'], ['detail', '学生成绩明细']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>{l}</button>
            ))}
          </div>

          {loading ? <div className="text-center py-12 text-gray-400">加载中...</div> : (
            <>
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-blue-600">{grades.filter(g => g.submitted).length}</p>
                      <p className="text-sm text-gray-500 mt-1">已提交答题</p>
                    </div>
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-green-600">{grades.filter(g => g.self_grade === 'A').length}</p>
                      <p className="text-sm text-gray-500 mt-1">自评等级 A</p>
                    </div>
                    <div className="card text-center">
                      <p className="text-3xl font-bold text-purple-600">{grades.filter(g => g.peer_grade === 'A').length}</p>
                      <p className="text-sm text-gray-500 mt-1">互评等级 A</p>
                    </div>
                  </div>

                  {qStats.length > 0 && (
                    <div className="card p-0 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-800">各题得分统计</h3>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">题号</th>
                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">类型</th>
                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">答对人数</th>
                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">提交总数</th>
                            <th className="text-left px-4 py-2.5 text-gray-500 font-medium">优秀率</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {qStats.map(q => (
                            <tr key={q.question_id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-mono">{q.question_no}</td>
                              <td className="px-4 py-2.5 text-gray-600">{q.type}</td>
                              <td className="px-4 py-2.5">{q.correct_count}</td>
                              <td className="px-4 py-2.5">{q.total_submitted}</td>
                              <td className="px-4 py-2.5">
                                <span className={`font-medium ${Number(q.excellent_rate) >= 85 ? 'text-green-600' : Number(q.excellent_rate) >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                                  {q.excellent_rate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {tab === 'detail' && (
                <div className="card p-0 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">学生</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">答题状态</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">答题得分</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">自评等级</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">互评得分</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">互评等级</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {grades.map(g => (
                        <tr key={g.student_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{g.username}</td>
                          <td className="px-4 py-3">
                            {g.submitted ? <span className="badge-green">已提交</span> : <span className="badge-gray">未提交</span>}
                          </td>
                          <td className="px-4 py-3 font-mono">{g.exam_score !== null ? `${g.exam_score}分` : '-'}</td>
                          <td className="px-4 py-3">{gradeBadge(g.self_grade)}</td>
                          <td className="px-4 py-3 font-mono">{g.peer_score !== null ? `${g.peer_score.toFixed(1)}分` : '-'}</td>
                          <td className="px-4 py-3">{gradeBadge(g.peer_grade)}</td>
                        </tr>
                      ))}
                      {grades.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">暂无数据</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!selectedSession && (
        <div className="text-center py-16 text-gray-400">请先选择课堂查看成绩</div>
      )}
    </div>
  )
}
