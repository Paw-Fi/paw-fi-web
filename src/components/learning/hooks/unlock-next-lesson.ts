/**
 * Helper function for unlocking the next lesson in a learning sequence
 * This provides a unified approach to lesson progression using only the
 * 'paw-fi-course' storage format
 */

import { COURSES_STORAGE_KEY } from "@/data/lessons";

/**
 * Unlocks the next lesson after the specified lessonId
 * @param lessonId - ID of the current lesson
 * @param courseId - ID of the course
 * @returns boolean indicating whether a lesson was successfully unlocked
 */
export function unlockNextLesson(lessonId: string,courseId: string): boolean {
  
  try {
    // Get course data from localStorage
    const courseData = localStorage.getItem(COURSES_STORAGE_KEY);
    if (!courseData) {
      console.warn('No course data found in localStorage');
      return false;
    }
    
    console.log(`Attempting to unlock next lesson after: ${lessonId} in course: ${courseId}`);
    const courses = JSON.parse(courseData);
    if (!Array.isArray(courses)) {
      console.warn('Course data is not an array');
      return false;
    }
    // Find the correct course by courseId
    const courseIndex = courses.findIndex((c: any) => c.id === courseId);
    if (courseIndex === -1) {
      console.warn(`Course with id ${courseId} not found`);
      return false;
    }
    const course = courses[courseIndex];
    if (course && course.lessons && Array.isArray(course.lessons)) {
      // Log available lesson IDs to help with debugging
      console.log('Available lesson IDs:', course.lessons.map((l: any) => l.id));
      // Find the current lesson's index
      const currentLessonIndex = course.lessons.findIndex((lesson: any) => lesson.id === lessonId);
      console.log(`Found lesson at index: ${currentLessonIndex}`);
      // If there's a next lesson, unlock it
      if (currentLessonIndex !== -1 && currentLessonIndex < course.lessons.length - 1) {
        const nextLesson = course.lessons[currentLessonIndex + 1];
        console.log(`Next lesson to unlock: ${nextLesson.title} (ID: ${nextLesson.id})`);
        // Check if it's already unlocked
        if (nextLesson.unlocked) {
          console.log('Next lesson is already unlocked');
          return true;
        }
        // Unlock the lesson
        course.lessons[currentLessonIndex + 1].unlocked = true;
        // Save updated courses array
        courses[courseIndex] = course;
        localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
        console.log(`Successfully unlocked next lesson: ${nextLesson.title}`);
        return true;
      } else {
        console.warn('Cannot unlock next lesson: either current lesson not found or it is the last lesson');
      }
    } else {
      console.warn('Course data is malformed - missing lessons array');
    }
    
    return false;
  } catch (error) {
    console.error('Error unlocking next lesson:', error);
    return false;
  }
}
