// src/data/lessons.ts
import type { Course, Lesson, Question, ContentBlock, ContentBlockType, QuestionType } from "@/types/learning.types";
import basicCourseDataFile from '@/data/basic-lessons.json'; // Renamed to avoid conflict with Course type

// Type assertion for the imported JSON data to give it a basic structure
// This helps in accessing its properties before full transformation.
interface RawCourseData {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  lessons: RawLessonData[];
}

interface RawLessonData {
  lesson_id: string;
  title: string;
  description?: string;
  xp?: number;
  unlocked?: boolean;
  icon?: string;
  questions?: RawQuestionData[];
  content_blocks?: RawContentBlock[];
  help_tips?: string;
}

interface RawQuestionData {
  question_id?: string; // JSON might use id or question_id
  id?: string;
  type: string; // Raw type from JSON, will be cast to QuestionType
  question: string;
  explanation?: string;
  incorrect_explanation?: string;
  help_tips?: string;
  content_blocks?: RawContentBlock[];
  imagePrompt?: string;
  caption?: string;
  options?: any[];
  image_options?: any[];
  itemsPerRow?: number;
  items?: any[];
  correct_answers?: any;
  categories?: any[];
  helpTipsData?: any[];
  matchItems?: any[];
  ratingOptions?: any[];
  correctRatings?: Record<string, string>;
  imageUrl?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  correctAnswer?: string | string[];
  validation?: any;
}

interface RawContentBlock {
  type: string; // Raw type from JSON, will be cast to ContentBlockType
  content: string | string[];
}

const basicCourseData = basicCourseDataFile as RawCourseData;

// Helper to transform raw content block from JSON
function transformRawContentBlock(rawBlock: RawContentBlock): ContentBlock {
  const validTypes: ContentBlockType[] = ['paragraph', 'bulletList', 'numberedList', 'scenario'];
  const typeIsValid = validTypes.includes(rawBlock.type as ContentBlockType);
  
  return {
    type: typeIsValid ? rawBlock.type as ContentBlockType : 'paragraph', // Default to 'paragraph' if type is invalid
    content: rawBlock.content,
  };
}

// Helper to transform raw question from JSON
function transformRawQuestion(rawQuestion: RawQuestionData): Question {
  return {
    question_id: rawQuestion.question_id || rawQuestion.id || `gen-qid-${Math.random().toString(36).substr(2, 9)}`, // Ensure question_id exists
    type: rawQuestion.type as QuestionType, // Assumes QuestionType includes string or JSON is compliant
    question: rawQuestion.question,
    explanation: rawQuestion.explanation,
    incorrect_explanation: rawQuestion.incorrect_explanation,
    help_tips: rawQuestion.help_tips,
    content_blocks: (rawQuestion.content_blocks?.map(transformRawContentBlock) || []) as ContentBlock[],
    imagePrompt: rawQuestion.imagePrompt,
    caption: rawQuestion.caption,
    options: rawQuestion.options || [],
    image_options: rawQuestion.image_options || [],
    itemsPerRow: rawQuestion.itemsPerRow,
    items: rawQuestion.items || [],
    correct_answers: rawQuestion.correct_answers,
    categories: rawQuestion.categories || [],
    helpTipsData: rawQuestion.helpTipsData || [],
    matchItems: rawQuestion.matchItems || [],
    ratingOptions: rawQuestion.ratingOptions || [],
    correctRatings: rawQuestion.correctRatings,
    imageUrl: rawQuestion.imageUrl,
    placeholder: rawQuestion.placeholder,
    prefix: rawQuestion.prefix,
    suffix: rawQuestion.suffix,
    correctAnswer: rawQuestion.correctAnswer,
    validation: rawQuestion.validation,
  };
}

// Helper to transform raw lesson from JSON
function transformRawLesson(rawLesson: RawLessonData): Lesson {
  return {
    lesson_id: rawLesson.lesson_id,
    title: rawLesson.title,
    description: rawLesson.description || '',
    xp: rawLesson.xp || 0,
    unlocked: rawLesson.unlocked || false,
    icon: rawLesson.icon,
    questions: rawLesson.questions?.map(transformRawQuestion) || [],
    content_blocks: rawLesson.content_blocks?.map(transformRawContentBlock) || [],
    help_tips: rawLesson.help_tips,
  };
}

