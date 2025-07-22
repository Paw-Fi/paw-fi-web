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


  export const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  export const extractFirstJson = (
    text: string,
  ): { json: any; start: number; end: number } | null => {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const jsonBlockMatch = text.match(jsonBlockRegex);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        const code = jsonBlockMatch[1].trim();
        const json = JSON.parse(code);
        const sanitized = sanitizeCourse(json);
        const idx = text.indexOf(jsonBlockMatch[0]);
        return { json: sanitized, start: idx, end: idx + jsonBlockMatch[0].length };
      } catch (err) {
        /* Fall through */
      }
    }
    const curlyBlockRegex = /\{[\s\S]*\}/g;
    let match: RegExpExecArray | null;
    while ((match = curlyBlockRegex.exec(text)) !== null) {
      try {
        const json = JSON.parse(match[0]);
        return { json, start: match.index, end: match.index + match[0].length };
      } catch (err) {
        continue;
      }
    }
    return null;
  };