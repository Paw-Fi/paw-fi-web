import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faApple, faDiscord, faGooglePlay } from "@fortawesome/free-brands-svg-icons";
import { useDeviceType } from "@/hooks/use-device-type";
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
  const { isMobile } = useDeviceType();
  
  // Use dynamic steps if available, otherwise fall back to default
  const steps = data.howItWorks?.steps || stepsData;

  return (
    <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl w-full">
        {/* Section Header */}
        <div className="mb-16 text-center">
          {isMobile ? (
            <h2 className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato">
              3 Steps to Put Your Money on Autopilot
            </h2>
          ) : (
            <motion.h2
              className="text-foreground mb-6 text-3xl leading-tight font-bold sm:text-4xl md:text-5xl font-lato"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              3 Steps to Put Your Money on Autopilot
            </motion.h2>
          )}
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="text-center p-6 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              
              <h3 className="text-xl font-bold text-foreground mb-4 font-lato">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed font-lato">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Button
              asChild
              size="lg"
              className="bg-black hover:bg-black/90 text-white px-8 py-3 text-lg font-semibold dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              <a href={DISCORD_URL} target="_blank">
                <FontAwesomeIcon icon={faDiscord} className="mr-2" />
                Join Discord
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
          >
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
            >
              <Link to="/onboarding">
                Try Moneko for free
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Trust indicator */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          Join the movement of never settling
        </motion.p>
      </div>
    </section>
  );
}