/**
 * Helper function for unlocking the next lesson in a learning sequence
 * This provides a unified approach to lesson progression by updating the database
 */

import { unlockNextLesson as unlockNextLessonService } from "@/services/course-service";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Unlocks the next lesson after the specified lessonId
 * @param lessonId - ID of the current lesson
 * @param courseId - ID of the course
 * @param userId - ID of the user
 * @returns Promise resolving to boolean indicating whether a lesson was successfully unlocked
 */
export async function unlockNextLesson(lessonId: string, courseId: string, userId: string): Promise<boolean> {
  
  try {
    // Get the query client for invalidating queries after update
    const queryClient = useQueryClient();
    
    if (!userId) {
      console.warn('No user ID provided, cannot unlock lesson');
      return false;
    }
    
    console.log(`Attempting to unlock next lesson after: ${lessonId} in course: ${courseId} for user: ${userId}`);
    
    // Call the service to unlock the next lesson
    const result = await unlockNextLessonService(userId, courseId, lessonId);
    
    if (result.success) {
      console.log(`Successfully unlocked next lesson: ${result.message}`);
      
      // Invalidate queries to force a refetch of user courses
      await queryClient.invalidateQueries({ queryKey: ['user-courses', userId] });
      
      return true;
    } else {
      console.warn(`Failed to unlock next lesson: ${result.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error unlocking next lesson:', error);
    return false;
  }
}
