import type { ConnectionQuality, DisplayPayload, Transport, TransportRole } from './types'
import type { Signaling, SignalMessage } from './signaling/types'

interface Peer {
  pc: RTCPeerConnection
  dc: RTCDataChannel | null
  offerSdp?: RTCSessionDescriptionInit
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

// Wait until ICE gathering completes so a single offer/answer bundles all
// candidates (non-trickle). Capped by a timeout so a stalled gather (e.g. an
// unreachable STUN server) can't hang the handshake.
function waitIceComplete(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const finish = () => {
      pc.removeEventListener('icegatheringstatechange', check)
      clearTimeout(timer)
      resolve()
    }
    const check = () => {
      if (pc.iceGatheringState === 'complete') finish()
    }
    const timer = setTimeout(finish, timeoutMs)
    pc.addEventListener('icegatheringstatechange', check)
  })
}

interface WebRTCTransportOptions {
  role: TransportRole
  signaling: Signaling
  /** STUN servers when online (cross-subnet/NAT); empty on a pure LAN. */
  iceServers: RTCIceServer[]
}

// Peer-to-peer transport over WebRTC data channels, star topology:
// - main  = hub, one RTCPeerConnection per client (2–5), it is the offerer.
// - client = spoke, one connection to the main, it answers.
// Payload on the wire is JSON `{ text }`; `{ text: '' }` clears the display.
export class WebRTCTransport implements Transport {
  private role: TransportRole
  private signaling: Signaling
  private iceServers: RTCIceServer[]
  private peers = new Map<string, Peer>()
  private messageHandlers = new Set<(p: DisplayPayload) => void>()
  private qualityHandlers = new Set<(q: ConnectionQuality) => void>()
  private quality: ConnectionQuality = 'connecting'
  private unsub: (() => void) | null = null

  // client-only
  private myId = ''
  private retryTimer: ReturnType<typeof setInterval> | null = null
  private giveupTimer: ReturnType<typeof setTimeout> | null = null

  constructor({ role, signaling, iceServers }: WebRTCTransportOptions) {
    this.role = role
    this.signaling = signaling
    this.iceServers = iceServers
    this.unsub = signaling.onMessage((msg) => this.onSignal(msg))
    if (role === 'client') this.startClientFlow()
  }

  private onSignal(msg: SignalMessage) {
    if (this.role === 'main') {
      if (msg.t === 'join') void this.handleJoin(msg.peer)
      else if (msg.t === 'answer') void this.handleAnswer(msg.peer, msg.sdp)
      else if (msg.t === 'leave') this.handleLeave(msg.peer)
    } else {
      if (msg.t === 'offer') void this.handleOffer(msg.peer, msg.sdp)
    }
  }

  // ---- main (hub) ----

  private async handleJoin(peerId: string) {
    const existing = this.peers.get(peerId)
    if (existing) {
      const open = existing.dc?.readyState === 'open'
      if (open || existing.pc.connectionState === 'connected') return
      // Re-send the stored offer to recover from a dropped broadcast.
      if (existing.offerSdp) this.signaling.send({ t: 'offer', peer: peerId, sdp: existing.offerSdp })
      return
    }
    const pc = new RTCPeerConnection({ iceServers: this.iceServers })
    const entry: Peer = { pc, dc: null }
    this.peers.set(peerId, entry)

    const dc = pc.createDataChannel('display', { ordered: true })
    entry.dc = dc
    this.wireChannel(dc)
    pc.onconnectionstatechange = () => this.recomputeQuality()
    pc.oniceconnectionstatechange = () => this.recomputeQuality()

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await waitIceComplete(pc)
    entry.offerSdp = pc.localDescription ?? offer
    this.signaling.send({ t: 'offer', peer: peerId, sdp: entry.offerSdp })
    this.recomputeQuality()
  }

  private async handleAnswer(peerId: string, sdp: RTCSessionDescriptionInit) {
    const entry = this.peers.get(peerId)
    if (!entry) return
    // Ignore if we already applied a remote answer.
    if (entry.pc.signalingState === 'stable') return
    try {
      await entry.pc.setRemoteDescription(sdp)
    } catch {
      /* stale/duplicate answer */
    }
  }

  private handleLeave(peerId: string) {
    const entry = this.peers.get(peerId)
    if (!entry) return
    try { entry.dc?.close() } catch { /* noop */ }
    try { entry.pc.close() } catch { /* noop */ }
    this.peers.delete(peerId)
    this.recomputeQuality()
  }

