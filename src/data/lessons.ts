import type { Course, Lesson } from "@/types/learning.types";
import mockCourse from "./mock1.json";
import sabinaLessons from "./sabina-mock.json";

// Helper function to get lesson by ID
// LocalStorage key for course data - unified to use only one key for consistency
const COURSE_STORAGE_KEY = 'paw-fi-course';

// Helper function to get course from localStorage
export function getCourseFromLocalStorage(): Course | null {
  try {
    const storedData = localStorage.getItem(COURSE_STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      // Basic validation for course structure
      if (parsedData && parsedData.id && Array.isArray(parsedData.lessons)) {
        return parsedData as Course;
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving course from localStorage:', error);
    return null;
  }
}

// Helper function to get lessons from localStorage
function getLessonsFromLocalStorage(): Lesson[] {
  try {
    // Get from course storage format
    const course = getCourseFromLocalStorage();
    if (course && Array.isArray(course.lessons)) {
      return course.lessons;
    }
    
    // Return empty array if no data or invalid data
    return [];
  } catch (error) {
    console.error('Error retrieving lessons from localStorage:', error);
    return [];
  }
}

export function getLessonById(id: string): Lesson | undefined {
  // First check localStorage
  const localStorageLessons = getLessonsFromLocalStorage();
  const lessonFromStorage = localStorageLessons.find((lesson) => lesson.id === id);
  
  // If found in localStorage, return it
  if (lessonFromStorage) {
    return lessonFromStorage;
  }
  
  // Otherwise fallback to mock data
  // Check in mockCourse
  const lessonFromMockCourse = mockCourse.lessons.find((lesson) => lesson.id === id);
  if (lessonFromMockCourse) {
    return lessonFromMockCourse;
  }
  
  // Lastly check in sabinaLessons (which is still in the array format)
  return sabinaLessons.find((lesson) => lesson.id === id);
}

// Helper function to get course by ID
export function getCourseById(id: string): Course | undefined {
  // First check localStorage
  const courseFromStorage = getCourseFromLocalStorage();
  if (courseFromStorage && courseFromStorage.id === id) {
    return courseFromStorage;
  }
  
  // Otherwise fallback to mock data
  if (mockCourse.id === id) {
    return mockCourse;
  }
  
  return undefined;
}

// Get all courses (currently we only have one course in the new format)
export function getAllCourses(): Course[] {
  const courseFromStorage = getCourseFromLocalStorage();
  if (courseFromStorage) {
    return [courseFromStorage];
  }
  
  return [mockCourse];
}

export function getAllLessons(): Lesson[] {
  // Check if we have lessons in localStorage
  const localStorageLessons = getLessonsFromLocalStorage();
  
  // If we have lessons in localStorage, return those
  if (localStorageLessons.length > 0) {
    return localStorageLessons;
  }
  
  // Otherwise fallback to mock data's lessons
  return mockCourse.lessons;
}

export function storeCourse(course: Course) {  
    localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(course));  
}
  