# Moneko Project - Developer Context & Instructions

This `GEMINI.md` file provides essential context, architectural details, and development guidelines for the Moneko project. It is designed to help AI agents and developers understand the codebase quickly and accurately.

## 1. Project Overview

**Moneko** is a comprehensive financial technology platform designed to democratize financial education and planning. It combines AI-driven guidance with robust financial tools to help users manage their money, track goals, and improve their financial health.

*   **Core Features:**
    *   **AI Chat:** Dual-persona AI (Financial Educator & Advisor) powered by Google Gemini.
    *   **Goal Tracking:** Personalized financial goals with AI-generated strategies and milestones.
    *   **Learning Platform:** Gamified financial courses and lessons.
    *   **Dashboard:** Customizable, widget-based user dashboard.
    *   **Calculators:** Suite of financial calculators (Mortgage, Auto Loan, etc.).
    *   **Subscription:** Membership management via Stripe.

## 2. Technology Stack

### Frontend (Web)
*   **Framework:** **React 19** (TypeScript) using **TanStack Start**.
*   **Build Tool:** **Vite** 7.x.
*   **Routing:** **TanStack Router** (File-based routing in `src/routes`).
*   **State Management:**
    *   **Global:** Redux Toolkit (`@reduxjs/toolkit`).
    *   **Server State:** TanStack Query (`@tanstack/react-query`).
    *   **Auth:** React Context (`AuthContext`).
*   **Styling:** **Tailwind CSS 4** with a custom semantic color system and **Shadcn UI** (Radix Primitives).
*   **Animations:** Framer Motion.
*   **Visualization:** Recharts, Chart.js.

### Backend (Serverless & Database)
*   **Platform:** **Supabase**.
*   **Runtime:** **Deno** (for Supabase Edge Functions).
*   **Database:** **PostgreSQL** (managed by Supabase).
*   **Language:** TypeScript.
*   **AI Engine:** **Google Gemini** (via `@google/genai` SDK).
*   **Payments:** Stripe.

## 3. Project Structure

The codebase is organized into a monorepo-style structure separating the frontend application from backend services.

### Root Directory
*   `package.json`: Frontend dependencies and scripts.
*   `vite.config.ts`: Build configuration.
*   `firebase.json` / `apphosting.yaml`: Firebase hosting configurations.

### `src/` - Frontend Application
*   `src/routes/`: **TanStack Router** file-based routes.
    *   `__root.tsx`: Root layout.
    *   `dashboard/`: Protected application routes.
    *   `index.tsx`: Landing page.
*   `src/components/`:
    *   `ui/`: Reusable UI primitives (Buttons, Inputs, Cards).
    *   `shared/`: Shared business components.
    *   `chat/`: AI Chat interface components.
    *   `goal-tracker/`: Goal creation wizards and trackers.
*   `src/contexts/`: React Context providers (`auth-context.tsx`, `ai-chat-context.tsx`).
*   `src/store/`: Redux store setup and slices.
*   `src/lib/`: Utilities, Supabase client initialization (`supabase.ts`).
*   `src/hooks/`: Custom React hooks (`use-subscription.ts`, `use-goals.ts`).

### `supabase/` - Backend Services
*   `functions/`: **Supabase Edge Functions** (Deno/TypeScript).
    *   `chat-stream/`: Main AI chat logic (streaming Gemini responses).
    *   `ai-goal-generator/`: Generates financial goals/strategies.
    *   `stripe-webhook/`: Handles payment events.
*   `migrations/`: SQL files for database schema changes.
*   `seed.sql`: Initial database seeding data.

## 4. Development Workflow

### Key Commands
*   **Start Development Server:**
    ```bash
    npm run dev
    ```
    *Starts the Vite dev server.*

*   **Build for Production:**
    ```bash
    npm run build
    ```
    *Builds the application using Vite.*

*   **Type Check:**
    ```bash
    npm run typecheck
    ```
    *Runs TypeScript compiler without emitting files.*

*   **Deploy Functions (Dev):**
    ```bash
    npm run deploy:functions:dev
    ```

### Database & Backend
*   **Local Development:** The project uses Supabase for local development.
    ```bash
    supabase start
    supabase functions serve
    ```
*   **Migrations:** Database changes are managed via Supabase migrations (`supabase/migrations/`).

## 5. Coding Conventions

*   **Styling:** Use utility classes (Tailwind) for styling. Avoid CSS modules unless necessary for complex animations. Use the defined semantic colors (e.g., `bg-background`, `text-primary`).
*   **Components:** Prefer functional components with TypeScript interfaces for props.
*   **State:**
    *   Use **TanStack Query** for reading/writing server data (Supabase).
    *   Use **Redux** for complex global client state (e.g., UI state that persists across pages).
    *   Use **Local State** (`useState`) for component-specific interactions.
*   **Routing:** Follow TanStack Router patterns. Create new files in `src/routes` to add pages. Use `createFileRoute` API.
*   **AI Integration:** All AI logic resides in Supabase Edge Functions (`supabase/functions`). The frontend should **never** call the AI APIs directly; it must call the Edge Functions.

## 6. Key Files for Context
*   `src/routes/__root.tsx`: Main application shell and provider setup.
*   `src/lib/supabase.ts`: Supabase client configuration.
*   `src/types/`: Global type definitions (check this for data models).
*   `supabase/config.toml`: Supabase project configuration.
*   `docs/ARCHITECTURE.md`: Detailed system architecture (Consult for deep dives).
