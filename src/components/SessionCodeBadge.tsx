import { useState } from 'react'

interface SessionCodeBadgeProps {
  code: string
}

export function SessionCodeBadge({ code }: SessionCodeBadgeProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy"
      className="group flex flex-col items-center gap-1"
    >
      <span className="text-xs font-cinzel text-jungle-400 uppercase tracking-widest">
        Session Code
      </span>
      <span className="font-cinzel text-3xl font-bold tracking-[0.3em] text-gold-300 text-glow-gold animate-pulse-glow px-4 py-2 border border-gold-600 border-glow-gold rounded-lg bg-jungle-900/50">
        {code}
      </span>
      <span className="text-xs text-jungle-500 group-hover:text-jungle-300 transition-colors">
        {copied ? '✓ Copied!' : 'tap to copy'}
      </span>
    </button>
  )
}
