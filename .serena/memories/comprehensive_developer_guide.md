# Comprehensive Developer Guide - Moneko Codebase

## Quick Start for New Developers

### Understanding the Codebase Structure
The Moneko application is a sophisticated full-stack financial education platform built with modern React patterns and advanced TypeScript integration. Here's what every developer needs to know:

## Architecture Overview

### Application Bootstrap Flow
1. **Entry Point**: `src/client.tsx` → Hydrates React app with provider stack
2. **Router Setup**: `src/router.tsx` → TanStack Router with React Query integration
3. **Root Layout**: `src/routes/__root.tsx` → Global HTML structure with SEO
4. **Provider Stack**: Redux → AI Chat → Auth → Children components

### State Management Strategy
- **Global State**: Redux Toolkit for app-wide concerns (dashboard, user preferences)
- **Server State**: TanStack Query for API data with intelligent caching
- **Local State**: useState/useReducer for component-specific state
- **Form State**: React Hook Form for complex forms with validation
- **URL State**: TanStack Router for navigation and route parameters

## Key Features & Their Implementation

### 1. Goal Tracker System
**Location**: `src/components/goal-tracker/`
- **Multi-step Goal Creation**: Questionnaire flow with AI integration
- **Progress Tracking**: Real-time milestone and progress updates
- **AI Insights**: Generated insights based on goal progress
- **Data Flow**: Redux state → Custom hooks → Supabase backend

### 2. Learning Platform
**Location**: `src/components/learning/`
- **Interactive Questions**: Multiple question types with drag-and-drop
- **Progress Tracking**: XP system with badges and achievements
- **AI-Generated Courses**: Dynamic course creation via OpenAI
- **Mermaid Diagrams**: Complex diagram rendering for educational content

### 3. AI Chat System
**Location**: `src/components/chat/`
- **Dual Personalities**: Financial Advisor vs Educator modes
- **Voice Integration**: Speech-to-text and text-to-speech
- **Streaming Responses**: Real-time AI response streaming
- **Context Awareness**: Uses user profile for personalized responses

### 4. Dashboard System
**Location**: `src/components/profile/`
- **Drag-and-Drop Interface**: @dnd-kit powered widget management
- **Widget Factory**: Dynamic widget rendering based on configuration
- **Template System**: Pre-built dashboard templates
- **Real-time Sync**: Live updates via Supabase subscriptions

## Development Patterns to Follow

### Component Architecture
1. **Composition Over Inheritance**: Build complex components from simple primitives
2. **Props Interface First**: Always define TypeScript interfaces for props
3. **Error Boundaries**: Wrap feature components with error boundaries
4. **Loading States**: Implement skeleton components for all loading states
5. **Responsive Design**: Mobile-first approach with Tailwind breakpoints

### Hook Patterns
1. **Business Logic Separation**: Extract business logic to custom hooks
2. **Type Safety**: Use generic types for reusable hooks
3. **Error Handling**: Include error states in hook returns
4. **Dependency Arrays**: Be explicit about hook dependencies
5. **Custom Hook Naming**: Always prefix with `use`

### State Management Best Practices
1. **Redux for Global State**: User auth, theme, navigation, dashboard config
2. **React Query for Server State**: API data, caching, background updates
3. **Local State for UI**: Modal open/close, form inputs, temporary UI state
4. **Context for Cross-Cutting**: Authentication, theme, AI chat state

## Critical Code Patterns

### API Integration Pattern
```typescript
// Custom hook for data fetching
export function useGoals() {
  const { data: goals, isLoading, error } = useQuery({
    queryKey: ['goals'],
    queryFn: fetchGoals,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  return { goals, isLoading, error }
}
```

### Component Composition Pattern
```typescript
// Compound component pattern
const Modal = {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Content: ModalContent,
  Header: ModalHeader,
  Footer: ModalFooter
}

// Usage
<Modal.Root>
  <Modal.Trigger>Open</Modal.Trigger>
  <Modal.Content>
    <Modal.Header>Title</Modal.Header>
    Content
    <Modal.Footer>Actions</Modal.Footer>
  </Modal.Content>
</Modal.Root>
```

### Error Boundary Pattern
```typescript
// Feature-level error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <FeatureComponent />
</ErrorBoundary>
```

## Performance Optimization Strategies

### Code Splitting
- **Route Level**: Automatic with TanStack Router
- **Component Level**: `lazy()` for heavy components
- **Feature Level**: Bundle splitting for major features

### Rendering Optimization
- **React 19 Compiler**: Automatic memoization reduces manual optimization
- **Strategic Memoization**: Only for expensive calculations
- **Virtual Scrolling**: For large lists (goal lists, lesson lists)

### Bundle Optimization
- **Tree Shaking**: Remove unused code automatically
- **Dynamic Imports**: Load heavy libraries on demand
- **Asset Optimization**: Compressed images, lazy loading

## Testing Strategy (When Implemented)
- **Component Testing**: Isolated component behavior
- **Integration Testing**: Feature-level workflows
- **E2E Testing**: Critical user journeys
- **Mock Service Worker**: API mocking consistency

## Security Considerations

### Authentication & Authorization
- **Supabase Auth**: JWT-based authentication
- **Row Level Security**: Database-level access control
- **Protected Routes**: Route-level authentication guards
- **API Security**: Server-side validation and sanitization

### Data Protection
- **Input Sanitization**: XSS prevention on user inputs
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Content Security Policy**: Header-based XSS protection
- **Secure Storage**: Sensitive data in HTTP-only cookies

## Deployment & DevOps

### Build Process
1. **Type Checking**: `npm run typecheck`
2. **Production Build**: `npm run build`
3. **Asset Optimization**: Automatic compression and minification
4. **Sitemap Generation**: `npm run build:sitemap`

### Environment Management
- **Development**: Local with hot reload
- **Staging**: Production-like environment for testing  
- **Production**: Optimized build with analytics

## Common Troubleshooting

### Build Issues
- **Type Errors**: Check TypeScript strict mode compliance
- **Import Issues**: Verify path aliases in tsconfig.json
- **Bundle Size**: Analyze with webpack-bundle-analyzer

### Runtime Issues
- **Hydration Mismatches**: Check client-only components
- **Memory Leaks**: Cleanup subscriptions and timeouts
- **Performance**: Profile with React DevTools

## Code Quality Standards

### Must-Have Practices
1. **TypeScript Strict Mode**: No implicit any, strict null checks
2. **ESLint Compliance**: Fix all linting errors before commit
3. **Component Testing**: Test critical user paths
4. **Documentation**: Update README for major changes
5. **Performance**: Profile before deploying

### Code Review Checklist
- [ ] TypeScript types are comprehensive
- [ ] Components are properly tested
- [ ] Performance implications considered
- [ ] Security vulnerabilities checked
- [ ] Accessibility standards met
- [ ] Mobile experience verified

## Recommended Learning Path

### For New Team Members
1. **Week 1**: Understand project structure and run locally
2. **Week 2**: Implement small bug fixes to learn patterns
3. **Week 3**: Build a small feature using existing patterns
4. **Week 4**: Contribute to major feature development

### Key Concepts to Master
1. **TanStack Ecosystem**: Router + Query integration
2. **Redux Toolkit**: Modern Redux patterns
3. **Supabase Integration**: Real-time database operations
4. **Component Composition**: Radix UI + custom components
5. **Performance Optimization**: React 19 + optimization strategies

This guide provides the foundation for any developer to quickly understand and contribute to the Moneko codebase effectively.