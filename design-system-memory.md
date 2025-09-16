# Design System Memory - Clean & Modern Principles

## Core Design Philosophy

**Apple-Inspired Aesthetic**: Clean, modern, minimal design that prioritizes content and user experience over decorative elements.

## Key Design Principles

### 1. Minimal Border Usage
- **Avoid excessive borders** that create a "90's website" feel
- Use subtle shadows, background color changes, or spacing to delineate sections
- When borders are necessary, use thin (1px), light colors with low opacity
- Prefer `border-radius` for soft, modern edges over sharp rectangular boxes

### 2. Restrained Icon Usage
- **Icons should enhance, not overwhelm** the interface
- Use icons sparingly and purposefully
- Prioritize system icons and simple, consistent iconography
- Avoid decorative icons that don't provide functional value
- Consider text-only solutions where icons aren't essential

### 3. Strategic Spacing & Layout
- **Use padding/margin as primary visual separators**
- Implement generous whitespace between sections
- Follow consistent spacing scale (8px, 16px, 24px, 32px, 48px, 64px)
- Use padding to create visual hierarchy instead of borders
- Leverage grid systems and flexbox for clean alignment

### 4. Subtle Hover Effects
- **Minimal hover interactions** - just enough to provide feedback
- Avoid dramatic transformations, excessive scaling, or flashy animations
- Prefer subtle opacity changes (0.8-0.9), gentle scale (1.02-1.05), or smooth color transitions
- Use `transition-duration` of 150-300ms for smooth, not jarring effects
- Focus on purposeful interactions rather than decorative animations

## Implementation Guidelines

### Moneko Color System
**Always use Moneko's official color system from `src/styles/app.css`:**
```css
/* Primary semantic colors */
--color-foreground: text-foreground        /* Main text */
--color-primary: text-primary              /* Brand accent */
--color-muted-foreground: text-muted-foreground-color /* Secondary text */
--color-card: bg-card                      /* Card backgrounds */
--color-subtle-background: bg-subtle-background /* Light backgrounds */
--color-success: text-success              /* Success states */
--color-warning: text-warning              /* Warning states */
```

### Spacing System
```css
/* Consistent spacing scale - use Tailwind classes */
gap-4, p-4, m-4        /* 16px - tight spacing */
gap-6, p-6, m-6        /* 24px - comfortable spacing */
gap-8, p-8, m-8        /* 32px - generous spacing */
mt-12, mb-12           /* 48px - section separation */
mt-16, mb-16           /* 64px - major section separation */
mt-20, mb-20           /* 80px - page-level separation */
```

### Color & Contrast
- **Always use Moneko color system** - never hardcode colors
- Use `bg-subtle-background` for gentle section separation
- Use `text-muted-foreground-color` for secondary information
- Implement proper contrast ratios for accessibility
- Leverage alpha transparency for subtle layering effects
- Avoid high-contrast borders in favor of gentle color transitions

### Typography Hierarchy
- Use font-weight and font-size for visual hierarchy
- Implement consistent line-height and letter-spacing
- Prefer typography over decorative elements for content organization

### Component Design Patterns
- **Cards**: `bg-card shadow-sm hover:shadow-md` instead of borders
- **Buttons**: `transition-all duration-200 hover:shadow-sm` for subtle feedback
- **Forms**: Focus on input styling with minimal chrome
- **Navigation**: Clean, spacious layouts with clear active states
- **Tables**: `hover:bg-subtle-background/50` for row interactions
- **Badges**: Use `bg-primary text-primary-foreground` for highlights
- **Stats/Metrics**: `bg-subtle-background` containers with `text-primary` values

### Component Sourcing Strategy
**Always prefer established component libraries over custom implementations:**

1. **Primary Sources** (from `components.json` registries):
   - **shadcn/ui**: Core UI components (buttons, cards, forms, navigation)
   - **@magicui**: Advanced animations and effects (shimmer buttons, magic cards, text effects)
   - **@originui**: Modern UI patterns and layouts
   - **@aceternity**: Sophisticated interactive components

2. **Installation Process**:
   ```bash
   # Example installations
   npx shadcn@latest add button card badge
   npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
   npx shadcn@latest add "https://originui.com/r/{component}.json"
   npx shadcn@latest add "https://ui.aceternity.com/registry/{component}.json"
   ```

