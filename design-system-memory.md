# Design System Memory - Clean & Modern Principles

## Core Design Philosophy

**Apple-Inspired Aesthetic**: Clean, modern, minimal design that prioritizes content and user experience over decorative elements.

## Key Design Principles

### 1. Minimal Border Usage
- **Avoid excessive borders** that create a "90's website" feel
- Use subtle shadows, background color changes, or spacing to delineate sections
- When borders are necessary, use thin (1px), light colors with low opacity
- Prefer `border-radius` for soft, modern edges over sharp rectangular boxes
- **Large border radius (rounded-2xl, rounded-3xl)** for main containers and cards

### 2. Restrained Icon Usage
- **Icons should enhance, not overwhelm** the interface
- Use icons sparingly and purposefully
- Prioritize system icons and simple, consistent iconography (Lucide React preferred)
- Avoid decorative icons that don't provide functional value
- Consider text-only solutions where icons aren't essential
- **Icon sizing**: h-12 w-12 for large feature icons, h-5 w-5 for inline icons

### 3. Strategic Spacing & Layout
- **Use padding/margin as primary visual separators**
- Implement generous whitespace between sections
- Follow consistent spacing scale (8px, 16px, 24px, 32px, 48px, 64px)
- Use padding to create visual hierarchy instead of borders
- Leverage grid systems and flexbox for clean alignment
- **Large padding (p-8)** for main content areas
- **Generous margins (mb-16, space-y-8)** between major sections

### 4. Subtle Hover Effects & Animations
- **Minimal hover interactions** - just enough to provide feedback
- Avoid dramatic transformations, excessive scaling, or flashy animations
- Prefer subtle opacity changes (0.8-0.9), gentle scale (1.02-1.05), or smooth color transitions
- Use `transition-duration` of 200ms for smooth, not jarring effects
- Focus on purposeful interactions rather than decorative animations
- **Framer Motion integration**: Use subtle stagger animations with Apple-like easing curves
- **Micro-interactions**: `whileHover={{ x: 4 }}` for list items, gentle scale for buttons

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
- **Cards**: `bg-background rounded-3xl p-8 shadow-sm hover:shadow-md` - large rounded corners with generous padding
- **Buttons**: `rounded-full` for primary actions, `transition-all duration-200` for subtle feedback
- **Forms**: Focus on input styling with minimal chrome
- **Navigation**: Clean, spacious layouts with clear active states
- **Tables**: `hover:bg-subtle-background/50` for row interactions
- **Badges**: Use `bg-primary text-primary-foreground` for highlights
- **Stats/Metrics**: Colored background containers with semantic meaning:
  - `bg-green-50/50 dark:bg-green-950/30` for positive metrics
  - `bg-blue-50/50 dark:bg-blue-950/30` for neutral metrics
  - `bg-purple-50/50 dark:bg-purple-950/30` for special metrics
  - `bg-amber-50/50 dark:bg-amber-950/30` for warning metrics
- **Typography**: `font-light` for large headings, `font-medium` for section titles
- **Progress Bars**: `h-2` height with `rounded-full` styling
- **Grid Layouts**: `grid-cols-1 lg:grid-cols-3 gap-8` for main dashboard layout

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
- Embrace whitespace as a design element with generous spacing
- **Large container approach**: Use `max-w-7xl mx-auto` for main content areas
- Implement responsive design with mobile-first approach
- Create clear content hierarchy through spacing and typography
- **Grid-based layouts**: Primary content in 2/3 columns, sidebar in 1/3 column
- **Consistent padding**: `px-0 sm:px-8 lg:px-8 py-8` for main containers

### Interactive Elements
- Subtle feedback for user actions with 200ms transitions
- **Framer Motion animations**: Stagger children with Apple-like easing `[0.25, 0.46, 0.45, 0.94]`
- Clear focus states for accessibility
- Consistent interaction patterns across the application
- **Micro-interactions**: Gentle hover translations and scale effects

### Visual Consistency
- Maintain consistent component styling with shadcn/ui components
- Use a unified color palette with semantic color backgrounds
- **Elevation system**: `shadow-sm` default, `hover:shadow-md` on interaction
- **Large rounded corners**: `rounded-2xl` and `rounded-3xl` throughout
- Ensure consistent iconography style and sizing (Lucide React icons)

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

### Dashboard Implementation
**✅ Success Case Study**: Main dashboard demonstrates proper application of design principles:

**Layout Structure**:
```tsx
/* ✅ Dashboard approach */
<div className="min-h-screen bg-background">
  <div className="max-w-7xl mx-auto px-0 sm:px-8 lg:px-8 py-8">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
      {/* Content cards */}
    </div>
  </div>
</div>
```

**Card Design Pattern**:
```tsx
/* ✅ Modern card styling */
<div className="bg-background rounded-3xl p-8">
  <div className="flex items-center justify-between mb-8">
    <div>
      <h2 className="text-2xl font-medium text-foreground mb-2">Section Title</h2>
      <p className="text-muted-foreground">Description text</p>
    </div>
    <Button variant="outline" size="sm" asChild className="rounded-full">
      <Link to="/path">Action</Link>
    </Button>
  </div>
  {/* Card content */}
</div>
```

**Metric Display Pattern**:
```tsx
/* ✅ Semantic color backgrounds for metrics */
<div className="bg-green-50/50 dark:bg-green-950/30 rounded-2xl p-6 text-center">
  <div className="text-3xl font-light text-foreground mb-2">
    $1,234
  </div>
  <div className="text-sm text-muted-foreground">Monthly Income</div>
</div>
```

### Component Modernization Patterns
- **Cards**: Large rounded corners (`rounded-3xl`) with generous padding (`p-8`)
- **Typography**: `font-light` for large numbers, `font-medium` for headings
- **Spacing**: Consistent large gaps (`gap-8`, `mb-16`, `space-y-8`)
- **Interactions**: Framer Motion with Apple-like easing and stagger animations
- **Colors**: Semantic color backgrounds with alpha transparency for metrics
- **Buttons**: `rounded-full` styling for primary actions

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
- ✅ Adjust spacing to match design system scale (`p-8`, `gap-8`, `mb-16`)
- ✅ Apply 200ms transition timing with subtle hover effects
- ✅ Use large rounded corners (`rounded-2xl`, `rounded-3xl`)
- ✅ Implement semantic color backgrounds for metrics and stats
- ✅ Apply `font-light` for large headings, `font-medium` for section titles
- ✅ Use `rounded-full` buttons for primary actions
- ✅ Integrate Framer Motion with Apple-like easing curves
- ✅ Ensure accessibility compliance
- ✅ Test dark/light mode compatibility

## Animation Guidelines

### Framer Motion Integration
**Use subtle, Apple-inspired animations throughout the interface:**

```tsx
/* ✅ Container animation with stagger */
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

/* ✅ Item animation with Apple easing */
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
```

### Micro-Interactions
- **List items**: `whileHover={{ x: 4 }}` with `transition={{ duration: 0.2 }}`
- **Cards**: `hover:shadow-md` with `transition-all duration-200`
- **Buttons**: Subtle scale or shadow changes on hover
- **Progress elements**: Smooth animated fills with delays

---

**Remember**: Good design is as little design as possible. Focus on content, maintain consistency, and let functionality guide aesthetic decisions. The dashboard implementation serves as the gold standard for Moneko's design aesthetic.