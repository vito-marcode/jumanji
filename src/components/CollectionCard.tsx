import { useState } from 'react'
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

// Shared inline button styles (client restyle palette — brass/sage).
const BTN_PRIMARY =
  'px-3.5 py-2 rounded-xl bg-gradient-to-b from-brass-300 to-brass-500 text-canopy-800 font-cinzel font-bold text-[13px] shadow-[0_6px_16px_-6px_rgba(230,182,79,0.6)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95'
const BTN_GHOST =
  'px-3.5 py-2 rounded-xl border border-sage-500/40 text-sage-300 font-cinzel font-semibold text-[13px] hover:text-sage-50 hover:border-sage-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95'

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
      <div
        className={`rounded-[18px] border bg-gradient-to-b from-frond-from/55 to-frond-to/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 ${
          editMode ? 'p-[18px]' : 'p-[22px]'
        } ${isSelected ? 'border-brass-400' : editMode && expanded ? 'border-moss/28' : 'border-moss/[0.22] hover:border-moss/40'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            className="flex-1 text-left flex items-center gap-3"
            onClick={() => { if (editMode) setExpanded((v) => !v); else onSelect() }}
          >
            {editMode && (
              <span className="text-signal text-xs shrink-0 w-4 text-center">{expanded ? '▲' : '▼'}</span>
            )}
            <span className={`font-cinzel text-parchment font-semibold ${editMode ? 'text-[19px]' : 'text-[21px]'}`}>{collection.name}</span>
            <span className="text-[13px] text-sage-500 ml-auto shrink-0 pl-3">
              {t(optionCount === 1 ? 'card.messagesOne' : 'card.messagesOther', { n: optionCount })}
            </span>
          </button>

          {editMode && (
            <button
              onClick={() => setConfirmDeleteCollection(true)}
              title="Delete collection"
              className="w-10 h-10 shrink-0 rounded-xl bg-red-500/[0.22] border border-red-400/50 text-red-300 flex items-center justify-center text-base hover:bg-red-500/30 transition-colors active:scale-95"
            >
              ✕
            </button>
          )}
        </div>

        {/* Gold underline accent — list view only */}
        {!editMode && (
          <div className="mt-3.5 h-1 rounded-full bg-gradient-to-r from-brass-400/55 to-transparent" />
        )}

        {editMode && expanded && (
          <div className="mt-4 flex flex-col gap-1">
            {(collection.options ?? []).map((opt) => (
              <div key={opt.id} className="flex items-center gap-3 py-2.5 border-b border-moss/10 last:border-b-0">
                <span className="font-cinzel text-[13px] text-sage-500 w-4 shrink-0">{opt.position + 1}</span>
                {editingOptionId === opt.id ? (
                  <div className="flex-1 flex flex-col gap-2 py-1">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="bg-canopy-900 border border-moss/30 focus:border-brass-400 focus:outline-none rounded-lg px-3 py-2 text-sage-50 text-sm transition-colors resize-none w-full"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button className={BTN_PRIMARY} onClick={saveEdit} disabled={saving || !editText.trim()}>
                        {saving ? '…' : t('common.save')}
                      </button>
                      <button className={BTN_GHOST} onClick={cancelEdit}>{t('common.cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-[15px] text-sage-100 break-words">{opt.text}</span>
                    <button
                      onClick={() => startEdit(opt.id, opt.text)}
                      className="text-sage-300 hover:text-sage-50 text-[15px] shrink-0 px-2 py-1 rounded transition-colors"
                      title={t('card.editMessage')}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setPendingDeleteOptionId(opt.id)}
                      className="text-[#d98a8a] hover:text-red-300 text-[15px] shrink-0 px-2 py-1 rounded transition-colors"
                      title={t('card.deleteMessage')}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ))}

            {showAddInput ? (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  placeholder={t('card.messagePlaceholder')}
                  rows={2}
                  className="bg-canopy-900 border border-moss/30 focus:border-brass-400 focus:outline-none rounded-lg px-3 py-2 text-sage-50 placeholder-sage-500 text-sm transition-colors resize-none"
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
                  <button className={BTN_PRIMARY} onClick={handleAddOption} disabled={adding || !newOptionText.trim()}>
                    {t('common.add')}
                  </button>
                  <button className={BTN_GHOST} onClick={() => { setShowAddInput(false); setNewOptionText('') }}>
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddInput(true)}
                className="mt-3 w-full py-3.5 rounded-xl border border-dashed border-brass-400/40 text-brass-400 font-cinzel font-semibold text-sm hover:bg-brass-400/[0.06] transition-colors"
              >
                {t('card.addMessage')}
              </button>
            )}
          </div>
        )}
      </div>

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
