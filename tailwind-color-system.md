# Tailwind Color System Documentation

This document defines the complete color system for the Moneko (Moneko) project. All colors are implemented using Tailwind's built-in dark mode system with semantic naming for consistent theming across light and dark modes.

## 🎨 Color Architecture

Our color system uses Tailwind's `darkMode: 'selector'` strategy with colors defined directly in `tailwind.config.mjs`. This approach enables:
- Native Tailwind dark mode support
- Semantic color naming
- Easy dark: variant usage
- Better performance and compatibility

## 📋 Available Colors

### Core Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `background` | `#F9FAFB` | `dark-background` (`#0A0E1A`) | Main page backgrounds |
| `foreground` | `#1F2937` | `dark-foreground` (`#F1F5F9`) | Primary text color |

### Brand Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `primary` | `#7458FF` | `dark-primary` (`#8B70FF`) | Primary buttons, links, CTAs |
| `secondary` | `#836DFF` | `dark-secondary` (`#9B82FF`) | Secondary actions, accents |
| `icon` | `#AA76FF` | `dark-icon` (`#B388FF`) | Icon highlights, decorative elements |

### Accent Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `accent-pink` | `#EC4899` | `dark-accent-pink` (`#F472B6`) | Special highlights, vibrant accents |
| `accent-indigo` | `#6366F1` | `dark-accent-indigo` (`#818CF8`) | Discord branding, secondary accents |

### State Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `success` | `#16CDA2` | `dark-success` (`#1FE3B8`) | Success messages, confirmations |
| `success-light` | `#F1FFF8` | `dark-success-light` (`#0A2920`) | Success backgrounds, subtle highlights |
| `warning` | `#FFC219` | `dark-warning` (`#FFD04A`) | Warning messages, cautions |
| `warning-light` | `#FFF4D5` | `dark-warning-light` (`#2B1F00`) | Warning backgrounds, subtle highlights |
| `danger` | `#FF6060` | `dark-danger` (`#FF7A7A`) | Error messages, destructive actions |
| `danger-light` | `#FFE8E8` | `dark-danger-light` (`#2B0A0A`) | Error backgrounds, subtle highlights |

### Utility Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `overlay` | `rgba(0, 0, 0, 0.8)` | `dark-overlay` (`rgba(0, 0, 0, 0.9)`) | Modal overlays, backdrop dims |

### Ambient Halo Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `halo-bg` | `#f0f0ff` | `dark-halo-bg` (`#0A0E1A`) | Ambient halo background |
| `halo-purple` | `rgba(207, 195, 245, 0.9)` | `dark-halo-purple` (`rgba(139, 112, 255, 0.6)`) | Primary purple halo |
| `halo-purple-mid` | `rgba(195, 180, 235, 0.85)` | `dark-halo-purple-mid` (`rgba(124, 95, 240, 0.55)`) | Mid purple halo |
| `halo-purple-outer` | `rgba(215, 205, 250, 0.6)` | `dark-halo-purple-outer` (`rgba(155, 130, 255, 0.4)`) | Outer purple halo |
| `halo-pink` | `rgba(243, 221, 247, 0.85)` | `dark-halo-pink` (`rgba(243, 221, 247, 0.5)`) | Pink halo accent |
| `halo-pink-mid` | `rgba(235, 210, 240, 0.8)` | `dark-halo-pink-mid` (`rgba(235, 210, 240, 0.45)`) | Mid pink halo |
| `halo-pink-outer` | `rgba(245, 225, 250, 0.6)` | `dark-halo-pink-outer` (`rgba(245, 225, 250, 0.35)`) | Outer pink halo |
| `halo-blue` | `rgba(162, 212, 244, 0.85)` | `dark-halo-blue` (`rgba(96, 165, 250, 0.6)`) | Blue halo accent |
| `halo-blue-mid` | `rgba(150, 200, 235, 0.8)` | `dark-halo-blue-mid` (`rgba(76, 145, 230, 0.55)`) | Mid blue halo |
| `halo-blue-outer` | `rgba(170, 220, 250, 0.65)` | `dark-halo-blue-outer` (`rgba(116, 185, 255, 0.45)`) | Outer blue halo |
| `halo-light-blue` | `rgba(215, 236, 250, 0.8)` | `dark-halo-light-blue` (`rgba(125, 186, 220, 0.5)`) | Light blue halo |
| `halo-light-blue-mid` | `rgba(205, 225, 245, 0.75)` | `dark-halo-light-blue-mid` (`rgba(105, 166, 200, 0.45)`) | Mid light blue halo |
| `halo-light-blue-outer` | `rgba(220, 240, 252, 0.55)` | `dark-halo-light-blue-outer` (`rgba(145, 206, 240, 0.35)`) | Outer light blue halo |

