import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { useTransport } from '../hooks/useTransport'
import { QRCodeDisplay } from '../components/QRCodeDisplay'
import { SessionCodeBadge } from '../components/SessionCodeBadge'
import { TypewriterText } from '../components/TypewriterText'
import { Spinner } from '../components/ui/Spinner'
import { TutorialOverlay, TutorialStep } from '../components/TutorialOverlay'
import { useTutorial } from '../hooks/useTutorial'
import { useSessionPresence } from '../hooks/useSessionPresence'
import { SignalIcon } from '../components/SignalIcon'
import { ConnectionBanner } from '../components/ConnectionBanner'
import { consumeColdStart, saveLastSession } from '../lib/lastSession'

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
    description: 'This is your jungle screen. Text sent from client devices appears here with a dramatic typewriter effect using the Grobold font.',
  },
  {
    icon: '📋',
    title: 'Share the Code',
    description: 'The session code lets others join as clients. Click it to copy, then share it or show the QR code for instant scanning.',
  },
  {
    icon: '⚙️',
    title: 'Settings',
    description: 'Use "⚙ speed" to adjust the animation speed (5 presets from Mystic to Frenzy) and resize the circle (50–150%). Both settings are saved automatically.',
  },
  {
    icon: '👆',
    title: 'Hide & Reveal',
    description: 'Tap or click outside this panel to hide it. Then tap inside the circle to reveal the "QR & Settings" button and bring it back.',
  },
  {
    icon: '⛶',
    title: 'Fullscreen & Zoom',
    description: 'Double-tap the circle to enter fullscreen. Pinch on the circle (or trackpad pinch anywhere) to resize it. Tap once in fullscreen to show the exit button.',
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
  const navigate = useNavigate()
  const { sessionCode, session, loadingSession } = useTransport()
  // Whether this session code was already visited before (persisted in jumanji_sessions).
  const [isReturnVisit] = useState(() => {
    try {
      const stored: { code: string }[] = JSON.parse(localStorage.getItem('jumanji_sessions') ?? '[]')
      return stored.some(s => s.code === (sessionCode ?? '').toUpperCase())
    } catch {
      return false
    }
  })
  // Auto-open the header (QR & settings) only on the first visit to a session.
  // On return visits it stays hidden — reveal it by tapping the circle.
  const [headerVisible, setHeaderVisible] = useState(!isReturnVisit)
  const tutorial = useTutorial('main', MAIN_STEPS.length)

  const { latestMessage } = useDisplayMessages()

  const [displayText, setDisplayText] = useState<string | null>(null)
  const [circleSize, setCircleSize] = useState(0)
  const [fontSize, setFontSize] = useState(48)
  const circleSizeRef = useRef(0)
  const circleRef = useRef<HTMLDivElement>(null)
  const lastTapTimeRef = useRef(0)
  const pinchStartDistRef = useRef(0)
  const pinchStartPercentRef = useRef(100)
  const circleSizePercentRef = useRef(100)
  const [showButtonVisible, setShowButtonVisible] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hintVisible, setHintVisible] = useState(false)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [exitFsButtonVisible, setExitFsButtonVisible] = useState(false)
  const exitFsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(() => Number(localStorage.getItem('jumanji_speed') ?? 1))
  const [circleSizePercent, setCircleSizePercent] = useState(() => Number(localStorage.getItem('jumanji_circle_size') ?? 100))
  const circleScaleRef = useRef(circleSizePercent / 100)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const connectionQuality = useSessionPresence()
  const currentPreset = SPEED_PRESETS[speedIndex]
  const clientUrl = `${window.location.origin}/client/${sessionCode ?? ''}`
  circleScaleRef.current = circleSizePercent / 100
  circleSizePercentRef.current = circleSizePercent
  const effectiveCircleSize = circleSize * (circleSizePercent / 100)

  // Remember this device's last session so the installed PWA reopens it.
  // consumeColdStart() marks the launch as handled (covers iOS, which opens the
  // session URL directly without passing through the Landing redirect).
  useEffect(() => {
    consumeColdStart()
  }, [])
  useEffect(() => {
    if (sessionCode) saveLastSession('main', sessionCode)
  }, [sessionCode])

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
        setFontSize(calcFontSize(text, circleSizeRef.current * circleScaleRef.current * 0.707))
      }
      setDisplayText(text)
    }, 400)
    return () => clearTimeout(timer)
  }, [latestMessage?.id])

  // Recalculate font when circle resizes (window resize / scale change)
  useEffect(() => {
    if (!displayText || effectiveCircleSize === 0) return
    setFontSize(calcFontSize(displayText, effectiveCircleSize * 0.707))
  }, [effectiveCircleSize])

  useEffect(() => {
    if (headerVisible) {
      setShowButtonVisible(false)
      setHintVisible(false)
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [headerVisible])

  // On a return visit, enter fullscreen automatically.
  //  - Installed PWA with manifest display:'fullscreen' already launches chromeless,
  //    so there's nothing to do (the Fullscreen API isn't involved).
  //  - In a browser tab, requestFullscreen() needs a user gesture: we attempt it on load
  //    (works if a transient activation carried over from the click that navigated here),
  //    then fall back to entering fullscreen on the very first user gesture.
  useEffect(() => {
    if (!isReturnVisit) return
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return

    const goFullscreen = () => {
      if (document.fullscreenElement) return
      document.documentElement.requestFullscreen?.().catch(() => {})
    }

    const cleanup = () => {
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('keydown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
      document.removeEventListener('fullscreenchange', onFsChange)
    }
    const onFirstGesture = () => { goFullscreen(); cleanup() }
    const onFsChange = () => { if (document.fullscreenElement) cleanup() }

    goFullscreen() // try immediately in case activation is still available
    window.addEventListener('pointerdown', onFirstGesture)
    window.addEventListener('keydown', onFirstGesture)
    window.addEventListener('touchstart', onFirstGesture)
    document.addEventListener('fullscreenchange', onFsChange)

    return cleanup
  }, [isReturnVisit])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      if (exitFsTimerRef.current) clearTimeout(exitFsTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isFullscreen) {
      setExitFsButtonVisible(false)
      if (exitFsTimerRef.current) clearTimeout(exitFsTimerRef.current)
    }
  }, [isFullscreen])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const hideHeader = () => {
    setHeaderVisible(false)
    setHintVisible(true)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => setHintVisible(false), 3000)
  }

  const handleCircleClick = () => {
    const now = Date.now()
    const timeSince = now - lastTapTimeRef.current
    if (timeSince < 300 && timeSince > 0 && !document.fullscreenElement) {
      lastTapTimeRef.current = 0
      toggleFullscreen()
      return
    }
    lastTapTimeRef.current = now
    if (document.fullscreenElement) {
      if (exitFsTimerRef.current) clearTimeout(exitFsTimerRef.current)
      setExitFsButtonVisible(true)
      exitFsTimerRef.current = setTimeout(() => setExitFsButtonVisible(false), 3000)
    }
    if (headerVisible) return
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
    setShowButtonVisible(true)
    showTimerRef.current = setTimeout(() => setShowButtonVisible(false), 3000)
  }

  // Touch pinch handlers (React synthetic — registered as soon as circle mounts)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    const dx = e.touches[1].clientX - e.touches[0].clientX
    const dy = e.touches[1].clientY - e.touches[0].clientY
    pinchStartDistRef.current = Math.hypot(dx, dy)
    pinchStartPercentRef.current = circleSizePercentRef.current
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    const dx = e.touches[1].clientX - e.touches[0].clientX
    const dy = e.touches[1].clientY - e.touches[0].clientY
    const dist = Math.hypot(dx, dy)
    if (pinchStartDistRef.current === 0) {
      pinchStartDistRef.current = dist
      pinchStartPercentRef.current = circleSizePercentRef.current
      return
    }
    const newPct = Math.round(Math.min(150, Math.max(50, pinchStartPercentRef.current * (dist / pinchStartDistRef.current))))
    setCircleSizePercent(newPct)
  }
  const handleTouchEnd = () => {
    if (pinchStartDistRef.current > 0) {
      localStorage.setItem('jumanji_circle_size', String(circleSizePercentRef.current))
      pinchStartDistRef.current = 0
    }
  }

  // Mac trackpad: wheel+ctrlKey (Chrome) and gesture events (Safari) — on window to avoid ref timing issues
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const newPct = Math.round(Math.min(150, Math.max(50, circleSizePercentRef.current * Math.pow(0.99, e.deltaY))))
      setCircleSizePercent(newPct)
      localStorage.setItem('jumanji_circle_size', String(newPct))
    }
    const onGestureStart = (e: Event) => {
      e.preventDefault()
      pinchStartPercentRef.current = circleSizePercentRef.current
    }
    const onGestureChange = (e: Event) => {
      e.preventDefault()
      const newPct = Math.round(Math.min(150, Math.max(50, pinchStartPercentRef.current * (e as any).scale)))
      setCircleSizePercent(newPct)
    }
    const onGestureEnd = () => {
      localStorage.setItem('jumanji_circle_size', String(circleSizePercentRef.current))
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('gesturestart', onGestureStart)
    window.addEventListener('gesturechange', onGestureChange)
    window.addEventListener('gestureend', onGestureEnd)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('gesturestart', onGestureStart)
      window.removeEventListener('gesturechange', onGestureChange)
      window.removeEventListener('gestureend', onGestureEnd)
    }
  }, [])


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
      <ConnectionBanner />
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-jungle-800/10 blur-3xl" />
      </div>

      {/* Show button — appears at top of text square on circle tap when header is hidden */}
      {!headerVisible && showButtonVisible && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (showTimerRef.current) clearTimeout(showTimerRef.current)
            setHeaderVisible(true)
          }}
          className="absolute z-20 flex items-center gap-1.5 text-jungle-200 hover:text-jungle-50 text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-950/70 backdrop-blur-sm px-2.5 py-1.5 rounded border border-jungle-800 hover:border-jungle-600 animate-fade-in"
          style={{
            top: effectiveCircleSize ? `calc(50% - ${(effectiveCircleSize * 0.707) / 2}px - 20px)` : 16,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="18" y="14" width="3" height="3" />
            <rect x="14" y="18" width="3" height="3" />
            <rect x="18" y="18" width="3" height="3" />
          </svg>
          QR &amp; Settings
        </button>
      )}

      {/* Header panel */}
      {headerVisible && (
        <header
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col rounded-xl border border-jungle-700/80 bg-jungle-950/95 backdrop-blur-sm shadow-2xl w-[92vw] max-w-md animate-fade-in overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top bar: Home | signal | Close */}
          <div className="relative flex items-center px-4 py-2.5 border-b border-jungle-800/60">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-jungle-200 hover:text-jungle-50 text-[11px] font-cinzel uppercase tracking-widest transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Home
            </button>

            {/* Signal icon — centered */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <SignalIcon quality={connectionQuality} />
            </div>

            <button
              onClick={hideHeader}
              className="flex items-center gap-1.5 text-jungle-200 hover:text-jungle-50 text-[11px] font-cinzel uppercase tracking-widest transition-colors ml-auto"
            >
              Close
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Main content: stacks on mobile, side-by-side on sm+ */}
          <div className="flex flex-col sm:flex-row items-stretch">
            {/* QR column */}
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-4 border-b border-jungle-800/60 sm:border-b-0 sm:border-r">
              <QRCodeDisplay sessionCode={sessionCode ?? ''} />
              <span className="text-[11px] font-cinzel uppercase tracking-widest text-jungle-200">Scan to join</span>
            </div>

            {/* Session code + client link icons */}
            <div className="flex flex-col justify-center gap-3 px-5 py-4 flex-1 min-w-0">
              <SessionCodeBadge code={sessionCode ?? ''} />
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <span className="text-[11px] font-cinzel uppercase tracking-widest text-jungle-200 mr-1">Client Link</span>
                <button
                  title="Copy join link"
                  aria-label="Copy join link"
                  onClick={() => {
                    navigator.clipboard.writeText(clientUrl)
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${linkCopied ? 'text-gold-400 border-gold-700/60 bg-gold-950/20' : 'text-jungle-200 hover:text-jungle-50 border-jungle-700/60 hover:border-jungle-400 bg-jungle-900/40'}`}
                >
                  {linkCopied ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                </button>
                {typeof navigator.share === 'function' && (
                  <button
                    title="Share join link"
                    aria-label="Share join link"
                    onClick={() => navigator.share({ url: clientUrl })}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border text-jungle-200 hover:text-jungle-50 border-jungle-700/60 hover:border-jungle-400 bg-jungle-900/40 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  </button>
                )}
                <a
                  href={clientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open client in new tab"
                  aria-label="Open client in new tab"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border text-jungle-200 hover:text-jungle-50 border-jungle-700/60 hover:border-jungle-400 bg-jungle-900/40 transition-all"
                  onClick={e => e.stopPropagation()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>

            </div>
          </div>

          {/* Footer: utility controls */}
          <div className="flex items-center border-t border-jungle-800/60 bg-jungle-950/40">
            <button
              onClick={tutorial.restart}
              className="flex items-center gap-1.5 text-jungle-200 hover:text-jungle-50 text-[11px] font-cinzel uppercase tracking-widest transition-colors px-4 py-2.5 hover:bg-jungle-900/40 flex-1 justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Help
            </button>
            <div className="w-px h-4 bg-jungle-800/60 shrink-0" />
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 text-jungle-200 hover:text-jungle-50 text-[11px] font-cinzel uppercase tracking-widest transition-colors px-4 py-2.5 hover:bg-jungle-900/40 flex-1 justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isFullscreen ? (
                  <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/></>
                ) : (
                  <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>
                )}
              </svg>
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
            <div className="w-px h-4 bg-jungle-800/60 shrink-0" />
            <button
              onClick={() => setSettingsOpen(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-cinzel uppercase tracking-widest transition-colors px-4 py-2.5 hover:bg-jungle-900/40 flex-1 justify-center ${settingsOpen ? 'text-gold-400' : 'text-jungle-200 hover:text-jungle-50'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </button>
          </div>

          {/* Settings panel */}
          {settingsOpen && (
            <div className="w-full flex flex-col items-center gap-2 px-5 py-4 border-t border-jungle-800/60 bg-jungle-950/40">
              <p className="text-jungle-200 text-xs font-cinzel uppercase tracking-widest">
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
                    className={`text-[10px] font-cinzel uppercase transition-colors ${i === speedIndex ? 'text-gold-400' : 'text-jungle-200'}`}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
              <p className="text-jungle-200 text-xs font-cinzel uppercase tracking-widest mt-2">
                Circle Size — <span className="text-gold-400">{circleSizePercent}%</span>
              </p>
              <input
                type="range"
                min={50}
                max={150}
                step={1}
                value={circleSizePercent}
                onChange={e => {
                  const val = Number(e.target.value)
                  setCircleSizePercent(val)
                  localStorage.setItem('jumanji_circle_size', String(val))
                }}
                className="w-full accent-gold-400 cursor-pointer"
              />
              <div className="flex justify-between w-full px-0.5">
                <span className="text-[10px] font-cinzel uppercase text-jungle-200">50%</span>
                <span className={`text-[10px] font-cinzel uppercase ${circleSizePercent === 100 ? 'text-gold-400' : 'text-jungle-200'}`}>100%</span>
                <span className="text-[10px] font-cinzel uppercase text-jungle-200">150%</span>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Circle — absolutely centered on the full viewport */}
      <div
        ref={circleRef}
        className="absolute z-0 flex items-center justify-center rounded-full transition-shadow duration-700 overflow-hidden"
        onClick={handleCircleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: !headerVisible ? 'pointer' : 'default',
          touchAction: 'none',
          width: effectiveCircleSize || undefined,
          height: effectiveCircleSize || undefined,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: effectiveCircleSize ? '1px solid rgba(161,120,40,0.18)' : undefined,
          boxShadow: displayText && effectiveCircleSize
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

        {/* Connection quality tint */}
        {(connectionQuality === 'poor' || connectionQuality === 'disconnected') && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none transition-all duration-1000"
            style={{
              background: connectionQuality === 'poor'
                ? 'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.20) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.60) 0%, transparent 70%)',
            }}
          />
        )}

        <div
          className="flex items-center justify-center"
          style={{
            width: effectiveCircleSize ? effectiveCircleSize * 0.707 : undefined,
            height: effectiveCircleSize ? effectiveCircleSize * 0.707 : undefined,
          }}
        >
          {displayText && (
            <p
              className="font-grobold text-gold-300 uppercase tracking-widest text-center leading-relaxed w-full select-none"
              style={{ fontSize }}
            >
              <TypewriterText text={displayText} charDelay={currentPreset.charDelay} animDuration={currentPreset.animDuration} />
            </p>
          )}
        </div>
      </div>

      {/* Spacer to keep flex layout intact */}
      <main className="relative flex-1 pointer-events-none" />

      {/* Exit fullscreen button — bottom-right of text square, shown 3s on tap */}
      {isFullscreen && exitFsButtonVisible && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (exitFsTimerRef.current) clearTimeout(exitFsTimerRef.current)
            setExitFsButtonVisible(false)
            document.exitFullscreen()
          }}
          className="absolute z-20 text-jungle-200 hover:text-jungle-50 text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-950/70 backdrop-blur-sm px-2.5 py-1.5 rounded border border-jungle-800 hover:border-jungle-600 animate-fade-in"
          style={{
            top: effectiveCircleSize ? `calc(50% + ${(effectiveCircleSize * 0.707) / 2}px - 16px)` : 'auto',
            left: effectiveCircleSize ? `calc(50% + ${(effectiveCircleSize * 0.707) / 2}px - 16px)` : 'auto',
            transform: 'translate(-100%, -100%)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="10" y1="14" x2="3" y2="21" />
            <line x1="21" y1="3" x2="14" y2="10" />
          </svg>
        </button>
      )}

      {/* Hint — shown briefly after header is dismissed */}
      {hintVisible && (
        <p
          className="absolute z-10 text-jungle-200 text-xs font-cinzel uppercase tracking-widest animate-fade-in pointer-events-none text-center whitespace-nowrap"
          style={{
            top: effectiveCircleSize ? `calc(50% - ${(effectiveCircleSize * 0.707) / 2}px - 20px)` : 16,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
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
