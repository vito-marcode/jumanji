import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

interface UseRealtimeChannelOptions<T extends Record<string, unknown>> {
  table: string
  filter: string
  onInsert: (record: T) => void
  enabled?: boolean
}

export function useRealtimeChannel<T extends Record<string, unknown>>({
  table,
  filter,
  onInsert,
  enabled = true,
}: UseRealtimeChannelOptions<T>) {
  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`${table}:${filter}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter,
        },
        (payload: RealtimePostgresInsertPayload<T>) => {
          onInsert(payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, onInsert, enabled])
}
