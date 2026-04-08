import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRealtimeChannel } from './useRealtimeChannel'
import type { DisplayMessage } from '../types'

export function useDisplayMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [latestMessage, setLatestMessage] = useState<DisplayMessage | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch last 20 messages on mount (rendered statically, no animation)
  useEffect(() => {
    if (!sessionId) return

    setLoading(true)
    supabase
      .from('display_messages')
      .select()
      .eq('session_id', sessionId)
      .order('sent_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setMessages((data as DisplayMessage[]).reverse())
        setLoading(false)
      })
  }, [sessionId])

  const handleInsert = useCallback((record: Record<string, unknown>) => {
    const msg = record as unknown as DisplayMessage
    setMessages((prev) => [...prev, msg])
    setLatestMessage(msg)
  }, [])

  useRealtimeChannel({
    table: 'display_messages',
    filter: `session_id=eq.${sessionId}`,
    onInsert: handleInsert,
    enabled: !!sessionId,
  })

  async function sendMessage(text: string) {
    if (!sessionId) return
    await supabase.from('display_messages').insert({ session_id: sessionId, text })
  }

  async function clearDisplay() {
    if (!sessionId) return
    await supabase.from('display_messages').insert({ session_id: sessionId, text: '' })
  }

  return { messages, latestMessage, loading, sendMessage, clearDisplay }
}
