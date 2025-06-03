import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

function sanitizeCourseJson(raw: any) {
  if (!raw || typeof raw !== "object" || !raw.id || !raw.title || !Array.isArray(raw.lessons))
    throw new Error("Invalid course structure: Missing basic fields or lessons array.");

  return {
    id: String(raw.id),
    title: String(raw.title).trim(),
    description: raw.description ? String(raw.description).trim() : "",
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
        tutorials: Array.isArray(lesson.tutorials) ? lesson.tutorials.map((tutorial: any, tidx: number) => {
          // If tutorial is missing required fields, create a default tutorial with position-based ID
          if (!tutorial || typeof tutorial !== "object") {
            console.warn(`[store-course-from-ai] Missing or invalid tutorial at index ${tidx} in lesson ID: ${lesson.id}. Creating default.`);
            return {
              id: `tutorial-${tidx + 1}`,
              title: `Tutorial ${tidx + 1}`,
              content: "",
              key_points: [],
              position: tidx,
            };
          }
          
          // If tutorial is missing id or title, use position-based values
          const tutorialId = tutorial.id ? String(tutorial.id) : `tutorial-${tidx + 1}`;
          const tutorialTitle = tutorial.title ? String(tutorial.title).trim() : `Tutorial ${tidx + 1}`;
          
          return {
            id: tutorialId,
            title: tutorialTitle,
            content: tutorial.content || tutorial.description ? String(tutorial.content || tutorial.description).trim() : "",
            key_points: Array.isArray(tutorial.key_points) ? tutorial.key_points.map((kp: any) => String(kp).trim()) : [],
            position: tidx,
          };
        }) : [],
        questions: Array.isArray(lesson.questions) ? lesson.questions.map((q: any, qidx: number) => {
          // If question is missing required fields, create a default question with position-based ID
          if (!q || typeof q !== "object") {
            console.warn(`[store-course-from-ai] Missing or invalid question at index ${qidx} in lesson ID: ${lesson.id}. Creating default.`);
            return {
              id: `question-${qidx + 1}`,
              type: "text",
              question: `Question ${qidx + 1}`,
              options: null,
              image_options: null,
              items: null,
              categories: null,
              rows: null,
              columns: null,
              correct_answers: null,
              validation: null,
              explanation: null,
              incorrect_explanation: null,
              position: qidx,
            };
          }
          
          // If question is missing id, type or question text, use position-based values
          const questionId = q.id ? String(q.id) : `question-${qidx + 1}`;
          const questionType = q.type ? String(q.type) : "text";
          const questionText = q.question ? String(q.question) : `Question ${qidx + 1}`;
          
          return {
            id: questionId,
            type: questionType,
            question: questionText,
            options: q.options ?? null,
            image_options: q.image_options ?? null,
            items: q.items ?? null,
            categories: q.categories ?? null,
            rows: q.rows ?? null, // For matrix-rating
            columns: q.columns ?? null, // For matrix-rating
            correct_answers: q.correct_answers ?? null,
            validation: q.validation ?? null,
            explanation: q.explanation ? String(q.explanation).trim() : null,
            incorrect_explanation: q.incorrect_explanation ? String(q.incorrect_explanation).trim() : null,
            position: qidx,
          };
        }) : [],
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
  const { data: courseRow, error: courseErr } = await supabase
    .from("user_courses")
    .insert({
      user_id,
      course_id: sanitized.id,
      title: sanitized.title,
      description: sanitized.description,
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

  // Insert lessons to get their DB IDs
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
  
  // Insert lessons
  const insertResult = await supabase
    .from("user_lessons")
    .insert(lessonsToInsert);
    
  if (insertResult.error) {
    console.error("[store-course-from-ai] Failed to insert lessons", insertResult.error);
    return new Response(
      JSON.stringify({ error: "Failed to insert lessons", details: insertResult.error }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // Then fetch the inserted lessons to get their DB IDs
  const selectResult = await supabase
    .from("user_lessons")
    .select("id, lesson_id, position")
    .eq("course_id", course_id);
    
  if (selectResult.error) {
    console.error("[store-course-from-ai] Failed to fetch inserted lessons", selectResult.error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch inserted lessons", details: selectResult.error }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  
  // Type assertion to work around TypeScript errors with Supabase client
  const lessonRows = selectResult.data || [];
  
  // Map lesson_id to DB id for tutorial and question FK
  const lessonIdMap: Record<string, string> = {};
  for (const row of lessonRows) {
    lessonIdMap[row.lesson_id] = row.id;
  }
  
  // Insert tutorials using the lesson DB IDs (following the same pattern as questions)
  const tutorialsToInsert = [];
  for (const lesson of sanitized.lessons) {
    const lesson_id = lessonIdMap[lesson.id];
    if (!lesson_id) {
      console.error(`[store-course-from-ai] Missing DB ID for lesson ${lesson.id}`);
      continue;
    }
    
    for (const tutorial of lesson.tutorials) {
      tutorialsToInsert.push({
        lesson_id,
        tutorial_id: tutorial.id,
        title: tutorial.title,
        content: tutorial.content,
        key_points: tutorial.key_points,
        position: tutorial.position || 0,
      });
    }
  }
  
  if (tutorialsToInsert.length > 0) {
    console.log("[store-course-from-ai] Inserting tutorials:", tutorialsToInsert);
    const { error: tutorialErr } = await supabase
      .from("user_tutorials")
      .insert(tutorialsToInsert);
    
    if (tutorialErr) {
      console.error("[store-course-from-ai] Failed to insert tutorials", tutorialErr);
      return new Response(
        JSON.stringify({ error: "Failed to insert tutorials", details: tutorialErr }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  
  // Insert questions using the same lesson DB IDs
  const questionsToInsert = [];
  for (const lesson of sanitized.lessons) {
    const lesson_id = lessonIdMap[lesson.id];
    if (!lesson_id) {
      console.error(`[store-course-from-ai] Missing DB ID for lesson ${lesson.id}`);
      continue;
    }
    
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
