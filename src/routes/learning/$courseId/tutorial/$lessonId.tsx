"use client";

import { useRef, useState, useEffect } from "react";
import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { getCourseById, getLessonById, TutorialContent, defaultTutorialContent, getTutorialContent } from '@/data/lessons';
import type { Course, Lesson, ContentBlock } from "@/types/learning.types";
import { seo } from '@/utils/seo';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBars, faCheckCircle, faFileLines, faVideo, faVolumeUp, faProjectDiagram, faPuzzlePiece, faBookOpen, faArrowRight, faPlay } from '@fortawesome/free-solid-svg-icons';

// Define the structure for the progress state
interface TutorialProgress {
  viewed: boolean;
  timeSpent: number;
  completedSections: string[];
}



// Component to select the correct icon
function ContentTypeIcon({ type, className }: { type: TutorialContent['type'], className?: string }) {
  const defaultClassName = "h-5 w-5";
  switch (type) {
    case 'text': return <FontAwesomeIcon icon={faFileLines} className={className || defaultClassName} />;
    case 'video': return <FontAwesomeIcon icon={faVideo} className={className || defaultClassName} />;
    case 'audio': return <FontAwesomeIcon icon={faVolumeUp} className={className || defaultClassName} />;
    case 'diagram': return <FontAwesomeIcon icon={faProjectDiagram} className={className || defaultClassName} />;
    case 'interactive': return <FontAwesomeIcon icon={faPuzzlePiece} className={className || defaultClassName} />;
    default: return <FontAwesomeIcon icon={faFileLines} className={className || defaultClassName} />; // Default to text icon
  }
}

