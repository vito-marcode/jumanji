import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type ConnectionQuality = 'connecting' | 'good' | 'poor' | 'disconnected'

export function useSessionPresence(sessionCode: string | null): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>('connecting')

  useEffect(() => {
    if (!sessionCode) return

    const channel = supabase.channel(`heartbeat-${sessionCode.toUpperCase()}`)

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setQuality('good')
      else if (status === 'TIMED_OUT') setQuality('poor')
      else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') setQuality('disconnected')
    })

    return () => { supabase.removeChannel(channel) }
  }, [sessionCode])

  return quality
}
