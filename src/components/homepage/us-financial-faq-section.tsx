import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { 
  USFinancialFAQ, 
  faqCategories, 
  getPopularFAQs, 
  getFAQsByCategory,
  usFinancialFAQs,
  generateFAQStructuredData
} from "@/data/us-financial-faqs";

interface USFinancialFAQSectionProps {
  maxFAQs?: number;
  showCategoryFilter?: boolean;
  showStructuredData?: boolean;
  className?: string;
}

// Apple-inspired animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Apple-like easing
    },
  },
};

// Color mapping for categories using semantic backgrounds
const categoryColors = {
  retirement: "bg-green-50/50 dark:bg-green-950/30",
  investing: "bg-blue-50/50 dark:bg-blue-950/30", 
  housing: "bg-purple-50/50 dark:bg-purple-950/30",
  debt: "bg-amber-50/50 dark:bg-amber-950/30",
  tax: "bg-indigo-50/50 dark:bg-indigo-950/30",
  education: "bg-emerald-50/50 dark:bg-emerald-950/30"
};

export function USFinancialFAQSection({ 
  maxFAQs = 10,
  showCategoryFilter = true,
  showStructuredData = true,
  className = ""
}: USFinancialFAQSectionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get FAQs based on selection
  const displayedFAQs = selectedCategory 
    ? getFAQsByCategory(selectedCategory).slice(0, maxFAQs)
    : usFinancialFAQs.slice(0, maxFAQs);

  const popularFAQs = getPopularFAQs().slice(0, 4);

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  // Generate structured data for AI accessibility
  const generateStructuredData = () => {
    if (!showStructuredData) return null;
    
    const structuredData = generateFAQStructuredData(displayedFAQs);

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
    );
  };

  return (
    <>
      {generateStructuredData()}
      
      <section className={`min-h-screen bg-background ${className}`}>
        <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-20">
          
          {/* Section Header */}
          <motion.div
            className="text-center mb-16"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={itemVariants}>
              <Badge 
                variant="secondary" 
                className="mb-6 bg-primary/10 text-primary px-6 py-2 text-sm font-medium rounded-full"
              >
                🇺🇸 US Financial Guidance
              </Badge>
            </motion.div>
            
            <motion.h2
              className="text-foreground mb-6 text-4xl leading-tight font-light sm:text-5xl md:text-6xl"
              variants={itemVariants}
            >
              Your US Financial Questions,{" "}
              <span className="text-primary">Answered</span>
            </motion.h2>
            
            <motion.p
              className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
              variants={itemVariants}
            >
              Get expert answers to the most common US financial questions, from 401(k) optimization to homebuying strategies
            </motion.p>
          </motion.div>

          {/* Popular Questions */}
          <motion.div
            className="mb-20"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h3 
              className="text-2xl font-medium text-foreground mb-8"
              variants={itemVariants}
            >
              Most Popular Questions
            </motion.h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {popularFAQs.map((faq) => (
                <motion.div
                  key={faq.id}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card 
                    className="bg-background rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group h-full"
                    onClick={() => toggleItem(faq.id)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`px-4 py-2 rounded-2xl text-sm font-medium ${categoryColors[faq.category]}`}>
                          {faqCategories[faq.category].title}
                        </div>
                        <motion.div
                          animate={{ rotate: openItems.has(faq.id) ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-muted-foreground"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </motion.div>
                      </div>
                      
                      <h4 className="font-medium text-foreground text-lg leading-tight mb-4 group-hover:text-primary transition-colors">
                        {faq.question}
                      </h4>
                      
                      <AnimatePresence>
                        {openItems.has(faq.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          >
                            <div className="prose prose-sm max-w-none">
                              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                {faq.answer}
                              </p>
                              
                              {faq.relatedCalculators && faq.relatedCalculators.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-subtle-background">
                                  <p className="text-sm font-medium text-foreground mb-3">Related Tools:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {faq.relatedCalculators.map((calc, idx) => (
                                      <Link
                                        key={idx}
                                        to={`/calculators/${calc}`}
                                        className="text-xs text-primary hover:text-primary/80 bg-primary/10 px-3 py-1 rounded-full transition-colors"
                                      >
                                        {calc.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </Link>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Category Filter */}
          {showCategoryFilter && (
            <motion.div
              className="mb-12"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full text-sm"
                >
                  All Questions
                </Button>
                {Object.entries(faqCategories).map(([key, category]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    onClick={() => setSelectedCategory(key)}
                    className="rounded-full text-sm"
                  >
                    {category.title}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}

          {/* All Questions */}
          <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {displayedFAQs.map((faq) => (
              <motion.div
                key={faq.id}
                variants={itemVariants}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.2 }}
              >
                <Card 
                  className="bg-background rounded-3xl p-8 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => toggleItem(faq.id)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[faq.category]}`}>
                            {faqCategories[faq.category].title}
                          </div>
                          {faq.popular && (
                            <Badge variant="secondary" className="text-xs bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 rounded-full">
                              Popular
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-foreground text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
                          {faq.question}
                        </h4>
                      </div>
                      
                      <motion.div
                        animate={{ rotate: openItems.has(faq.id) ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-muted-foreground ml-4 flex-shrink-0"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </div>
                    
                    <AnimatePresence>
                      {openItems.has(faq.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="mt-6"
                        >
                          <div className="prose prose-sm max-w-none">
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                              {faq.answer}
                            </p>
                            
                            {/* Tags */}
                            {faq.tags && faq.tags.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-subtle-background">
                                <div className="flex flex-wrap gap-2">
                                  {faq.tags.map((tag, idx) => (
                                    <span 
                                      key={idx}
                                      className="text-xs text-muted-foreground bg-subtle-background px-3 py-1 rounded-full"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Related Calculators */}
                            {faq.relatedCalculators && faq.relatedCalculators.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-subtle-background">
                                <p className="text-sm font-medium text-foreground mb-3">Related Tools:</p>
                                <div className="flex flex-wrap gap-2">
                                  {faq.relatedCalculators.map((calc, idx) => (
                                    <Link
                                      key={idx}
                                      to={`/calculators/${calc}`}
                                      className="text-xs text-primary hover:text-primary/80 bg-primary/10 px-3 py-1 rounded-full transition-colors"
                                    >
                                      {calc.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Official Sources */}
                            {faq.officialSources && faq.officialSources.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-subtle-background">
                                <p className="text-sm font-medium text-foreground mb-2">Official Sources:</p>
                                <div className="space-y-1">
                                  {faq.officialSources.map((source, idx) => (
                                    <p key={idx} className="text-xs text-muted-foreground">
                                      {source}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="mt-4 pt-4 border-t border-subtle-background">
                              <p className="text-xs text-muted-foreground">
                                Last updated: {new Date(faq.lastUpdated).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Section */}
          <motion.div
            className="mt-20 text-center"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              variants={itemVariants}
              className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-3xl p-12"
            >
              <h3 className="text-3xl font-light text-foreground mb-6">
                Need Personalized US Financial Advice?
              </h3>
              <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
                Get AI-powered financial coaching tailored to US regulations, tax laws, and investment opportunities
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-medium rounded-full"
                >
                  <Link to="/dashboard">
                    Start Free US Coaching
                  </Link>
                </Button>
                <Button 
                  asChild
                  variant="outline" 
                  size="lg"
                  className="px-8 py-3 text-lg font-medium rounded-full"
                >
                  <Link to="/help">
                    Browse Help Center
                  </Link>
                </Button>
              </div>
            </motion.div>
          </motion.div>
          
        </div>
      </section>
    </>
  );
}