# Design Patterns & Guidelines

## Component Design Patterns

### Composition Pattern
- **Philosophy**: Build complex components from simple, reusable primitives
- **Implementation**: Use `@radix-ui` primitives as base, extend with custom styling
- **Example**: Button variants using `class-variance-authority` for different states

### Compound Component Pattern
```typescript
// Used for complex components like modals, forms
const Modal = {
  Root: ModalRoot,
  Trigger: ModalTrigger,
  Content: ModalContent,
  Header: ModalHeader,
  Footer: ModalFooter
}
```

### Render Props & Children Pattern
- **Children as Function**: For components needing render flexibility
- **Slot Pattern**: Using `@radix-ui/react-slot` for component composition
- **Polymorphic Components**: `asChild` prop for element type flexibility

## State Management Patterns

### State Hierarchy
1. **Server State**: TanStack Query for API data, caching, and synchronization
2. **Global Client State**: Redux Toolkit for app-wide state (user, theme, navigation)
3. **Local State**: `useState` for component-specific state
4. **Form State**: React Hook Form for complex form management
5. **URL State**: TanStack Router for route-based state

### Redux Patterns
- **RTK Slices**: Feature-based state slices with actions and reducers
- **Typed Hooks**: Pre-typed `useAppDispatch` and `useAppSelector`
- **Normalized State**: Flat state structure for complex data relationships
- **Immer Integration**: Immutable updates with Immer (built into RTK)

## Data Fetching Patterns

### TanStack Query
- **Query Keys**: Hierarchical array-based keys for cache management
- **Custom Hooks**: Wrap queries in custom hooks for reusability
- **Optimistic Updates**: For immediate UI feedback
- **Background Sync**: Automatic refetching and cache invalidation

### API Integration
- **Type-Safe APIs**: Generated types from Supabase schema
- **Error Handling**: Consistent error boundaries and user feedback
- **Loading States**: Skeleton components and loading indicators
- **Retry Logic**: Automatic retry with exponential backoff

## Styling Patterns

### Tailwind Architecture
- **Utility-First**: Prefer utility classes over custom CSS
- **Component Variants**: Use `cva` (class-variance-authority) for variant management
- **Responsive Design**: Mobile-first with responsive utility classes
- **Dark Mode**: CSS custom properties with Tailwind dark mode classes

### Design System
- **Semantic Colors**: HSL-based color system with CSS custom properties
- **Typography Scale**: Consistent font sizes and line heights
- **Spacing System**: 4px base unit with consistent spacing scale
- **Component Library**: Centralized UI components with consistent API

## File Organization Patterns

### Feature-Based Structure
```
components/
├── ui/           # Generic primitives
├── feature/      # Feature-specific components
│   ├── components/
│   ├── hooks/
│   ├── types/
│   └── utils/
```

### Import/Export Patterns
- **Barrel Exports**: Index files for clean imports
- **Path Aliases**: TypeScript path mapping for shorter imports
- **Named Exports**: Prefer named over default exports
- **Type Exports**: Separate type exports with `type` keyword

## Error Handling Patterns

### React Error Boundaries
- **Component-Level**: Catch errors in component trees
- **Route-Level**: Error boundaries for each route
- **Fallback UI**: User-friendly error messages with recovery options

### API Error Handling
- **HTTP Status Codes**: Proper handling of different error types
- **User Feedback**: Toast notifications for user-facing errors
- **Logging**: Comprehensive error logging for debugging
- **Retry Mechanisms**: Automatic retry for transient failures

## Performance Patterns

### React 19 Optimization
- **Automatic Memoization**: Leverage React 19 compiler optimizations
- **Minimal Manual Memoization**: Avoid unnecessary `useMemo`/`useCallback`
- **Concurrent Features**: Use Suspense and transitions where appropriate

### Code Splitting
- **Route-Level**: Automatic code splitting with TanStack Router
- **Component-Level**: Lazy loading for heavy components
- **Bundle Analysis**: Monitor bundle sizes and optimize chunks

## Security Patterns

### Authentication & Authorization
- **Supabase Auth**: Centralized authentication with JWT tokens
- **Protected Routes**: Route-level authentication guards
- **Row Level Security**: Database-level access control
- **CSRF Protection**: Cross-site request forgery prevention

### Data Validation
- **Zod Schemas**: Runtime type validation for API boundaries
- **Form Validation**: Client-side validation with server-side verification
- **Sanitization**: Input sanitization for user-generated content

## Testing Patterns (When Implemented)
- **Component Testing**: Isolated component behavior testing
- **Integration Testing**: Feature-level testing with mocked dependencies
- **E2E Testing**: Critical user journey testing
- **Mock Service Worker**: API mocking for consistent testing

## Accessibility Patterns
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Proper focus handling in modals and forms
- **Color Contrast**: WCAG-compliant color combinations
- **Semantic HTML**: Proper heading hierarchy and landmarks