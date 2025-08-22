"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import "@/types/route-types"; // Import route type definitions
import { motion } from "framer-motion";
import Lottie from "lottie-react";
import aiChatAnimation from "@/assets/videos/AI-Chat.json";
import badgeUnlockAnimation from "@/assets/videos/Badge-Unlock.json";

import catCoin from "@/assets/images/icon.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faPlus,
  faChevronDown,
  faPlay,
  faX,
} from "@fortawesome/free-solid-svg-icons";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import basicLessonsData from "@/data/basic-lessons.json";
import faqData from "@/data/home/home-faq.json";
export const DISCORD_URL = "https://discord.gg/M2Dgujvtze";
import { MotionGlobalConfig } from "framer-motion";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => {
    // Use canonical helper for consistent URLs
    const pageUrl = getCanonicalUrl("/");
    const title =
      "Moneko – Save Money and Start Investing from Zero";
    const description =
      "Struggling to save or invest? Moneko helps beginners build savings goals, grow money step by step, and start investing with confidence.";
    const keywords =
      "financial education, personal finance, money management, investing, saving, budgeting, financial literacy, free financial tools, Moneko";
    const imageUrl = "https://moneko.io/og-img.png";

    const meta = seo({
      title: title,
      description: description,
      keywords: keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "Moneko",
          url: pageUrl,
          logo: `${pageUrl}icon.svg`, // Assuming icon.svg is served from root
        },
        {
          "@type": "WebSite",
          name: "Moneko",
          url: pageUrl,
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is Moneko?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko is an online platform dedicated to making financial education accessible and engaging. We offer AI-driven personalized learning, expert-led courses, and practical financial tools to help you master personal finance, investing, budgeting, and more.",
              },
            },
            {
              "@type": "Question",
              name: "Who is Moneko for?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko is for anyone looking to improve their financial literacy, from beginners just starting their financial journey to individuals seeking to deepen their understanding of specific financial topics. Whether you want to learn about saving, investing, managing debt, or planning for retirement, Moneko has resources for you.",
              },
            },
            {
              "@type": "Question",
              name: "How does the AI-powered learning work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Our AI analyzes your financial goals and current knowledge to create a customized learning plan. You'll engage with interactive lessons, get instant answers from our AI chat, and practice with real-world scenarios, all tailored to your unique needs.",
              },
            },
            {
              "@type": "Question",
              name: "Are the financial courses and tools on Moneko free?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko offers a mix of free and premium content. Many of our foundational lessons, AI chat features, and basic financial calculators are available for free to help you get started. Advanced courses and specialized tools may be part of a premium offering.",
              },
            },
            {
              "@type": "Question",
              name: "What kind of financial tools does Moneko offer?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Moneko provides a suite of practical financial calculators to help you plan and manage your money effectively. These include tools for auto loans, compound interest, mortgage calculations, retirement planning, and setting savings goals.",
              },
            },
          ],
        },
      ],
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: "https://moneko.io/",
        },
      ],
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

