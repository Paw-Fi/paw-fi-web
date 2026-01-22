import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faQuoteLeft } from "@fortawesome/free-solid-svg-icons";

interface SocialProofSectionProps {
  prefersReducedMotion?: boolean;
}

export function SocialProofSection({ prefersReducedMotion }: SocialProofSectionProps) {
  const trustNotes = [
    {
      title: "You control what you save",
      description: "Capture transactions, review, and confirm details before they’re stored."
    },
    {
      title: "Built around practical budgeting",
      description: "Pockets (envelopes), recurring items, and scenario planning help you stay on top of day-to-day money."
    },
    {
      title: "Questions? Reach us",
      description: "For billing or security questions, contact hello@moneko.io."
    }
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  return (
    <motion.section
      className="mt-20 space-y-16"
      variants={prefersReducedMotion ? undefined : staggerVariants}
      initial={prefersReducedMotion ? undefined : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "visible"}
      viewport={{ once: true }}
    >
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <h3 className="mb-12 text-center text-2xl font-bold text-foreground">
          Built for clarity and control
        </h3>
        <div className="grid gap-8 md:grid-cols-3">
          {trustNotes.map((note) => (
            <motion.div
              key={note.title}
              className="rounded-xl bg-card p-8 shadow-sm transition-all duration-200 hover:shadow-md"
              variants={prefersReducedMotion ? undefined : cardVariants}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-1" aria-hidden="true">
                  <FontAwesomeIcon icon={faStar} className="h-4 w-4 text-warning" />
                </div>
                <FontAwesomeIcon
                  icon={faQuoteLeft}
                  className="h-6 w-6 text-muted-foreground-color/30"
                />
              </div>
              <div className="font-semibold text-foreground">{note.title}</div>
              <p className="mt-2 text-sm text-muted-foreground-color leading-relaxed">
                {note.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}