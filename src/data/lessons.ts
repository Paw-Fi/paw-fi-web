import type { Course, Lesson } from "@/types/learning.types";
import mockLessons from "./mock1.json";
import sabinaLessons from "./sabina-mock.json"

// Helper function to get lesson by ID
// LocalStorage key for lesson data (must match the one in learning/index.tsx)
const LESSONS_STORAGE_KEY = 'paw-fi-lessons';

// Helper function to get lessons from localStorage
function getLessonsFromLocalStorage(): Lesson[] {
  try {
    const storedData = localStorage.getItem(LESSONS_STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return parsedData as Lesson[];
      }
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
  return mockLessons.find((lesson) => lesson.id === id) || sabinaLessons.find((lesson) => lesson.id === id);
}

// Helper function to get course by ID
export function getCourseById(id: string): Course | undefined {
  // First check localStorage
  const localStorageLessons = getLessonsFromLocalStorage();
  const courseFromStorage = localStorageLessons.find((lesson) => lesson.id === id);
  
  // If found in localStorage, return it (need to adapt if needed)
  if (courseFromStorage) {
    return courseFromStorage as unknown as Course; // This might need proper type adaptation
  }
  
  // Otherwise fallback to mock data
  return mockLessons.find((lesson) => lesson.id === id) as unknown as Course;
}

export function getAllLessons(): Lesson[] {
  // Check if we have lessons in localStorage
  const localStorageLessons = getLessonsFromLocalStorage();
  
  // If we have lessons in localStorage, return those
  if (localStorageLessons.length > 0) {
    return localStorageLessons;
  }
  
  // Otherwise fallback to mock data
  return mockLessons;
}