import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faCheck, 
  faTimes, 
  faRobot,
  faBrain,
  faChartLine,
  faShieldAlt,
  faGraduationCap,
  faClock
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";

interface ComparisonFeature {
  feature: string;
  description: string;
  moneko: boolean | string;
  traditional: boolean | string;
  competitors: boolean | string;
  icon: any;
}

const features: ComparisonFeature[] = [
  {
    feature: "AI Personal Finance Coach",
    description: "24/7 personalized financial guidance and recommendations",
    moneko: "Advanced AI with CFA expertise",
    traditional: false,
    competitors: "Basic chatbot",
    icon: faRobot
  },
  {
    feature: "Behavioral Finance Analysis",
    description: "AI analyzes spending patterns and suggests improvements",
    moneko: "Deep learning algorithms",
    traditional: false,
    competitors: "Limited analysis",
    icon: faBrain
  },
  {
    feature: "Dynamic Portfolio Optimization",
    description: "Real-time portfolio adjustments based on market conditions",
    moneko: "AI-powered rebalancing",
    traditional: "Manual rebalancing",
    competitors: "Quarterly rebalancing",
    icon: faChartLine
  },
  {
    feature: "Personalized Learning Paths",
    description: "Adaptive financial education based on your goals and knowledge",
    moneko: "AI-curated curriculum",
    traditional: false,
    competitors: "Generic courses",
    icon: faGraduationCap
  },
  {
    feature: "Predictive Financial Planning",
    description: "AI forecasts future financial scenarios and outcomes",
    moneko: "Advanced ML models",
    traditional: "Basic projections",
    competitors: "Simple calculators",
    icon: faChartLine
  },
  {
    feature: "Real-time Risk Assessment",
    description: "Continuous monitoring and adjustment of investment risk",
    moneko: "AI risk algorithms",
    traditional: "Annual reviews",
    competitors: "Quarterly reviews",
    icon: faShieldAlt
  },
  {
    feature: "Automated Goal Tracking",
    description: "Smart milestone detection and progress optimization",
    moneko: "AI-powered insights",
    traditional: "Manual tracking",
    competitors: "Basic tracking",
    icon: faClock
  },
  {
    feature: "Behavioral Coaching",
    description: "AI identifies and helps overcome financial behavioral biases",
    moneko: "Psychology-based AI",
    traditional: false,
    competitors: false,
    icon: faBrain
  }
];

const platforms = [
  {
    name: "Moneko AI",
    description: "AI-Powered Financial Coach",
    highlight: true,
    color: "bg-primary text-primary-foreground"
  },
  {
    name: "Traditional Advisors",
    description: "Human Financial Advisors",
    highlight: false,
    color: "bg-muted text-muted-foreground"
  },
  {
    name: "Other Robo-Advisors",
    description: "Basic Automated Platforms",
    highlight: false,
    color: "bg-muted text-muted-foreground"
  }
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <div className="flex items-center space-x-2">
        <FontAwesomeIcon 
          icon={faCheck} 
          className="h-4 w-4 text-green-500 flex-shrink-0" 
        />
        <span className="text-sm font-medium">{value}</span>
      </div>
    );
  }
  
  if (value === true) {
    return (
      <FontAwesomeIcon 
        icon={faCheck} 
        className="h-5 w-5 text-green-500" 
      />
    );
  }
  
  return (
    <FontAwesomeIcon 
      icon={faTimes} 
      className="h-5 w-5 text-red-400" 
    />
  );
}

export function AIFeaturesComparison() {
  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 bg-gradient-to-br from-indigo-50/30 to-purple-50/20 dark:from-indigo-900/20 dark:to-purple-900/10">
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
              AI-Powered Advantage
            </Badge>
          </motion.div>
          
          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Why Choose AI-Powered Financial Coaching?
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            See how Moneko's advanced AI capabilities compare to traditional financial services and basic robo-advisors
          </motion.p>
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10">
              <CardTitle className="text-center text-2xl font-bold">
                Feature Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="w-1/3 p-6 font-semibold">
                        Features & Capabilities
                      </TableHead>
                      {platforms.map((platform) => (
                        <TableHead 
                          key={platform.name}
                          className={`text-center p-6 ${platform.highlight ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                        >
                          <div className="space-y-2">
                            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${platform.color}`}>
                              {platform.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-normal">
                              {platform.description}
                            </div>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature, index) => (
                      <TableRow 
                        key={feature.feature}
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="p-6">
                          <div className="flex items-start space-x-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-1">
                              <FontAwesomeIcon 
                                icon={feature.icon} 
                                className="h-4 w-4" 
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground mb-1">
                                {feature.feature}
                              </div>
                              <div className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-6 text-center bg-primary/5 dark:bg-primary/10">
                          <FeatureCell value={feature.moneko} />
                        </TableCell>
                        <TableCell className="p-6 text-center">
                          <FeatureCell value={feature.traditional} />
                        </TableCell>
                        <TableCell className="p-6 text-center">
                          <FeatureCell value={feature.competitors} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4 sm:text-3xl">
              Experience the AI Advantage Today
            </h3>
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Join thousands of users who've transformed their financial lives with Moneko's AI-powered coaching
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
              >
                <Link to="/dashboard">
                  Start Free Trial
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Link to="/dashboard/learning">
                  Explore AI Features
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
