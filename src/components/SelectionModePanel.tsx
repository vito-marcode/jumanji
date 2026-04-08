import { useState } from 'react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import type { Collection, Option } from '../types'

type Mode = 'manual' | 'segment' | 'random'

interface SelectionModePanelProps {
  collection: Collection
  onSend: (text: string) => Promise<void>
}

export function SelectionModePanel({ collection, onSend }: SelectionModePanelProps) {
  const [mode, setMode] = useState<Mode>('manual')
  const [segStart, setSegStart] = useState(1)
  const [segEnd, setSegEnd] = useState(Math.max(1, collection.options?.length ?? 1))
  const [rolledOption, setRolledOption] = useState<Option | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const options = collection.options ?? []

  function pickRandom(pool: Option[]): Option | null {
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function rollSegment() {
    const start = Math.max(1, segStart) - 1
    const end = Math.min(options.length, segEnd)
    const pool = options.slice(start, end)
    setRolledOption(pickRandom(pool))
    setSent(false)
  }

  function rollAll() {
    setRolledOption(pickRandom(options))
    setSent(false)
  }

  async function handleSend(text: string) {
    setSending(true)
    await onSend(text)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: 'manual',  label: 'Manual' },
    { id: 'segment', label: 'Random Segment' },
    { id: 'random',  label: 'Random All' },
  ]

  return (
    <Card glow="green" className="p-4 flex flex-col gap-4">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setMode(tab.id); setRolledOption(null); setSent(false) }}
            className={`flex-1 py-2 px-2 text-xs font-cinzel rounded transition-colors ${
              mode === tab.id
                ? 'bg-jungle-600 text-jungle-50 border border-jungle-400'
                : 'bg-jungle-900 text-jungle-400 border border-jungle-700 hover:border-jungle-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'manual' && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <p className="text-jungle-500 text-sm text-center py-4">No options yet. Add some above.</p>
          )}
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSend(opt.text)}
              disabled={sending}
              className="text-left px-3 py-2.5 rounded border border-jungle-700 hover:border-gold-500 bg-jungle-800 hover:bg-jungle-700 text-jungle-100 text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="text-jungle-500 text-xs mr-2">{opt.position + 1}.</span>
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {mode === 'segment' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-cinzel text-jungle-400 uppercase tracking-wider">From</label>
              <input
                type="number"
                min={1}
                max={options.length}
                value={segStart}
                onChange={(e) => setSegStart(Number(e.target.value))}
                className="bg-jungle-800 border border-jungle-600 focus:border-jungle-300 focus:outline-none rounded px-3 py-2 text-jungle-50 text-sm w-full"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-cinzel text-jungle-400 uppercase tracking-wider">To</label>
              <input
                type="number"
                min={1}
                max={options.length}
                value={segEnd}
                onChange={(e) => setSegEnd(Number(e.target.value))}
                className="bg-jungle-800 border border-jungle-600 focus:border-jungle-300 focus:outline-none rounded px-3 py-2 text-jungle-50 text-sm w-full"
              />
            </div>
            <Button variant="primary" size="md" onClick={rollSegment} disabled={options.length === 0}>
              Roll
            </Button>
          </div>
          <p className="text-xs text-jungle-500">
            Range {segStart}–{segEnd} of {options.length} options
          </p>
          {rolledOption && <RolledResult option={rolledOption} sending={sending} sent={sent} onSend={handleSend} />}
        </div>
      )}

      {mode === 'random' && (
        <div className="flex flex-col gap-4 items-center">
          <Button variant="primary" size="lg" onClick={rollAll} disabled={options.length === 0} className="w-full">
            🎲 Roll the Dice
          </Button>
          {options.length === 0 && (
            <p className="text-jungle-500 text-sm">No options yet.</p>
          )}
          {rolledOption && <RolledResult option={rolledOption} sending={sending} sent={sent} onSend={handleSend} />}
        </div>
      )}
    </Card>
  )
}

function RolledResult({
  option,
  sending,
  sent,
  onSend,
}: {
  option: Option
  sending: boolean
  sent: boolean
  onSend: (text: string) => void
}) {
  return (
    <div className="flex flex-col gap-3 animate-slide-up">
      <div className="border border-jungle-500 border-glow-green rounded p-3 bg-jungle-950/50 text-center">
        <p className="font-mono text-jungle-100 text-sm">{option.text}</p>
      </div>
      <Button
        variant="primary"
        size="md"
        onClick={() => onSend(option.text)}
        disabled={sending || sent}
        className="w-full"
      >
        {sent ? '✓ Sent!' : sending ? 'Sending…' : 'Send to Main Screen'}
      </Button>
    </div>
  )
}
