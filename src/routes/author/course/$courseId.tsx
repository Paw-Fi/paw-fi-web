import { createFileRoute } from '@tanstack/react-router';

function CourseEditorPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1>Course Editor - Coming Soon</h1>
      <p>This feature is under development.</p>
    </div>
  );
}

export const Route = createFileRoute('/author/course/$courseId')({
  component: CourseEditorPage,
});
