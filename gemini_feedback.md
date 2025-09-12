Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

This is a solid, albeit small, change that improves the performance of the application's homepage.

#### Suggestions (Consider Improving)

*   The addition of `staticData: () => ({})` in `src/routes/index.tsx` is an effective way to enable static site generation (SSG) for the homepage using TanStack Router. This is a great performance optimization, as it allows the page to be rendered at build time and served directly from a CDN, leading to faster load times for users. The comment is clear and accurately describes the change's purpose.

There are no critical issues or warnings to report. This is a good contribution to the project's performance.
