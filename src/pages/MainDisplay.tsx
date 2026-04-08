import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { QRCodeDisplay } from '../components/QRCodeDisplay'
import { SessionCodeBadge } from '../components/SessionCodeBadge'
import { TypewriterText } from '../components/TypewriterText'
import { MessageFeed } from '../components/MessageFeed'
import { Spinner } from '../components/ui/Spinner'
import type { Session } from '../types'

export default function MainDisplay() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const { messages, latestMessage } = useDisplayMessages(session?.id ?? null)

  // Track which message is currently being typewritten
  const [activeId, setActiveId] = useState<string | null>(null)
  const [typewriterText, setTypewriterText] = useState<string | null>(null)
  const [historyMessages, setHistoryMessages] = useState(messages)

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

  // When a new message arrives, typewrite it
  useEffect(() => {
    if (!latestMessage) return
    setActiveId(latestMessage.id)
    setTypewriterText(latestMessage.text)
    // Show all previous messages (minus the active one) in feed
    setHistoryMessages(messages.filter((m) => m.id !== latestMessage.id))
  }, [latestMessage?.id])

  // After typewriting is done, move message into history
  function handleTypewriterComplete() {
    if (!latestMessage) return
    setHistoryMessages(messages)
    setTypewriterText(null)
    setActiveId(null)
  }

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

      {/* Top bar — QR + code */}
      <header className="relative z-10 flex items-start justify-between gap-6 p-6 border-b border-jungle-800">
        <div className="flex flex-col gap-1">
          <h1 className="font-cinzel_deco text-gold-300 text-xl font-bold text-glow-gold">JUMANJI</h1>
          <p className="text-jungle-500 text-xs font-cinzel uppercase tracking-widest">Main Display</p>
        </div>

        <div className="flex items-center gap-6 flex-wrap justify-end">
          <SessionCodeBadge code={sessionCode ?? ''} />
          <QRCodeDisplay sessionCode={sessionCode ?? ''} />
        </div>
      </header>

      {/* Main message area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-12 gap-8">
        {!typewriterText && messages.length === 0 && (
          <div className="text-center">
            <p className="font-cinzel text-jungle-400 text-2xl tracking-widest animate-pulse">
              Waiting for the jungle to speak…
            </p>
            <p className="text-jungle-600 text-sm mt-3 font-cinzel">
              Players can join using the code or QR above
            </p>
          </div>
        )}

        {/* Typewriter — active message */}
        {typewriterText && (
          <div className="text-center max-w-2xl">
            <p className="font-mono text-2xl md:text-4xl leading-relaxed">
              <TypewriterText
                text={typewriterText}
                speed={40}
                onComplete={handleTypewriterComplete}
              />
            </p>
          </div>
        )}

        {/* Message history */}
        {historyMessages.length > 0 && (
          <div className="w-full max-w-2xl">
            <MessageFeed messages={historyMessages} activeMessageId={activeId ?? undefined} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-4 border-t border-jungle-800 flex justify-between items-center">
        <p className="text-jungle-700 text-xs font-cinzel">
          {messages.length} message{messages.length !== 1 ? 's' : ''} received
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-jungle-600 hover:text-jungle-400 text-xs font-cinzel transition-colors"
        >
          End Session
        </button>
      </footer>
    </div>
  )
}
