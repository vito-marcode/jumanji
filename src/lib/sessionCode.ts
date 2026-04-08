// Unambiguous characters (no 0/O/I/1/L)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateSessionCode(): string {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('')
}
