Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

The aesthetic improvement to the "Early Access" call-to-action is a great enhancement, making it more prominent and visually appealing. The use of gradients, animations, and hover effects is well-implemented. However, there is one critical issue regarding HTML semantics and accessibility.

#### Critical Issues (Must Fix)

*   **Invalid HTML and Accessibility Concern: Nesting a `<button>` inside a `<Link>`**

    The current implementation nests a `<button>` element inside a `<Link>` component. The `<Link>` component from TanStack Router renders an HTML `<a>` tag. Nesting an interactive element like `<button>` inside another interactive element like `<a>` is invalid HTML. This can cause unpredictable behavior for screen readers and keyboard navigation, creating an accessibility issue.

    **Recommendation:**
    Since the element's purpose is navigation (going to the `/early-access` page), it should be a link (`<a>`). The visual styling of a button can be applied to a non-interactive element like a `<span>` or `<div>` within the link.

    Please change the `<button>` to a `<span>` to fix the HTML structure while retaining the styles.

    **Example Fix:**

    ```diff
    --- a/src/components/homepage/new/hero-section.tsx
    +++ b/src/components/homepage/new/hero-section.tsx
    @@ -43,10 +43,10 @@
          <Link to="/early-access">
             <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
    -          <button className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl">
    +          <span className="relative bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full px-6 py-3 text-sm font-semibold inline-flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl">
                 Early Access
                 <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3 transition-transform group-hover:translate-x-1" />
    -          </button>
    +          </span>
             </div>
           </Link>
         </div>

    ```

#### Suggestions (Consider Improving)

*   **Component Abstraction**

    The new gradient button involves complex styling with over 20 Tailwind classes. If you intend to reuse this button style elsewhere, I recommend extracting it into a dedicated, reusable component (e.g., `GradientLinkButton`). This would clean up the `HeroSection` component, promote code reuse, and ensure a consistent design. If this is a one-time use case, leaving it as is is acceptable.
