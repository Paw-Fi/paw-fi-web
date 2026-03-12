import React from "react";
import { format } from "date-fns";
import { motion, Variants } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import {
  appStoreReviews,
  APP_STORE_RATING,
  TOTAL_REVIEW_COUNT,
  type Review,
} from "@/data/app-store-reviews";
import { useReducedVisualEffects } from "@/hooks/use-reduced-visual-effects";

/**
 * Star Rating Component - Displays partial stars for decimal ratings
 */
interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 20,
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const fillPercentage = Math.min(Math.max(rating - index, 0), 1) * 100;

        return (
          <div key={index} className="relative">
            {/* Background star (empty) */}
            <Star
              size={size}
              className="text-yellow-500/30"
              fill="currentColor"
            />
            {/* Filled star with clip */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercentage}%` }}
            >
              <Star
                size={size}
                className="text-yellow-500"
                fill="currentColor"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// App Store and Play Store URLs
const APP_STORE_URL = "https://apps.apple.com/app/moneko/id6753925279";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.moneko.app";

/**
 * Detect user platform based on user agent
 */
const getUserPlatform = (): "ios" | "android" | "web" => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }
  if (/android/.test(userAgent)) {
    return "android";
  }
  return "web";
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Apple-like easing
    },
  },
};

interface ReviewCardProps {
  review: Review;
  onClick?: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onClick }) => {
  const { rating, title, body, reviewerNickname, createdDate, territory } =
    review;

  return (
    <motion.div
      className="border-subtle-border/30 flex max-w-[320px] min-w-[280px] cursor-pointer flex-col gap-2 rounded-2xl border bg-white/60 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md dark:bg-slate-900/60"
      whileHover={{ y: -2, scale: 1.02 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-foreground font-medium">{reviewerNickname}</span>
        <span className="text-yellow-500">
          {"★".repeat(rating)}
          {"☆".repeat(5 - rating)}
        </span>
      </div>
      <h4 className="text-foreground text-sm font-semibold">{title}</h4>
      <p className="text-muted-foreground line-clamp-3 text-xs">{body}</p>
      <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs">
        <span>{territory}</span>
        <span>{format(new Date(createdDate), "M/d/yyyy")}</span>
      </div>
    </motion.div>
  );
};

export function UserCommunityShowcase() {
  const navigate = useNavigate();
  const reducedVisualEffects = useReducedVisualEffects();

  const reviews = appStoreReviews;
  const displayRating = APP_STORE_RATING;
  const totalReviews = TOTAL_REVIEW_COUNT;
  const featuredReviews = reviews.slice(0, reducedVisualEffects ? 6 : 10);

  /**
   * Handle review card click - navigate to appropriate store
   */
  const handleReviewClick = () => {
    const platform = getUserPlatform();

    switch (platform) {
      case "ios":
        window.open(APP_STORE_URL, "_blank");
        break;
      case "android":
        window.open(PLAY_STORE_URL, "_blank");
        break;
      case "web":
      default:
        navigate({ to: "/download" });
        break;
    }
  };

  return (
    <section className="relative z-10 overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-16"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="space-y-6 text-center">
            <div className="from-moneko-primary/10 to-moneko-secondary/10 dark:from-moneko-primary/20 dark:to-moneko-secondary/20 border-moneko-primary/20 inline-flex items-center gap-3 rounded-full border bg-gradient-to-r px-6 py-3">
              <StarRating rating={APP_STORE_RATING} size={18} />
              <span className="text-foreground text-sm font-medium">
                {APP_STORE_RATING}/5 rating
              </span>
            </div>

            <h2 className="text-foreground text-4xl font-light sm:text-5xl md:text-6xl">
              <span className="from-moneko-primary to-moneko-secondary bg-gradient-to-r bg-clip-text font-medium text-transparent">
                {displayRating}/5
              </span>{" "}
              App Store rating
            </h2>

            <div className="text-muted-foreground flex items-center justify-center gap-2 text-xl">
              <span className="text-foreground font-medium">6,000+</span>
              <span>people have already joined</span>
            </div>

            <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl">
              See what our users are saying about Moneko
            </p>
          </motion.div>

          {/* Reviews Marquee Section */}
          {reviews.length > 0 && (
            <div className="space-y-6">
              {reducedVisualEffects ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {featuredReviews.map((review) => (
                    <ReviewCard
                      key={`featured-${review.id}`}
                      review={review}
                      onClick={handleReviewClick}
                    />
                  ))}
                </div>
              ) : (
                <>
                  <Marquee pauseOnHover className="[--duration:70s]">
                    {reviews
                      .slice(0, Math.min(10, reviews.length))
                      .map((review) => (
                        <ReviewCard
                          key={`row1-${review.id}`}
                          review={review}
                          onClick={handleReviewClick}
                        />
                      ))}
                  </Marquee>

                  {reviews.length >= 10 && (
                    <Marquee reverse pauseOnHover className="[--duration:65s]">
                      {reviews
                        .slice(10, Math.min(20, reviews.length))
                        .map((review) => (
                          <ReviewCard
                            key={`row2-${review.id}`}
                            review={review}
                            onClick={handleReviewClick}
                          />
                        ))}
                    </Marquee>
                  )}

                  {reviews.length >= 20 && (
                    <Marquee pauseOnHover className="[--duration:70s]">
                      {reviews
                        .slice(20, Math.min(30, reviews.length))
                        .map((review) => (
                          <ReviewCard
                            key={`row3-${review.id}`}
                            review={review}
                            onClick={handleReviewClick}
                          />
                        ))}
                    </Marquee>
                  )}
                </>
              )}
            </div>
          )}

          {/* Call to Action */}
          <motion.div variants={itemVariants} className="text-center">
            <p className="text-muted-foreground text-sm">
              Download Moneko and join thousands of happy users
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
