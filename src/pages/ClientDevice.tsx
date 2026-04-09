import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCollections } from '../hooks/useCollections'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { CollectionCard } from '../components/CollectionCard'
import { SelectionModePanel } from '../components/SelectionModePanel'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { TutorialOverlay, TutorialStep } from '../components/TutorialOverlay'
import { useTutorial } from '../hooks/useTutorial'
import type { Collection, Session } from '../types'

const CLIENT_STEPS: TutorialStep[] = [
  {
    icon: '📚',
    title: 'Your Collections',
    description: 'Collections are groups of options. Create as many as you need — topics, names, challenges, anything.',
  },
  {
    icon: '✏️',
    title: 'Add Options',
    description: 'Expand a collection to add, edit, or delete options. Each option can be sent to the main display.',
  },
  {
    icon: '👆',
    title: 'Manual Mode',
    description: 'Tap any option to send it instantly to the main display. Great for direct, deliberate choices.',
  },
  {
    icon: '🎲',
    title: 'Random Mode',
    description: 'Switch to Random, select options with checkboxes, then roll! A random pick is revealed with suspense.',
  },
]

export default function ClientDevice() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()

  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [creating, setCreating] = useState(false)
  const [sendFeedback, setSendFeedback] = useState(false)
  const tutorial = useTutorial('client', CLIENT_STEPS.length)

  const { collections, loading: collectionsLoading, createCollection, deleteCollection, addOption, deleteOption, updateOption } =
    useCollections(session?.id ?? null)
  const { sendMessage, clearDisplay } = useDisplayMessages(session?.id ?? null)

  useEffect(() => {
    if (!sessionCode) return
    supabase
      .from('sessions')
      .select()
      .eq('code', sessionCode.toUpperCase())
      .single()
      .then(({ data, error }) => {
        setLoadingSession(false)
        if (error || !data) navigate('/')
        else setSession(data as Session)
      })
  }, [sessionCode, navigate])

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
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-jungle-800 bg-jungle-900/60">
        <div>
          <h1 className="font-cinzel text-gold-300 font-bold text-base">JUMANJI</h1>
          <p className="text-jungle-500 text-xs font-cinzel uppercase tracking-wider">
            Session: {sessionCode}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={tutorial.restart}
            className="text-jungle-600 hover:text-jungle-400 text-xs font-cinzel uppercase tracking-widest transition-colors"
          >
            ? Help
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-jungle-600 hover:text-jungle-400 text-xs font-cinzel transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Sent feedback toast */}
      {sendFeedback && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-jungle-700 border border-jungle-400 border-glow-green rounded-lg px-4 py-2 font-cinzel text-jungle-100 text-sm animate-slide-up shadow-glow_green">
          ✓ Sent to the Main Screen
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Selection panel — shown when a collection is selected */}
        {selectedCollection && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gold-400 font-cinzel text-sm font-semibold">{selectedCollection.name}</span>
              <button
                onClick={() => setSelectedCollection(null)}
                className="text-jungle-500 hover:text-jungle-300 text-xs transition-colors"
              >
                (change)
              </button>
            </div>
            <SelectionModePanel collection={selectedCollection} onSend={handleSend} />
          </div>
        )}

        {/* Collections list */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-cinzel text-jungle-300 text-sm uppercase tracking-widest">Collections</h2>
            <Button variant="primary" size="sm" onClick={() => setShowNewCollectionModal(true)}>
              + New
            </Button>
          </div>

          {collectionsLoading && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}

          {!collectionsLoading && collections.length === 0 && (
            <p className="text-jungle-600 text-sm text-center py-6 font-cinzel">
              No collections yet. Create one to begin.
            </p>
          )}

          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              isSelected={selectedCollection?.id === col.id}
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
      </div>

      {/* Clear screen footer */}
      <div className="sticky bottom-0 z-10 px-4 py-3 bg-jungle-950/90 backdrop-blur-sm border-t border-jungle-800">
        <button
          onClick={() => clearDisplay()}
          className="w-full py-3 rounded border border-gold-800 bg-gold-950/40 hover:bg-gold-900/20 hover:border-gold-600 text-gold-400 hover:text-gold-300 text-sm font-cinzel uppercase tracking-widest transition-colors active:scale-95"
        >
          🧹 Clear main screen
        </button>
      </div>

      {/* New Collection Modal */}
      {showNewCollectionModal && (
        <Modal title="New Collection" onClose={() => { setShowNewCollectionModal(false); setNewCollectionName('') }}>
          <div className="flex flex-col gap-4">
            <Input
              label="Collection Name"
              placeholder="e.g. Dangers, Fate Cards, Items…"
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
                {creating ? 'Creating…' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setShowNewCollectionModal(false); setNewCollectionName('') }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {tutorial.isVisible && (
        <TutorialOverlay
          steps={CLIENT_STEPS}
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
