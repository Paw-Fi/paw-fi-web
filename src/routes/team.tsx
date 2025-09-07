import { HomeHeader } from "@/components/index/header";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faTwitter } from "@fortawesome/free-brands-svg-icons";
import Sabina from "@assets/images/team/sabina.jpeg"
import Yifan from "@assets/images/team/yifan.jpg"
import { seo } from "@/utils/seo";
import { getCanonicalUrl } from "@/utils/canonical";


export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => {
    const pageUrl = getCanonicalUrl("/team");
    const title = "Our Team | Moneko - Meet the Financial Education Experts";
    const description = "Meet the passionate team of experts at Moneko, dedicated to improving financial literacy for everyone through AI-powered tools and educational content.";
    const keywords = "Moneko team, financial education experts, personal finance, AI finance, financial literacy, founders, engineers, designers";
    const imageUrl = "https://moneko.io/og-img.png"; // Generic OG image

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
          "name": "Moneko",
          "url": "https://moneko.io",
          "logo": "https://moneko.io/icon.svg",
          "sameAs": [
            "https://www.facebook.com/monekoai/",
            "https://x.com/moneko_ai",
            "https://www.instagram.com/moneko_ai/"
          ]
        },
        {
          "@type": "WebPage",
          "name": title,
          "description": description,
          "url": pageUrl,
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://moneko.io"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Our Team",
                "item": pageUrl
              }
            ]
          }
        },
        ...teamMembers.map(member => ({
          "@type": "Person",
          "name": member.name.split(' – ')[0], // Extract name only
          "jobTitle": member.role,
          "image": `https://moneko.io${member.imageUrl}`, // Assuming image URLs are relative
          "sameAs": [
            member.social.linkedin,
            member.social.twitter
          ].filter(Boolean) // Filter out empty strings
        }))
      ]
    };

    return {
      meta,
      link: [
        {
          rel: "canonical",
          href: pageUrl,
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

const teamMembers = [
  {
    name: "Sabina Shao – CEO",
    role: "Design Lead & Brand",
    imageUrl: Sabina,
    social: {
      linkedin: "",
      twitter: "",
    },
    bio: "Product designer and founder with 8+ years building fintech and marketing tools. Led UX and design of consumer-first tools across fintech and marketing. Combines creative execution with business clarity to build products that resonate and scale.",
  },
  { 
    name: "Yifan Lim –CTO",
    role: "Full-stack Engineer",
    imageUrl: Yifan,
    social: {
      linkedin: "",
      twitter: "",
    },
    bio: "Full-stack engineer and startup builder. Co-founded multiple Web3 products including a DePin marketplace and NFT platform. Led ERP development at Intact and built scalable platforms across mobile, web, and blockchain.",
  },
];

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

function TeamPage() {
  return (
    <AmbientHaloLayout>
      <HomeHeader />

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-2">
        <motion.div
          className="mb-16 text-center"
          initial="hidden"
          animate="visible"
          variants={itemVariants}
        >
          <h1 className="mb-4 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl dark:from-purple-400 dark:via-pink-400 dark:to-indigo-400">
            Meet Our Team
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-slate-600 md:text-xl dark:text-slate-300">
            The passionate experts behind Moneko dedicated to improving financial
            literacy for everyone.
          </p>
        </motion.div>

        <motion.div
          className="mx-auto flex justify-center gap-6 flex-wrap max-w-5xl flex-col lg:flex-row"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              variants={cardVariants}
              className="group flex-1 overflow-hidden rounded-3xl border border-white/20 bg-white/50 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/50"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={member.imageUrl}
                  alt={`${member.name}, ${member.role} at Moneko`}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex space-x-3">
                    {member.social.linkedin && (
                      <a
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/20 p-2 backdrop-blur-md transition-colors duration-300 hover:bg-purple-600"
                        aria-label={`${member.name}'s LinkedIn profile`}
                      >
                        <FontAwesomeIcon icon={faLinkedin} className="text-lg text-white" />
                      </a>
                    )}
                    {member.social.twitter && (
                      <a
                        href={member.social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/20 p-2 backdrop-blur-md transition-colors duration-300 hover:bg-purple-600"
                        aria-label={`${member.name}'s Twitter profile`}
                      >
                        <FontAwesomeIcon icon={faTwitter} className="text-lg text-white" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="mb-1 text-lg font-bold transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {member.name}
                </h3>
                <p className="mb-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                  {member.role}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {member.bio}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </AmbientHaloLayout>
  );
}
