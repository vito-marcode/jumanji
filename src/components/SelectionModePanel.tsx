import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import type { Collection, Option } from '../types'

type Mode = 'manual' | 'random'
type RevealPhase = 'idle' | 'suspense' | 'revealed'

interface SelectionModePanelProps {
  collection: Collection
  onSend: (text: string) => Promise<void>
}

const REVEAL_DELAY_MS = 3000

export function SelectionModePanel({ collection, onSend }: SelectionModePanelProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('manual')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set((collection.options ?? []).map(o => o.id))
  )
  const [rolledOption, setRolledOption] = useState<Option | null>(null)
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle')
  const [previewOption, setPreviewOption] = useState<Option | null>(null)
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const options = collection.options ?? []

  // Reset selection when collection changes
  useEffect(() => {
    setSelectedIds(new Set((collection.options ?? []).map(o => o.id)))
    setRolledOption(null)
    setRevealPhase('idle')
    setPreviewOption(null)
    if (revealTimer.current) clearTimeout(revealTimer.current)
  }, [collection.id])

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
    // Hide previous result first to avoid flash of old revealed state
    setRolledOption(null)
    setRevealPhase('idle')
    onSend(picked.text) // send to main display immediately
    revealTimer.current = setTimeout(() => {
      setRolledOption(picked)
      setRevealPhase('suspense')
      revealTimer.current = setTimeout(() => {
        setRevealPhase('revealed')
        // Deselect the extracted option only now, in sync with the reveal,
        // so unchecking it doesn't spoil which option was picked.
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(picked.id)
          return next
        })
      }, REVEAL_DELAY_MS)
    }, 50)
  }

  function rollSegment() {
    rollAndReveal(options.filter(o => selectedIds.has(o.id)))
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

  // Manual mode: confirm-and-send from the preview sheet
  async function handleConfirmSend() {
    if (!previewOption) return
    await onSend(previewOption.text)
    setPreviewOption(null)
  }

  function switchMode(m: Mode) {
    if (revealTimer.current) clearTimeout(revealTimer.current)
    setMode(m)
    setRolledOption(null)
    setRevealPhase('idle')
    setPreviewOption(null)
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'manual',  label: t('panel.manual') },
    { id: 'random', label: t('panel.random') },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchMode(tab.id)}
            className={`flex-1 py-3 px-3 text-sm font-cinzel rounded transition-colors ${
              mode === tab.id
                ? 'bg-jungle-600 text-jungle-50 border border-jungle-400'
                : 'bg-jungle-900 text-jungle-200 border border-jungle-600 hover:border-jungle-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-jungle-200 text-sm">
        {mode === 'manual' ? t('panel.helperManual') : t('panel.helperRandom')}
      </p>

      {/* ── Manual ── */}
      {mode === 'manual' && (
        <div className="flex flex-col gap-2">
          {options.length === 0 && (
            <p className="text-jungle-200 text-sm text-center py-4">{t('panel.emptyManual')}</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPreviewOption(opt)}
              className="flex items-center gap-2 text-left px-3 py-3 rounded border border-jungle-700 hover:border-gold-500 bg-jungle-800 hover:bg-jungle-700 text-jungle-100 text-sm transition-all active:scale-95"
            >
              <span className="text-jungle-200 text-xs">{opt.position + 1}.</span>
              <span className="flex-1">{opt.text}</span>
              <span className="text-jungle-300 shrink-0" aria-hidden>›</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Random Segment ── */}
      {mode === 'random' && (
        <div className="flex flex-col gap-3">
          <SlideToSend
            onConfirm={rollSegment}
            disabled={selectedIds.size === 0 || revealPhase === 'suspense'}
            label={t('panel.slideRoll')}
            resetOnConfirm
          />

          {rolledOption && revealPhase !== 'idle' && (
            <RandomReveal option={rolledOption} phase={revealPhase} />
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-cinzel text-jungle-200 uppercase tracking-wider">
              {t('panel.selected', { n: selectedIds.size, m: options.length })}
            </span>
            <button
              onClick={toggleAll}
              className="text-xs font-cinzel text-jungle-200 hover:text-jungle-50 transition-colors uppercase tracking-wider px-2 py-1 rounded hover:bg-jungle-800"
            >
              {selectedIds.size === options.length ? t('common.deselectAll') : t('common.selectAll')}
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            {options.length === 0 && (
              <p className="text-jungle-200 text-sm text-center py-4">{t('panel.emptyRandom')}</p>
            )}
            {options.map((opt) => {
              const checked = selectedIds.has(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`flex items-center gap-3 text-left px-3 py-3 rounded border transition-colors ${
                    checked
                      ? 'border-jungle-500 bg-jungle-800 text-jungle-100'
                      : 'border-jungle-700 bg-jungle-900/40 text-jungle-200'
                  }`}
                >
                  <span className={`w-5 h-5 flex-shrink-0 rounded-sm border text-sm flex items-center justify-center ${
                    checked ? 'border-jungle-400 bg-jungle-600 text-jungle-100' : 'border-jungle-600'
                  }`}>
                    {checked && '✓'}
                  </span>
                  <span className="text-jungle-200 text-xs mr-1">{opt.position + 1}.</span>
                  <span className="text-sm">{opt.text}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Manual send sheet ── */}
      {previewOption && (
        <SendSheet
          option={previewOption}
          onConfirm={handleConfirmSend}
          onClose={() => setPreviewOption(null)}
        />
      )}
    </div>
  )
}

function SendSheet({
  option,
  onConfirm,
  onClose,
}: {
  option: Option
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const { t } = useI18n()
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop — tap outside to dismiss */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md max-h-[88vh] bg-jungle-900 border-t border-jungle-700 rounded-t-3xl p-6 pb-8 flex flex-col gap-6 animate-slide-up shadow-2xl">
        {/* Grab handle */}
        <div className="mx-auto w-10 h-1 rounded-full bg-jungle-600 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-xs font-cinzel text-jungle-200 uppercase tracking-widest">
            {t('panel.sheetTitle')}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full text-jungle-200 hover:text-jungle-50 hover:bg-jungle-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Preview — scrolls if the message is long */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-jungle-700 bg-jungle-950/60 px-6 py-8 flex items-center justify-center">
          <p className="font-cinzel text-gold-300 text-2xl font-semibold break-words text-center w-full">
            {option.text}
          </p>
        </div>

        {/* Slide to send */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <SlideToSend onConfirm={onConfirm} />
          <span className="text-xs font-cinzel text-jungle-200 uppercase tracking-widest">
            {t('panel.dragEnd')}
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Best-effort haptics — supported on Android Chrome; a no-op on iOS Safari.
function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

function SlideToSend({
  onConfirm,
  disabled = false,
  label,
  resetOnConfirm = false,
}: {
  onConfirm: () => Promise<void> | void
  disabled?: boolean
  label?: string
  resetOnConfirm?: boolean
}) {
  const { t } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const maxRef = useRef(0)
  const xRef = useRef(0)
  const armedRef = useRef(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [x, setX] = useState(0)
  const [confirmed, setConfirmed] = useState(false)

  const KNOB = 56 // px

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  function maxOffset() {
    const track = trackRef.current
    return track ? Math.max(0, track.clientWidth - KNOB - 8) : 0
  }

  function reset() {
    xRef.current = 0
    setX(0)
    setConfirmed(false)
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (confirmed || disabled) return
    draggingRef.current = true
    armedRef.current = false
    maxRef.current = maxOffset()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!draggingRef.current) return
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const next = Math.max(0, Math.min(e.clientX - rect.left - KNOB / 2, maxRef.current))
    xRef.current = next
    // Light tick the first time the knob crosses the "release to confirm" line.
    const armed = maxRef.current > 0 && next >= maxRef.current - 6
    if (armed !== armedRef.current) {
      armedRef.current = armed
      if (armed) vibrate(10)
    }
    setX(next)
  }

  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    const max = maxRef.current
    if (max > 0 && xRef.current >= max - 6) {
      xRef.current = max
      setX(max)
      setConfirmed(true)
      vibrate([15, 40, 25]) // confirm buzz
      onConfirm()
      if (resetOnConfirm) {
        resetTimer.current = setTimeout(reset, 450)
      }
    } else {
      xRef.current = 0
      setX(0)
    }
    armedRef.current = false
  }

  const progress = maxRef.current > 0 ? x / maxRef.current : 0

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-16 rounded-full border border-jungle-600 bg-jungle-950/60 overflow-hidden select-none transition-opacity ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      {/* Green fill trailing the knob */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gold-500/80"
        style={{ width: x + KNOB + 4, transition: draggingRef.current ? 'none' : 'width 200ms ease' }}
      />

      {/* Prompt text — fades as you slide */}
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-cinzel text-jungle-200 uppercase tracking-widest pointer-events-none"
        style={{ opacity: confirmed ? 0 : 1 - progress }}
      >
        {label ?? t('panel.slideSend')}
      </span>

      {/* Knob */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`absolute top-1 left-1 w-14 h-14 rounded-full bg-gold-400 text-jungle-950 flex items-center justify-center text-2xl touch-none shadow-lg ${
          disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{ transform: `translateX(${x}px)`, transition: draggingRef.current ? 'none' : 'transform 200ms ease' }}
      >
        {confirmed ? '✓' : '→'}
      </div>
    </div>
  )
}

function RandomReveal({ option, phase }: { option: Option; phase: RevealPhase }) {
  const { t } = useI18n()
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
          className="text-xs font-cinzel text-jungle-200 mt-2 uppercase tracking-widest transition-opacity duration-500"
          style={{ opacity: phase === 'suspense' ? 1 : 0 }}
        >
          {t('panel.revealSuspense')}
        </p>
      </div>

      {phase === 'revealed' && (
        <p className="text-xs text-jungle-200 text-center font-cinzel animate-fade-in">
          {t('panel.revealDone')}
        </p>
      )}
    </div>
  )
}
