import { useEffect, useRef, useState } from 'react'
import { useI18n, type Lang } from '../i18n'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
]

export function HeaderMenu({ onLeave }: { onLeave: () => void }) {
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemClass =
    'flex w-full items-center gap-2 px-3 py-2 text-xs font-cinzel text-left text-jungle-200 hover:bg-jungle-800 transition-colors'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 flex items-center justify-center rounded border border-jungle-700 text-jungle-200 hover:text-jungle-50 hover:bg-jungle-800 transition-colors"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 min-w-[11rem] rounded border border-jungle-700 bg-jungle-900 shadow-lg overflow-hidden z-50 animate-fade-in"
        >
          {/* Language */}
          <div className="px-3 pt-2 pb-1 text-[0.65rem] font-cinzel uppercase tracking-widest text-jungle-400">
            {t('common.language')}
          </div>
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={lang === l.code}
              onClick={() => setLang(l.code)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-xs font-cinzel text-left transition-colors ${
                lang === l.code ? 'bg-jungle-700 text-jungle-50' : 'text-jungle-200 hover:bg-jungle-800'
              }`}
            >
              <span>{l.label}</span>
              <span className="uppercase tracking-wider text-jungle-400">{lang === l.code ? '✓' : l.code}</span>
            </button>
          ))}

          <div className="border-t border-jungle-800" />

          <button role="menuitem" onClick={() => { setOpen(false); onLeave() }} className={itemClass}>
            <span className="w-4 text-center">⎋</span>
            <span>{t('common.leave')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
