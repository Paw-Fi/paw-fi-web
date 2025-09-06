# Component Dependency Mapping & Import Analysis

## Import Pattern Analysis

### External Dependencies Breakdown

#### Core React Ecosystem
- **React 19**: Latest React with automatic memoization
- **React DOM**: Client-side rendering with hydration
- **React Router**: Via TanStack Router for type-safe routing

#### TanStack Ecosystem Integration
- **@tanstack/react-router**: File-based routing with type safety
- **@tanstack/react-query**: Server state management with caching
- **@tanstack/react-start**: Full-stack React framework
- **@tanstack/router-plugin**: Build-time router optimizations

#### UI & Styling Framework
- **@radix-ui/***: Headless UI component primitives
  - `react-slot`, `react-accordion`, `react-dialog`, etc.
  - Accessibility-first component foundation
  - Compound component patterns
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility
- **tailwind-merge**: Tailwind class deduplication

#### State Management Stack
- **@reduxjs/toolkit**: Modern Redux with TypeScript
- **react-redux**: React Redux bindings
- **@supabase/supabase-js**: Database and auth client

#### Animation & Interaction
- **framer-motion**: Animation library with performance optimizations
- **@dnd-kit/***: Drag and drop functionality
- **lottie-react**: Lottie animation integration

### Internal Import Patterns

#### Path Alias Usage Analysis
```typescript
// Most common import patterns:
import { Component } from '@/components/ui/component'
import { useHook } from '@/hooks/use-hook'
import type { Type } from '@/types/type-definitions'
import { utility } from '@/lib/utils'
import { data } from '@/data/mock-data'
```

#### Component Composition Chains

#### UI Component Inheritance Tree
```
Button (base)
├── MonekoButtton (customized)
├── LoadingButton (with spinner)
└── IconButton (with icon support)

Card (base)
├── GoalCard (goal-specific)
├── LessonCard (learning-specific)
└── WidgetCard (dashboard-specific)

Input (base)
├── NumberInput (numeric validation)
├── MonkeInput (branded styling)
└── AISearchInput (with suggestions)
```

## Feature Component Dependency Analysis

### Goal Tracker Dependencies
```typescript
// GoalDetailSkeleton component imports:
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

// Typical goal component dependency chain:
GoalHeader → GoalCard → Card → Radix primitives
         ↳ Button → buttonVariants (CVA) → cn (utils)
         ↳ Progress → progressVariants → Tailwind classes
```

### Learning Platform Dependencies
```typescript
// Lesson content rendering chain:
ContentDisplay → MermaidRenderer → mermaid library
             ↳ MarkdownRenderer → react-markdown
             ↳ QuestionTypes → DragDrop (@dnd-kit)
             ↳ ProgressBar → UI primitives
```

### Chat System Dependencies
```typescript
// Chat interface dependency tree:
ChatInterface → ConversationDisplay → MessageItem → Avatar
            ↳ ChatInput → VoiceRecorder → WebRTC APIs
            ↳ Suggestions → Button array → UI primitives
            ↳ StreamingText → TypewriterText → Framer Motion
```

## State Integration Patterns

### Redux Integration Points
```typescript
// Components that connect to Redux:
DraggableDashboard → useAppSelector (dashboard.data)
                 ↳ useAppDispatch (dashboard actions)
                 ↳ DashboardWidget → WidgetFactory
                 ↳ EditableWidget → Modal → Form controls
```

### TanStack Query Integration
```typescript
// Server state components:
GoalsGrid → useGoals hook → TanStack Query
        ↳ GoalCard → Goal data → Real-time subscriptions
        ↳ LoadingStates → Skeleton components

LessonList → useLessons → Query with pagination
         ↳ LessonCard → useLesson (individual)
         ↳ ProgressSync → Mutation hooks
```

### Context Usage Patterns
```typescript
// Auth context propagation:
ProtectedRoute → useAuth → AuthContext
             ↳ User data → Component props
             ↳ Loading states → Skeleton UI
             ↳ Error states → Error boundaries
```

## External Service Integrations

### Supabase Integration Points
```typescript
// Database integration:
supabase.from('table') → Type-safe queries
                     ↳ Real-time subscriptions
                     ↳ Row Level Security
                     ↳ Edge Functions
```

### Third-Party Component Dependencies

#### FontAwesome Integration
```typescript
// Icon usage patterns:
import { faIcon } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// Used throughout:
Button → FontAwesome icons
Navigation → Social media icons
Status indicators → State icons
```

#### Chart Libraries
```typescript
// Chart.js integration:
import { Chart as ChartJS } from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

// Recharts integration:
import { BarChart, LineChart, PieChart } from 'recharts'

// Usage in:
FinancialWidgets → Chart components
Calculator results → Visual representations
Progress displays → Progress charts
```

## Asset Integration Patterns

### Image Asset Management
```typescript
// Static imports:
import logoSvg from '@/assets/images/logo.svg'
import backgroundPng from '@/assets/images/bg.png'

// Dynamic loading:
<OptimizedImage src="/assets/images/dynamic.jpg" />
```

### Video & Animation Assets
```typescript
// Lottie animations:
import animationData from '@/assets/videos/animation.json'
<Lottie animationData={animationData} />

// Video components:
<video src="/assets/videos/demo.mp4" />
```

## Performance Optimization Dependencies

### Code Splitting Points
```typescript
// Route-level splitting:
const LazyComponent = lazy(() => import('./Component'))

// Component-level splitting:
const ExpensiveComponent = lazy(() => 
  import('./ExpensiveComponent').then(mod => ({
    default: mod.ExpensiveComponent
  }))
)
```

### Bundle Analysis
```typescript
// Heavy dependencies:
- framer-motion: Animation library (~100KB)
- @dnd-kit: Drag and drop (~50KB)  
- chart.js: Charting library (~200KB)
- mermaid: Diagram rendering (~300KB)
- lottie-react: Animation player (~80KB)

// Optimization strategies:
- Dynamic imports for heavy components
- Tree shaking for unused utilities
- Code splitting at route boundaries
- Lazy loading for non-critical features
```

## Cross-Feature Dependencies

### Shared Component Usage
```typescript
// Components used across features:
Button → Used in 50+ components
Card → Used in 30+ components
Modal → Used in 20+ components
LoadingSpinner → Used in 25+ components
```

### Hook Reusability
```typescript
// Hooks used across features:
useAuth → Authentication throughout app
useDebounce → Search and input components
useDeviceType → Responsive behavior
useLocalStorage → Persistence across features
```

### Utility Function Spreading
```typescript
// Most imported utilities:
cn() → Class name merging (100+ usages)
seo() → SEO metadata (20+ pages)
formatDate() → Date display (50+ components)
```

This dependency mapping reveals a well-architected application with:
1. **Clear separation of concerns**
2. **Reusable component patterns**  
3. **Optimized bundle structure**
4. **Type-safe integration points**
5. **Performance-conscious import strategies**