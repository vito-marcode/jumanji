import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary:   'bg-gold-600 hover:bg-gold-500 text-jungle-950 border border-gold-400 font-semibold text-glow-gold shadow-glow_gold hover:shadow-glow_gold active:scale-95',
  secondary: 'bg-jungle-800 hover:bg-jungle-700 text-jungle-100 border border-jungle-500 hover:border-jungle-300 active:scale-95',
  danger:    'bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 active:scale-95',
  ghost:     'bg-transparent hover:bg-jungle-800 text-jungle-200 border border-jungle-700 hover:border-jungle-500 active:scale-95',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base',
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`font-cinzel rounded transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
