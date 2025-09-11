import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChevronLeft, 
  faChevronRight, 
  faQuoteLeft,
  faStar,
  faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  company?: string;
  avatar: string;
  quote: string;
  achievement: string;
  savings: string;
  timeframe: string;
  rating: number;
  verified: boolean;
  category: "budgeting" | "investing" | "debt" | "savings" | "education";
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Chen",
    role: "Marketing Manager",
    company: "Tech Startup",
    avatar: "https://placekitten.com/150/150?random=1",
    quote: "Moneko's AI coach helped me save $15,000 in just 8 months by optimizing my spending habits and investment strategy. The personalized insights were game-changing!",
    achievement: "Built 6-month emergency fund",
    savings: "$15,000",
    timeframe: "8 months",
    rating: 5,
    verified: true,
    category: "savings"
  },
  {
    id: "2",
    name: "Marcus Johnson",
    role: "Software Engineer",
    avatar: "https://placekitten.com/150/150?random=2",
    quote: "I was drowning in student debt until Moneko created a personalized payoff plan. I'm now debt-free and investing 20% of my income!",
    achievement: "Became debt-free",
    savings: "$45,000",
    timeframe: "18 months",
    rating: 5,
    verified: true,
    category: "debt"
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    role: "Teacher",
    avatar: "https://placekitten.com/150/150?random=3",
    quote: "As a teacher, I never thought I could invest. Moneko's education modules and AI guidance helped me start with just $50/month. My portfolio is up 23%!",
    achievement: "Started investing journey",
    savings: "$8,500",
    timeframe: "12 months",
    rating: 5,
    verified: true,
    category: "investing"
  },
  {
    id: "4",
    name: "David Park",
    role: "Small Business Owner",
    avatar: "https://placekitten.com/150/150?random=4",
    quote: "Moneko helped me separate personal and business finances, optimize cash flow, and plan for retirement. My financial stress is completely gone.",
    achievement: "Organized business finances",
    savings: "$32,000",
    timeframe: "10 months",
    rating: 5,
    verified: true,
    category: "budgeting"
  },
  {
    id: "5",
    name: "Lisa Thompson",
    role: "Nurse",
    avatar: "https://placekitten.com/150/150?random=5",
    quote: "Working night shifts made budgeting impossible. Moneko's automated tracking and AI insights helped me save for a house down payment!",
    achievement: "Saved for house down payment",
    savings: "$25,000",
    timeframe: "14 months",
    rating: 5,
    verified: true,
    category: "savings"
  },
  {
    id: "6",
    name: "James Wilson",
    role: "Recent Graduate",
    avatar: "https://placekitten.com/150/150?random=6",
    quote: "Fresh out of college with no financial knowledge, Moneko's education platform taught me everything. I'm now confidently managing my money!",
    achievement: "Achieved financial literacy",
    savings: "$5,200",
    timeframe: "6 months",
    rating: 5,
    verified: true,
    category: "education"
  }
];

const categoryColors = {
  budgeting: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  investing: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  debt: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  savings: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  education: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
};

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
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
              Success Stories
            </Badge>
          </motion.div>
          
          <motion.h2
            className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Real People, Real Results
          </motion.h2>
          
          <motion.p
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Discover how Moneko users transformed their financial lives with AI-powered guidance
          </motion.p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-2xl">
                <CardContent className="p-8 sm:p-12">
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
                    {/* Quote Section */}
                    <div className="lg:col-span-2">
                      <div className="mb-6">
                        <FontAwesomeIcon 
                          icon={faQuoteLeft} 
                          className="h-8 w-8 text-primary/30 mb-4" 
                        />
                        <blockquote className="text-xl leading-relaxed text-foreground sm:text-2xl font-medium">
                          "{currentTestimonial.quote}"
                        </blockquote>
                      </div>

                      {/* Achievement Stats */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {currentTestimonial.savings}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Savings
                          </div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {currentTestimonial.timeframe}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Time Frame
                          </div>
                        </div>
                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
                          <div className="flex justify-center mb-1">
                            {[...Array(currentTestimonial.rating)].map((_, i) => (
                              <FontAwesomeIcon 
                                key={i}
                                icon={faStar} 
                                className="h-4 w-4 text-yellow-500" 
                              />
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Rating
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profile Section */}
                    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                      <Avatar className="h-20 w-20 mb-4 ring-4 ring-white/20 shadow-lg">
                        <AvatarImage 
                          src={currentTestimonial.avatar} 
                          alt={currentTestimonial.name}
                        />
                        <AvatarFallback className="text-lg font-semibold">
                          {currentTestimonial.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="mb-4">
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                          <h4 className="text-lg font-semibold text-foreground">
                            {currentTestimonial.name}
                          </h4>
                          {currentTestimonial.verified && (
                            <FontAwesomeIcon 
                              icon={faCheckCircle} 
                              className="h-4 w-4 text-green-500" 
                              title="Verified User"
                            />
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {currentTestimonial.role}
                          {currentTestimonial.company && ` at ${currentTestimonial.company}`}
                        </p>
                      </div>

                      <Badge 
                        className={`mb-4 ${categoryColors[currentTestimonial.category]} border-0`}
                      >
                        {currentTestimonial.category.charAt(0).toUpperCase() + currentTestimonial.category.slice(1)}
                      </Badge>

                      <div className="text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                        <strong>Key Achievement:</strong><br />
                        {currentTestimonial.achievement}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-4 sm:-left-6">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="h-12 w-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20 dark:border-slate-600/20 shadow-lg hover:bg-white dark:hover:bg-slate-700"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 sm:-right-6">
            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="h-12 w-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-white/20 dark:border-slate-600/20 shadow-lg hover:bg-white dark:hover:bg-slate-700"
            >
              <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center mt-8 space-x-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToTestimonial(index)}
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-primary scale-125' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
