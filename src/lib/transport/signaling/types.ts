// Signaling carries the WebRTC handshake (SDP offer/answer) between the main
// display and each client, keyed by the 6-char session code. The data channel
// itself is peer-to-peer; signaling is only needed to establish it.
//
// Peer identity: each client generates a random `peer` id. The single main
// display tags every offer with the target client's id and reads the `peer` id
// off each answer to route it back to the right RTCPeerConnection. This keeps
// the 2–5 clients from cross-talking on the shared channel.

export type SignalMessage =
  | { t: 'join'; peer: string }
  | { t: 'offer'; peer: string; sdp: RTCSessionDescriptionInit }
  | { t: 'answer'; peer: string; sdp: RTCSessionDescriptionInit }
  | { t: 'leave'; peer: string }

export interface Signaling {
  send(msg: SignalMessage): void
  onMessage(handler: (msg: SignalMessage) => void): () => void
  close(): void
}
