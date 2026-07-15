import { useEffect, useState } from 'react'
import { useTransport } from './useTransport'
import type { ConnectionQuality } from '../lib/transport/types'

// Re-exported so existing importers (e.g. SignalIcon) keep working unchanged.
export type { ConnectionQuality } from '../lib/transport/types'

/**
 * Reports the connection quality of the active transport. Thin adapter — the
 * real logic lives in each Transport implementation (Supabase heartbeat channel
 * or WebRTC datachannel/ICE state).
 */
export function useSessionPresence(): ConnectionQuality {
  const { transport } = useTransport()
  const [quality, setQuality] = useState<ConnectionQuality>('connecting')

  useEffect(() => {
    if (!transport) {
      setQuality('connecting')
      return
    }
    setQuality(transport.getQuality())
    return transport.onQualityChange(setQuality)
  }, [transport])

  return quality
}
