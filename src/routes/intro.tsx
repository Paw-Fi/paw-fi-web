"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useInView } from "@/lib/use-in-view";
import { fadeInUp, fadeInDown, fadeInLeft, scaleUp, elasticScale, staggerContainer, fadeIn, floatAnimation } from "@/lib/motion-variants";
import { Button } from "@/components/ui/button";
import banner from "@/assets/images/index/pawfi-banner.png";
import banner3 from "@/assets/images/index/pawfi-banner3.png";
import catCoin from "@/assets/images/icon.svg";
import banner2 from "@/assets/images/index/pawfi-banner2.png";
import waveBackground from "@/assets/images/index/homepage-bg.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faGraduationCap,
  faBookOpen,
  faChalkboardTeacher,
  faPuzzlePiece,
  faBrain,
  faCalculator,
  faCommentsDollar,
  faTasks,
  faRobot,

  faTimes,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { seo } from '@/utils/seo';
import basicLessonsData from '@/data/basic-lessons.json';
import faqData from '@/data/home/home-faq.json';

export const Route = createFileRoute("/intro")({
  component: HomePage,
  head: () => {
    const title = "Moneko: Learn Finance with Free Education & AI Tools";
    const description = "Moneko offers free financial education, AI lessons & tools to manage money. Start your financial literacy journey & gain confidence!";
    const keywords = "financial education, personal finance, money management, investing, saving, budgeting, financial literacy, free financial tools, Moneko";
    const imageUrl = 'https://paw-fi.app/og-img.png';
    const pageUrl = 'https://moneko.io/';

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
          "name": "Moneko",
          "url": pageUrl,
          "logo": `${pageUrl}icon.svg` // Assuming icon.svg is served from root
        },
        {
          "@type": "WebSite",
          "name": "Moneko",
          "url": pageUrl
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Moneko?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Moneko is an online platform dedicated to making financial education accessible and engaging. We offer AI-driven personalized learning, expert-led courses, and practical financial tools to help you master personal finance, investing, budgeting, and more."
              }
            },
            {
              "@type": "Question",
              "name": "Who is Moneko for?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Moneko is for anyone looking to improve their financial literacy, from beginners just starting their financial journey to individuals seeking to deepen their understanding of specific financial topics. Whether you want to learn about saving, investing, managing debt, or planning for retirement, Moneko has resources for you."
              }
            },
            {
              "@type": "Question",
              "name": "How does the AI-powered learning work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Our AI analyzes your financial goals and current knowledge to create a customized learning plan. You'll engage with interactive lessons, get instant answers from our AI chat, and practice with real-world scenarios, all tailored to your unique needs."
              }
            },
            {
              "@type": "Question",
              "name": "Are the financial courses and tools on Moneko free?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Moneko offers a mix of free and premium content. Many of our foundational lessons, AI chat features, and basic financial calculators are available for free to help you get started. Advanced courses and specialized tools may be part of a premium offering."
              }
            },
            {
              "@type": "Question",
              "name": "What kind of financial tools does Moneko offer?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Moneko provides a suite of practical financial calculators to help you plan and manage your money effectively. These include tools for auto loans, compound interest, mortgage calculations, retirement planning, and setting savings goals."
              }
            }
          ]
        }
      ]
    };

    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: 'https://moneko.io/'
        }
      ],
      script: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData)
        }
      ]
    };
  },
});

