# Paw-Fi Web Application Documentation

## 1. Project Overview

Paw-Fi is an educational web application focused on teaching personal finance and investment concepts. The application features:

- Interactive learning modules with various question types
- Progressive lesson unlocking system
- Chat system for personalized recommendations
- Gamification elements including XP rewards and completion tracking
- AI-assisted personalized learning path generation
- Interactive drag-and-drop categorization exercises
- Dynamic visualization with Mermaid diagrams
- User authentication system with email verification

The application is built with TypeScript, React, Tailwind CSS, and TanStack Router. It leverages modern UI patterns, GSAP animations, and a component-based architecture for an engaging user experience.

## 2. Project Structure

The project follows a modular structure organized into the following key directories:

```
/src
  /assets       # Static assets like images
  /components   # Reusable UI components
  /contexts     # React contexts for state management
  /data         # Mock data and data access functions
  /integrations # Third-party service integrations
  /lib          # Core library functions
  /routes       # Application routes
  /services     # Service layer
  /styles       # Global styles
  /types        # TypeScript type definitions
  /utils        # Utility functions
```

## 3. Core Features

### 3.1. Learning System

The learning system is the primary feature of the application, providing an interactive educational experience through structured lessons and quizzes.

#### 3.1.1. Key Components

- `LearningPage` (`/routes/sabina-learning.tsx`): Main page displaying available lessons
- `Lesson` (`/routes/learning/$lessonId.tsx`): Individual lesson with interactive questions
- Question Components (`/components/learning/question-types/*`): Various question type implementations
- `useLesson` Hook (`/components/learning/hooks/use-lesson.ts`): Manages lesson state and interactions
- `lesson-utils.ts`: Core validation functions for all question types
- `unlock-next-lesson.ts`: Function to unlock sequential lessons
- `MermaidRenderer.tsx`: Component for rendering diagram syntax as SVG

#### 3.1.2. Data Model

Lessons follow a structured data model defined in `/types/learning.types.ts`:

- `Lesson`: Contains metadata (title, description, XP) and an array of questions
- `Question`: Base type for all question types with shared properties
- Specialized question types (ChoiceQuestion, SortQuestion, etc.) with type guards

#### 3.1.3. Progression System

The application implements a progression system that:

- Tracks completed lessons
- Awards XP for correct answers
- Unlocks subsequent lessons upon completion
- Persists progress in localStorage

### 3.2. Authentication System

The authentication system handles user registration, login, and session management throughout the application.

#### 3.2.1. Key Components

- `AuthProvider` (`/contexts/auth-context.tsx`): Context provider for authentication state
- `SignInForm` (`/components/auth/sign-in-form.tsx`): Login form with validation
- `SignUpForm` (`/components/auth/sign-up-form.tsx`): Registration form with email verification
- `PageLayout` (`/components/layout/page-layout.tsx`): Layout component that handles header visibility based on authentication

#### 3.2.2. Implementation Notes

The authentication system includes:

- Email verification flow for new user registrations
- Conditional UI elements based on authentication state
- Protected routes for authenticated users only
- Consistent layout with header visibility control
- Sign-out functionality accessible from the header

### 3.3. Chat System

The Chat system collects user preferences and information to personalize the learning experience.

#### 3.3.1. Key Components

- `ChatProvider` (`/contexts/chat-context.tsx`): Context provider for Chat state
- `ChatRoute` (`/routes/chat.tsx`): Main Chat UI
- `ChatInterface` (`/components/chat/chat-interface.tsx`): AI-assisted chat for personalized recommendations

#### 3.3.2. Authentication Integration

The Chat interface has been updated to integrate with the authentication system:

- Shows different welcome messages based on authentication state
- Disables the input field when the user is not logged in
- Displays sign-in and sign-up buttons for unauthenticated users
- Provides a seamless path to authentication from the chat interface

#### 3.3.3. Implementation Notes

The Chat system has been refactored to reuse components from the learning system, eliminating code duplication. This includes:

- Shared question type components
- Common validation logic
- Unified data models
- Integrated AI assistance for generating personalized learning paths
- Real-time progress indicators for course generation
- Automatic JSON continuation for handling large AI responses

### 3.3. Drag-and-Drop Categorization

The application includes a drag-and-drop system for categorization questions using the dnd-kit library.

#### 3.3.1. Key Components

- `DragOverlay`, `Draggable`, `Droppable` (`/components/learning/dnd/*`)
- `SortCategoriesQuestion` (`/components/learning/question-types/sort-categories-question.tsx`)

#### 3.3.2. Features

- Item dragging between categories
- Visual feedback during dragging
- Empty state indicators for categories
- Mobile and desktop support

## 4. UI Components

### 4.1. Question Types

