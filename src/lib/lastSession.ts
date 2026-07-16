// Remembers the last session this device was in, so an installed PWA can reopen
// straight into it. The PWA manifest start_url is static ('/'), so on
// Chrome/Android/desktop a cold launch lands on the Landing page; we redirect
// from there. (iOS "Add to Home Screen" captures the current URL as start_url,
// so it already reopens the session — the redirect is then a no-op.)

export type Role = 'main' | 'client'
export interface LastSession {
  role: Role
  code: string
}

const KEY = 'jumanji_last_session'

export function saveLastSession(role: Role, code: string): void {
  if (!code) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ role, code: code.toUpperCase() }))
  } catch {
    /* storage unavailable */
  }
}

export function getLastSession(): LastSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && (parsed.role === 'main' || parsed.role === 'client') && typeof parsed.code === 'string' && parsed.code) {
      return parsed as LastSession
    }
    return null
  } catch {
    return null
  }
}

export function isStandalonePWA(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
      window.matchMedia?.('(display-mode: minimal-ui)').matches === true ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

// True only for the very first page mount of a fresh app launch. Set once per JS
// context (i.e. per PWA launch); survives in-app navigation, so hitting "Leave"
// to return to the Landing page does not count as a cold start.
let coldStart = true
export function peekColdStart(): boolean {
  return coldStart
}
export function consumeColdStart(): boolean {
  const was = coldStart
  coldStart = false
  return was
}
