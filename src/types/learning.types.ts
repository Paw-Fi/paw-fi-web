// Learning system types

// Types of content blocks for structured content
export type ContentBlockType = 'paragraph' | 'bulletList' | 'numberedList' | 'scenario';

// Types of questions - using string to be compatible with JSON data
export type QuestionType = 'mcq' | 'scq' | 'sort-order' | 'sort-categories' | 'match' | 'matrix-rating' | 'text-input' | 'image-choice' | string;

// Base item for any question option
export type Item = {
  id: string;
  content: string;
};

// Draggable item for sort questions
export type DraggableItem = Item & {
  category?: string;
};

// Option for choice questions
export type ChoiceOption = Item & {
  isCorrect: boolean;
  description?: string; // Optional description/subtitle for the option
};

// Option for image choice questions
export type ImageChoiceOption = ChoiceOption & {
  imageUrl?: string;  // URL to an image
  imagePrompt?: string; // Mermaid diagram code
  caption?: string; // Optional text to display under the image
};

// Rating option for matrix rating questions 
export type RatingOption = Item & {
  color?: string; // Optional color for styling (e.g., 'green', 'yellow', 'red')
};

// Help tips for category comparison
export type HelpTipCategoryData = {
  col1: string;
  col2: string;
};

// Content block for structured content
export type ContentBlock = {
  type: ContentBlockType;
  content: string | string[];
};

// Text input validation rules
export type TextInputValidation = {
  pattern?: string; // RegExp pattern for validation
  min?: number; // Minimum value (if numeric)
  max?: number; // Maximum value (if numeric)
  required?: boolean; // Whether input is required
  errorMessage?: string; // Custom error message
  caseSensitive?: boolean; // Whether to match case (defaults to false)
};

// Base question type
export type BaseQuestion = {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  incorrect_explanation?: string;
  help_tips?: string;
  content_blocks?: ContentBlock[];
  imagePrompt?: string;
  caption?: string;
};

// A fully flexible Question type to accommodate JSON data
export interface Question {
  question_id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  incorrect_explanation?: string;
  help_tips?: string;
  content_blocks?: ContentBlock[];
  imagePrompt?: string;
  caption?: string;
  // Common properties
  options?: any[];
  image_options?: any[];
  itemsPerRow?: number;
  // Sort and category properties
  items?: any[];
  correct_answers?: string[] | Record<string, string[]> | any;
  categories?: any[];
  helpTipsData?: any[];
  // Match properties
  matchItems?: any[];
  // Matrix rating properties
  ratingOptions?: any[];
  correctRatings?: Record<string, string>;
  imageUrl?: string;
  // Text input properties
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  correctAnswer?: string | string[];
  validation?: any;
}

// Type aliases for cleaner code - all based on the flexible Question type
export type ChoiceQuestion = Question;
export type SortQuestion = Question;
export type SortCategoriesQuestion = Question;
export type MatchQuestion = Question;
export type MatrixRatingQuestion = Question;
export type TextInputQuestion = Question;
export type ImageChoiceQuestion = Question;

// Common type guards to check question types
export function isChoiceQuestion(question: Question): question is Question {
  return question.type === 'mcq' || question.type === 'scq';
}

export function isSortQuestion(question: Question): question is Question {
  return question.type === 'sort-order';
}

export function isSortCategoriesQuestion(question: Question): question is Question {
  return question.type === 'sort-categories';
}

export function isMatchQuestion(question: Question): question is Question {
  return question.type === 'match';
}

export function isMatrixRatingQuestion(question: Question): question is Question {
  return question.type === 'matrix-rating';
}

export function isTextInputQuestion(question: Question): question is Question {
  return question.type === 'text-input';
}

export function isImageChoiceQuestion(question: Question): question is Question {
  return question.type === 'image-choice';
}

// Lesson structure
export interface Lesson {
  id: Key | null | undefined;
  lesson_id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon?: string;
  questions: Question[];
  content_blocks?: ContentBlock[] | any[];
  help_tips?: string;
}

// Course containing multiple lessons
export interface Course {
  course_id: string;
  id?: string; // legacy/compat
  title: string;
  description: string;
  icon?: string;
  lessons: Lesson[];
}
