# Paw-Fi Web Application: Comprehensive Developer & AI Onboarding Guide

Welcome to the Paw-Fi project. This document provides an exhaustive, in-depth overview of the entire application architecture, component structure, backend services, and data schemas. It is designed to be a single source of truth for both human developers and AI agents.

## 1. High-Level Overview

Paw-Fi is a financial technology platform designed to make financial education and planning accessible and engaging. It features an AI-powered chat, personalized goal tracking, educational courses, and comprehensive financial health assessments.

The project is a monorepo containing the frontend web application, backend serverless functions, and the database schema.

## 2. Technology Stack

- **Frontend:**
  - **Framework:** React 19 (TypeScript)
  - **Routing:** TanStack Router (`@tanstack/react-router`)
  - **State Management:** Redux Toolkit (`@reduxjs/toolkit`)
  - **Data Fetching & Caching:** TanStack Query (`@tanstack/react-query`)
  - **Styling:** Tailwind CSS with a custom semantic color system. See `tailwind-color-system.md` for a detailed guide.
  - **Build Tool:** Vite

- **Backend:**
  - **Platform:** Supabase
  - **Serverless Functions:** Deno (TypeScript)
  - **Database:** PostgreSQL (managed by Supabase)
  - **AI:** Google Gemini

- **Key Libraries:**
  - `firebase`: Used for select backend services and deployment contexts.
  - `zod`: For strict schema validation in backend functions.
  - `stripe`: For all payment and subscription processing.

**Note on React 19:** This project leverages the React 19 compiler's automatic memoization. The use of `useMemo` and `useCallback` is intentionally minimized and should only be used for specific, justified performance optimizations.

## 3. Exhaustive Project Structure

The project is organized into three primary domains: frontend (`src`), backend (`supabase`), and root configuration.

```
/
├── src/                  # Frontend Application Source Code
├── supabase/             # Backend Services & Database
│   ├── functions/        # Supabase Edge Functions (Backend Logic)
│   └── migrations/       # Database Schema (SQL)
├── package.json          # Dependencies & Scripts
├── tsconfig.json         # TypeScript Configuration
└── vite.config.ts        # Vite Build Configuration
```

---

### 3.1. Frontend Deep Dive (`src/`)

The frontend follows a hybrid feature-based and domain-based structure.

- **`src/app/`**: Main application setup, context providers.
- **`src/assets/`**: Static assets (fonts, images, videos).
- **`src/contexts/`**: Houses all React Contexts.
  - `auth-context.tsx`: Manages user authentication state, session, and profile data throughout the application.
- **`src/data/`**: Contains static data, mock objects, and configurations.
  - `*.json`: Mock data for testing and development.
  - `*.ts`: Static configurations like `pricing-plans.ts` and `goal-type-configs.ts`.
- **`src/lib/`**: Core utility functions, API helpers, and client configurations.
  - `supabase.ts`: Initializes and exports the Supabase client for frontend use.
  - `utils.ts`: General utility functions.
- **`src/store/`**: Redux Toolkit configuration.
  - `index.ts`: Main Redux store setup.
  - `slices/`: Individual state slices for different features.
  - `hooks.ts`: Typed hooks for `useDispatch` and `useSelector`.
- **`src/styles/`**: Global stylesheets.
  - `globals.css`, `app.css`: Base styles and global overrides.
  - `animations.css`: Reusable CSS animations.
- **`src/types/`**: Global TypeScript type definitions.

#### `src/components/` - The UI Core

This is the heart of the frontend, organized by feature.

- **`components/ui/`**: Generic, reusable UI primitives.
  - `button.tsx`, `input.tsx`, `card.tsx`, `modal.tsx`, `select.tsx`, `checkbox.tsx`, `textarea.tsx`, `switch.tsx`, `alert.tsx`, `label.tsx`, `loading-spinner.tsx`, `pie-chart.tsx`, `bar-chart.tsx`, etc. These are the fundamental building blocks of the UI.
- **`components/shared/`**: Components used across multiple features.
  - `ActivityList.tsx`: A component to display a feed of user activities.
- **`components/auth/`**: Authentication-related components.
  - `sign-in-form.tsx`, `sign-up-form.tsx`: User login and registration forms.
  - `ProtectedRouteSubscription.tsx`: A wrapper to protect routes based on the user's subscription status.
- **`components/blogs/`**: Components for the blog feature.
  - `blog-card.tsx`, `featured-blog-card.tsx`, `blog-masonry-grid.tsx`.
- **`components/calculators/`**: UI for the various financial calculators.
  - Each calculator (e.g., `auto-loan-calculator.tsx`, `mortgage.tsx`) has its own component.
- **`components/chat/`**: Core components for the AI chat interface.
  - `financial-educator-chat-interface.tsx`, `financial-advisor-chat-interface.tsx`: Main parent components for the two chat modes.
  - `chat-conversation-display.tsx`: Renders the list of messages.
  - `chat-message-item.tsx`: Renders a single chat bubble.
  - `chat-input.tsx`: The user input area with voice recording capabilities.
  - `chat-suggestions.tsx`: Displays AI-predicted next questions.
