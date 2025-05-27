import type { Course, Lesson } from "@/types/learning.types";
import basicCourse from '@/data/basic-lessons.json';

// Helper function to get lesson by ID
// LocalStorage key for course data - unified to use only one key for consistency
export const COURSES_STORAGE_KEY = 'paw-fi-courses';

// Helper function to get course from localStorage
// Get all courses from localStorage
export function getCoursesFromLocalStorage(): Course[] {
  try {
    const storedData = localStorage.getItem(COURSES_STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (Array.isArray(parsedData)) {
        // Validate each course structure
        return parsedData.filter((c: any) => c && c.id && Array.isArray(c.lessons)) as Course[];
      }
    }
    return [];
  } catch (error) {
    console.error('Error retrieving courses from localStorage:', error);
    return [];
  }
}

// Get a course by ID from localStorage or mock
export function getCourseById(id: string): Course | undefined {
  // First check localStorage
  const courses = getCoursesFromLocalStorage();
  const course = courses.find((c) => c.id === id);
  if (course) return course;
  // Fallback to mock data
  if (basicCourse.id === id) return basicCourse;
  return undefined;
}

// Get all lessons for a course ID
export function getLessonsByCourseId(courseId: string): Lesson[] {
  const course = getCourseById(courseId);
  return course && Array.isArray(course.lessons) ? course.lessons : [];
}

// Get a lesson by ID (searches all courses)
export function getLessonById(id: string): Lesson | undefined {
  const courses = getCoursesFromLocalStorage();
  for (const course of courses) {
    const lesson = course.lessons.find((l) => l.id === id);
    if (lesson) return lesson;
  }
  // Fallback to mock data
  for (const lesson of basicCourse.lessons) {
    if (lesson.id === id) return lesson;
  }
  return undefined;
}

// Get all courses (localStorage or mock)
export function getAllCourses(): Course[] {
  const courses = getCoursesFromLocalStorage();
  return courses.length > 0 ? courses : [basicCourse];
}

// Get all lessons (from all courses)
export function getAllLessons(): Lesson[] {
  const courses = getCoursesFromLocalStorage();
  if (courses.length > 0) {
    return courses.flatMap((c) => c.lessons);
  }
  return basicCourse.lessons;
}

// Store all courses to localStorage
export function storeCourses(courses: Course[]) {
  localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
}

// Store a single course (update or add in array)
export function storeCourse(course: Course) {
  const courses = getCoursesFromLocalStorage();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx !== -1) {
    courses[idx] = course;
  } else {
    courses.push(course);
  }
  storeCourses(courses);
}