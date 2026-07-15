// The transport layer decouples the UI/hooks from *how* a message reaches the
// other device. Today there are two implementations — Supabase (cloud, needs
// internet) and WebRTC (peer-to-peer over the local network) — plus an
// orchestrator that picks between them and falls back. See ./SupabaseTransport,
// ./WebRTCTransport and ./OrchestratedTransport.

export type ConnectionQuality = 'connecting' | 'good' | 'poor' | 'disconnected'

// The only payload that crosses devices. `text === ''` means "clear the display"
// (this convention predates the transport layer and is relied on by MainDisplay).
export interface DisplayPayload {
  text: string
}

export interface Transport {
  /** Send a payload to the display. */
  send(payload: DisplayPayload): Promise<void> | void
  /** Subscribe to incoming payloads. Returns an unsubscribe function. */
  onMessage(handler: (payload: DisplayPayload) => void): () => void
  /** Current connection quality (drives the SignalIcon + circle tint). */
  getQuality(): ConnectionQuality
  /** Subscribe to quality changes. Returns an unsubscribe function. */
  onQualityChange(handler: (quality: ConnectionQuality) => void): () => void
  /** Tear down all channels/connections. */
  close(): void
}

export type TransportRole = 'main' | 'client'
