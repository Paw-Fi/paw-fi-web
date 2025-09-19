import { faClipboardQuestion, faLightbulb, faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { OptimizedImage } from "@/components/seo/optimized-image";
import quizCompletedImage from "@/assets/images/lessons/quiz-completed.jpeg";
import { LessonCardTitle } from "./lesson-card-title";
import remarkGfm from 'remark-gfm'; // Import the GFM plugin
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
      className="flex min-h-[550px] flex-col rounded-3xl bg-white p-8 shadow-md"
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

        {/* Main content area with optional side-by-side layout */}
        <motion.div 
          className="mb-8 flex flex-col gap-8 md:flex-row"
          variants={contentVariants}
        >
          <div className="flex-1">
            {/* Question title this content relates to */}
            {content.title && (
              <h2
                className={`mb-6 border-b border-gray-100 pb-3 text-xl font-semibold text-gray-800 ${isQuizTransition ? "text-3xl" : ""}`}
              >
                {content.title}
              </h2>
            )}

            {/* Content blocks */}
            <div className="space-y-4">
              {!isQuizTransition &&
                content.content&&        <article className="prose prose-purple mx-auto max-w-none dark:prose-invert lg:prose-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]} >{content.content}</ReactMarkdown>
              </article>
              }
            </div>

            {/* Key points box - only show for regular content, not quiz transition */}
            {!isQuizTransition &&
              content.key_points &&
              content.key_points.length > 0 && (
                <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="mb-3 flex items-center">
                    <FontAwesomeIcon
                      icon={faLightbulb}
                      className="mr-2 text-primary"
                    />
                    <h4 className="font-medium text-primary">Key Points</h4>
                  </div>
                  <ul className="list-inside list-disc space-y-2">
                    {/* Extract key points from content blocks or use predefined ones */}
                   {content.key_points.map((point, index) => (
                    <li key={`keypoint-${point.substring(0, 5)}-${index}`} className="text-gray-700">{point}</li>
                   ))}
                  </ul>
                </div>
              )}
          </div>
        </motion.div>
      </div>

      {/* Quiz transition section with purple background */}
      {isQuizTransition && (
        <motion.div 
          className="mb-8 rounded-xl  p-6"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: "spring" as any, 
            stiffness: 400, 
            damping: 25, 
            delay: 0.2 
          }}>
          <div className="mb-4 text-center">
            <h3 className="mb-2 text-xl font-medium text-gray-800">
              You've completed the learning section!
            </h3>
            <p className="text-gray-600">
              Now it's time to test your understanding with a short quiz.
            </p>
          </div>
          <div className="my-6 flex items-center justify-center">
            <div className="relative mx-auto w-80">
              <OptimizedImage
                src={quizCompletedImage}
                alt="Quiz card"
                className="h-auto w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation buttons */}
      <motion.div 
        className="mt-auto flex justify-between pt-4"
        variants={contentVariants}
      >
          <Button
            variant="outline"
            onClick={onBack}
            className="rounded-full px-6 py-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back
          </Button>
          <Button
            onClick={onNext}
            className="rounded-full px-6 py-2"
          >
            {isQuizTransition ? "Start Quiz" : "Next"}
            <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
          </Button>
      </motion.div>
    </motion.div>
  );
}
