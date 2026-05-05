# LineUp - Line Dancing Tracking App

## Overview

LineUp is a personal line dancing tracking application that helps dancers log their dance sessions, maintain a song library, and view statistics about their dancing activity. The app features a calendar-based session tracking system, a song library with ratings, a dashboard displaying dance statistics, and a Dancing Buddies social feature.

**Slogan:** "Your Dances. Your Stats." | "Every Dance Counts"

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (cowboy/western theme with warm terracotta colors, higher saturation)
- **Animations**: Framer Motion for page transitions and UI animations
- **Calendar**: react-day-picker for interactive calendar functionality
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API with typed contracts defined in shared/routes.ts
- **Build Process**: Custom build script using esbuild for server bundling and Vite for client

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: shared/schema.ts contains all table definitions and types
- **Migrations**: Drizzle Kit for database migrations (output to /migrations)

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/   # UI components including shadcn/ui
│       ├── hooks/        # Custom React hooks for data fetching
│       ├── pages/        # Page components (Home, Calendar, Library, Profile, Buddies)
│       └── lib/          # Utilities and query client setup
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations layer
│   └── db.ts         # Database connection
├── shared/           # Shared code between client and server
│   ├── schema.ts     # Drizzle schema and types
│   └── routes.ts     # API contract definitions with Zod
└── migrations/       # Database migrations
```

### Key Data Models
- **Users**: User profile with first name, last name, default location, phone number, and avatar (base64)
- **Songs**: Dance library entries with dance name, song name, artist, public ID, and rating (1-5 stars)
- **Sessions**: Dance session records with date and location
- **SessionDances**: Many-to-many relationship linking sessions to songs danced
- **Locations**: Saved locations per user for quick session entry
- **Buddies**: Friend connections between users (pending/accepted/declined)
- **StreakChallenges**: Timed streak contests between two buddies

### API Pattern
The API uses a typed contract pattern where routes are defined in shared/routes.ts with Zod schemas for input validation and response types. This enables type-safe API calls on both client and server.

### Auth
- passport-local strategy with bcryptjs password hashing
- express-session stored in PostgreSQL via connect-pg-simple (`user_sessions` table)
- SESSION_SECRET env var required
- All data routes protected with `requireAuth` middleware using `req.user.id`

### Branding
- App name: **LineUp**
- Primary color: #D85C31 (HSL: 16 68% 52%)
- Accent/gold color: #D7A259 (HSL: 35 61% 60%) — used for subtitles/slogans
- Logo: `LineUp_Short_1777958974669.png` (auth page) and `LineUp_Long_1777958974669.png` (header)
- Global headings (h1-h6) use `text-foreground` (black/dark) — not primary colored

### Spotify Integration
- Backend proxy at `/api/spotify/search` using client credentials flow
- In-memory token cache on server
- SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET secrets required
- SpotifySearch component used in Library song form and SessionDialog quick-add

### SMS / Account Recovery (Twilio)
- Forgot password/username flow via phone number
- Routes: POST /api/auth/forgot-send, POST /api/auth/forgot-reset
- Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER secrets
- Verification codes stored in `verification_codes` table (10-minute expiry, single-use)

### Profile Photo
- Stored as base64 JPEG in `users.avatar` TEXT column
- Client resizes to max 200×200 before upload (JPEG quality 0.75)
- Server enforces 200KB base64 size limit
- Displayed in: Header avatar, Profile page, Buddy cards, Pending requests

### Dancing Buddies Feature
- Search users by username (`/api/users/search`)
- Send/accept/decline buddy requests (`/api/buddies/request`)
- View buddy public stats (total dances, streaks, favorite dance)
- Challenge buddies to streak contests with configurable duration
- Buddies page at `/buddies` with Buddies / Challenges / Find tabs
- Navigation tab added to bottom nav

## External Dependencies

### Database
- PostgreSQL database (connection via DATABASE_URL environment variable)
- connect-pg-simple for session storage

### Core Libraries
- Drizzle ORM for database operations
- Zod for runtime type validation
- Express.js for HTTP server
- TanStack React Query for data fetching and caching

### UI Framework
- Radix UI primitives (comprehensive set including dialogs, dropdowns, tooltips, etc.)
- Tailwind CSS for styling
- class-variance-authority for component variants
- Lucide React for icons

### Date Handling
- date-fns for date manipulation
- react-day-picker for calendar component

### Development Tools
- Vite with React plugin
- Replit-specific plugins for development (runtime error overlay, cartographer)
- TypeScript for type checking
