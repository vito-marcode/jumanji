# Jumanji

A real-time shared display app. One screen, many controllers.

## Concept

One device is the **Main Screen** — open it on a TV, projector, or laptop for everyone in the room to see. Other devices are **Controllers** — anyone with the session code can join from their phone and control what appears on the screen.

Controllers send content through two modes:

- **Manual** — pick an option directly; it appears on the main screen immediately with a typewriter animation.
- **Random** — roll from a curated pool of options; the main screen reveals the result first while the controller sees a blurred suspense screen, then unblurs after 3 seconds. The surprise lands on the big screen before anyone with a controller knows what was picked.

## Use Cases

- Board game / RPG sessions — roll random encounters, characters, or locations
- Team workshops — pick a random topic, icebreaker, or exercise
- Events and shows — reveal results on a shared screen with suspense
- Any game where one screen is shared and players control it remotely

## How It Works

1. Open the app and tap **"Be the Main"** — a unique 6-character session code and QR code are generated
2. Display the main screen on your shared device (full-screen recommended)
3. Other participants scan the QR code or enter the session code to join as controllers
4. Controllers create **Collections** — named groups of options (e.g. "Dangers", "Characters", "Topics")
5. Select a collection, choose **Manual** or **Random** mode, and send to the screen

## Tech Stack

- **React 18 + TypeScript** — strict mode, functional components only
- **Vite** — dev server and production builds
- **Tailwind CSS** — custom jungle/gold color palettes and animations
- **Supabase** — Postgres database + real-time Change Streams
- **React Router v6** — client-side routing
- **Netlify** — deployment (SPA redirect via `netlify.toml`)

## Setup

### 1. Create a Supabase project

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the Supabase dashboard
3. Paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql) — this creates the 4 tables, RLS policies, and enables real-time on the relevant tables
4. Go to **Settings → API** and copy:
   - **Project URL** → used as `VITE_SUPABASE_URL`
   - **anon / public key** → used as `VITE_SUPABASE_ANON_KEY`

> No authentication is required. The 6-character session code acts as the shared secret, enforced by open RLS policies in the schema.

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install and run

```bash
npm install
npm run dev
```

Other commands:

```bash
npm run build    # TypeScript compile + Vite production build
npm run preview  # Preview production build locally
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `sessions` | Session records with unique 6-character codes |
| `collections` | Named groups of options belonging to a session |
| `options` | Selectable items within a collection |
| `display_messages` | Messages sent to the main display (insert-only, real-time) |
