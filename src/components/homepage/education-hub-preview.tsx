import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faCalculator,
  faChartLine,
  faBookOpen,
  faPlay,
  faClock,
  faUsers,
  faArrowRight,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  category: string;
  icon: any;
  color: string;
  progress?: number;
}

interface Calculator {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  popular: boolean;
}

const featuredCourses: Course[] = [
  {
    id: "budgeting-basics",
    title: "Smart Budgeting Fundamentals",
    description:
      "Master the art of budgeting with AI-powered insights and behavioral finance principles",
    duration: "2.5 hours",
    lessons: 12,
    level: "Beginner",
    category: "Budgeting",
    icon: faCalculator,
    color: "bg-blue-500",
    progress: 0,
  },
  {
    id: "investment-strategy",
    title: "AI-Powered Investment Strategy",
    description:
      "Learn how to build and optimize investment portfolios using artificial intelligence",
    duration: "3.2 hours",
    lessons: 16,
    level: "Intermediate",
    category: "Investing",
    icon: faChartLine,
    color: "bg-green-500",
    progress: 0,
  },
  {
    id: "financial-psychology",
    title: "Behavioral Finance Mastery",
    description:
      "Understand and overcome psychological biases that impact your financial decisions",
    duration: "2.8 hours",
    lessons: 14,
    level: "Advanced",
    category: "Psychology",
    icon: faGraduationCap,
    color: "bg-purple-500",
    progress: 0,
  },
];

const calculators: Calculator[] = [
  {
    id: "compound-interest",
    name: "Compound Interest Calculator",
    description:
      "See how your investments grow over time with compound interest",
    icon: faChartLine,
    color: "text-green-600",
    popular: true,
  },
  {
    id: "retirement-planner",
    name: "Retirement Planning Calculator",
    description: "Plan your retirement savings and see if you're on track",
    icon: faCalculator,
    color: "text-blue-600",
    popular: true,
  },
  {
    id: "debt-payoff",
    name: "Debt Payoff Calculator",
    description: "Create a strategy to pay off your debts faster",
    icon: faCalculator,
    color: "text-red-600",
    popular: false,
  },
  {
    id: "mortgage-calculator",
    name: "Mortgage Calculator",
    description: "Calculate monthly payments and total interest for home loans",
    icon: faCalculator,
    color: "text-orange-600",
    popular: true,
  },
];

const learningStats = [
  {
    label: "Active Learners",
    value: "Learn",
    icon: faUsers,
    color: "text-blue-600",
  },
  {
    label: "Course Completion Rate",
    value: "Progress",
    icon: faGraduationCap,
    color: "text-green-600",
  },
  {
    label: "Average Rating",
    value: "Feedback",
    icon: faStar,
    color: "text-yellow-600",
  },
];

