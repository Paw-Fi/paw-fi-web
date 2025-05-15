// Learning system types

// Base item for any question option
export interface Item {
  id: string;
  content: string;
}

// Draggable item for sort questions
export interface DraggableItem extends Item {
  category?: string;
}

// Option for choice questions
export interface ChoiceOption extends Item {
  isCorrect: boolean;
  description?: string; // Optional description/subtitle for the option
}

// Help tips data for category comparison
export interface HelpTipCategoryData {
  col1: string;
  col2: string;
}

// Content block types for structured content
export type ContentBlockType = 'paragraph' | 'bulletList' | 'numberedList' | 'scenario';

export interface ContentBlock {
  type: ContentBlockType;
  content: string | string[];
}

// Base question type
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  hint?: string;
  helpTips?: string;
  contentBlocks?: ContentBlock[];
}

// Types of questions
export type QuestionType = 'sort' | 'sort-categories' | 'mcq' | 'scq' | 'match' | 'matrix-rating' | 'text-input' | 'image-choice';

// Multiple/Single choice question
export interface ChoiceQuestion extends BaseQuestion {
  type: 'mcq' | 'scq';
  options: Array<ChoiceOption>;
  itemsPerRow?: 1 | 2; // Controls layout - defaults to 1 if not specified
}

// Sorting question
export interface SortQuestion extends BaseQuestion {
  type: 'sort';
  items: Array<DraggableItem>;
  correctOrder: Array<string>;
}

// Sorting into categories question
export interface SortCategoriesQuestion extends BaseQuestion {
  type: 'sort-categories';
  items: Array<DraggableItem>;
  categories: Array<{ id: string; name: string }>;
  correctCategories: Record<string, string>; // itemId -> categoryId
  helpTipsData?: Array<HelpTipCategoryData>;
}

// Match items question
export interface MatchQuestion extends BaseQuestion {
  type: 'match';
  items: Array<Item>;
  matchItems: Array<Item>;
  correctMatches: Record<string, string>; // itemId -> matchItemId
}

// Rating option for matrix rating questions
export interface RatingOption extends Item {
  color?: string; // Optional color for styling (e.g., 'green', 'yellow', 'red')
}

export interface RatingOption {
  id: string;
  content: string;
  color?: string;
}

// Matrix rating question (e.g., rate items on a scale like low/medium/high risk)
export interface MatrixRatingQuestion extends BaseQuestion {
  type: 'matrix-rating';
  items: Array<Item>;
  ratingOptions: Array<RatingOption>;
  correctRatings: Record<string, string>; // itemId -> ratingId
  imageUrl?: string;         // Optional image to display with the question
}

// Image choice question (single choice with images)
export interface ImageChoiceQuestion extends BaseQuestion {
  type: 'image-choice';
  options: Array<ImageChoiceOption>;
  itemsPerRow?: 1 | 2; // Controls layout - defaults to 1 if not specified
}

// Option for image choice questions
export interface ImageChoiceOption extends ChoiceOption {
  imageUrl?: string;  // URL to an image
  imagePrompt?: string; // Mermaid diagram code
  caption?: string; // Optional text to display under the image
}

// Text input question (e.g., for entering a dollar amount, name, etc.)
export interface TextInputQuestion extends BaseQuestion {
  type: 'text-input';
  placeholder?: string;
  prefix?: string; // Optional prefix like '$' or '€'
  suffix?: string; // Optional suffix like '%' or 'lbs'
  correctAnswer?: string | string[]; // Single correct answer or array of acceptable answers
  validation?: {
    pattern?: string; // RegExp pattern for validation
    min?: number; // Minimum value (if numeric)
    max?: number; // Maximum value (if numeric)
    required?: boolean; // Whether input is required
    errorMessage?: string; // Custom error message
    caseSensitive?: boolean; // Whether to match case (defaults to false)
  }
}

// Union type for all question types
export type Question =
  | ChoiceQuestion
  | SortQuestion
  | SortCategoriesQuestion
  | MatchQuestion
  | MatrixRatingQuestion
  | TextInputQuestion
  | ImageChoiceQuestion;

// Lesson structure
export interface Lesson {
  id: string;
  title: string;
  description: string;
  xp: number;
  unlocked: boolean;
  icon?: string;
  questions: Array<Question>;
  helpTips?: string;
}

// Course containing multiple lessons
export interface Course {
  id: string;
  title: string;
  description: string;
  lessons: Array<Lesson>;
}
