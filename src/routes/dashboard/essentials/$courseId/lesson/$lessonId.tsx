import { createFileRoute } from "@tanstack/react-router";
import LessonPage from "../../../learning/$courseId/lesson/$lessonId";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import allCourses  from "@/data/basic-lessons.json"; // Assuming this is where your course data is

export const Route = createFileRoute("/dashboard/essentials/$courseId/lesson/$lessonId")({
  component: EssentialsLessonPage,
  loader: ({ params }) => {
    const course = allCourses.find(c => c.course_id === params.courseId);
    if (!course) {
      throw new Error("Course not found");
    }
    const lesson = course.lessons.find(l => l.id === params.lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }
    return { course, lesson };
  },
  head: ({ params, loaderData }) => {
    const { course, lesson } = loaderData;
    const pageUrl = getCanonicalUrl(`/dashboard/essentials/${params.courseId}/lesson/${params.lessonId}`);
    const title = `${lesson.title} | ${course.title} - Moneko Learning`;
    const description = lesson.description || `Learn about ${lesson.title} as part of the ${course.title} course on Moneko.`;
    const keywords = `${lesson.title}, ${course.title}, ${course.category}, financial education, Moneko, online lesson`;
    const imageUrl = course.image || "https://moneko.io/og-img.png"; // Use course image if available

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "name": lesson.title,
      "description": description,
      "url": pageUrl,
      "isPartOf": {
        "@type": "Course",
        "name": course.title,
        "url": getCanonicalUrl(`/dashboard/essentials/${course.course_id}`)
      },
      "provider": {
        "@type": "Organization",
        "name": "Moneko",
        "url": "https://moneko.io"
      }
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

function EssentialsLessonPage() {
  // Pass dataSource='local' to LessonPage
  return <LessonPage dataSource="local" />;
}
