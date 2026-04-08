import { useEffect, useState } from 'react'
import { generateQRDataUrl } from '../lib/qr'

interface QRCodeDisplayProps {
  sessionCode: string
}

export function QRCodeDisplay({ sessionCode }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    generateQRDataUrl(sessionCode).then(setDataUrl)
  }, [sessionCode])

  if (!dataUrl) return <div className="w-32 h-32 bg-jungle-800 rounded animate-pulse" />

  return (
    <div className="p-2 bg-jungle-950 border border-jungle-400 border-glow-green rounded-lg inline-block">
      <img src={dataUrl} alt={`QR code for session ${sessionCode}`} className="w-32 h-32 rounded" />
    </div>
  )
}