function BasicLessonCard({
  icon,
  title,
  description,
  linkTo,
}: {
  icon: string;
  title: string;
  description: string;
  linkTo: string;
}) {
  return (
    <Card className="group h-full border-border bg-card hover:bg-accent/50 transition-all duration-200 ease-out">
      <Link to={linkTo} className="flex h-full flex-col">
        <CardHeader className="flex-grow space-y-6 p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="space-y-3">
            <CardTitle className="text-xl font-semibold text-card-foreground leading-tight">
              {title}
            </CardTitle>
            <CardDescription className="text-muted-foreground leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="p-8 pt-0">
          <div className="flex items-center text-primary font-medium group-hover:translate-x-1 transition-transform duration-200">
            Start Lesson
            <FontAwesomeIcon 
              icon={faArrowRight} 
              className="ml-2 text-sm" 
              aria-hidden="true" 
            />
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}

import { FaqSection } from "@/components/ui/faq-section";
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";
import { useDeviceType } from "@/hooks/use-device-type";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";

import { HomeHeader } from "@/components/index/header";
import { AISearchInput } from "@/components/ui/ai-search-input";
import { EarlyAccessSection } from "@/components/index/early-access-section";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AmbientHalo from "@/components/ui/ambient-halo";



export default function HomePage() {
  // Finance-related suggestion prompts
  const chatSuggestions = [
    "Help me set up a budget",
    "How do I start investing?",
    "Tell me about retirement planning",
    "What's an emergency fund?",
    "Explain compound interest",
    "Tips for saving money",
  ];

  const { isMobile } = useDeviceType();

  // Skip complex animations on mobile for performance
  if (isMobile) {
    MotionGlobalConfig.skipAnimations = true;
  }

  return (
    <div className="relative min-h-screen bg-transparent">
      <AmbientHalo/>

      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">
        Learn How to Save and Start Investing for Beginners with Moneko, Your AI
        Money Coach
      </h1>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-border">
        <HomeHeader />
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Heading */}
          <div className="text-center mb-16">
            <motion.h2
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              Your AI Personal Money Coach
            </motion.h2>
            
            <motion.p
              className="text-xl md:text-2xl text-muted-foreground mb-12 font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            >
              Start with your goal. Moneko builds the plan.
            </motion.p>
          </div>

          {/* AI Search Input */}
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <AISearchInput 
              placeholder="Ask Moneko to create personalized financial journey for my..."
              suggestions={chatSuggestions}
            />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="text-center">
          <motion.button
            onClick={() => {
              const nextSection = document.querySelector('section:nth-of-type(2)');
              if (nextSection) {
                nextSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="inline-flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-sm font-medium">Scroll to explore</span>
            <FontAwesomeIcon icon={faChevronDown} className="text-lg" />
          </motion.button>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="relative z-10 py-20 px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              See Moneko in Action
            </motion.h2>
            <motion.p
              className="text-xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Watch how Moneko transforms your financial journey with AI-powered personalized learning and expert guidance.
            </motion.p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <motion.div 
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="relative aspect-video w-full">
                  <video
                    className="h-full w-full object-cover"
                    src="/Moneko-onboard%20.webm"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                  
                  {/* Text overlay container */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
                    <div className="text-white p-8 md:p-12 max-w-2xl">
                      <h3 className="text-2xl md:text-3xl font-bold mb-4">Experience Personalized Learning</h3>
                      <p className="text-lg md:text-xl text-white/90 mb-6">See how our AI creates custom financial plans tailored to your goals and learning style.</p>
                      <div className="inline-flex items-center gap-2 text-white/80 font-medium">
                        <FontAwesomeIcon icon={faPlay} className="text-sm" />
                        <span>Watch Demo</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background shadow-lg">
                      <FontAwesomeIcon icon={faPlay} className="ml-1 text-primary" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[95vw] p-0 bg-black border-none">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <video
                  className="absolute inset-0 h-full w-full object-contain"
                  src="/Moneko-onboard .webm"
                  controls
                  autoPlay
                  playsInline
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <div className="relative z-10">
        <EarlyAccessSection />
      </div>

      {/* Features Section */}
      <section className="relative z-10 py-20 px-6 lg:px-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Smart Tools for Your Financial Journey
            </motion.h2>
            <motion.p
              className="text-xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Discover powerful features designed to make financial learning engaging and effective.
            </motion.p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2 lg:w-2/3 mx-auto">
            {/* AI Chat Feature */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Card className="group h-full border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-200">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 flex items-center justify-center">
                    <Lottie
                      animationData={aiChatAnimation}
                      loop={true}
                      className="w-3/4 h-3/4"
                    />
                  </div>
                  <div className="p-6">
                    <CardTitle className="text-xl font-semibold text-card-foreground mb-3">
                      AI-Powered Chat Assistant
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Get personalized financial guidance and instant answers to your money questions.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

         
            {/* Achievement System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="group h-full border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-200">
                <CardContent className="p-0">
                  <div className="aspect-square bg-gradient-to-br from-accent/20 to-secondary/20 dark:from-accent/10 dark:to-secondary/10 flex items-center justify-center">
                    <Lottie
                      animationData={badgeUnlockAnimation}
                      loop={true}
                      className="w-3/4 h-3/4"
                    />
                  </div>
                  <div className="p-6">
                    <CardTitle className="text-xl font-semibold text-card-foreground mb-3">
                      Achievement System
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Earn badges and track your progress as you master new financial concepts.
                    </CardDescription>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>



      {/* Expert-Led Lessons Section */}
      <section className="relative z-10 py-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-foreground mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Expert-Led Financial Courses
            </motion.h2>
            <motion.p
              className="text-xl text-muted-foreground max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Our foundational courses are crafted by seasoned Financial Instructors (CFA, CSC, MBA) with over 10 years of experience, making complex topics clear and actionable.
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {basicLessonsData.lessons.slice(0, 2).map((lesson, index) => (
              <motion.div
                key={`preview-${lesson.lesson_id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <BasicLessonCard
                  icon={lesson.icon}
                  title={lesson.title}
                  description={lesson.description}
                  linkTo={`/dashboard/learning/${basicLessonsData.course_id}/lesson/${lesson.lesson_id}`}
                />
              </motion.div>
            ))}
            
            {/* Explore More Card */}
            {basicLessonsData.lessons.length > 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="group h-full border-border bg-card hover:bg-accent/50 transition-all duration-200">
                  <Link
                    to={`dashboard/learning/${basicLessonsData.course_id}`}
                    className="flex h-full w-full flex-col items-center justify-center p-8 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-6">
                      <FontAwesomeIcon icon={faPlus} className="text-xl" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-card-foreground mb-3">
                      Explore All Lessons
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      View all {basicLessonsData.lessons.length} foundational courses designed to build your financial expertise.
                    </CardDescription>
                  </Link>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <div className="relative z-10 bg-muted/30">
        <FaqSection faqData={faqData} />
      </div>


      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center">
                <img
                  src={catCoin}
                  alt="Moneko Logo"
                  className="h-8 w-8"
                  width="32"
                  height="32"
                  loading="lazy"
                />
                <span className="ml-2 text-xl font-bold text-card-foreground">
                  Moneko
                </span>
              </div>
              <p className="text-muted-foreground max-w-xs">
                Empowering your financial journey with intelligent, personalized learning.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="mb-6 text-sm font-semibold text-card-foreground uppercase tracking-wider">
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/dashboard/learning"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    AI Learning
                  </Link>
                </li>
                <li>
                  <Link
                    to={`/dashboard/learning/${basicLessonsData.course_id}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Expert Courses
                  </Link>
                </li>
                <li>
                  <Link
                    to="/calculators"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Financial Calculators
                  </Link>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Chat with AI
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/team" 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Meet the Team
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-6 text-sm font-semibold text-card-foreground uppercase tracking-wider">
                Legal
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/privacy-policy"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms-of-service"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookie-policy"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="mb-6 text-sm font-semibold text-card-foreground uppercase tracking-wider">
                Connect
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://www.facebook.com/monekoai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/moneko_ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/moneko_ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    X
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@moneko.io"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-16 border-t border-border pt-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground text-sm mb-4 md:mb-0">
              © 2025 Moneko. All rights reserved.
            </p>
            
            {/* Social Icons */}
            <div className="flex space-x-6">
              <a
                href="https://www.facebook.com/monekoai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on Facebook"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FontAwesomeIcon icon={faFacebook} className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/moneko_ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on X"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FontAwesomeIcon icon={faX} className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/moneko_ai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Moneko on Instagram"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <FontAwesomeIcon icon={faInstagram} className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
