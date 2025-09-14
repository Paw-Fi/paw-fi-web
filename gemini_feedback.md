Data collection is disabled.
Excellent, I have reviewed the provided changes. Here is my feedback.

### Code Review

This is an excellent change that correctly implements a key performance optimization for the authentication pages. The introduction of the `OptimizedImage` component to serve a next-gen WebP background with a PNG fallback is a significant improvement.

*   **Performance:** Using `.webp` images is a best practice that will reduce the page load time for the login and register routes, directly improving the user experience and Core Web Vitals scores (specifically Largest Contentful Paint - LCP).
*   **Best Practices:** The implementation is very well done.
    *   Providing a `.png` fallback ensures compatibility with older browsers that may not support WebP.
    *   Setting `priority={true}` and `loading="eager"` is the correct strategy for a critical, above-the-fold image, ensuring it loads as quickly as possible.
    *   Explicitly setting `width` and `height` prevents layout shift (CLS) while the image is loading.

There are no critical issues or warnings to report. This is a high-quality contribution that improves the performance and technical quality of the application. Great work.
