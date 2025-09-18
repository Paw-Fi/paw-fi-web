import * as m from "framer-motion/m";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple, faDiscord, faGooglePlay } from "@fortawesome/free-brands-svg-icons";
import { useMobileAnimation } from "@/hooks/use-mobile-animation";
import { DISCORD_URL } from "@/routes";

interface ThreeStepsSectionProps {
  data: {
    features?: Array<{
      title: string;
      description: string;
      icon: string;
      route: string;
    }>;
    hero: {
      ctaText: string;
      ctaRoute: string;
    };
    howItWorks?: {
      steps: Array<{
        title: string;
        description: string;
      }>;
    };
  };
}

// Default steps data from the mockup
const stepsData = [
  {
    title: "Set your goals",
    description: "Tell us what you want to achieve with your money. Whether it's saving for emergencies, buying a house, or planning for retirement, we'll help you set specific, achievable goals and create a roadmap to reach them."
  },
  {
    title: "Get your portfolios",
    description: "Our AI analyzes your goals and risk tolerance to build customized investment portfolios just for you. We handle all the research and selection, so you get expertly crafted portfolios without the complexity."
  },
  {
    title: "Grow on Autopilot",
    description: "Once your portfolios are set up, they work automatically to grow your wealth. Our system continuously monitors and rebalances your investments, so your money keeps working even when you're not thinking about it."
  }
];

export default function ThreeStepsSection({ data }: ThreeStepsSectionProps) {
  const { isMobile, viewport, animation, staggerAnimation } = useMobileAnimation();
  
  // Use dynamic steps if available, otherwise fall back to default
  const steps = data.howItWorks?.steps || stepsData;

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <m.h2
            className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato"
            initial={animation.initial}
            whileInView={animation.animate}
            transition={animation.transition}
            viewport={viewport}
          >
            3 Steps to Put Your Money on Autopilot
          </m.h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => {
            const staggerConfig = staggerAnimation(index);
            return (
              <m.div
                key={index}
                className="text-center p-6 rounded-2xl backdrop-blur-xl shadow-lg border border-white/20"
                initial={staggerConfig.initial}
                whileInView={staggerConfig.animate}
                transition={staggerConfig.transition}
                viewport={viewport}
              >
                <h3 className="text-xl font-bold text-foreground mb-4 font-lato">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-lato">
                  {step.description}
                </p>
              </m.div>
            );
          })}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <m.div
            initial={animation.initial}
            whileInView={animation.animate}
            transition={{ ...animation.transition, delay: 0.4 }}
            viewport={viewport}
          >
            <Button
              asChild
              size="lg"
              className="px-8 py-3 text-lg font-semibold dark:text-white"
            >
              <a href={DISCORD_URL} target="_blank">
                <FontAwesomeIcon icon={faDiscord} className="mr-2" />
                Join Discord
              </a>
            </Button>
          </m.div>

          <m.div
            initial={animation.initial}
            whileInView={animation.animate}
            transition={{ ...animation.transition, delay: 0.5 }}
            viewport={viewport}
          >
            <Button
              asChild
              size="lg"
              className="px-8 py-3 text-lg font-semibold dark:text-white"
            >
              <Link to="/onboarding">
                Try Moneko for free
              </Link>
            </Button>
          </m.div>
        </div>

        {/* Trust indicator */}
        <m.p
          className="text-center text-sm text-muted-foreground mt-6"
          initial={animation.initial}
          whileInView={animation.animate}
          transition={{ ...animation.transition, delay: 0.6 }}
          viewport={viewport}
        >
          Join the movement of never settling
        </m.p>
      </div>
    </section>
  );
}