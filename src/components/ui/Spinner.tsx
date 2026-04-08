export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return (
    <div
      className={`${s} rounded-full border-2 border-jungle-700 border-t-jungle-300 animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )
}
