import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCollections } from '../hooks/useCollections'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { useTransport } from '../hooks/useTransport'
import { CollectionCard } from '../components/CollectionCard'
import { SelectionModePanel } from '../components/SelectionModePanel'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { TutorialOverlay, TutorialStep } from '../components/TutorialOverlay'
import { useTutorial } from '../hooks/useTutorial'
import { useSessionPresence } from '../hooks/useSessionPresence'
import { SignalIcon } from '../components/SignalIcon'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { HeaderMenu } from '../components/HeaderMenu'
import { consumeColdStart, saveLastSession } from '../lib/lastSession'
import { useI18n } from '../i18n'
import type { Collection } from '../types'

// Step icons + translation keys; the copy itself comes from i18n.
const CLIENT_STEP_KEYS = [
  { icon: '📚', key: 's1' },
  { icon: '💬', key: 's2' },
  { icon: '👆', key: 's3' },
  { icon: '🎲', key: 's4' },
  { icon: '✏️', key: 's5' },
] as const

export default function ClientDevice() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { sessionCode, sessionId, loadingSession } = useTransport()

  const clientSteps: TutorialStep[] = CLIENT_STEP_KEYS.map((s) => ({
    icon: s.icon,
    title: t(`tut.${s.key}.title`),
    description: t(`tut.${s.key}.desc`),
  }))

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [sendFeedback, setSendFeedback] = useState(false)
  const tutorial = useTutorial('client', CLIENT_STEP_KEYS.length)

  const { collections, loading: collectionsLoading, createCollection, deleteCollection, addOption, deleteOption, updateOption } =
    useCollections(sessionId)
  const { sendMessage, clearDisplay } = useDisplayMessages()
  const connectionQuality = useSessionPresence()

  // Remember this device's last session so the installed PWA reopens it.
  useEffect(() => {
    consumeColdStart()
  }, [])
  useEffect(() => {
    if (sessionCode) saveLastSession('client', sessionCode)
  }, [sessionCode])

  // Keep selectedCollection in sync when collections update
  useEffect(() => {
    if (!selectedCollection) return
    const updated = collections.find((c) => c.id === selectedCollection.id)
    if (updated) setSelectedCollection(updated)
  }, [collections])

  async function handleCreateCollection() {
    const name = newCollectionName.trim()
    if (!name) return
    setCreating(true)
    await createCollection(name)
    setCreating(false)
    setNewCollectionName('')
    setShowNewCollectionModal(false)
  }

  async function handleSend(text: string) {
    await sendMessage(text)
    setSendFeedback(true)
    setTimeout(() => setSendFeedback(false), 2500)
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-canopy-700 to-canopy-800">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-b from-canopy-700 to-canopy-800 text-sage-50 font-sans flex flex-col">
      <ConnectionBanner />
      {/* Header */}
      <header className="relative flex items-start justify-between px-5 py-4 border-b border-brass-400/15 bg-canopy-900/50">
        <div>
          <h1 className="font-cinzel text-brass-400 font-bold text-xl leading-none">JUMANJI</h1>
          <p className="text-sage-500 text-[11px] font-cinzel uppercase tracking-[0.2em] mt-1.5">
            {t('header.session')} {sessionCode}
          </p>
        </div>

        <div className="flex items-center gap-3.5 pt-0.5">
          <SignalIcon quality={connectionQuality} />
          <button
            onClick={tutorial.restart}
            aria-label={t('common.help')}
            title={t('common.help')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-sage-300/40 text-sage-300 hover:text-sage-50 hover:border-sage-300 text-sm font-cinzel transition-colors"
          >
            ?
          </button>
          <HeaderMenu onLeave={() => navigate('/')} />
        </div>
      </header>

      {/* Sent feedback toast */}
      {sendFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-frond-from border border-brass-400/40 rounded-lg px-4 py-2 font-cinzel text-parchment text-sm animate-slide-up shadow-lg">
          {t('toast.sent')}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-[22px] py-6 flex flex-col gap-6">
        {selectedCollection ? (
          /* ── Collection page ── */
          <div className="animate-slide-up flex flex-col gap-5">
            <button
              onClick={() => setSelectedCollection(null)}
              className="self-start -ml-1 flex items-center gap-2 text-sage-300 hover:text-sage-50 text-sm font-medium uppercase tracking-[0.1em] px-2 py-1.5 rounded transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {t('client.back')}
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-sage-500 mb-1.5">{t('client.activeCollection')}</p>
              <span className="text-brass-400 font-cinzel text-[26px] font-bold leading-tight">{selectedCollection.name}</span>
            </div>
            <SelectionModePanel collection={selectedCollection} onSend={handleSend} />
          </div>
        ) : (
          /* ── Collections list ── */
          <div className="flex flex-col gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-cinzel text-sage-200 text-[15px] font-semibold uppercase tracking-[0.16em]">
                  {t('list.title')}
                </h2>
                <div className="flex items-center gap-2.5">
                  {editMode && (
                    <button
                      onClick={() => setShowNewCollectionModal(true)}
                      className="px-4 py-2 rounded-xl border border-brass-400/45 text-brass-400 font-cinzel font-semibold text-[13px] hover:bg-brass-400/10 transition-colors"
                    >
                      {t('common.newBtn')}
                    </button>
                  )}
                  <button
                    onClick={() => setEditMode((v) => !v)}
                    className={
                      editMode
                        ? 'px-4 py-2 rounded-xl bg-gradient-to-b from-brass-300 to-brass-500 text-canopy-800 font-cinzel font-bold text-[13px] shadow-[0_6px_16px_-6px_rgba(230,182,79,0.6)] transition-colors'
                        : 'px-4 py-2 rounded-xl border border-brass-400/40 text-brass-400 font-cinzel font-semibold text-[14px] hover:bg-brass-400/10 transition-colors'
                    }
                  >
                    {editMode ? t('common.doneBtn') : t('common.editBtn')}
                  </button>
                </div>
              </div>
              <p className="text-sage-400 text-[15px] leading-relaxed">
                {editMode ? t('list.helperEdit') : t('list.helperNormal')}
              </p>
            </div>

            {collectionsLoading && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}

            {!collectionsLoading && collections.length === 0 && (
              <p className="text-sage-400 text-sm text-center py-6 font-cinzel">
                {t('list.empty')}
              </p>
            )}

            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                isSelected={false}
                editMode={editMode}
                onSelect={() => { setSelectedCollection(col); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                onDelete={() => {
                  deleteCollection(col.id)
                  if (selectedCollection?.id === col.id) setSelectedCollection(null)
                }}
                onAddOption={async (text) => {
                  await addOption(col.id, text)
                }}
                onDeleteOption={(optId) => deleteOption(col.id, optId)}
                onUpdateOption={async (optId, text) => { await updateOption(col.id, optId, text) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clear screen footer — fixed flex child; root doesn't scroll, so it's immune to overscroll bounce */}
      <div className="shrink-0 z-10 px-[22px] pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-canopy-900/50 backdrop-blur-sm border-t border-brass-400/15">
        <button
          onClick={() => clearDisplay()}
          className="w-full py-4 rounded-2xl border border-brass-400/45 bg-gradient-to-b from-brass-400/[0.12] to-brass-400/[0.04] hover:from-brass-400/20 hover:to-brass-400/[0.08] text-brass-400 text-base font-cinzel font-semibold tracking-[0.08em] transition-colors active:scale-[0.98]"
        >
          🧹&nbsp; {t('footer.clear')}
        </button>
      </div>

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <Modal title={t('modalNew.title')} onClose={() => { setShowNewCollectionModal(false); setNewCollectionName('') }}>
          <div className="flex flex-col gap-4">
            <Input
              label={t('modalNew.nameLabel')}
              placeholder={t('modalNew.namePlaceholder')}
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCollection() }}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleCreateCollection}
                disabled={creating || !newCollectionName.trim()}
                className="flex-1"
              >
                {creating ? t('common.creating') : t('common.create')}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setShowNewCollectionModal(false); setNewCollectionName('') }}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {tutorial.isVisible && (
        <TutorialOverlay
          steps={clientSteps}
          currentStep={tutorial.currentStep}
          isFirstStep={tutorial.isFirstStep}
          isLastStep={tutorial.isLastStep}
          onNext={tutorial.next}
          onPrev={tutorial.prev}
          onSkip={tutorial.skip}
        />
      )}
    </div>
  )
}
