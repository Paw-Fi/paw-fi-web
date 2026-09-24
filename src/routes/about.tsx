"use client";

import { createFileRoute } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { HomeHeader } from "@/components/index/header";
import { Footer } from "@/components/homepage/footer";
import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const heroIllustration = "/images/about/1.png";
const captureIllustration = "/images/about/2.png";
const spacesIllustration = "/images/about/3.png";
const pocketsIllustration = "/images/about/4.png";
const companionIllustration = "/images/about/5.png";
const monekoBlink = "/images/about/moneko-blink.gif";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/about");
    const title = "About Moneko AI | Our Story, Mission & Team";
    const description =
      "Moneko AI started from a simple question: what if managing money required less managing? Learn about our story, Moneko Spaces, Pockets, and the team behind the AI budgeting app.";
    const keywords =
      "about moneko, moneko ai, moneko team, AI budgeting app story, moneko spaces, moneko pockets, personal finance app, budgeting app company";
    const imageUrl = "https://moneko.io/og-img.png";

    const meta = seo({
      title,
      description,
      keywords,
      image: imageUrl,
      url: pageUrl,
    });

    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://moneko.io/#organization",
          name: "Moneko",
          url: "https://moneko.io",
          logo: "https://moneko.io/icon.svg",
        },
        {
          "@type": "WebSite",
          "@id": "https://moneko.io/#website",
          name: "Moneko",
          url: "https://moneko.io",
          publisher: { "@id": "https://moneko.io/#organization" },
        },
        {
          "@type": "AboutPage",
          "@id": pageUrl,
          url: pageUrl,
          name: title,
          description: description,
          isPartOf: { "@id": "https://moneko.io/#website" },
          about: { "@id": "https://moneko.io/#organization" },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://moneko.io",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "About",
                item: pageUrl,
              },
            ],
          },
          inLanguage: "en-US",
          primaryImageOfPage: imageUrl,
        },
        ...teamMembers.map((member) => ({
          "@type": "Person",
          name: member.name,
          jobTitle: member.role,
          worksFor: { "@id": "https://moneko.io/#organization" },
        })),
      ],
    };

    return {
      meta,
      links: [
        {
          rel: "canonical",
          href: pageUrl,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
});

const everydayQuestions = [
  "Why did I spend more this month?",
  "Can I afford a more expensive apartment?",
  "What happens if I save another $300 every month?",
];

const teamMembers = [
  {
    name: "Alex Zhang",
    role: "Finance & Operations",
    imageUrl: "/images/about/profile-alex.png",
    bio: "Advises on finance, accounting, and operations, helping ensure Moneko\u2019s financial tools are practical, accurate, and grounded in real-world money management.",
  },
  {
    name: "Sabina Shao",
    role: "Product Design & Brand",
    imageUrl: "/images/about/profile-sabina.png",
    bio: "Leads Moneko\u2019s product vision, user experience, and brand, with a focus on making budgeting, expense tracking, and shared finances simple and intuitive.",
  },
  {
    name: "Yifan Lim",
    role: "Engineering & AI",
    imageUrl: "/images/about/profile-yifan.png",
    bio: "Leads Moneko\u2019s engineering, technical architecture, and AI development, building the systems behind automated expense tracking, financial insights, and a reliable experience across the product.",
  },
];

function AboutPage() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <AmbientHaloLayout>
      <HomeHeader />

      <main className="min-h-screen pb-20">
        {/* Hero */}
        <section className="relative mx-auto max-w-4xl px-4 pt-24 pb-16 text-center md:pt-36 md:pb-24">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col items-center"
          >          
            <motion.h1
              variants={itemVariants}
              className="text-foreground mb-8 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Money is already complicated.{" "}
              <span className="from-primary bg-linear-to-r to-purple-600 bg-clip-text text-transparent">
                Managing it shouldn&rsquo;t be.
              </span>
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="mb-10 w-full max-w-3xl"
            >
              <img
                src={heroIllustration}
                alt="A person relaxing with coffee while the Moneko app and its black cat mascot automatically sort receipts, cards, and coins into budget categories"
                className="border-border/40 w-full rounded-3xl border shadow-lg"
                width={1536}
                height={645}
              />
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="text-muted-foreground max-w-3xl space-y-5 text-left text-base leading-relaxed sm:text-lg md:text-center"
            >
              <p>
                Moneko AI started from a frustration we had ourselves. We wanted
                to be more intentional with money, but most budgeting apps
                seemed to require a surprising amount of work just to keep them
                useful. You had to remember to log transactions, fix categories,
                update budgets, check spreadsheets, and, if you were sharing
                expenses with someone, remember who paid for what and figure out
                who owed whom.
              </p>
              <p>
                We would start with good intentions, keep everything organized
                for a while, and eventually fall behind. The problem
                wasn&rsquo;t that we didn&rsquo;t care about our finances. We
                just didn&rsquo;t want managing money to become another task we
                had to think about every day.
              </p>
            </motion.div>

            {/* Pull-quote card */}
            <motion.div
              variants={itemVariants}
              className="border-border/50 bg-card/60 mt-14 w-full max-w-2xl rounded-3xl border p-8 shadow-xl backdrop-blur-md md:p-10"
            >
              <p className="text-muted-foreground mb-4 text-sm font-medium">
                That led to a simple question:
              </p>
              <p className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                &ldquo;What if managing money required{" "}
                <span className="from-primary bg-linear-to-r to-purple-600 bg-clip-text text-transparent">
                  less managing?
                </span>
                &rdquo;
              </p>
              <p className="text-muted-foreground mt-4 text-sm font-semibold tracking-widest uppercase">
                That&rsquo;s where Moneko began.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Chapter: Something we'd actually use */}
        <StorySection
          variants={containerVariants}
          itemVariants={itemVariants}
          title="We wanted to build something we&rsquo;d actually use"
        >
          <p>
            From the beginning, we didn&rsquo;t want Moneko to be another
            expense tracker where all the work still falls on you. We wanted
            tracking money to fit naturally into things you already do, whether
            that&rsquo;s sending a message, taking a photo of a receipt,
            speaking an expense out loud, or simply making a purchase.
          </p>
          <p>
            Today, you can use Moneko to track expenses through text, voice,
            receipts, selected Android notifications, iOS 27 Shortcuts
            notification automations, WhatsApp, Telegram, and connected bank
            accounts. AI helps organize that information so you spend less time
            entering and cleaning up data and more time actually understanding
            where your money is going.
          </p>

          <motion.div
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl"
          >
            <img
              src={captureIllustration}
              alt="Expenses flowing into Moneko from a receipt, voice note, bank card, chat message, WhatsApp, Telegram, and selected app notifications"
              className="border-border/40 w-full rounded-3xl border shadow-lg"
              loading="lazy"
              width={1536}
              height={861}
            />
          </motion.div>

          <p>
            We also wanted Moneko to work for the messy reality of managing
            money with other people. Couples don&rsquo;t all combine their
            finances in the same way. Some split everything equally, some
            contribute based on income, and others share household expenses
            while keeping the rest of their money separate. The same is true for
            families, roommates, and friends traveling together.
          </p>

          <FeatureHighlight
            variants={itemVariants}
            image={spacesIllustration}
            imageAlt="Two people adding coins to a shared Moneko Space containing a house and groceries, while each keeps a personal wallet"
            title="Moneko Spaces"
          >
            That&rsquo;s why we built Moneko Spaces. You can create a shared
            space for a couple, household, family, trip, or group, manage
            expenses and budgets together, and still keep your personal finances
            separate. We think managing money together should be flexible enough
            to reflect how your relationship actually works, rather than forcing
            you into one system.
          </FeatureHighlight>
        </StorySection>

        {/* Chapter: Budgeting without making your life about budgeting */}
        <StorySection
          variants={containerVariants}
          itemVariants={itemVariants}
          title="Budgeting without making your life about budgeting"
        >
          <p>
            We like the idea behind zero-based and envelope budgeting: give your
            money a purpose before it disappears. But we also wanted to make
            that idea easier to use in everyday life.
          </p>

          <FeatureHighlight
            variants={itemVariants}
            image={pocketsIllustration}
            imageAlt="The Moneko cat dropping a coin into colorful budget pockets for mortgage, restaurants, travel, and savings"
            title="Moneko Pockets"
          >
            Moneko Pockets let you set money aside for things like groceries,
            rent, eating out, travel, or a bigger goal you&rsquo;re working
            toward. You can see what you planned to spend, what you&rsquo;ve
            already used, and what&rsquo;s still available without maintaining a
            complicated spreadsheet or constantly doing the math yourself.
          </FeatureHighlight>

          <p>
            Over time, we realized that simply showing people what they spent
            wasn&rsquo;t enough. Most of us don&rsquo;t really want more
            financial charts. We want answers to everyday questions like:
          </p>

          <motion.div
            variants={itemVariants}
            className="mx-auto mt-2 grid max-w-2xl items-center gap-6 sm:grid-cols-2"
          >
            <div className="flex flex-col items-end gap-3">
              {everydayQuestions.map((question, index) => (
                <div
                  key={question}
                  className={cn(
                    "bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm font-medium shadow-md sm:text-base",
                    index === 1 && "sm:mr-8",
                    index === 2 && "sm:mr-16",
                  )}
                >
                  &ldquo;{question}&rdquo;
                </div>
              ))}
            </div>
            <img
              src={companionIllustration}
              alt="The Moneko cat sleeping on top of a phone showing an AI chat answering a money question with a spending chart"
              className="border-border/40 w-full rounded-3xl border shadow-lg"
              loading="lazy"
            />
          </motion.div>

          <p>
            That&rsquo;s the bigger direction we&rsquo;re building toward with
            Moneko. We want it to become an AI money companion that understands
            your financial picture and helps you explore questions and scenarios
            using your own data. The goal isn&rsquo;t to make financial
            decisions for you, but to make it easier to understand your options
            before you make them.
          </p>
        </StorySection>

        {/* Chapter: Why the name */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={containerVariants}
            className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
          >
            <motion.div
              variants={itemVariants}
              className="border-border/50 from-primary/15 relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border bg-linear-to-br via-purple-500/10 to-transparent p-10 text-center shadow-xl"
            >
              <img
                src={monekoBlink}
                alt="Moneko, the little black cat mascot, blinking"
                className="border-border/40 mb-6 h-36 w-36 rounded-3xl border object-cover shadow-lg"
                loading="lazy"
              />
              <div className="text-foreground flex flex-wrap items-center justify-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                <span>money</span>
                <span className="text-muted-foreground font-normal">+</span>
                <span>neko</span>
                <span className="text-muted-foreground font-normal">=</span>
                <span className="from-primary bg-linear-to-r to-purple-600 bg-clip-text text-transparent">
                  moneko
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                neko &mdash; Japanese for cat
              </p>
            </motion.div>

            <div>
              <motion.h2
                variants={itemVariants}
                className="text-foreground mb-6 text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Why the name Moneko?
              </motion.h2>
              <motion.div
                variants={itemVariants}
                className="text-muted-foreground space-y-5 text-base leading-relaxed sm:text-lg"
              >
                <p>
                  Moneko comes from <strong className="text-foreground">money + neko</strong>,
                  the Japanese word for cat, which is also where our little
                  black cat comes from.
                </p>
                <p>
                  Money can be stressful and financial software often makes it
                  feel even more serious. We wanted Moneko to feel approachable,
                  a little playful, and easy to come back to. You shouldn&rsquo;t
                  need to be a finance expert or someone who loves spreadsheets
                  to feel in control of your money.
                </p>
                <p>
                  We&rsquo;re still a small team, and Moneko is still evolving.
                  Many of the things we&rsquo;ve built have come from
                  conversations with people using the app, including couples
                  figuring out how to manage money together, people searching
                  for a simpler budgeting system, and people who just want to
                  understand where their money goes without spending so much
                  time tracking it.
                </p>
                <p>
                  We&rsquo;re going to keep listening, experimenting, and
                  improving Moneko around those everyday problems. Our goal is
                  to build something useful enough to become part of your
                  financial life, without making managing money take over your
                  life.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Meet the team */}
        <section
          id="team"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:py-24"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={containerVariants}
          >
            <motion.div
              variants={itemVariants}
              className="mb-14 text-center"
            >
              <h2 className="text-foreground mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Meet the team
              </h2>
              <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed sm:text-lg">
                We&rsquo;re the small team behind Moneko, brought together by an
                interest in thoughtful design, useful AI, and making personal
                finance feel a little easier to deal with.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <motion.div
                  key={member.name}
                  variants={itemVariants}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  className="group border-border/50 bg-card/70 rounded-3xl border p-8 text-center shadow-lg backdrop-blur-md transition-shadow duration-300 hover:shadow-xl"
                >
                  <img
                    src={member.imageUrl}
                    alt={`${member.name}, ${member.role} at Moneko`}
                    className="border-border/40 mx-auto mb-6 aspect-4/5 w-full max-w-52 rounded-2xl border object-cover object-top shadow-md"
                    loading="lazy"
                  />
                  <h3 className="text-foreground text-xl font-bold">
                    {member.name}
                  </h3>
                  <p className="text-primary mt-1 mb-4 text-sm font-semibold">
                    {member.role}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {member.bio}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-3xl px-4 pt-8 pb-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="border-border/50 bg-card/70 rounded-3xl border p-10 text-center shadow-xl backdrop-blur-md"
          >
            <motion.h2
              variants={itemVariants}
              className="text-foreground mb-4 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Try Moneko for yourself
            </motion.h2>
            <motion.p
              variants={itemVariants}
              className="text-muted-foreground mx-auto mb-8 max-w-xl text-base leading-relaxed sm:text-lg"
            >
              See how effortless money management can feel when the app does the
              organizing for you.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <AppleDownloadButton />
              <AndroidDownloadButton />
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </AmbientHaloLayout>
  );
}

interface StorySectionProps {
  title: string;
  variants: Variants;
  itemVariants: Variants;
  children: React.ReactNode;
}

function StorySection({
  title,
  variants,
  itemVariants,
  children,
}: StorySectionProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={variants}
      >
        <motion.h2
          variants={itemVariants}
          className="text-foreground mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {title}
        </motion.h2>
        <motion.div
          variants={itemVariants}
          className="text-muted-foreground space-y-6 text-base leading-relaxed sm:text-lg"
        >
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}

interface FeatureHighlightProps {
  image: string;
  imageAlt: string;
  title: string;
  variants: Variants;
  children: React.ReactNode;
}

function FeatureHighlight({
  image,
  imageAlt,
  title,
  variants,
  children,
}: FeatureHighlightProps) {
  return (
    <motion.div
      variants={variants}
      className="border-border/50 bg-card/70 mt-4 overflow-hidden rounded-3xl border shadow-lg backdrop-blur-md"
    >
      <img
        src={image}
        alt={imageAlt}
        className="w-full object-cover"
        loading="lazy"
      />
      <div className="p-6 sm:p-8">
        <h3 className="text-foreground mb-4 text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground text-base leading-relaxed">
          {children}
        </p>
      </div>
    </motion.div>
  );
}
