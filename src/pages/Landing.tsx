import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'

export default function Landing() {
  const navigate = useNavigate()
  const { createSession, joinSession, loading, error } = useSession()
  const [code, setCode] = useState('')
  const [view, setView] = useState<'home' | 'join'>('home')

  async function handleCreateSession() {
    const session = await createSession()
    if (session) navigate(`/main/${session.code}`)
  }

  async function handleJoin() {
    if (code.trim().length < 6) return
    const session = await joinSession(code)
    if (session) navigate(`/client/${session.code}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-jungle-950">
      {/* Background vines / texture */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-jungle-800/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-jungle-700/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-gold-900/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-sm">
        {/* Title */}
        <div className="text-center">
          <h1 className="font-cinzel_deco text-5xl font-black text-gold-300 text-glow-gold leading-tight tracking-wider">
            JUMANJI
          </h1>
          <p className="font-cinzel text-jungle-400 text-sm mt-2 tracking-widest uppercase">
            The Game Awaits
          </p>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold-700" />
          <span className="text-gold-600 text-lg">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold-700" />
        </div>

        {view === 'home' && (
          <div className="flex flex-col gap-4 w-full animate-fade-in">
            <Button
              variant="primary"
              size="lg"
              className="w-full text-center"
              onClick={handleCreateSession}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> Creating…
                </span>
              ) : (
                '🎮 Be the Main'
              )}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full text-center"
              onClick={() => setView('join')}
            >
              🌿 Join Session
            </Button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}

        {view === 'join' && (
          <div className="flex flex-col gap-4 w-full animate-fade-in">
            <Input
              label="Session Code"
              placeholder="Enter 6-character code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-2xl tracking-[0.3em] uppercase font-cinzel"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
            />
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleJoin}
              disabled={loading || code.trim().length < 6}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" /> Joining…
                </span>
              ) : (
                'Enter the Jungle'
              )}
            </Button>
            <Button variant="ghost" size="md" className="w-full" onClick={() => { setView('home'); setCode('') }}>
              ← Back
            </Button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        )}

        <p className="text-jungle-600 text-xs text-center font-cinzel">
          A world you can only survive together
        </p>
      </div>
    </div>
  )
}
