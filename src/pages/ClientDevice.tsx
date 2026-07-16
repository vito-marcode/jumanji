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
      <div className="min-h-screen flex items-center justify-center bg-jungle-950">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-jungle-950 flex flex-col">
      <ConnectionBanner />
      {/* Header */}
      <header className="relative flex items-center justify-between px-4 py-3 border-b border-jungle-800 bg-jungle-900/60">
        <div>
          <h1 className="font-cinzel text-gold-300 font-bold text-base">JUMANJI</h1>
          <p className="text-jungle-200 text-xs font-cinzel uppercase tracking-wider">
            {t('header.session')} {sessionCode}
          </p>
        </div>
        {/* Signal icon — centered */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <SignalIcon quality={connectionQuality} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={tutorial.restart}
            aria-label={t('common.help')}
            title={t('common.help')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-jungle-700 text-jungle-200 hover:text-jungle-50 hover:bg-jungle-800 text-sm font-cinzel transition-colors"
          >
            ?
          </button>
          <HeaderMenu onLeave={() => navigate('/')} />
        </div>
      </header>

      {/* Sent feedback toast */}
      {sendFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-jungle-700 border border-jungle-400 border-glow-green rounded-lg px-4 py-2 font-cinzel text-jungle-100 text-sm animate-slide-up shadow-glow_green">
          {t('toast.sent')}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {selectedCollection ? (
          /* ── Collection page ── */
          <div className="animate-slide-up flex flex-col gap-4">
            <button
              onClick={() => setSelectedCollection(null)}
              className="self-start flex items-center gap-2 text-jungle-200 hover:text-jungle-50 text-sm font-cinzel uppercase tracking-widest px-3 py-2 rounded hover:bg-jungle-800 transition-colors"
            >
              ← {t('client.back')}
            </button>
            <div>
              <p className="text-xs font-cinzel uppercase tracking-widest text-jungle-100 mb-1">{t('client.activeCollection')}</p>
              <span className="text-gold-300 font-cinzel text-xl font-semibold">{selectedCollection.name}</span>
            </div>
            <SelectionModePanel collection={selectedCollection} onSend={handleSend} />
          </div>
        ) : (
          /* ── Collections list ── */
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-cinzel text-jungle-100 text-sm uppercase tracking-widest">
                  {t('list.title')}
                </h2>
                <div className="flex items-center gap-2">
                  {editMode && (
                    <Button variant="primary" size="sm" onClick={() => setShowNewCollectionModal(true)}>
                      {t('common.newBtn')}
                    </Button>
                  )}
                  <Button
                    variant={editMode ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setEditMode((v) => !v)}
                  >
                    {editMode ? t('common.doneBtn') : t('common.editBtn')}
                  </Button>
                </div>
              </div>
              <p className="text-jungle-200 text-sm">
                {editMode ? t('list.helperEdit') : t('list.helperNormal')}
              </p>
            </div>

            {collectionsLoading && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}

            {!collectionsLoading && collections.length === 0 && (
              <p className="text-jungle-200 text-sm text-center py-6 font-cinzel">
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

      {/* Clear screen footer */}
      <div className="sticky bottom-0 z-10 px-4 py-3 bg-jungle-950/90 backdrop-blur-sm border-t border-jungle-800">
        <button
          onClick={() => clearDisplay()}
          className="w-full py-3 rounded border border-gold-800 bg-gold-950/40 hover:bg-gold-900/20 hover:border-gold-600 text-gold-400 hover:text-gold-300 text-sm font-cinzel uppercase tracking-widest transition-colors active:scale-95"
        >
          🧹 {t('footer.clear')}
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