export const COURSES_STORAGE_KEY = 'paw-fi-courses';

export function getCourseById(id: string): Course | undefined {
  if (basicCourseData.id === id) {
    const course: Course = {
      course_id: basicCourseData.id,
      title: basicCourseData.title,
      description: basicCourseData.description || '',
      icon: basicCourseData.icon,
      lessons: basicCourseData.lessons?.map(transformRawLesson) || [],
      // id: basicCourseData.id, // Optional: include if Course interface needs it for legacy reasons
    };
    return course;
  }
  return undefined;
}

export function getLessonById(lessonIdToFind: string): Lesson | undefined {
  const rawLesson = basicCourseData.lessons?.find(l => l.lesson_id === lessonIdToFind);
  if (rawLesson) {
    return transformRawLesson(rawLesson);
  }
  return undefined;
}

export function getAllLessons(): Lesson[] {
  return basicCourseData.lessons?.map(transformRawLesson) || [];
}

// Definition for TutorialContent, used by getTutorialContent
export interface TutorialContent {
  id: string;
  title: string;
  type: 'text' | 'video' | 'audio' | 'diagram' | 'interactive'; // Specific types for tutorial sections
  content: string; 
  estimatedTime: number; 
  mediaUrl?: string; // Optional: direct URL for video/audio files
  duration?: number; // Optional: duration in seconds for video/audio
}

// Default tutorial content if no specific content is found or on error
export const defaultTutorialContent: TutorialContent[] = [
  {
    id: 'intro',
    title: 'Introduction',
    type: 'text',
    content: '<p>Welcome to this tutorial! We will cover several interesting topics.</p>',
    estimatedTime: 2,
  },
  {
    id: 'video-main',
    title: 'Main Video Content',
    type: 'video',
    content: 'https://www.example.com/placeholder.mp4', // Placeholder URL
    estimatedTime: 10,
  },
  {
    id: 'summary',
    title: 'Summary & Key Takeaways',
    type: 'text',
    content: '<p>Here are the key points to remember...</p><ul><li>Point 1</li><li>Point 2</li></ul>',
    estimatedTime: 3,
  },
];

export function getTutorialContent(lessonId: string): TutorialContent[] {
  const lesson = getLessonById(lessonId); // Uses the transformed lesson

  if (lesson && lesson.content_blocks && lesson.content_blocks.length > 0) {
    return lesson.content_blocks.map((block, index) => {
      let tutorialType: TutorialContent['type'] = 'text'; // Default type
      // Basic mapping from ContentBlockType to TutorialContent['type']
      if (block.type === 'paragraph') tutorialType = 'text';
      // Add more mappings as needed, e.g., for video, audio, interactive based on block.type or content structure
      // For now, others might default to 'diagram' or 'text'
      else if (block.type === 'scenario') tutorialType = 'diagram'; 

      let blockContent = '';
      if (typeof block.content === 'string') {
        blockContent = block.content;
      } else if (Array.isArray(block.content)) {
        // If content is an array (e.g. for bulletList), join it into a single string for now.
        // This might need more sophisticated handling based on actual content structure.
        blockContent = `<ul>${block.content.map((item: string) => `<li>${item}</li>`).join('')}</ul>`;
      } else {
        blockContent = JSON.stringify(block.content); // Fallback for other types
      }

      return {
        id: `section-${lesson.lesson_id}-${index + 1}`,
        // Generate a more meaningful title if possible, e.g., from the first few words of text content
        title: typeof block.content === 'string' && block.content.length > 30 
                 ? block.content.substring(0, 30) + "..." 
                 : `Section ${index + 1}`,
        type: tutorialType,
        content: blockContent,
        estimatedTime: 5, // Placeholder, could be calculated based on content length or type
      };
    });
  }

  // Fallback: if lesson has no content_blocks, try to make tutorial from questions
  if (lesson && lesson.questions && lesson.questions.length > 0) {
    return lesson.questions.slice(0, 5).map((q, i) => ({
      id: `tut-q-${lesson.lesson_id}-${i}`,
      title: q.question.length > 30 ? q.question.substring(0, 30) + "..." : q.question,
      type: 'text', // Treat questions as text sections for tutorial purposes
      content: q.explanation || q.question, // Use explanation or question text as content
      estimatedTime: 3, // Placeholder
    }));
  }
  
  return defaultTutorialContent; // Absolute fallback
}