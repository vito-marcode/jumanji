import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import type { Signaling, SignalMessage } from './types'

// Signaling over Supabase Realtime Broadcast (no DB writes). Reuses the same
// realtime infra as the heartbeat channel. Works only when internet is
// reachable; once the WebRTC data channel is open, signaling is no longer in the
// data path, so losing internet does not drop an established P2P link.
export class SupabaseSignaling implements Signaling {
  private channel: RealtimeChannel
  private handlers = new Set<(msg: SignalMessage) => void>()
  private subscribed = false
  private queue: SignalMessage[] = []

  constructor(sessionCode: string) {
    this.channel = supabase.channel(`signal-${sessionCode.toUpperCase()}`, {
      config: { broadcast: { self: false } },
    })
    this.channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        this.handlers.forEach((h) => h(payload as SignalMessage))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.subscribed = true
          const pending = this.queue
          this.queue = []
          pending.forEach((msg) => this.rawSend(msg))
        }
      })
  }

  private rawSend(msg: SignalMessage) {
    void this.channel.send({ type: 'broadcast', event: 'signal', payload: msg })
  }

  send(msg: SignalMessage) {
    if (this.subscribed) this.rawSend(msg)
    else this.queue.push(msg)
  }

  onMessage(handler: (msg: SignalMessage) => void) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  close() {
    supabase.removeChannel(this.channel)
    this.handlers.clear()
    this.queue = []
    this.subscribed = false
  }
}
