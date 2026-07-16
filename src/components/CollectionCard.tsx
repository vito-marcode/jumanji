import { useState } from 'react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { ConfirmModal } from './ui/ConfirmModal'
import { useI18n } from '../i18n'
import type { Collection } from '../types'

interface CollectionCardProps {
  collection: Collection
  isSelected: boolean
  editMode: boolean
  onSelect: () => void
  onDelete: () => void
  onAddOption: (text: string) => Promise<void>
  onDeleteOption: (optionId: string) => void
  onUpdateOption: (optionId: string, text: string) => Promise<void>
}

export function CollectionCard({
  collection,
  isSelected,
  editMode,
  onSelect,
  onDelete,
  onAddOption,
  onDeleteOption,
  onUpdateOption,
}: CollectionCardProps) {
  const { t } = useI18n()
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
            onClick={() => { if (editMode) setExpanded((v) => !v); else onSelect() }}
          >
            {editMode && (
              <span className="text-jungle-200 text-sm shrink-0 w-4 text-center">{expanded ? '▲' : '▼'}</span>
            )}
            <span className="font-cinzel text-jungle-100 font-semibold">{collection.name}</span>
            <span className="text-xs text-jungle-200">
              {t(optionCount === 1 ? 'card.messagesOne' : 'card.messagesOther', { n: optionCount })}
            </span>
          </button>

          {editMode && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmDeleteCollection(true)}
              title="Delete collection"
            >
              ✕
            </Button>
          )}
        </div>

        {editMode && expanded && (
          <div className="mt-3 flex flex-col gap-2">
            {(collection.options ?? []).map((opt) => (
              <div key={opt.id} className="flex items-start gap-2 group">
                <span className="text-xs text-jungle-200 w-5 shrink-0 pt-0.5">{opt.position + 1}.</span>
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
                        {saving ? '…' : t('common.save')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-jungle-200 break-words">{opt.text}</span>
                    <button
                      onClick={() => startEdit(opt.id, opt.text)}
                      className="text-jungle-200 hover:text-jungle-50 text-sm shrink-0 px-2 py-1 rounded hover:bg-jungle-700 transition-colors"
                      title={t('card.editMessage')}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setPendingDeleteOptionId(opt.id)}
                      className="text-red-400 hover:text-red-300 text-sm shrink-0 px-2 py-1 rounded hover:bg-red-900/30 transition-colors"
                      title={t('card.deleteMessage')}
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
                  placeholder={t('card.messagePlaceholder')}
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
                    {t('common.add')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowAddInput(false); setNewOptionText('') }}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowAddInput(true)} className="mt-1 w-full">
                {t('card.addMessage')}
              </Button>
            )}
          </div>
        )}
      </Card>

      {confirmDeleteCollection && (
        <ConfirmModal
          title={t('card.deleteCollectionTitle')}
          message={t('card.deleteCollectionMsg', { name: collection.name })}
          confirmLabel={t('common.delete')}
          onConfirm={() => { setConfirmDeleteCollection(false); onDelete() }}
          onCancel={() => setConfirmDeleteCollection(false)}
        />
      )}

      {pendingDeleteOptionId && pendingDeleteOption && (
        <ConfirmModal
          title={t('card.deleteMessageTitle')}
          message={t('card.deleteMessageMsg', { text: pendingDeleteOption.text })}
          confirmLabel={t('common.delete')}
          onConfirm={() => { onDeleteOption(pendingDeleteOptionId); setPendingDeleteOptionId(null) }}
          onCancel={() => setPendingDeleteOptionId(null)}
        />
      )}
    </>
  )
}
