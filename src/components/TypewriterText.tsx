import { useEffect, useRef, useState } from 'react'

interface TypewriterTextProps {
  text: string
  charDelay?: number
  animDuration?: number
  onComplete?: () => void
}

// The gold glow. It is a *static* text-shadow (never animated) so the browser rasterizes
// each glyph once and only composites it — the materialize animation touches only opacity
// and transform. Applied to every revealed char, it fades in with the letter via opacity.
const GLOW = '0 0 10px rgba(249,204,106,0.7), 0 0 30px rgba(249,204,106,0.35)'

export function TypewriterText({ text, charDelay = 120, animDuration = 6000, onComplete }: TypewriterTextProps) {
  const [revealedCount, setRevealedCount] = useState(0)
  // How many characters have finished their materialize animation. Once settled, a
  // character no longer needs its own GPU layer, so we release the layer hints — this
  // keeps the number of live compositing layers down to the few chars animating at once
  // (instead of one permanent layer per character of the whole message).
  const [settledCount, setSettledCount] = useState(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    setRevealedCount(0)
    setSettledCount(0)
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
              const isRevealed = absIdx < revealedCount
              const isSettled = absIdx < settledCount
              // Only characters mid-animation carry the layer-promotion hints; unrevealed
              // and settled ones stay un-promoted so the browser can flatten them.
              const isAnimating = isRevealed && !isSettled
              return (
                <span
                  key={ci}
                  className={`inline-block ${isSettled ? 'opacity-100' : isRevealed ? 'animate-materialize' : 'opacity-0'}`}
                  style={{
                    // Glow is present as soon as the char is revealed (fades in via opacity).
                    ...(isRevealed && { textShadow: GLOW }),
                    // Promote to a compositing layer only while animating; the keyframe drives
                    // the transform, so we just hint transform+opacity here and release it after.
                    ...(isAnimating && {
                      willChange: 'transform, opacity',
                      animationDuration: `${animDuration}ms`,
                    }),
                    ...(isLastInWord && { letterSpacing: 0 }),
                  }}
                  onAnimationEnd={() => {
                    setSettledCount(c => Math.max(c, absIdx + 1))
                    if (isVeryLast) onCompleteRef.current?.()
                  }}
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
