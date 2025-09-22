import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faChevronDown,
  faGlobeAmericas,
  faMapMarkerAlt,
  faLanguage
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "@tanstack/react-router";
import { 
  RegionalFAQ, 
  regionInfo, 
  detectUserRegion, 
  getRegionalFAQs, 
  getPopularRegionalFAQs,
  allRegionalFAQs
} from "@/data/regional-faqs";

interface RegionalFAQSectionProps {
  initialRegion?: string;
  showRegionSelector?: boolean;
  maxFAQs?: number;
  showStructuredData?: boolean;
}

// Enhanced FAQ categories with regional context
const faqCategories = {
  "regional-finance": { 
    name: "Regional Finance", 
    color: "text-blue-600", 
    bgColor: "bg-blue-100 dark:bg-blue-900/30" 
  },
  "tax-planning": { 
    name: "Tax Planning", 
    color: "text-green-600", 
    bgColor: "bg-green-100 dark:bg-green-900/30" 
  },
  "retirement": { 
    name: "Retirement Planning", 
    color: "text-purple-600", 
    bgColor: "bg-purple-100 dark:bg-purple-900/30" 
  },
  "housing": { 
    name: "Housing & Real Estate", 
    color: "text-orange-600", 
    bgColor: "bg-orange-100 dark:bg-orange-900/30" 
  },
  "investing": { 
    name: "Investing & Portfolio", 
    color: "text-indigo-600", 
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30" 
  },
  "education": { 
    name: "Education & Debt", 
    color: "text-red-600", 
    bgColor: "bg-red-100 dark:bg-red-900/30" 
  },
  "security": { 
    name: "Security & Privacy", 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30" 
  },
  "ai": { 
    name: "AI Technology", 
    color: "text-cyan-600", 
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30" 
  },
  "pricing": { 
    name: "Pricing & Plans", 
    color: "text-violet-600", 
    bgColor: "bg-violet-100 dark:bg-violet-900/30" 
  },
  "support": { 
    name: "Support & Help", 
    color: "text-gray-600", 
    bgColor: "bg-gray-100 dark:bg-gray-900/30" 
  }
};

// Region flag emojis for visual appeal
const regionFlags: Record<string, string> = {
  'us': '🇺🇸',
  'ca': '🇨🇦', 
  'uk': '🇬🇧',
  'au': '🇦🇺',
  'ie': '🇮🇪',
  'sg': '🇸🇬',
  'nz': '🇳🇿',
  'global': '🌍'
};

