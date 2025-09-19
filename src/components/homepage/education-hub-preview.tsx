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
  faStar
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  students: number;
  rating: number;
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
    description: "Master the art of budgeting with AI-powered insights and behavioral finance principles",
    duration: "2.5 hours",
    lessons: 12,
    students: 15420,
    rating: 4.9,
    level: "Beginner",
    category: "Budgeting",
    icon: faCalculator,
    color: "bg-blue-500",
    progress: 0
  },
  {
    id: "investment-strategy",
    title: "AI-Powered Investment Strategy",
    description: "Learn how to build and optimize investment portfolios using artificial intelligence",
    duration: "3.2 hours",
    lessons: 16,
    students: 12850,
    rating: 4.8,
    level: "Intermediate",
    category: "Investing",
    icon: faChartLine,
    color: "bg-green-500",
    progress: 0
  },
  {
    id: "financial-psychology",
    title: "Behavioral Finance Mastery",
    description: "Understand and overcome psychological biases that impact your financial decisions",
    duration: "2.8 hours",
    lessons: 14,
    students: 9630,
    rating: 4.9,
    level: "Advanced",
    category: "Psychology",
    icon: faGraduationCap,
    color: "bg-purple-500",
    progress: 0
  }
];

const calculators: Calculator[] = [
  {
    id: "compound-interest",
    name: "Compound Interest Calculator",
    description: "See how your investments grow over time with compound interest",
    icon: faChartLine,
    color: "text-green-600",
    popular: true
  },
  {
    id: "retirement-planner",
    name: "Retirement Planning Calculator",
    description: "Plan your retirement savings and see if you're on track",
    icon: faCalculator,
    color: "text-blue-600",
    popular: true
  },
  {
    id: "debt-payoff",
    name: "Debt Payoff Calculator",
    description: "Create a strategy to pay off your debts faster",
    icon: faCalculator,
    color: "text-red-600",
    popular: false
  },
  {
    id: "mortgage-calculator",
    name: "Mortgage Calculator",
    description: "Calculate monthly payments and total interest for home loans",
    icon: faCalculator,
    color: "text-orange-600",
    popular: true
  }
];

const learningStats = [
  {
    label: "Active Learners",
    value: "25,000+",
    icon: faUsers,
    color: "text-blue-600"
  },
  {
    label: "Course Completion Rate",
    value: "87%",
    icon: faGraduationCap,
    color: "text-green-600"
  },
  {
    label: "Average Rating",
    value: "4.9/5",
    icon: faStar,
    color: "text-yellow-600"
  }
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
              className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-2 text-sm font-medium"
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
            Master Money Management with Expert-Led Courses
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Access comprehensive financial education courses and interactive calculators designed by certified professionals
          </motion.p>
        </div>

        {/* Learning Stats */}
        <motion.div
          className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
        >
          {learningStats.map((stat, index) => (
            <div key={stat.label} className="text-center">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-lg mb-3 ${stat.color}`}>
                <FontAwesomeIcon icon={stat.icon} className="h-6 w-6" />
              </div>
              <div className="text-2xl font-bold text-foreground sm:text-3xl">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">
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
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                <FontAwesomeIcon icon={faBookOpen} className="h-6 w-6 text-primary mr-3" />
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
                  <Card className="group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${course.color} text-white shadow-md flex-shrink-0`}>
                          <FontAwesomeIcon icon={course.icon} className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground text-lg leading-tight">
                              {course.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`ml-2 text-xs ${
                                course.level === 'Beginner' ? 'border-green-500 text-green-600' :
                                course.level === 'Intermediate' ? 'border-yellow-500 text-yellow-600' :
                                'border-red-500 text-red-600'
                              }`}
                            >
                              {course.level}
                            </Badge>
                          </div>
                          
                          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                            {course.description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-4">
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faClock} className="h-3 w-3" />
                              <span>{course.duration}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faPlay} className="h-3 w-3" />
                              <span>{course.lessons} lessons</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faUsers} className="h-3 w-3" />
                              <span>{course.students.toLocaleString()} students</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FontAwesomeIcon icon={faStar} className="h-3 w-3 text-yellow-500" />
                              <span>{course.rating}</span>
                            </div>
                          </div>
                          
                          {course.progress !== undefined && (
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progress</span>
                                <span>{course.progress}%</span>
                              </div>
                              <Progress value={course.progress} className="h-2" />
                            </div>
                          )}
                          
                          <Button 
                            asChild
                            variant="outline" 
                            size="sm"
                            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          >
                            <Link to={"/dashboard/learning/$courseId" as any} params={{ courseId: course.id }}>
                              Start Course
                              <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
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
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                <FontAwesomeIcon icon={faCalculator} className="h-6 w-6 text-primary mr-3" />
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
                  <Card className="group h-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-white/20 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="relative mb-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-md mx-auto ${calculator.color}`}>
                          <FontAwesomeIcon icon={calculator.icon} className="h-6 w-6" />
                        </div>
                        {calculator.popular && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1"
                          >
                            Popular
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-foreground mb-2 text-sm leading-tight">
                        {calculator.name}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {calculator.description}
                      </p>
                      <Button 
                        asChild
                        variant="outline" 
                        size="sm" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        <Link to="/calculators">
                          Try Calculator
                        </Link>
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
              <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-primary/20">
                <CardContent className="p-6 text-center">
                  <h4 className="font-semibold text-foreground mb-2">
                    Explore All Financial Calculators
                  </h4>
                  <p className="text-muted-foreground text-sm mb-4">
                    Access 15+ professional-grade calculators for comprehensive financial planning
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/calculators">
                      View All Calculators
                      <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
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
          <div className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-2xl p-8 sm:p-12">
            <h3 className="text-2xl font-bold text-foreground mb-4 sm:text-3xl">
              Start Your Financial Education Journey
            </h3>
            <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
              Join thousands of learners who've transformed their financial knowledge with our expert-led courses
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
              >
                <Link to="/dashboard/learning">
                  Browse All Courses
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg font-semibold"
              >
                <Link to="/calculators">
                  Try Calculators
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
