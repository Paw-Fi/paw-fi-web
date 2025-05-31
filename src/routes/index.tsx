"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useRef,useEffect } from "react";
import { useGSAP } from "@gsap/react";
// Import GSAP with plugins already registered
import { gsap, ScrollTrigger } from "@/lib/gsap-config";
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

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => {
    const title = "PawFi: Learn Finance with Free Education & AI Tools";
    const description = "PawFi offers free financial education, AI lessons & tools to manage money. Start your financial literacy journey & gain confidence!";
    const keywords = "financial education, personal finance, money management, investing, saving, budgeting, financial literacy, free financial tools, PawFi";
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
          "name": "PawFi",
          "url": pageUrl,
          "logo": `${pageUrl}icon.svg` // Assuming icon.svg is served from root
        },
        {
          "@type": "WebSite",
          "name": "PawFi",
          "url": pageUrl
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is PawFi?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "PawFi is an online platform dedicated to making financial education accessible and engaging. We offer AI-driven personalized learning, expert-led courses, and practical financial tools to help you master personal finance, investing, budgeting, and more."
              }
            },
            {
              "@type": "Question",
              "name": "Who is PawFi for?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "PawFi is for anyone looking to improve their financial literacy, from beginners just starting their financial journey to individuals seeking to deepen their understanding of specific financial topics. Whether you want to learn about saving, investing, managing debt, or planning for retirement, PawFi has resources for you."
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
              "name": "Are the financial courses and tools on PawFi free?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "PawFi offers a mix of free and premium content. Many of our foundational lessons, AI chat features, and basic financial calculators are available for free to help you get started. Advanced courses and specialized tools may be part of a premium offering."
              }
            },
            {
              "@type": "Question",
              "name": "What kind of financial tools does PawFi offer?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "PawFi provides a suite of practical financial calculators to help you plan and manage your money effectively. These include tools for auto loans, compound interest, mortgage calculations, retirement planning, and setting savings goals."
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
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (cardRef.current) {
        // Direct DOM manipulation approach - set initial state
        gsap.set(cardRef.current, {
          opacity: 0,
          y: 30,
          scale: 0.95
        });
        
        // Create a simple IntersectionObserver to trigger the animation
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              // When card comes into view, animate it
              gsap.to(cardRef.current, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.7,
                delay: animationDelay,
                ease: "back.out(1.7)"
              });
              // Only need to observe once
              observer.disconnect();
            }
          },
          { threshold: 0.1 }
        );
        
        observer.observe(cardRef.current);
        
        return () => observer.disconnect();
      }
    },
    { scope: cardRef, dependencies: [] },
  );

  return (
    <div
      ref={cardRef}
      className={`transform rounded-2xl bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
        <FontAwesomeIcon icon={icon} size="lg" className="text-purple-600" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
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
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (cardRef.current) {
        gsap.set(cardRef.current, { opacity: 0, y: 30, scale: 0.95 });
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              gsap.to(cardRef.current, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.7,
                delay: animationDelay,
                ease: "back.out(1.7)",
              });
              observer.disconnect();
            }
          },
          { threshold: 0.1 },
        );
        observer.observe(cardRef.current);
        return () => observer.disconnect();
      }
    },
    { scope: cardRef, dependencies: [animationDelay] }, // Added animationDelay to dependencies
  );

  return (
    <Link
    to={linkTo}
      ref={cardRef}
      className="transform rounded-2xl bg-white p-8 shadow-md h-full flex flex-col transition-all hover:shadow-lg hover:-translate-y-1"
    >
      <div className="flex-grow">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <span className="text-xl" aria-hidden="true">{icon}</span>
        </div>
        <h3 className="mb-3 text-xl font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{description}</p>
      </div> {/* End of flex-grow div */}
      <div
        className="inline-flex items-center font-medium text-emerald-600 hover:text-emerald-800 mt-auto"
      >
        Start Lesson
        <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
      </div>
    </Link>
  );
}

import { FaqSection } from '@/components/ui/faq-section';

function WaitlistForm() {
  const formRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (formRef.current) {
        // Direct DOM manipulation approach - set initial state
        gsap.set(formRef.current, {
          opacity: 0,
          y: 50
        });
        
        // Create a simple IntersectionObserver to trigger the animation
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              // When form comes into view, animate it
              gsap.to(formRef.current, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: "power3.out"
              });
              // Only need to observe once
              observer.disconnect();
            }
          },
          { threshold: 0.1 }
        );
        
        observer.observe(formRef.current);
        
        return () => observer.disconnect();
      }
    },
    { scope: formRef, dependencies: [] },
  );

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
    <div ref={formRef} className="rounded-3xl bg-purple-100 p-8 shadow-md">    
        <div className="form-contents flex flex-col items-center justify-center">
          <h3 className="mb-3 text-center text-2xl font-bold">
          Get Early Access to AI-Powered Learning
          </h3>
          <p className="mb-6 text-center text-gray-700">
          Be among the first to experience personalized financial education with PawFi. Join our community for updates and beta access.
          </p>

          
            <div className="mx-auto flex max-w-md flex-col gap-3 md:flex-row">              
              <Button
                className="rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"            
                onClick={handleSubmit}
              >
                Join Discord 
              </Button>
            </div>
        </div>
      
    </div>
  );
}

export function HomePage() {
  // Force GSAP's ScrollTrigger to refresh when this component mounts
  gsap.registerPlugin(ScrollTrigger);
  const headerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const learningSectionRef = useRef<HTMLDivElement>(null); // Used for two sections
  const basicLessonsSectionRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLImageElement>(null);

  // ScrollTrigger is already registered globally

  // Completely remove dependency on ScrollTrigger for sections and use IntersectionObserver directly
  useEffect(() => {
    // Kill any existing ScrollTriggers to avoid conflicts
    ScrollTrigger.getAll().forEach(st => st.kill());
    
    // Set initial states for all animated elements
    gsap.set(".features-title", { opacity: 0, y: 30 });
    gsap.set(missionRef.current, { opacity: 0, y: 50 });
    gsap.set(".learning-title", { opacity: 0, y: 30 }); // Applies to both sections using this class
    gsap.set(".learning-image", { opacity: 0, scale: 0.8 });
    gsap.set(".learning-step", { opacity: 0, x: -30 });
    gsap.set(".basic-lessons-title", { opacity: 0, y: 30 });
    // BasicLessonCard animations are handled within the component itself
    
    // Create animation functions
    const animateFeatures = () => {
      gsap.to(".features-title", {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    };
    
    const animateMission = () => {
      gsap.to(missionRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out"
      });
    };
    
    const animateLearning = () => {
      const tl = gsap.timeline();
      tl.to(".learning-title", { opacity: 1, y: 0, duration: 0.6 })
        .to(".learning-image", { opacity: 1, scale: 1, duration: 0.8 }, "-=0.3")
        .to(".learning-step", {
          opacity: 1,
          x: 0,
          stagger: 0.2,
          duration: 0.5
        }, "-=0.5");
    };

    const animateBasicLessons = () => {
      gsap.to(".basic-lessons-title", {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
      });
      // Individual card animations are self-contained in BasicLessonCard
    };
    
    // Use IntersectionObserver to trigger animations when elements come into view
    const featuresObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateFeatures();
        featuresObserver.disconnect();
      }
    }, { threshold: 0.1 });
    
    const missionObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateMission();
        missionObserver.disconnect();
      }
    }, { threshold: 0.1 });
    
    const learningObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateLearning();
        learningObserver.disconnect();
      }
    }, { threshold: 0.1 });

    const basicLessonsObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        animateBasicLessons();
        basicLessonsObserver.disconnect();
      }
    }, { threshold: 0.1 });


    
    // Observe the trigger elements
    if (featuresRef.current) featuresObserver.observe(featuresRef.current);
    if (missionRef.current) missionObserver.observe(missionRef.current);
    // learningSectionRef is used by two sections, ensure IntersectionObserver is robust or use separate refs if issues arise
    if (learningSectionRef.current) {
        // Assuming learningSectionRef points to the PARENT of multiple animated sections or the first one.
        // For more complex scenarios with multiple distinct sections using the same ref for triggering, 
        // consider unique refs or more specific querySelectors for observers.
        learningObserver.observe(learningSectionRef.current); 
    }
    if (basicLessonsSectionRef.current) basicLessonsObserver.observe(basicLessonsSectionRef.current);
    
    return () => {
      // Clean up
      featuresObserver.disconnect();
      missionObserver.disconnect();
      learningObserver.disconnect();
      basicLessonsObserver.disconnect();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  // Initial animations for hero section only - these work fine
  useGSAP(() => {
    const tl = gsap.timeline();

    // Animate the header elements
    tl.from(".hero-title", {
      opacity: 0,
      y: -50,
      duration: 0.8,
      ease: "power3.out",
    });

    tl.from(
      ".hero-subtitle",
      {
        opacity: 0,
        y: -30,
        duration: 0.8,
        ease: "power3.out",
      },
      "-=0.6",
    );

    tl.from(
      ".hero-cta",
      {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: "power3.out",
      },
      "-=0.6",
    );

    // Animate the cat
    tl.from(
      catRef.current,
      {
        scale: 0.8,
        opacity: 0,
        rotation: -10,
        duration: 1,
        ease: "elastic.out(1, 0.5)",
      },
      "-=0.8",
    );

    // Create floating animation for the cat
    gsap.to(catRef.current, {
      y: 15,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, { dependencies: [] });
  
  // Register a scroll listener to force check visibility of elements as fallback
  useEffect(() => {
    const handleScroll = () => {
      // Get all elements with animations
      const elements = document.querySelectorAll('.learning-step, .features-title, .learning-title, .learning-image, .basic-lessons-title');
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        // If element is in viewport and has opacity 0, make it visible
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const opacity = window.getComputedStyle(el).opacity;
          if (parseFloat(opacity) === 0) {
            gsap.to(el, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.5 });
          }
        }
      });
    };
    
    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check
    setTimeout(handleScroll, 200);
    setTimeout(handleScroll, 1000); // Another check after a delay
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-background flex-1 overflow-x-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center">
          <img src={catCoin} alt="PawFi Logo" className="h-10 w-10" width="40" height="40" />
          <span className="ml-2 text-xl font-bold">PawFi</span> 
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
            <h1 className="hero-title mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Personalized Financial Mastery with{" "}
              <span className="text-purple-600">AI-Driven Learning</span>
            </h1>
            <p className="hero-subtitle mb-8 text-xl text-gray-700">
              PawFi understands your unique financial journey. Our AI crafts tailored lessons, guiding you to financial literacy and confidence, supported by expert-curated content and AI insights.
            </p>
            <div className="hero-cta flex flex-col gap-4 sm:flex-row">
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
                </div>
          </div>
          <div className="relative z-20 flex justify-center lg:justify-end">
            <img
              ref={catRef}
              src={banner}
              alt="Friendly cat mascot illustrating PawFi's AI-driven financial learning platform"
              className="w-72 md:w-96"
              width="1846"
              height="2275"
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
          <h2 className="features-title mb-16 text-center text-3xl font-bold md:text-4xl">
          Intelligent Financial Education, 
            <span className="text-purple-600">Tailored For You</span>
          </h2>

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
        <h2 className="section-title-animate mb-8 text-3xl font-bold text-slate-800 md:text-4xl">Our Vision for Your Financial Future</h2>
          <p className="mb-10 text-lg text-slate-600 leading-relaxed">
            At PawFi, we're committed to democratizing financial literacy. We leverage cutting-edge AI to make complex financial concepts accessible, engaging, and actionable for everyone, regardless of their background. Our goal is to empower you with the knowledge and tools to achieve financial independence.
          </p>
          <div className="flex justify-center">
            <img src={banner3} alt="Illustration of a cat with a piggy bank, symbolizing PawFi's commitment to financial growth and literacy" className="w-56" width="1216" height="1848" loading="lazy" />
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
            <h2 className="learning-title mb-10 text-3xl font-bold md:text-4xl">
              How PawFi Works
            </h2>

            <div className="space-y-8">
              {[
                { title: "Tell Us About You", description: "Share your financial goals and current understanding. Our AI listens.", number: 1 },
                { title: "Receive Your Custom Plan", description: "Our AI designs a unique lesson plan, focusing on what matters most to you.", number: 2 },
                { title: "Learn & Interact", description: "Engage with AI-generated lessons, chat for clarity, and practice with real-world scenarios.", number: 3 },
                { title: "Track & Achieve", description: "Monitor your progress, master new skills, and apply your knowledge confidently.", number: 4 },
              ].map((step, index) => (
                <div className="learning-step flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                  {step.number}
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">
                    {step.title}
                  </h3>
                  <p className="text-gray-700">
                    {step.description}
                  </p>
                </div>
              </div>
              ))}
            </div>

            <div className="mt-12">
              <Link
                to="/chat"
                className="inline-flex items-center font-medium text-purple-600 hover:text-purple-800"
              >
               Discover Your Path
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <img
              className="learning-image w-44 md:w-80"
              src={banner2}
              alt="Visual representation of PawFi's personalized AI learning journey for financial education"
              width="1084"
              height="1848"
              loading="lazy"
            />
          </div>
        </div>
      </section>
          {/* Learning Journey Section */}
          <section
        ref={learningSectionRef}
        title="Start Your Financial Learning Journey"
        className="bg-purple-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto max-w-7xl text-center">
            <h2 className="section-title-animate mb-16 text-3xl font-bold text-slate-800 md:text-4xl">
                Comprehensive Financial Toolkit
            </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FontAwesomeIcon icon={faBookOpen} className="text-xl" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Expert-Led Foundational Courses</h3>
            <p className="mb-6 text-gray-700">
            Build a strong base with structured courses from our experienced financial instructor.            </p>
            <Link
              to="/learning/your-2025-guide-to-investing"
              className="inline-flex items-center font-medium text-blue-600 hover:text-blue-800"
            >
              Start learning
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-purple-600">
              <FontAwesomeIcon icon={faRobot} className="text-xl" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Chat with PawFi AI</h3>
            <p className="mb-6 text-gray-700">
            Get instant, personalized financial advice and answers to your complex questions, 24/7.
            </p>
            <Link
              to="/chat"
              className="inline-flex items-center font-medium text-purple-600 hover:text-purple-800"
            >
              Start chatting
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <FontAwesomeIcon icon={faPuzzlePiece} className="text-xl" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Interactive Financial Tools</h3>
            <p className="mb-6 text-gray-700">
            Plan your future with our suite of calculators for loans, investments, retirement, and more.
            </p>
            <Link
              to="/calculators"
              className="inline-flex items-center font-medium text-green-600 hover:text-green-800"
            >
              Explore tools
              <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Expert-Led Basic Lessons Section */}
      <section
        ref={basicLessonsSectionRef}
        className="bg-slate-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="basic-lessons-title mb-6 text-center text-3xl font-bold text-slate-800 md:text-4xl">
            Dive Deeper with Expert-Led Lessons
          </h2>
          <p className="mb-12 text-center text-lg text-slate-600 md:mx-auto md:max-w-2xl">
            Our foundational courses are crafted by a seasoned Financial Instructor (CFA, CSC, MBA) with over 10 years of experience, making complex topics clear and actionable, no matter your background.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {basicLessonsData.lessons.slice(0, 2).map((lesson, index) => (
              <BasicLessonCard
                key={`preview-${lesson.id}`}
                icon={lesson.icon}
                title={lesson.title}
                description={lesson.description}
                linkTo={`/learning/${basicLessonsData.id}/lesson/${lesson.id}`}
                animationDelay={0.1 * (index + 1)}
              />
            ))}
            {/* Explore More Card */}
            {basicLessonsData.lessons.length > 2 && (
              <Link
                to={`/learning/${basicLessonsData.id}`}
                role="button"           
                className="transform rounded-2xl bg-white p-8 shadow-md h-full flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50"
              >
                <div className="flex-grow flex flex-col items-center justify-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <FontAwesomeIcon icon={faPlus} className="text-xl" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-slate-800">Explore All Lessons</h3>
                  <p className="text-sm text-slate-600">
                    View all {basicLessonsData.lessons.length} foundational courses.
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FaqSection faqData={faqData} />

      {/* Waitlist Section */}
      <section id="waitlist" className="px-6 py-20 md:px-12 lg:px-24">
        <div className="mx-auto max-w-4xl">
          <WaitlistForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-12 text-white md:px-12 lg:px-24">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center">
              <img src={catCoin} alt="PawFi Logo" className="h-8 w-8" width="32" height="32" loading="lazy" />
              <span className="ml-2 text-xl font-bold">PawFi</span>
            </div>
            <p className="text-gray-400">
            Empowering your financial journey with intelligent, personalized learning.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/learning" className="text-gray-400 hover:text-white">
                AI Learning
                </a>
              </li>
              <li>
                <a href="/learning/your-2025-guide-to-investing" className="text-gray-400 hover:text-white">
                Expert Courses
                </a>
              </li>
              <li>
                <a href="/calculators" className="text-gray-400 hover:text-white">
                Financial Calculators
                </a>
              </li>
              <li>
                <a href="/chat" className="text-gray-400 hover:text-white">
                Chat with AI
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy-policy" className="text-gray-400 hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-gray-400 hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookie-policy" className="text-gray-400 hover:text-white">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Connect</h3>
            <p className="mb-4 text-gray-400">
              Stay up to date with the latest from PawFi.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com/your-pawfi-page" aria-label="PawFi on Facebook" className="text-gray-400 hover:text-white">
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
              </a>
              <a href="https://twitter.com/your-pawfi-handle" aria-label="PawFi on Twitter" className="text-gray-400 hover:text-white">
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white">
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
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-gray-800 pt-8 text-center text-gray-400">
          <p> 2025 PawFi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
