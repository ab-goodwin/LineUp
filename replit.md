# BootMetrics - Line Dancing Tracking App

## Overview

BootMetrics is a personal line dancing tracking application that helps dancers log their dance sessions, maintain a song library, and view statistics about their dancing activity. The app features a calendar-based session tracking system, a song library with ratings, and a dashboard displaying dance statistics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (cowboy/western theme with warm terracotta colors)
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
│       ├── pages/        # Page components (Home, Calendar, Library, Profile)
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
- **Users**: User profile with first name, last name, and default location
- **Songs**: Dance library entries with dance name, song name, public ID, and rating (1-5 stars)
- **Sessions**: Dance session records with date and location
- **SessionDances**: Many-to-many relationship linking sessions to songs danced

### API Pattern
The API uses a typed contract pattern where routes are defined in shared/routes.ts with Zod schemas for input validation and response types. This enables type-safe API calls on both client and server.

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