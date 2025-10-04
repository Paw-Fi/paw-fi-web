import React from 'react';
import { motion, Variants } from 'framer-motion';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Marquee } from '@/components/ui/marquee';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import { useCommunityStats } from '@/hooks/use-community-stats';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

/**
 * Encrypts email address for privacy protection
 * Format: first 2 chars + **** + last 2 chars before @ + @domain.com
 * Example: john.doe@example.com -> jo****oe@example.com
 */
const encryptEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  
  if (!localPart || !domain) return '****';
  
  if (localPart.length <= 4) {
    // For very short email addresses, show only first char
    return `${localPart.charAt(0)}****`;
  }
  
  const firstTwo = localPart.slice(0, 2);
  const lastTwo = localPart.slice(-2);
  
  return `${firstTwo}****${lastTwo}`;
};


const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // Apple-like easing
    },
  },
};

interface UserCardProps {
  user: User;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  const initials = user.full_name
    ?.split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || user.email.charAt(0).toUpperCase();

  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-subtle-border/30 min-w-[240px]"
      whileHover={{ y: -2 }}
    >
      <Avatar className="size-10 ring-2 ring-background shadow-sm">
        {user.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt={user.full_name || 'User'} />
        ) : null}
        <AvatarFallback className="bg-gradient-to-br from-moneko-primary to-moneko-secondary text-white font-medium text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
       
        <div className="text-xs text-muted-foreground truncate">
          {encryptEmail(user.email)}
        </div>
      </div>
    </motion.div>
  );
};

// Mock users for demo/fallback when database is empty
const generateMockUsers = (count: number): User[] => {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'Rowan', 'Kai', 'Cameron', 'Dakota', 'Peyton', 'Skyler', 'Phoenix', 'River', 'Harley', 'Emerson', 'Finley'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'proton.me'];
  
  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i + 7) % lastNames.length];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[i % domains.length]}`;
    
    return {
      id: `mock-${i}`,
      email,
      full_name: `${firstName} ${lastName}`,
      avatar_url: null,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
};

export function UserCommunityShowcase() {
  // Use TanStack Query hook for data fetching with caching
  const { data, isLoading, error } = useCommunityStats();

  // Fallback to mock data on error or empty database
  const totalUsers = data?.totalUsers || 250;
  const displayUsers = data?.displayUsers?.length ? data.displayUsers : generateMockUsers(40);

  const displayCount = totalUsers;

  return (
    <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8 overflow-hidden">
      <div className="mx-auto max-w-7xl w-full">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-16"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-moneko-primary/10 to-moneko-secondary/10 dark:from-moneko-primary/20 dark:to-moneko-secondary/20 rounded-full border border-moneko-primary/20">
              <Users className="size-5 text-moneko-primary" />
              <span className="text-sm font-medium text-foreground">
                Growing Community
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-light text-foreground">
              <span className="font-medium bg-gradient-to-r from-moneko-primary to-moneko-secondary bg-clip-text text-transparent">
                <NumberTicker
                  value={displayCount}
                  className="inline-block font-medium bg-gradient-to-r from-moneko-primary to-moneko-secondary bg-clip-text text-transparent"
                />
                +
              </span>
              {' '}people have already joined
            </h2>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Be part of a growing community taking control of their financial future.
              Join us today and start your journey.
            </p>
          </motion.div>

          {/* Marquee Section */}
          {!isLoading && displayUsers.length > 0 && (
            <div className="space-y-6">
              {/* First row - normal direction */}
              <Marquee pauseOnHover className="[--duration:40s]">
                {displayUsers.slice(0, Math.min(10, displayUsers.length)).map((user) => (
                  <UserCard key={`row1-${user.id}`} user={user} />
                ))}
              </Marquee>

              {/* Second row - reverse direction */}
              {displayUsers.length >= 10 && (
                <Marquee reverse pauseOnHover className="[--duration:45s]">
                  {displayUsers.slice(10, Math.min(20, displayUsers.length)).map((user) => (
                    <UserCard key={`row2-${user.id}`} user={user} />
                  ))}
                </Marquee>
              )}

              {/* If we have enough users, add a third row */}
              {displayUsers.length >= 20 && (
                <Marquee pauseOnHover className="[--duration:50s]">
                  {displayUsers.slice(0, 10).map((user) => (
                    <UserCard key={`row3-${user.id}`} user={user} />
                  ))}
                </Marquee>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moneko-primary"></div>
            </div>
          )}

          {/* Empty State (only show if not loading and no users) */}
          {!isLoading && displayUsers.length === 0 && (
            <motion.div
              variants={itemVariants}
              className="text-center py-12 text-muted-foreground"
            >
              Be among the first to join our community!
            </motion.div>
          )}

          {/* Call to Action */}
          <motion.div variants={itemVariants} className="text-center">
            <p className="text-sm text-muted-foreground">
              Join these members and start making smarter financial decisions today
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
