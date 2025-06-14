"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import "@/types/route-types"; // Import route type definitions
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation, useScroll, useTransform, easeInOut } from "framer-motion";
import Lottie from "lottie-react";
import aiChatAnimation from "@/assets/videos/AI-Chat.json";
import badgeUnlockAnimation from "@/assets/videos/Badge-Unlock.json";

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
  faX,
  faLightbulb,
  faPaperPlane,
  faChartLine,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { seo } from '@/utils/seo';
import basicLessonsData from '@/data/basic-lessons.json';
import faqData from '@/data/home/home-faq.json';

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => {
    const title = "Moneko: Learn Finance with Free Education & AI Tools";
    const description = "Moneko offers free financial education, AI lessons & tools to manage money. Start your financial literacy journey & gain confidence!";
    const keywords = "financial education, personal finance, money management, investing, saving, budgeting, financial literacy, free financial tools, Moneko";
    const imageUrl = 'https://paw-fi.app/og-img.png';
    const pageUrl = 'https://pawfi.app/';

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
          href: 'https://pawfi.app/'
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
  return (
    <motion.div
      className={`transform rounded-2xl bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
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
  return (
    <div>
      <motion.div
        className="transform rounded-2xl bg-white p-8 shadow-md h-full flex flex-col"
        variants={fadeInUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
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
import { faFacebook, faInstagram } from "@fortawesome/free-brands-svg-icons";

function WaitlistForm() {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    window.open("https://discord.gg/RZdG7GpX", "_blank");
  };

  return (
    <motion.div 
      className="rounded-3xl bg-purple-100 p-8 shadow-md"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >    
      <div className="flex flex-col items-center justify-center">
        <motion.h3 
          className="mb-3 text-center text-2xl font-bold"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          custom={0.1}
        >
          Get Early Access to AI-Powered Learning
        </motion.h3>
        <motion.p 
          className="mb-6 text-center text-gray-700"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          custom={0.2}
        >
          Be among the first to experience personalized financial education with Moneko. Join our community for updates and beta access.
        </motion.p>

        <motion.div 
          className="mx-auto flex max-w-md flex-col gap-3 md:flex-row"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
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

export default function HomePage() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const toolkitRef = useRef<HTMLDivElement>(null);
  const basicLessonsRef = useRef<HTMLDivElement>(null);
  const waitlistRef = useRef<HTMLDivElement>(null);
  // We only need to keep refs that are used for other purposes than animation triggering
  const catRef = useRef<HTMLImageElement>(null);
  
  // Controls for staggered animations
  const learningControls = useAnimation();
  
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

  // Create a scroll animation value for parallax effect
  const { scrollY } = useScroll();
  
  // Create spring-like scroll values for jellyfish movement with fluid easing
  const jellyfishY = useTransform(
    scrollY, 
    [0, 500, 1000, 1500], 
    [0, 50, -30, 20], 
    { ease: easeInOut }
  );
  
  const jellyfishRotate = useTransform(
    scrollY, 
    [0, 800, 1600], 
    [0, 5, -3], 
    { ease: easeInOut }
  );
  
  const jellyfishScale = useTransform(
    scrollY, 
    [0, 700, 1400], 
    [1, 1.05, 0.98], 
    { ease: easeInOut }
  );
  
  // Tentacle movement values that respond to scroll
  const tentacle1Y = useTransform(
    scrollY, 
    [0, 400, 800, 1200], 
    [0, 30, 15, 40], 
    { ease: easeInOut }
  );
  
  const tentacle2Y = useTransform(
    scrollY, 
    [0, 400, 800, 1200], 
    [0, 20, 40, 25], 
    { ease: easeInOut }
  );
  
  return (
    <div className="relative min-h-screen bg-[#f5f3ff]">
      {/* Centered jellyfish-like halo animation */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        
        {/* Jellyfish container - moves as a whole with scroll */}
        <motion.div
          className="relative w-[80%] h-[80%] flex items-center justify-center"
          style={{ 
            y: jellyfishY,
            rotate: jellyfishRotate,
            scale: jellyfishScale
          }}
        >
          {/* Base gradient layer */}
          <motion.div 
            className="absolute w-full h-full rounded-full bg-gradient-to-br from-purple-200/70 via-indigo-100/70 to-blue-200/70 blur-lg"
            initial={{ opacity: 0.6, scale: 0.9 }}
            animate={{
              opacity: [0.6, 0.8, 0.6],
              scale: [0.9, 1.1, 0.9]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Main jellyfish body - larger central blob */}
          <motion.div
            className="absolute w-[65%] h-[65%] rounded-full bg-gradient-to-r from-purple-400/50 to-indigo-400/50 blur-2xl"
            initial={{ opacity: 0.7 }}
            animate={{
              opacity: [0.7, 0.9, 0.7],
              scale: [1, 1.15, 1],
              y: [0, -15, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Secondary pulsing blob - creates depth */}
          <motion.div
            className="absolute w-[55%] h-[55%] rounded-full bg-gradient-to-l from-blue-400/50 to-purple-400/50 blur-2xl"
            initial={{ opacity: 0.7 }}
            animate={{
              opacity: [0.7, 0.9, 0.7],
              scale: [1, 1.1, 1],
              y: [0, -10, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          {/* Tentacle-like accent 1 */}
          <motion.div
            className="absolute w-[40%] h-[50%] rounded-full bg-gradient-to-l from-teal-400/40 to-blue-400/40 blur-2xl"
            style={{ y: tentacle1Y }}
            initial={{ opacity: 0.6 }}
            animate={{
              opacity: [0.6, 0.8, 0.6],
              scale: [1, 1.2, 1],
              y: [0, 25, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          {/* Tentacle-like accent 2 */}
          <motion.div
            className="absolute w-[35%] h-[45%] rounded-full bg-gradient-to-r from-pink-400/40 to-purple-400/40 blur-2xl"
            style={{ y: tentacle2Y }}
            initial={{ opacity: 0.6 }}
            animate={{
              scale: [0.8, 1, 0.8],
              opacity: [0.7, 0.8, 0.7],
              x: [0, 20, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          />
          {/* Jellyfish tentacle 1 */}
          <motion.div
            className="absolute w-[10%] h-[30%] rounded-full bg-gradient-to-b from-indigo-400/40 to-purple-300/30 blur-xl"
            style={{ top: '60%', left: '45%', y: tentacle1Y }}
            initial={{ opacity: 0.6, y: 0 }}
            animate={{
              opacity: [0.6, 0.8, 0.6],
              scaleY: [0.8, 1.2, 0.8]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          
          {/* Jellyfish tentacle 2 */}
          <motion.div
            className="absolute w-[8%] h-[25%] rounded-full bg-gradient-to-b from-blue-400/40 to-indigo-300/30 blur-xl"
            style={{ top: '62%', left: '55%', y: tentacle2Y }}
            initial={{ opacity: 0.6, y: 0 }}
            animate={{
              opacity: [0.6, 0.8, 0.6],
              scaleY: [0.7, 1.3, 0.7]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </motion.div>
      </div>
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
          <div className="flex items-center gap-x-8">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={catCoin}
                alt="Moneko Logo"
                className="h-8 w-8"
                width="32"
                height="32"
              />
              <span className="text-xl font-semibold text-slate-800">Moneko</span>
            </Link>
            <div className="hidden md:flex items-center gap-x-6">
              <Link
                to="/learning"
                className="text-sm font-medium text-slate-700 hover:text-purple-600 transition-colors"
              >
                Learning
              </Link>
              <Link
                to="/calculators"
                className="text-sm font-medium text-slate-700 hover:text-purple-600 transition-colors"
              >
                Calculators
              </Link>
              <Link
                to="/blogs"
                className="text-sm font-medium text-slate-700 hover:text-purple-600 transition-colors"
              >
                Blogs
              </Link>
            </div>        
          </div>
          <div className="flex items-center gap-x-5">
            <Link
              to="/login"
              className="hidden md:block text-sm font-medium text-slate-700 hover:text-purple-600 transition-colors"
            >
              Explore Courses
            </Link>
            <Link
              to="/chat"
              className="font-medium text-purple-600 hover:text-purple-800"
            >
              <Button className="bg-purple-600 hover:bg-purple-700">
                Chat with AI
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Portfolio Builder Section - Exact Match to Mockup */}
      <section className="relative py-20 overflow-hidden bg-transparent">
        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
          {/* Heading */}
          <div className="text-center mb-12">
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Build Your First Portfolio
            </motion.h2>
            <motion.h3 
              className="text-3xl md:text-4xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              from 0 to 1
            </motion.h3>
            <motion.p 
              className="text-gray-600 text-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Create personalized financial journeys by chatting with AI
            </motion.p>
          </div>
          
          {/* Chat Input */}
          <motion.div 
            className="max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <div className="bg-white/60 backdrop-blur-md rounded-full shadow-lg p-2 flex items-center relative overflow-hidden">
              {/* Subtle inner glow effect */}

              
              {/* Plus icon */}
              <div className="flex-shrink-0 ml-2 z-10">
                <FontAwesomeIcon icon={faPlus} className="text-gray-400 h-5 w-5" />
              </div>
              
              {/* Input field */}
              <input 
                type="text" 
                placeholder="Ask PawFi to create personalized financial journey for my..." 
                className="flex-grow px-4 py-3 bg-transparent border-none focus:outline-none text-gray-700 placeholder-gray-400 z-10"
                aria-label="Ask a financial question"
              />
              
              {/* Private badge */}
              <div className="flex-shrink-0 mr-2 z-10">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400 h-4 w-4" />
                  <span className="text-gray-400 text-sm">Private</span>
                </div>
              </div>
              
              {/* Avatar */}
              <div className="flex-shrink-0 mr-2 z-10">
                <div className="bg-purple-500 rounded-full h-8 w-8 flex items-center justify-center text-white font-bold">
                  J
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Button */}
          <motion.div 
            className="flex justify-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <Button className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-3 shadow-lg">
              Start Your Journey Today
            </Button>
          </motion.div>
          
          {/* Video Cards with Seamless Integration */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* AI Chat Animation Card */}
            <motion.div 
              className="rounded-3xl overflow-hidden relative group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              {/* Gradient overlay for seamless integration */}

              
              {/* Glowing border effect */}

              
              {/* Card content with glassmorphism - MORE TRANSPARENT */}
              <div className="bg-white/30 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden relative z-0 group-hover:bg-white/50 transition-all duration-500">
                <div className="aspect-square relative flex items-center justify-center p-2">
                  <Lottie 
                    animationData={aiChatAnimation} 
                    loop={true} 
                    className="w-full h-full"
                  />
                </div>
                
                {/* Subtle caption that appears on hover */}
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600/60 to-transparent p-6 pt-12 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-white font-medium text-lg">AI-Powered Chat Assistant</h3>
                  <p className="text-purple-100 text-sm">Get personalized financial guidance instantly</p>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Badge Unlock Animation Card */}
            <motion.div 
              className="rounded-3xl overflow-hidden relative group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
            >
              {/* Gradient overlay for seamless integration */}

              
              {/* Glowing border effect */}

              
              {/* Card content with glassmorphism - MORE TRANSPARENT */}
              <div className="bg-white/30 backdrop-blur-sm rounded-3xl shadow-lg overflow-hidden relative z-0 group-hover:bg-white/50 transition-all duration-500">
                <div className="aspect-square relative flex items-center justify-center p-2">
                  <Lottie 
                    animationData={badgeUnlockAnimation} 
                    loop={true} 
                    className="w-full h-full"
                  />
                </div>
                
                {/* Subtle caption that appears on hover */}
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600/60 to-transparent p-6 pt-12 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-white font-medium text-lg">Achievement Badges</h3>
                  <p className="text-blue-100 text-sm">Earn rewards as you build financial skills</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Expert-Led Basic Lessons Section */}
      <section
        className="px-6 py-20 md:px-12 lg:px-24 relative overflow-hidden"
      >
        {/* Subtle gradient overlay */}

        
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.h2 
            className="mb-6 text-center text-3xl font-bold text-slate-800 md:text-4xl"
            variants={fadeInDown}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            Dive Deeper with Expert-Led Lessons
          </motion.h2>
          <motion.p 
            className="mb-12 text-center text-lg text-slate-600 md:mx-auto md:max-w-2xl"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            custom={0.2}
          >
            Our foundational courses are crafted by a seasoned Financial Instructor (CFA, CSC, MBA) with over 10 years of experience, making complex topics clear and actionable, no matter your background.
          </motion.p>
          <motion.div 
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
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
        className="px-6 py-20 md:px-12 lg:px-24 relative overflow-hidden"
      >
        {/* Subtle gradient overlay */}

        
        <motion.div 
          className="mx-auto max-w-4xl relative z-10"
          variants={fadeIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="rounded-2xl shadow-lg p-8 border border-white/20">
            <WaitlistForm />
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer 
        className="bg-gray-900/70 backdrop-blur-md px-6 py-12 text-white md:px-12 lg:px-24 relative overflow-hidden"
      >
        {/* Subtle gradient overlay */}

        
        <motion.div 
          className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4 relative z-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
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
                <Link to="/learning/$courseId" params={{ courseId: 'your-2025-guide-to-investing' }} className="text-gray-400 hover:text-white">
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
                <a href="https://www.facebook.com/monekoai/" className="text-gray-400 hover:text-white">
                  Facebook
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.6}>
                <a href="https://www.instagram.com/moneko_ai/" className="text-gray-400 hover:text-white">
                  Instagram
                </a>
              </motion.li>
              <motion.li variants={fadeInUp} custom={0.7}>
                <a href="https://x.com/moneko_ai" className="text-gray-400 hover:text-white">
                  X
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
                href="https://www.facebook.com/monekoai/" 
                aria-label="Moneko on Facebook" 
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.0}
              >
              <FontAwesomeIcon icon={faFacebook} />
              </motion.a>
              <motion.a 
                href="https://x.com/moneko_ai" 
                aria-label="Moneko on X" 
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.1}
              >
                <FontAwesomeIcon icon={faX} />
              </motion.a>
              <motion.a 
                href="https://www.instagram.com/moneko_ai/" 
                aria-label="Moneko on Instagram" 
                className="text-gray-400 hover:text-white"
                variants={fadeInUp}
                custom={1.2}
              >
              <FontAwesomeIcon icon={faInstagram} />
              </motion.a>
            </motion.div>
            <motion.p variants={fadeInUp} custom={1.3}>© 2025 Moneko. All rights reserved.</motion.p>
          </motion.div>
        </motion.div>
      </footer>
    </div>
  );
}
