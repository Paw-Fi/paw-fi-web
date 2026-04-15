import { createFileRoute } from "@tanstack/react-router";
import CourseDetailPage from "../../learning/$courseId";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import allCourses from "@/data/basic-lessons.json"; // Assuming this is where your course data is

export const Route = createFileRoute("/dashboard/essentials/$courseId/")({
  component: EssentialsCourseDetailPage,
  loader: ({ params }) => {
    const course = allCourses.find((c) => c.course_id === params.courseId);
    if (!course) {
      throw new Error("Course not found");
    }
    return { course };
  },
  head: ({ params, loaderData }) => {
    const { course } = loaderData;
    const pageUrl = getCanonicalUrl(`/dashboard/learning/${params.courseId}`);
    const title = `${course.title} | Moneko Learning`;
    const description = course.description;
    const keywords = `${course.title}, ${course.category}, financial education, Moneko, online course, ${course.tags.join(", ")}`;
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
      "@type": "Course",
      name: course.title,
      description: course.description,
      provider: {
        "@type": "Organization",
        name: "Moneko",
        url: "https://moneko.io",
      },
      url: pageUrl,
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: `PT${course.lessons.length}H`, // Assuming 1 hour per lesson for simplicity
        instructor: {
          "@type": "Person",
          name: "Moneko Experts",
        },
      },
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function EssentialsCourseDetailPage() {
  // Pass dataSource='local' to CourseDetailPage
  return <CourseDetailPage dataSource="local" />;
}
