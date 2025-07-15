import { Navigate, createFileRoute } from "@tanstack/react-router";
import { LearningPage } from "../learning";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import basicLessonsData from "@/data/basic-lessons.json";


export const Route = createFileRoute("/dashboard/essentials/")({
  component: Essentials,
  head: () => {
    const pageUrl = getCanonicalUrl('/dashboard/essentials');
    const meta = seo({
      title: "Moneko: Essential Financial Lessons",
      description: "Master the essentials of personal finance with Moneko's curated lessons on budgeting, investing, and financial planning.",
      keywords: "financial essentials, basic finance lessons, Moneko, financial education, money basics, personal finance fundamentals",
      image: "https://moneko.io/og-img.png",
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

function Essentials() {
  // Pass source='local' as a prop to LearningPage
  return <Navigate to={`/dashboard/essentials/${basicLessonsData.course_id}/lesson/${basicLessonsData.lessons[0].lesson_id}`} />
}
