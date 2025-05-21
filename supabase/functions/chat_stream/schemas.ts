import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Option schema for MCQ/SCQ
const OptionSchema = z.object({
  id: z.string(),
  content: z.string(),
  isCorrect: z.boolean().optional(),
  description: z.string().optional(),
});

// Sort Categories schema
const CategorySchema = z.object({
  id: z.string(),
  content: z.string(),
});
const ItemSchema = z.object({
  id: z.string(),
  content: z.string(),
});

// Correct Answers for sort-categories
const CorrectAnswersSchema = z.record(z.string(), z.array(z.string()));

// Question schema
export const QuestionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("mcq"),
    question: z.string(),
    options: z.array(OptionSchema),
    explanation: z.string().optional(),
    helpTips: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("scq"),
    question: z.string(),
    options: z.array(OptionSchema),
    explanation: z.string().optional(),
    helpTips: z.string().optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("sort-categories"),
    question: z.string(),
    categories: z.array(CategorySchema),
    items: z.array(ItemSchema),
    correctAnswers: CorrectAnswersSchema,
    explanation: z.string().optional(),
    helpTips: z.string().optional(),
  })
  // Add more question types as needed
]);

// Lesson schema
export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  xp: z.number(),
  unlocked: z.boolean(),
  icon: z.string().optional(),
  questions: z.array(QuestionSchema),
});

// Course (root) schema
export const CourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  lessons: z.array(LessonSchema),
});

export type Course = z.infer<typeof CourseSchema>;
