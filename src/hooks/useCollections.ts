import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Collection, Option } from '../types'

export function useCollections(sessionId: string | null) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    fetchCollections()
  }, [sessionId])

  async function fetchCollections() {
    if (!sessionId) return
    setLoading(true)

    const { data } = await supabase
      .from('collections')
      .select('*, options(id, collection_id, text, position, created_at)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (data) {
      const sorted = (data as Collection[]).map((c) => ({
        ...c,
        options: (c.options ?? []).slice().sort((a, b) => a.position - b.position),
      }))
      setCollections(sorted)
    }
    setLoading(false)
  }

  async function createCollection(name: string): Promise<Collection | null> {
    if (!sessionId) return null

    const { data, error } = await supabase
      .from('collections')
      .insert({ session_id: sessionId, name })
      .select()
      .single()

    if (error || !data) return null

    const col = { ...(data as Collection), options: [] }
    setCollections((prev) => [...prev, col])
    return col
  }

  async function deleteCollection(id: string) {
    await supabase.from('collections').delete().eq('id', id)
    setCollections((prev) => prev.filter((c) => c.id !== id))
  }

  async function addOption(collectionId: string, text: string): Promise<Option | null> {
    const collection = collections.find((c) => c.id === collectionId)
    const maxPos = collection?.options?.length
      ? Math.max(...collection.options.map((o) => o.position))
      : -1
    const position = maxPos + 1

    const { data, error } = await supabase
      .from('options')
      .insert({ collection_id: collectionId, text, position })
      .select()
      .single()

    if (error || !data) return null

    const opt = data as Option
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? { ...c, options: [...(c.options ?? []), opt] }
          : c
      )
    )
    return opt
  }

  async function deleteOption(collectionId: string, optionId: string) {
    await supabase.from('options').delete().eq('id', optionId)
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? { ...c, options: (c.options ?? []).filter((o) => o.id !== optionId) }
          : c
      )
    )
  }

  async function updateOption(collectionId: string, optionId: string, text: string) {
    await supabase.from('options').update({ text }).eq('id', optionId)
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              options: (c.options ?? []).map((o) =>
                o.id === optionId ? { ...o, text } : o
              ),
            }
          : c
      )
    )
  }

  return {
    collections,
    loading,
    fetchCollections,
    createCollection,
    deleteCollection,
    addOption,
    deleteOption,
    updateOption,
  }
}
