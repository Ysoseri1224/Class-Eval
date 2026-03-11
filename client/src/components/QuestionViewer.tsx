import { useState, useRef } from 'react'
import { CheckCircle, XCircle, Upload, X } from 'lucide-react'
import type { Question } from '../types'

const TYPE_LABELS: Record<string, string> = {
  choice: '选择题', judge: '判断题', fill: '填空题', match: '连线题'
}

const COLORS = ['blue', 'green', 'purple', 'orange', 'pink', 'teal']
const CLS_MAP: Record<string, { bg: string; border: string }> = {
  blue:   { bg: 'bg-blue-100',   border: 'border-blue-400' },
  green:  { bg: 'bg-green-100',  border: 'border-green-400' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-400' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-400' },
  pink:   { bg: 'bg-pink-100',   border: 'border-pink-400' },
  teal:   { bg: 'bg-teal-100',   border: 'border-teal-400' },
}

interface QuestionResult {
  correct: boolean
  correctAnswer: any
}

interface Props {
  question: Question
  answer: any
  result?: QuestionResult        // 有 result 表示已提交/只读模式
  readonly?: boolean             // 强制只读（互评查看时用）
  onAnswer?: (val: any) => void  // 答题回调（只读时不传）
  showCorrect?: boolean          // 是否叠加显示正确答案（互评查看时传 true + correctAnswer）
  correctAnswer?: any            // 互评查看时传入正确答案
  // 附件相关（填空题）
  attachments?: string[]
  onAttachmentsChange?: (urls: string[]) => void
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data.url
}

