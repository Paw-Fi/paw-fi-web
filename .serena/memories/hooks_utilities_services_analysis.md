# Hooks, Utilities & Services Deep Analysis

## Custom Hooks Architecture

### Core Hooks Categories

#### Authentication & User Management
- **`use-subscription.ts`**: Stripe subscription state management
  - Fetches current subscription status
  - Handles subscription updates and cancellations
  - Integrates with payment method management

- **`use-payment-method.ts`**: Payment processing hooks
  - Stripe payment method CRUD operations
  - Setup intent creation for new payment methods
  - Payment method validation and error handling

#### Dashboard & UI State
- **`useDashboardData.ts`**: Dashboard data management
  - Fetches and manages widget configurations
  - Handles dashboard state synchronization
  - Integrates with Redux dashboard slice

- **`useDashboardGuidance.ts`**: User guidance system
  - Manages onboarding flow state
  - Contextual help and tooltips
  - Progress tracking through app features

- **`use-device-type.ts`**: Responsive design utilities
  - Device detection (mobile, tablet, desktop)
  - Viewport width monitoring
  - Conditional rendering based on device capabilities

#### Financial Features
- **`use-financial-health-profile.ts`**: Financial assessment
  - Manages financial health quiz state
  - Processes quiz responses
  - Generates AI-powered financial profiles

- **`use-gamification.ts`**: Achievement system
  - XP and level calculation
  - Badge unlock logic
  - Progress tracking across features

- **`useUserTotalXp.ts`** & **`useUserStreak.ts`**: Engagement metrics
  - User activity tracking
  - Streak calculation and maintenance
  - Achievement progress monitoring

#### Goal Tracker Hooks (`src/hooks/goal-tracker/`)
- **`use-goals.ts`**: Goal CRUD operations
  - Fetches all user goals with caching
  - Real-time updates via Supabase subscriptions
  - Goal filtering and sorting

- **`use-goal.ts`**: Individual goal management
  - Single goal data fetching
  - Goal update operations
  - Milestone and progress tracking

- **`use-create-goal.ts`**: Goal creation workflow
  - Multi-step goal creation process
  - Form state management
  - AI integration for goal generation

- **`use-questionnaire-template.ts`**: Dynamic form generation
  - Template-based questionnaire loading
  - Form validation rules
  - Conditional question logic

#### Learning Platform Hooks
- **`useCompletedLessons.ts`**: Learning progress tracking
  - Lesson completion state
  - Progress calculation across courses
  - Certificate and achievement unlocking

- **`use-local-progress.ts`**: Offline progress management
  - Local storage for lesson progress
  - Sync with server when online
  - Conflict resolution for progress data

#### Utility Hooks
- **`use-voice-recorder.ts`**: Audio recording functionality
  - WebRTC audio capture
  - Audio processing and compression
  - Voice-to-text integration

- **`use-debounce.ts`**: Performance optimization
  - Input debouncing for search
  - API call rate limiting
  - UI responsiveness improvement

- **`use-prefers-reduced-motion.ts`**: Accessibility
  - System preference detection
  - Animation control based on user preferences
  - Performance optimization for motion-sensitive users

## Utility Functions Analysis

### Core Utilities (`src/lib/utils.ts`)
- **`cn()` Function**: Class name merging utility
  - Combines `clsx` and `tailwind-merge`
  - Handles conditional classes
  - Tailwind class deduplication

### Specialized Utilities

#### SEO & Performance (`src/utils/`)
- **`seo.ts`**: SEO metadata generation
  - Structured data creation
  - Meta tag standardization
  - OpenGraph and Twitter card generation

- **`canonical.ts`**: URL canonicalization
  - Consistent URL generation
  - Redirect map management
  - SEO-friendly URL structure

#### Data Management
- **`date-utils.ts`**: Date manipulation utilities
  - Financial date calculations
  - Timezone handling
  - Date formatting for UI

- **`storage.ts`**: Local storage abstraction
  - Type-safe storage operations
  - JSON serialization handling
  - Storage quota management

- **`sanitize-course.ts`**: Content sanitization
  - AI-generated content cleaning
  - XSS prevention
  - Content validation

#### Dashboard & UI
- **`dashboard-guidance-monitor.ts`**: User guidance system
  - Context-aware help system
  - User interaction tracking
  - Guidance trigger logic

- **`smart-content-extractor.ts`**: Content processing
  - AI content parsing
  - Metadata extraction
  - Content structure analysis

### Animation & Performance (`src/lib/`)
- **`motion-variants.ts`**: Framer Motion configurations
  - Reusable animation presets
  - Performance-optimized transitions
  - Mobile-aware animation settings

- **`disable-framer-motion-mobile.ts`**: Performance optimization
  - Conditional animation disabling
  - Mobile-specific optimizations
  - Battery life preservation

## Services Architecture

### API Services (`src/services/`)

#### Course Management (`course-service.ts`)
- **AI Course Generation**: 
  - Interfaces with backend AI functions
  - Course structure validation
  - Content processing and storage

#### Conversation Management (`conversation-service.ts`)
- **Chat Session Management**:
  - Message history CRUD
  - Session persistence
  - Context management for AI responses

#### SEO Management (`pseo-service.ts`)
- **Programmatic SEO**:
  - Dynamic page generation
  - SEO metadata management
  - Content optimization

### API Integration (`src/lib/api/`)

#### Dashboard API (`dashboard.ts`)
- **Dashboard Operations**:
  - Widget CRUD operations
  - Dashboard view management
  - Template system integration
  - Real-time sync with database

### Supabase Integration (`src/lib/supabase.ts`)
- **Client Configuration**: 
  - Environment-based configuration
  - Authentication integration
  - Real-time subscription setup

## Integration Patterns

### State Management Integration
1. **Redux Hooks**: Custom typed hooks for Redux state
2. **Server State**: TanStack Query integration
3. **Local State**: React hooks with TypeScript
4. **Form State**: React Hook Form integration

### API Integration Patterns
1. **Error Handling**: Consistent error processing
2. **Loading States**: Unified loading state management
3. **Caching Strategy**: Intelligent cache invalidation
4. **Real-time Updates**: Supabase subscription management

### Performance Patterns
1. **Lazy Loading**: Component and data lazy loading
2. **Debouncing**: Input and API call optimization
3. **Memoization**: Strategic caching of expensive calculations
4. **Code Splitting**: Feature-based bundle splitting

### Security & Validation
1. **Input Sanitization**: XSS and injection prevention
2. **Type Validation**: Runtime type checking with Zod
3. **Authentication**: JWT token management
4. **Permission Checks**: Role-based access control

## Hook Composition Patterns

### Common Compositions
1. **Data + UI State**: Combining server state with local UI state
2. **Form + Validation**: Complex form handling with validation
3. **Real-time + Cache**: Live updates with caching strategy
4. **Auth + Permissions**: Authentication with role-based features

### Advanced Patterns
1. **Hook Chains**: Dependent hook execution
2. **Conditional Hooks**: Dynamic hook activation
3. **Error Recovery**: Automatic retry and fallback mechanisms
4. **State Synchronization**: Multi-source state coordination