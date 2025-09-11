import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTrophy,
  faNewspaper,
  faStar,
  faAward,
  faQuoteLeft
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
    publication: "TechCrunch",
    logo: "TC",
    headline: "Moneko's AI Coach Revolutionizes Personal Finance",
    quote: "Moneko's sophisticated AI algorithms provide personalized financial guidance that rivals human advisors at a fraction of the cost.",
    date: "2024",
    type: "press"
  },
  {
    id: "2",
    publication: "Forbes",
    logo: "F",
    headline: "Top 10 FinTech Startups to Watch",
    quote: "Moneko combines cutting-edge AI with behavioral finance principles to deliver truly personalized financial coaching.",
    date: "2024",
    type: "press"
  },
  {
    id: "3",
    publication: "Product Hunt",
    logo: "PH",
    headline: "#1 Product of the Day",
    quote: "Moneko earned the top spot with its innovative approach to AI-powered financial education and portfolio management.",
    date: "2024",
    type: "award"
  },
  {
    id: "4",
    publication: "App Store",
    logo: "AS",
    headline: "4.9/5 Stars - Editor's Choice",
    quote: "Users consistently praise Moneko's intuitive interface and powerful AI insights that make financial planning accessible to everyone.",
    date: "2024",
    type: "review"
  }
];

const awards: Award[] = [
  {
    id: "1",
    title: "Best FinTech Innovation",
    organization: "FinTech Awards 2024",
    year: "2024",
    description: "Recognized for breakthrough AI technology in personal finance",
    icon: faTrophy,
    color: "text-yellow-600"
  },
  {
    id: "2",
    title: "Y Combinator Alumni",
    organization: "Y Combinator",
    year: "2023",
    description: "Selected from thousands of applicants for prestigious accelerator program",
    icon: faAward,
    color: "text-orange-600"
  },
  {
    id: "3",
    title: "SOC 2 Type II Certified",
    organization: "Security Compliance",
    year: "2024",
    description: "Highest level of security and data protection certification",
    icon: faAward,
    color: "text-blue-600"
  },
  {
    id: "4",
    title: "Top Rated App",
    organization: "App Store & Google Play",
    year: "2024",
    description: "Consistently rated 4.9/5 stars across all platforms",
    icon: faStar,
    color: "text-purple-600"
  }
];

const trustLogos = [
  { name: "TechCrunch", abbr: "TC", color: "bg-green-600" },
  { name: "Forbes", abbr: "F", color: "bg-blue-600" },
  { name: "Product Hunt", abbr: "PH", color: "bg-orange-600" },
  { name: "Y Combinator", abbr: "YC", color: "bg-red-600" },
  { name: "App Store", abbr: "AS", color: "bg-gray-600" },
  { name: "Google Play", abbr: "GP", color: "bg-green-500" }
];

export function MediaCoverageSection() {
  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 bg-gradient-to-br from-slate-50/30 to-gray-50/20 dark:from-slate-900/30 dark:to-gray-900/20">
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
              className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium"
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
            See what leading publications and industry experts are saying about Moneko's innovative approach to AI-powered financial coaching
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
              <Card className="h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold text-lg flex-shrink-0">
                      {mention.logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          {mention.publication}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            mention.type === 'award' ? 'border-yellow-500 text-yellow-600' :
                            mention.type === 'review' ? 'border-green-500 text-green-600' :
                            'border-blue-500 text-blue-600'
                          }`}
                        >
                          {mention.type === 'award' ? 'Award' : 
                           mention.type === 'review' ? 'Review' : 'Press'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {mention.date}
                      </p>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-foreground mb-3 text-base leading-tight">
                    {mention.headline}
                  </h4>
                  
                  <div className="relative">
                    <FontAwesomeIcon 
                      icon={faQuoteLeft} 
                      className="absolute -top-2 -left-1 h-4 w-4 text-primary/30" 
                    />
                    <blockquote className="text-muted-foreground text-sm leading-relaxed pl-6 italic">
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
            className="text-center text-2xl font-bold text-foreground mb-8 sm:text-3xl"
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
                <Card className="h-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-white/20 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6 text-center">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-lg mx-auto mb-4 ${award.color}`}>
                      <FontAwesomeIcon 
                        icon={award.icon} 
                        className="h-8 w-8" 
                      />
                    </div>
                    <h4 className="font-semibold text-foreground mb-2 text-base leading-tight">
                      {award.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {award.organization}
                    </p>
                    <Badge variant="outline" className="mb-3 text-xs">
                      {award.year}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed">
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
          <p className="text-muted-foreground mb-8 text-sm font-medium uppercase tracking-wide">
            Featured In & Trusted By
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12">
            {trustLogos.map((logo, index) => (
              <div
                key={logo.name}
                className="flex items-center space-x-3 opacity-60 hover:opacity-100 transition-opacity"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${logo.color} text-white font-bold text-sm shadow-md`}>
                  {logo.abbr}
                </div>
                <span className="text-muted-foreground font-medium text-sm">
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
