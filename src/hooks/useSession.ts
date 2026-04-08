import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { generateSessionCode } from '../lib/sessionCode'
import type { Session } from '../types'

export function useSession() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createSession(): Promise<Session | null> {
    setLoading(true)
    setError(null)

    // Retry up to 5 times on code collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateSessionCode()
      const { data, error: err } = await supabase
        .from('sessions')
        .insert({ code })
        .select()
        .single()

      if (!err && data) {
        setLoading(false)
        return data as Session
      }

      // 23505 = unique violation — code collision, retry
      if (err?.code !== '23505') {
        setError(err?.message ?? 'Failed to create session')
        setLoading(false)
        return null
      }
    }

    setError('Could not generate a unique session code. Please try again.')
    setLoading(false)
    return null
  }

  async function joinSession(code: string): Promise<Session | null> {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('sessions')
      .select()
      .eq('code', code.toUpperCase().trim())
      .single()

    setLoading(false)

    if (err || !data) {
      setError('Session not found. Check the code and try again.')
      return null
    }

    return data as Session
  }

  return { createSession, joinSession, loading, error }
}
