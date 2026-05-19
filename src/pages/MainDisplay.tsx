import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { QRCodeDisplay } from '../components/QRCodeDisplay'
import { SessionCodeBadge } from '../components/SessionCodeBadge'
import { TypewriterText } from '../components/TypewriterText'
import { Spinner } from '../components/ui/Spinner'
import { TutorialOverlay, TutorialStep } from '../components/TutorialOverlay'
import { useTutorial } from '../hooks/useTutorial'
import type { Session } from '../types'

const SPEED_PRESETS = [
  { label: 'Mystic',  charDelay: 220, animDuration: 10000 },
  { label: 'Ancient', charDelay: 120, animDuration: 6000  },
  { label: 'Swift',   charDelay: 70,  animDuration: 3500  },
  { label: 'Wild',    charDelay: 40,  animDuration: 2000  },
  { label: 'Frenzy',  charDelay: 20,  animDuration: 1000  },
]

const MAIN_STEPS: TutorialStep[] = [
  {
    icon: '🖥️',
    title: 'The Main Display',
    description: 'This is your jungle screen. Text sent from client devices appears here with a dramatic typewriter effect.',
  },
  {
    icon: '📋',
    title: 'Share the Code',
    description: 'The session code (top-left) lets others join as clients. Click it to copy, then share!',
  },
  {
    icon: '📱',
    title: 'QR Code',
    description: 'The QR code (top-right) lets anyone scan and join instantly on their phone. No typing needed.',
  },
  {
    icon: '👆',
    title: 'Hide & Reveal',
    description: 'Use "▲ hide" to dismiss this panel and go full-screen. Tap or click anywhere inside the circle to reveal the "▼ show" button and bring it back.',
  },
]

// Fit text inside the inscribed square of the circle.
// boxWidth = max text width, boxHeight = max text height (both = circleSize * 0.7)
function calcFontSize(text: string, boxWidth: number, boxHeight: number = boxWidth): number {
  if (boxWidth <= 0 || boxHeight <= 0) return 48

  // Wrapping element to measure height
  const wrapEl = document.createElement('div')
  wrapEl.style.cssText = [
    'position:absolute', 'visibility:hidden', 'pointer-events:none',
    `width:${boxWidth}px`, 'font-family:"Grobold",sans-serif',
    'text-transform:uppercase', 'letter-spacing:0.1em',
    'line-height:1.625', 'word-break:break-word',
    'white-space:normal', 'text-align:center',
  ].join(';')
  wrapEl.textContent = text
  document.body.appendChild(wrapEl)

  // No-wrap element measuring the longest individual word — TypewriterText renders each word
  // with whitespace-nowrap so individual words can never break; the longest word must fit the width.
  const longestWord = text.split(' ').reduce((a, b) => a.length > b.length ? a : b)
  const measureEl = document.createElement('span')
  measureEl.style.cssText = [
    'position:absolute', 'visibility:hidden', 'pointer-events:none',
    'white-space:nowrap', 'font-family:"Grobold",sans-serif',
    'text-transform:uppercase', 'letter-spacing:0.1em',
  ].join(';')
  measureEl.textContent = longestWord
  document.body.appendChild(measureEl)

  let lo = 8, hi = 600, best = 16
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    wrapEl.style.fontSize = `${mid}px`
    measureEl.style.fontSize = `${mid}px`
    const fitsHeight = wrapEl.scrollHeight <= boxHeight
    const fitsWidth = measureEl.getBoundingClientRect().width <= boxWidth
    if (fitsHeight && fitsWidth) { best = mid; lo = mid + 1 }
    else hi = mid - 1
  }

  document.body.removeChild(wrapEl)
  document.body.removeChild(measureEl)
  return best
}

