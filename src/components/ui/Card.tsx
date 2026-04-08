import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'green' | 'gold' | 'none'
}

export function Card({ glow = 'none', className = '', children, ...props }: CardProps) {
  const glowClass =
    glow === 'green' ? 'border-jungle-400 border-glow-green' :
    glow === 'gold'  ? 'border-gold-500 border-glow-gold' :
                       'border-jungle-700'

  return (
    <div
      className={`bg-jungle-900/80 backdrop-blur-sm border rounded-lg ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
