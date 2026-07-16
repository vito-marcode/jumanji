import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { OrchestratedTransport } from '../lib/transport/OrchestratedTransport'
import { isInternetReachable, onConnectivityChange } from '../lib/net'
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
  /** Internet reachable: true/false, or null while probing. */
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

  const transportRef = useRef<Transport | null>(null)
  const builtOnlineRef = useRef<boolean | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  sessionIdRef.current = sessionId

  useEffect(() => {
    if (!sessionCode) {
      setLoadingSession(false)
      return
    }
    let cancelled = false

    const build = (isOnline: boolean) => {
      if (cancelled) return
      transportRef.current?.close()
      const t = new OrchestratedTransport({
        role,
        sessionCode,
        sessionId: sessionIdRef.current,
        online: isOnline,
      })
      transportRef.current = t
      builtOnlineRef.current = isOnline
      setTransport(t)
    }

    // Look up the Supabase session row (online only) to obtain its UUID.
    const resolveSession = async (): Promise<boolean> => {
      const { data, error } = await supabase.from('sessions').select().eq('code', sessionCode).single()
      if (cancelled) return false
      if (error || !data) return false
      setSession(data as Session)
      setSessionId((data as Session).id)
      sessionIdRef.current = (data as Session).id
      return true
    }

    // Initial: probe connectivity, resolve the session, build the transport.
    // Online: a missing session row redirects home (as before).
    // Offline: use the code directly, no redirect (so the app still loads).
    ;(async () => {
      const reachable = await isInternetReachable()
      if (cancelled) return
      setOnline(reachable)
      if (reachable) {
        const ok = await resolveSession()
        if (cancelled) return
        setLoadingSession(false)
        if (!ok) {
          navigate('/')
          return
        }
      } else {
        setLoadingSession(false)
      }
      build(reachable)
    })()

    // React to connectivity changes. Rebuild on every transition *into* online —
    // whether the app started offline, or started online and then the internet
    // dropped and came back (Supabase realtime/signaling doesn't reliably self-heal,
    // and a WAN-level outage doesn't even fire the browser online/offline events).
    // Rebuilding re-establishes signaling + heartbeat + fallback; any P2P link
    // re-pairs via the main's `hello`. Never rebuild on going offline: an
    // established P2P link runs over the LAN and must survive the drop.
    let prevOnline: boolean | null = null
    const unsub = onConnectivityChange((nowOnline) => {
      if (cancelled) return
      const wasOnline = prevOnline
      prevOnline = nowOnline
      const recovered = wasOnline === false || (wasOnline === null && builtOnlineRef.current !== true)
      if (!nowOnline || !recovered) return
      ;(async () => {
        if (!sessionIdRef.current) await resolveSession()
        if (cancelled) return
        setOnline(true)
        build(true)
      })()
    })

    return () => {
      cancelled = true
      unsub()
      transportRef.current?.close()
      transportRef.current = null
      setTransport(null)
    }
  }, [sessionCode, navigate, role])

  const value = useMemo<TransportContextValue>(
    () => ({ role, sessionCode, session, sessionId, transport, loadingSession, online }),
    [role, sessionCode, session, sessionId, transport, loadingSession, online],
  )

  return <TransportContext.Provider value={value}>{children}</TransportContext.Provider>
}

export function useTransport(): TransportContextValue {
  const ctx = useContext(TransportContext)
  if (!ctx) throw new Error('useTransport must be used within a TransportProvider')
  return ctx
}
