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

### Real-time

Uses Supabase Postgres Change Streams with insert subscriptions. The main display subscribes to `display_messages` inserts for the current session.

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
│   └── MessageFeed.tsx
├── hooks/
│   ├── useSession.ts          # Session create/join
│   ├── useCollections.ts      # Collections + options CRUD
│   ├── useDisplayMessages.ts  # Message history + real-time subscription
│   └── useRealtimeChannel.ts  # Generic Supabase realtime hook
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── qr.ts                  # QR code generation
│   └── sessionCode.ts         # Session code generation
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
- Fonts: **Cinzel** and **Cinzel Decorative** throughout (loaded via Google Fonts)
- Custom Tailwind colors: `jungle-{50..950}`, `gold-{100..950}`
- Custom Tailwind animations: `pulse-glow`, `fade-in`, `slide-up`, `typewriter`
- No authentication — anonymous Supabase access
