# Mobile Development Guidelines

Comprehensive guide for developing mobile-responsive interfaces in the Moneko web application following modern UX patterns from Instagram, WhatsApp, and Messenger.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Layout Guidelines](#layout-guidelines)
3. [Typography Scale](#typography-scale)
4. [Spacing System](#spacing-system)
5. [Touch Targets](#touch-targets)
6. [Scrolling Behavior](#scrolling-behavior)
7. [Component Patterns](#component-patterns)
8. [Common Mistakes](#common-mistakes)
9. [Testing Checklist](#testing-checklist)

---

## Core Principles

### 1. Mobile-First Development
Always design for mobile screens first, then progressively enhance for larger screens.

```tsx
// ✅ Good: Mobile-first, progressive enhancement
<div className="px-3 sm:px-4 lg:px-6">

// ❌ Bad: Desktop-first, mobile as afterthought
<div className="px-6 sm:px-4 mobile:px-3">
```

### 2. Edge-to-Edge on Mobile
Remove padding/margins on mobile for maximum screen real estate. Add them back on larger screens.

```tsx
// ✅ Good: Edge-to-edge mobile, padded desktop
<div className="px-0 sm:px-3 lg:px-6">

// ❌ Bad: Unnecessary padding on mobile
<div className="px-4 sm:px-6 lg:px-8">
```

### 3. Hide Scrollbars on Mobile
Modern mobile apps (Instagram, WhatsApp) hide scrollbars for cleaner UX. Users instinctively know content is scrollable.

```tsx
// ✅ Good: Hidden scrollbar on mobile
<div className="overflow-y-auto scrollbar-hide">

// ❌ Bad: Visible scrollbar cluttering mobile UI
<div className="overflow-y-auto">
```

---

## Layout Guidelines

### Container Sizing

```tsx
// Page Container - Full width on mobile, constrained on desktop
<div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">

// Card Container - Edge-to-edge mobile, rounded desktop
<div className="rounded-none sm:rounded-2xl border-0 sm:border">

// Modal Container - Full height mobile, constrained desktop
<div className="h-screen sm:h-auto sm:max-h-[90vh]">
```

### Viewport Management

```tsx
// ✅ Good: Full height utilization
<div className="h-screen overflow-hidden">
  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
    {/* Content */}
  </div>
</div>

// ❌ Bad: Fixed heights causing scroll issues
<div className="h-[600px]">
  <div className="h-full overflow-y-auto">
    {/* Content */}
  </div>
</div>
```

---

## Typography Scale

### Font Size Hierarchy

Use these standardized font sizes across the application:

| Element | Mobile | Tablet | Desktop | CSS Variable | Tailwind Classes |
|---------|--------|--------|---------|--------------|------------------|
| **Timestamp** | 11px | 12px | 12px | `--text-mobile-xs` | `text-mobile-xs sm:text-xs` |
| **Caption** | 13px | 14px | 14px | `--text-mobile-sm` | `text-mobile-sm sm:text-sm` |
| **Body** | 15px | 16px | 16px | `--text-mobile-base` | `text-mobile-base sm:text-base` |
| **Heading** | 18px | 20px | 24px | `--text-mobile-lg` | `text-mobile-lg sm:text-xl lg:text-2xl` |

### Font Size Best Practices

```tsx
// ✅ Good: Using CSS variables for mobile font sizes
<input className="text-mobile-base sm:text-base" /> // Prevents iOS zoom
<p className="text-mobile-sm sm:text-sm" /> // Compact mobile text
<time className="text-mobile-xs sm:text-xs" /> // Tiny mobile timestamps
<h1 className="text-mobile-lg sm:text-xl" /> // Mobile heading

// ❌ Bad: Hardcoded pixel values
<input className="text-[15px] sm:text-base" /> // Avoid hardcoded values
<p className="text-[13px] sm:text-sm" /> // Use CSS variables instead

// ❌ Bad: Too small on mobile
<input className="text-sm" /> // Causes iOS zoom (14px < 16px threshold)
<p className="text-xs" /> // Too small to read comfortably
```

### Why 15px for Inputs?

iOS Safari automatically zooms when focusing inputs with `font-size < 16px`. Using `text-mobile-base` (15px) prevents this while maintaining compact UI. On desktop, it scales to 16px with `sm:text-base`.

### CSS Variable Definition

All mobile typography variables are defined in [src/styles/app.css](../src/styles/app.css):

```css
:root {
  /* Mobile-specific typography */
  --text-mobile-xs: 0.6875rem;      /* 11px - Timestamps, tiny text */
  --text-mobile-sm: 0.8125rem;      /* 13px - Captions, small text */
  --text-mobile-base: 0.9375rem;    /* 15px - Body text, inputs (prevents iOS zoom) */
  --text-mobile-lg: 1.125rem;       /* 18px - Headings */
}

/* Mobile-specific font size utility classes */
@media (max-width: 640px) {
  .text-mobile-xs {
    font-size: var(--text-mobile-xs);
  }

  .text-mobile-sm {
    font-size: var(--text-mobile-sm);
  }

  .text-mobile-base {
    font-size: var(--text-mobile-base);
  }

  .text-mobile-lg {
    font-size: var(--text-mobile-lg);
  }
}
```

---

## Spacing System

### Padding Scale

Follow this consistent padding scale for all components:

```tsx
// Component Internal Padding
<div className="p-3 sm:p-4 md:p-6">         // General containers
<div className="px-3 sm:px-4 py-2.5">       // Compact components
<div className="px-4 sm:px-4 py-3 sm:py-3"> // Buttons and inputs

// Page-Level Padding
<div className="px-0 sm:px-3 lg:px-6">     // Page wrapper (edge-to-edge mobile)
<div className="px-3 sm:px-4 lg:px-6">     // Content sections (minimal mobile)
<div className="px-4 sm:px-6 lg:px-8">     // Modal/dialog content
```

### Gap Scale

```tsx
// Element Spacing
<div className="gap-2 sm:gap-3">           // Tight spacing (buttons, chips)
<div className="gap-2.5">                  // Ultra-tight mobile (footer items)
<div className="gap-3 sm:gap-6">           // Content spacing (messages, cards)
<div className="space-y-3 sm:space-y-6">   // Vertical spacing (message list)
```

### Margin Scale

```tsx
// Vertical Margins
<div className="my-0 sm:my-2">             // Remove mobile margins (chat input)
<div className="mt-1.5 sm:mt-2">           // Minimal top margin (timestamps)
<div className="mb-2 sm:mb-4">             // Bottom margin (sections)

// Horizontal Margins (Use sparingly, prefer padding)
<div className="mx-auto">                  // Center alignment only
```

---

## Touch Targets

### Minimum Touch Target: 44px

Apple Human Interface Guidelines recommend **minimum 44x44pt touch targets** for comfortable thumb interaction.

```tsx
// ✅ Good: Meets 44px minimum
<button className="min-h-[44px] min-w-[44px] touch-manipulation">
<button className="h-10 w-10 touch-manipulation"> // 40px, acceptable
<button className="px-3 py-2.5 touch-manipulation"> // Content-based

// ❌ Bad: Too small for comfortable touch
<button className="h-6 w-6"> // 24px, too small
<button className="p-1"> // Insufficient padding
```

### Touch Optimization Classes

Always include `touch-manipulation` on interactive elements:

```tsx
// ✅ Good: Optimized touch interactions
<button className="touch-manipulation active:scale-95">
<input className="touch-manipulation">
<a className="touch-manipulation">

// ❌ Bad: Default touch behavior (slow, may zoom)
<button>Click me</button>
```

### Interactive Element Spacing

```tsx
// Navigation Items
<button className="min-h-[52px] touch-manipulation"> // Navigation/menu items

// Form Controls
<button className="h-10 w-10 sm:h-10 sm:w-10 touch-manipulation"> // Icon buttons
<button className="px-3 py-2.5 touch-manipulation"> // Text buttons

// User Menu
<button className="min-h-[56px] touch-manipulation"> // User menu items
```

---

## Scrolling Behavior

### Hide Scrollbars on Mobile

**Global Rule**: All scrollbars are automatically hidden on mobile via [src/styles/mobile-ux.css](../src/styles/mobile-ux.css:121-129).

```css
/* Automatic on mobile (< 768px) */
@media (max-width: 768px) {
  * {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  *::-webkit-scrollbar {
    display: none;
  }
}
```

For explicit scrollbar hiding on desktop too:

```tsx
// ✅ Good: Always hidden scrollbar
<div className="overflow-y-auto scrollbar-hide">

// ✅ Good: Horizontal scroll (suggestions, chips)
<div className="overflow-x-auto scrollbar-hide">

// ❌ Bad: Visible scrollbar on mobile
<div className="overflow-y-auto">
```

### Scrolling Performance

```tsx
// ✅ Good: Optimized scrolling
<div className="overflow-y-auto overscroll-contain scroll-smooth">

// Components:
// - overscroll-contain: Prevents scroll chaining
// - scroll-smooth: Native smooth scrolling
// - -webkit-overflow-scrolling: touch (via mobile-ux.css)
```

### Scroll Containers

```tsx
// ✅ Good: Proper flex container for scrolling
<div className="flex flex-col h-screen overflow-hidden">
  <header className="flex-shrink-0">Header</header>

  <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
    {/* Scrollable content */}
  </main>

  <footer className="flex-shrink-0">Footer</footer>
</div>

// ❌ Bad: Improper constraints cause layout issues
<div className="h-screen">
  <header>Header</header>
  <main className="overflow-y-auto">Content</main>
  <footer>Footer</footer>
</div>
```

---

## Component Patterns

### Chat Message Layout

```tsx
// Message Container
<div className="flex items-end gap-2 sm:gap-3 md:gap-4 w-full text-[15px] sm:text-base">
  {/* Avatar */}
  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0">

  {/* Message Bubble */}
  <div className="max-w-[90%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3">
    {/* Content */}

    {/* Timestamp */}
    <div className="text-[11px] sm:text-xs mt-1.5 sm:mt-2">
      {timestamp}
    </div>
  </div>
</div>
```

### Input Component

```tsx
// Chat/Form Input
<form className="flex items-end gap-2 sm:gap-3">
  {/* Input Field */}
  <div className="flex-grow">
    <textarea
      className="text-[15px] sm:text-base px-3 sm:px-4 py-2.5 rounded-2xl touch-manipulation"
      placeholder="Type a message..."
    />
  </div>

  {/* Send Button */}
  <button className="h-10 w-10 rounded-full touch-manipulation">
    <SendIcon />
  </button>
</form>
```

### Header Component

```tsx
// Page Header
<header className="flex-shrink-0 border-b bg-card">
  <div className="px-4 sm:px-4 py-3 sm:py-3">
    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">
      Page Title
    </h1>

    {/* Hide subtitle on mobile */}
    <p className="hidden md:block text-sm lg:text-base text-muted-foreground-color">
      Subtitle text
    </p>
  </div>
</header>
```

### Footer Component

```tsx
// Page Footer
<footer className="flex-shrink-0 border-t bg-card">
  {/* Mobile: Minimal */}
  <div className="flex sm:hidden justify-center gap-2.5 px-3 py-2 text-[11px]">
    <span>Item 1</span>
    <span>Item 2</span>
    <span>Item 3</span>
  </div>

  {/* Desktop: Full */}
  <div className="hidden sm:flex justify-center gap-4 px-4 py-2 text-sm">
    <span>Full Item 1</span>
    <span>Full Item 2</span>
    <span>Full Item 3</span>
  </div>
</footer>
```

### Horizontal Scroll (Chips/Tags)

```tsx
// Suggestion Chips / Tags
<div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide pb-1">
  {items.map(item => (
    <button
      key={item.id}
      className="flex-shrink-0 px-3 sm:px-4 py-2 text-[13px] sm:text-sm rounded-xl touch-manipulation whitespace-nowrap"
    >
      {item.label}
    </button>
  ))}
</div>
```

### Modal/Dialog

```tsx
// Modal Container
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Modal Content */}
  <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-card h-[90vh] sm:h-auto sm:max-h-[90vh]">
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b">
        <h2 className="text-lg sm:text-xl font-bold">Modal Title</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4 sm:p-6">
        {/* Content */}
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t">
        <button className="w-full sm:w-auto px-4 py-2.5 touch-manipulation">
          Action
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## Common Mistakes

### ❌ Mistake 1: Using `text-sm` for Inputs on Mobile

```tsx
// ❌ Bad: Causes iOS zoom
<input className="text-sm" /> // 14px < 16px threshold

// ✅ Good: Prevents iOS zoom
<input className="text-[15px] sm:text-base" /> // 15px on mobile, 16px on desktop
```

### ❌ Mistake 2: Not Removing Mobile Padding

```tsx
// ❌ Bad: Wastes screen space on mobile
<div className="px-4 sm:px-6">
  <main>Content</main>
</div>

// ✅ Good: Edge-to-edge on mobile
<div className="px-0 sm:px-6">
  <main>Content</main>
</div>
```

### ❌ Mistake 3: Fixed Heights Breaking Scroll

```tsx
// ❌ Bad: Content overflow issues
<div className="h-[600px]">
  <div className="h-full overflow-y-auto">
    {/* Content may not scroll properly */}
  </div>
</div>

// ✅ Good: Flexible height with min-h-0
<div className="flex flex-col h-screen">
  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
    {/* Content scrolls properly */}
  </div>
</div>
```

### ❌ Mistake 4: Visible Scrollbars on Mobile

```tsx
// ❌ Bad: Cluttered mobile UI
<div className="overflow-x-auto">
  {/* Horizontal scroll with visible scrollbar */}
</div>

// ✅ Good: Hidden scrollbar
<div className="overflow-x-auto scrollbar-hide">
  {/* Clean horizontal scroll */}
</div>
```

### ❌ Mistake 5: Insufficient Touch Targets

```tsx
// ❌ Bad: Too small for comfortable touch
<button className="p-1 text-xs">
  <Icon className="h-4 w-4" />
</button>

// ✅ Good: Meets 44px minimum
<button className="p-2 min-h-[44px] min-w-[44px] touch-manipulation">
  <Icon className="h-5 w-5" />
</button>
```

### ❌ Mistake 6: Not Using Progressive Enhancement

```tsx
// ❌ Bad: Desktop-first thinking
<div className="text-xl sm:text-lg mobile:text-base">

// ✅ Good: Mobile-first progressive enhancement
<div className="text-base sm:text-lg lg:text-xl">
```

### ❌ Mistake 7: Forgetting `touch-manipulation`

```tsx
// ❌ Bad: Slow touch response, potential zoom
<button onClick={handleClick}>Submit</button>

// ✅ Good: Fast, optimized touch interaction
<button onClick={handleClick} className="touch-manipulation">
  Submit
</button>
```

---

## Testing Checklist

### Device Testing

Test on real devices when possible, or use browser DevTools:

- [ ] **iPhone SE** (375x667) - Smallest modern iPhone
- [ ] **iPhone 14 Pro** (393x852) - Standard iPhone
- [ ] **iPhone 14 Pro Max** (430x932) - Large iPhone
- [ ] **Samsung Galaxy S21** (360x800) - Standard Android
- [ ] **iPad Mini** (744x1133) - Small tablet
- [ ] **iPad Pro** (1024x1366) - Large tablet

### Viewport Checks

- [ ] **No horizontal scrolling** at any breakpoint
- [ ] **Scrollbars hidden** on mobile (< 768px)
- [ ] **Edge-to-edge layout** on mobile where appropriate
- [ ] **Content readable** without zooming
- [ ] **Touch targets ≥ 44px** for all interactive elements

### Typography Checks

- [ ] **Input font size ≥ 15px** on mobile (prevents iOS zoom)
- [ ] **Base text readable** at 15px mobile, 16px desktop
- [ ] **Timestamps/captions** use 11-13px on mobile
- [ ] **Headings scale** appropriately across breakpoints

### Spacing Checks

- [ ] **Padding scales** from mobile to desktop (3 → 4 → 6)
- [ ] **Gaps consistent** with design system (2, 2.5, 3, 6)
- [ ] **Margins removed** on mobile where appropriate
- [ ] **Component spacing** follows hierarchy (tight → normal → loose)

### Interaction Checks

- [ ] **Touch feedback** (active states) on all interactive elements
- [ ] **`touch-manipulation`** class on buttons, inputs, links
- [ ] **No zoom on input focus** (iOS/Android)
- [ ] **Fast tap response** (< 300ms delay)
- [ ] **No accidental clicks** from insufficient spacing

### Scrolling Checks

- [ ] **Smooth scrolling** enabled where appropriate
- [ ] **Overscroll contained** (no bounce to outer container)
- [ ] **Scroll position maintained** on navigation
- [ ] **Pull-to-refresh** doesn't interfere with scrolling
- [ ] **Horizontal scroll** works for chips/tags with hidden scrollbar

### Performance Checks

- [ ] **No layout shifts** during load (CLS < 0.1)
- [ ] **60fps scrolling** on mobile devices
- [ ] **Touch interactions < 100ms** response time
- [ ] **Images optimized** for mobile (WebP/AVIF)
- [ ] **Bundle size optimized** (< 500KB initial)

---

## Quick Reference

### Mobile-First Class Patterns

```tsx
// Spacing
"px-0 sm:px-3 lg:px-6"           // Padding: none → small → large
"gap-2 sm:gap-3"                 // Gap: tight → normal
"space-y-3 sm:space-y-6"         // Vertical space: compact → spacious

// Typography
"text-[15px] sm:text-base"       // Body: 15px → 16px
"text-[13px] sm:text-sm"         // Small: 13px → 14px
"text-[11px] sm:text-xs"         // Tiny: 11px → 12px
"text-lg sm:text-xl lg:text-2xl" // Heading: 18px → 20px → 24px

// Layout
"rounded-none sm:rounded-2xl"    // Border radius: none → rounded
"border-0 sm:border"             // Border: none → visible
"shadow-none sm:shadow-sm"       // Shadow: none → subtle

// Sizing
"max-w-[90%] sm:max-w-[75%]"    // Width: wider mobile → narrower desktop
"h-10 w-10 sm:h-10 sm:w-10"     // Icon button: 40px consistent

// Display
"flex sm:hidden"                 // Mobile only
"hidden sm:flex"                 // Desktop only
"hidden md:block"                // Medium+ screens only
```

### Utility Class Reference

```tsx
// Scrollbar
scrollbar-hide                   // Hide scrollbar (all browsers)

// Touch
touch-manipulation               // Optimize touch interactions
active:scale-95                  // Touch feedback animation

// Scroll
overscroll-contain               // Prevent scroll chaining
scroll-smooth                    // Smooth scrolling

// Flex
flex-shrink-0                    // Prevent flex shrinking (header/footer)
flex-1 min-h-0                   // Grow + allow scroll (main content)
```

---

## Resources

### Related Files
- [src/styles/mobile-ux.css](../src/styles/mobile-ux.css) - Global mobile optimizations
- [src/styles/scrollbar.css](../src/styles/scrollbar.css) - Scrollbar styling
- [src/routes/onboarding/index.tsx](../src/routes/onboarding/index.tsx) - Reference implementation
- [src/components/chat/](../src/components/chat/) - Mobile-optimized chat components

### External Resources
- [Apple Human Interface Guidelines - Touch Targets](https://developer.apple.com/design/human-interface-guidelines/touch-targets)
- [Material Design - Touch Targets](https://m3.material.io/foundations/interaction/states/state-layers#6f1e4b8c-2a3e-4c0f-8c8e-0e4e8f8e0e4e)
- [Web.dev - Mobile UX Best Practices](https://web.dev/mobile-ux/)
- [MDN - Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

### Design System
- [design-system-memory.md](../design-system-memory.md) - Complete design system reference

---

## Questions?

If you're unsure about mobile implementation for a component:

1. **Check existing patterns** in [src/components/chat/](../src/components/chat/) and [src/routes/onboarding/](../src/routes/onboarding/)
2. **Test on real device** or use Chrome DevTools mobile emulation
3. **Follow the checklist** above before submitting PR
4. **Ask for review** if implementing new mobile patterns

**Remember**: Mobile users are the majority. Always prioritize mobile UX over desktop aesthetics.
