# Jumanji

A multi-device, real-time collaborative web app. A main display screen and client devices communicate in real-time through Supabase. Clients select options and send them to the main display, which renders them with a jungle-themed typewriter effect.

## Tech Stack

- **React 18** + **TypeScript** (strict mode)
- **Vite** — dev server and production builds
- **Tailwind CSS** — custom `jungle-*` and `gold-*` color palettes, custom glow animations
- **Supabase** — Postgres database + real-time Postgres Change Streams
- **React Router v6** — client-side routing
- **Deployed on Netlify** (SPA redirect via `netlify.toml`)

## Dev Commands

```bash
npm run dev       # Start dev server (hot reload)
npm run build     # TypeScript compile + Vite production build
npm run preview   # Preview production build locally
```

## Environment Setup

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=<supabase_project_url>
VITE_SUPABASE_ANON_KEY=<supabase_anonymous_key>
```

## Architecture

### Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Landing.tsx` | Create or join a session |
| `/main/:sessionCode` | `MainDisplay.tsx` | Full-screen display (shows incoming messages) |
| `/client/:sessionCode` | `ClientDevice.tsx` | Client device (browses collections, sends selections) |

### Database Tables (Supabase)

- `sessions` — session records with unique 6-character codes
- `collections` — groups of options belonging to a session
- `options` — selectable items within a collection
- `display_messages` — messages sent to the main display (insert-only, real-time)

### Real-time & Transport layer

Cross-device messaging goes through a **transport abstraction** (`src/lib/transport/`) so the UI never talks to a specific backend. The only payload that crosses devices is `{ text: string }` (`text === ''` = clear the display); collections/options and message history stay Supabase-local.

- `Transport` interface (`transport/types.ts`) — `send`, `onMessage`, `getQuality`, `onQualityChange`, `close`.
- `SupabaseTransport` — the cloud path: INSERT into `display_messages` + `postgres_changes` INSERT subscription; quality from the `heartbeat-<CODE>` channel.
- `WebRTCTransport` — peer-to-peer over the LAN, **star topology** (main = hub with one `RTCPeerConnection` per client, 2–5 clients; clients = spokes). Non-trickle ICE; STUN when online, none on a pure LAN.
- `SupabaseSignaling` — WebRTC signaling via Supabase Realtime **Broadcast** on `signal-<CODE>` (offer/answer routed per client `peer` id).
- `OrchestratedTransport` — composes both: pairs over signaling while online, **prefers P2P once a data channel is open**, and falls back to Supabase otherwise. An established P2P link **survives an internet drop**.

**Reconnection:** the main broadcasts a `hello` on startup so already-open clients re-join immediately (covers a main reload/restart); clients also re-join automatically when their data channel closes or the connection fails. `TransportProvider` rebuilds the transport when connectivity returns after an offline start (never on going offline — that would tear down a live P2P link). A **full offline cold start can't re-pair** on a camera-less main: establishing WebRTC needs signaling, and offline there's no signaling channel (Supabase needs internet; QR needs a camera). Once connectivity returns, pairing happens automatically.

`TransportProvider` / `useTransport` (`hooks/useTransport.tsx`) probe connectivity, resolve the session (online: Supabase lookup by code → UUID; offline: use the code directly, no redirect), and build the transport. `useDisplayMessages` and `useSessionPresence` read the transport from context.

**Offline limitation:** the main display is a camera-less screen (TV/projector), so pairing *from scratch* with no internet isn't possible in a browser (no channel to return the WebRTC answer). Pair while connectivity exists; the link then keeps working offline. `ConnectionBanner` surfaces this when the app loads offline.

### PWA

`vite-plugin-pwa` (Workbox) generates the service worker + manifest. App shell, self-hosted fonts (`@fontsource/*`, imported in `main.tsx`) and icons are precached for offline loading; Supabase requests are network-only. Icons + manifest are configured in `vite.config.ts`; `netlify.toml` sets `no-cache` on `sw.js`/manifest and `immutable` on hashed assets.

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable primitives: Button, Card, Input, Modal, Spinner
│   ├── CollectionCard.tsx
│   ├── QRCodeDisplay.tsx
│   ├── SelectionModePanel.tsx
│   ├── SessionCodeBadge.tsx
│   ├── TypewriterText.tsx
│   ├── ConnectionBanner.tsx   # Offline notice (shown when app loads with no internet)
│   └── MessageFeed.tsx
├── hooks/
│   ├── useSession.ts          # Session create/join
│   ├── useCollections.ts      # Collections + options CRUD
│   ├── useTransport.tsx       # TransportProvider + connectivity/session resolution
│   ├── useDisplayMessages.ts  # Message send/receive via the transport
│   ├── useSessionPresence.ts  # Connection quality via the transport
│   └── useRealtimeChannel.ts  # Generic Supabase realtime hook
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── net.ts                 # Connectivity probe (isInternetReachable)
│   ├── qr.ts                  # QR code generation
│   ├── sessionCode.ts         # Session code generation
│   └── transport/             # Transport abstraction (Supabase + WebRTC P2P)
│       ├── types.ts
│       ├── SupabaseTransport.ts
│       ├── WebRTCTransport.ts
│       ├── OrchestratedTransport.ts
│       └── signaling/         # WebRTC signaling (Supabase Broadcast)
├── pages/
│   ├── Landing.tsx
│   ├── MainDisplay.tsx
│   └── ClientDevice.tsx
├── types/
│   └── index.ts               # Shared TypeScript interfaces
└── styles/
    └── globals.css            # Tailwind directives + custom utilities
```

## Code Conventions

- Functional components only; all data/state logic lives in custom hooks
- Tailwind utility classes for all styling — no CSS modules or inline styles
- Fonts: **Cinzel**, **Cinzel Decorative**, **Forum** (self-hosted via `@fontsource/*`, imported in `src/main.tsx` — no CDN, so they work offline) + **Grobold** (self-hosted via `public/GROBOLD.ttf`, `@font-face` in `globals.css`)
- Custom Tailwind colors: `jungle-{50..950}`, `gold-{100..950}`
- Custom Tailwind animations: `pulse-glow`, `fade-in`, `slide-up`, `typewriter`, `materialize`
- No authentication — anonymous Supabase access

## MainDisplay UX Features

- **Floating header** — centered card overlay; click/touch outside to dismiss
- **Hide & reveal** — header hides on outside tap; tap inside the circle to show the "▼ show" button (3s auto-hide); a hint appears briefly inside the circle after dismissal
- **Animation speed** — 5 presets (Mystic → Frenzy) controlling both `charDelay` and `animDuration` on `TypewriterText`; persisted to `localStorage`
- **Circle size** — slider 50–150%, persisted to `localStorage`; also adjustable via pinch gesture (touch) or trackpad pinch (Mac: wheel+ctrlKey for Chrome, gesturechange for Safari)
- **Fullscreen** — `⛶ full` button in header; double-tap circle to enter; single tap in fullscreen shows SVG exit button at bottom-right of text area for 3s
- **Glass dome effect** — subtle layered radial gradients inside the circle simulating dark curved glass
- **Font sizing** — `calcFontSize()` binary-searches the largest font that fits the inscribed square; measures the longest individual word to prevent overflow (words render `whitespace-nowrap` in `TypewriterText`)
