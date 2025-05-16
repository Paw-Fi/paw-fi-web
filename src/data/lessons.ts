import type { Course, Lesson } from "@/types/learning.types";
import mockLessons from "./mock1.json";
import sabinaLessons from "./sabina-mock.json"

// Helper function to get lesson by ID
export function getLessonById(id: string): Lesson | undefined {
  return mockLessons.find((lesson) => lesson.id === id) || sabinaLessons.find((lesson) => lesson.id === id)
}


// Helper function to get course by ID
export function getCourseById(id: string): Course | undefined {
  return mockLessons.find((lesson) => lesson.id === id);
}

export function getAllLessons(): Lesson[] {
  return mockLessons
}