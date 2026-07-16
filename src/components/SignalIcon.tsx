import type { ConnectionQuality } from '../hooks/useSessionPresence'

export function SignalIcon({ quality }: { quality: ConnectionQuality }) {
  if (quality === 'good') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" viewBox="0 0 18 14" fill="currentColor" className="text-jungle-200">
        <rect x="0" y="11" width="3" height="3" rx="0.5"/>
        <rect x="5" y="8" width="3" height="6" rx="0.5"/>
        <rect x="10" y="5" width="3" height="9" rx="0.5"/>
        <rect x="15" y="1" width="3" height="13" rx="0.5"/>
      </svg>
    )
  }

  // Offline, but a WebRTC peer link is live: half bars, yellow.
  if (quality === 'p2p') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" viewBox="0 0 18 14" fill="none" className="text-jungle-200" role="img" aria-label="Offline — peer-to-peer connection active">
        <rect x="0" y="11" width="3" height="3" rx="0.5" fill="#f5b830"/>
        <rect x="5" y="8" width="3" height="6" rx="0.5" fill="#f5b830"/>
        <rect x="10" y="5" width="3" height="9" rx="0.5" stroke="#f5b830" strokeWidth="1"/>
        <rect x="15" y="1" width="3" height="13" rx="0.5" stroke="#f5b830" strokeWidth="1"/>
      </svg>
    )
  }

  if (quality === 'poor') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="14" viewBox="0 0 18 14" fill="none" className="text-jungle-200">
        <rect x="0" y="11" width="3" height="3" rx="0.5" fill="#f5b830"/>
        <rect x="5" y="8" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1"/>
        <rect x="10" y="5" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1"/>
        <rect x="15" y="1" width="3" height="13" rx="0.5" stroke="currentColor" strokeWidth="1"/>
      </svg>
    )
  }

  // 'disconnected' | 'connecting'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="14" viewBox="0 0 22 14" fill="none" className="text-jungle-200">
      <rect x="0" y="11" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1"/>
      <rect x="5" y="8" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1"/>
      <rect x="10" y="5" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1"/>
      <rect x="15" y="1" width="3" height="13" rx="0.5" stroke="currentColor" strokeWidth="1"/>
      <line x1="1" y1="1" x2="7" y2="7" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="7" y1="1" x2="1" y2="7" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
}
