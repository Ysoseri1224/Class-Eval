import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, Link } from 'lucide-react'

export interface MatchItem {
  id: string
  text: string
  image?: string
}

export interface MatchOptions {
  left: MatchItem[]
  right: MatchItem[]
}

interface Props {
  options: MatchOptions
  answer: Record<string, string>
  onChange: (options: MatchOptions, answer: Record<string, string>) => void
  disabled?: boolean
}

const API_BASE = '/api'

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data.url
}

function ItemEditor({ item, onUpdate, onRemove, disabled }: {
  item: MatchItem
  onUpdate: (updated: MatchItem) => void
  onRemove: () => void
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      onUpdate({ ...item, image: url })
    } catch { alert('上传失败') }
    finally { setUploading(false) }
  }

  return (
    <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 space-y-1.5">
        <input
          className="input text-sm py-1.5"
          value={item.text}
          onChange={e => onUpdate({ ...item, text: e.target.value })}
          placeholder="输入描述文字"
          disabled={disabled}
        />
        {item.image && (
          <div className="relative inline-block">
            <img src={item.image} alt="" className="h-16 rounded border border-gray-200 object-contain" />
            {!disabled && (
              <button
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                onClick={() => onUpdate({ ...item, image: undefined })}
              >×</button>
            )}
          </div>
        )}
        {!disabled && !item.image && (
          <>
            <button
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-3 h-3" />{uploading ? '上传中...' : '上传图片'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </>
        )}
      </div>
      {!disabled && (
        <button className="text-red-400 hover:text-red-600 mt-1 shrink-0" onClick={onRemove}>
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default function MatchQuestionEditor({ options, answer, onChange, disabled }: Props) {
  const addItem = (side: 'left' | 'right') => {
    const items = options[side]
    const newId = `${side[0].toUpperCase()}${Date.now()}`
    const newItems = [...items, { id: newId, text: '' }]
    onChange({ ...options, [side]: newItems }, answer)
  }

  const updateItem = (side: 'left' | 'right', idx: number, updated: MatchItem) => {
    const items = [...options[side]]
    const oldId = items[idx].id
    items[idx] = updated
    // 如果 id 变了（理论上不会），更新 answer 里的 key
    const newAnswer = { ...answer }
    if (oldId !== updated.id) {
      if (newAnswer[oldId] !== undefined) {
        newAnswer[updated.id] = newAnswer[oldId]
        delete newAnswer[oldId]
      }
    }
    onChange({ ...options, [side]: items }, newAnswer)
  }

  const removeItem = (side: 'left' | 'right', idx: number) => {
    const items = [...options[side]]
    const removedId = items[idx].id
    items.splice(idx, 1)
    const newAnswer = { ...answer }
    if (side === 'left') delete newAnswer[removedId]
    else {
      // 删右侧：清掉所有指向该项的答案
      for (const k of Object.keys(newAnswer)) {
        if (newAnswer[k] === removedId) delete newAnswer[k]
      }
    }
    onChange({ ...options, [side]: items }, newAnswer)
  }

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)

  const handleLeftClick = (id: string) => {
    if (disabled) return
    setSelectedLeft(prev => prev === id ? null : id)
  }

  const handleRightClick = (id: string) => {
    if (disabled || !selectedLeft) return
    const newAnswer = { ...answer, [selectedLeft]: id }
    onChange(options, newAnswer)
    setSelectedLeft(null)
  }

  const clearPair = (leftId: string) => {
    const newAnswer = { ...answer }
    delete newAnswer[leftId]
    onChange(options, newAnswer)
  }

  // 颜色映射（给已配对的项上色）
  const COLORS = ['blue', 'green', 'purple', 'orange', 'pink', 'teal', 'red', 'yellow']
  const pairColorMap: Record<string, string> = {}
  options.left.forEach((l, i) => {
    if (answer[l.id]) pairColorMap[l.id] = COLORS[i % COLORS.length]
  })

  const colorClass: Record<string, { bg: string; border: string; text: string }> = {
    blue:   { bg: 'bg-blue-100',   border: 'border-blue-400',   text: 'text-blue-700' },
    green:  { bg: 'bg-green-100',  border: 'border-green-400',  text: 'text-green-700' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
    pink:   { bg: 'bg-pink-100',   border: 'border-pink-400',   text: 'text-pink-700' },
    teal:   { bg: 'bg-teal-100',   border: 'border-teal-400',   text: 'text-teal-700' },
    red:    { bg: 'bg-red-100',    border: 'border-red-400',    text: 'text-red-700' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' },
  }

  return (
    <div className="space-y-4">
      {/* 编辑左右两侧内容 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">左侧项目</span>
            {!disabled && (
              <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800" onClick={() => addItem('left')}>
                <Plus className="w-3 h-3" />添加
              </button>
            )}
          </div>
          <div className="space-y-2">
            {options.left.map((item, i) => (
              <ItemEditor key={item.id} item={item} onUpdate={u => updateItem('left', i, u)} onRemove={() => removeItem('left', i)} disabled={disabled} />
            ))}
            {options.left.length === 0 && <p className="text-xs text-gray-400 text-center py-3">暂无左侧项</p>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">右侧项目</span>
            {!disabled && (
              <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800" onClick={() => addItem('right')}>
                <Plus className="w-3 h-3" />添加
              </button>
            )}
          </div>
          <div className="space-y-2">
            {options.right.map((item, i) => (
              <ItemEditor key={item.id} item={item} onUpdate={u => updateItem('right', i, u)} onRemove={() => removeItem('right', i)} disabled={disabled} />
            ))}
            {options.right.length === 0 && <p className="text-xs text-gray-400 text-center py-3">暂无右侧项</p>}
          </div>
        </div>
      </div>

      {/* 配对设置区域 */}
      {options.left.length > 0 && options.right.length > 0 && (
        <div className="border border-dashed border-blue-300 rounded-xl p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <Link className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-700">
              {disabled ? '配对关系' : '点击左侧项，再点右侧项完成配对'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {/* 左侧 */}
            <div className="space-y-2">
              {options.left.map(l => {
                const paired = answer[l.id]
                const color = pairColorMap[l.id]
                const cls = color ? colorClass[color] : null
                const isSelected = selectedLeft === l.id
                return (
                  <div
                    key={l.id}
                    onClick={() => handleLeftClick(l.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all
                      ${isSelected ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300' : cls ? `${cls.bg} ${cls.border}` : 'bg-white border-gray-200'}
                      ${!disabled ? 'cursor-pointer hover:shadow-sm' : ''}
                    `}
                  >
                    {l.image && <img src={l.image} alt="" className="h-10 w-10 object-contain rounded shrink-0" />}
                    <span className="text-sm flex-1">{l.text || <span className="text-gray-400 italic">（空）</span>}</span>
                    {paired && (
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${cls?.text}`}>→</span>
                        {!disabled && (
                          <button className="text-gray-400 hover:text-red-500 text-xs" onClick={e => { e.stopPropagation(); clearPair(l.id) }}>×</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* 右侧 */}
            <div className="space-y-2">
              {options.right.map(r => {
                const pairedLeftId = Object.keys(answer).find(k => answer[k] === r.id)
                const color = pairedLeftId ? pairColorMap[pairedLeftId] : null
                const cls = color ? colorClass[color] : null
                return (
                  <div
                    key={r.id}
                    onClick={() => handleRightClick(r.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all
                      ${cls ? `${cls.bg} ${cls.border}` : 'bg-white border-gray-200'}
                      ${!disabled && selectedLeft ? 'cursor-pointer hover:shadow-sm hover:border-blue-400' : ''}
                    `}
                  >
                    {r.image && <img src={r.image} alt="" className="h-10 w-10 object-contain rounded shrink-0" />}
                    <span className="text-sm flex-1">{r.text || <span className="text-gray-400 italic">（空）</span>}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