### Markdown Renderer Colors

| Color Name | Light Mode | Dark Mode Variant | Usage |
|------------|------------|-------------------|-------|
| `markdown-button` | `#F3F4F6` | `dark-markdown-button` (`#374151`) | Interactive button backgrounds in markdown |
| `markdown-button-text` | `#1F2937` | `dark-markdown-button-text` (`#F1F5F9`) | Interactive button text colors |
| `markdown-button-border` | `#D1D5DB` | `dark-markdown-button-border` (`#4B5563`) | Interactive button borders |

## 🛠 Usage in Components

### Blog System
The blog system (`/routes/blogs/`) fully utilizes the semantic color system:

```jsx
// Blog page title with gradient
<h1 className="bg-gradient-to-r from-primary via-accent-pink to-accent-indigo dark:from-dark-primary dark:via-dark-accent-pink dark:to-dark-accent-indigo bg-clip-text text-transparent">
  Financial Education Blog
</h1>

// Blog filters with semantic colors
<button className="bg-primary/10 dark:bg-dark-primary/10 text-primary dark:text-dark-primary hover:bg-primary/20 dark:hover:bg-dark-primary/20">
  Filter
</button>

// Blog card tags
<span className="bg-primary/10 dark:bg-dark-primary/10 text-primary dark:text-dark-primary">
  Tag Name
</span>

// Featured badge
<div className="bg-primary dark:bg-dark-primary text-white">
  Featured
</div>

// Blog content with prose styling
<article className="prose prose-purple dark:prose-invert prose-headings:text-foreground dark:prose-headings:text-dark-foreground prose-a:text-primary dark:prose-a:text-dark-primary">
  Blog content here
</article>
```

### Dashboard System
The dashboard system (`/routes/dashboard/`) implements comprehensive dark mode support:

```jsx
// Main dashboard container with gradient background
<div className="bg-gradient-to-br from-background dark:from-dark-background to-purple-300/30 dark:to-purple-800/20">
  Dashboard content
</div>

// Sidebar navigation with card design
<div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/80">
  Sidebar content
</div>

// Active navigation items
<div className="border-l-4 border-primary dark:border-dark-primary text-primary dark:text-dark-primary">
  Active menu item
</div>

// Interactive navigation items
<div className="text-gray-700 dark:text-gray-300 hover:bg-gray-50/70 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100">
  Menu item
</div>

// User profile section
<div className="border-t border-gray-100 dark:border-gray-700">
  <p className="text-foreground dark:text-dark-foreground">User Name</p>
  <p className="text-gray-500 dark:text-gray-400">user@email.com</p>
</div>

// Secondary sidebar for submenus
<div className="bg-purple-100 dark:bg-purple-900/30">
  <div className="text-primary dark:text-dark-primary">Submenu icon</div>
</div>

// Main content area
<main className="border border-gray-100/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80">
  Dashboard content
</main>
```

### Learning Platform
The learning system (`/routes/dashboard/learning/`) provides comprehensive dark mode for educational content:

