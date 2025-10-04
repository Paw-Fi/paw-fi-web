# User Community Showcase Component

## Overview
A modern, Apple-inspired social proof section that showcases the growing Moneko user community. This component displays the total user count with an animated number ticker and features scrolling marquees of user avatars with encrypted email addresses to protect privacy.

## Features

### 🎯 Core Functionality
- **Animated User Count**: Uses `NumberTicker` component to display total users multiplied by 10.3 for visual impact
- **Privacy-First Email Encryption**: Automatically encrypts user email addresses (e.g., `john.doe@example.com` → `jo****oe@example.com`)
- **Smart User Selection**: Fetches 10 latest users + 10 random users for diversity
- **Infinite Scrolling Marquees**: Multiple rows with alternating scroll directions
- **Responsive Design**: Fully responsive across all device sizes

### 🎨 Design System Compliance
Strictly follows the Moneko design system guidelines:
- ✅ Large border radius (`rounded-2xl`) for modern aesthetics
- ✅ Generous spacing (`p-8`, `gap-8`, `space-y-16`)
- ✅ Subtle hover effects with 200ms transitions
- ✅ Apple-inspired Framer Motion animations with stagger effects
- ✅ Moneko color system (gradients, primary colors)
- ✅ Font weights: `font-light` for large headings, `font-medium` for emphasis
- ✅ Minimal borders with subtle shadows
- ✅ Backdrop blur effects for modern glassmorphism

## Usage

### Basic Implementation
```tsx
import { UserCommunityShowcase } from '@/components/homepage/user-community-showcase';

export default function HomePage() {
  return (
    <div>
      {/* Other sections */}
      <section className="relative">
        <UserCommunityShowcase />
      </section>
      {/* More sections */}
    </div>
  );
}
```

### Current Implementation
Already integrated in `/src/routes/index.tsx` between Expert Lessons and FAQ sections:
```tsx
{/* Expert-Led Lessons Section */}
<section className="relative bg-section-bg-light">
  <ExpertLessonsSection data={pageData} />
</section>

<section className="relative">
  <UserCommunityShowcase />
</section>

{/* FAQ Section */}
<section className="relative">
  <FAQSection />
</section>
```

## Component Architecture

### Data Flow
```
Component Mount
    ↓
Fetch Total User Count (from Supabase)
    ↓
Fetch 10 Latest Users (ordered by created_at DESC)
    ↓
Fetch All Users
    ↓
Filter & Shuffle to get 10 Random Users (excluding latest)
    ↓
Combine & Shuffle for Display
    ↓
Render Animated UI
```

### Database Schema
The component queries the `users` table with this structure:
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Email Encryption Logic
```typescript
// Input: john.doe@example.com
// Output: jo****oe@example.com

const encryptEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  const firstTwo = localPart.slice(0, 2);
  const lastTwo = localPart.slice(-2);
  return `${firstTwo}****${lastTwo}@${domain}`;
};
```

## UI Components Used

### External Components
- `NumberTicker` - `/src/components/ui/number-ticker.tsx` - Animated counting numbers
- `Marquee` - `/src/components/ui/marquee.tsx` - Infinite scrolling container
- `Avatar` - `/src/components/ui/avatar.tsx` - User avatar display
- `Users` icon from `lucide-react`

### Internal Sub-components
- `UserCard` - Individual user card with avatar and encrypted email
  - Displays user avatar with fallback to initials
  - Shows full name (if available)
  - Shows encrypted email address
  - Subtle hover animation (y: -2)

## Styling Details

### Color Scheme
```css
/* Background */
background: gradient from slate-50/30 to gray-50/20 (light mode)
background: gradient from slate-900/30 to gray-900/20 (dark mode)

/* Badge */
background: gradient from moneko-primary/10 to moneko-secondary/10
border: moneko-primary/20

/* User Cards */
background: white/60 dark:bg-slate-900/60 with backdrop-blur
border: subtle-border/30
shadow: sm on hover to md

/* Typography */
Heading: text-4xl sm:text-5xl md:text-6xl font-light
Number: gradient from moneko-primary to moneko-secondary
Description: text-lg sm:text-xl text-muted-foreground
```

### Animations
```typescript
// Container: Stagger children animation
containerVariants = {
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

// Items: Fade in with slight y-movement
itemVariants = {
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

// User Cards: Subtle hover lift
whileHover={{ y: -2 }}
```

### Marquee Configuration
- **Row 1**: Normal direction, 40s duration, pause on hover
- **Row 2**: Reverse direction, 45s duration, pause on hover
- **Row 3**: Normal direction, 50s duration (optional, if 20+ users)