- **`components/dashboard/`**: Components for the main user dashboard.
  - `DailyBriefing.tsx`: A summary component for the user.
- **`components/goal-tracker/`**: A major feature area for tracking financial goals.
  - `questionnaire/`: Components for the multi-step goal creation wizard (`QuestionnaireFlow.tsx`, `GoalTypeSelector.tsx`).
  - `goal-overview/`: Components for the main goal listing page (`GoalsGrid.tsx`, `GoalsSummaryStats.tsx`).
  - `goal-detail/`: Components for viewing a single goal (`GoalHeader.tsx`, `MilestonesList.tsx`, `ProgressUpdater.tsx`, `GoalInsights.tsx`).
- **`components/learning/`**: Components for the educational platform.
  - `course-card.tsx`: Displays a single course.
  - `lesson/`: Components for rendering a lesson, including `content-display.tsx`.
  - `question-types/`: A suite of components to render different types of quiz questions (`choice-question.tsx`, `match-question.tsx`, `sort-categories-question.tsx`, etc.).
  - `MermaidRenderer.tsx`: Renders Mermaid.js diagrams for visual aids in lessons.
- **`components/membership/`**: Components for the subscription management page.
  - `MembershipDashboard.tsx`, `PlanSelector.tsx`, `PaymentMethodManager.tsx`, `InvoiceHistory.tsx`.
- **`components/profile/`**: Components for the user's customizable dashboard profile.
  - `DraggableDashboard.tsx`: The main grid layout for user-managed widgets.
  - `EditableWidget.tsx`: A wrapper for widgets that allows editing and removal.
  - `WidgetFactory.tsx`: A component that dynamically renders the correct widget based on its type.
  - `widgets/`: The actual display components for each dashboard widget type.
  - `widget-forms/`: Forms for creating and editing each type of widget.

#### `src/hooks/` - Reusable Logic

- `use-subscription.ts`: Fetches and manages the user's current subscription state.
- `use-payment-method.ts`: Manages user payment methods via Stripe.
- `use-financial-health-profile.ts`: Hook for submitting the financial health quiz and receiving the AI-generated profile.
- `use-gamification.ts`, `useUserStreak.ts`, `useUserTotalXp.ts`: Hooks related to the user's XP, level, and activity streaks.
- `goal-tracker/`: A dedicated directory for hooks related to the goal-tracking feature.
  - `use-goals.ts`: Fetches all of the user's financial goals.
  - `use-goal.ts`: Fetches a single financial goal by its ID.
  - `use-create-goal.ts`: Handles the logic for the multi-step goal creation process.
  - `use-questionnaire-template.ts`: Fetches the appropriate questionnaire template for a given goal type.

#### `src/routes/` - Application Pages

This directory defines the application's pages and URL structure using TanStack Router's file-based routing.

- `__root.tsx`: The root layout of the entire application. It contains the main navigation, header, footer, and the outlet for rendering child routes.
- `index.tsx`: The landing page.
- `dashboard/`: The main authenticated section of the app.
  - `_layout.index.tsx`: A layout specific to the dashboard, containing the sidebar navigation.
  - `tracker/`: The Goal Tracker feature.
    - `index.tsx`: The main overview page showing all goals.
    - `$goalId.tsx`: The detail page for a single goal.
    - `create.tsx`: The page for starting the new goal questionnaire.
  - `learning/`: The educational platform.
    - `index.tsx`: The main learning dashboard.
    - `$courseId/lesson/$lessonId.tsx`: The page for viewing a specific lesson within a course.
  - `user-settings/membership/index.tsx`: The subscription management page.
- `login/`, `register/`: Authentication pages.
- `pricing.tsx`, `terms-of-service.tsx`, etc.: Static marketing and legal pages.

---

### 3.2. Backend Deep Dive (`supabase/`)

#### `supabase/functions/` - Serverless Edge Functions

Each directory is a self-contained Deno function.

- **`ai-goal-generator`**:
  - **Purpose:** Takes user answers from a questionnaire, constructs a prompt for Google Gemini, and generates a structured JSON object containing a personalized financial goal, a detailed strategy, and actionable milestones.
  - **Trigger:** HTTP POST request from the frontend (`use-create-goal.ts` hook).
- **`chat-stream`**:
  - **Purpose:** The primary engine for the AI chat. It receives the user's message and conversation history, fetches the user's financial profile to provide context, selects the appropriate AI persona (educator vs. advisor), and streams a response from Gemini. It can also generate entire educational courses in JSON format based on the conversation.
  - **Trigger:** HTTP POST request from the chat interfaces.
- **`chat_sessions` & `chat_messages`**:
  - **Purpose:** Provide full CRUD (Create, Read, Update, Delete) APIs for managing chat sessions and their associated messages. They handle user authentication to ensure users can only access their own conversations.
  - **Trigger:** HTTP requests from the frontend chat components.
