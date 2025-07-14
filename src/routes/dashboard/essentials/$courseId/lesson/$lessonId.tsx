import { createFileRoute } from "@tanstack/react-router";
import LessonPage from "../../../learning/$courseId/lesson/$lessonId";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

export const Route = createFileRoute("/dashboard/essentials/$courseId/lesson/$lessonId")({
  component: EssentialsLessonPage,
  head: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    let lessonTitle = "Essential Lesson";
    let lessonDescription = "Explore this essential financial lesson on Moneko.";
    let courseTitle = "Financial Essentials";
    const siteOgImage = "https://moneko.io/og-img.png"; // Default site OG image

    const pageUrl = getCanonicalUrl(`/dashboard/essentials/${params.courseId}/lesson/${params.lessonId}`);
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, "")}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, "")}, financial education, Moneko`;

    const meta = seo({
      title: `${lessonTitle} | ${courseTitle} - Moneko Essentials`,
      description: lessonDescription,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl
        }
      ]
    };
  },
});

function EssentialsLessonPage() {
  // Pass dataSource='local' to LessonPage
  return <LessonPage dataSource="local" />;
}
