// Learning system types

// Types of content blocks for structured content
export type ContentBlockType =
  | "paragraph"
  | "bulletList"
  | "numberedList"
  | "scenario";

// Types of questions - using string to be compatible with JSON data
export type QuestionType =
  | "mcq"
  | "scq"
  | "sort-order"
  | "sort-categories"
  | "match"
  | "matrix-rating"
  | "text-input"
  | "image-choice"
  | string;

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
  imageUrl?: string; // URL to an image
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

export type Tutorial = {
  id: string;
  tutorial_id: string;
  lesson_id: string;
  title: string;
  content: string;
  key_points: string[];
};

// A fully flexible Question type to accommodate JSON data
export interface LearningQuizQuestion {
  id: string;
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
export type ChoiceQuestion = LearningQuizQuestion;
export type SortQuestion = LearningQuizQuestion;
export type SortCategoriesQuestion = LearningQuizQuestion;
export type MatchQuestion = LearningQuizQuestion;
export type MatrixRatingQuestion = LearningQuizQuestion;
export type TextInputQuestion = LearningQuizQuestion;
export type ImageChoiceQuestion = LearningQuizQuestion;

// Common type guards to check question types
export function isChoiceQuestion(question: LearningQuizQuestion): question is LearningQuizQuestion {
  return question.type === "mcq" || question.type === "scq";
}

export function isSortQuestion(question: LearningQuizQuestion): question is LearningQuizQuestion {
  return question.type === "sort-order";
}

export function isSortCategoriesQuestion(
  question: LearningQuizQuestion,
): question is LearningQuizQuestion {
  return question.type === "sort-categories";
}

export function isMatchQuestion(question: LearningQuizQuestion): question is LearningQuizQuestion {
  return question.type === "match";
}

export function isMatrixRatingQuestion(
  question: LearningQuizQuestion,
): question is LearningQuizQuestion {
  return question.type === "matrix-rating";
}

export function isTextInputQuestion(question: LearningQuizQuestion): question is LearningQuizQuestion {
  return question.type === "text-input";
}

export function isImageChoiceQuestion(
  question: LearningQuizQuestion,
): question is LearningQuizQuestion {
  return question.type === "image-choice";
}

// Lesson structure
export interface Lesson {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon?: string;
  tutorials: Tutorial[];
  questions: LearningQuizQuestion[];
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

// Community Course Types
export interface CommunityAuthor {
  name: string;
  avatar: string;
  level: number;
  expertise: string;
  verified: boolean;
}

export interface CommunityStats {
  students: number;
  rating: number;
  likes: number;
  views: number;
  comments: number;
}

export interface CommunityMetadata {
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  lessons: number;
  category: string;
  tags: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPreview {
  thumbnail: string;
  color: string;
}

export interface CommunityCourse {
  id: string;
  title: string;
  description: string;
  author: CommunityAuthor;
  stats: CommunityStats;
  metadata: CommunityMetadata;
  preview: CommunityPreview;
  featured: boolean;
  trending: boolean;
}

export type SortOption =
  | "trending"
  | "recent"
  | "popular"
  | "highest-rated"
  | "most-views"
  | "most-likes";

export interface SortOptionConfig {
  value: SortOption;
  label: string;
  icon: any; // FontAwesome icon
}
