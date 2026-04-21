import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LearningPage } from "../learning";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import basicLessonsData from "@/data/basic-lessons.json";

export const Route = createFileRoute("/dashboard/essentials/")({
  component: Essentials,
  head: () => {
    const canonicalUrl = getCanonicalUrl("/dashboard/essentials/");
    const title = "Financial Education - Expert Fundamentals Course | Moneko";
    const description =
      "Master personal finance fundamentals with expert essentials course. Learn budgeting, investing & money management basics.";
    const keywords =
      "financial essentials course, personal finance fundamentals, money basics, budgeting basics, investing fundamentals, financial literacy, expert financial education, essential money skills";

    const meta = seo({
      title,
      description,
      keywords,
      image: "https://moneko.io/og-img.png",
      url: canonicalUrl,
    });

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: canonicalUrl,
        },
      ],
    };
  },
});

function Essentials() {
  // Pass source='local' as a prop to LearningPage
  return (
    <Navigate
      to={`/dashboard/learning/${basicLessonsData.course_id}/lesson/${basicLessonsData.lessons[0].lesson_id}`}
    />
  );
}
