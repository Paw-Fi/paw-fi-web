import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Course, Tutorial, ContentBlockType } from '../types/learning.types';

import BasicLessons from '@/data/basic-lessons.json';

/**
 * Data source type for course fetching
 */
export type CourseDataSource = 'remote' | 'local';

/**
 * Options for course fetching
 */
export interface CourseOptions {
  /** Whether the query is enabled */
  enabled?: boolean;
  /** Data source to use (remote API or local data) */
  source?: CourseDataSource;
}

/**
 * Fetch courses from remote API
 */
export async function getRemoteUserCourses(userId: string): Promise<Course[]> {
  const { data, error } = await supabase.functions.invoke('get-user-courses', {
    method: 'POST',
    body: { userId },
  });
  if (error) throw error;
  console.log("[getRemoteUserCourses] Courses fetched:", data);
  return data.courses as Course[];
}

/**
 * Unlock the next lesson after the current one
 * @param userId - User ID
 * @param courseId - Course ID
 * @param lessonId - Current lesson ID
 * @returns Promise with unlock result
 */
export async function unlockNextLesson(userId: string, courseId: string, lessonId: string): Promise<{ success: boolean; message: string; nextLessonId?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('unlock-next-lesson', {
      method: 'POST',
      body: { userId, courseId, lessonId },
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error unlocking next lesson:', error);
    throw error;
  }
}

/**
 * Get essential courses from local data
 */
export function getEssentialCourses(): Promise<Course[]> {
  // Transform BasicLessons to match the Course type structure
  const transformedCourse: Course = {
    ...BasicLessons,
    lessons: BasicLessons.lessons.map(lesson => ({
      ...lesson,
      id: lesson.lesson_id, // Ensure id field is present
      tutorials: lesson.tutorials.map((tutorial, index) => ({
        ...tutorial,
        id: `tutorial-${index}`,
        tutorial_id: `tutorial-${index}`,
        lesson_id: lesson.lesson_id
      })) as Tutorial[],
      questions: lesson.questions.map(question => ({
        ...question,
        // Transform content_blocks to match ContentBlock type if they exist
        content_blocks: question.content_blocks ? 
          question.content_blocks.map(block => ({
            ...block,
            type: block.type as ContentBlockType
          })) : 
          undefined
      }))
    }))
  };
  
  // Wrap in Promise to match the API signature
  return Promise.resolve([transformedCourse]);
}

/**
 * React hook for fetching user courses with Tanstack Query
 * @param userId - User ID to fetch courses for
 * @param options - Query options including data source
 */
export function useUserCourses(userId: string, options?: CourseOptions) {
  const source = options?.source || 'remote';
  return useQuery<Course[]>({
    // Include source in queryKey for proper caching
    queryKey: ['user-courses', userId, source],
    queryFn: async () => {
      if (source === 'local') {
        return getEssentialCourses();
      }
      return getRemoteUserCourses(userId);
    },
    enabled: !!userId && (options?.enabled ?? true),
  });
}
