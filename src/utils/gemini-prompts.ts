/**
 * Specialized prompts for the Gemini API to ensure proper lesson generation
 */

/**
 * Prompt to explicitly request JSON lesson data after a conversation
 * This is sent when the user has provided enough information to generate lessons
 */
export const generateLessonsPrompt = `
Based on our conversation so far, please generate a personalized curriculum of 3-5 beginner-level lessons that are interactive, visual, and simple to grasp.

The lessons should be returned in the following JSON format:
{
  "id": "unique-id-for-lesson-set",
  "title": "Descriptive Title for Lesson Set",
  "description": "Brief description of what the user will learn",
  "xp": 75,
  "unlocked": true,
  "icon": "🚗",
  "questions": [
    {
      "id": "question-1",
      "type": "scq",
      "question": "Question text here?",
      "options": [
        { "id": "opt-1", "content": "Option 1", "isCorrect": true },
        { "id": "opt-2", "content": "Option 2", "isCorrect": false },
        { "id": "opt-3", "content": "Option 3", "isCorrect": false },
        { "id": "opt-4", "content": "Option 4", "isCorrect": false }
      ],
      "explanation": "Explanation of the correct answer"
    },
    {
      "id": "question-2",
      "type": "mcq",
      "question": "Multiple choice question text here?",
      "options": [
        { "id": "opt-1", "content": "Option 1", "isCorrect": true },
        { "id": "opt-2", "content": "Option 2", "isCorrect": false },
        { "id": "opt-3", "content": "Option 3", "isCorrect": true },
        { "id": "opt-4", "content": "Option 4", "isCorrect": false }
      ],
      "explanation": "Explanation of the correct answers"
    }
  ]
}

Please include at least 5 questions per lesson, with a variety of question types (scq, mcq, match, text-input).
Make sure the JSON is properly formatted and complete.
`;

/**
 * Prompt to explicitly request JSON lesson data when the user asks for it directly
 */
export const directLessonGenerationPrompt = `
I'll generate some personalized finance lessons for you right away. Please provide the JSON lesson data in the following format:

{
  "id": "unique-id-for-lesson-set",
  "title": "Descriptive Title for Lesson Set",
  "description": "Brief description of what the user will learn",
  "xp": 75,
  "unlocked": true,
  "icon": "💰",
  "questions": [
    {
      "id": "question-1",
      "type": "scq",
      "question": "Question text here?",
      "options": [
        { "id": "opt-1", "content": "Option 1", "isCorrect": true },
        { "id": "opt-2", "content": "Option 2", "isCorrect": false },
        { "id": "opt-3", "content": "Option 3", "isCorrect": false },
        { "id": "opt-4", "content": "Option 4", "isCorrect": false }
      ],
      "explanation": "Explanation of the correct answer"
    }
  ]
}

The lessons should be tailored to beginners, focusing on basic financial concepts, budgeting, and saving strategies.
Include at least 5-8 questions per lesson, with a variety of question types.
`;
