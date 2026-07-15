import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useTransport } from './useTransport'
import type { DisplayMessage } from '../types'

// Generate a unique id for a received payload. MainDisplay re-triggers its
// typewriter animation on `latestMessage.id` changing, so every received
// message (even repeated text) must get a fresh id.
let messageSeq = 0
function nextId(): string {
  messageSeq += 1
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(messageSeq)
  return `${rand}-${messageSeq}`
}

export function useDisplayMessages() {
  const { transport, sessionId } = useTransport()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [latestMessage, setLatestMessage] = useState<DisplayMessage | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch last 20 messages on mount (rendered statically, no animation).
  // Best-effort and Supabase-only: no-ops offline (no sessionId).
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

  // Incoming messages arrive through the active transport (Supabase or WebRTC).
  useEffect(() => {
    if (!transport) return
    return transport.onMessage(({ text }) => {
      const msg: DisplayMessage = {
        id: nextId(),
        session_id: sessionId ?? '',
        text,
        sent_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, msg])
      setLatestMessage(msg)
    })
  }, [transport, sessionId])

  const sendMessage = useCallback(
    async (text: string) => {
      await transport?.send({ text })
    },
    [transport],
  )

  const clearDisplay = useCallback(async () => {
    await transport?.send({ text: '' })
  }, [transport])

  return { messages, latestMessage, loading, sendMessage, clearDisplay }
}
