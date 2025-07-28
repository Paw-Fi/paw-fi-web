-- 1. User Courses Table
CREATE TABLE IF NOT EXISTS public.user_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Lessons Table
CREATE TABLE IF NOT EXISTS public.user_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.user_courses(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    xp INTEGER,
    unlocked BOOLEAN DEFAULT FALSE,
    icon TEXT,
    position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS public.user_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.user_lessons(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    type TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB,
    image_options JSONB,
    items JSONB,
    categories JSONB,
    correct_answers JSONB,
    validation JSONB,
    explanation TEXT,
    incorrect_explanation TEXT,
    help_tips TEXT,
    position INTEGER,
    columns jsonb null,
    rows jsonb null,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tutorials Table
CREATE TABLE IF NOT EXISTS public.user_tutorials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.user_lessons(id) ON DELETE CASCADE,
    tutorial_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    key_points JSONB, -- Storing an array of key points as JSONB
    position INTEGER, -- Added back the position column for ordering tutorials
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_course_id ON public.user_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_user_questions_lesson_id ON public.user_questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorials_lesson_id ON public.user_tutorials(lesson_id);