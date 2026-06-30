# LineUp - Line Dancing Tracking App

LineUp is a personal line dancing tracking app where dancers log sessions, maintain a song library, and view stats.

**Slogan:** "Your Dances. Your Stats." | "Every Dance Counts"

## Run & Operate
- `npm run dev` — starts Express + Vite dev server on port 5000
- Schema changes: run `psql "$DATABASE_URL" -c "ALTER TABLE ..."` (do NOT use `drizzle-kit push` — it will try to drop `user_sessions`)
- Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Supabase dashboard: password reset requires the app URL + `/reset-password` added to Authentication → URL Configuration → Redirect URLs

## Stack
- **Frontend**: React 18 + TypeScript, Vite, Wouter, TanStack Query v5, shadcn/ui, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript ESM
- **Database**: PostgreSQL, Drizzle ORM, drizzle-zod
- **Auth**: Supabase Auth (`@supabase/supabase-js`). Supabase owns credentials (email + password + UUID); login is by username (looked up to its email server-side). Client holds the Supabase session and sends `Authorization: Bearer <access_token>`; server validates the JWT and resolves the local user by `supabase_auth_id`

## Where Things Live
```
client/src/
  pages/        Home, Calendar, Library, Profile, Buddies, AuthPage
  components/   SessionDialog, Header, Navigation, StatCard, SpotifySearch, StyleTag…
  hooks/        use-songs, use-sessions, use-stats, use-buddies, use-danceoffs, use-profile…
  lib/          style-tags.tsx (StyleTag component), queryClient.ts
server/
  routes.ts     All API routes
  storage.ts    All DB operations (DatabaseStorage class)
  db.ts         Drizzle DB connection
shared/
  schema.ts     All table defs, insert schemas, types, STYLE_INFO, STYLE_OPTIONS
```

## Architecture Decisions
- `user_sessions` table is managed by connect-pg-simple, NOT in Drizzle schema — never let drizzle-kit push drop it
- Song `style` column defaults to `'LINE'`; swing songs have style in `['WCS','ECS','CSW','TWO','OTHER']`; `style_custom` holds free-text for OTHER
- `homepage_stats` stored as JSON string in `users.homepage_stats`; null = all stats enabled
- Dance-offs count session_dances on the same calendar day as `started_at::date`; auto-finalize on fetch when expired
- Avatar stored as base64 JPEG in `users.avatar` TEXT; client resizes to 200×200 before upload; server enforces 200KB limit

## Product
- **Home**: Stats dashboard (2×2 grid + stacked), customizable via "Edit Homepage" toggle dialog
- **Calendar**: Log sessions by date, add dances to each session, view history
- **Library**: Two tabs — Line Dance (style=LINE) and Swing (WCS/ECS/CSW/TWO/OTHER) with color-coded style tags
- **Profile**: Edit name/location, avatar upload, saved locations, danger zone, sign out
- **Buddies**: Three tabs — Buddies leaderboard (ranked by song count), Challenges (h2h + showdown dance-offs with live countdown), Find (search by username)
- **Session Dialog**: Line/Swing toggle to filter songs; inline quick-add for new line dance songs

## Branding
- Primary: `#D85C31` (HSL 16 72% 50%) — terracotta
- Accent/gold: `#D7A259` (HSL 35 70% 57%) — subtitles/slogans
- Style tag colors: LINE #895232 · WCS #3B82F6 · ECS #EC4899 · CSW #D85C31 · TWO #9512C9 · OTHER #22C55E
- Fonts: Rye (display/headings), Outfit (body)
- Logo: `LineUp_Short_*.png` (auth), `LineUp_Long_*.png` (header)
- Header only shown on dashboard (`/`) route

## Gotchas
- Never run `drizzle-kit push` without checking for `user_sessions` drop warning
- TanStack Query v5: object form only — `useQuery({ queryKey, queryFn })`
- `style` and `styleCustom` fields must be included in `getSessions`/`getSession` song selects in storage.ts
- Dance-off join codes are 6-char uppercase alphanumeric; stored uppercase; compared case-insensitively
