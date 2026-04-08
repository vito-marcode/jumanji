import { useEffect, useRef, useState } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
}

export function TypewriterText({ text, speed = 45, onComplete }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    setDisplayed('')
    indexRef.current = 0

    const interval = setInterval(() => {
      indexRef.current += 1
      setDisplayed(text.slice(0, indexRef.current))

      if (indexRef.current >= text.length) {
        clearInterval(interval)
        onCompleteRef.current?.()
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return (
    <span className="font-mono text-glow-green text-glow-green animate-pulse-glow">
      {displayed}
      <span className="inline-block w-0.5 h-[1em] bg-glow-green ml-0.5 animate-pulse" />
    </span>
  )
}
