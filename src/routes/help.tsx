import { createFileRoute } from '@tanstack/react-router'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Rocket,
  Target,
  Bot,
  GraduationCap,
  Calculator,
  DollarSign,
  CreditCard,
  Shield,
  User,
  Wrench,
  BookOpen,
  TrendingUp,
  Home,
  Briefcase,
  Heart,
  FileText,
  Flame,
  LifeBuoy
} from 'lucide-react'
import { helpCenterData, categoryIndex, questionIndex } from '@/data/help-center-data'
import { BackgroundBeamsWithCollision } from '@/components/ui/background-beams-with-collision'
import { DotPattern } from '@/components/ui/dot-pattern'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/help')({
  component: HelpCenterPage,
})

// Icon mapping for categories
const iconMap: Record<string, any> = {
  Rocket,
  Target,
  Bot,
  GraduationCap,
  Calculator,
  DollarSign,
  CreditCard,
  Shield,
  User,
  Wrench,
  BookOpen,
  TrendingUp,
  Home,
  Briefcase,
  Heart,
  FileText,
  Flame,
  LifeBuoy
}

// Animation variants following Moneko design system
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
}

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
}

function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Filter questions based on search
  const filteredData = useMemo(() => {
    if (!searchQuery && !selectedCategory) return helpCenterData

    return helpCenterData
      .map(category => {
        if (selectedCategory && category.id !== selectedCategory) {
          return null
        }

        const filteredQuestions = category.questions.filter(q => {
          const searchLower = searchQuery.toLowerCase()
          return (
            q.question.toLowerCase().includes(searchLower) ||
            q.answer.toLowerCase().includes(searchLower) ||
            q.keywords.some(k => k.toLowerCase().includes(searchLower))
          )
        })

        if (filteredQuestions.length === 0) return null

        return {
          ...category,
          questions: filteredQuestions
        }
      })
      .filter(Boolean)
  }, [searchQuery, selectedCategory])

  const totalFilteredQuestions = filteredData.reduce((acc, cat) => cat ? acc + cat.questions.length : acc, 0)

  return (
    <>
      <Helmet>
        <title>Help Center - Moneko Financial Education & AI Advisor</title>
        <meta 
          name="description" 
          content="Find answers to all your questions about Moneko's AI financial advisor, goal tracking, learning platform, calculators, and financial planning tools. Comprehensive help center with 240+ FAQs." 
        />
        <meta 
          name="keywords" 
          content="moneko help, financial advisor ai questions, goal tracking help, budget calculator faq, investment learning, debt payoff guide, retirement planning help, financial education support" 
        />
        <link rel="canonical" href="https://moneko.ai/help" />
        
        {/* Schema.org structured data for FAQ */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": questionIndex.slice(0, 50).map(q => {
              const fullQ = helpCenterData
                .find(cat => cat.id === q.category)
                ?.questions.find(fq => fq.id === q.id)
              return {
                "@type": "Question",
                "name": q.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": fullQ?.answer || ''
                }
              }
            })
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-subtle-background z-50">
         {/* Background Beams with Collision - Rotated for meteor effect */}
      <BackgroundBeamsWithCollision className="fixed inset-0 z-0 h-screen">
        </BackgroundBeamsWithCollision>
     
      
      {/* Dotted grid pattern overlay - exactly like Uninbox */}
      <DotPattern
        className={cn(
          "fixed inset-0 opacity-30 dark:opacity-15 pointer-events-none z-[1]",
          "[mask-image:radial-gradient(1200px_circle_at_center,white,transparent)]"
        )}
        cr={1}
        cx={20}
        cy={20}
      />


        {/* Hero Section */}
        <div className="bg-moneko-background border-b border-border/50 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-center"
            >
              <motion.div variants={itemVariants} className="flex justify-center mb-6">
                <div className="bg-primary/10 rounded-full p-4">
                  <LifeBuoy className="h-12 w-12 text-primary" />
                </div>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-5xl font-light text-foreground mb-4"
              >
                How can we help you?
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
              >
                Search our comprehensive knowledge base with {categoryIndex.reduce((acc, cat) => acc + cat.questionCount, 0)}+ answers about Moneko's AI financial platform
              </motion.p>

              {/* Search Bar */}
              <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search for answers... (e.g., 'How do I create a goal?' or 'What can the AI advisor do?')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-4 py-6 text-lg rounded-full bg-card border-border/50 focus:border-primary transition-all duration-200"
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            <motion.aside
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="lg:col-span-1"
            >
              <div className="bg-moneko-background rounded-3xl p-6 sticky top-24">
                <h2 className="text-lg font-medium text-foreground mb-6">Categories</h2>
                <nav className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 ${
                      !selectedCategory
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-subtle-background text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">All Topics</span>
                      <Badge variant="secondary" className="ml-2">
                        {categoryIndex.reduce((acc, cat) => acc + cat.questionCount, 0)}
                      </Badge>
                    </div>
                  </button>

                  {categoryIndex.map((cat, idx) => {
                    const category = helpCenterData.find(c => c.id === cat.id)
                    if (!category) return null
                    const Icon = iconMap[category.icon] || BookOpen

                    return (
                      <motion.button
                        key={cat.id}
                        variants={itemVariants}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 ${
                          selectedCategory === cat.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-subtle-background text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span className="flex-1 text-sm font-medium">{cat.name}</span>
                          <Badge variant="secondary" className="ml-2">
                            {cat.questionCount}
                          </Badge>
                        </div>
                      </motion.button>
                    )
                  })}
                </nav>
              </div>
            </motion.aside>

            {/* Questions & Answers */}
            <motion.main
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="lg:col-span-3"
            >
              {searchQuery && (
                <motion.div variants={itemVariants} className="mb-8">
                  <p className="text-muted-foreground">
                    Found <span className="font-medium text-foreground">{totalFilteredQuestions}</span> {totalFilteredQuestions === 1 ? 'result' : 'results'} for "{searchQuery}"
                  </p>
                </motion.div>
              )}

              <div className="space-y-8">
                {filteredData.map((category) => {
                  if (!category) return null
                  const Icon = iconMap[category.icon] || BookOpen

                  return (
                    <motion.div
                      key={category.id}
                      variants={itemVariants}
                      className="bg-moneko-background rounded-3xl p-8"
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="bg-primary/10 rounded-2xl p-3">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-medium text-foreground">{category.name}</h2>
                          <p className="text-muted-foreground mt-1">{category.description}</p>
                        </div>
                      </div>

                      <Accordion type="single" collapsible className="space-y-4">
                        {category.questions.map((question, qIdx) => (
                          <AccordionItem
                            key={question.id}
                            value={question.id}
                            className="border-border/50 rounded-2xl border bg-card px-6 data-[state=open]:bg-subtle-background transition-all duration-200"
                          >
                            <AccordionTrigger className="hover:no-underline py-6">
                              <div className="flex items-start gap-4 text-left">
                                <div className="bg-primary/10 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-sm font-medium text-primary">Q</span>
                                </div>
                                <span className="text-lg font-medium text-foreground pr-4">
                                  {question.question}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6">
                              <div className="pl-12 space-y-4">
                                <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                  {question.answer}
                                </div>
                                
                                {question.keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-4">
                                    {question.keywords.slice(0, 5).map((keyword, kidx) => (
                                      <Badge 
                                        key={kidx} 
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </motion.div>
                  )
                })}

                {filteredData.length === 0 && (
                  <motion.div
                    variants={itemVariants}
                    className="bg-moneko-background rounded-3xl p-16 text-center"
                  >
                    <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-2xl font-medium text-foreground mb-2">No results found</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      We couldn't find any questions matching "{searchQuery}". Try different keywords or browse our categories.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.main>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-moneko-background border-t border-border/50 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h2 className="text-3xl font-medium text-foreground mb-4">
                Still have questions?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Chat with our AI financial advisor for personalized help, or contact our support team
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium hover:opacity-90 transition-all duration-200"
                >
                  <Bot className="h-5 w-5" />
                  Chat with AI Advisor
                </a>
                <a
                  href="mailto:support@moneko.ai"
                  className="inline-flex items-center gap-2 bg-card text-foreground px-8 py-4 rounded-full font-medium border border-border hover:bg-subtle-background transition-all duration-200"
                >
                  <Heart className="h-5 w-5" />
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