export default function QuestionViewer({
  question: q,
  answer: ans,
  result,
  readonly,
  onAnswer,
  showCorrect,
  correctAnswer: extCorrectAns,
  attachments,
  onAttachmentsChange,
}: Props) {
  const isReadonly = readonly || !!result
  const submitted = !!result
  const correctAns = result?.correctAnswer ?? extCorrectAns

  // 连线题交互状态（每道题独立）
  const [matchSelected, setMatchSelected] = useState<string | null>(null)

  // 附件上传
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onAttachmentsChange) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      onAttachmentsChange([...(attachments || []), url])
    } catch { alert('上传失败') }
    finally { setUploading(false); e.target.value = '' }
  }

  const removeAttachment = (idx: number) => {
    if (!onAttachmentsChange) return
    const next = [...(attachments || [])]
    next.splice(idx, 1)
    onAttachmentsChange(next)
  }

  // 连线题逻辑
  const handleMatchLeft = (leftId: string) => {
    if (isReadonly) return
    setMatchSelected(prev => prev === leftId ? null : leftId)
  }
  const handleMatchRight = (rightId: string) => {
    if (isReadonly || !matchSelected) return
    const newAns = { ...(ans || {}), [matchSelected]: rightId }
    setMatchSelected(null)
    onAnswer?.(newAns)
  }
  const clearMatchPair = (leftId: string) => {
    const newAns = { ...(ans || {}) }
    delete newAns[leftId]
    onAnswer?.(newAns)
  }

  // 卡片外框颜色：只读+已知结果时显示正误
  const cardBorder = submitted && result
    ? result.correct ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
    : showCorrect ? 'border-blue-200 bg-blue-50'  // 互评查看模式
    : 'border-transparent'

  return (
    <div className={`card border-2 transition-colors ${cardBorder}`}>
      {/* 题目标题行 */}
      <div className="flex items-start gap-3 mb-4">
        <span className="bg-blue-100 text-blue-700 text-xs font-mono px-2 py-0.5 rounded shrink-0 mt-0.5">
          {q.question_no}
        </span>
        <div className="flex-1">
          <span className="badge-gray text-xs mr-2">{TYPE_LABELS[q.type] || q.type}</span>
          <p className="text-gray-800 font-medium mt-1">{q.content}</p>
        </div>
        {submitted && result && (
          <div className="shrink-0">
            {result.correct
              ? <CheckCircle className="w-6 h-6 text-green-500" />
              : <XCircle className="w-6 h-6 text-red-500" />}
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
            const isCorrectOpt = (submitted || showCorrect) && correctAns === letter
            const isWrong = (submitted || showCorrect) && isSelected && correctAns !== letter
            return (
              <label key={letter} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${isCorrectOpt ? 'bg-green-100 border-green-400'
                  : isWrong ? 'bg-red-100 border-red-400'
                  : isSelected ? 'bg-blue-50 border-blue-400'
                  : 'bg-white border-gray-200 hover:bg-gray-50'}
                ${isReadonly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input type="radio" name={`q_${q.id}`} value={letter} checked={isSelected}
                  onChange={() => !isReadonly && onAnswer?.(letter)} disabled={isReadonly} className="shrink-0" />
                <span className="font-medium text-gray-500 w-4">{letter}.</span>
                <span className="text-gray-700">{opt}</span>
              </label>
            )
          })}
          {(submitted || showCorrect) && correctAns !== ans && (
            <p className="text-sm text-green-600 mt-2 ml-3">✓ 正确答案：{String(correctAns)}</p>
          )}
        </div>
      )}

      {/* 判断题 */}
      {q.type === 'judge' && (
        <div className="flex gap-4 ml-10">
          {[{ val: 'true', label: '✓ 正确' }, { val: 'false', label: '✗ 错误' }].map(({ val, label }) => {
            const isSelected = String(ans) === val
            const isCorrectOpt = (submitted || showCorrect) && String(correctAns) === val
            const isWrong = (submitted || showCorrect) && isSelected && String(correctAns) !== val
            return (
              <label key={val} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors
                ${isCorrectOpt ? 'bg-green-100 border-green-400'
                  : isWrong ? 'bg-red-100 border-red-400'
                  : isSelected ? 'bg-blue-50 border-blue-400'
                  : 'bg-white border-gray-200 hover:bg-gray-50'}
                ${isReadonly ? 'cursor-default' : 'cursor-pointer'}`}>
                <input type="radio" name={`q_${q.id}`} value={val} checked={isSelected}
                  onChange={() => !isReadonly && onAnswer?.(val)} disabled={isReadonly} />
                <span className="font-medium">{label}</span>
              </label>
            )
          })}
          {(submitted || showCorrect) && String(correctAns) !== String(ans) && (
            <p className="text-sm text-green-600 self-center">
              ✓ 正确答案：{correctAns === 'true' ? '正确' : '错误'}
            </p>
          )}
        </div>
      )}

      {/* 填空题 */}
      {q.type === 'fill' && (
        <div className="ml-10 space-y-2">
          <input
            className={`input ${submitted && result
              ? result.correct ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
              : showCorrect ? 'border-blue-300' : ''}`}
            value={ans || ''}
            onChange={e => !isReadonly && onAnswer?.(e.target.value)}
            disabled={isReadonly}
            placeholder="请输入答案"
          />
          {(submitted || showCorrect) && correctAns !== undefined && String(correctAns) !== String(ans || '') && (
            <p className="text-sm text-green-600">✓ 正确答案：{String(correctAns)}</p>
          )}

          {/* 附件区域 */}
          {(attachments && attachments.length > 0 || (!isReadonly && onAttachmentsChange)) && (
            <div className="mt-2">
              {attachments && attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`附件${idx + 1}`}
                        className="h-20 w-20 object-cover rounded border border-gray-200 cursor-pointer"
                        onClick={() => window.open(url, '_blank')} />
                      {!isReadonly && (
                        <button onClick={() => removeAttachment(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isReadonly && onAttachmentsChange && (
                <>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 border border-dashed border-blue-300 rounded px-3 py-1.5">
                    <Upload className="w-3 h-3" />
                    {uploading ? '上传中...' : '上传附件图片'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 连线题 */}
      {q.type === 'match' && (() => {
        const opts = q.options as { left: { id: string; text: string; image?: string }[]; right: { id: string; text: string; image?: string }[] }
        if (!opts?.left) return null
        const userAns: Record<string, string> = ans || {}
        const cAns: Record<string, string> = correctAns || {}

        const colorMap: Record<string, string> = {}
        opts.left.forEach((l, i) => { if (userAns[l.id]) colorMap[l.id] = COLORS[i % COLORS.length] })

        return (
          <div className="ml-6">
            {!isReadonly && (
              <p className="text-xs text-blue-500 mb-2">
                {matchSelected ? '再点右侧项完成配对（再次点击左侧可取消）' : '点击左侧项，再点右侧项完成配对'}
              </p>
            )}
            <div className="grid grid-cols-2 gap-6">
              {/* 左侧 */}
              <div className="space-y-2">
                {opts.left.map(l => {
                  const paired = userAns[l.id]
                  const color = colorMap[l.id]
                  const cls = color ? CLS_MAP[color] : null
                  const isSelected = matchSelected === l.id
                  const isCorrectPair = (submitted || showCorrect) && cAns[l.id] && userAns[l.id] === cAns[l.id]
                  const isWrongPair = (submitted || showCorrect) && userAns[l.id] && userAns[l.id] !== cAns[l.id]
                  return (
                    <div key={l.id} onClick={() => handleMatchLeft(l.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all
                        ${(submitted || showCorrect)
                          ? isCorrectPair ? 'border-green-400 bg-green-50'
                            : isWrongPair ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-white'
                          : isSelected ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300'
                            : cls ? `${cls.bg} ${cls.border}`
                            : 'border-gray-200 bg-white hover:bg-gray-50'}
                        ${!isReadonly ? 'cursor-pointer' : ''}`}>
                      {l.image && <img src={l.image} alt="" className="h-10 w-10 object-contain rounded shrink-0" />}
                      <span className="text-sm flex-1">{l.text}</span>
                      {paired && !isReadonly && (
                        <button className="text-gray-400 hover:text-red-500 text-xs shrink-0"
                          onClick={e => { e.stopPropagation(); clearMatchPair(l.id) }}>×</button>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* 右侧 */}
              <div className="space-y-2">
                {opts.right.map(r => {
                  const pairedLeftId = Object.keys(userAns).find(k => userAns[k] === r.id)
                  const color = pairedLeftId ? colorMap[pairedLeftId] : null
                  const cls = color ? CLS_MAP[color] : null
                  const isCorrectPair = (submitted || showCorrect) && Object.entries(cAns).some(([lId, rId]) => rId === r.id && userAns[lId] === rId)
                  const isWrongPair = (submitted || showCorrect) && pairedLeftId && userAns[pairedLeftId] !== cAns[pairedLeftId]
                  return (
                    <div key={r.id} onClick={() => handleMatchRight(r.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all
                        ${(submitted || showCorrect)
                          ? isCorrectPair ? 'border-green-400 bg-green-50'
                            : isWrongPair ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-white'
                          : cls ? `${cls.bg} ${cls.border}`
                            : matchSelected ? 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                            : 'border-gray-200 bg-white'}
                        ${!isReadonly && matchSelected ? 'cursor-pointer' : ''}`}>
                      {r.image && <img src={r.image} alt="" className="h-10 w-10 object-contain rounded shrink-0" />}
                      <span className="text-sm flex-1">{r.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 显示正确配对（错误时） */}
            {(submitted || showCorrect) && Object.keys(cAns).length > 0 && (
              Object.entries(cAns).some(([lId, rId]) => userAns[lId] !== rId)
            ) && (
              <div className="mt-3 p-2.5 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-semibold text-green-700 mb-1">✓ 正确配对：</p>
                {Object.entries(cAns).map(([lId, rId]) => {
                  const lItem = opts.left.find(l => l.id === lId)
                  const rItem = opts.right.find(r => r.id === rId)
                  const isThisCorrect = userAns[lId] === rId
                  return lItem && rItem ? (
                    <p key={lId} className={`text-xs ${isThisCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {isThisCorrect ? '✓' : '✗'} {lItem.text} → {rItem.text}
                    </p>
                  ) : null
                })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
