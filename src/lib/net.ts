// Connectivity detection. `navigator.onLine` is necessary but not sufficient
// (it reports true on a server-less LAN with no internet), so we confirm with a
// short-timeout probe to the Supabase origin.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export async function isInternetReachable(timeoutMs = 2500): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  if (!SUPABASE_URL) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    // no-cors: we don't need to read the body, only to learn whether the request
    // reaches the server. An opaque resolution means the network path is up.
    await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    return true
  } catch {
    return false
  }
}

/**
 * Subscribe to connectivity *changes*. The handler fires only when reachability
 * actually flips (deduped), so callers get clean transition events.
 *
 * Uses both the browser online/offline events AND periodic polling: an internet
 * outage at the router (WAN down) while Wi-Fi stays up does NOT fire the browser
 * events (`navigator.onLine` stays true), so polling is required to notice the
 * drop and the later recovery.
 */
export function onConnectivityChange(
  handler: (online: boolean) => void,
  pollMs = 20000,
): () => void {
  let cancelled = false
  let last: boolean | null = null

  const emit = (value: boolean) => {
    if (cancelled || value === last) return
    last = value
    handler(value)
  }
  const check = async () => {
    const online = await isInternetReachable()
    emit(online)
  }
  const onOnline = () => void check()
  const onOffline = () => emit(false)

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  const interval = setInterval(() => void check(), pollMs)
  void check() // seed the initial state

  return () => {
    cancelled = true
    clearInterval(interval)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
