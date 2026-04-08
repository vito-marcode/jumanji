import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useDisplayMessages } from '../hooks/useDisplayMessages'
import { QRCodeDisplay } from '../components/QRCodeDisplay'
import { SessionCodeBadge } from '../components/SessionCodeBadge'
import { TypewriterText } from '../components/TypewriterText'
import { Spinner } from '../components/ui/Spinner'
import type { Session } from '../types'

export default function MainDisplay() {
  const { sessionCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)

  const { latestMessage } = useDisplayMessages(session?.id ?? null)

  const [displayText, setDisplayText] = useState<string | null>(null)

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

  useEffect(() => {
    if (!latestMessage) return
    setDisplayText(latestMessage.text)
  }, [latestMessage?.id])

  const isEmpty = !displayText

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
      <main className="relative z-10 flex-1 flex items-center justify-center px-8 py-12">
        {isEmpty && (
          <div className="text-center animate-fade-in">
            <p className="font-cinzel text-jungle-400 text-2xl tracking-widest animate-pulse">
              Waiting for the jungle to speak…
            </p>
            <p className="text-jungle-600 text-sm mt-3 font-cinzel">
              Players can join using the code or QR above
            </p>
          </div>
        )}

        {displayText && (
          <p className="font-cinzel text-4xl md:text-6xl leading-loose text-center max-w-4xl text-gold-300 uppercase tracking-widest">
            <TypewriterText
              text={displayText}
              charDelay={120}
            />
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-4 border-t border-jungle-800 flex justify-between items-center">
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
