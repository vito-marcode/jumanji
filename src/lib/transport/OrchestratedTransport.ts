import { SupabaseTransport } from './SupabaseTransport'
import { WebRTCTransport } from './WebRTCTransport'
import { SupabaseSignaling } from './signaling/SupabaseSignaling'
import type { ConnectionQuality, DisplayPayload, Transport, TransportRole } from './types'

interface OrchestratedOptions {
  role: TransportRole
  sessionCode: string
  /** Supabase session UUID; null when offline (no DB row resolved). */
  sessionId: string | null
  /** Whether the internet (Supabase) was reachable at construction. */
  online: boolean
}

// Composes the two transports:
// - Supabase (cloud) as the baseline + live fallback, when a session UUID is known.
// - WebRTC (P2P) negotiated via Supabase signaling, when online.
// Behavior: pair over signaling while online; once a data channel is open we
// prefer P2P, which keeps working if the internet later drops. `send` routes
// through P2P when ready, otherwise Supabase.
export class OrchestratedTransport implements Transport {
  private supabase: SupabaseTransport | null = null
  private webrtc: WebRTCTransport | null = null
  private messageHandlers = new Set<(p: DisplayPayload) => void>()
  private qualityHandlers = new Set<(q: ConnectionQuality) => void>()
  private unsubs: Array<() => void> = []
  private quality: ConnectionQuality = 'connecting'
  private supabaseQuality: ConnectionQuality = 'connecting'
  private p2pQuality: ConnectionQuality = 'connecting'

  constructor({ role, sessionCode, sessionId, online }: OrchestratedOptions) {
    if (sessionId) {
      this.supabase = new SupabaseTransport(sessionId, sessionCode)
      this.supabaseQuality = this.supabase.getQuality()
      this.unsubs.push(this.supabase.onMessage((p) => this.emit(p)))
      this.unsubs.push(
        this.supabase.onQualityChange((q) => {
          this.supabaseQuality = q
          this.recompute()
        }),
      )
    }

    // WebRTC signaling needs reachable Supabase realtime, so P2P is only set up
    // when online. Once established it survives an internet drop.
    if (online) {
      const signaling = new SupabaseSignaling(sessionCode)
      this.webrtc = new WebRTCTransport({
        role,
        signaling,
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      this.p2pQuality = this.webrtc.getQuality()
      this.unsubs.push(this.webrtc.onMessage((p) => this.emit(p)))
      this.unsubs.push(
        this.webrtc.onQualityChange((q) => {
          this.p2pQuality = q
          this.recompute()
        }),
      )
    }

    this.recompute()
  }

  private emit(p: DisplayPayload) {
    // A message travels over exactly one path (the sender picks P2P or Supabase),
    // so no de-duplication is needed here.
    this.messageHandlers.forEach((h) => h(p))
  }

  private recompute() {
    let q: ConnectionQuality
    if (this.webrtc?.isReady()) q = 'good'
    else if (this.supabase) q = this.supabaseQuality
    else if (this.webrtc) q = this.p2pQuality
    else q = 'disconnected'
    if (q !== this.quality) {
      this.quality = q
      this.qualityHandlers.forEach((h) => h(q))
    }
  }

  /** True once a P2P data channel is open. */
  isP2P(): boolean {
    return this.webrtc?.isReady() ?? false
  }

  send(payload: DisplayPayload) {
    if (this.webrtc?.isReady()) return this.webrtc.send(payload)
    if (this.supabase) return this.supabase.send(payload)
    // No available path (offline with no established P2P).
  }

  onMessage(handler: (p: DisplayPayload) => void) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  getQuality() {
    return this.quality
  }

  onQualityChange(handler: (q: ConnectionQuality) => void) {
    this.qualityHandlers.add(handler)
    return () => this.qualityHandlers.delete(handler)
  }

  close() {
    this.unsubs.forEach((u) => u())
    this.unsubs = []
    this.supabase?.close()
    this.webrtc?.close()
    this.supabase = null
    this.webrtc = null
    this.messageHandlers.clear()
    this.qualityHandlers.clear()
  }
}