// Route definition with SEO head function
export const Route = createFileRoute('/learning/$courseId/tutorial/$lessonId' as any)({
  component: TutorialPage,
  meta: ({ params }: { params: { courseId: string; lessonId: string } }) => {
    const lessonId = params.lessonId;
    const lesson = getLessonById(lessonId); 
    const title = lesson ? `Tutorial: ${lesson.title}` : 'Tutorial';
    const description = lesson ? lesson.description : 'Interactive tutorial lesson.';
    
    const pageUrl = `https://pawfi.app/learning/${params.courseId}/tutorial/${lessonId}`;
    const imageUrl = lesson?.icon || 'https://pawfi.app/images/default-tutorial-image.png'; // Ensure you have a default image

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Course", // Consider if "LearningResource" or "Article" might be more appropriate for a single tutorial page
      "name": lesson?.title || "Financial Tutorial",
      "description": lesson?.description || "Learn key financial concepts through this interactive tutorial.",
      "provider": {
        "@type": "Organization",
        "name": "PawFi",
        "url": "https://pawfi.app"
      }
      // Potentially add hasCourseInstance if you have specific sessions or offerings
    };

    return {
      ...seo({ title, description, url: pageUrl, image: imageUrl }),
      // Add any other meta tags specific to this route
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

// Main Tutorial Page Component
export function TutorialPage() {
  const { courseId, lessonId } = useParams({ from: '/learning/$courseId/tutorial/$lessonId' as any });
  // TODO: Remove 'as any' once TanStack Router route generation/typing is resolved
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [tutorialContent, setTutorialContent] = useState<TutorialContent[]>(defaultTutorialContent);
  const [progress, setProgress] = useState<TutorialProgress>({ viewed: false, timeSpent: 0, completedSections: [] });
  const [activeSection, setActiveSection] = useState<string>(defaultTutorialContent[0]?.id || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for DOM elements and previous state
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const backToCourseLinkRef = useRef<HTMLAnchorElement>(null); // Link component forwards ref to <a>
  const prevIsSidebarOpenRef = useRef<boolean>(isSidebarOpen);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const currentLesson = getLessonById(lessonId);
        const currentCourse = getCourseById(courseId);
        
        if (currentLesson) {
          setLesson(currentLesson);
          const content = getTutorialContent(lessonId);
          setTutorialContent(content);
          if (content.length > 0) {
            setActiveSection(content[0].id);
          }
        } else {
          // Handle lesson not found, maybe navigate away or show error
          setTutorialContent(defaultTutorialContent);
          setActiveSection(defaultTutorialContent[0]?.id || '');
        }
        setCourse(currentCourse || null);

        // Placeholder for loading progress from storage
        // const savedProgress = localStorage.getItem(`tutorialProgress_${lessonId}`);
        // if (savedProgress) setProgress(JSON.parse(savedProgress));
        setProgress(prev => ({ ...prev, viewed: true }));

      } catch (error) {
        console.error("Error fetching tutorial data:", error);
        // Set default or error state
        setTutorialContent(defaultTutorialContent);
        setActiveSection(defaultTutorialContent[0]?.id || '');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [lessonId, courseId]);

  useEffect(() => {
    // Intersection Observer for active section highlighting
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section-id');
            if (sectionId) setActiveSection(sectionId);
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0.1 } // Adjust rootMargin to trigger when section is near vertical center
    );

    tutorialContent.forEach(item => {
      const el = sectionRefs.current[item.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tutorialContent, sectionRefs]);

  // Mark a section as completed
  const completeSection = (sectionId: string) => {
    setProgress(prev => {
      const newCompletedSections = prev.completedSections.includes(sectionId) 
        ? prev.completedSections 
        : [...prev.completedSections, sectionId];
      // const updatedProgress = { ...prev, completedSections: newCompletedSections };
      // localStorage.setItem(`tutorialProgress_${lessonId}`, JSON.stringify(updatedProgress));
      return { ...prev, completedSections: newCompletedSections };
    });
  };

  // Handle starting the quiz
  const handleStartQuiz = () => {
    if (lesson) {
      navigate({ to: `/learning/${courseId}/quiz/${lesson.lesson_id}` });
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      if (window.innerWidth < 768) { // md breakpoint
        setIsSidebarOpen(false);
      }
    }
  };

  const navigateSection = (direction: 'next' | 'prev') => {
    const currentIndex = tutorialContent.findIndex(item => item.id === activeSection);
    if (direction === 'next' && currentIndex < tutorialContent.length - 1) {
      scrollToSection(tutorialContent[currentIndex + 1].id);
    }
    if (direction === 'prev' && currentIndex > 0) {
      scrollToSection(tutorialContent[currentIndex - 1].id);
    }
  };

  // Render different content types
  const renderContent = (item: TutorialContent) => {
    // Auto-complete section when it becomes active (or based on scroll, etc.)
    // For simplicity, let's assume viewing means completing for now
    // A more robust way would be to mark complete on specific interaction or scroll depth
    if (activeSection === item.id && !progress.completedSections.includes(item.id)) {
      completeSection(item.id);
    }

    switch (item.type) {
      case 'text':
        return <div className="prose prose-lg max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: item.content || '' }}></div>;
      case 'video':
        return (
          <div className="aspect-video w-full">
            {item.mediaUrl ? (
              <iframe 
                src={item.mediaUrl} 
                title={item.title} 
                className="w-full h-full rounded-lg shadow-md" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            ) : <p className="text-gray-500">Video content not available.</p>}
          </div>
        );
      case 'audio':
        return (
          <div>
            {item.mediaUrl ? (
              <audio controls src={item.mediaUrl} className="w-full rounded-md shadow-sm">
                Your browser does not support the audio element.
              </audio>
            ) : <p className="text-gray-500">Audio content not available.</p>}
            {item.content && <p className="mt-2 text-sm text-gray-600">{item.content}</p>}
          </div>
        );
      case 'diagram': // Placeholder for diagram rendering
        return (
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
            <p className="text-lg font-semibold text-gray-700">Diagram: {item.title}</p>
            <pre className="mt-2 text-sm text-left bg-white p-3 rounded shadow-sm overflow-x-auto">{item.content || 'Diagram content not available.'}</pre>
            {item.mediaUrl && <img src={item.mediaUrl} alt={item.title} className="mt-4 max-w-full h-auto rounded-md mx-auto shadow-md" />}
          </div>
        );
      case 'interactive': // Placeholder for interactive components
        return (
          <div className="p-6 border-2 border-dashed border-primary-300 rounded-xl bg-primary-50 text-center">
            <p className="text-xl font-semibold text-primary-700">Interactive Element: {item.title}</p>
            <p className="mt-2 text-gray-600">{item.content || 'Interactive content will appear here.'}</p>
            {/* Example button for interaction */}
            <button className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              Engage
            </button>
          </div>
        );
      default:
        return <p className="text-gray-500">Unsupported content type.</p>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          {/* You can use a spinner component here */}
          <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-semibold text-gray-700">Loading Lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 text-center px-4">
        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lesson Not Found</h1>
          <p className="text-gray-700 mb-6">We couldn't find the lesson you were looking for.</p>
          <Link to={`/learning/${courseId}`} className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  const progressPercentage = tutorialContent.length > 0 ? Math.round((progress.completedSections.length / tutorialContent.length) * 100) : 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      {/* Overlay for mobile sidebar */} 
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar (Desktop) / Off-canvas (Mobile) */}
      <aside 
        id="tutorial-sidebar"
        aria-labelledby="sidebar-title"
        className={`fixed inset-y-0 left-0 z-20 w-72 bg-white shadow-xl transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0 md:flex md:flex-col md:h-screen md:sticky md:top-0`}
      >
        <div className="p-6 border-b border-gray-200">
          <Link 
            to={`/learning/${courseId}`} 
            ref={backToCourseLinkRef} 
            className="flex items-center text-sm text-primary hover:underline mb-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4 mr-1" />
            Back to {course?.title || 'Course'}
          </Link>
          <h2 id="sidebar-title" className="text-xl font-semibold text-gray-800 truncate" title={lesson.title}>{lesson.title}</h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {tutorialContent.map((item, index) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`w-full flex items-center px-6 py-3 text-left text-sm font-medium transition-colors duration-150 ease-in-out group
                ${activeSection === item.id 
                  ? 'bg-primary-50 text-primary border-l-4 border-primary' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              `}
            >
              {item.type === 'text' && <FontAwesomeIcon icon={faFileLines} className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />}
              {item.type === 'video' && <FontAwesomeIcon icon={faVideo} className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />}
              {item.type === 'audio' && <FontAwesomeIcon icon={faVolumeUp} className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />}
              {item.type === 'diagram' && <FontAwesomeIcon icon={faProjectDiagram} className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />}
              {item.type === 'interactive' && <FontAwesomeIcon icon={faPuzzlePiece} className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />}
              {!['text', 'video', 'audio', 'diagram', 'interactive'].includes(item.type) && <FontAwesomeIcon icon={faBookOpen} className={`mr-3 h-5 w-5 flex-shrink-0 ${activeSection === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />} {/* Fallback icon */}
              <span className="truncate flex-1">{item.title}</span>
              {progress.completedSections.includes(item.id) && (
                <FontAwesomeIcon icon={faCheckCircle} className="ml-auto h-5 w-5 text-green-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-200">
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area with its own Top Bar */} 
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar for Main Content (includes mobile menu toggle) */} 
        <header className="sticky top-0 z-10 bg-white shadow-sm md:hidden">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <button 
              ref={menuButtonRef}
              onClick={() => setIsSidebarOpen(true)} 
              className="text-gray-600 hover:text-primary p-2 -ml-2"
              aria-label="Open menu"
              aria-expanded={isSidebarOpen}
              aria-controls="tutorial-sidebar"
            >
              <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-medium text-gray-800 truncate">{lesson.title}</h1>
            {/* Placeholder for potential actions or logo */}
            <div className="w-6"></div> 
          </div>
        </header>

        <main ref={contentRef} className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-12">
            {tutorialContent.map((item, index) => (
              <section 
                key={item.id} 
                id={item.id} 
                data-section-id={item.id}
                ref={(el) => { sectionRefs.current[item.id] = el; }}
                className="bg-white p-6 sm:p-8 rounded-xl shadow-lg ring-1 ring-gray-900/5 transition-all duration-300"
                // className={`bg-white p-6 sm:p-8 rounded-xl shadow-lg ring-1 ring-gray-900/5 transition-all duration-300 ${activeSection === item.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center mb-4 sm:mb-6">
                  {progress.completedSections.includes(item.id) && (
                    <FontAwesomeIcon icon={faCheckCircle} className="w-6 h-6 text-green-500 mr-3 flex-shrink-0" />
                  )}
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{item.title}</h2>
                </div>
                <div className="prose prose-lg max-w-none">
                  {renderContent(item)}
                </div>

                {/* Section-specific completion (optional) */}
                {/* Example: <button onClick={() => completeSection(item.id)}>Mark as Read</button> */}
              </section>
            ))}
          </div>

          {/* Navigation and Quiz Button */} 
          <div className="max-w-3xl mx-auto mt-10 sm:mt-16 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                onClick={() => navigateSection('prev')}
                disabled={tutorialContent.findIndex(item => item.id === activeSection) === 0}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5 mr-2" />
                Previous
              </button>
              <button
                onClick={() => navigateSection('next')}
                disabled={tutorialContent.findIndex(item => item.id === activeSection) === tutorialContent.length - 1}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <FontAwesomeIcon icon={faArrowRight} className="h-5 w-5 ml-2" />
              </button>
            </div>

            {progressPercentage >= 100 && (
              <div className="mt-8 text-center">
                <p className="text-lg text-green-600 font-semibold mb-4">Lesson Complete!</p>
                <button
                  onClick={handleStartQuiz}
                  className="w-full sm:w-auto px-10 py-4 bg-primary text-white text-lg font-semibold rounded-lg hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Start Quiz
                  <FontAwesomeIcon icon={faPlay} className="h-5 w-5 ml-2 inline-block" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