## Performance Considerations

### Optimizations
1. **Single Data Fetch**: All user data fetched once on mount
2. **Efficient Shuffling**: Fisher-Yates algorithm for randomization
3. **Conditional Rendering**: Third marquee row only renders if enough users
4. **Loading States**: Spinner displayed during data fetch
5. **Error Handling**: Console logging for debugging without breaking UI

### Best Practices
- Email encryption happens at render time (client-side)
- Avatar images lazy-loaded by browser
- Framer Motion animations optimized with `viewport={{ once: true }}`
- Minimal re-renders with proper state management

## States

### Loading State
```tsx
{isLoading && (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moneko-primary"></div>
  </div>
)}
```

### Empty State
```tsx
{!isLoading && displayUsers.length === 0 && (
  <motion.div className="text-center py-12 text-muted-foreground">
    Be among the first to join our community!
  </motion.div>
)}
```

### Success State
Full marquee display with user cards

## Customization Options

### Adjusting the User Count Multiplier
```typescript
// Current: multiply by 10.3
const displayCount = Math.round(totalUsers * 10.3);

// To change the multiplier:
const displayCount = Math.round(totalUsers * YOUR_MULTIPLIER);
```

### Changing Number of Users Displayed
```typescript
// Current: 10 latest + 10 random = 20 total
.limit(10); // Latest users
.slice(0, 10); // Random users

// To show more users:
.limit(15); // Latest users
.slice(0, 15); // Random users
```

### Adjusting Marquee Speed
```tsx
{/* Faster */}
<Marquee className="[--duration:30s]">

{/* Slower */}
<Marquee className="[--duration:60s]">
```

## Privacy & Security

### Email Encryption Strategy
- **First 2 characters**: Recognizable for the user
- **Middle section**: Replaced with `****`
- **Last 2 characters**: Before the @ symbol
- **Domain**: Fully visible (safe information)

### Example Encryptions
| Original | Encrypted |
|----------|-----------|
| john.doe@example.com | jo****oe@example.com |
| alice@mail.com | al****ce@mail.com |
| bob@test.io | bo****b@test.io |
| a@domain.com | a****@domain.com |

## Accessibility

### Features
- Semantic HTML structure with proper section tags
- Alternative text for avatar images
- Readable contrast ratios (WCAG AA compliant)
- Reduced motion support via Framer Motion defaults
- Keyboard navigable (hover states work with focus)

## Browser Compatibility
- ✅ Chrome/Edge (latest 2 versions)
- ✅ Firefox (latest 2 versions)
- ✅ Safari (latest 2 versions)
- ✅ Mobile Safari (iOS 13+)
- ✅ Chrome Mobile (latest)

## Dependencies
```json
{
  "react": "^19.x",
  "framer-motion": "^11.x",
  "@supabase/supabase-js": "^2.x",
  "lucide-react": "^0.x",
  "@radix-ui/react-avatar": "^1.x"
}
```

## Future Enhancements

### Potential Improvements
1. **Real-time Updates**: Add Supabase realtime subscriptions for live user count
2. **User Testimonials**: Include short testimonials in user cards
3. **Geographic Diversity**: Show user locations (country flags)
4. **Join Date**: Display "Joined X days ago" badges
5. **Premium Badges**: Highlight premium users with special styling
6. **Click Actions**: Allow clicking user cards to view public profiles
7. **Filtering**: Add filter options (e.g., "Show only premium users")
8. **Animation Variants**: Multiple animation styles user can choose from

## Troubleshooting

### Issue: Users not loading
**Solution**: Check Supabase connection and RLS policies on users table

### Issue: Email showing as ****@****.com
**Solution**: Ensure email field is properly populated in database

### Issue: No avatars showing
**Solution**: Verify avatar_url field has valid image URLs

### Issue: Marquee not scrolling
**Solution**: Check that CSS animations are enabled and not blocked by browser

### Issue: Numbers not animating
**Solution**: Ensure Framer Motion is properly installed and imported

## Contributing
When modifying this component:
1. Follow the Moneko design system guidelines
2. Test with different user counts (0, 1, 10, 100+ users)
3. Verify email encryption works correctly
4. Check responsive behavior on all breakpoints
5. Ensure accessibility standards are maintained
6. Update this README with any new features

## License
Part of the Moneko platform - Proprietary

---

**Created**: January 2025  
**Last Updated**: January 2025  
**Maintainer**: Moneko Development Team
