# Coding Conventions & Style Guide

## File Naming Conventions
- **Components**: `kebab-case` (e.g., `financial-advisor-chat-interface.tsx`)
- **Hooks**: `use-` prefix with `kebab-case` (e.g., `use-goal-tracker.ts`)
- **Types**: `kebab-case` with `.types.ts` suffix (e.g., `goal.types.ts`)
- **Utilities**: `kebab-case` (e.g., `date-utils.ts`)
- **Constants**: `UPPER_SNAKE_CASE` for constants, `kebab-case` for files

## TypeScript Conventions
- **Strict Mode**: `strict: true` with comprehensive type checking
- **No Implicit Any**: Generally avoided but `noImplicitAny: false` for flexibility
- **Interface over Type**: Prefer interfaces for object shapes
- **Path Aliases**: Use configured aliases (`@/`, `@components/`, `@types/`, etc.)
- **Export Strategy**: Named exports preferred over default exports
- **Type Definitions**: Centralized in `/src/types/` directory

## React Conventions
- **React 19 Features**: Leverage automatic memoization from React 19 compiler
- **Minimal Memoization**: Avoid unnecessary `useMemo`/`useCallback` usage
- **Hooks Pattern**: Custom hooks for reusable logic, prefixed with `use-`
- **Component Structure**: Props interface, component definition, export
- **Ref Forwarding**: Use `React.forwardRef` for component library components
- **Error Boundaries**: Comprehensive error handling with boundaries

## Component Architecture
- **Composition Pattern**: Build complex components from simple primitives
- **Props Interface**: Always define TypeScript interfaces for component props
- **Default Props**: Use destructuring with default values
- **Children Pattern**: Use `React.ReactNode` for children prop
- **Conditional Rendering**: Prefer logical AND (`&&`) for simple conditions

## Import/Export Patterns
```typescript
// Path aliases
import { Button } from '@components/ui/button'
import type { User } from '@types/database.types'

// Named exports preferred
export const MyComponent = () => { ... }
export type { MyComponentProps }

// Index files for clean imports
export { Button } from './button'
export { Input } from './input'
```

## Styling Conventions
- **Tailwind Classes**: Utility-first approach with semantic class names
- **Custom Components**: Use `cn()` utility for conditional classes
- **Variants**: Use `class-variance-authority` for component variants
- **Responsive Design**: Mobile-first approach with responsive utilities
- **Dark Mode**: Support through CSS custom properties and Tailwind dark mode

## State Management
- **Redux Toolkit**: Global state with typed hooks (`useAppDispatch`, `useAppSelector`)
- **React Query**: Server state and caching
- **Local State**: `useState` for component-specific state
- **Form State**: React Hook Form for complex forms
- **Context**: Minimal usage for cross-cutting concerns (auth, theme)

## Error Handling
- **Try-Catch**: Comprehensive error handling in async operations
- **Error Boundaries**: React error boundaries for component error isolation
- **Type Guards**: Runtime type checking with Zod schemas
- **Logging**: Console warnings for development, proper error reporting for production

## Code Quality Standards
- **ESLint Rules**: Strict linting with TypeScript, React Hooks, and Unicorn plugins
- **Prettier**: Consistent formatting with Tailwind class sorting
- **No Console**: Warning level for console.log, error for console.error in production
- **Curly Braces**: Always required for control statements
- **Filename Enforcement**: kebab-case enforced via ESLint unicorn plugin

## Documentation Standards
- **Component Props**: Document complex prop interfaces
- **Function Documentation**: JSDoc for utility functions
- **README Updates**: Keep project documentation current
- **Type Comments**: Explain complex type definitions
- **API Documentation**: Document custom hooks and utilities