- **`financial-health-profile`**:
  - **Purpose:** Processes a large, detailed financial health quiz. It structures the answers, sends them to Gemini with a specialized prompt, and receives a comprehensive, multi-section financial profile analysis. It then stores this profile in the database.
  - **Trigger:** HTTP POST from the `FinancialHealthQuiz.tsx` component.
- **`goal-insights-generator`**:
  - **Purpose:** An analytics function that runs periodically. It analyzes a user's goal progress against their timeline, calculates if they are on track, and uses Gemini to generate actionable insights, warnings, or celebrations.
  - **Trigger:** Can be triggered by significant progress updates or run on a schedule.
- **`goal-milestone-manager`**:
  - **Purpose:** Provides CRUD operations for the milestones associated with a financial goal. Handles creating, updating, deleting, and reordering milestones.
  - **Trigger:** HTTP POST from the goal detail page.
- **`goal-progress-tracker`**:
  - **Purpose:** Records a new progress update against a goal (e.g., "$100 saved"). It recalculates the goal's completion percentage and `is_on_track` status.
  - **Trigger:** HTTP POST from the `ProgressUpdater.tsx` component.
- **`goal-timeline-manager`**:
  - **Purpose:** Manages adjustments to a goal's timeline, such as extending the target date.
  - **Trigger:** HTTP POST from the `AdjustTimelineModal.tsx` component.
- **Stripe & Payment Functions**:
  - `create-checkout-session`: Creates a new Stripe Checkout session for a user to start a subscription.
  - `get-subscription`: Securely fetches the user's current subscription status from the database.
  - `manage-payment-method`: Provides endpoints to create setup intents for adding new cards and to list/update/detach payment methods.
  - `update-subscription`: Handles plan changes (upgrade/downgrade), cancellations, and resumptions.
  - `verify-payment`: Called after a successful redirect from Stripe Checkout to verify the session and update the user's subscription status in the database.
  - `stripe-webhook`: A critical function that listens for asynchronous events from Stripe (e.g., `invoice.payment_succeeded`, `customer.subscription.deleted`) and updates the database accordingly to keep it in sync with Stripe.
- **`store-course-from-ai`**:
  - **Purpose:** A data-ingestion function. It receives the large, structured JSON for a course generated by `chat-stream` and carefully inserts the course, its lessons, tutorials, and questions into the respective database tables with the correct foreign key relationships.
  - **Trigger:** HTTP POST, typically called by `chat-stream`.
- **`user-activities`**:
  - **Purpose:** A centralized logging endpoint. Various backend functions call this to record significant user actions (e.g., `MILESTONE_COMPLETED`, `GOAL_CREATED`) into a single `user_activities` table for timeline generation and analytics.
  - **Trigger:** Called internally by other backend functions.
- **`verify-and-reward`**:
  - **Purpose:** Handles the gamification logic. When a user completes a lesson, this function is called to verify the completion, prevent duplicate rewards, and increment the user's total XP in the database.
  - **Trigger:** HTTP POST from the learning platform frontend upon lesson completion.

#### `supabase/migrations/` - Database Schema

This directory contains SQL files that define the database schema in an incremental, version-controlled way.

- **Key Tables:**
  - `users`: Stores public user profile information, including `total_xp` and `level`.
  - `subscriptions`: Tracks user subscription status, linked to Stripe customer and subscription IDs.
  - `financial_goals`: The central table for the goal-tracking feature.
  - `goal_milestones`: Individual milestones for each goal.
  - `goal_progress_updates`: A log of all contributions or changes to a goal's progress.
  - `goal_insights`: Stores AI-generated insights about a user's goal progress.
  - `chat_sessions` & `chat_messages`: Stores the entire history of user conversations with the AI.
  - `user_courses`, `user_lessons`, `user_questions`, `user_tutorials`: The set of tables that store the structure and content of the AI-generated educational courses.
  - `user_activities`: A log of all significant user actions, stored in a flexible `JSONB` column.
  - `seo_pages_data`: Stores content for programmatically generated SEO pages.
- **Row-Level Security (RLS):** RLS is enabled on all tables containing user data. Policies are defined in the migration files to ensure users can only access their own data. Backend functions use the `service_role_key` to bypass RLS when necessary.
- **PostgreSQL Functions & Triggers:** The database uses custom SQL functions (e.g., `increment_user_xp`) and triggers to automate logic at the database level, ensuring data integrity.

## 4. Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    - Copy `.env.example` to `.env.local`.
    - Populate `.env.local` with your Supabase URL, anon key, and other required API keys (Stripe, Google Gemini).
3.  **Run Frontend:**
    ```bash
    npm run dev
    ```
4.  **Run Backend:**
    - Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
    - Link your project: `supabase link --project-ref <your-project-id>`
    - Start local functions server: `supabase functions serve`

## 5. Deployment

- **Frontend:** Deployed via a service like Vercel or Netlify connected to the Git repository. The build command is `npm run build`.
- **Supabase Functions:** Deployed via the Supabase CLI: `supabase functions deploy <function-name>`.
- **Database Migrations:** Deployed via the Supabase CLI: `supabase db push`.

---

This guide provides a comprehensive foundation for understanding the Paw-Fi codebase. Welcome to the team!