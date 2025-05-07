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
}

// Help tips data for category comparison
export interface HelpTipCategoryData {
  col1: string;
  col2: string;
}

// Base question type
export interface BaseQuestion {
  id: string;
  type: QuestionType;
  question: string;
  explanation?: string;
  hint?: string;
  helpTips?: string;
}

// Types of questions
export type QuestionType = 'sort' | 'sort-categories' | 'mcq' | 'scq' | 'match';

// Multiple/Single choice question
export interface ChoiceQuestion extends BaseQuestion {
  type: 'mcq' | 'scq';
  options: Array<ChoiceOption>;
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

// Union type for all question types
export type Question =
  | ChoiceQuestion
  | SortQuestion
  | SortCategoriesQuestion
  | MatchQuestion;

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
