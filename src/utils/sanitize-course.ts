import type { Course, Lesson } from "@/types/learning.types";

export function sanitizeCourse(course: Course): Course {
    let lessons = course.lessons;
    if (!lessons) return {...course, lessons: []};
    course.lessons= course.lessons.filter(
      (lesson): lesson is Lesson =>
        !!lesson &&
        typeof lesson === 'object' &&
        Array.isArray((lesson as Lesson).questions) &&
        (lesson as Lesson).questions.length > 0
    );
    return course;
  }