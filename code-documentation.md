# Paw-Fi Codebase Documentation

This document provides a detailed file-by-file breakdown of the Paw-Fi codebase to complement the main documentation.md file. Use this as a reference for understanding specific implementation details.

## Table of Contents

1. [Types](#1-types)
2. [Components](#2-components)
3. [Routes](#3-routes)
4. [Data Management](#4-data-management)
5. [Utilities](#5-utilities)
6. [Contexts](#6-contexts)

---

## 1. Types

### `/src/types/learning.types.ts`

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

---

## 2. Components

### Learning Components

#### `/src/components/learning/MermaidRenderer.tsx`

**Purpose:** Renders Mermaid diagram syntax as SVG visualizations.

**Implementation Details:**
- Uses the Mermaid API to process diagram syntax
- Implements loading states and error handling
- Converts text-based diagram descriptions into visual SVGs

**Usage:**
```tsx
<MermaidRenderer content="graph TD; A-->B;" />
```

#### `/src/components/learning/completion-display.tsx`

**Purpose:** Modal shown when a lesson is completed.

**Key Features:**
- Displays personalized completion message and XP earned
- Includes confetti animation using GSAP
- Shows progress towards badges
- Handles multiple success states (full success vs. partial)
- Triggers the unlocking of the next lesson in sequence

**Components Used:**
- `Modal` from UI components
- `Button` from UI components
- Uses GSAP for animations

**State Management:**
- Uses refs for animation targets
- Handles various states (success/failure)
- Manages progression through the learning system

#### `/src/components/learning/hooks/use-lesson.ts`

**Purpose:** Custom hook for lesson state management.

**Key Functionality:**
- Manages current question index
- Tracks user answers for each question
- Validates answers using lesson-utils
- Handles progression between questions
- Manages lesson completion state
- Unlocks next lessons upon completion
- Calculates earned XP based on performance

**Usage Pattern:**
```tsx
const {
  currentQuestion,
  handleAnswer,
  handleNext,
  // other properties and methods
} = useLesson({
  lessonId,
  questions,
  unlocked,
  xp
});
```

**Relationships:**
- Used in `/routes/learning/$lessonId.tsx`
- Uses validation functions from `lesson-utils.ts`
- Interacts with localStorage for persistence

#### `/src/components/learning/hooks/unlock-next-lesson.ts`

**Purpose:** Utility function to unlock the next lesson in sequence.

**Implementation:**
- Accesses localStorage to get course data
- Finds the current lesson by ID
- Updates the next lesson's unlock status
- Saves the updated course data back to localStorage

**Usage:**
```typescript
// When a lesson is completed successfully
unlockNextLesson(lessonId);
```

#### `/src/components/learning/lesson-utils.ts`

**Purpose:** Core validation functions for question answers.

**Key Functions:**

- `areAllAnswersCorrect`: Checks if all answers in a lesson are correct
- `isAnswerCorrect`: Validates a specific answer for any question type
- `isCurrentQuestionAnswered`: Checks if the current question has been answered

**Implementation Details:**
- Type-specific validation logic for each question type
- Handles complex validations for categorization questions
- Pattern matching for text input questions
- Array comparison for sequence questions

**Usage Example:**
```typescript
// Check if an answer is correct
const isCorrect = isAnswerCorrect(question, userAnswer);

// Check if all answers are correct
const passedLesson = areAllAnswersCorrect(questions, allAnswers);
```

#### `/src/components/learning/question-types/choice-question.tsx`

**Purpose:** Component for rendering and handling single and multiple choice questions.

**Features:**
- Supports both single choice (scq) and multiple choice (mcq) questions
- Renders options with descriptions
- Handles selection state
- Provides visual feedback for selections

**Props Interface:**
```typescript
interface ChoiceQuestionProps {
  question: Question;
  value: string | string[];
  onAnswer: (questionId: string, answer: string | string[]) => void;
}
```

**Usage:**
```tsx
<ChoiceQuestion
  question={question}
  value={answers[question.id]}
  onAnswer={handleAnswer}
/>
```

### UI Components

#### `/src/components/ui/button.tsx`

**Purpose:** Reusable button component with variants.

**Props:**
- `variant`: 'primary', 'secondary', 'outline', etc.
- `size`: 'sm', 'md', 'lg'
- Standard button props (onClick, disabled, etc.)

**Usage:**
```tsx
<Button 
  variant="primary"
  onClick={handleClick}
>
  Continue
</Button>
```

#### `/src/components/ui/modal.tsx`

**Purpose:** Reusable modal dialog component.

**Features:**
- Backdrop with click-to-close
- Focus management
- Animation using GSAP
- Accessibility features

**Usage:**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={handleClose}
>
  <h2>Modal Title</h2>
  <p>Modal content goes here.</p>
</Modal>
```

---

## 3. Routes

### `/src/routes/learning/$lessonId.tsx`

**Purpose:** Route component for a specific lesson.

**Implementation Details:**
- Uses TanStack Router's `createFileRoute`
- Fetches lesson data using `getLessonById`
- Uses the `useLesson` hook for state management
- Renders appropriate question components based on question type
- Displays completion modal when lesson is finished

**Components Used:**
- `LessonProgressBar`
- `QuestionHeader`
- `QuestionContent`
- `AnswerFeedback`
- `ActionButtons`
- `HelpTips`
- `CompletionDisplay`

**Usage:**
- Accessed via URL `/learning/[lessonId]`
- Handles all interactions for a specific lesson

### `/src/routes/sabina-learning.tsx`

**Purpose:** Main learning page displaying available lessons.

**Key Features:**
- Displays list of lessons with unlock status
- Handles lesson data from localStorage
- Provides import/reset functionality for lessons
- Animates lesson cards using GSAP

**Data Management:**
- Uses `getAllLessons` and `getAllCourses` for data access
- Manages localStorage for data persistence
- Handles JSON import for custom lessons

**UI Elements:**
- Lesson cards with visual indicators for lock status
- Metadata including question count, duration, and XP value
- Animation for lesson card entry

### `/src/routes/questionnaire.tsx`

**Purpose:** Questionnaire route for personalized recommendations.

**Implementation:**
- Uses the chat interface for an interactive experience
- Generates personalized lessons based on user responses
- Shows loading animation during lesson generation
- Redirects to learning page upon completion

**Components Used:**
- `ChatInterface`
- Loading indicators with progress bar

**Data Flow:**
- Collects user responses via chat
- Generates personalized content
- Stores generated lessons in localStorage
- Redirects to learning page

---

## 4. Data Management

### `/src/data/lessons.ts`

**Purpose:** Provides data access functions for lessons and courses.

**Key Functions:**
- `getLessonById`: Retrieves a specific lesson by ID
- `getCourseById`: Retrieves a specific course by ID
- `getAllCourses`: Gets all available courses
- `getAllLessons`: Gets all available lessons
- Helper functions for localStorage interaction

**Storage Strategy:**
- Uses a unified storage key 'paw-fi-course'
- Stores data in a structured course format
- Falls back to mock data if nothing exists in localStorage

**Usage:**
```typescript
// Get a specific lesson
const lesson = getLessonById('lesson-1');

// Get all lessons
const lessons = getAllLessons();
```

### `/src/data/questionnaire.ts`

**Purpose:** Defines questionnaire questions for user profiling.

**Content:**
- Array of questions using the shared Question type
- Includes various question types (scq, mcq, text-input)
- Questions focused on financial preferences and goals

**Relationship:**
- Used by the questionnaire context
- Shared type system with learning questions

---

## 5. Utilities

### `/src/utils/storage.ts`

**Purpose:** Utilities for localStorage access.

**Key Functions:**
- `getFromStorage`: Safely retrieves and parses data from localStorage
- `saveToStorage`: Safely stringifies and saves data to localStorage

**Error Handling:**
- Handles JSON parse/stringify errors
- Provides fallback values
- Includes type safety via TypeScript generics

**Usage:**
```typescript
// Get data with fallback
const data = getFromStorage<UserSettings>('settings', defaultSettings);

// Save data
saveToStorage('settings', updatedSettings);
```

---

## 6. Contexts

### `/src/contexts/questionnaire-context.tsx`

**Purpose:** Context provider for questionnaire state management.

**State Management:**
- Tracks current step
- Stores answers for each question
- Provides navigation and answer recording functions

**Key Functions:**
- `nextStep`: Advances to the next question
- `prevStep`: Returns to the previous question
- `setAnswer`: Records an answer for a specific question
- `resetQuestionnaire`: Clears all answers and resets to start

**Usage:**
```tsx
// Provider
<QuestionnaireProvider>
  <App />
</QuestionnaireProvider>

// Consumer
const { state, nextStep, setAnswer } = useQuestionnaire();
```

**Persistence:**
- Saves state to localStorage using the 'questionnaire' key
- Loads previous state on initialization if available

---

## Implementation Notes

### Storage Architecture

The application uses a unified storage approach:
- `paw-fi-course`: Single key for all course and lesson data
- Structured as a course object containing lessons array
- Progress tracking stored within this structure

### Routing Pattern

TanStack Router implementation:
- File-based routing with `createFileRoute`
- Dynamic routes using parameters (e.g., `$lessonId`)
- Route components defined inline with route configuration

### Component Reuse Strategy

The codebase emphasizes component reuse:
- Shared question components between learning and questionnaire
- Common validation logic
- Unified type system
- Abstract UI components with variants

---

## 7. AI Integration

### `/src/services/gemini-service.ts`

**Purpose:** Service for interacting with Google's Gemini API.

**Key Features:**
- Creates and manages chat sessions with the Gemini API
- Sends user messages and processes AI responses
- Extracts and validates JSON lesson data from AI responses
- Handles error states and provides fallbacks

**Key Functions:**
- `createChatSession`: Initializes a new chat session with the Gemini API
- `sendMessageToGemini`: Sends a message to the API and processes the response
- `isValidLesson`: Validates that JSON data from the API matches the expected lesson format

**Usage:**
```typescript
// Initialize a chat session
const chatSession = createChatSession(systemPrompt);

// Send a message and get a response
const response = await sendMessageToGemini(chatSession, userMessage);

// Check if the response contains lesson data
if (response.isComplete && response.generatedLessons) {
  // Process the generated lesson data
  handleLessonData(response.generatedLessons);
}
```

### `/src/utils/prompt-utils.ts`

**Purpose:** Utilities for working with AI prompts and responses.

**Key Functions:**
- `formatSystemPrompt`: Formats a system prompt for the Gemini API
- `formatUserMessage`: Formats a user message for the Gemini API
- `extractJsonFromText`: Extracts JSON data from text responses using multiple strategies
- `safeJsonParse`: Safely parses JSON strings with error handling

**Implementation Details:**
- Uses multiple strategies to extract JSON from AI responses
- Handles edge cases like code blocks and single-quoted JSON
- Provides robust error handling for JSON parsing

### `/src/utils/gemini-prompts.ts`

**Purpose:** Specialized prompts for the Gemini API.

**Key Prompts:**
- `generateLessonsPrompt`: Prompt to request lesson generation after a conversation
- `directLessonGenerationPrompt`: Prompt for immediate lesson generation

**Usage:**
```typescript
// Request lesson generation after conversation
const response = await sendMessageToGemini(chatSession, generateLessonsPrompt);
```

### `/src/components/chat/chat-interface.tsx`

**Purpose:** Interactive chat interface that uses the Gemini API with automatic JSON continuation.

**Key Features:**
- Real-time conversation with the Gemini AI
- Detects when to generate personalized lessons
- Stores generated lesson data in localStorage
- Displays lesson cards with links to the learning page
- Automatically handles incomplete JSON responses from the AI
- Seamlessly merges multiple JSON fragments into a complete response

**Implementation Details:**

**JSON Continuation System:**
- `checkJsonString(str: string)`: Detects if a string is valid JSON and whether it's complete
  - Checks for unbalanced braces, brackets, and JSON patterns
  - Returns `{ isJson: boolean, isComplete: boolean }`
  - Uses sophisticated detection for JSON-like structures

- `continueJsonResponse()`: Handles the automatic continuation of incomplete JSON
  - Automatically triggered when incomplete JSON is detected
  - Sends a "continue" message to the Gemini API
  - Merges JSON fragments with proper formatting
  - Removes intermediate messages from the chat history
  - Shows loading indicators during the continuation process
  - Recursively continues if the JSON is still incomplete after the first continuation

- `getAIResponse(userMessage: string, addToChat: boolean)`: Enhanced to support JSON continuation
  - Added `addToChat` parameter to control whether messages appear in the chat
  - Automatically triggers JSON continuation when incomplete JSON is detected
  - Uses a timeout-based approach to ensure state updates complete before continuation

- `startLessonGeneration(lessonData: any)`: Updated to handle multiple data formats
  - Supports both single lesson format and course format with multiple lessons
  - Detects the data structure and processes it accordingly
  - Creates appropriate course objects for localStorage

**Message Rendering:**
- Enhanced JSON parsing logic to handle both complete and incomplete JSON
- Two-step parsing approach: first tries to parse the entire content, then falls back to extracting JSON
- Improved debugging information for development mode
- Loading indicators for the continuation process
- Special handling for course format with multiple lessons

**Data Flow:**
- User messages are sent to the Gemini API
- AI responses are displayed in the chat
- If an incomplete JSON response is detected:
  1. The system automatically sends a "continue" message to the API
  2. The response is combined with the previous incomplete JSON
  3. The process repeats until complete JSON is obtained
  4. Only the final complete JSON is shown to the user
- When complete JSON is available, it's parsed and displayed as a lesson card
- The JSON data is stored in localStorage for access in the learning system

## Changelog

### 2025-05-19
- Added JSON continuation feature documentation
  - Detailed implementation of automatic JSON continuation in `chat-interface.tsx`
  - Documented the JSON detection and validation system
  - Explained the seamless merging of JSON fragments
  - Added information about handling both single lesson and course formats
  - Documented the recursive continuation approach for large JSON responses

### 2025-05-18
- Initial comprehensive code documentation
- Added file-by-file breakdown
- Included usage examples for key components
- Documented relationships between components
- Added documentation for Gemini API integration
