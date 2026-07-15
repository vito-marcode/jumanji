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
 * Subscribe to connectivity changes. Fires with the latest reachability whenever
 * the browser's online/offline events fire (each re-confirmed with a probe).
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(handler: (online: boolean) => void): () => void {
  let cancelled = false
  const recheck = async () => {
    const online = await isInternetReachable()
    if (!cancelled) handler(online)
  }
  const onOnline = () => void recheck()
  const onOffline = () => {
    if (!cancelled) handler(false)
  }
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    cancelled = true
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