The application supports multiple question types:

1. **Choice Questions** (`choice-question.tsx`)
   - Single choice (scq)
   - Multiple choice (mcq)
   - Styled options with descriptions

2. **Image Choice Questions** (`image-choice-question.tsx`)
   - Choice questions with image support
   - Support for Mermaid diagrams

3. **Sort Questions** (`sort-question.tsx`)
   - Reorderable items using drag-and-drop

4. **Category Sort Questions** (`sort-categories-question.tsx`)
   - Drag items into appropriate category containers

5. **Match Questions** (`match-question.tsx`)
   - Matching pairs of related items

6. **Matrix Rating Questions** (`matrix-rating-question.tsx`)
   - Ratings across multiple dimensions
   - Color-coded options

7. **Text Input Questions** (`text-input-question.tsx`)
   - Text field with validation
   - Support for prefixes/suffixes

### 4.2. Helper Components

- `MermaidRenderer`: Renders Mermaid diagram syntax as SVG
- `ActionButtons`: Navigation buttons for lessons
- `AnswerFeedback`: Visual feedback for correct/incorrect answers
- `CompletionDisplay`: End-of-lesson completion modal with animations
- `LessonProgressBar`: Visual indicator of lesson progress

## 5. State Management & Routing

### 5.1. Local Storage

The application uses localStorage for persistence:

- `paw-fi-course`: Stores course and lesson data including completion status
- `Chat`: Stores Chat responses

### 5.2. React Hooks and Context

- `useLesson`: Custom hook for lesson state management
- `ChatContext`: Context provider for Chat state
- `useChat`: Hook for accessing Chat context

### 5.3. Routing Implementation

The application uses TanStack Router (formerly React Router) for routing:

- File-based routing with `createFileRoute`
- Route parameters for lesson IDs
- Programmatic navigation with `useNavigate`
- Route protection for locked lessons

## 6. Animation and Interactions

The application uses GSAP for animations:

- Card animations on the learning page
- Confetti effects on lesson completion
- Transition animations between questions

## 7. Recent Improvements

### 7.1. Mermaid Diagram Rendering

- Implemented proper rendering of Mermaid diagrams using the Mermaid API
- Added loading states and error handling for diagrams

### 7.2. Question Validation

- Fixed parameter mismatch in image-choice-question component
- Corrected validation logic in areAllAnswersCorrect function

### 7.3. Chat Refactoring

- Eliminated code duplication by reusing learning components
- Implemented TypeScript interfaces and type guards for safe mapping
- Created adapter functions to transform data formats

### 7.4. Drag-and-Drop Improvements

- Refactored from SortableContext to direct Draggable/Droppable approach
- Fixed performance issues with useRef
- Improved styling and visual feedback

## 8. Development Guidelines

### 8.1. Adding New Question Types

To add a new question type:

1. Define the question type in `learning.types.ts`
2. Create a new component in `/components/learning/question-types/`
3. Implement a type guard function
4. Update the question content renderer to support the new type

### 8.2. Creating Lessons

Lessons can be created by:

1. Adding new lesson data to the mock data files
2. Using the author import functionality to import JSON-formatted lessons

## 9. Technical Implementation Details

### 9.1. Question Validation Logic

The question validation system (`lesson-utils.ts`) implements sophisticated logic for each question type:

- **Choice Questions**: Validates selected options against correct options
- **Sort Questions**: Compares ordered arrays with expected sequence
- **Category Sort Questions**: Maps items to categories and compares with correct categorization
- **Match Questions**: Validates bidirectional matches between pairs
- **Matrix Rating Questions**: Compares user ratings with expected ratings
- **Text Input Questions**: Performs pattern matching, case sensitivity checks, and validates against possible answers

### 9.2. Animation Implementation

The application uses GSAP for animations:
- Spring-based transitions for UI elements
- Confetti effect on lesson completion
- Sequential animation of modal content
- Cat mascot animations throughout the learning experience

### 9.3. Data Persistence Strategy

The application stores data in localStorage with a unified approach:
- `paw-fi-course`: Single storage key for all course data
- Course structure with nested lessons
- Automatic unlocking of lessons based on completion
- XP reward tracking

### 3.4. JSON Continuation Feature

The application implements an automatic JSON continuation mechanism to handle large JSON responses from the Gemini API that may be truncated due to token limitations.

#### 3.4.1. Key Components

- `ChatInterface` (`/components/chat/chat-interface.tsx`): Manages the chat UI and JSON continuation
- `continueJsonResponse` function: Handles the automatic continuation process
- `checkJsonString` function: Detects incomplete JSON and validates structure

#### 3.4.2. Implementation Details

