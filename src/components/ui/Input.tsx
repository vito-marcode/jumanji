import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs font-cinzel text-jungle-300 uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`bg-jungle-800 border border-jungle-600 focus:border-jungle-300 focus:outline-none rounded px-3 py-2 text-jungle-50 placeholder-jungle-500 text-sm transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}