export function RegionalFAQSection({ 
  initialRegion,
  showRegionSelector = true,
  maxFAQs = 20,
  showStructuredData = true
}: RegionalFAQSectionProps) {
  const [userRegion, setUserRegion] = useState<string>(() => {
    return initialRegion || detectUserRegion();
  });
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [regionalFAQs, setRegionalFAQs] = useState<RegionalFAQ[]>([]);
  const [popularFAQs, setPopularFAQs] = useState<RegionalFAQ[]>([]);

  // Update FAQs when region changes
  useEffect(() => {
    const faqs = getRegionalFAQs(userRegion, selectedCategory || undefined);
    setRegionalFAQs(faqs.slice(0, maxFAQs));
    setPopularFAQs(getPopularRegionalFAQs(userRegion).slice(0, 4));
  }, [userRegion, selectedCategory, maxFAQs]);

  // Save user region preference
  const handleRegionChange = (newRegion: string) => {
    setUserRegion(newRegion);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-region', newRegion);
    }
    setOpenItems(new Set()); // Close all open FAQs when region changes
  };

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const currentRegionInfo = regionInfo[userRegion];
  const availableRegions = Object.keys(regionInfo);

  // Generate structured data for AI accessibility
  const generateStructuredData = () => {
    if (!showStructuredData) return null;
    
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "audience": {
        "@type": "Audience", 
        "geographicArea": currentRegionInfo?.name || "Global"
      },
      "mainEntity": regionalFAQs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
          "dateModified": faq.lastUpdated,
          "author": {
            "@type": "Organization",
            "name": "Moneko"
          }
        },
        "keywords": faq.tags.join(", "),
        "audience": {
          "@type": "Audience",
          "geographicArea": currentRegionInfo?.name || "Global"
        }
      }))
    };

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
      
      <section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:px-8 bg-gradient-to-br from-slate-50/30 to-gray-50/20 dark:from-slate-900/30 dark:to-gray-900/20">
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
                <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2 h-3 w-3" />
                Regional Financial Guidance
              </Badge>
            </motion.div>
            
            <motion.h2
              className="text-foreground mb-4 text-3xl leading-tight font-bold sm:mb-6 sm:text-4xl md:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              Financial Questions for {regionFlags[userRegion]} {currentRegionInfo?.name || 'Your Region'}
            </motion.h2>
            
            <motion.p
              className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Get region-specific financial guidance tailored to {currentRegionInfo?.name || 'your location'}'s regulations, tax laws, and investment opportunities
            </motion.p>
          </div>

          {/* Region Selector */}
          {showRegionSelector && (
            <motion.div
              className="mb-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              viewport={{ once: true }}
            >
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={faGlobeAmericas} className="h-5 w-5 text-primary mr-2" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Select Your Region for Localized Content
                  </h3>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3">
                  {availableRegions.map((region) => (
                    <Button
                      key={region}
                      variant={userRegion === region ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleRegionChange(region)}
                      className="text-sm"
                    >
                      {regionFlags[region]} {regionInfo[region].name}
                    </Button>
                  ))}
                </div>
                
                {currentRegionInfo && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>
                      <strong>Currency:</strong> {currentRegionInfo.currency} | 
                      <strong> Tax Year:</strong> {currentRegionInfo.taxYear} | 
                      <strong> Regulatory:</strong> {currentRegionInfo.regulatoryBody}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Popular Regional Questions */}
          {popularFAQs.length > 0 && (
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-bold text-foreground mb-6 flex items-center">
                <span className="mr-3">🔥</span>
                Most Popular Questions for {regionFlags[userRegion]} {currentRegionInfo?.name}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {popularFAQs.map((item) => (
                  <Card 
                    key={item.id}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => toggleItem(item.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-md flex-shrink-0 ${faqCategories[item.category].color}`}>
                          <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-foreground text-base leading-tight">
                              {item.question}
                            </h4>
                            <FontAwesomeIcon 
                              icon={faChevronDown} 
                              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-2 ${
                                openItems.has(item.id) ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${faqCategories[item.category].bgColor} ${faqCategories[item.category].color} border-0`}
                            >
                              {faqCategories[item.category].name}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0">
                              {item.currency}
                            </Badge>
                          </div>
                          <AnimatePresence>
                            {openItems.has(item.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                                    {item.answer}
                                  </p>
                                  {item.localResources && item.localResources.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                      <p className="text-xs font-medium text-foreground mb-2">Local Resources:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {item.localResources.map((resource, idx) => (
                                          <a
                                            key={idx}
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:text-primary/80 underline"
                                          >
                                            {resource.name}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Category Filter */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-sm"
              >
                All Questions
              </Button>
              {Object.entries(faqCategories).map(([key, category]) => {
                const hasQuestions = regionalFAQs.some(faq => faq.category === key);
                if (!hasQuestions) return null;
                
                return (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                    className="text-sm"
                  >
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </motion.div>

          {/* All Regional Questions */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
          >
            {regionalFAQs.map((item) => (
              <Card 
                key={item.id}
                className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-white/20 dark:border-slate-700/50 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 shadow-sm flex-shrink-0 ${faqCategories[item.category].color}`}>
                        <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground text-base leading-tight mb-1">
                          {item.question}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${faqCategories[item.category].bgColor} ${faqCategories[item.category].color} border-0`}
                          >
                            {faqCategories[item.category].name}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0">
                            {item.currency}
                          </Badge>
                          {item.popular && (
                            <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 border-0">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <FontAwesomeIcon 
                      icon={faChevronDown} 
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ml-4 ${
                        openItems.has(item.id) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <AnimatePresence>
                    {openItems.has(item.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 pl-12"
                      >
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                            {item.answer}
                          </p>
                          
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-medium text-foreground mb-2">Related Topics:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.tags.map((tag, idx) => (
                                  <Badge 
                                    key={idx}
                                    variant="outline" 
                                    className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {item.localResources && item.localResources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                              <p className="text-xs font-medium text-foreground mb-2">Official Resources:</p>
                              <div className="space-y-1">
                                {item.localResources.map((resource, idx) => (
                                  <a
                                    key={idx}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-primary hover:text-primary/80 underline"
                                  >
                                    {resource.name} ({resource.type})
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-muted-foreground">
                              Last updated: {new Date(item.lastUpdated).toLocaleDateString()} | 
                              Currency: {item.currency} | 
                              Priority: {item.priority}/10
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* CTA Section */}
          <motion.div
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="bg-gradient-to-r from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-2xl p-8 sm:p-12">
              <h3 className="text-2xl font-bold text-foreground mb-4 sm:text-3xl">
                Need Personalized {regionFlags[userRegion]} {currentRegionInfo?.name} Financial Advice?
              </h3>
              <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
                Get AI-powered financial coaching tailored to {currentRegionInfo?.name || 'your region'}'s specific regulations and opportunities
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg font-semibold"
                >
                  <Link to="/dashboard">
                    Start Free Regional Coaching
                  </Link>
                </Button>
                <Button 
                  asChild
                  variant="outline" 
                  size="lg"
                  className="px-8 py-3 text-lg font-semibold"
                >
                  <Link to={`/help/${userRegion}`}>
                    Browse {regionFlags[userRegion]} Help Center
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}