function FeatureCard({
  icon,
  title,
  description,
  className = "",
  animationDelay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  className?: string;
  animationDelay?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, 0.1);

  return (
    <motion.div
      ref={cardRef}
      className={`transform rounded-2xl bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}
      variants={fadeInUp}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={animationDelay}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
        <FontAwesomeIcon icon={icon} size="lg" className="text-purple-600" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

function BasicLessonCard({
  icon,
  title,
  description,
  linkTo,
  animationDelay = 0,
}: {
  icon: string;
  title: string;
  description: string;
  linkTo: string;
  animationDelay?: number;
}) {
  // Create a wrapper div with ref that will be animated
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, 0.1);

  return (
    <div ref={cardRef}>
      <motion.div
        className="transform rounded-2xl bg-white p-8 shadow-md h-full flex flex-col"
        variants={fadeInUp}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        custom={animationDelay}
        whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <Link to={linkTo} className="h-full flex flex-col">
          <div className="flex-grow">
            <motion.div 
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
              variants={elasticScale}
              custom={animationDelay + 0.1}
            >
              <span className="text-xl" aria-hidden="true">{icon}</span>
            </motion.div>
            <motion.h3 
              className="mb-3 text-xl font-semibold text-slate-800"
              variants={fadeInUp}
              custom={animationDelay + 0.2}
            >
              {title}
            </motion.h3>
            <motion.p 
              className="text-sm text-slate-600 leading-relaxed mb-6"
              variants={fadeInUp}
              custom={animationDelay + 0.3}
            >
              {description}
            </motion.p>
          </div>
          <motion.div
            className="inline-flex items-center font-medium text-emerald-600 hover:text-emerald-800 mt-auto"
            variants={fadeInUp}
            custom={animationDelay + 0.4}
          >
            Start Lesson
            <motion.span
              initial={{ x: 0 }}
              whileHover={{ x: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" aria-hidden="true" />
            </motion.span>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}

import { FaqSection } from '@/components/ui/faq-section';

function WaitlistForm() {
  const formRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(formRef, 0.1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    window.open("https://discord.gg/RZdG7GpX", "_blank");

    // if (email) {
    //   setIsSubmitting(true);

    //   try {
    //     const { data, error } = await supabase
    //       .from("waiting-list")
    //       .insert([{ email }]);

    //     if (error) throw error;

    //     console.log("Email submitted successfully:", data);
    //     setSubmitted(true);

    //     // Show success toast notification
    //     toast.success("Thanks for joining our waitlist!", {
    //       position: "top-right",
    //       autoClose: 5000,
    //       hideProgressBar: false,
    //       closeOnClick: true,
    //       pauseOnHover: true,
    //       draggable: true,
    //     });
     
    //   } catch (error) {
    //     console.error("Error submitting email:", error);

    //     // Show error toast notification
    //     toast.error("Oops! Something went wrong. Please try again.", {
    //       position: "top-right",
    //       autoClose: 5000,
    //       hideProgressBar: false,
    //       closeOnClick: true,
    //       pauseOnHover: true,
    //       draggable: true,
    //     });
    //   } finally {
    //     setIsSubmitting(false);
    //   }
    // }
  };

  return (
    <motion.div 
      ref={formRef} 
      className="rounded-3xl bg-purple-100 p-8 shadow-md"
      variants={fadeInUp}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >    
      <div className="flex flex-col items-center justify-center">
        <motion.h3 
          className="mb-3 text-center text-2xl font-bold"
          variants={fadeInUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0.1}
        >
          Get Early Access to AI-Powered Learning
        </motion.h3>
        <motion.p 
          className="mb-6 text-center text-gray-700"
          variants={fadeInUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0.2}
        >
          Be among the first to experience personalized financial education with Moneko. Join our community for updates and beta access.
        </motion.p>

        <motion.div 
          className="mx-auto flex max-w-md flex-col gap-3 md:flex-row"
          variants={fadeInUp}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          custom={0.3}
        >              
          <Button
            className="rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"            
            onClick={handleSubmit}
          >
            Join Discord 
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function HomePage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const learningSectionRef = useRef<HTMLDivElement>(null);
  const basicLessonsSectionRef = useRef<HTMLDivElement>(null);
  const waitlistSectionRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLImageElement>(null);
  
  // Use our custom hook to detect when elements enter the viewport
  const featuresInView = useInView(featuresRef, 0.1);
  const missionInView = useInView(missionRef, 0.1);
  const learningInView = useInView(learningSectionRef, 0.1);
  const basicLessonsInView = useInView(basicLessonsSectionRef, 0.1);
  const waitlistInView = useInView(waitlistSectionRef, 0.1);
  const footerInView = useInView(footerRef, 0.1);
  
  // Controls for staggered animations
  const learningControls = useAnimation();
  
  // Trigger staggered animations when learning section comes into view
  useEffect(() => {
    if (learningInView) {
      learningControls.start('visible');
    }
  }, [learningInView, learningControls]);
  
  // For the cat animation, we need to handle the floating effect separately
  const [catAnimationState, setCatAnimationState] = useState('hidden');
  
  useEffect(() => {
    // Start with the initial animation
    setCatAnimationState('visible');
    
    // After the initial animation completes, switch to floating animation
    const timer = setTimeout(() => {
      setCatAnimationState('floating');
    }, 1000); // Matches the duration of the initial animation
    
    return () => clearTimeout(timer);
  }, []);
  
  // No need for a scroll listener with Framer Motion's useInView hook
  // Each section now uses its own ref and animation logic

  return (
    <div className="bg-background flex-1 overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center">
          <img src={catCoin} alt="Moneko Logo" className="h-10 w-10" width="40" height="40" />
          <span className="ml-2 text-xl font-bold">Moneko</span> 
          <div className="flex items-center ml-12 gap-12">
          <Link
            to="/learning"
            className="font-medium text-black hover:text-black hidden lg:block"
          >
            Learning
          </Link>
          <Link
            to="/calculators"
            className="font-medium text-black hover:text-black hidden lg:block"
          >
            Calculators
          </Link>
          </div>        
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/learning"
            className="font-medium text-purple-600 hover:text-purple-800 hidden lg:block"
          >
            Explore Courses
          </Link>
          <Link
            to="/intro"
            className="font-medium text-purple-600 hover:text-purple-800"
          >
            <Button className="bg-purple-600 hover:bg-purple-700">
            Chat with AI
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        ref={headerRef}
        className="relative px-6 pt-12 pb-24 md:px-12 lg:px-24"
      >
        <div className="z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="relative z-20">
            <motion.h1 
              className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl"
              variants={fadeInDown}
              initial="hidden"
              animate="visible"
              custom={0}
            >
              Personalized Financial Mastery with{" "}
              <span className="text-purple-600">AI-Driven Learning</span>
            </motion.h1>
            <motion.p 
              className="mb-8 text-xl text-gray-700"
              variants={fadeInDown}
              initial="hidden"
              animate="visible"
              custom={0.2}
            >
              Moneko understands your unique financial journey. Our AI crafts tailored lessons, guiding you to financial literacy and confidence, supported by expert-curated content and AI insights.
            </motion.p>
            <motion.div 
              className="flex flex-col gap-4 sm:flex-row"
              variants={fadeInDown}
              initial="hidden"
              animate="visible"
              custom={0.4}
            >
              <Link to="/intro">
                <Button className="w-full rounded-lg bg-purple-600 px-8 py-3 font-medium text-white hover:bg-purple-700 sm:w-auto">
                  Start Your AI Lesson
                </Button>
              </Link>
              <Link to="/learning/your-2025-guide-to-investing">
                <Button
                  variant="outline"
                  className="w-full rounded-lg border-purple-600 px-8 py-3 font-medium text-purple-600 hover:bg-purple-50 sm:w-auto"
                >
                  Guide to Investing
                </Button>
              </Link>
            </motion.div>
          </div>
          <div className="relative z-20 flex justify-center lg:justify-end">
            <motion.img
              src={banner}
              alt="Friendly cat mascot illustrating Moneko's AI-driven financial learning platform"
              className="w-72 md:w-96"
              width="1846"
              height="2275"
              initial="hidden"
              animate={{
                scale: 1,
                opacity: 1,
                y: [0, -10, 0],
                transition: {
                  opacity: { duration: 0.6, delay: 0.6 },
                  scale: { duration: 0.8, delay: 0.6, type: "spring", stiffness: 200 },
                  y: {
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Wave background at the bottom */}
        <div className="line-height-0 absolute bottom-0 left-0 w-full overflow-hidden">
          <img src={waveBackground} alt="" className="w-full" width="1440" height="1056" loading="lazy" />
        </div>
      </header>

      {/* Features Section */}
      <section
        ref={featuresRef}
        className="bg-purple-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto max-w-7xl">
          <motion.h2 
            className="mb-16 text-center text-3xl font-bold md:text-4xl"
            variants={fadeInDown}
            initial="hidden"
            animate={featuresInView ? "visible" : "hidden"}
          >
            Intelligent Financial Education, 
            <span className="text-purple-600">Tailored For You</span>
          </motion.h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: faBrain, title: "AI-Personalized Lessons", description: "Our AI analyzes your goals and knowledge to create a unique learning path just for you." },
              { icon: faChalkboardTeacher, title: "Expert-Crafted Courses", description: "Learn foundational finance from a CFA, CSC, MBA with 10+ years of experience in simplified lessons." },
              { icon: faCommentsDollar, title: "Interactive AI Chat", description: "Ask questions, get explanations, and explore financial scenarios with our intelligent AI assistant." },
              { icon: faCalculator, title: "Practical Financial Calculators", description: "Utilize tools for auto loans, compound interest, mortgages, retirement, and savings goals." },
              { icon: faTasks, title: "Adaptive Learning Path", description: "Your curriculum evolves as you learn, ensuring you're always challenged and engaged." },
              { icon: faGraduationCap, title: "Flexible Self-Paced Study", description: "Master complex financial topics at your own speed, anytime, anywhere." },
            ].map((feature, _index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                animationDelay={0.1 * (_index + 1)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section ref={missionRef} className="px-6 py-20 md:px-12 lg:px-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2 
            className="mb-8 text-3xl font-bold text-slate-800 md:text-4xl"
            variants={fadeInDown}
            initial="hidden"
            animate={missionInView ? "visible" : "hidden"}
          >
            Our Vision for Your Financial Future
          </motion.h2>
          <motion.p 
            className="mb-10 text-lg text-slate-600 leading-relaxed"
            variants={fadeInUp}
            initial="hidden"
            animate={missionInView ? "visible" : "hidden"}
            custom={0.2}
          >
            At Moneko, we're committed to democratizing financial literacy. We leverage cutting-edge AI to make complex financial concepts accessible, engaging, and actionable for everyone, regardless of their background. Our goal is to empower you with the knowledge and tools to achieve financial independence.
          </motion.p>
          <div className="flex justify-center">
            <img src={banner3} alt="Illustration of a cat with a piggy bank, symbolizing Moneko's commitment to financial growth and literacy" className="w-56" width="1216" height="1848" loading="lazy" />
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section
        ref={learningSectionRef}
        className="bg-blue-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <motion.h2 
              className="mb-10 text-3xl font-bold md:text-4xl"
              variants={fadeInDown}
              initial="hidden"
              animate={learningInView ? "visible" : "hidden"}
            >
              How Moneko Works
            </motion.h2>

            <motion.div 
              className="space-y-8"
              variants={staggerContainer}
              initial="hidden"
              animate={learningControls}
            >
              {[
                { title: "Tell Us About You", description: "Share your financial goals and current understanding. Our AI listens.", number: 1 },
                { title: "Receive Your Custom Plan", description: "Our AI designs a unique lesson plan, focusing on what matters most to you.", number: 2 },
                { title: "Learn & Interact", description: "Engage with AI-generated lessons, chat for clarity, and practice with real-world scenarios.", number: 3 },
                { title: "Track & Achieve", description: "Monitor your progress, master new skills, and apply your knowledge confidently.", number: 4 },
              ].map((step, index) => (
                <motion.div 
                  key={step.number}
                  className="flex items-start gap-4"
                  variants={fadeInLeft}
                  custom={index * 0.2}
                >
                  <motion.div 
                    className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white"
                    variants={elasticScale}
                    custom={index * 0.2 + 0.3}
                  >
                    {step.number}
                  </motion.div>
                  <div>
                    <motion.h3 
                      className="mb-2 text-xl font-bold"
                      variants={fadeInUp}
                      custom={index * 0.2 + 0.1}
                    >
                      {step.title}
                    </motion.h3>
                    <motion.p 
                      className="text-gray-700"
                      variants={fadeInUp}
                      custom={index * 0.2 + 0.2}
                    >
                      {step.description}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div 
              className="mt-12"
              variants={fadeInUp}
              initial="hidden"
              animate={learningInView ? "visible" : "hidden"}
              custom={0.8}
            >
              <Link
                to="/chat"
                className="inline-flex items-center font-medium text-purple-600 hover:text-purple-800"
              >
                Discover Your Path
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
                </motion.span>
              </Link>
            </motion.div>
          </div>

          <motion.div 
            className="flex justify-center"
            variants={fadeIn}
            initial="hidden"
            animate={learningInView ? "visible" : "hidden"}
            custom={0.5}
          >
            <motion.img
              className="w-44 md:w-80"
              src={banner2}
              alt="Visual representation of Moneko's personalized AI learning journey for financial education"
              width="1084"
              height="1848"
              loading="lazy"
              variants={floatAnimation}
              animate="animate"
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 3 }}
            />
          </motion.div>
        </div>
      </section>
          {/* Learning Journey Section */}
          <section
        ref={basicLessonsSectionRef}
        title="Start Your Financial Learning Journey"
        className="bg-purple-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto max-w-7xl text-center">
            <motion.h2 
              className="mb-16 text-3xl font-bold text-slate-800 md:text-4xl"
              variants={fadeInDown}
              initial="hidden"
              animate={basicLessonsInView ? "visible" : "hidden"}
            >
                Comprehensive Financial Toolkit
            </motion.h2>
        </div>
        <motion.div 
          className="grid gap-8 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          animate={basicLessonsInView ? "visible" : "hidden"}
        >
          <motion.div 
            className="rounded-2xl bg-white p-8 shadow-md"
            variants={fadeInUp}
            custom={0.1}
          >
            <motion.div 
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600"
              variants={elasticScale}
              custom={0.2}
            >
              <FontAwesomeIcon icon={faBookOpen} className="text-xl" aria-hidden="true" />
            </motion.div>
            <motion.h3 
              className="mb-3 text-xl font-semibold"
              variants={fadeInUp}
              custom={0.3}
            >
              Expert-Led Foundational Courses
            </motion.h3>
            <motion.p 
              className="mb-6 text-gray-700"
              variants={fadeInUp}
              custom={0.4}
            >
              Build a strong base with structured courses from our experienced financial instructor.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              custom={0.5}
            >
              <Link
                to="/learning/your-2025-guide-to-investing"
                className="inline-flex items-center font-medium text-blue-600 hover:text-blue-800"
              >
                Start learning
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" aria-hidden="true" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="rounded-2xl bg-white p-8 shadow-md"
            variants={fadeInUp}
            custom={0.3}
          >
            <motion.div 
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-purple-600"
              variants={elasticScale}
              custom={0.4}
            >
              <FontAwesomeIcon icon={faRobot} className="text-xl" aria-hidden="true" />
            </motion.div>
            <motion.h3 
              className="mb-3 text-xl font-semibold"
              variants={fadeInUp}
              custom={0.5}
            >
              Chat with Moneko AI
            </motion.h3>
            <motion.p 
              className="mb-6 text-gray-700"
              variants={fadeInUp}
              custom={0.6}
            >
              Get instant, personalized financial advice and answers to your complex questions, 24/7.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              custom={0.7}
            >
              <Link
                to="/chat"
                className="inline-flex items-center font-medium text-purple-600 hover:text-purple-800"
              >
                Start chatting
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" aria-hidden="true" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div 
            className="rounded-2xl bg-white p-8 shadow-md"
            variants={fadeInUp}
            custom={0.5}
          >
            <motion.div 
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600"
              variants={elasticScale}
              custom={0.6}
            >
              <FontAwesomeIcon icon={faPuzzlePiece} className="text-xl" aria-hidden="true" />
            </motion.div>
            <motion.h3 
              className="mb-3 text-xl font-semibold"
              variants={fadeInUp}
              custom={0.7}
            >
              Interactive Financial Tools
            </motion.h3>
            <motion.p 
              className="mb-6 text-gray-700"
              variants={fadeInUp}
              custom={0.8}
            >
              Plan your future with our suite of calculators for loans, investments, retirement, and more.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              custom={0.9}
            >
              <Link
                to="/calculators"
                className="inline-flex items-center font-medium text-green-600 hover:text-green-800"
              >
                Explore tools
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <FontAwesomeIcon icon={faArrowRight} className="ml-2" aria-hidden="true" />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Expert-Led Basic Lessons Section */}
      <section
        ref={basicLessonsSectionRef}
        className="bg-slate-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto max-w-7xl">
          <motion.h2 
            className="mb-6 text-center text-3xl font-bold text-slate-800 md:text-4xl"
            variants={fadeInDown}
            initial="hidden"
            animate={basicLessonsInView ? "visible" : "hidden"}
          >
            Dive Deeper with Expert-Led Lessons
          </motion.h2>
          <motion.p 
            className="mb-12 text-center text-lg text-slate-600 md:mx-auto md:max-w-2xl"
            variants={fadeInUp}
            initial="hidden"
            animate={basicLessonsInView ? "visible" : "hidden"}
            custom={0.2}
          >
            Our foundational courses are crafted by a seasoned Financial Instructor (CFA, CSC, MBA) with over 10 years of experience, making complex topics clear and actionable, no matter your background.
          </motion.p>
          <motion.div 
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            animate={basicLessonsInView ? "visible" : "hidden"}
          >
            {basicLessonsData.lessons.slice(0, 2).map((lesson, index) => (
              <BasicLessonCard
                key={`preview-${lesson.lesson_id}`}
                icon={lesson.icon}
                title={lesson.title}
                description={lesson.description}
                linkTo={`/learning/${basicLessonsData.id}/lesson/${lesson.lesson_id}`}
                animationDelay={0.1 * (index + 1)}
              />
            ))}
            {/* Explore More Card */}
            {basicLessonsData.lessons.length > 2 && (
              <motion.div
                variants={fadeInUp}
                custom={0.4}
              >
                <Link
                  to={`/learning/${basicLessonsData.id}`}
                  role="button"           
                  className="transform rounded-2xl bg-white p-8 shadow-md h-full flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
                >
                  <div className="flex-grow flex flex-col items-center justify-center">
                    <motion.div 
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                      variants={elasticScale}
                      custom={0.5}
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xl" aria-hidden="true" />
                    </motion.div>
                    <motion.h3 
                      className="mb-3 text-xl font-semibold text-slate-800"
                      variants={fadeInUp}
                      custom={0.6}
                    >
                      Explore All Lessons
                    </motion.h3>
                    <motion.p 
                      className="text-sm text-slate-600"
                      variants={fadeInUp}
                      custom={0.7}
                    >
                      View all {basicLessonsData.lessons.length} foundational courses.
                    </motion.p>
                  </div>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection faqData={faqData} />

      {/* Waitlist Section */}
      <section 
        id="waitlist" 
        className="px-6 py-20 md:px-12 lg:px-24"
        ref={waitlistSectionRef}
      >
        <motion.div 
          className="mx-auto max-w-4xl"
          variants={fadeIn}
          initial="hidden"
          animate={waitlistInView ? "visible" : "hidden"}
          transition={{ duration: 0.5 }}
        >
          <WaitlistForm />
        </motion.div>
      </section>

      {/* Footer */}
      <footer 
        className="bg-gray-900 px-6 py-12 text-white md:px-12 lg:px-24"
        ref={footerRef}
      >
        <motion.div 
          className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          animate={footerInView ? "visible" : "hidden"}
        >
          <motion.div variants={fadeInUp} custom={0.1}>
            <motion.div className="mb-4 flex items-center" variants={fadeInUp} custom={0.2}>
              <motion.img 
                src={catCoin} 
                alt="Moneko Logo" 
                className="h-8 w-8" 
                width="32" 
                height="32" 
                loading="lazy" 
                variants={elasticScale}
                custom={0.3}
              />
              <motion.span className="ml-2 text-xl font-bold" variants={fadeInUp} custom={0.4}>Moneko</motion.span>
            </motion.div>
            <motion.p className="text-gray-400" variants={fadeInUp} custom={0.5}>
            Empowering your financial journey with intelligent, personalized learning.
            </motion.p>
          </motion.div>

          <motion.div variants={fadeInUp} custom={0.2}>
            <motion.h3 className="mb-4 text-lg font-bold" variants={fadeInUp} custom={0.3}>Quick Links</motion.h3>
            <motion.ul className="space-y-2" variants={staggerContainer}>
              <motion.li variants={fadeInUp} custom={0.4}>
                <Link to="/learning" className="text-gray-400 hover:text-white">
                AI Learning
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.5}>
                <Link to="/learning/your-2025-guide-to-investing" className="text-gray-400 hover:text-white">
                Expert Courses
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.6}>
                <Link to="/calculators" className="text-gray-400 hover:text-white">
                Financial Calculators
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <Link to="/chat" className="text-gray-400 hover:text-white">
                Chat with AI
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div variants={fadeInUp} custom={0.3}>
            <motion.h3 className="mb-4 text-lg font-bold" variants={fadeInUp} custom={0.4}>Legal</motion.h3>
            <motion.ul className="space-y-2" variants={staggerContainer}>
              <motion.li variants={fadeInUp} custom={0.5}>
                <Link to="/privacy-policy" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.6}>
                <Link to="/terms-of-service" className="text-gray-400 hover:text-white">
                  Terms of Service
                </Link>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <Link to="/cookie-policy" className="text-gray-400 hover:text-white">
                  Cookie Policy
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div variants={fadeInUp} custom={0.4}>
            <motion.h3 className="mb-4 text-lg font-bold" variants={fadeInUp} custom={0.5}>Connect</motion.h3>
            <motion.ul className="space-y-2" variants={staggerContainer}>
              <motion.li variants={fadeInUp} custom={0.6}>
                <a href="https://twitter.com" className="text-gray-400 hover:text-white">
                  Twitter
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <a href="https://discord.gg/RZdG7GpX" className="text-gray-400 hover:text-white">
                  Discord
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.8}>
                <a href="mailto:hello@pawfi.com" className="text-gray-400 hover:text-white">
                  Contact Us
                </a>
              </motion.li>
            </motion.ul>
          </motion.div>

          <motion.div 
            className="col-span-full mx-auto mt-12 max-w-7xl border-t border-gray-800 pt-8 text-center text-gray-400"
            variants={fadeInUp}
            custom={0.9}
          >
            <motion.div className="flex justify-center space-x-4 mb-4" variants={staggerContainer}>
              <motion.a 
                href="https://facebook.com/your-pawfi-page" 
                aria-label="Moneko on Facebook" 
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.0}
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                    clipRule="evenodd"
                  />
                </svg>
              </motion.a>
              <motion.a 
                href="https://twitter.com/your-pawfi-handle" 
                aria-label="Moneko on Twitter" 
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.1}
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </motion.a>
              <motion.a 
                href="https://instagram.com/your-pawfi-handle" 
                aria-label="Moneko on Instagram" 
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.2}
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.467.398.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </motion.a>
            </motion.div>
            <motion.p variants={fadeInUp} custom={1.3}>© 2025 Moneko. All rights reserved.</motion.p>
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
}
