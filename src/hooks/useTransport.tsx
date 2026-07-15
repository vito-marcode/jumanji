import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { OrchestratedTransport } from '../lib/transport/OrchestratedTransport'
import { isInternetReachable } from '../lib/net'
import type { Transport, TransportRole } from '../lib/transport/types'
import type { Session } from '../types'

interface TransportContextValue {
  role: TransportRole
  sessionCode: string
  /** Supabase session row when resolved online; null offline. */
  session: Session | null
  /** Supabase session UUID — needed by Supabase-backed hooks (collections, history). */
  sessionId: string | null
  /** Active transport (Supabase + WebRTC, orchestrated). */
  transport: Transport | null
  loadingSession: boolean
  /** Internet reachable at load: true/false, or null while probing. */
  online: boolean | null
}

const TransportContext = createContext<TransportContextValue | null>(null)

/**
 * Owns connectivity detection, session resolution and transport construction for
 * a routed page. Concentrating this here is what lets the app work offline: the
 * decision of whether to hit Supabase (and whether to redirect on a missing
 * session) lives in one place instead of being duplicated across the pages.
 */
export function TransportProvider({ role, children }: { role: TransportRole; children: ReactNode }) {
  const { sessionCode: rawCode } = useParams<{ sessionCode: string }>()
  const navigate = useNavigate()
  const sessionCode = (rawCode ?? '').toUpperCase()

  const [session, setSession] = useState<Session | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [transport, setTransport] = useState<Transport | null>(null)

  // Step 1 — probe connectivity, then resolve the session.
  // Online: look up the Supabase row (missing → redirect home, as before).
  // Offline: skip the lookup and use the code itself as the room identity;
  // never redirect (that was the "app won't even load offline" bug).
  useEffect(() => {
    if (!sessionCode) {
      setLoadingSession(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const reachable = await isInternetReachable()
      if (cancelled) return
      setOnline(reachable)
      if (reachable) {
        const { data, error } = await supabase.from('sessions').select().eq('code', sessionCode).single()
        if (cancelled) return
        setLoadingSession(false)
        if (error || !data) {
          navigate('/')
          return
        }
        setSession(data as Session)
        setSessionId((data as Session).id)
      } else {
        setLoadingSession(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionCode, navigate])

  // Step 2 — build the transport once connectivity is known (and, when online,
  // the session id is resolved).
  useEffect(() => {
    if (online === null) return // still probing
    if (online && !sessionId) return // online but session not resolved yet
    const t = new OrchestratedTransport({ role, sessionCode, sessionId, online })
    setTransport(t)
    return () => {
      t.close()
      setTransport(null)
    }
  }, [online, sessionId, role, sessionCode])

  const value = useMemo<TransportContextValue>(
    () => ({
      role,
      sessionCode,
      session,
      sessionId,
      transport,
      loadingSession,
      online,
    }),
    [role, sessionCode, session, sessionId, transport, loadingSession, online],
  )

  return <TransportContext.Provider value={value}>{children}</TransportContext.Provider>
}

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext)
  if (!ctx) throw new Error('useTransport must be used within a TransportProvider')
  return ctx
}
