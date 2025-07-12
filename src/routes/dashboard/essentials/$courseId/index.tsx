import { createFileRoute } from "@tanstack/react-router";
import CourseDetailPage from "../../learning/$courseId";
import { seo } from "@/utils/seo";

export const Route = createFileRoute("/dashboard/essentials/$courseId/")({
  component: EssentialsCourseDetailPage,
  head: ({ params }: { params: { courseId: string } }) => {
    let courseTitle = 'Essential Financial Lessons'; // Default title
    let courseDescription = 'Master the fundamentals of personal finance with these essential lessons.'; // Default description
    const siteOgImage = 'https://moneko.io/og-img.png'; // Default site OG image

    const pageUrl = `https://moneko.io/essentials/${params.courseId}`;
    const keywords = `${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education, Moneko, online course`;

    const meta = seo({
      title: `${courseTitle} | Moneko Learning`,
      description: courseDescription,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

function EssentialsCourseDetailPage() {
  // Pass dataSource='local' to CourseDetailPage
  return <CourseDetailPage dataSource="local" />
}
