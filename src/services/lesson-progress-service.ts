/**
 * Lesson Progress Service
 * 
 * Manages user progress through lessons, tracking tutorial completion and quiz attempts
 */

// Storage keys
const TUTORIAL_PROGRESS_KEY = 'tutorialProgress';
const QUIZ_ATTEMPTS_KEY = 'quizAttempts';

// Types
export interface TutorialProgress {
  userId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
  lastPosition: number; // Scroll position or section
  readingProgress: number; // 0-100%
  lastUpdated: string;
}

export interface QuizAttempt {
  userId: string;
  courseId: string;
  lessonId: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  completed: boolean;
  startTime: string;
  endTime?: string;
  answers: Record<string, any>;
}

// Tutorial progress functions
export function saveTutorialProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  readingProgress: number,
  position: number = 0,
  completed: boolean = false
): void {
  try {
    const progressData: TutorialProgress = {
      userId,
      courseId,
      lessonId,
      completed,
      lastPosition: position,
      readingProgress,
      lastUpdated: new Date().toISOString()
    };
    
    const existingData = getTutorialProgressList();
    
    // Find and update existing record or add new one
    const index = existingData.findIndex(
      item => item.userId === userId && item.courseId === courseId && item.lessonId === lessonId
    );
    
    if (index >= 0) {
      existingData[index] = progressData;
    } else {
      existingData.push(progressData);
    }
    
    localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(existingData));
  } catch (error) {
    console.error('Error saving tutorial progress:', error);
  }
}

export function getTutorialProgress(
  userId: string,
  courseId: string,
  lessonId: string
): TutorialProgress | null {
  try {
    const progressList = getTutorialProgressList();
    return progressList.find(
      item => item.userId === userId && item.courseId === courseId && item.lessonId === lessonId
    ) || null;
  } catch (error) {
    console.error('Error getting tutorial progress:', error);
    return null;
  }
}

export function getTutorialProgressList(): TutorialProgress[] {
  try {
    const data = localStorage.getItem(TUTORIAL_PROGRESS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting tutorial progress list:', error);
    return [];
  }
}

export function markTutorialComplete(
  userId: string,
  courseId: string,
  lessonId: string
): void {
  saveTutorialProgress(userId, courseId, lessonId, 100, 0, true);
}

// Quiz attempts functions
export function saveQuizAttempt(attempt: QuizAttempt): void {
  try {
    const existingAttempts = getQuizAttempts(attempt.userId, attempt.courseId, attempt.lessonId);
    existingAttempts.push(attempt);
    
    const allAttempts = getAllQuizAttempts();
    
    // Filter out previous attempts for this lesson
    const filteredAttempts = allAttempts.filter(
      item => !(item.userId === attempt.userId && 
                item.courseId === attempt.courseId && 
                item.lessonId === attempt.lessonId)
    );
    
    // Add updated attempts
    const updatedAttempts = [...filteredAttempts, ...existingAttempts];
    
    localStorage.setItem(QUIZ_ATTEMPTS_KEY, JSON.stringify(updatedAttempts));
  } catch (error) {
    console.error('Error saving quiz attempt:', error);
  }
}

export function getQuizAttempts(
  userId: string,
  courseId: string,
  lessonId: string
): QuizAttempt[] {
  try {
    const allAttempts = getAllQuizAttempts();
    return allAttempts.filter(
      attempt => attempt.userId === userId && 
                attempt.courseId === courseId && 
                attempt.lessonId === lessonId
    ).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  } catch (error) {
    console.error('Error getting quiz attempts:', error);
    return [];
  }
}

export function getAllQuizAttempts(): QuizAttempt[] {
  try {
    const data = localStorage.getItem(QUIZ_ATTEMPTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting all quiz attempts:', error);
    return [];
  }
}

export function getLatestQuizAttempt(
  userId: string,
  courseId: string,
  lessonId: string
): QuizAttempt | null {
  const attempts = getQuizAttempts(userId, courseId, lessonId);
  return attempts.length > 0 ? attempts[0] : null;
}

export function hasCompletedTutorial(
  userId: string,
  courseId: string,
  lessonId: string
): boolean {
  const progress = getTutorialProgress(userId, courseId, lessonId);
  return progress?.completed || false;
}

export function hasPassedQuiz(
  userId: string,
  courseId: string,
  lessonId: string,
  passingScore: number = 70
): boolean {
  const latestAttempt = getLatestQuizAttempt(userId, courseId, lessonId);
  if (!latestAttempt || !latestAttempt.completed) return false;
  
  const scorePercentage = (latestAttempt.score / latestAttempt.maxScore) * 100;
  return scorePercentage >= passingScore;
}

// Helper to get overall lesson progress
export function getLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string
): { tutorialComplete: boolean; quizPassed: boolean; overallProgress: number } {
  const tutorialComplete = hasCompletedTutorial(userId, courseId, lessonId);
  const quizPassed = hasPassedQuiz(userId, courseId, lessonId);
  
  let overallProgress = 0;
  if (tutorialComplete) overallProgress += 50;
  if (quizPassed) overallProgress += 50;
  
  return {
    tutorialComplete,
    quizPassed,
    overallProgress
  };
}