```jsx
// Learning dashboard main background
<div className="bg-gradient-to-br from-background dark:from-dark-background via-white dark:via-gray-900 to-background dark:to-dark-background">
  Learning content
</div>

// Course cards with different types
<div className="bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-700 hover:border-emerald-300 dark:hover:border-emerald-600">
  Essential course card
</div>

<div className="bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600">
  AI-powered course card
</div>

// Stats cards with glassmorphic effect
<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700">
  <span className="text-foreground dark:text-dark-foreground">Stat Value</span>
  <p className="text-gray-600 dark:text-gray-400">Stat Label</p>
</div>

// Tab navigation
<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-100 dark:border-gray-700">
  <button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
    Active Tab
  </button>
  <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
    Inactive Tab
  </button>
</div>

// Loading spinner
<div className="border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full" />

// Progress bars and course metrics
<div className="bg-gray-200 dark:bg-gray-700 rounded-full">
  <div className="bg-gradient-to-r from-emerald-500 to-green-500">Progress</div>
</div>

// Lesson items with status
<div className="bg-white dark:bg-gray-800 ring-2 ring-purple-500 dark:ring-purple-400 ring-offset-2 dark:ring-offset-gray-900">
  Next lesson highlight
</div>

// XP and achievement badges
<div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
  +50 XP
</div>

// Premium indicators
<span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
  Premium Content
</span>

// Learning tips and hints
<div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
  <div className="text-yellow-600 dark:text-yellow-400">Tip icon</div>
  <p className="text-gray-700 dark:text-gray-300">Learning tip content</p>
</div>
```

### Markdown Renderer
The markdown renderer (`/components/ui/markdown-renderer.tsx`) provides comprehensive dark mode for AI chat interactions:

```jsx
// Main markdown container with prose styling
<div className="prose prose-sm max-w-none prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 prose-slate dark:prose-invert">
  Markdown content
</div>

// Interactive button labels
<p className="text-sm font-medium mb-3 text-foreground dark:text-dark-foreground">
  Button group label
</p>

// Confirm buttons with semantic colors
<button className="px-4 py-2 rounded-lg bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 text-white">
  Yes/Agree button
</button>

// Financial action buttons with color-coded backgrounds
<button className="flex items-center gap-2 px-3 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-700">
  <span>💰</span>
  <span>SAVE MONEY</span>
</button>

// Quick save amount buttons
<button className="px-3 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-400 rounded-lg border border-green-300 dark:border-green-700">
  $50
</button>

// AI chat buttons with gradients
<button className="w-full bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg">
  Chat with Moneko
</button>

// Interactive icons with color transitions
<span className="text-purple-400 dark:text-purple-300 hover:text-cyan-400 dark:hover:text-cyan-300 transition-colors duration-300">
  ⚡
</span>
```

### Using Semantic Colors with Dark Mode Variants

```jsx
// Background colors with dark mode
<div className="bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground">
  Main content area
</div>

// Primary actions with dark mode
<button className="bg-primary dark:bg-dark-primary text-white hover:bg-primary/90 dark:hover:bg-dark-primary/90">
  Primary Button
</button>

// State indicators with dark mode
<div className="bg-success-light dark:bg-dark-success-light text-success dark:text-dark-success border border-success/20 dark:border-dark-success/20">
  Success message
</div>

// Simplified approach - use standard Tailwind colors with dark: variants
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Standard Tailwind approach
</div>

// Ambient halo backgrounds
<div className="bg-halo-bg dark:bg-dark-halo-bg">
  Halo background container
</div>

// Radial gradient halos
<div className="bg-gradient-radial from-halo-purple dark:from-dark-halo-purple via-halo-purple-mid dark:via-dark-halo-purple-mid to-transparent">
  Radial gradient halo effect
</div>

// Button components (automatically themed)
<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>

// Accent color gradients
<div className="bg-gradient-to-r from-accent-pink dark:from-dark-accent-pink to-primary dark:to-dark-primary">
  Vibrant gradient background
</div>

// Discord-style button
<button className="bg-accent-indigo dark:bg-dark-accent-indigo hover:bg-accent-indigo/90 dark:hover:bg-dark-accent-indigo/90">
  Connect on Discord
</button>
```