- **Automatic Detection**: The system automatically detects when a JSON response from the AI is incomplete
- **Background Continuation**: When incomplete JSON is detected, the system automatically sends a "continue" message to the API
- **Seamless Merging**: The system properly merges multiple JSON fragments into a single coherent JSON object
- **Clean UI**: Only the final, complete JSON is displayed to the user, with intermediate steps removed
- **Format Support**: Handles both single lesson format and complete course format with multiple lessons
- **Loading Indicators**: Shows loading animation while retrieving the rest of the data

#### 3.4.3. Technical Implementation

- Uses a timeout-based approach to automatically trigger continuation requests
- Implements smart JSON merging logic to handle formatting issues between fragments
- Filters message history to remove intermediate messages and show only the complete result
- Enhanced JSON validation to detect both single lesson and course data structures
- Recursive continuation for handling particularly large JSON responses

## 10. Documentation Maintenance Guidelines

### 10.1. How to Update This Documentation

This documentation should be updated whenever changes are made to the codebase. Follow these guidelines to maintain documentation quality:

#### For New Components or Files

1. Add a new subsection in the appropriate section describing the component/file
2. Include:
   - File path and purpose
   - Key interfaces/types used
   - Main functionality and usage examples
   - Relationships with other components
   - Any important implementation details

#### For Modified Components

1. Update the relevant documentation section
2. Add a note in the "Recent Improvements" section with:
   - Date of change
   - Summary of modifications
   - Reason for changes
   - Impact on related components

#### For Refactoring/Restructuring

1. Update the project structure section if folder organization changes
2. Update component relationships in the relevant sections
3. Document any migration steps or breaking changes

#### Documentation Structure

This documentation follows the codebase structure:
- Each major directory (`components`, `routes`, etc.) has a corresponding section
- Components are grouped by their functional relationship
- Types and interfaces are documented with their usage patterns

### 10.2. Changelog Template

When updating the documentation, add a changelog entry in this format:

```markdown
## Changelog Entry - YYYY-MM-DD

### Added/Modified/Removed
- [Component/File Name] - Brief description of change
- [Component/File Name] - Brief description of change

### Impact Analysis
- Which components are affected and how
- Any breaking changes that require attention

### Future Considerations
- Technical debt or follow-up tasks related to this change
```

## 11. Future Enhancements

Potential areas for future development:

- User authentication system
- Server-side storage of progress
- Additional gamification elements (badges, leaderboards)
- Enhanced analytics for learning progress
- More interactive question types
- Social sharing of achievements
- Expanded course catalog with advanced financial topics

## 12. Layout System

### 12.1. Page Layout Component

The application uses a centralized layout system to maintain consistent styling and header visibility across pages.

#### 12.1.1. Key Components

- `PageLayout` (`/components/layout/page-layout.tsx`): Wrapper component for all pages except the home page

#### 12.1.2. Implementation Details

- Uses TanStack Router's location state to detect the current path
- Conditionally renders the header based on the current route
- Applies consistent flex-1 and bg-background styling to all pages
- Eliminates duplicate styling code across individual page components

#### 12.1.3. Usage

The PageLayout is applied at the root route level in `__root.tsx`, ensuring all child routes inherit the layout:

```tsx
// In __root.tsx
import { Outlet } from '@tanstack/react-router';
import PageLayout from '../components/layout/page-layout';

export const Route = createRootRoute({
  component: () => (
    <PageLayout>
      <Outlet />
    </PageLayout>
  ),
});
```

## 13. Detailed Code Documentation

This section provides a detailed file-by-file breakdown of the Paw-Fi codebase. Use this as a reference for understanding specific implementation details.

### 13.1. Types

#### `/src/types/learning.types.ts`

This file defines all TypeScript interfaces and types for the learning system.

**Key Types & Usage:**

- `ContentBlockType`: Used for structured content blocks ('paragraph', 'bulletList', etc.)
- `QuestionType`: Defines all possible question types ('mcq', 'scq', 'sort-order', etc.)
- `BaseQuestion`: Foundation type for all question types with common properties
- `Question`: A flexible type to accommodate various question formats from JSON
- Type aliases (`ChoiceQuestion`, `SortQuestion`, etc.) for different question types
- Type guards (`isChoiceQuestion`, `isSortQuestion`, etc.) to safely check question types

**Relationships:**
- Used throughout the learning components
- Essential for type safety when handling different question formats
- Enables TypeScript to validate correct usage of question properties

**Example Usage:**
```typescript
// Type guard usage
if (isChoiceQuestion(question)) {
  // Handle choice question specifically
}

// Question type with specific properties
const question: ChoiceQuestion = {
  id: 'q1',
  type: 'mcq',
  question: 'Select all that apply',
  options: [...],
};
```

### 13.2. Components

