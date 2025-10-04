import { AISearchInput } from "@/components/ui/ai-search-input";
import { useDeviceType } from "@/hooks/use-device-type";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { BorderBeam } from '@/components/ui/border-beam';
import { Highlighter } from "@/components/ui/highlighter";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  data: {
    hero: {
      title: string;
      subtitle: string;
      ctaText: string;
      ctaRoute: string;
      chatSuggestions: string[];
    };
  };
}

export default function HeroSection({ data }: HeroSectionProps) {
  const { isMobile } = useDeviceType();
  const { hero } = data;

  const scrollToExplore = () => {
    const nextSection = document.querySelector('section:nth-of-type(2)');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const titleWords = hero.title.split(" ");
  const highlightIndex = -1

  return (
    <section className="relative bg-transparent z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl text-center w-full">
        {/* Early Access Pill Button with Gradient */}
        <div className="mb-8 sm:mt-4 lg:mt-0">
          <Link to="/early-access">
            <div className="relative group ">
              <button className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl">
                Early Access
                <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </Link>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-800 dark:text-slate-200 leading-tight tracking-tight">
        {titleWords.map((word, index) => (
            <span key={index}>
              {index === highlightIndex ? (
                <Highlighter action="underline" color="#FF9800" animationDuration={1000} strokeWidth={2}>
              {word}
              </Highlighter>
              ) : (
                word
              )}
              {index < titleWords.length - 1 ? " " : ""}
            </span>
          ))}
        </h1>

        {/* Subtitle */}
        <p className="text-md text-muted-foreground leading-relaxed sm:text-lg md:text-xl mb-12 max-w-4xl mx-auto font-lato">
          {hero.subtitle}
        </p>

        {/* AI Search Input - White Card Container - Optimized for mobile */}
        <div className="mb-12 ">

          <div className={cn(
            "bg-white/90 relative dark:bg-black/90 rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 max-w-4xl mx-auto",
            // Reduce backdrop-blur on mobile for better performance
            isMobile ? "backdrop-blur-sm" : "backdrop-blur-xl",
            // Add GPU acceleration hint
            "transform-gpu will-change-auto"
          )}>
            <AISearchInput
              placeholder={`Ask Moneko to build your monthly budget or suggest ways to save...`}
              suggestions={hero.chatSuggestions}
              variant="default"
            />
            <BorderBeam duration={10} size={200} borderWidth={2} disableOnMobile={true} />
          </div>
        </div>

        {/* Scroll to Explore Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={scrollToExplore}
            className="group flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300 cursor-pointer"
            aria-label="Scroll to explore more"
          >
            <span className="text-sm font-medium">Scroll to explore</span>
            <div className="group-hover:border-primary">
              <FontAwesomeIcon
                icon={faChevronDown}
                className="text-3xl"
              />
            </div>
          </button>
        </div>

      </div>
    </section>
  );
}