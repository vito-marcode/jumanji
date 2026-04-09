import { useEffect, useRef, useState } from 'react'

interface TypewriterTextProps {
  text: string
  charDelay?: number
  onComplete?: () => void
}

export function TypewriterText({ text, charDelay = 120, onComplete }: TypewriterTextProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    setRevealedCount(0)
    let current = 0
    const total = text.length

    const interval = setInterval(() => {
      current += 1
      setRevealedCount(current)
      if (current >= total) {
        clearInterval(interval)
        // onComplete is called via onAnimationEnd on the last character span,
        // so the component stays mounted until all animations have finished.
      }
    }, charDelay)

    return () => clearInterval(interval)
  }, [text, charDelay])

  // Group characters by word, tracking absolute index (including spaces)
  const wordGroups: { chars: string[]; startIdx: number }[] = []
  let idx = 0
  text.split(' ').forEach((word, wi) => {
    if (wi > 0) idx++ // skip space character
    wordGroups.push({ chars: word.split(''), startIdx: idx })
    idx += word.length
  })

  const lastWordIdx = wordGroups.length - 1
  const lastCharIdx = wordGroups[lastWordIdx]?.chars.length - 1

  return (
    <span>
      {wordGroups.map((group, wi) => (
        <span key={wi}>
          {wi > 0 && <span className="inline-block w-[0.4em]" style={{ letterSpacing: 0 }} />}
          <span className="inline-block whitespace-nowrap">
            {group.chars.map((char, ci) => {
              const absIdx = group.startIdx + ci
              const isLastInWord = ci === group.chars.length - 1
              const isVeryLast = wi === lastWordIdx && ci === lastCharIdx
              return (
                <span
                  key={ci}
                  className={`inline-block ${absIdx < revealedCount ? 'animate-materialize' : 'opacity-0'}`}
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'filter, opacity',
                    ...(isLastInWord && { letterSpacing: 0 }),
                  }}
                  onAnimationEnd={isVeryLast ? () => onCompleteRef.current?.() : undefined}
                >
                  {char}
                </span>
              )
            })}
          </span>
        </span>
      ))}
    </span>
  )
}
