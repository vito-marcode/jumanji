import { useTransport } from '../hooks/useTransport'
import { useSessionPresence } from '../hooks/useSessionPresence'

// Shown when there's no internet AND no live peer link. On a camera-less main
// display, pairing from scratch offline isn't possible in a browser — but once a
// peer link is established it survives an internet drop, in which case the P2P
// signal icon says it all and this banner stays hidden.
export function ConnectionBanner() {
  const { online } = useTransport()
  const quality = useSessionPresence()
  if (online !== false || quality === 'p2p' || quality === 'good') return null
  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-gold-950/90 border-b border-gold-700 text-gold-200 text-xs sm:text-sm font-cinzel text-center px-4 py-2 backdrop-blur-sm">
      ⚠ Offline — pairing needs an initial connection. Once paired, the link keeps working without internet.
    </div>
  )
}
