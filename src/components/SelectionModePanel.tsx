import { useEffect, useRef, useState } from 'react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import type { Collection, Option } from '../types'

type Mode = 'manual' | 'segment' | 'random'
type RevealPhase = 'idle' | 'suspense' | 'revealed'

interface SelectionModePanelProps {
  collection: Collection
  onSend: (text: string) => Promise<void>
}

const REVEAL_DELAY_MS = 3000

export function SelectionModePanel({ collection, onSend }: SelectionModePanelProps) {
  const [mode, setMode] = useState<Mode>('manual')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((collection.options ?? []).map(o => o.id))
  )
  const [rolledOption, setRolledOption] = useState<Option | null>(null)
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const options = collection.options ?? []

  // Clean up timer on unmount
  useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current) }, [])

  function pickRandom(pool: Option[]): Option | null {
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // Auto-send + delayed reveal for random modes
  function rollAndReveal(pool: Option[]) {
    const picked = pickRandom(pool)
    if (!picked) return
    if (revealTimer.current) clearTimeout(revealTimer.current)
    setRolledOption(picked)
    setRevealPhase('suspense')
    onSend(picked.text) // send to main display immediately
    revealTimer.current = setTimeout(() => setRevealPhase('revealed'), REVEAL_DELAY_MS)
  }

  function rollSegment() {
    rollAndReveal(options.filter(o => selectedIds.has(o.id)))
  }

  function rollAll() {
    rollAndReveal(options)
  }

  function toggleOption(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(
      selectedIds.size === options.length
        ? new Set()
        : new Set(options.map(o => o.id))
    )
  }

  // Manual mode send (user-controlled, keeps send button)
  async function handleManualSend(text: string) {
    setSending(true)
    await onSend(text)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  function switchMode(m: Mode) {
    if (revealTimer.current) clearTimeout(revealTimer.current)
    setMode(m)
    setRolledOption(null)
    setRevealPhase('idle')
    setSent(false)
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'manual',  label: 'Manual' },
    { id: 'segment', label: 'Random Segment' },
    { id: 'random',  label: 'Random All' },
  ]

  return (
    <Card glow="green" className="p-4 flex flex-col gap-4">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchMode(tab.id)}
            className={`flex-1 py-2 px-2 text-xs font-cinzel rounded transition-colors ${
              mode === tab.id
                ? 'bg-jungle-600 text-jungle-50 border border-jungle-400'
                : 'bg-jungle-900 text-jungle-400 border border-jungle-700 hover:border-jungle-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Manual ── */}
      {mode === 'manual' && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <p className="text-jungle-500 text-sm text-center py-4">No options yet. Add some above.</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleManualSend(opt.text)}
              disabled={sending}
              className="text-left px-3 py-2.5 rounded border border-jungle-700 hover:border-gold-500 bg-jungle-800 hover:bg-jungle-700 text-jungle-100 text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="text-jungle-500 text-xs mr-2">{opt.position + 1}.</span>
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {/* ── Random Segment ── */}
      {mode === 'segment' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-cinzel text-jungle-400 uppercase tracking-wider">
              {selectedIds.size}/{options.length} selected
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-cinzel text-jungle-400 hover:text-jungle-200 transition-colors uppercase tracking-wider"
            >
              {selectedIds.size === options.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto">
            {options.length === 0 && (
              <p className="text-jungle-500 text-sm text-center py-4">No options yet.</p>
            )}
            {options.map((opt) => {
              const checked = selectedIds.has(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`flex items-center gap-3 text-left px-3 py-2 rounded border transition-colors ${
                    checked
                      ? 'border-jungle-500 bg-jungle-800 text-jungle-100'
                      : 'border-jungle-800 bg-jungle-900/40 text-jungle-500'
                  }`}
                >
                  <span className={`w-4 h-4 flex-shrink-0 rounded-sm border text-xs flex items-center justify-center ${
                    checked ? 'border-jungle-400 bg-jungle-600 text-jungle-100' : 'border-jungle-700'
                  }`}>
                    {checked && '✓'}
                  </span>
                  <span className="text-jungle-500 text-xs mr-1">{opt.position + 1}.</span>
                  <span className="text-sm">{opt.text}</span>
                </button>
              )
            })}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={rollSegment}
            disabled={selectedIds.size === 0 || revealPhase === 'suspense'}
            className="w-full"
          >
            🎲 Roll from selection
          </Button>

          {rolledOption && revealPhase !== 'idle' && (
            <RandomReveal option={rolledOption} phase={revealPhase} />
          )}
        </div>
      )}

      {/* ── Random All ── */}
      {mode === 'random' && (
        <div className="flex flex-col gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={rollAll}
            disabled={options.length === 0 || revealPhase === 'suspense'}
            className="w-full"
          >
            🎲 Roll the Dice
          </Button>
          {options.length === 0 && (
            <p className="text-jungle-500 text-sm text-center">No options yet.</p>
          )}
          {rolledOption && revealPhase !== 'idle' && (
            <RandomReveal option={rolledOption} phase={revealPhase} />
          )}
        </div>
      )}
    </Card>
  )
}

function RandomReveal({ option, phase }: { option: Option; phase: RevealPhase }) {
  return (
    <div className="flex flex-col gap-2 animate-slide-up">
      <div className={`relative rounded-lg border overflow-hidden p-4 text-center transition-colors duration-700 ${
        phase === 'revealed'
          ? 'border-jungle-500 bg-jungle-950/60'
          : 'border-jungle-800 bg-jungle-950/40'
      }`}>
        {/* Blurred text — clears on reveal */}
        <p
          className="font-cinzel uppercase tracking-widest text-gold-300 text-base transition-all duration-[2000ms] ease-out"
          style={{
            filter: phase === 'suspense' ? 'blur(10px)' : 'blur(0px)',
            opacity: phase === 'suspense' ? 0.25 : 1,
          }}
        >
          {option.text}
        </p>

        {/* Suspense label — fades out when revealing */}
        <p
          className="text-xs font-cinzel text-jungle-500 mt-2 uppercase tracking-widest transition-opacity duration-500"
          style={{ opacity: phase === 'suspense' ? 1 : 0 }}
        >
          appearing on main screen…
        </p>
      </div>

      {phase === 'revealed' && (
        <p className="text-xs text-jungle-600 text-center font-cinzel animate-fade-in">
          ✓ sent to main screen
        </p>
      )}
    </div>
  )
}
