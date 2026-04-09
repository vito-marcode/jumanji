import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { QRCodeDisplay } from '../components/QRCodeDisplay'
import { SessionCodeBadge } from '../components/SessionCodeBadge'
import { TypewriterText } from '../components/TypewriterText'
import { Spinner } from '../components/ui/Spinner'
import type { Session } from '../types'

// Fit text inside the inscribed square of the circle.
// boxWidth = max text width, boxHeight = max text height (both = circleSize * 0.7)
function calcFontSize(text: string, boxWidth: number, boxHeight: number = boxWidth): number {
  if (boxWidth <= 0 || boxHeight <= 0) return 48
  const testEl = document.createElement('div')
  testEl.style.cssText = [
    'position:absolute', 'visibility:hidden', 'pointer-events:none',
    `width:${boxWidth}px`, 'font-family:"Cinzel",serif',
    'text-transform:uppercase', 'letter-spacing:0.1em',
    'line-height:1.625', 'word-break:break-word',
    'white-space:normal', 'text-align:center',
  ].join(';')
  testEl.textContent = text
  document.body.appendChild(testEl)
  let lo = 8, hi = 600, best = 16
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    testEl.style.fontSize = `${mid}px`
    if (testEl.scrollHeight <= boxHeight) { best = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  document.body.removeChild(testEl)
  return best
}

export default function MainDisplay() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [headerVisible, setHeaderVisible] = useState(true)

  const { latestMessage } = useDisplayMessages(session?.id ?? null)

  const [displayText, setDisplayText] = useState<string | null>(null)
  const [circleSize, setCircleSize] = useState(0)
  const [fontSize, setFontSize] = useState(48)
  const circleSizeRef = useRef(0)

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
    if (text && circleSizeRef.current > 0) {
      setFontSize(calcFontSize(text, circleSizeRef.current * 0.7))
    }
    setDisplayText(text)
  }, [latestMessage?.id])

  // Recalculate font when circle resizes (window resize / header toggle)
  useEffect(() => {
    if (!displayText || circleSize === 0) return
    setFontSize(calcFontSize(displayText, circleSize * 0.7))
  }, [circleSize])


  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-jungle-950">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-jungle-950 flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-jungle-800/10 blur-3xl" />
      </div>

      {/* Show button — only when header is hidden */}
      {!headerVisible && (
        <button
          onClick={() => setHeaderVisible(true)}
          className="absolute top-3 right-3 z-20 text-jungle-600 hover:text-jungle-300 text-xs font-cinzel uppercase tracking-widest transition-colors bg-jungle-950/70 backdrop-blur-sm px-2.5 py-1.5 rounded border border-jungle-800 hover:border-jungle-600"
        >
          ▼ show
        </button>
      )}

      {/* Top bar — QR + code */}
      {headerVisible && (
        <header className="relative z-10 flex items-start justify-between gap-6 p-6 border-b border-jungle-800 animate-fade-in">
          <div className="flex flex-col gap-1">
            <h1 className="font-cinzel_deco text-gold-300 text-xl font-bold text-glow-gold">JUMANJI</h1>
            <p className="text-jungle-500 text-xs font-cinzel uppercase tracking-widest">Main Display</p>
            <button
              onClick={() => navigate('/')}
              className="text-jungle-600 hover:text-jungle-400 text-xs font-cinzel uppercase tracking-widest mt-2 text-left transition-colors"
            >
              ← Home
            </button>
          </div>
          <div className="flex items-center gap-6 flex-wrap justify-end">
            <SessionCodeBadge code={sessionCode ?? ''} />
            <QRCodeDisplay sessionCode={sessionCode ?? ''} />
            <button
              onClick={() => setHeaderVisible(false)}
              className="text-jungle-600 hover:text-jungle-300 text-xs font-cinzel uppercase tracking-widest transition-colors self-start mt-1"
            >
              ▲ hide
            </button>
          </div>
        </header>
      )}

      {/* Circle — absolutely centered on the full viewport */}
      <div
        className="absolute z-0 flex items-center justify-center rounded-full transition-shadow duration-700"
        style={{
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
        <div
          className="flex items-center justify-center"
          style={{
            width: circleSize ? circleSize * 0.707 : undefined,
            height: circleSize ? circleSize * 0.707 : undefined,
          }}
        >
          {displayText && (
            <p
              className="font-cinzel text-gold-300 uppercase tracking-widest text-center leading-relaxed w-full"
              style={{ fontSize }}
            >
              <TypewriterText text={displayText} charDelay={40} />
            </p>
          )}
        </div>
      </div>

      {/* Spacer to keep flex layout intact */}
      <main className="relative flex-1" />
    </div>
  )
}