export default function MainDisplay() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [headerVisible, setHeaderVisible] = useState(true)
  const tutorial = useTutorial('main', MAIN_STEPS.length)

  const { latestMessage } = useDisplayMessages(session?.id ?? null)

  const [displayText, setDisplayText] = useState<string | null>(null)
  const [circleSize, setCircleSize] = useState(0)
  const [fontSize, setFontSize] = useState(48)
  const circleSizeRef = useRef(0)
  const [showButtonVisible, setShowButtonVisible] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [speedIndex, setSpeedIndex] = useState(() => Number(localStorage.getItem('jumanji_speed') ?? 1))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const currentPreset = SPEED_PRESETS[speedIndex]

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

  // Save session to localStorage when loaded
  useEffect(() => {
    if (!session) return
    try {
      const stored: { code: string; createdAt: string }[] = JSON.parse(
        localStorage.getItem('jumanji_sessions') ?? '[]'
      )
      if (!stored.find(s => s.code === session.code)) {
        stored.unshift({ code: session.code, createdAt: new Date().toISOString() })
        localStorage.setItem('jumanji_sessions', JSON.stringify(stored.slice(0, 10)))
      }
    } catch {}
  }, [session])

  // Track full viewport size to size the circle
  useEffect(() => {
    const update = () => {
      const size = Math.min(window.innerWidth, window.innerHeight)
      circleSizeRef.current = size
      setCircleSize(size)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!latestMessage) return
    const text = latestMessage.text === '' ? null : latestMessage.text
    if (!text) {
      setDisplayText(null)
      return
    }
    // Clear old text first, then show new message after a short pause
    setDisplayText(null)
    const timer = setTimeout(() => {
      if (circleSizeRef.current > 0) {
        setFontSize(calcFontSize(text, circleSizeRef.current * 0.707))
      }
      setDisplayText(text)
    }, 400)
    return () => clearTimeout(timer)
  }, [latestMessage?.id])

  // Recalculate font when circle resizes (window resize / header toggle)
  useEffect(() => {
    if (!displayText || circleSize === 0) return
    setFontSize(calcFontSize(displayText, circleSize * 0.707))
  }, [circleSize])

  useEffect(() => {
    if (headerVisible) {
      setShowButtonVisible(false)
      setHintVisible(false)
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [headerVisible])

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [])

  const hideHeader = () => {
    setHeaderVisible(false)
    setHintVisible(true)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 3000)
  }

  const handleCircleInteraction = () => {
    if (headerVisible) return
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
    setShowButtonVisible(true)
    showTimerRef.current = setTimeout(() => setShowButtonVisible(false), 3000)
  }


  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jungle-950">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-jungle-950 flex flex-col relative overflow-hidden"
      onClick={() => { if (headerVisible) hideHeader() }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-jungle-800/10 blur-3xl" />
      </div>

      {/* Show button — appears at top-center of circle on click/touch when header is hidden */}
      {!headerVisible && showButtonVisible && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (showTimerRef.current) clearTimeout(showTimerRef.current)
            setHeaderVisible(true)
          }}
          className="absolute z-20 text-jungle-600 hover:text-jungle-300 text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-950/70 backdrop-blur-sm px-2.5 py-1.5 rounded border border-jungle-800 hover:border-jungle-600 animate-fade-in"
          style={{
            top: circleSize ? `calc(50% - ${circleSize / 2}px + 16px)` : 16,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          ▼ show
        </button>
      )}

      {/* Top bar — QR + code */}
      {headerVisible && (
        <header className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4 p-6 rounded-xl border border-jungle-700 bg-jungle-950/90 backdrop-blur-sm shadow-2xl w-[90vw] max-w-xl animate-fade-in" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col gap-1 items-center text-center">
            <h1 className="font-cinzel_deco text-gold-300 text-xl font-bold text-glow-gold">JUMANJI</h1>
            <p className="text-jungle-500 text-xs font-cinzel uppercase tracking-widest">Main Display</p>
            <button
              onClick={() => navigate('/')}
              className="text-jungle-600 hover:text-jungle-400 text-xs font-cinzel uppercase tracking-widest mt-2 transition-colors"
            >
              ← Home
            </button>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <SessionCodeBadge code={sessionCode ?? ''} />
            <QRCodeDisplay sessionCode={sessionCode ?? ''} />
            <div className="flex items-center gap-2">
              <button
                onClick={tutorial.restart}
                className="text-jungle-400 hover:text-jungle-200 text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-900/80 backdrop-blur-sm px-2.5 py-1.5 rounded border border-jungle-700 hover:border-jungle-500"
              >
                ? Help
              </button>
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className={`text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-900/80 backdrop-blur-sm px-2.5 py-1.5 rounded border hover:border-jungle-500 ${settingsOpen ? 'text-gold-400 border-gold-600' : 'text-jungle-400 hover:text-jungle-200 border-jungle-700'}`}
              >
                ⚙ speed
              </button>
              <button
                onClick={hideHeader}
                className="text-jungle-400 hover:text-jungle-200 text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-900/80 backdrop-blur-sm px-2.5 py-1.5 rounded border border-jungle-700 hover:border-jungle-500"
              >
                ▲ hide
              </button>
            </div>
          </div>
          {settingsOpen && (
            <div className="w-full flex flex-col items-center gap-2 pt-3 border-t border-jungle-800">
              <p className="text-jungle-400 text-xs font-cinzel uppercase tracking-widest">
                Animation Speed — <span className="text-gold-400">{currentPreset.label}</span>
              </p>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={speedIndex}
                onChange={e => {
                  const idx = Number(e.target.value)
                  setSpeedIndex(idx)
                  localStorage.setItem('jumanji_speed', String(idx))
                }}
                className="w-full accent-gold-400 cursor-pointer"
              />
              <div className="flex justify-between w-full px-0.5">
                {SPEED_PRESETS.map((p, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-cinzel uppercase transition-colors ${i === speedIndex ? 'text-gold-400' : 'text-jungle-600'}`}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </header>
      )}

      {/* Circle — absolutely centered on the full viewport */}
      <div
        className="absolute z-0 flex items-center justify-center rounded-full transition-shadow duration-700 overflow-hidden"
        onClick={handleCircleInteraction}
        style={{
          cursor: !headerVisible ? 'pointer' : 'default',
          width: circleSize || undefined,
          height: circleSize || undefined,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: circleSize ? '1px solid rgba(161,120,40,0.18)' : undefined,
          boxShadow: displayText && circleSize
            ? '0 0 80px rgba(161,120,40,0.10), 0 0 200px rgba(161,120,40,0.05), inset 0 0 80px rgba(161,120,40,0.05)'
            : undefined,
        }}
      >
        {/* Glass dome effect — barely perceptible curved surface */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: [
              'radial-gradient(ellipse 60% 22% at 50% 7%, rgba(255,255,255,0.045) 0%, transparent 100%)',
              'radial-gradient(circle at 50% 50%, transparent 48%, rgba(0,0,0,0.22) 100%)',
              'radial-gradient(ellipse 65% 30% at 50% 92%, rgba(0,0,0,0.10) 0%, transparent 100%)',
            ].join(', '),
          }}
        />

        <div
          className="flex items-center justify-center"
          style={{
            width: circleSize ? circleSize * 0.707 : undefined,
            height: circleSize ? circleSize * 0.707 : undefined,
          }}
        >
          {displayText && (
            <p
              className="font-grobold text-gold-300 uppercase tracking-widest text-center leading-relaxed w-full"
              style={{ fontSize }}
            >
              <TypewriterText text={displayText} charDelay={currentPreset.charDelay} animDuration={currentPreset.animDuration} />
            </p>
          )}
        </div>
      </div>

      {/* Spacer to keep flex layout intact */}
      <main className="relative flex-1 pointer-events-none" />

      {/* Hint — shown briefly after header is dismissed */}
      {hintVisible && (
        <p
          className="absolute z-10 text-jungle-600 text-xs font-cinzel uppercase tracking-widest animate-fade-in pointer-events-none text-center whitespace-nowrap"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          Tap the circle to show again
        </p>
      )}

      {tutorial.isVisible && (
        <TutorialOverlay
          steps={MAIN_STEPS}
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