### Alpha Values with Custom Colors

```jsx
// Semi-transparent backgrounds
<div className="bg-primary/10 dark:bg-dark-primary/10">Light primary background</div>
<div className="bg-danger/20 dark:bg-dark-danger/20">Light danger background</div>

// Borders with opacity
<div className="border border-primary/30 dark:border-dark-primary/30">Subtle primary border</div>
```

## ➕ Adding New Colors

When you need a new color that doesn't exist in the current system:

### Step 1: Add to `tailwind.config.mjs`

```javascript
export default {
  // ... existing config
  theme: {
    extend: {
      colors: {
        // ... existing colors
        'new-color': '#3B82F6',          // Light mode
        'dark-new-color': '#60A5FA',     // Dark mode variant
        'new-color-light': '#EFF6FF',    // Light variant
        'dark-new-color-light': '#1E3A8A', // Dark light variant
      }
    }
  }
}
```

### Step 2: Update This Documentation

Add the new color to the appropriate table above with:
- Color name
- Light and dark mode hex values
- Usage description

### Step 3: Use in Components

```jsx
<div className="bg-new-color dark:bg-dark-new-color text-white">
  New color element
</div>

<div className="bg-new-color-light dark:bg-dark-new-color-light text-new-color dark:text-dark-new-color">
  New color with light variant
</div>
```

## 🎯 Best Practices

### 1. Use Semantic Names with Dark Variants
```jsx
// ✅ Good - semantic with dark variants
<div className="bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground">
  Content
</div>

// ❌ Avoid - hardcoded colors
<div className="bg-gray-100 dark:bg-gray-900">
  Content
</div>
```

### 2. Consistent Dark Mode Patterns
```jsx
// ✅ Always provide dark variants for custom colors
<button className="bg-primary dark:bg-dark-primary hover:bg-primary/90 dark:hover:bg-dark-primary/90">
  Button
</button>

// ✅ Use standard Tailwind colors when custom colors aren't needed
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Standard styling
</div>
```

### 3. State-Specific Colors
```jsx
// Success state
<div className="bg-success-light dark:bg-dark-success-light text-success dark:text-dark-success">
  Success message
</div>

// Warning state
<div className="bg-warning-light dark:bg-dark-warning-light text-warning dark:text-dark-warning">
  Warning message
</div>

// Error state
<div className="bg-danger-light dark:bg-dark-danger-light text-danger dark:text-dark-danger">
  Error message
</div>
```

### 4. Alpha Values for Subtle Effects
```jsx
<div className="bg-primary/5 dark:bg-dark-primary/5 border border-primary/20 dark:border-dark-primary/20">
  Subtle primary styling
</div>
```

## 🔧 Configuration Files

### Core Files
- **`tailwind.config.mjs`** - Tailwind configuration with semantic colors and dark variantse

### Integration
Colors are automatically available throughout the application. The system supports:
- All Tailwind color utilities (`bg-`, `text-`, `border-`, etc.)
- Dark mode variants (`dark:bg-`, `dark:text-`, etc.)
- Opacity modifiers (`/10`, `/20`, `/50`, etc.)
- Hover and focus states (`hover:bg-`, `focus:ring-`, etc.)

## 📱 Accessibility

All color combinations meet WCAG AA contrast requirements:
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds
- Interactive elements maintain sufficient contrast in all states
- Color is never the only means of conveying information

## 🔄 Maintenance

When updating colors:
1. Modify values in `tailwind.config.mjs`
2. Test in both light and dark modes
3. Verify accessibility compliance
4. Update this documentation
5. Test across all components using the modified colors

This Tailwind-native approach ensures better performance, easier maintenance, and full compatibility with Tailwind's ecosystem.