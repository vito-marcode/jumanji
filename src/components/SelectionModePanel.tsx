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
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 p-[5px] rounded-2xl bg-canopy-900/50 border border-moss/15">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchMode(tab.id)}
            className={`py-3.5 rounded-xl text-center font-cinzel font-semibold text-[15px] tracking-[0.06em] transition-colors ${
              mode === tab.id
                ? 'bg-gradient-to-b from-[#2e5738] to-[#204029] text-parchment shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_16px_-8px_rgba(0,0,0,0.6)]'
                : 'text-sage-500 hover:text-sage-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-sage-400 text-sm leading-relaxed">
        {mode === 'manual' ? t('panel.helperManual') : t('panel.helperRandom')}
      </p>

      {/* ── Manual ── */}
      {mode === 'manual' && (
        <div className="flex flex-col gap-3">
          {options.length === 0 && (
            <p className="text-sage-400 text-sm text-center py-4">{t('panel.emptyManual')}</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPreviewOption(opt)}
              className="flex items-center gap-3.5 text-left pl-[18px] pr-4 py-4 rounded-[15px] bg-gradient-to-b from-frond-from/50 to-frond-to/50 border border-moss/20 hover:border-brass-400/40 transition-all active:scale-[0.99]"
            >
              <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-brass-400/[0.16] text-brass-400 font-cinzel font-semibold text-sm flex items-center justify-center">{opt.position + 1}</span>
              <span className="flex-1 text-sage-100 text-[15px] leading-snug">{opt.text}</span>
              <span className="text-sage-500 text-lg shrink-0" aria-hidden>›</span>
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
            <span className="text-[13px] font-semibold text-sage-200 uppercase tracking-[0.14em]">
              {t('panel.selected', { n: selectedIds.size, m: options.length })}
            </span>
            <button
              onClick={toggleAll}
              className="text-[13px] text-brass-400 hover:text-brass-300 transition-colors tracking-[0.06em] px-2 py-1 rounded"
            >
              {selectedIds.size === options.length ? t('common.deselectAll') : t('common.selectAll')}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {options.length === 0 && (
              <p className="text-sage-400 text-sm text-center py-4">{t('panel.emptyRandom')}</p>
            )}
            {options.map((opt) => {
              const checked = selectedIds.has(opt.id)
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`flex items-center gap-3.5 text-left px-[18px] py-4 rounded-[15px] border transition-colors ${
                    checked
                      ? 'border-brass-400/28 bg-gradient-to-b from-[#2e5738]/50 to-[#204029]/50'
                      : 'border-moss/15 bg-canopy-900/40'
                  }`}
                >
                  <span className={`w-[26px] h-[26px] flex-shrink-0 rounded-lg text-[15px] font-bold flex items-center justify-center ${
                    checked ? 'bg-gradient-to-b from-brass-300 to-brass-500 text-canopy-800' : 'border border-sage-500/50'
                  }`}>
                    {checked && '✓'}
                  </span>
                  <span className="shrink-0 font-cinzel font-semibold text-brass-400 text-sm">{opt.position + 1}</span>
                  <span className={`flex-1 text-[15px] leading-snug ${checked ? 'text-sage-50' : 'text-sage-400'}`}>{opt.text}</span>
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
        className="absolute inset-0 bg-[#060e09]/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md max-h-[88vh] bg-gradient-to-b from-[#1b3624] to-[#12271a] border-t border-brass-400/28 rounded-t-[30px] px-6 pt-3 pb-28 flex flex-col gap-6 animate-slide-up shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.7)]">
        {/* Grab handle */}
        <div className="mx-auto w-[46px] h-[5px] rounded-full bg-sage-300/40 shrink-0 -mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-[15px] font-cinzel font-semibold text-sage-200 uppercase tracking-[0.14em]">
            {t('panel.sheetTitle')}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-sage-300/30 bg-sage-300/[0.14] text-sage-200 hover:bg-sage-300/20 hover:text-sage-50 active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Preview — scrolls if the message is long */}
        <div className="max-h-[32vh] overflow-y-auto rounded-[20px] border border-brass-400/25 bg-gradient-to-b from-frond-from/70 to-frond-to/70 px-6 py-8 flex items-center justify-center">
          <p className="font-cinzel text-parchment text-[23px] font-semibold leading-relaxed break-words text-center w-full">
            {option.text}
          </p>
        </div>

        {/* Slide to send */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <SlideToSend onConfirm={onConfirm} />
          <span className="text-xs font-cinzel text-sage-500 uppercase tracking-[0.12em]">
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

  const KNOB = 58 // px

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
    vibrate(10) // tick on grab
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
      className={`relative w-full h-[70px] rounded-full border border-brass-400/35 bg-canopy-900/60 overflow-hidden select-none transition-opacity ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      {/* Gold fill trailing the knob */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-brass-400/25"
        style={{ width: x + KNOB + 4, transition: draggingRef.current ? 'none' : 'width 200ms ease' }}
      />

      {/* Prompt text — starts past the knob so the knob never covers it */}
      <span
        className="absolute inset-y-0 left-[72px] right-5 flex items-center justify-center text-center leading-tight text-[15px] font-cinzel font-semibold text-sage-300 tracking-[0.08em] pointer-events-none"
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
        className={`absolute top-1.5 left-1.5 w-[58px] h-[58px] rounded-full bg-gradient-to-b from-brass-300 to-brass-500 text-canopy-800 flex items-center justify-center text-2xl font-bold touch-none shadow-[0_8px_22px_-6px_rgba(230,182,79,0.7),inset_0_1px_0_rgba(255,255,255,0.5)] ${
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
      <div className={`relative rounded-[15px] border overflow-hidden p-5 text-center transition-colors duration-700 ${
        phase === 'revealed'
          ? 'border-brass-400/40 bg-canopy-900/60'
          : 'border-moss/20 bg-canopy-900/40'
      }`}>
        {/* Blurred text — clears on reveal */}
        <p
          className="font-cinzel uppercase tracking-[0.16em] text-brass-400 text-base transition-all duration-[2000ms] ease-out"
          style={{
            filter: phase === 'suspense' ? 'blur(10px)' : 'blur(0px)',
            opacity: phase === 'suspense' ? 0.25 : 1,
          }}
        >
          {option.text}
        </p>

        {/* Suspense label — fades out when revealing */}
        <p
          className="text-xs font-cinzel text-sage-400 mt-2 uppercase tracking-[0.16em] transition-opacity duration-500"
          style={{ opacity: phase === 'suspense' ? 1 : 0 }}
        >
          {t('panel.revealSuspense')}
        </p>
      </div>

      {phase === 'revealed' && (
        <p className="text-xs text-sage-400 text-center font-cinzel animate-fade-in">
          {t('panel.revealDone')}
        </p>
      )}
    </div>
  )
}
