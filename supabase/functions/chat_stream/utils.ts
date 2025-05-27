import { CourseSchema } from "./schemas.ts";

/**
 * Attempts to extract and validate a course JSON object from any input.
 * Returns the valid course object if successful, otherwise null.
 */
export function tryExtractCourseJson(input: unknown): unknown | null {
  try {
    const result = CourseSchema.safeParse(input);
    if (result.success) return result.data;
    return null;
  } catch {
    return null;
  }
}