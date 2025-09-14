Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

Overall, this is an excellent set of changes that significantly expands the website's content and SEO footprint. The implementation of three distinct, data-driven landing pages is well-executed and follows a scalable pattern. The updates to the SEO configuration (`sitemap.xml`, `robots.txt`) and the LLM's knowledge base (`llm.txt`) are perfectly aligned with the new content.

The refactoring of the `ThreeStepsSection` component to accept dynamic `howItWorks` data is a great improvement that enhances reusability and maintainability.

There are no critical issues or warnings to report. This is a high-quality contribution.

#### Suggestions (Consider Improving)

*   **Dynamic `lastmod` in Sitemap**: In `public/sitemap.xml`, the `<lastmod>` dates are hardcoded (e.g., `2025-09-14`). This is accurate for the initial deployment but will become stale over time. To improve SEO accuracy, consider automating this date to reflect the actual modification time of the content. You have a script at `scripts/update-sitemap.js` which could potentially be enhanced to read the modification date of `src/data/home/passive-income-variants.json` and update the sitemap accordingly during your build process.

*   **Component Prop Naming**: In `src/components/homepage/new/three-steps-section.tsx`, the component is named `ThreeStepsSection`, but the props interface `ThreeStepsSectionProps` includes a `features` property that doesn't seem directly related to the "three steps" functionality. While the component may render more than just the steps, consider if a more general name for the component (e.g., `HowItWorksSection`) or the props interface would improve clarity for future development. This is a minor point, and the current implementation is perfectly functional.
