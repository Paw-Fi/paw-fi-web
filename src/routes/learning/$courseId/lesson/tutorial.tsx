"use client";

import { createFileRoute, Link, useParams, useRouter } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faPlayCircle, faBook, faCheckCircle, faArrowRight, faVolumeUp, faVolumeMute } from '@fortawesome/free-solid-svg-icons';
import { LessonBackButton } from '@/components/learning/lesson-back-button';
import { LessonSkeleton } from '@/components/learning/lesson-skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useUserCourses } from '@/services/course-service';
import { saveTutorialProgress, getTutorialProgress, markTutorialComplete } from '@/services/lesson-progress-service';
import { getLessonById } from '@/data/lessons';
import basicCourse from '@/data/basic-lessons.json';
import { seo } from '@/utils/seo';
import { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { Lesson } from '@/types/learning.types';

interface TutorialContent {
  title: string;
  introduction: string;
  videoUrl?: string;
  textContent?: string[];
  audioUrl?: string;
  keyTakeaways?: string[];
}

const getTutorialContent = (lessonId: string): TutorialContent | null => {
  const lesson = getLessonById(lessonId);
  if (!lesson) return null;

  return {
    title: lesson.title || "Lesson Tutorial",
    introduction: lesson.description || "Welcome to this lesson. Let's learn something new!",
    videoUrl: (lesson as any).videoUrl || (lessonId === '1-1' ? "https://www.youtube.com/embed/dQw4w9WgXcQ" : undefined), 
    textContent: (lesson.content && typeof lesson.content === 'string') 
                 ? lesson.content.split('\\n\\n') 
                 : ["This lesson covers important concepts that will help you master the topic. Make sure to go through all materials before starting the quiz."],
    keyTakeaways: (lesson as any).keyTakeaways || ["Understand the core concepts.", "Apply your knowledge effectively."],
  };
};

export const Route = createFileRoute("/learning/$courseId/lesson/tutorial")({
  component: TutorialPage,
  head: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    let lessonTitle = 'Lesson Tutorial';
    let courseTitle = 'Financial Learning';
    const siteOgImage = 'https://paw-fi.app/og-img.png';

    try {
      const lesson = getLessonById(params.lessonId);
      if (lesson) {
        lessonTitle = lesson.title ? `${lesson.title} - Tutorial` : lessonTitle;
        
        let foundCourse: Lesson | undefined = undefined;
        const COURSES_STORAGE_KEY = 'userCourses'; 
        const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
        if (storedCourses) {
          const coursesData: Lesson[] = JSON.parse(storedCourses);
          foundCourse = coursesData.find(c => c.id === params.courseId);
           if (!foundCourse && lesson && lesson.parentId) {
              foundCourse = coursesData.find(c => c.id === lesson.parentId);
          }
        }
        if (!foundCourse && basicCourse && (basicCourse as Lesson).id === params.courseId) {
          foundCourse = basicCourse as Lesson;
        } else if (!foundCourse && lesson && lesson.parentId && basicCourse && (basicCourse as Lesson).id === lesson.parentId) {
           foundCourse = basicCourse as Lesson;
        }
        if (foundCourse) {
          courseTitle = foundCourse.title || courseTitle;
        }
      }
    } catch (e) {
      console.error('Error fetching lesson/course data for meta tags:', e);
    }
    
    const pageUrl = `https://pawfi.app/learning/${params.courseId}/lesson/${params.lessonId}/tutorial`;
    const keywords = `${lessonTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, ${courseTitle.replace(/[^a-zA-Z0-9 ]/g, '')}, financial tutorial, PawFi learning`;

    return seo({
      title: `${lessonTitle} | ${courseTitle} - PawFi Learning`,
      description: `Learn about ${lessonTitle} with this interactive tutorial on PawFi.`,
      keywords: keywords,
      image: siteOgImage,
      url: pageUrl,
    });
  },
});

