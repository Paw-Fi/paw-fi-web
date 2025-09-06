# Codebase Structure

## Root Structure
```
/
├── src/                    # Frontend Application Source
├── supabase/              # Backend Services & Database
│   ├── functions/         # Edge Functions (Deno/TypeScript)
│   └── migrations/        # Database Schema (SQL)
├── public/                # Static assets
├── functions/             # Firebase Cloud Functions (legacy)
├── scripts/               # Build and deployment scripts
└── [config files]         # Various configuration files
```

## Frontend Structure (`src/`)

### Core Directories
- **`app/`**: Application setup and providers
- **`routes/`**: TanStack Router file-based routing structure
- **`components/`**: All React components organized by feature
- **`hooks/`**: Custom React hooks for reusable logic
- **`contexts/`**: React Context providers (auth, chat, etc.)
- **`store/`**: Redux Toolkit configuration and slices
- **`lib/`**: Core utilities, API helpers, client configurations
- **`types/`**: Global TypeScript type definitions
- **`data/`**: Static data, mock objects, configurations
- **`styles/`**: Global stylesheets and animations
- **`assets/`**: Static assets (fonts, images, videos)

### Component Architecture (`src/components/`)
- **`ui/`**: Generic, reusable UI primitives (button, input, card, modal, etc.)
- **`shared/`**: Components used across multiple features
- **`auth/`**: Authentication forms and protected route wrappers
- **`chat/`**: AI chat interface components
- **`calculators/`**: Financial calculator components by type
- **`goal-tracker/`**: Goal tracking feature components
- **`learning/`**: Educational platform components
- **`dashboard/`**: Main dashboard components
- **`profile/`**: Customizable dashboard and widget system
- **`membership/`**: Subscription management components
- **`blogs/`**: Blog feature components

### Routing Structure (`src/routes/`)
- **`__root.tsx`**: Root layout with navigation
- **`index.tsx`**: Landing page
- **`dashboard/`**: Main authenticated section
  - **`_layout.index.tsx`**: Dashboard-specific layout
  - **`tracker/`**: Goal tracker pages
  - **`learning/`**: Educational platform pages
  - **`user-settings/`**: User account management
- **`auth/`**: Authentication pages (login, register, confirm)
- **`calculators/`**: Financial calculator pages
- **Static pages**: pricing, terms, privacy, etc.

## Backend Structure (`supabase/`)

### Edge Functions (`supabase/functions/`)
Each directory is a self-contained Deno function:
- **`ai-goal-generator`**: AI-powered goal creation
- **`chat-stream`**: Main AI chat engine
- **`financial-health-profile`**: Financial assessment processing
- **Payment functions**: Stripe integration (checkout, webhooks, subscription management)
- **Goal management**: CRUD operations for goals, milestones, progress
- **Course management**: AI-generated course storage and management

### Database (`supabase/migrations/`)
- **Schema definitions**: SQL files for incremental database changes
- **RLS Policies**: Row-level security for data protection
- **Custom Functions**: PostgreSQL functions for business logic
- **Triggers**: Automated database operations

## Key Architecture Patterns
- **Feature-based organization**: Components grouped by business domain
- **Separation of concerns**: UI, business logic, and data layers clearly separated
- **Path aliases**: Clean import paths using TypeScript path mapping
- **Type safety**: Comprehensive TypeScript coverage throughout
- **Component composition**: Reusable UI primitives composed into features
- **Hook-based logic**: Custom hooks for reusable business logic