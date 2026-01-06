# BootMetrics - Line Dancing Tracking App

## Overview

BootMetrics is a line dancing tracking application that helps users log their dance sessions, maintain a song library, and view statistics about their dancing activity. The app features a calendar-based session management system, a searchable song library with ratings, and a dashboard displaying personalized stats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for page transitions and UI animations
- **Forms**: React Hook Form with Zod validation
- **Calendar**: react-day-picker for interactive calendar component

**Key Design Decisions**:
- Mobile-first design with bottom navigation bar (Home, Calendar, Library)
- Western/cowboy themed UI using Rye display font and Outfit body font
- Warm terracotta color palette with gold accents

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Build Tool**: esbuild for production bundling, Vite for development
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for type-safe request/response validation

**Key Design Decisions**:
- Monorepo structure with `client/`, `server/`, and `shared/` directories
- Shared route definitions enable type-safe API contracts between frontend and backend
- Development uses Vite middleware for HMR; production serves static files from `dist/public`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` contains all table definitions

**Database Tables**:
- `users`: User profile (firstName, lastName, location)
- `songs`: Song library with danceName, songName, rating, and unique publicId
- `sessions`: Dance sessions with date and location
- `session_dances`: Many-to-many junction table linking sessions to songs

**Key Design Decisions**:
- Single-user context (no authentication required)
- Songs have a 6-digit public ID for external reference
- Sessions track multiple dances through the junction table

### API Structure
All routes are defined in `shared/routes.ts` with these endpoints:
- `/api/profile` - GET/PUT for user profile management
- `/api/songs` - CRUD operations for song library
- `/api/sessions` - CRUD operations for dance sessions
- `/api/stats` - GET aggregated statistics

## External Dependencies

### Database
- PostgreSQL (connection via `DATABASE_URL` environment variable)
- connect-pg-simple for session storage

### UI Component Libraries
- Radix UI primitives (dialogs, dropdowns, forms, etc.)
- shadcn/ui components in `client/src/components/ui/`
- Lucide React for icons

### Development Tools
- Vite with React plugin for frontend development
- Replit-specific plugins: runtime error overlay, cartographer, dev banner
- Drizzle Kit for database migrations (`npm run db:push`)

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `react-day-picker` + `date-fns`: Calendar and date handling
- `framer-motion`: Animations
- `zod`: Runtime type validation
- `react-hook-form` + `@hookform/resolvers`: Form handling