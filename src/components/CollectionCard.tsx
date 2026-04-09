import { useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ConfirmModal } from './ui/ConfirmModal'
import type { Collection } from '../types'

interface CollectionCardProps {
  collection: Collection
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onAddOption: (text: string) => Promise<void>
  onDeleteOption: (optionId: string) => void
  onUpdateOption: (optionId: string, text: string) => Promise<void>
}

export function CollectionCard({
  collection,
  isSelected,
  onSelect,
  onDelete,
  onAddOption,
  onDeleteOption,
  onUpdateOption,
}: CollectionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [newOptionText, setNewOptionText] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)
  const [confirmDeleteCollection, setConfirmDeleteCollection] = useState(false)
  const [pendingDeleteOptionId, setPendingDeleteOptionId] = useState<string | null>(null)
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(optId: string, currentText: string) {
    setEditingOptionId(optId)
    setEditText(currentText)
  }

  function cancelEdit() {
    setEditingOptionId(null)
    setEditText('')
  }

  async function saveEdit() {
    if (!editingOptionId || !editText.trim()) return
    setSaving(true)
    await onUpdateOption(editingOptionId, editText.trim())
    setSaving(false)
    setEditingOptionId(null)
    setEditText('')
  }

  const optionCount = collection.options?.length ?? 0

  async function handleAddOption() {
    const text = newOptionText.trim()
    if (!text) return
    setAdding(true)
    await onAddOption(text)
    setNewOptionText('')
    setAdding(false)
    setShowAddInput(false)
  }

  const pendingDeleteOption = collection.options?.find(o => o.id === pendingDeleteOptionId)

  return (
    <>
      <Card
        glow={isSelected ? 'gold' : 'none'}
        className={`p-4 transition-all duration-200 ${isSelected ? 'border-gold-500' : 'hover:border-jungle-500'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            className="flex-1 text-left flex items-center gap-2"
            onClick={() => { onSelect(); setExpanded(true) }}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-jungle-600 bg-jungle-800 text-jungle-300 text-xs leading-none shrink-0">▶</span>
            <span className="font-cinzel text-jungle-100 font-semibold">{collection.name}</span>
            <span className="text-xs text-jungle-500">{optionCount} option{optionCount !== 1 ? 's' : ''}</span>
          </button>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '▲' : '▼'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDeleteCollection(true)}
              title="Delete collection"
            >
              ✕
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 flex flex-col gap-2">
            {(collection.options ?? []).map((opt) => (
              <div key={opt.id} className="flex items-start gap-2 group">
                <span className="text-xs text-jungle-500 w-5 shrink-0 pt-0.5">{opt.position + 1}.</span>
                {editingOptionId === opt.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="bg-jungle-800 border border-jungle-600 focus:border-jungle-300 focus:outline-none rounded px-3 py-2 text-jungle-50 text-sm transition-colors resize-none w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving || !editText.trim()}>
                        {saving ? '…' : 'Save'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-jungle-200 break-words">{opt.text}</span>
                    <button
                      onClick={() => startEdit(opt.id, opt.text)}
                      className="opacity-0 group-hover:opacity-100 text-jungle-500 hover:text-jungle-300 text-xs shrink-0 transition-opacity"
                      title="Edit option"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setPendingDeleteOptionId(opt.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-xs shrink-0 transition-opacity"
                      title="Delete option"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}

            {showAddInput ? (
              <div className="mt-1 flex flex-col gap-2">
                <textarea
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  placeholder="Enter option text..."
                  rows={2}
                  className="bg-jungle-800 border border-jungle-600 focus:border-jungle-300 focus:outline-none rounded px-3 py-2 text-jungle-50 placeholder-jungle-500 text-sm transition-colors resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddOption()
                    }
                    if (e.key === 'Escape') setShowAddInput(false)
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={handleAddOption} disabled={adding || !newOptionText.trim()}>
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAddInput(false); setNewOptionText('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowAddInput(true)} className="mt-1 w-full">
                + Add Option
              </Button>
            )}
          </div>
        )}
      </Card>

      {confirmDeleteCollection && (
        <ConfirmModal
          title="Delete collection?"
          message={`"${collection.name}" and all its options will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={() => { setConfirmDeleteCollection(false); onDelete() }}
          onCancel={() => setConfirmDeleteCollection(false)}
        />
      )}

      {pendingDeleteOptionId && pendingDeleteOption && (
        <ConfirmModal
          title="Delete option?"
          message={`"${pendingDeleteOption.text}" will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={() => { onDeleteOption(pendingDeleteOptionId); setPendingDeleteOptionId(null) }}
          onCancel={() => setPendingDeleteOptionId(null)}
        />
      )}
    </>
  )
}
