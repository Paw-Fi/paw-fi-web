# Technology Stack

## Frontend Stack
- **Framework**: React 19 (TypeScript) - Latest React with compiler optimizations
- **Routing**: TanStack Router (`@tanstack/react-router`) - File-based routing system
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`) - Global state management
- **Data Fetching**: TanStack Query (`@tanstack/react-query`) - Server state & caching
- **Styling**: Tailwind CSS v4 - Utility-first CSS with custom design system
- **Build Tool**: Vite - Fast development and optimized production builds
- **UI Components**: Custom component library built on Radix UI primitives
- **Charts**: Chart.js with react-chartjs-2 and Recharts
- **Drag & Drop**: @dnd-kit for dashboard customization
- **Animation**: Framer Motion for smooth interactions

## Backend Stack
- **Platform**: Supabase (hosted PostgreSQL + serverless functions)
- **Runtime**: Deno (TypeScript) for Edge Functions
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with social providers
- **File Storage**: Supabase Storage
- **Real-time**: Supabase real-time subscriptions

## AI & External Services
- **AI Provider**: Google Gemini (`@google/genai`)
- **Payment Processing**: Stripe (`@stripe/stripe-js`)
- **Analytics**: Google Analytics via Google Tag Manager

## Development Tools
- **Type Checking**: TypeScript 5.7+
- **Linting**: ESLint with TypeScript, React Hooks, and Unicorn plugins
- **Formatting**: Prettier with Tailwind plugin
- **Package Manager**: npm
- **Version Control**: Git

## Key Libraries & Utilities
- **Schema Validation**: Zod for runtime type checking
- **Date Handling**: date-fns for date utilities
- **Icons**: Lucide React, FontAwesome, Radix Icons
- **Utilities**: Lodash, class-variance-authority, clsx, tailwind-merge

## Special Notes
- **React 19 Compiler**: Uses automatic memoization, minimal `useMemo`/`useCallback` usage
- **Path Aliases**: Extensive TypeScript path mapping for clean imports
- **Edge Functions**: Serverless backend with Deno runtime
- **Performance**: Compression plugins (gzip/brotli) and optimized builds