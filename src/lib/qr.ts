import QRCode from 'qrcode'

export async function generateQRDataUrl(sessionCode: string): Promise<string> {
  const url = `${window.location.origin}/client/${sessionCode}`
  return QRCode.toDataURL(url, {
    width: 256,
    margin: 1,
    color: {
      dark: '#00ff41',
      light: '#030a04',
    },
  })
}
