"use client";

import type { Question } from "@/types/learning.types";


/**
 * Checks if all answers in a lesson are correct
 */
export function areAllAnswersCorrect(questions: Question[], answers: Record<string, any>): boolean {
  // Loop through all questions and verify answers
  return questions.every((question) => {
    const userAnswer = answers[question.id];

    // If no answer, it's incorrect
    if (userAnswer === undefined || userAnswer === null) {
      console.log(`No answer for question ${question.id}`);
      return false;
    }

    return isAnswerCorrect(question, userAnswer);
  });
}

/**
 * Checks if a specific answer to a question is correct
 */
export function isAnswerCorrect(question: Question, answer: any): boolean {
  // If no answer, it's incorrect
  if (answer === undefined || answer === null) {
    return false;
  }

  switch (question.type) {
    case "mcq":
      // For multiple choice, all selected options should be correct
      if (Array.isArray(answer)) {
        const correctOptions = question.options?.filter((opt: any) => opt.isCorrect)
          .map((opt: any) => opt.id);
        const userSelected = answer as string[];

        if (!correctOptions || correctOptions.length === 0) return false;

        return (
          correctOptions.every((id: string) => userSelected.includes(id)) &&
          userSelected.every((id: string) => correctOptions.includes(id))
        );
      }
      return false;

    case "scq":
    case "image-choice":
      // For single choice, find the correct option
      const correctOption = question.options?.find((opt: any) => opt.isCorrect === true);
      if (!correctOption) {
        return false;
      }
      return answer === correctOption.id;

    case "sort":
      // For sorting questions, check against correct order
      if (Array.isArray(answer) && question.correctOrder) {
        return JSON.stringify(answer) === JSON.stringify(question.correctOrder);
      }
      return false;

    case "sort-categories":
      // For categorization, compare with correct categories
      if (question.correctCategories && typeof answer === "object") {
        const userCategorization = answer as Record<string, string>;
        return Object.entries(question.correctCategories).every(
          ([itemId, categoryId]) => userCategorization[itemId] === categoryId
        );
      }
      return false;

    case "match":
      // For matching, compare with correct matches
      if (question.correctMatches && typeof answer === "object") {
        const userMatches = answer as Record<string, string>;
        return Object.entries(question.correctMatches).every(
          ([itemId, matchId]) => userMatches[itemId] === matchId
        );
      }
      return false;

    case "matrix-rating":
      // For matrix rating, compare with correct ratings
      if (question.correctRatings && typeof answer === "object") {
        const userRatings = answer as Record<string, string>;
        return Object.entries(question.correctRatings).every(
          ([itemId, ratingId]) => userRatings[itemId] === ratingId
        );
      }
      return false;

    case "text-input":
      // For text input, check against accepted answers
      if (question.correctAnswer) {
        const textInputQuestion = question as TextInputQuestionType;
        const userText = answer as string;
        
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
      return false;

    default:
      return false;
  }
}

/**
 * Checks if the current question has been answered
 */
export function isCurrentQuestionAnswered(currentQuestion: Question, answer: any): boolean {
  // If no answer yet, question is not answered
  if (!answer) return false;

  // For matrix rating questions, all items must be rated
  if (currentQuestion.type === "matrix-rating") {
    const matrixAnswer = answer as Record<string, string>;
    return currentQuestion.items?.every((item) => !!matrixAnswer[item.id]);
  }

  // For text input questions, check if there is text and it's not empty
  if (currentQuestion.type === "text-input") {
    const textAnswer = answer as string;
    return !!textAnswer && textAnswer.trim() !== "";
  }

  // For other question types, just check if there's any answer
  return !!answer;
}
