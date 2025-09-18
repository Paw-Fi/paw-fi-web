import { AISearchInput } from "@/components/ui/ai-search-input";
import { useDeviceType } from "@/hooks/use-device-type";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { AuroraText } from "@/components/magicui/aurora-text";

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
  const highlightIndex = titleWords.findIndex(word => 
    word.toLowerCase().includes("portfolio") || 
    word.toLowerCase().includes("interest") ||
    word.toLowerCase().includes("passive")
  );

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl text-center w-full">
        {/* Early Access Pill Button */}
        <div className="mb-8">
          <Link to="/early-access">
            <Badge className="bg-primary  rounded-full hover:bg-primary/90 text-primary-foreground px-4 py-2 text-md font-medium inline-flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 dark:text-white">
              Early Access
              <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
            </Badge>
          </Link>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl mb-8 font-lato">
          {titleWords.map((word, index) => (
            <span key={index}>
              {index === highlightIndex ? (
                <AuroraText
                  colors={isMobile?["#A855F7"]: ["#4F46E5", "#A855F7"]}
                  speed={1.5}
                >
                  {word}
                </AuroraText>
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

        {/* AI Search Input - White Card Container */}
        <div className="mb-12">
          <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 max-w-4xl mx-auto">
            <AISearchInput
              placeholder={`Ask Moneko to build your personalized financial journey for you...`}
              suggestions={hero.chatSuggestions}
              variant="default"
            />
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