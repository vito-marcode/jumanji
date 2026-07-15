import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js'
import { supabase } from '../supabase'
import type { ConnectionQuality, DisplayPayload, Transport } from './types'

// Wraps the original Supabase behavior behind the Transport interface:
// - send      → INSERT into `display_messages`
// - onMessage → `postgres_changes` INSERT subscription (same as useRealtimeChannel)
// - quality   → the `heartbeat-<CODE>` channel subscription status (same as the
//               original useSessionPresence)
// This is a pure refactor — no behavior change vs. the pre-transport code.
export class SupabaseTransport implements Transport {
  private messageChannel: RealtimeChannel | null = null
  private heartbeatChannel: RealtimeChannel | null = null
  private messageHandlers = new Set<(p: DisplayPayload) => void>()
  private qualityHandlers = new Set<(q: ConnectionQuality) => void>()
  private quality: ConnectionQuality = 'connecting'

  constructor(
    private readonly sessionId: string,
    private readonly sessionCode: string,
  ) {
    this.subscribeMessages()
    this.subscribeHeartbeat()
  }

  private subscribeMessages() {
    this.messageChannel = supabase
      .channel(`display_messages:session_id=eq.${this.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'display_messages',
          filter: `session_id=eq.${this.sessionId}`,
        },
        (payload: RealtimePostgresInsertPayload<{ text: string }>) => {
          const text = (payload.new?.text ?? '') as string
          this.messageHandlers.forEach((h) => h({ text }))
        },
      )
      .subscribe()
  }

  private subscribeHeartbeat() {
    this.heartbeatChannel = supabase.channel(`heartbeat-${this.sessionCode.toUpperCase()}`)
    this.heartbeatChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') this.setQuality('good')
      else if (status === 'TIMED_OUT') this.setQuality('poor')
      else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') this.setQuality('disconnected')
    })
  }

  private setQuality(q: ConnectionQuality) {
    if (q === this.quality) return
    this.quality = q
    this.qualityHandlers.forEach((h) => h(q))
  }

  send(payload: DisplayPayload) {
    return supabase
      .from('display_messages')
      .insert({ session_id: this.sessionId, text: payload.text })
      .then(() => undefined)
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
    if (this.messageChannel) supabase.removeChannel(this.messageChannel)
    if (this.heartbeatChannel) supabase.removeChannel(this.heartbeatChannel)
    this.messageChannel = null
    this.heartbeatChannel = null
    this.messageHandlers.clear()
    this.qualityHandlers.clear()
  }
}
