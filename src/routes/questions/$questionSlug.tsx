import React from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { FinancialQuestionPage } from "@/components/financial-questions/financial-question-page";
import financialQuestionsData from "@/data/financial-questions.json";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";

// Type definitions
interface FinancialQuestionData {
  question: string;
  keywords: string;
  title: string;
  description: string;
  urgency: "high" | "medium" | "low";
  content: {
    problem: string;
    solution: string;
    call_to_action: string;
    benefits: string[];
  };
}

interface CategoryData {
  category: string;
  description: string;
  questions: Record<string, FinancialQuestionData>;
}

// Helper function to find question data
function findQuestionData(
  questionSlug: string,
): { questionData: FinancialQuestionData; categoryName: string } | null {
  for (const [categoryKey, categoryData] of Object.entries(
    financialQuestionsData as Record<string, CategoryData>,
  )) {
    const questionData = categoryData.questions[questionSlug];
    if (questionData) {
      return {
        questionData,
        categoryName: categoryData.category,
      };
    }
  }
  return null;
}

export const Route = createFileRoute("/questions/$questionSlug")({
  component: QuestionPageComponent,
  beforeLoad: ({ params }) => {
    const result = findQuestionData(params.questionSlug);
    if (!result) {
      throw notFound();
    }
    return result;
  },
  loader: ({ params }) => {
    return findQuestionData(params.questionSlug);
  },
  head: ({ params }) => {
    const result = findQuestionData(params.questionSlug);
    if (!result) return {};

    const { questionData, categoryName } = result;
    const canonicalUrl = getCanonicalUrl(`/questions/${params.questionSlug}`);

    const meta = seo({
      title: questionData.title,
      description: questionData.description,
      keywords: questionData.keywords,
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

function QuestionPageComponent() {
  const { questionSlug } = Route.useParams();
  const result = Route.useLoaderData();

  if (!result) {
    return (
      <div className="bg-moneko-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-foreground mb-4 text-2xl font-bold">
            Question Not Found
          </h1>
          <p className="text-muted-foreground">
            The financial question you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  const { questionData, categoryName } = result;
  const canonicalUrl = getCanonicalUrl(`/questions/${questionSlug}`);

  return (
    <FinancialQuestionPage
      questionData={questionData}
      category={categoryName}
      canonicalUrl={canonicalUrl}
      questionSlug={questionSlug}
    />
  );
}
