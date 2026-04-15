import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrophy,
  faNewspaper,
  faStar,
  faAward,
  faQuoteLeft,
} from "@fortawesome/free-solid-svg-icons";

interface MediaMention {
  id: string;
  publication: string;
  logo: string;
  headline: string;
  quote: string;
  date: string;
  type: "press" | "award" | "review";
  url?: string;
}

interface Award {
  id: string;
  title: string;
  organization: string;
  year: string;
  description: string;
  icon: any;
  color: string;
}

const mediaMentions: MediaMention[] = [
  {
    id: "1",
    publication: "Budgeting",
    logo: "B",
    headline: "A chat-first way to keep your budget current",
    quote:
      "Capture spending from messages, receipts, and notifications, then review before saving.",
    date: "2024",
    type: "press",
  },
  {
    id: "2",
    publication: "Pockets",
    logo: "P",
    headline: "Envelope-style budgeting that stays usable",
    quote:
      "Plan with pockets and recurring items so day-to-day decisions are easier.",
    date: "2024",
    type: "press",
  },
  {
    id: "3",
    publication: "Households",
    logo: "H",
    headline: "Shared budgeting workflows for couples",
    quote:
      "Keep shared and personal spending visible without extra spreadsheets.",
    date: "2024",
    type: "award",
  },
  {
    id: "4",
    publication: "Review-first",
    logo: "R",
    headline: "Confirm details before saving",
    quote:
      "Stay in control by reviewing what was captured before it hits your budget.",
    date: "2024",
    type: "review",
  },
];

const awards: Award[] = [
  {
    id: "1",
    title: "Designed for consistency",
    organization: "Product",
    year: "2024",
    description: "Built to reduce manual entry and keep budgets up to date",
    icon: faTrophy,
    color: "text-yellow-600",
  },
  {
    id: "2",
    title: "Multi-platform",
    organization: "Web, iOS, Android",
    year: "2023",
    description: "Use the same workflow across devices and chat",
    icon: faAward,
    color: "text-orange-600",
  },
  {
    id: "3",
    title: "Security-focused",
    organization: "Security",
    year: "2024",
    description: "Designed with privacy and safety in mind",
    icon: faAward,
    color: "text-blue-600",
  },
  {
    id: "4",
    title: "Review-first",
    organization: "Workflow",
    year: "2024",
    description: "Confirm captured details before saving",
    icon: faStar,
    color: "text-purple-600",
  },
];

const trustLogos = [
  { name: "Chat-first", abbr: "C", color: "bg-green-600" },
  { name: "Pockets", abbr: "P", color: "bg-blue-600" },
  { name: "Households", abbr: "H", color: "bg-orange-600" },
  { name: "Review-first", abbr: "R", color: "bg-red-600" },
  { name: "Multi-platform", abbr: "M", color: "bg-gray-600" },
  { name: "Automation", abbr: "A", color: "bg-green-500" },
];

export function MediaCoverageSection() {
  return (
    <section className="relative z-10 bg-gradient-to-br from-slate-50/30 to-gray-50/20 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 dark:from-slate-900/30 dark:to-gray-900/20">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-12 text-center sm:mb-16">
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-2 text-sm font-medium"
            >
              Media & Recognition
            </Badge>
          </motion.div>

          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Trusted by Industry Leaders
          </motion.h2>

          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            See what leading publications and industry experts are saying about
            Moneko's innovative approach to AI-powered financial coaching
          </motion.p>
        </div>

        {/* Media Mentions Grid */}
        <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {mediaMentions.map((mention, index) => (
            <motion.div
              key={mention.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-white/20 bg-white/60 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/60">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4 flex items-start space-x-4">
                    <div className="from-primary/20 to-secondary/20 text-primary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold">
                      {mention.logo}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center space-x-2">
                        <h3 className="text-foreground text-lg font-semibold">
                          {mention.publication}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            mention.type === "award"
                              ? "border-yellow-500 text-yellow-600"
                              : mention.type === "review"
                                ? "border-green-500 text-green-600"
                                : "border-blue-500 text-blue-600"
                          }`}
                        >
                          {mention.type === "award"
                            ? "Award"
                            : mention.type === "review"
                              ? "Review"
                              : "Press"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-2 text-sm">
                        {mention.date}
                      </p>
                    </div>
                  </div>

                  <h4 className="text-foreground mb-3 text-base leading-tight font-semibold">
                    {mention.headline}
                  </h4>

                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faQuoteLeft}
                      className="text-primary/30 absolute -top-2 -left-1 h-4 w-4"
                    />
                    <blockquote className="text-muted-foreground pl-6 text-sm leading-relaxed italic">
                      {mention.quote}
                    </blockquote>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Awards Section */}
        <div className="mb-16">
          <motion.h3
            className="text-foreground mb-8 text-center text-2xl font-bold sm:text-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Awards & Certifications
          </motion.h3>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {awards.map((award, index) => (
              <motion.div
                key={award.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full border-white/20 bg-white/40 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-900/40">
                  <CardContent className="p-6 text-center">
                    <div
                      className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-slate-50 shadow-lg dark:from-slate-800 dark:to-slate-700 ${award.color}`}
                    >
                      <FontAwesomeIcon icon={award.icon} className="h-8 w-8" />
                    </div>
                    <h4 className="text-foreground mb-2 text-base leading-tight font-semibold">
                      {award.title}
                    </h4>
                    <p className="text-muted-foreground mb-2 text-sm">
                      {award.organization}
                    </p>
                    <Badge variant="outline" className="mb-3 text-xs">
                      {award.year}
                    </Badge>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {award.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trust Logos */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <p className="text-muted-foreground mb-8 text-sm font-medium tracking-wide uppercase">
            Built around a few core ideas
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 md:gap-12">
            {trustLogos.map((logo, index) => (
              <div
                key={logo.name}
                className="flex items-center space-x-3 opacity-60 transition-opacity hover:opacity-100"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${logo.color} text-sm font-bold text-white shadow-md`}
                >
                  {logo.abbr}
                </div>
                <span className="text-muted-foreground text-sm font-medium">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
