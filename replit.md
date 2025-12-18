# Ponto Digital - Electronic Time Clock System

## Overview

Ponto Digital is a full-stack employee time-tracking system with facial recognition capabilities. The application allows employees to clock in/out using biometric verification (face matching), manage justifications for pending punches, and provides administrators with tools to manage users and review justifications. The system is designed as a Progressive Web App (PWA) optimized for mobile-first usage.

## Recent Changes (December 2025)

### Admin Features Added
- **Admin Dashboard** (`/admin`) - Overview with statistics: total users, total punches, pending justifications, today's punches
- **User Management** (`/admin/users`) - Full CRUD operations for users with role management (admin, manager, employee)
- **Justification Review** (`/admin/justifications`) - Approve/reject pending justifications with automatic punch status updates
- **CSV Export** - Export punch history as CSV files with UTF-8 BOM for Excel compatibility

### Security Enhancements
- Zod validation schemas for admin routes (`adminUpdateUserSchema`, `reviewJustificationSchema`)
- Idempotency checks to prevent double-review of justifications
- Admin middleware protects all `/api/admin/*` routes
- Audit logging for all admin actions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration for Replit environment
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter (lightweight React router)
- **Form Handling**: React Hook Form with Zod validation
- **Design System**: Material Design 3 adaptation with Inter font family

The frontend follows a component-based architecture with:
- `/client/src/pages/` - Route-level components (login, punch, history, justifications, profile, admin pages)
- `/client/src/components/` - Reusable UI components including camera capture for face enrollment
- `/client/src/lib/` - Utilities, auth context, theme provider, and query client configuration
- `/client/src/hooks/` - Custom React hooks

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with tsx for development execution
- **API Pattern**: RESTful API under `/api/*` routes
- **Authentication**: JWT-based with Bearer token authorization

Key backend modules:
- `/server/routes.ts` - API route definitions
- `/server/auth.ts` - JWT token generation/verification and password hashing (bcryptjs)
- `/server/storage.ts` - Data access layer using repository pattern
- `/server/face-match.ts` - Face embedding generation and matching logic (simulated for demo)
- `/server/db.ts` - Database connection using Drizzle ORM

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `/shared/schema.ts` - Shared between frontend and backend
- **Migrations**: Managed via drizzle-kit (`npm run db:push`)

Database tables:
- `users` - Employee records with face embeddings
- `punches` - Time clock entries with GPS and face match data
- `justifications` - Explanations for pending punches
- `audit_logs` - System action tracking

### Build System
- Custom build script at `/script/build.ts` using esbuild for server bundling
- Vite handles frontend bundling to `/dist/public`
- Server bundle optimizes cold start by bundling key dependencies

## External Dependencies

### Database
- **PostgreSQL** - Primary data store (connection via `DATABASE_URL` environment variable)
- **connect-pg-simple** - Session storage for PostgreSQL

### Authentication & Security
- **jsonwebtoken** - JWT token handling
- **bcryptjs** - Password hashing
- **express-session** - Session management

### UI Components
- **Radix UI** - Headless UI primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui** - Pre-styled component collection built on Radix
- **Lucide React** - Icon library
- **class-variance-authority** - Component variant management

### Data & Forms
- **Zod** - Schema validation (shared between client/server)
- **drizzle-zod** - Zod schema generation from Drizzle tables
- **react-hook-form** - Form state management
- **date-fns** - Date formatting and manipulation

### Development Tools
- **Replit plugins** - Runtime error overlay, cartographer, dev banner (development only)

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT signing secret (defaults to fallback in development)