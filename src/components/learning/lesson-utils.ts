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

    case "sort-order":
      // For sorting questions, check against correct order
      if (Array.isArray(answer) && question.correctAnswers) {
        // Extract just the IDs from the answer if it contains objects with an id property
        // This handles both array of objects and array of strings
        const answerIds = answer.map((item) => typeof item === 'object' && item.id ? item.id : item);
        return JSON.stringify(answerIds) === JSON.stringify(question.correctAnswers);
      }
      return false;

    case "sort-categories":
      // For categorization, compare with correct categories
      if (question.correctAnswers && typeof answer === "object") {
        const userCategorization = answer as Record<string, string>; // item ID -> category ID
        
        // Create inverted user mapping for easier comparison
        const userCategoryItems: Record<string, string[]> = {};
        
        // Initialize all categories with empty arrays
        if (question.categories) {
          question.categories.forEach(category => {
            userCategoryItems[category.id] = [];
          });
        }
        
        // Group items by category
        Object.entries(userCategorization).forEach(([itemId, categoryId]) => {
          if (!userCategoryItems[categoryId]) {
            userCategoryItems[categoryId] = [];
          }
          userCategoryItems[categoryId].push(itemId);
        });
        
        // Now compare with expected correctAnswers
        return Object.entries(question.correctAnswers).every(([categoryId, expectedItems]) => {
          const userItems = userCategoryItems[categoryId] || [];
          
          // Check if all expected items for this category are present in user's answer
          if (Array.isArray(expectedItems)) {
            // First, check if the counts match
            if (expectedItems.length !== userItems.length) {
              return false;
            }
            
            // Then check if every expected item is in the user's items for this category
            return expectedItems.every(expectedItemId => 
              userItems.includes(expectedItemId as string)
            );
          }
          return false;
        });
      }
      return false;

    case "match":
      // For matching, compare with correct matches
      if (question.correctAnswers && typeof answer === "object") {
        const userMatches = answer as Record<string, string>;
        const correctMatches = question.correctMatches || question.correctAnswers;
        
        // Normalize the data formats
        const correctEntries = Object.entries(correctMatches);
        const userEntries = Object.entries(userMatches);
        
        // If lengths don't match, can't be correct
        if (correctEntries.length !== userEntries.length) {
          return false;
        }
        
        // Check if all correct pairs exist in user matches (in either direction)
        return correctEntries.every(([itemId, matchId]) => {
          // Check direct match (item → match)
          if (userMatches[itemId] === matchId) {
            return true;
          }
          
          // Check reverse match (match → item) in case the UI swapped them
          const reversePair = userEntries.find(
            ([userItemId, userMatchId]) => userItemId === matchId && userMatchId === itemId
          );
          
          return !!reversePair;
        });
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
      // For text input, validate input against rules
      const textInputQuestion = question as TextInputQuestionType;
      const userText = answer as string;
      
      // Check if the user provided any text at all
      if (!userText || userText.trim() === "") {
        return false;
      }
      
      // First, always check pattern validation if present
      // This applies to both open-ended and specific-answer questions
      if (textInputQuestion.validation?.pattern) {
        try {
          const regex = new RegExp(textInputQuestion.validation.pattern);
          if (!regex.test(userText.trim())) {
            return false;
          }
        } catch (e) {
          // If regex is invalid, log error and continue with other validations
          console.error("Invalid regex pattern:", textInputQuestion.validation.pattern);
        }
      }
      
      // If there's no correctAnswer defined, this is an open-ended question
      // For open-ended questions, we've already checked the pattern if present
      if (!textInputQuestion.correctAnswer) {
        // Also validate minimum text length if specified
        const minLength = textInputQuestion.validation?.min;
        if (minLength && userText.trim().length < minLength) {
          return false;
        }
        // The answer is valid if it passed all validations above
        return true;
      }
      
      // Below logic applies when there is a specific correct answer
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