#### Learning Components

##### `/src/components/learning/MermaidRenderer.tsx`

**Purpose:** Renders Mermaid diagram syntax as SVG visualizations.

**Implementation Details:**
- Uses the Mermaid API to process diagram syntax
- Implements loading states and error handling
- Converts text-based diagram descriptions into visual SVGs

**Usage:**
```tsx
<MermaidRenderer content="graph TD; A-->B;" />
```

##### `/src/components/learning/hooks/use-lesson.ts`

**Purpose:** Custom hook for lesson state management.

**Key Functionality:**
- Manages current question index
- Tracks user answers for each question
- Validates answers using lesson-utils
- Handles progression between questions
- Manages lesson completion state
- Unlocks next lessons upon completion
- Calculates earned XP based on performance

##### `/src/components/learning/lesson-utils.ts`

**Purpose:** Core validation functions for question answers.

**Key Functions:**
- `areAllAnswersCorrect`: Checks if all answers in a lesson are correct
- `isAnswerCorrect`: Validates a specific answer for any question type
- `isCurrentQuestionAnswered`: Checks if the current question has been answered

#### UI Components

##### `/src/components/ui/button.tsx`

**Purpose:** Reusable button component with various styles.

**Variants:**
- `primary`: Main call-to-action style
- `secondary`: Alternative action style
- `outline`: Bordered style
- `ghost`: Minimal style

**Sizes:**
- `sm`, `md`, `lg`

##### `/src/components/ui/modal.tsx`

**Purpose:** Reusable modal dialog component.

**Features:**
- Backdrop with click-to-close
- Focus management
- Animation using GSAP
- Accessibility features

### 13.3. Authentication Components

#### `/src/components/auth/sign-up-form.tsx`

**Purpose:** Registration form with email verification.

**Key Features:**
- Form validation for email, password, and name fields
- Integration with Supabase Auth API
- Email verification flow with confirmation message
- Error handling and feedback

**Implementation Details:**
- Uses the AuthContext for registration functionality
- Shows a verification message after successful registration
- Provides a link to the login page for existing users

#### `/src/components/auth/sign-in-form.tsx`

**Purpose:** Login form with validation.

**Key Features:**
- Form validation for email and password
- Integration with Supabase Auth API
- Error handling and feedback
- Navigation to dashboard on successful login

**Implementation Details:**
- Uses the AuthContext for login functionality
- Provides a link to the registration page for new users
- Handles various authentication error states

#### `/src/contexts/auth-context.tsx`

**Purpose:** Context provider for authentication state.

**Key Functions:**
- `signUp`: Handles user registration with email verification
- `signIn`: Authenticates users with email and password
- `signOut`: Logs out the current user
- `getUser`: Retrieves the current authenticated user

**Implementation Details:**
- Uses Supabase Auth API for authentication operations
- Maintains user state across the application
- Provides authentication methods to components via context

### 13.4. Layout Components

#### `/src/components/layout/page-layout.tsx`

**Purpose:** Centralized layout component for consistent page structure.

**Key Features:**
- Conditional header rendering based on route
- Consistent styling for all pages
- Simplified page component structure

**Implementation Details:**
- Uses TanStack Router's location state to detect the current path
- Renders the header on all pages except the home page
- Applies consistent flex-1 and bg-background styling to all pages

### 13.5. Chat Components

#### `/src/components/chat/chat-interface.tsx`

**Purpose:** Interactive chat interface that uses the Gemini API with automatic JSON continuation.

**Key Features:**
- Real-time conversation with the Gemini AI
- Authentication integration for access control
- Conditional UI based on authentication state
- Detects when to generate personalized lessons
- Stores generated lesson data in localStorage
- Automatically handles incomplete JSON responses from the AI

**Authentication Integration:**
- Shows different welcome messages based on authentication state
- Disables the input field when the user is not logged in
- Displays sign-in and sign-up buttons for unauthenticated users
- Provides a seamless path to authentication from the chat interface

**JSON Continuation System:**
- `checkJsonString(str: string)`: Detects if a string is valid JSON and whether it's complete
- `continueJsonResponse()`: Handles the automatic continuation of incomplete JSON
- `getAIResponse(userMessage: string, addToChat: boolean)`: Enhanced to support JSON continuation

## 14. Changelog

### 2025-05-20
- Added authentication integration to the chat interface
  - Implemented conditional UI based on authentication state
  - Added different welcome messages for authenticated/unauthenticated users
  - Disabled input field for unauthenticated users
  - Added sign-in/sign-up buttons for unauthenticated users
- Implemented centralized layout system with PageLayout component
  - Added conditional header visibility based on route
  - Removed duplicate styling from individual pages
  - Improved code maintainability and consistency
