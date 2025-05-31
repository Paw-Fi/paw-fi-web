"use client";

import { createFileRoute, useParams, useRouter } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faCheckCircle, faChartBar, faArrowRight, faArrowLeft, faTrophy } from '@fortawesome/free-solid-svg-icons';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { LessonSkeleton } from '@/components/learning/lesson-skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses } from '@/services/course-service';
import { getLessonById } from '@/data/lessons';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from '@/utils/seo';
import { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { 
  getLatestQuizAttempt, 
  getLessonProgress, 
  hasCompletedTutorial, 
  hasPassedQuiz 
} from '@/services/lesson-progress-service';

export const Route = createFileRoute("/learning/$courseId/lesson/$lessonId/summary")({
  component: LessonSummaryPage,
  head: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    let lessonTitle = 'Lesson Summary';
    let lessonDescription = 'Review your progress and achievements for this lesson.';
    let courseTitle = 'Financial Learning';
    const siteOgImage = 'https://paw-fi.app/og-img.png';

    try {
      const lesson = getLessonById(params.lessonId);
      if (lesson) {
        lessonTitle = lesson.title ? `${lesson.title} - Summary` : lessonTitle;
        lessonDescription = lesson.description || lessonDescription;
        
        const COURSES_STORAGE_KEY = 'userCourses'; 
        const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
        if (storedCourses) {
          const coursesData = JSON.parse(storedCourses);
          const foundCourse = coursesData.find(c => c.id === params.courseId);
          if (foundCourse) {
            courseTitle = foundCourse.title || courseTitle;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching lesson/course data for meta tags:', e);
    }

    const pageUrl = `https://pawfi.app/learning/${params.courseId}/lesson/${params.lessonId}/summary`;
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial education, PawFi, learning summary`;

    const meta = seo({
      title: `${lessonTitle} | ${courseTitle} - PawFi Learning`,
      description: lessonDescription,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });

    return {
      meta,
    };
  },
});

function LessonSummaryPage() {
  const { courseId, lessonId } = useParams({ from: '/learning/$courseId/lesson/$lessonId/summary' });
  const { user } = useAuth();
  const router = useRouter();
  
  // Refs for animations
  const summaryRef = useRef(null);
  const statsRef = useRef(null);
  const nextLessonRef = useRef(null);
  const actionButtonsRef = useRef(null);
  
  // State
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizMaxScore, setQuizMaxScore] = useState(0);
  const [quizScorePercentage, setQuizScorePercentage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [nextLessonAvailable, setNextLessonAvailable] = useState(false);
  const [quizAttempt, setQuizAttempt] = useState<any>(null);
  const [nextLesson, setNextLesson] = useState<any>(null);

  const { data: courses, isLoading: isCoursesLoading, isError: isCoursesError } = useUserCourses(user?.id ?? '', { enabled: !!user });
  
  // Get the lesson data
  const lesson = getLessonById(lessonId);
  
  // Load progress data
  useEffect(() => {
    if (user?.id) {
      // Get overall lesson progress
      const progress = getLessonProgress(user.id, courseId, lessonId);
      setTutorialComplete(progress.tutorialComplete);
      setQuizPassed(progress.quizPassed);
      setOverallProgress(progress.overallProgress);
      
      // Get quiz score details
      const latestAttempt = getLatestQuizAttempt(user.id, courseId, lessonId);
      if (latestAttempt) {
        setQuizScore(latestAttempt.score);
        setQuizMaxScore(latestAttempt.maxScore);
        setQuizScorePercentage(Math.round((latestAttempt.score / latestAttempt.maxScore) * 100));
      }
      
      // Show confetti for completed lessons
      if (progress.overallProgress >= 80) {
        setShowConfetti(true);
      }
      
      // Check if next lesson is available
      const lesson = getLessonById(lessonId);
      if (lesson) {
        // Logic to determine if there's a next lesson available
        // This would depend on your course structure
        setNextLessonAvailable(true); // Placeholder - replace with actual logic
      }
    }
  }, [user?.id, courseId, lessonId]);

  // GSAP animations
  useGSAP(() => {
    if (!summaryRef.current) return;
    
    // Animate summary card
    gsap.fromTo(summaryRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
    
    // Animate stats
    if (statsRef.current) {
      const statItems = statsRef.current.querySelectorAll('.stat-item');
      gsap.set(statItems, { opacity: 0, y: 20 });
      gsap.to(statItems, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: 'power2.out',
        delay: 0.4
      });
    }
    
    // Animate next lesson card
    if (nextLessonRef.current) {
      gsap.fromTo(nextLessonRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.5, delay: 0.8, ease: 'back.out(1.7)' }
      );
    }
    
    // Animate action buttons
    if (actionButtonsRef.current) {
      const buttons = actionButtonsRef.current.querySelectorAll('button');
      gsap.set(buttons, { opacity: 0, y: 10 });
      gsap.to(buttons, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.15,
        ease: 'power2.out',
        delay: 1
      });
    }
  }, []);

  // Handle navigation to review tutorial
  const handleReviewTutorial = () => {
    router.navigate({ 
      to: '/learning/$courseId/lesson/$lessonId/tutorial',
      params: { courseId, lessonId }
    });
  };
  
  // Handle navigation to retry quiz
  const handleRetryQuiz = () => {
    router.navigate({ 
      to: '/learning/$courseId/lesson/$lessonId/quiz',
      params: { courseId, lessonId }
    });
  };
  
  // Handle navigation to next lesson
  const handleNextLesson = () => {
    // This would navigate to the next lesson if available
    // For now, navigate back to course page
    router.navigate({ 
      to: '/learning/$courseId',
      params: { courseId }
    });
  };
  
  // Handle navigation back to course
  const handleBackToCourse = () => {
    router.navigate({ 
      to: '/learning/$courseId',
      params: { courseId }
    });
  };

  if (isCoursesLoading) {
    return <LessonSkeleton />;
  }

  if (isCoursesError) {
    return <div className="text-center text-red-500 py-16">Failed to load course data.</div>;
  }

  if (!lesson) {
    return <div className="text-center text-red-500 py-16">Lesson not found.</div>;
  }

  return (
    <div className="bg-background min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <LessonBackButton onBack={handleBackToCourse} />
        </div>
        
        <div ref={summaryRef} className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
          {/* Summary Header */}
          <div className="bg-primary text-white p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-2">
                {quizPassed ? (
                  <FontAwesomeIcon icon={faTrophy} className="h-8 w-8 mr-3 text-yellow-300" />
                ) : (
                  <FontAwesomeIcon icon={faChartBar} className="h-8 w-8 mr-3" />
                )}
                <h1 className="text-2xl md:text-3xl font-bold">Lesson Summary</h1>
              </div>
              <p className="text-primary-foreground/90">
                {quizPassed 
                  ? "Congratulations! You've successfully completed this lesson." 
                  : "Here's your progress on this lesson so far."}
              </p>
            </div>
          </div>
          
          {/* Lesson Info */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">{lesson.title}</h2>
              <p className="text-gray-600">{lesson.description}</p>
            </div>
            
            {/* Progress Overview */}
            <div className="w-full mb-10">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">Overall Progress</h2>
                <span className="text-lg font-bold text-emerald-600">{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Completion Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10">
              <div className={`p-6 rounded-lg border-2 ${tutorialComplete ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}>
                <div className="flex items-center mb-4">
                  <FontAwesomeIcon icon={faBook} className={`w-6 h-6 mr-2 ${tutorialComplete ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <h3 className="text-lg font-semibold">Tutorial</h3>
                  {tutorialComplete && <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 ml-2 text-emerald-500" />}
                </div>
                <p className="text-gray-600 mb-4">
                  {tutorialComplete 
                    ? 'You have completed the tutorial for this lesson.' 
                    : 'You have not completed the tutorial yet.'}
                </p>
                <button 
                  onClick={handleReviewTutorial}
                  className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg flex items-center justify-center w-full transition-colors"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
                  Review Tutorial
                </button>
              </div>
              
              <div className={`p-6 rounded-lg border-2 ${quizPassed ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'}`}>
                <div className="flex items-center mb-4">
                  <FontAwesomeIcon icon={faTrophy} className={`w-6 h-6 mr-2 ${quizPassed ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <h3 className="text-lg font-semibold">Quiz</h3>
                  {quizPassed && <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 ml-2 text-emerald-500" />}
                </div>
                <div className="text-gray-600 mb-4">
                  {quizScore > 0 ? (
                    <div>
                      <p className="mb-2">You scored {quizScore}/{quizMaxScore} on the quiz.</p>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                        <div 
                          className={`h-3 rounded-full transition-all duration-1000 ease-out ${quizPassed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${quizScorePercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-right">{quizScorePercentage}%</p>
                    </div>
                  ) : (
                    <p>You have not attempted the quiz yet.</p>
                  )}
                </div>
                <button 
                  onClick={handleRetryQuiz}
                  className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg flex items-center justify-center w-full transition-colors"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
                  {quizScore > 0 ? 'Retry Quiz' : 'Take Quiz'}
                </button>
              </div>
            </div>
            
            {/* Next Steps */}
            <div className="w-full">
              <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nextLessonAvailable ? (
                  <button 
                    onClick={handleNextLesson}
                    className={`px-6 py-4 ${overallProgress >= 80 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-400 text-white cursor-not-allowed'} rounded-lg flex items-center justify-center transition-colors`}
                    disabled={overallProgress < 80}
                  >
                    {overallProgress >= 80 ? 'Continue to Next Lesson' : 'Complete This Lesson First'}
                    {overallProgress >= 80 && <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5 ml-2" />}
                  </button>
                ) : (
                  <button 
                    onClick={handleBackToCourse}
                    className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    Complete Course
                    <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5 ml-2" />
                  </button>
                )}
                <button 
                  onClick={handleBackToCourse}
                  className="px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg flex items-center justify-center transition-colors"
                >
                  Back to Course
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Next Lesson Card */}
        {nextLesson && (
          <div ref={nextLessonRef} className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-3">Up Next</h3>
              <div className="flex items-start">
                <div className="mr-4 text-3xl" aria-hidden="true">
                  {nextLesson.icon || '📚'}
                </div>
                <div>
                  <h4 className="font-medium">{nextLesson.title}</h4>
                  <p className="text-sm text-gray-500 mb-3">{nextLesson.description}</p>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full mr-2 bg-primary flex items-center justify-center text-white font-semibold text-xs">
                        {nextLesson.questions?.length || 0}
                      </div>
                      <span className="text-sm">Questions</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      ~{Math.max(5, (nextLesson.questions?.length || 0) * 2)} min
                    </div>
                    <div className="bg-primary text-white px-3 py-1 text-xs rounded-full">
                      +{nextLesson.xp || 0}XP
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleNextLesson}
                  className="flex items-center text-primary hover:text-primary-dark transition-colors"
                >
                  Start Next Lesson
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Course Navigation */}
        <div className="text-center">
          <button
            onClick={handleBackToCourse}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back to Course Overview
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonSummaryPage;
