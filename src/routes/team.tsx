import { HomeHeader } from "@/components/index/header";
import { AmbientHaloLayout } from "@/layouts/ambient-halo-layout";
import { createFileRoute } from "@tanstack/react-router";
import { motion, Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faTwitter } from "@fortawesome/free-brands-svg-icons";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => ({
    title: "Our Team | Moneko",
    meta: [
      {
        name: "description",
        content:
          "Meet the passionate team of experts at Moneko, dedicated to improving financial literacy for everyone.",
      },
    ],
  }),
});

const teamMembers = [
  {
    name: "Whiskers von Cat",
    role: "Chief Executive Officer",
    imageUrl: "https://picsum.photos/400/400",
    social: {
      linkedin: "#",
      twitter: "#",
    },
    bio: "Whiskers von Cat is the Chief Executive Officer of Moneko. He has over 20 years of experience in the financial industry and is passionate about helping people improve their financial literacy.",
  },
  {
    name: "Pounce de Leon",
    role: "Chief Financial Officer",
    imageUrl: "https://picsum.photos/401/401",
    social: {
      linkedin: "#",
      twitter: "#",
    },
    bio: "Pounce de Leon is the Chief Financial Officer of Moneko. She has over 20 years of experience in the financial industry and is passionate about helping people improve their financial literacy.",
  },
  {
    name: "Clawdia Monet",
    role: "Chief Technology Officer",
    imageUrl: "https://picsum.photos/402/402",
    social: {
      linkedin: "#",
      twitter: "#",
    },
    bio: "Clawdia Monet is the Chief Technology Officer of Moneko. She has over 20 years of experience in the financial industry and is passionate about helping people improve their financial literacy.",
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
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={pageVariants}
          initial="hidden"
          animate="visible"
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              variants={cardVariants}
              className="group overflow-hidden rounded-3xl border border-white/20 bg-white/50 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-700/50 dark:bg-slate-900/50"
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={member.imageUrl}
                  alt={`${member.name}, ${member.role} at Moneko`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex space-x-4">
                    {member.social.linkedin && (
                      <a
                        href={member.social.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/20 p-3 backdrop-blur-md transition-colors duration-300 hover:bg-purple-600"
                        aria-label={`${member.name}'s LinkedIn profile`}
                      >
                        <FontAwesomeIcon icon={faLinkedin} className="text-xl text-white" />
                      </a>
                    )}
                    {member.social.twitter && (
                      <a
                        href={member.social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-white/20 p-3 backdrop-blur-md transition-colors duration-300 hover:bg-purple-600"
                        aria-label={`${member.name}'s Twitter profile`}
                      >
                        <FontAwesomeIcon icon={faTwitter} className="text-xl text-white" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="mb-1 text-xl font-bold transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  {member.name}
                </h3>
                <p className="mb-4 text-sm font-medium text-purple-600 dark:text-purple-400">
                  {member.role}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
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