export function EducationHubPreview() {
  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
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
              Financial Education Hub
            </Badge>
          </motion.div>

          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Learn budgeting and investing fundamentals
          </motion.h2>

          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Explore practical lessons and calculators you can use to plan,
            track, and review your next steps.
          </motion.p>
        </div>

        {/* Learning Stats */}
        <motion.div
          className="mb-12 grid grid-cols-1 gap-6 sm:mb-16 sm:grid-cols-3"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          {learningStats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div
                className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-lg dark:from-slate-800 dark:to-slate-700 ${stat.color}`}
              >
                <FontAwesomeIcon icon={stat.icon} className="h-6 w-6" />
              </div>
              <div className="text-foreground text-2xl font-bold sm:text-3xl">
                {stat.value}
              </div>
              <div className="text-muted-foreground text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Featured Courses */}
          <div>
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h3 className="text-foreground mb-4 flex items-center text-2xl font-bold">
                <FontAwesomeIcon
                  icon={faBookOpen}
                  className="text-primary mr-3 h-6 w-6"
                />
                Featured Courses
              </h3>
              <p className="text-muted-foreground">
                Expert-designed courses covering all aspects of personal finance
              </p>
            </motion.div>

            <div className="space-y-6">
              {featuredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="group border-white/20 bg-white/60 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/60">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl ${course.color} flex-shrink-0 text-white shadow-md`}
                        >
                          <FontAwesomeIcon
                            icon={course.icon}
                            className="h-6 w-6"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between">
                            <h4 className="text-foreground text-lg leading-tight font-semibold">
                              {course.title}
                            </h4>
                            <Badge
                              variant="outline"
                              className={`ml-2 text-xs ${
                                course.level === "Beginner"
                                  ? "border-green-500 text-green-600"
                                  : course.level === "Intermediate"
                                    ? "border-yellow-500 text-yellow-600"
                                    : "border-red-500 text-red-600"
                              }`}
                            >
                              {course.level}
                            </Badge>
                          </div>

                          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                            {course.description}
                          </p>

                          <div className="text-muted-foreground mb-4 flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon
                                icon={faClock}
                                className="h-3 w-3"
                              />
                              <span>{course.duration}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon
                                icon={faPlay}
                                className="h-3 w-3"
                              />
                              <span>{course.lessons} lessons</span>
                            </div>
                          </div>

                          {course.progress !== undefined && (
                            <div className="mb-4">
                              <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                                <span>Progress</span>
                                <span>{course.progress}%</span>
                              </div>
                              <Progress
                                value={course.progress}
                                className="h-2"
                              />
                            </div>
                          )}

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            <Link to="/guides/how-to-calculate-net-worth">
                              View Guide
                              <FontAwesomeIcon
                                icon={faArrowRight}
                                className="ml-2 h-3 w-3"
                              />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Interactive Calculators */}
          <div>
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h3 className="text-foreground mb-4 flex items-center text-2xl font-bold">
                <FontAwesomeIcon
                  icon={faCalculator}
                  className="text-primary mr-3 h-6 w-6"
                />
                Interactive Calculators
              </h3>
              <p className="text-muted-foreground">
                Powerful tools to plan and optimize your financial decisions
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {calculators.map((calculator, index) => (
                <motion.div
                  key={calculator.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="group h-full cursor-pointer border-white/20 bg-white/40 shadow-md backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/50 dark:bg-slate-900/40">
                    <CardContent className="p-6 text-center">
                      <div className="relative mb-4">
                        <div
                          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 shadow-md dark:from-slate-800 dark:to-slate-700 ${calculator.color}`}
                        >
                          <FontAwesomeIcon
                            icon={calculator.icon}
                            className="h-6 w-6"
                          />
                        </div>
                        {calculator.popular && (
                          <Badge
                            variant="secondary"
                            className="bg-primary text-primary-foreground absolute -top-2 -right-2 px-2 py-1 text-xs"
                          >
                            Popular
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-foreground mb-2 text-sm leading-tight font-semibold">
                        {calculator.name}
                      </h4>
                      <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
                        {calculator.description}
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="group-hover:bg-primary group-hover:text-primary-foreground w-full transition-colors"
                      >
                        <Link to="/calculators">Try Calculator</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* CTA for All Calculators */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              viewport={{ once: true }}
            >
              <Card className="from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-primary/20 bg-gradient-to-r">
                <CardContent className="p-6 text-center">
                  <h4 className="text-foreground mb-2 font-semibold">
                    Explore All Financial Calculators
                  </h4>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Access 15+ professional-grade calculators for comprehensive
                    financial planning
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/calculators">
                      View All Calculators
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="ml-2 h-3 w-3"
                      />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          viewport={{ once: true }}
        >
          <div className="from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-2xl bg-gradient-to-r p-8 sm:p-12">
            <h3 className="text-foreground mb-4 text-2xl font-bold sm:text-3xl">
              Start Your Financial Education Journey
            </h3>
            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
              Practical guides and calculators to help you plan, learn, and take
              action.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
              >
                <Link to="/guides/how-to-calculate-net-worth">
                  Browse Guides
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Link to="/calculators">Try Calculators</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
