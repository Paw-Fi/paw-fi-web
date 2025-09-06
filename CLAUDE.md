# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Moneko** is a personal finance education and budgeting platform built with TanStack Start, React 19, TypeScript, and Supabase. The application provides financial calculators, interactive learning experiences, AI chat functionality, and comprehensive dashboard tools.

## Development Commands

```bash
# Development
npm run dev              # Start development server (http://localhost:3000)
npm run build           # Build for production
npm run build:sitemap  # Generate sitemap
npm start              # Start production server

# No dedicated test, lint, or typecheck commands are configured
```

## Architecture Overview

### Core Technologies
- **Framework**: TanStack Start (React-based full-stack)
- **Routing**: TanStack Router (file-based routing in `/src/routes/`)
- **State Management**: Redux Toolkit + React Query
- **Backend**: Supabase (PostgreSQL with real-time subscriptions)
- **Styling**: Tailwind CSS with custom color scheme
- **Build Tool**: Vite

### Key Directories
- `/src/routes/` - File-based routing structure
- `/src/components/` - Reusable React components organized by feature
- `/src/lib/` - Utility libraries including Supabase client
- `/src/store/` - Redux store configuration
- `/src/hooks/` - Custom React hooks
- `/src/contexts/` - React contexts (authentication)
- `/src/types/` - TypeScript type definitions
- `/supabase/` - Database functions, migrations, and configuration
- `/functions/` - Firebase Cloud Functions

### Path Aliases
The project uses extensive TypeScript path aliases defined in `tsconfig.json`:
- `@/` → `./src/`
- `@components/` → `./src/components/`
- `@types/` → `./src/types/`
- `@lib/` → `./src/lib/`
- `@hooks/` → `./src/hooks/`
- `@store/` → `./src/store/`

### Core Features
1. **Financial Calculators** - Compound, mortgage, retirement, auto-loan, investment, saving goals
2. **Learning Platform** - Courses and lessons with progress tracking
3. **Dashboard** - Customizable widgets with drag-and-drop functionality
4. **AI Chat Interface** - Financial advisor and educator powered by OpenAI
5. **Blog System** - SEO-optimized content management
6. **User Authentication** - Supabase auth with subscription management
7. **Payment Processing** - Stripe integration for premium features

### Database Architecture
- **Supabase PostgreSQL** backend with real-time subscriptions
- **Row Level Security (RLS)** policies for data protection
- **Custom PostgreSQL functions** in `/supabase/functions/`
- **Database migrations** managed through Supabase CLI

### State Management Pattern
- **Redux Toolkit** for global state (user preferences, theme, navigation)
- **React Query** for server state and caching
- **React Context** for authentication state
- **Local state** with useState/useReducer for component-specific state

### Styling Conventions
- **Tailwind CSS** with custom color scheme and typography
- **Component-scoped styles** using CSS modules where needed
- **Responsive design** with mobile-first approach
- **Dark/light theme support** through CSS custom properties

### API Integration
- **Supabase client** configured in `/src/lib/supabase.ts`
- **API routes** in `/src/app/api/` for server-side functionality
- **React Query** for data fetching with caching and optimistic updates
- **Real-time subscriptions** for live data updates

### Code Organization Patterns
- **Feature-based component organization** in `/src/components/`
- **Custom hooks** for reusable logic in `/src/hooks/`
- **Type definitions** centralized in `/src/types/`
- **Utility functions** in `/src/lib/utils/`
- **Constants and configuration** in dedicated files

### Development Notes
- **No formal testing framework** is currently configured
- **ESLint** configured with TypeScript and React rules
- **Vite dev server** runs on port 3000 with hot reload
- **TanStack Router and Query devtools** available in development
- **Firebase hosting** for production deployment

## IMPORTANT
Always use:
- serena for semantic code retrieval and editing tools
- context7 for up to date documentation on third party code
- sequential thinking for any decision making
- detailed project guideline at `/README.md`