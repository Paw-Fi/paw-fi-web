"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
// Import GSAP with plugins already registered
import { gsap } from "@/lib/gsap-config";
import { Button } from "@/components/ui/button";
import catIcon from "@/assets/images/ani_transparent.gif";
import catPig from "@/assets/images/lessons/cat-pig.svg";
import catCoin from "@/assets/images/lessons/cat-coin.svg";
import catCash from "@/assets/images/lessons/cat-cashbag.svg";
import waveBackground from "@/assets/images/wave.svg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faLightbulb,
  faPiggyBank,
  faArrowRight,
  faGraduationCap,
  faCoins,
  faChartPie,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/lib/supabase";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const Route = createFileRoute("/")({
  component: HomePage,
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
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 30,
        scale: 0.95,
        duration: 0.7,
        delay: animationDelay,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top bottom-=100",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: cardRef },
  );

  return (
    <div
      ref={cardRef}
      className={`transform rounded-2xl bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
        <FontAwesomeIcon icon={icon} size="lg" className="text-purple-600" />
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function WaitlistForm() {
  const formRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useGSAP(
    () => {
      gsap.from(formRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.8,
        scrollTrigger: {
          trigger: formRef.current,
          start: "top bottom-=150",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: formRef },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email) {
      setIsSubmitting(true);

      try {
        const { data, error } = await supabase
          .from("waiting-list")
          .insert([{ email }]);

        if (error) throw error;

        console.log("Email submitted successfully:", data);
        setSubmitted(true);

        // Show success toast notification
        toast.success("Thanks for joining our waitlist!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
     
      } catch (error) {
        console.error("Error submitting email:", error);

        // Show error toast notification
        toast.error("Oops! Something went wrong. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div ref={formRef} className="rounded-3xl bg-purple-100 p-8 shadow-md">
      {!submitted ? (
        <div className="form-contents flex flex-col items-center justify-center">
          <h3 className="mb-3 text-center text-2xl font-bold">
            Join our Waitlist
          </h3>
          <p className="mb-6 text-center text-gray-700">
            Be the first to know when Paw-Fi launches!
          </p>

          <form
            onSubmit={handleSubmit}
          >
            <div className="mx-auto flex max-w-md flex-col gap-3 md:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow rounded-lg border px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                placeholder="Your email address"
                required
              />
              <Button
                type="submit"
                className="rounded-lg bg-purple-600 py-3 font-medium text-white hover:bg-purple-700"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                Join Waitlist
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-10 text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="text-2xl text-green-500"
            />
          </div>
          <h3 className="mb-3 text-2xl font-bold">You're on the list!</h3>
          <p className="max-w-md text-lg text-gray-700">
            We'll notify you when Paw-Fi is ready for you to explore.
          </p>
        </div>
      )}
    </div>
  );
}

function HomePage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const learningSectionRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLImageElement>(null);

  // ScrollTrigger is already registered globally

  // Initial animations when page loads
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

    // Scroll-triggered animations for the features section header
    gsap.from(".features-title", {
      opacity: 0,
      y: 30,
      duration: 0.8,
      scrollTrigger: {
        trigger: featuresRef.current,
        start: "top bottom-=100",
        toggleActions: "play none none reverse",
      },
    });

    // Animation for the mission section
    gsap.from(missionRef.current, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      scrollTrigger: {
        trigger: missionRef.current,
        start: "top bottom-=100",
        toggleActions: "play none none reverse",
      },
    });

    // Animate learning section
    const learningSectionTL = gsap.timeline({
      scrollTrigger: {
        trigger: learningSectionRef.current,
        start: "top bottom-=150",
        toggleActions: "play none none reverse",
      },
    });

    learningSectionTL
      .from(".learning-title", { opacity: 0, y: 30, duration: 0.6 })
      .from(
        ".learning-image",
        { opacity: 0, scale: 0.8, duration: 0.8 },
        "-=0.3",
      )
      .from(
        ".learning-step",
        {
          opacity: 0,
          x: -30,
          stagger: 0.2,
          duration: 0.5,
        },
        "-=0.5",
      );
  }, []);

  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center">
          <img src={catCoin} alt="Paw-Fi" className="h-10 w-10" />
          <span className="ml-2 text-xl font-bold">Paw-Fi</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/intro"
            className="font-medium text-purple-600 hover:text-purple-800"
          >
            Try Demo
          </Link>
          <Link
            to="/intro"
            className="font-medium text-purple-600 hover:text-purple-800"
          >
            <Button className="bg-purple-600 hover:bg-purple-700">
              Get Started
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
              Learning finance{" "}
              <span className="text-purple-600">shouldn't be</span> boring
            </h1>
            <p className="hero-subtitle mb-8 text-xl text-gray-700">
              Join Paw-Fi, the playful financial literacy app that makes
              learning about money fun and accessible for everyone.
            </p>
            <div className="hero-cta flex flex-col gap-4 sm:flex-row">
              <Link to="/intro">
                <Button className="w-full rounded-lg bg-purple-600 px-8 py-3 font-medium text-white hover:bg-purple-700 sm:w-auto">
                  Try Demo
                </Button>
              </Link>
              <a href="#waitlist">
                <Button
                  variant="outline"
                  className="w-full rounded-lg border-purple-600 px-8 py-3 font-medium text-purple-600 hover:bg-purple-50 sm:w-auto"
                >
                  Join Waitlist
                </Button>
              </a>
            </div>
          </div>
          <div className="relative z-20 flex justify-center lg:justify-end">
            <img
              ref={catRef}
              src={catIcon}
              alt="Paw-Fi Cat"
              className="w-64 md:w-80"
            />
          </div>
        </div>

        {/* Wave background at the bottom */}
        <div className="line-height-0 absolute bottom-0 left-0 w-full overflow-hidden">
          <img src={waveBackground} alt="Wave Background" className="w-full" />
        </div>
      </header>

      {/* Features Section */}
      <section
        ref={featuresRef}
        className="bg-purple-50 px-6 py-20 md:px-12 lg:px-24"
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="features-title mb-16 text-center text-3xl font-bold md:text-4xl">
            Financial education{" "}
            <span className="text-purple-600">reimagined</span>
          </h2>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={faLightbulb}
              title="Interactive Learning"
              description="Engaging lessons that adapt to your learning style and financial goals."
              animationDelay={0.1}
            />

            <FeatureCard
              icon={faPiggyBank}
              title="Goal-Based Saving"
              description="Set financial goals and track your progress with fun visual milestones."
              animationDelay={0.2}
            />

            <FeatureCard
              icon={faGraduationCap}
              title="Learn At Your Pace"
              description="Bite-sized lessons that fit into your busy schedule."
              animationDelay={0.3}
            />

            <FeatureCard
              icon={faChartLine}
              title="Track Your Progress"
              description="Visual dashboards to see how your knowledge is growing over time."
              animationDelay={0.4}
            />

            <FeatureCard
              icon={faCoins}
              title="Earn While You Learn"
              description="Get rewarded with XP and badges as you master new financial concepts."
              animationDelay={0.5}
            />

            <FeatureCard
              icon={faChartPie}
              title="Personalized Path"
              description="Content tailored to your specific financial situation and goals."
              animationDelay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section ref={missionRef} className="px-6 py-20 md:px-12 lg:px-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-3xl font-bold md:text-4xl">Our Mission</h2>
          <p className="mb-12 text-xl text-gray-700">
            At Paw-Fi, we believe everyone deserves access to financial
            education that's engaging, approachable, and actually fun. We're on
            a mission to help you build confidence with money through playful,
            interactive learning.
          </p>
          <div className="flex justify-center">
            <img src={catPig} alt="Cat with Piggy Bank" className="w-48" />
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
              How Paw-Fi Works
            </h2>

            <div className="space-y-8">
              <div className="learning-step flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                  1
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">
                    Take a quick assessment
                  </h3>
                  <p className="text-gray-700">
                    We'll get to know your financial goals and current
                    knowledge.
                  </p>
                </div>
              </div>

              <div className="learning-step flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                  2
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">
                    Follow your personalized learning path
                  </h3>
                  <p className="text-gray-700">
                    Engage with interactive lessons designed just for you.
                  </p>
                </div>
              </div>

              <div className="learning-step flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                  3
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">
                    Track your progress
                  </h3>
                  <p className="text-gray-700">
                    Earn rewards as you master new concepts and reach
                    milestones.
                  </p>
                </div>
              </div>

              <div className="learning-step flex items-start gap-4">
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
                  4
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold">
                    Apply your knowledge
                  </h3>
                  <p className="text-gray-700">
                    Use what you've learned to make better financial decisions.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <Link
                to="/intro"
                className="inline-flex items-center font-medium text-purple-600 hover:text-purple-800"
              >
                See it in action
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </Link>
            </div>
          </div>

          <div className="flex justify-center">
            <img
              className="learning-image rounded-xl shadow-lg"
              src={catCash}
              alt="Learning process"
            />
          </div>
        </div>
      </section>

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
              <img src={catCoin} alt="Paw-Fi" className="h-8 w-8" />
              <span className="ml-2 text-xl font-bold">Paw-Fi</span>
            </div>
            <p className="text-gray-400">
              Making financial education accessible, engaging, and fun for
              everyone.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-bold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#waitlist" className="text-gray-400 hover:text-white">
                  Join Waitlist
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
              Stay up to date with the latest from Paw-Fi.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white">
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
              <a href="#" className="text-gray-400 hover:text-white">
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
                    d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-gray-800 pt-8 text-center text-gray-400">
          <p>© {new Date().getFullYear()} Paw-Fi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
