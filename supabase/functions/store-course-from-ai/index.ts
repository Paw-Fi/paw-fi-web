import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

function sanitizeCourseJson(raw: any) {
  if (!raw || typeof raw !== "object" || !raw.id || !raw.title || !Array.isArray(raw.lessons))
    throw new Error("Invalid course structure: Missing basic fields or lessons array.");

  return {
    id: String(raw.id),
    title: String(raw.title).trim(),
    description: raw.description ? String(raw.description).trim() : "",
    icon: raw.icon ? String(raw.icon) : null,
    xp: Number(raw.xp) || 0,
    unlocked: typeof raw.unlocked === 'boolean' ? raw.unlocked : false,
    lessons: raw.lessons.map((lesson: any, idx: number) => {
      if (!lesson || typeof lesson !== "object" || !lesson.id || !lesson.title || !Array.isArray(lesson.questions))
        throw new Error(`Invalid lesson structure for lesson ID: ${lesson?.id || 'unknown'} at index ${idx}.`);
      
      return {
        id: String(lesson.id),
        title: String(lesson.title).trim(),
        description: lesson.description ? String(lesson.description).trim() : "",
        xp: Number(lesson.xp) || 0,
        unlocked: typeof lesson.unlocked === 'boolean' ? lesson.unlocked : false,
        icon: lesson.icon ? String(lesson.icon) : null,
        position: idx,
        questions: lesson.questions.map((q: any, qidx: number) => {
          if (!q || typeof q !== "object" || !q.id || !q.type || !q.question)
            throw new Error(`Invalid question structure for question ID: ${q?.id || 'unknown'} in lesson ID: ${lesson.id}.`);

          return {
            id: String(q.id),
            type: String(q.type),
            question: String(q.question),
            options: q.options ?? null,
            image_options: q.imageOptions ?? null,
            items: q.items ?? null,
            categories: q.categories ?? null,
            rows: q.rows ?? null, // For matrix-rating
            columns: q.columns ?? null, // For matrix-rating
            correct_answers: q.correctAnswers ?? null,
            validation: q.validation ?? null,
            explanation: q.explanation ? String(q.explanation).trim() : null,
            incorrect_explanation: q.incorrectExplanation ? String(q.incorrectExplanation).trim() : null,
            help_tips: q.helpTips ? String(q.helpTips).trim() : null,
            content_blocks: q.contentBlocks ?? null,
            position: qidx,
          };
        }),
      };
    }),
  };
}

serve(async (req) => {
  // Log the incoming request for debugging
  let debugBody;
  try {
    debugBody = await req.clone().json();
    console.log("[store-course-from-ai] Received payload:", debugBody);
  } catch (e) {
    console.log("[store-course-from-ai] Could not parse payload as JSON", e);
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const { user_id, course } = await req.json();
  console.log("[store-course-from-ai] Parsed user_id:", user_id);
  console.log("[store-course-from-ai] Parsed course:", course);
  if (!user_id || !course) {
    return new Response(
      JSON.stringify({ error: "Missing user_id or course" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  let sanitized;
  try {
    sanitized = sanitizeCourseJson(course);
    console.log("[store-course-from-ai] Sanitized course:", sanitized);
  } catch (err) {
    console.error("[store-course-from-ai] Course sanitization error:", err);
    return new Response(
      JSON.stringify({ error: "Invalid course JSON: " + err.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  // Insert course
  console.log("[store-course-from-ai] Inserting course row:", {
    user_id,
    course_id: sanitized.id,
    title: sanitized.title,
    description: sanitized.description,
    icon: sanitized.icon,
    xp: sanitized.xp,
    unlocked: sanitized.unlocked,
  });
  const { data: courseRow, error: courseErr } = await supabase
    .from("user_courses")
    .insert({
      user_id,
      course_id: sanitized.id,
      title: sanitized.title,
      description: sanitized.description,
      icon: sanitized.icon,
      xp: sanitized.xp,
      unlocked: sanitized.unlocked,
    })
    .select("id")
    .single();
  if (courseErr || !courseRow?.id) {
    console.error("[store-course-from-ai] Failed to insert course", courseErr);
    return new Response(
      JSON.stringify({ error: "Failed to insert course", details: courseErr }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const course_id = courseRow.id;
  // Insert lessons
  const lessonsToInsert = sanitized.lessons.map((lesson) => ({
    course_id,
    lesson_id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    xp: lesson.xp,
    unlocked: lesson.unlocked,
    icon: lesson.icon,
    position: lesson.position,
  }));
  console.log("[store-course-from-ai] Inserting lessons:", lessonsToInsert);
  const { data: lessonRows, error: lessonErr } = await supabase
    .from("user_lessons")
    .insert(lessonsToInsert)
    .select("id, lesson_id, position");
  if (lessonErr) {
    console.error("[store-course-from-ai] Failed to insert lessons", lessonErr);
    return new Response(
      JSON.stringify({ error: "Failed to insert lessons", details: lessonErr }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  // Map lesson_id to DB id for question FK
  const lessonIdMap: Record<string, string> = {};
  for (const row of lessonRows) {
    lessonIdMap[row.lesson_id] = row.id;
  }
  // Insert questions
  const questionsToInsert = [];
  for (const lesson of sanitized.lessons) {
    const lesson_id = lessonIdMap[lesson.id];
    for (const q of lesson.questions) {
      questionsToInsert.push({
        lesson_id,
        question_id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        image_options: q.image_options,
        items: q.items,
        categories: q.categories,
        rows: q.rows, // Added for matrix-rating
        columns: q.columns, // Added for matrix-rating
        correct_answers: q.correct_answers,
        validation: q.validation,
        explanation: q.explanation,
        incorrect_explanation: q.incorrect_explanation,
        help_tips: q.help_tips,
        position: q.position,
      });
    }
  }
  if (questionsToInsert.length > 0) {
    console.log("[store-course-from-ai] Inserting questions:", questionsToInsert);
    const { error: questionErr } = await supabase
      .from("user_questions")
      .insert(questionsToInsert);
    if (questionErr) {
      console.error("[store-course-from-ai] Failed to insert questions", questionErr);
      return new Response(
        JSON.stringify({ error: "Failed to insert questions", details: questionErr }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  return new Response(JSON.stringify({ status: "success" }), {
    headers: { "Content-Type": "application/json" },
  });
});
