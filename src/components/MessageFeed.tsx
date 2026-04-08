import { useEffect, useRef } from 'react'
import type { DisplayMessage } from '../types'

interface MessageFeedProps {
  messages: DisplayMessage[]
  activeMessageId?: string
}

export function MessageFeed({ messages, activeMessageId }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) return null

  return (
    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto px-2">
      {messages.map((msg, i) => {
        const isActive = msg.id === activeMessageId
        const age = messages.length - 1 - i
        const opacity = isActive ? 1 : Math.max(0.2, 1 - age * 0.15)

        return (
          <p
            key={msg.id}
            className="font-mono text-sm text-jungle-200 text-center"
            style={{ opacity, transition: 'opacity 0.5s ease' }}
          >
            {msg.text}
          </p>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