  // ---- client (spoke) ----

  private startClientFlow() {
    this.myId = randomId()
    const join = () => this.signaling.send({ t: 'join', peer: this.myId })
    join()
    this.retryTimer = setInterval(() => {
      if (this.hasOpenChannel()) {
        this.stopClientRetry()
        return
      }
      join()
    }, 2000)
    // Give up after a minute of no connection.
    this.giveupTimer = setTimeout(() => {
      this.stopClientRetry()
      if (!this.hasOpenChannel()) this.setQuality('disconnected')
    }, 60000)
  }

  private stopClientRetry() {
    if (this.retryTimer) { clearInterval(this.retryTimer); this.retryTimer = null }
    if (this.giveupTimer) { clearTimeout(this.giveupTimer); this.giveupTimer = null }
  }

  private async handleOffer(peerId: string, sdp: RTCSessionDescriptionInit) {
    if (peerId !== this.myId) return // offer targeted at another client
    const existing = this.peers.get('main')
    if (existing) {
      const st = existing.pc.connectionState
      const open = existing.dc?.readyState === 'open'
      if (open || st === 'connected' || st === 'connecting') return // already handling
      try { existing.pc.close() } catch { /* noop */ }
      this.peers.delete('main')
    }
    const pc = new RTCPeerConnection({ iceServers: this.iceServers })
    const entry: Peer = { pc, dc: null }
    this.peers.set('main', entry)
    pc.ondatachannel = (e) => {
      entry.dc = e.channel
      this.wireChannel(e.channel)
    }
    pc.onconnectionstatechange = () => this.recomputeQuality()
    pc.oniceconnectionstatechange = () => this.recomputeQuality()

    await pc.setRemoteDescription(sdp)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await waitIceComplete(pc)
    this.signaling.send({ t: 'answer', peer: this.myId, sdp: pc.localDescription ?? answer })
  }

  // ---- shared ----

  private wireChannel(dc: RTCDataChannel) {
    dc.onopen = () => {
      if (this.role === 'client') this.stopClientRetry()
      // eslint-disable-next-line no-console
      console.info(`[jumanji] WebRTC data channel open — P2P active (${this.role})`)
      this.recomputeQuality()
    }
    dc.onclose = () => this.recomputeQuality()
    dc.onerror = () => this.recomputeQuality()
    dc.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data)
        this.messageHandlers.forEach((h) => h({ text: String(parsed.text ?? '') }))
      } catch {
        /* ignore malformed frames */
      }
    }
  }

  private hasOpenChannel(): boolean {
    for (const p of this.peers.values()) if (p.dc?.readyState === 'open') return true
    return false
  }

  private recomputeQuality() {
    if (this.hasOpenChannel()) {
      this.setQuality('good')
      return
    }
    const states = [...this.peers.values()].map((p) => p.pc.connectionState)
    if (states.length > 0 && states.every((s) => s === 'failed' || s === 'closed')) {
      this.setQuality('disconnected')
      return
    }
    this.setQuality('connecting')
  }

  private setQuality(q: ConnectionQuality) {
    if (q === this.quality) return
    this.quality = q
    this.qualityHandlers.forEach((h) => h(q))
  }

  /** True when at least one data channel is open (P2P is live). */
  isReady(): boolean {
    return this.hasOpenChannel()
  }

  send(payload: DisplayPayload) {
    const data = JSON.stringify({ text: payload.text })
    for (const p of this.peers.values()) {
      if (p.dc?.readyState === 'open') p.dc.send(data)
    }
  }

  onMessage(handler: (p: DisplayPayload) => void) {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  getQuality() {
    return this.quality
  }

  onQualityChange(handler: (q: ConnectionQuality) => void) {
    this.qualityHandlers.add(handler)
    return () => this.qualityHandlers.delete(handler)
  }

  close() {
    this.stopClientRetry()
    if (this.role === 'client' && this.myId) this.signaling.send({ t: 'leave', peer: this.myId })
    if (this.unsub) this.unsub()
    for (const p of this.peers.values()) {
      try { p.dc?.close() } catch { /* noop */ }
      try { p.pc.close() } catch { /* noop */ }
    }
    this.peers.clear()
    this.messageHandlers.clear()
    this.qualityHandlers.clear()
    this.signaling.close()
  }
}
