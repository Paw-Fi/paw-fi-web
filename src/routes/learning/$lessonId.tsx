"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { getLessonById } from "@/data/learning";
import SortQuestion from "@/components/learning/question-types/sort-question";
import SortCategoriesQuestion from "@/components/learning/question-types/sort-categories-question";
import ChoiceQuestion from "@/components/learning/question-types/choice-question";
import MatchQuestion from "@/components/learning/question-types/match-question";
import MatrixRatingQuestion from "@/components/learning/question-types/matrix-rating-question";
import TextInputQuestion from "@/components/learning/question-types/text-input-question";
import { ImageChoiceQuestion } from "@/components/learning/question-types/image-choice-question";
import { CompletionDisplay } from "@/components/learning/completion-display";
import catBottle from "@/assets/images/cat-bottle.svg";
import catCash from "@/assets/images/cat-cash.svg";
import bulbIcon from "@/assets/images/bulb.svg";

export const Route = createFileRoute("/learning/$lessonId")({
  component: LessonPage,
});

function LessonPage() {
  const navigate = useNavigate();
  const { lessonId } = Route.useParams();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);

  // Get lesson data from our data file
  const lesson = getLessonById(lessonId);

  // Fallback if lesson doesn't exist
  if (!lesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-purple-50 p-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-md">
          <h1 className="mb-4 text-xl font-bold">Lesson Not Found</h1>
          <p className="mb-6 text-gray-600">
            Sorry, the lesson you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate({ to: "/learning" })}
            className="bg-primary w-full rounded-full px-6 py-3 font-medium text-white hover:bg-purple-700"
          >
            Back to Learning
          </button>
        </div>
      </div>
    );
  }

  // If the lesson isn't unlocked, redirect back to learning
  if (!lesson.unlocked) {
    useEffect(() => {
      navigate({ to: "/learning" });
    }, [navigate]);
    return null;
  }

  const { questions } = lesson;
  const currentQuestion = questions[currentQuestionIndex];
  console.log(currentQuestion);
  const progressPercentage = isComplete ? 100 : (currentQuestionIndex / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Lesson completed
      setIsComplete(true);
      setEarnedXp(lesson.xp);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      navigate({ to: "/learning" });
    }
  };

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers({
      ...answers,
      [questionId]: answer,
    });
  };

  // Check if current question has been answered
  const isCurrentQuestionAnswered = () => {
    // If no answer yet, question is not answered
    if (!answers[currentQuestion.id]) return false;

    // For matrix rating questions, all items must be rated
    if (currentQuestion.type === "matrix-rating") {
      const matrixAnswer = answers[currentQuestion.id] as Record<
        string,
        string
      >;
      return currentQuestion.items.every((item) => !!matrixAnswer[item.id]);
    }
    
    // For text input questions, check if there is text and it's not empty
    if (currentQuestion.type === "text-input") {
      const textAnswer = answers[currentQuestion.id] as string;
      return !!textAnswer && textAnswer.trim() !== "";
    }

    // For other question types, just check if there's any answer
    return !!answers[currentQuestion.id];
  };

  return (
    <div className="bg-background flex min-h-screen px-4 py-8">
      <div className="flex flex-1 flex-col">
        {/* Back button and progress indicator */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6">
          <button
            onClick={handleBack}
            className="flex cursor-pointer items-center font-medium text-gray-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1"
            >
              <path
                d="M10 4L6 8L10 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Go Back
          </button>
        </div>
      </div>
      <div className="flex w-[40rem] flex-col">
        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-white">
          <div
            className="bg-success h-2 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        {/* Main content */}
        <div className="relative my-auto">
          {/* Help tips container*/}
          <div className="absolute top-0 right-0 w-72 translate-x-[105%]">
            {currentQuestion.helpTips && (
              <div className="rounded-3xl bg-green-50 p-6 shadow-md relative">
                {/* Triangle pointing from help tips toward main content */}
                <div 
                  className="absolute w-4 h-4 bg-green-50 left-[-8px] top-10 transform rotate-45"
                  style={{ boxShadow: '-2px 2px 2px rgba(0, 0, 0, 0.1)' }}
                ></div>
                <div className="mb-4 flex items-center">
                  <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                    <img src={bulbIcon} alt="Bulb" />
                  </div>
                  <h3 className="font-medium text-green-800">Help Tips:</h3>
                </div>

                {currentQuestion.type === "sort-categories" && (
                  <div>
                    {/* For category comparison help tips */}
                    {currentQuestion.categories.length === 2 && (
                      <div className="mb-4 grid grid-cols-2 gap-4">
                        <div className="text-center font-medium text-green-800">
                          {currentQuestion.categories[0].name}
                        </div>
                        <div className="text-center font-medium text-green-800">
                          {currentQuestion.categories[1].name}
                        </div>

                        {currentQuestion.helpTipsData?.map(
                          (
                            tip: { col1: string; col2: string },
                            index: number,
                          ) => (
                            <Fragment key={index}>
                              <div className="border-t border-green-200 pt-2 text-sm text-green-700">
                                {tip.col1}
                              </div>
                              <div className="border-t border-green-200 pt-2 text-sm text-green-700">
                                {tip.col2}
                              </div>
                            </Fragment>
                          ),
                        )}
                      </div>
                    )}

                    {/* Fallback for when we don't have structured tips data */}
                    {(!currentQuestion.helpTipsData ||
                      currentQuestion.categories.length !== 2) && (
                      <p className="text-sm text-green-700">
                        {currentQuestion.helpTips}
                      </p>
                    )}
                  </div>
                )}

                {currentQuestion.type !== "sort-categories" && (
                  <p className="text-sm whitespace-pre-line text-green-700">
                    {currentQuestion.helpTips}
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Question container  */}
          <div className="rounded-3xl bg-white p-8 shadow-md">
            {/* Render the appropriate question component based on type */}
            <div>
              <div className="mb-5 flex items-center gap-4 rounded-2xl border-1 border-gray-200 p-4">
                <img
                  src={currentQuestionIndex % 2 === 0 ? catBottle : catCash}
                  alt="Cat Cash"
                />
                <h2 className="mb-4 text-xl font-bold">
                  {currentQuestion.question}
                </h2>
              </div>

              {currentQuestion.type === "sort" && (
                <SortQuestion
                  question={currentQuestion}
                  onAnswer={(answer) =>
                    handleAnswer(currentQuestion.id, answer)
                  }
                  value={answers[currentQuestion.id]}
                />
              )}

              {currentQuestion.type === "sort-categories" && (
                <SortCategoriesQuestion
                  question={currentQuestion}
                  onAnswer={(answer) =>
                    handleAnswer(currentQuestion.id, answer)
                  }
                  value={answers[currentQuestion.id]}
                />
              )}

              {(currentQuestion.type === "mcq" ||
                currentQuestion.type === "scq") && (
                <ChoiceQuestion
                  question={currentQuestion}
                  onAnswer={(answer) =>
                    handleAnswer(currentQuestion.id, answer)
                  }
                  value={answers[currentQuestion.id]}
                />
              )}

              {currentQuestion.type === "match" && (
                <MatchQuestion
                  question={currentQuestion}
                  onAnswer={(answer) =>
                    handleAnswer(currentQuestion.id, answer)
                  }
                  value={answers[currentQuestion.id]}
                />
              )}

              {currentQuestion.type === "matrix-rating" && (
                <MatrixRatingQuestion
                  question={currentQuestion}
                  onAnswer={(answer) =>
                    handleAnswer(currentQuestion.id, answer)
                  }
                  value={answers[currentQuestion.id]}
                />
              )}

              {currentQuestion.type === "text-input" && (
                <TextInputQuestion
                  question={currentQuestion}
                  onAnswer={(value: string) => handleAnswer(currentQuestion.id, value)}
                  value={answers[currentQuestion.id] as string}
                />
              )}

              {currentQuestion.type === "image-choice" && (
                <ImageChoiceQuestion
                  question={currentQuestion}
                  onAnswer={(value: string) => handleAnswer(currentQuestion.id, value)}
                  value={answers[currentQuestion.id] as string}
                />
              )}

              {/* Next button */}
              <div className="mt-8">
                <Button
                  onClick={handleNext}
                  disabled={!isCurrentQuestionAnswered()}
                  variant="dark"
                  fullWidth
                >
                  {currentQuestionIndex < questions.length - 1
                    ? "Next"
                    : "Complete Lesson"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col"></div>

      {/* Completion message */}
      <CompletionDisplay
        isOpen={isComplete}
        onClose={() => navigate({ to: "/learning" })}
        title="Lesson Complete!"
        description="Great job! You've completed this lesson."
        reward={{
          amount: earnedXp,
          unit: "XP",
        }}
        actionText="Continue Learning"
      />
    </div>
  );
}

export default LessonPage;
