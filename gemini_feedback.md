Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

Overall, this is a great refactoring that improves the logic for disabling animations on mobile devices. The changes make the function more robust, reusable, and safer in a server-side rendering (SSR) context.

There are no critical issues or warnings to report. This is a high-quality contribution.

#### Suggestions (Consider Improving)

*   **Dynamic Resize Handling**: The `useEffect` in `HomePage` component runs the check whenever `isMobile` changes, which is good. However, to make the `disableAnimationsOnMobile` utility truly robust and self-contained, you might consider attaching a resize event listener directly within the utility itself. This would allow it to dynamically enable or disable animations as the viewport changes, without relying on a component's lifecycle. This is a minor suggestion, as the current implementation works perfectly fine within the context of the `HomePage` component.

Here is an example of how that could look:

```typescript
// src/utils/disable-framer-motion-mobile.ts
import { MotionGlobalConfig } from 'framer-motion';

export const manageAnimationsBasedOnViewport = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;

  const handleResize = () => {
    const isMobile = window.innerWidth < 640;
    MotionGlobalConfig.skipAnimations = isMobile;
  };

  // Run on initial load
  handleResize();

  // Add event listener for window resize
  window.addEventListener('resize', handleResize);

  // Return a cleanup function to remove the listener
  return () => window.removeEventListener('resize', handleResize);
};
```

You could then call this from a `useEffect` with an empty dependency array in your main App component to set it up once globally.

```tsx
// Example usage in a root component like App.tsx
useEffect(() => {
  const cleanup = manageAnimationsBasedOnViewport();
  return cleanup; // Cleanup listener on component unmount
}, []);
```