3. **Decision Hierarchy**:
   - ✅ **First**: Search all available registries for suitable components
   - ✅ **Second**: Modify existing components to fit design system
   - ❌ **Last Resort**: Create custom components only when no alternatives exist

4. **Quality Standards**:
   - All components must follow Moneko color system
   - Maintain accessibility standards (WCAG 2.1 AA)
   - Apply consistent spacing and typography
   - Implement subtle hover effects (200ms transitions)

## Modern Web Aesthetics

### Layout Principles
- Embrace whitespace as a design element
- Use asymmetrical layouts for visual interest
- Implement responsive design with mobile-first approach
- Create clear content hierarchy through spacing and typography

### Interactive Elements
- Subtle feedback for user actions
- Smooth, purposeful animations
- Clear focus states for accessibility
- Consistent interaction patterns across the application

### Visual Consistency
- Maintain consistent component styling
- Use a unified color palette
- Implement systematic approach to shadows and elevation
- Ensure consistent iconography style and sizing

## Anti-Patterns to Avoid

### ❌ Excessive Visual Noise
- Multiple border colors and styles
- Overuse of drop shadows
- Busy background patterns
- Too many competing visual elements

### ❌ Heavy-Handed Interactions
- Dramatic hover animations
- Excessive button styling
- Overuse of gradients and effects
- Inconsistent interaction feedback

### ❌ Poor Space Management
- Cramped layouts with insufficient padding
- Inconsistent spacing between elements
- Over-reliance on borders for separation
- Lack of visual breathing room

## Success Metrics

### User Experience Indicators
- Clean, uncluttered interface appearance
- Intuitive navigation and content hierarchy
- Fast visual processing of interface elements
- Professional, trustworthy aesthetic impression

### Technical Implementation
- Consistent application of Moneko color system
- Minimal use of border declarations in CSS
- Strategic icon placement and sizing
- Smooth, subtle animation implementations (200ms transitions)
- Proper use of `bg-subtle-background` for section separation

## Real-World Examples

### Pricing Page Implementation
**✅ Success Case Study**: Updated pricing page components demonstrate proper application of design principles:

**Before**: Heavy gradients, excessive shadows, hardcoded colors, visual noise
```css
/* ❌ Old approach */
bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600
shadow-lg border-primary scale-105
text-gray-700 dark:text-gray-300
```

**After**: Clean, purposeful styling with Moneko color system
```css
/* ✅ New approach */
bg-card shadow-sm hover:shadow-md
text-foreground text-muted-foreground-color
bg-subtle-background transition-all duration-200
```

### Component Modernization Patterns
- **Cards**: Replaced heavy borders with `bg-card` and subtle shadows
- **Typography**: Eliminated gradients, used semantic color classes
- **Spacing**: Increased whitespace with consistent scale (gap-6, gap-8, mt-20)
- **Interactions**: Subtle hover effects with 200ms transitions
- **Colors**: 100% compliance with Moneko color system variables

### Available Component Libraries
**Leverage these registered component libraries in priority order:**

1. **shadcn/ui (Core)**: Base components like Button, Card, Badge, Accordion, Table
2. **Magic UI (@magicui)**: Advanced effects - ShimmerButton, RainbowButton, BorderBeam, AnimatedList
3. **Origin UI (@originui)**: Modern patterns and layouts
4. **Aceternity UI (@aceternity)**: Sophisticated interactive components

**Installation Examples**:
```bash
# Core shadcn components
npx shadcn@latest add button card badge accordion

# Magic UI effects for pricing/marketing pages
npx shadcn@latest add "https://magicui.design/r/shimmer-button.json"
npx shadcn@latest add "https://magicui.design/r/animated-subscribe-button.json"
npx shadcn@latest add "https://magicui.design/r/number-ticker.json"
```

**Component Adaptation Checklist**:
- ✅ Replace hardcoded colors with Moneko color system
- ✅ Adjust spacing to match design system scale
- ✅ Apply 200ms transition timing
- ✅ Ensure accessibility compliance
- ✅ Test dark/light mode compatibility

---

**Remember**: Good design is as little design as possible. Focus on content, maintain consistency, and let functionality guide aesthetic decisions.