function TutorialPage() {
  const { courseId, lessonId } = useParams({ from: '/learning/$courseId/lesson/$lessonId/tutorial' });
  const { user } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showTakeaways, setShowTakeaways] = useState(false);
  
  // Refs for animations
  const contentRef = useRef(null);
  const headerRef = useRef(null);
  const takeawaysRef = useRef(null);
  const quizButtonRef = useRef(null);
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);

  const { data: courses, isLoading: isCoursesLoading, isError: isCoursesError } = useUserCourses(user?.id ?? '', { enabled: !!user });
  
  // Get the lesson data
  const lesson = getLessonById(lessonId);

  // GSAP animations
  useGSAP(() => {
    if (!headerRef.current) return;
    
    // Animate header
    gsap.fromTo(headerRef.current, 
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
    );
    
    // Animate content sections
    if (contentRef.current) {
      const sections = contentRef.current.querySelectorAll('.content-section');
      gsap.set(sections, { opacity: 0, y: 20 });
      gsap.to(sections, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.2,
        ease: 'power2.out',
        delay: 0.3
      });
    }
    
    // Animate quiz button
    if (quizButtonRef.current) {
      gsap.fromTo(quizButtonRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, delay: 1, ease: 'back.out(1.7)' }
      );
    }
  }, []);
  
  // Animation for takeaways when they become visible
  useEffect(() => {
    if (showTakeaways && takeawaysRef.current) {
      gsap.fromTo(takeawaysRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
      
      // Animate list items
      const items = takeawaysRef.current.querySelectorAll('li');
      gsap.set(items, { opacity: 0, x: -20 });
      gsap.to(items, {
        opacity: 1,
        x: 0,
        duration: 0.3,
        stagger: 0.15,
        ease: 'power2.out',
        delay: 0.2
      });
    }
  }, [showTakeaways]);
  
  // Load saved progress
  useEffect(() => {
    if (user?.id) {
      const savedProgress = getTutorialProgress(user.id, courseId, lessonId);
      if (savedProgress) {
        setReadingProgress(savedProgress.readingProgress);
        setActiveSection(savedProgress.lastPosition);
        
        // If progress is over 70%, show takeaways
        if (savedProgress.readingProgress > 70) {
          setShowTakeaways(true);
        }
        
        // Update progress bar
        if (progressBarRef.current) {
          gsap.to(progressBarRef.current, {
            width: `${savedProgress.readingProgress}%`,
            duration: 0.5,
            ease: 'power2.out'
          });
        }
      }
    }
  }, [user?.id, courseId, lessonId]);

  // Update reading progress as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || !user?.id) return;
      
      const element = contentRef.current;
      const totalHeight = element.scrollHeight - element.clientHeight;
      const scrollPosition = element.scrollTop;
      const progress = Math.min((scrollPosition / totalHeight) * 100, 100);
      
      setReadingProgress(progress);
      
      // Save progress every time it changes significantly (more than 5%)
      if (Math.abs(progress - readingProgress) > 5) {
        saveTutorialProgress(user.id, courseId, lessonId, progress, activeSection);
      }
      
      // Show takeaways when user has scrolled 70% of the content
      if (progress > 70 && !showTakeaways) {
        setShowTakeaways(true);
      }
      
      // Mark as complete when user has scrolled to 90%
      if (progress > 90) {
        markTutorialComplete(user.id, courseId, lessonId);
      }
      
      // Update progress bar
      if (progressBarRef.current) {
        gsap.to(progressBarRef.current, {
          width: `${progress}%`,
          duration: 0.1,
          ease: 'none'
        });
      }
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [showTakeaways]);

  // Handle audio play/pause
  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setAudioPlaying(!audioPlaying);
    }
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

  // Split content into paragraphs if it's a string
  const contentParagraphs = typeof lesson.content === 'string' 
    ? lesson.content.split('\n\n').filter(p => p.trim() !== '')
    : [];
    
  // Create sections from paragraphs (group every 2 paragraphs)
  const contentSections = [];
  for (let i = 0; i < contentParagraphs.length; i += 2) {
    contentSections.push(contentParagraphs.slice(i, i + 2));
  }

  // Handle navigation to quiz
  const handleStartQuiz = () => {
    // Mark tutorial as complete when proceeding to quiz
    if (user?.id) {
      markTutorialComplete(user.id, courseId, lessonId);
    }
    
    router.navigate({ 
      to: '/learning/$courseId/lesson/$lessonId/quiz',
      params: { courseId, lessonId }
    });
  };

  // Handle navigation back
  const handleBack = () => {
    router.navigate({ 
      to: '/learning/$courseId',
      params: { courseId }
    });
  };
  
  // Navigate to next/previous section
  const navigateSection = (direction) => {
    let newSection = activeSection;
    
    if (direction === 'next' && activeSection < contentSections.length - 1) {
      newSection = activeSection + 1;
      setActiveSection(newSection);
    } else if (direction === 'prev' && activeSection > 0) {
      newSection = activeSection - 1;
      setActiveSection(newSection);
    }
    
    // Save section position when navigating
    if (user?.id && newSection !== activeSection) {
      saveTutorialProgress(user.id, courseId, lessonId, readingProgress, newSection);
    }
  };

  return (
    <div className="bg-background min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <LessonBackButton onBack={handleBack} />
        </div>
        
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Tutorial Header */}
          <div ref={headerRef} className="bg-primary text-white p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark opacity-50"></div>
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{lesson.title}</h1>
              <p className="text-primary-foreground/90">{lesson.description}</p>
              
              {/* Reading progress bar */}
              <div className="mt-4 h-1 bg-white/20 rounded-full w-full overflow-hidden">
                <div 
                  ref={progressBarRef}
                  className="h-full bg-white rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${readingProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Tutorial Content */}
          <div className="relative">
            {/* Section navigation */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <button 
                onClick={() => navigateSection('prev')} 
                disabled={activeSection === 0}
                className={`p-2 rounded-full ${activeSection === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-sm font-medium text-gray-500">
                Section {activeSection + 1} of {contentSections.length}
              </div>
              <button 
                onClick={() => navigateSection('next')} 
                disabled={activeSection === contentSections.length - 1}
                className={`p-2 rounded-full ${activeSection === contentSections.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div 
              ref={contentRef} 
              className="p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-20rem)]" 
              style={{ scrollBehavior: 'smooth' }}
            >
              {/* Video content if available */}
              {lesson.videoUrl && activeSection === 0 && (
                <div className="mb-8 rounded-xl overflow-hidden bg-gray-100 content-section">
                  <div className="aspect-video relative">
                    <iframe 
                      src={lesson.videoUrl} 
                      className="absolute inset-0 w-full h-full"
                      title={`${lesson.title} Tutorial Video`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              
              {/* Audio content if available */}
              {lesson.audioUrl && activeSection === 0 && (
                <div className="mb-8 content-section">
                  <h2 className="text-lg font-semibold mb-3 flex items-center">
                    <VolumeIcon className="mr-2 h-5 w-5 text-primary" /> Audio Explanation
                  </h2>
                  <div className="bg-gray-50 p-4 rounded-xl flex items-center space-x-3">
                    <button 
                      onClick={toggleAudio}
                      className={`p-3 rounded-full ${audioPlaying ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}
                    >
                      {audioPlaying ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                      )}
                    </button>
                  
                  
                  {/* Interactive element - simple definition cards */}
                  {activeSection === 1 && (
                    <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                        <h3 className="font-medium text-blue-700 mb-1">Key Concept</h3>
                        <p className="text-sm text-blue-800">Understanding how {lesson.title.toLowerCase()} impacts your financial health.</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 hover:shadow-md transition-shadow">
                        <h3 className="font-medium text-green-700 mb-1">Pro Tip</h3>
                        <p className="text-sm text-green-800">Always consider long-term implications when making financial decisions.</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Interactive element - simple quiz question */}
                  {activeSection === contentSections.length - 1 && (
                    <div className="my-6 bg-purple-50 p-5 rounded-lg border border-purple-100">
                      <h3 className="font-medium text-purple-700 mb-2">Quick Check</h3>
                      <p className="text-sm text-purple-800 mb-3">What's one key benefit of understanding {lesson.title.toLowerCase()}?</p>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-100 cursor-pointer">
                          <div className="w-4 h-4 rounded-full border border-purple-400"></div>
                          <span className="text-sm">Better budgeting decisions</span>
                        </div>
                        <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-100 cursor-pointer">
                          <div className="w-4 h-4 rounded-full border border-purple-400"></div>
                          <span className="text-sm">Improved investment strategies</span>
                        </div>
                        <div className="flex items-center space-x-2 p-2 rounded hover:bg-purple-100 cursor-pointer">
                          <div className="w-4 h-4 rounded-full border border-purple-400"></div>
                          <span className="text-sm">Enhanced financial security</span>
                        </div>
                      </div>
                    </div>
                  )}
             
              
              { showTakeaways && (
                <div ref={takeawaysRef} className="mb-8 bg-gray-50 p-5 rounded-xl border border-gray-100 content-section">
                  <h2 className="text-lg font-semibold mb-3 flex items-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="mr-2 h-5 w-5 text-primary" /> Key Takeaways
                  </h2>
                  <ul className="list-none space-y-3">
                    {/* Generate some takeaways based on the lesson content */}
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full h-6 w-6 mr-2 flex-shrink-0 text-xs">1</span>
                      <span>Understanding the core concepts of {lesson.title}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full h-6 w-6 mr-2 flex-shrink-0 text-xs">2</span>
                      <span>Applying these principles to real-world financial scenarios</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full h-6 w-6 mr-2 flex-shrink-0 text-xs">3</span>
                      <span>Building a foundation for advanced financial literacy</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-flex items-center justify-center bg-green-100 text-green-800 rounded-full h-6 w-6 mr-2 flex-shrink-0 text-xs">4</span>
                      <span>Practical steps to implement these concepts in your financial planning</span>
                    </li>
                  </ul>
                </div>
              )}
              
              {/* Quiz Button */}
              <div className="flex justify-center mt-8">
                <button
                  ref={quizButtonRef}
                  onClick={handleStartQuiz}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full font-medium flex items-center transition-all transform hover:scale-105"
                >
                  <FontAwesomeIcon icon={faPlayCircle} className="mr-2 h-5 w-5" />
                  Start Quiz
                </button>
              </div>
            </div>
          </div>    
              )}      
          </div>     
        </div>     
      </div>      
    </div>    
    </div>    
  );
}

export default TutorialPage;
