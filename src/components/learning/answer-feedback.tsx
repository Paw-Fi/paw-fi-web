"use client";

interface AnswerFeedbackProps {
  isCorrect: boolean | null;
  explanation?: string;
  incorrect_explanation?: string;
  countdownSeconds: number;
  showExplanation: boolean;
  showFeedback: boolean;
}

export function AnswerFeedback({ 
  isCorrect, 
  explanation, 
  incorrect_explanation,
  countdownSeconds, 
  showExplanation ,
  showFeedback
}: AnswerFeedbackProps) {
  // Don't show anything if feedback shouldn't be displayed yet
  if (!showFeedback) return null;
  if (isCorrect === null) return null;

  // Show correct feedback only when answer is correct and explanation should be shown
  if (isCorrect === true && showExplanation) {
    return (
      <div className="mt-4 p-4 bg-quiz-success-bg border border-quiz-success-border rounded-lg text-quiz-success-text transition-all duration-300 ease-in-out animate-fadeIn">
        <div className="flex items-center mb-2">
          <svg className="w-6 h-6 mr-2 text-quiz-success-icon animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold text-lg">Correct!</span>
        </div>
        <div className="bg-question-bg p-3 rounded-md shadow-sm">
          <p className="whitespace-pre-line text-question-text">{explanation}</p>
        </div>
      </div>
    );
  }

  // Show incorrect feedback only when answer is explicitly false
  if (isCorrect === false) {
    return (
      <div className="mt-4 p-4 bg-quiz-error-bg border border-quiz-error-border rounded-lg text-quiz-error-text transition-all duration-300 ease-in-out animate-fadeIn">
        <div className="flex items-center mb-2">
          <svg className="w-6 h-6 mr-2 text-quiz-error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="font-semibold text-lg">
            Incorrect. {countdownSeconds > 0 ? (
              <span>Try again in {countdownSeconds} seconds</span>
            ) : (
              <span>You can try again now</span>
            )}
          </span>
        </div>
        <p className="text-quiz-error-text">{incorrect_explanation ?? "Take a moment to review your answer and try again."}</p>
      </div>
    );
  }

  return null;
}
