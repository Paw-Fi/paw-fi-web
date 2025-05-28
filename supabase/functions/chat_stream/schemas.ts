import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Subschemas for new question types and fields
const ContentBlockSchema = z.object({
  type: z.string(),
  content: z.string(),
});

const ImageOptionSchema = z.object({
  id: z.string(),
  content: z.string(),
  imageUrl: z.string(),
  imagePrompt: z.string(),
  caption: z.string(),
  isCorrect: z.boolean(),
});

const ValidationSchema = z.object({
  required: z.boolean(),
  min: z.number(),
  max: z.number(),
  errorMessage: z.string(),
  caseSensitive: z.boolean(),
});

const RowOrColumnSchema = z.object({
  id: z.string(),
  content: z.string(),
  color: z.string().optional(),
});

const OptionSchema = z.object({
  id: z.string(),
  content: z.string(),
  isCorrect: z.boolean().optional(),
  description: z.string().optional(),
});

const CategorySchema = z.object({
  id: z.string(),
  content: z.string(),
});

const ItemSchema = z.object({
  id: z.string(),
  content: z.string(),
});


// Base question fields
const BaseQuestionFields = {
  id: z.string(),
  type: z.string(),
  question: z.string(),
  explanation: z.string(),
  incorrectExplanation: z.string().optional(),
  helpTips: z.string().optional(),
  contentBlocks: z.array(ContentBlockSchema).optional(),
};

// MCQ and SCQ
const McqQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("mcq"),
  options: z.array(OptionSchema),
});

const ScqQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("scq"),
  options: z.array(OptionSchema),
});

// Sort-categories
const SortCategoriesQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("sort-categories"),
  categories: z.array(CategorySchema),
  items: z.array(ItemSchema),
  correctAnswers: z.record(z.string(), z.array(z.string())),
  imagePrompt: z.string().optional(),
  caption: z.string().optional(),
});

// Sort-order
const SortOrderQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("sort-order"),
  items: z.array(ItemSchema),
  correctAnswers: z.array(z.string()),
});

// Text-input
const TextInputQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("text-input"),
  validation: ValidationSchema,
});

// Image-choice
const ImageChoiceQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("image-choice"),
  imageOptions: z.array(ImageOptionSchema),
  imagePrompt: z.string().optional(),
  caption: z.string().optional(),
});

// Match
const MatchQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("match"),
  items: z.array(ItemSchema),
  options: z.array(OptionSchema),
  correctAnswers: z.record(z.string(), z.string()),
});

// Matrix-rating
const MatrixRatingQuestionSchema = z.object({
  ...BaseQuestionFields,
  type: z.literal("matrix-rating"),
  rows: z.array(RowOrColumnSchema),
  columns: z.array(RowOrColumnSchema),
  correctAnswers: z.record(z.string(), z.string()),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  McqQuestionSchema,
  ScqQuestionSchema,
  SortCategoriesQuestionSchema,
  SortOrderQuestionSchema,
  TextInputQuestionSchema,
  ImageChoiceQuestionSchema,
  MatchQuestionSchema,
  MatrixRatingQuestionSchema,
]);

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  xp: z.number(),
  unlocked: z.boolean(),
  icon: z.string(),
  questions: z.array(QuestionSchema),
});

export const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  xp: z.number(),
  unlocked: z.boolean(),
  lessons: z.array(LessonSchema),
});

export type Course = z.infer<typeof CourseSchema>;
