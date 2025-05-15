"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { getLessonById, getMockLessonById } from "@/data/lessons";
import SortQuestion from "@/components/learning/question-types/sort-question";
import SortCategoriesQuestion from "@/components/learning/question-types/sort-categories-question";
import ChoiceQuestion from "@/components/learning/question-types/choice-question";
import MatchQuestion from "@/components/learning/question-types/match-question";
import MatrixRatingQuestion from "@/components/learning/question-types/matrix-rating-question";
import TextInputQuestion from "@/components/learning/question-types/text-input-question";
import type { TextInputQuestion as TextInputQuestionType } from "@/types/learning.types";
import { ImageChoiceQuestion } from "@/components/learning/question-types/image-choice-question";
import { CompletionDisplay } from "@/components/learning/completion-display";
import catBottle from "@/assets/images/lessons/cat-black.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catPig from "@/assets/images/lessons/cat-pig.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

export const Route = createFileRoute("/learning/$lessonId")({
  component: LessonPage,
});

const catIcons=[catBottle,catCash,catCoin,catPig]

function LessonPage() {
  const navigate = useNavigate();
  const { lessonId } = Route.useParams();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isSuccess, setIsSuccess] = useState(true); // Track if all answers are correct
  const [earnedXp, setEarnedXp] = useState(0);

  // Get lesson data from our data file
  // const lesson = getLessonById(lessonId);
  const lesson = getMockLessonById(lessonId);

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
  const progressPercentage = isComplete
    ? 100
    : (currentQuestionIndex / questions.length) * 100;

  // Function to check if all answers are correct
  const areAllAnswersCorrect = () => {

    // Loop through all questions and verify answers
    return questions.every((question) => {
      const userAnswer = answers[question.id];

      // If no answer, it's incorrect
      if (userAnswer === undefined || userAnswer === null) {
        console.log(`No answer for question ${question.id}`);
        return false;
      }

      switch (question.type) {
        case "mcq":
          // For multiple choice, all selected options should be correct
          if (Array.isArray(userAnswer)) {
            const correctOptions = question.options
              .filter((opt) => opt.isCorrect)
              .map((opt) => opt.id);
            const userSelected = userAnswer as string[];

            // Check if user selected all correct options and no incorrect ones
            return (
              correctOptions.every((id) => userSelected.includes(id)) &&
              userSelected.every((id) => correctOptions.includes(id))
            );
          }
          return false;

        case "scq":
        case "image-choice":
          // For single choice, find the correct option
          const correctOption = question.options.find((opt) => opt.isCorrect === true);
          if (!correctOption) {
            console.log(`No correct option found for question ${question.id}`);
            return false;
          }

      
          
          // Direct string comparison for single-choice questions
          return userAnswer === correctOption.id;

        case "sort":
          // For sort questions, compare with correct order
          return (
            JSON.stringify(userAnswer) === JSON.stringify(question.correctOrder)
          );

        case "sort-categories":
          // For category sorting, compare with correct categories
          return (
            JSON.stringify(userAnswer) ===
            JSON.stringify(question.correctCategories)
          );

        case "match":
          // For matching, compare with correct matches
          return (
            JSON.stringify(userAnswer) ===
            JSON.stringify(question.correctMatches)
          );

        case "matrix-rating":
          // For matrix rating, compare with correct ratings
          return (
            JSON.stringify(userAnswer) ===
            JSON.stringify(question.correctRatings)
          );

        case "text-input": {
          const textInputQuestion = question as TextInputQuestionType;
          const userText = userAnswer as string;
          
          if (!userText || userText.trim() === "") {
            return false;
          }
          
          // If there's no correctAnswer defined, we can't validate
          if (!textInputQuestion.correctAnswer) {
            return false;
          }
          
          const isCaseSensitive = textInputQuestion.validation?.caseSensitive ?? false;
          const normalizedUserAnswer = isCaseSensitive ? userText.trim() : userText.trim().toLowerCase();
          
          // Check against array of possible answers
          if (Array.isArray(textInputQuestion.correctAnswer)) {
            return textInputQuestion.correctAnswer.some((answer: string) => {
              const normalizedCorrectAnswer = isCaseSensitive ? answer.trim() : answer.trim().toLowerCase();
              return normalizedUserAnswer === normalizedCorrectAnswer;
            });
          }
          
          // Check against single correct answer
          const normalizedCorrectAnswer = isCaseSensitive 
            ? textInputQuestion.correctAnswer.trim() 
            : textInputQuestion.correctAnswer.trim().toLowerCase();
          
          return normalizedUserAnswer === normalizedCorrectAnswer;
        }

        default:
          return false;
      }
    });
  };

  const handleRetry = () => {
    // Reset to first question and clear answers
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsComplete(false);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Check if all answers are correct before completing
      const allCorrect = areAllAnswersCorrect();
      setIsSuccess(allCorrect);

      // Lesson completed
      setIsComplete(true);

      // Only award XP if all answers are correct
      if (allCorrect) {
        setEarnedXp(lesson.xp);
      }
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
    <div className="bg-background flex min-h-screen flex-col px-4 py-8 lg:flex-row">
      <div className="top-1 left-0 flex flex-1 flex-col">
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
      <div className="flex lg:w-[40rem] flex-col gap-4">
        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-white">
          <div
            className="bg-success h-2 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        {/* Main content */}
        <div className="relative my-auto">
       
          {/* Question container  */}
          <div className="rounded-3xl bg-white p-8 shadow-md">
            {/* Render the appropriate question component based on type */}
            <div>
              <div className="mb-5 flex items-center gap-4 rounded-2xl border-1 border-gray-200 p-4">
                <img
                  src={catIcons[currentQuestionIndex % catIcons.length]}
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
                  onAnswer={(value: string) =>
                    handleAnswer(currentQuestion.id, value)
                  }
                  value={answers[currentQuestion.id] as string}
                />
              )}

              {currentQuestion.type === "image-choice" && (
                <ImageChoiceQuestion
                  question={currentQuestion}
                  onAnswer={(value: string) =>
                    handleAnswer(currentQuestion.id, value)
                  }
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
             {/* Help tips container*/}
             <div className="top-0 right-0 block mx-auto lg:w-72 lg:translate-x-[105%] lg:absolute mt-8 lg:mt-0">
            {currentQuestion.helpTips && (
              <div className="relative rounded-3xl bg-green-50 p-6 shadow-md">
                {/* Triangle pointing from help tips toward main content */}
                <div
                  className="hidden lg:block lg:absolute top-10 left-[-8px] h-4 w-4 rotate-45 transform bg-green-50"
                  style={{ boxShadow: "-2px 2px 2px rgba(0, 0, 0, 0.1)" }}
                ></div>
                <div className="mb-4 flex items-center">
                  <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-success">
                   <FontAwesomeIcon icon={faLightbulb} className="text-white" />
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
        </div>
      </div>
      <div className="flex flex-1 flex-col"></div>

      {/* Completion message - success case */}
      {isSuccess ? (
        <CompletionDisplay
          isOpen={isComplete}
          onClose={() => navigate({ to: "/learning" })}
          description="Great job! You've completed this lesson."
          lessonTitle={`Lesson ${lessonId}: ${lesson?.title}`}
          reward={{
            amount: earnedXp,
            unit: "XP",
          }}
          rewardsProgress={25}
          nextSteps={{
            challenges: {
              title: "Take Challenges",
              description: "Earn XP",
            },
            badges: {
              title: "Course Badges",
              description: "Earn a badge",
            },
          }}
          actionText="Continue Learning"
          isSuccess
        />
      ) : (
        // Try again screen when answers are incorrect
        <CompletionDisplay
          isOpen={isComplete}
          onClose={() => navigate({ to: "/learning" })}
          title="Keep Learning"
          description={`Some of your answers were incorrect in Lesson ${lessonId}: ${lesson?.title}.`}
          // No reward since they didn't pass
          actionText="Go to Home Page"
          // Custom handler for retry button
          onCustomAction={() => handleRetry()}
          // Use a different emoji for the retry screen - no emoji for retry screen
          emoji=""
          isSuccess={false}
        />
      )}
    </div>
  );
}

export default LessonPage;
