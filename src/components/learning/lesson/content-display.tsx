import { faClipboardQuestion, faLightbulb, faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { Markdown } from "@/components/ui/markdown";
import { OptimizedImage } from "@/components/seo/optimized-image";
import quizCompletedImage from "@/assets/images/lessons/quiz-completed.jpeg";
import { LessonCardTitle } from "./lesson-card-title";
import { Button } from "@components/ui/button";

export // Content display component for flashcard-style content
function ContentDisplay({
  content,
  onNext,
  onBack,
  index,
  total,
  allItemsTotal,
}: {
  content: any;
  onNext: () => void;
  onBack: () => void;
  index: number;
  total: number;
  allItemsTotal: number;
}) {
  // Check if this is a quiz transition card
  const isQuizTransition = content.isQuizTransition;

  // Animation variants for Framer Motion - flashcard style
  const cardVariants = {
    hidden: { opacity: 0, rotateY: 15, x: 100, scale: 0.95 },
    visible: { 
      opacity: 1, 
      rotateY: 0, 
      x: 0, 
      scale: 1, 
      transition: { 
        type: "spring" as any, 
        stiffness: 400, 
        damping: 25,
        duration: 0.3 
      } 
    },
    exit: { 
      opacity: 0, 
      rotateY: -15, 
      x: -100, 
      scale: 0.95, 
      transition: { 
        type: "spring" as any, 
        stiffness: 400, 
        damping: 25,
        duration: 0.2 
      } 
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3, delay: 0.2 } }
  };

  return (
    <motion.div
      className="flex min-h-[400px] sm:min-h-[500px] md:min-h-[550px] flex-col rounded-xl sm:rounded-2xl md:rounded-3xl bg-moneko-background p-4 sm:p-6 md:p-8 shadow-md"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={cardVariants}>
      <div className="flex-1">
        {/* Header with progress indicator */}
        <LessonCardTitle
          lessonTitle={content.lessonTitle}
          index={index}
          allItemsTotal={allItemsTotal}
          icon={isQuizTransition ? faClipboardQuestion : faLightbulb}
        />     

        {/* Main content area with optional side-by-side layout - Mobile Optimized */}
        <motion.div 
          className="mb-6 sm:mb-8 flex flex-col gap-4 sm:gap-6 md:gap-8 md:flex-row"
          variants={contentVariants}
        >
          <div className="flex-1">
            {/* Question title this content relates to */}
            {content.title && (
              <h2
                className={`mb-4 sm:mb-5 md:mb-6 border-b border-[var(--lesson-title-border)] pb-2.5 sm:pb-3 text-mobile-base sm:text-lg md:text-xl font-semibold text-[var(--lesson-title-text)] ${isQuizTransition ? "text-mobile-lg sm:text-xl md:text-2xl lg:text-3xl" : ""}`}
              >
                {content.title}
              </h2>
            )}

            {/* Content blocks - Mobile Optimized */}
            <div className="space-y-3 sm:space-y-4">
              {!isQuizTransition && content.content && (
                <Markdown content={content.content} className="text-mobile-sm sm:text-base" />
              )}
            </div>

            {/* Key points box - only show for regular content, not quiz transition - Mobile Optimized */}
            {!isQuizTransition &&
              content.key_points &&
              content.key_points.length > 0 && (
                <div className="mt-6 sm:mt-8 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                  <div className="mb-2.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <FontAwesomeIcon
                      icon={faLightbulb}
                      className="text-primary text-sm sm:text-base"
                    />
                    <h4 className="font-medium text-mobile-sm sm:text-base text-primary">Key Points</h4>
                  </div>
                  <ul className="list-inside list-disc space-y-1.5 sm:space-y-2">
                    {/* Extract key points from content blocks or use predefined ones */}
                   {content.key_points.map((point, index) => (
                    <li key={`keypoint-${point.substring(0, 5)}-${index}`} className="text-mobile-xs sm:text-sm text-[var(--lesson-keypoint-text)]">{point}</li>
                   ))}
                  </ul>
                </div>
              )}
          </div>
        </motion.div>
      </div>

      {/* Quiz transition section - Mobile Optimized */}
      {isQuizTransition && (
        <motion.div 
          className="mb-6 sm:mb-8 rounded-lg sm:rounded-xl p-4 sm:p-6"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: "spring" as any, 
            stiffness: 400, 
            damping: 25, 
            delay: 0.2 
          }}>
          <div className="mb-4 text-center">
            <h3 className="mb-2 text-mobile-base sm:text-lg md:text-xl font-medium text-[var(--lesson-title-text)]">
              You've completed the learning section!
            </h3>
            <p className="text-mobile-sm sm:text-base text-[var(--lesson-content-text)]">
              Now it's time to test your understanding with a short quiz.
            </p>
          </div>
          <div className="my-4 sm:my-6 flex items-center justify-center">
            <div className="relative mx-auto w-60 sm:w-72 md:w-80">
              <OptimizedImage
                src={quizCompletedImage}
                alt="Quiz card"
                className="h-auto w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation buttons - Mobile Optimized */}
      <motion.div 
        className="mt-auto flex justify-between gap-2 sm:gap-3 pt-4"
        variants={contentVariants}
      >
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-full px-4 sm:px-6 py-2 text-mobile-sm sm:text-base min-h-[44px] touch-manipulation"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-1.5 sm:mr-2 text-xs sm:text-sm" />
            Back
          </Button>
          <Button
            onClick={onNext}
            className="rounded-full px-4 sm:px-6 py-2 text-mobile-sm sm:text-base min-h-[44px] touch-manipulation"
          >
            {isQuizTransition ? "Start Quiz" : "Next"}
            <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 sm:ml-2 text-xs sm:text-sm" />
          </Button>
      </motion.div>
    </motion.div>
  );
}
