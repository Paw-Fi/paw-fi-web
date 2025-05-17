"use client";

interface AnswerFeedbackProps {
  isCorrect: boolean | null;
  explanation?: string;
  incorrectExplanation?: string;
  countdownSeconds: number;
  showExplanation: boolean;
  showFeedback: boolean;
}

export function AnswerFeedback({ 
  isCorrect, 
  explanation, 
  incorrectExplanation,
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
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 transition-all duration-300 ease-in-out animate-fadeIn">
        <div className="flex items-center mb-2">
          <svg className="w-6 h-6 mr-2 text-green-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold text-lg">Correct!</span>
        </div>
        <div className="bg-white p-3 rounded-md shadow-sm">
          <p className="whitespace-pre-line text-gray-800">{explanation}</p>
        </div>
      </div>
    );
  }

  // Show incorrect feedback only when answer is explicitly false
  if (isCorrect === false) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 transition-all duration-300 ease-in-out animate-fadeIn">
        <div className="flex items-center mb-2">
          <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
        <p className="text-gray-700">{incorrectExplanation ?? "Take a moment to review your answer and try again."}</p>
      </div>
    );
  }

  return null;
}
