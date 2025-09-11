Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

Overall, this is an outstanding set of changes that dramatically improves the website's SEO strategy, user experience, and code quality. The emphasis on Expertise, Authoritativeness, and Trustworthiness (E-A-T) by highlighting the founder's credentials is exceptionally well-executed, both in the UI and in the structured data. The refactoring to a reusable `StructuredData` component is a major win for maintainability.

There are no critical issues or warnings. This is a high-quality contribution.

#### Suggestions (Consider Improving)

*   **Centralize Repeated Schema Data:** The founder's information (`Sabina Shao, CFA Charterholder`) and organization details are repeated across multiple route files (`/dashboard/learning`, `/dashboard/tracker`, `/pricing`). This could lead to inconsistencies if updates are needed.
    *   **Recommendation:** Create a central configuration file (e.g., `src/config/seo.ts` or add to the existing `src/config/site.ts`) to store this data. This will make it easier to manage and ensure consistency everywhere it's used.

    ```typescript
    // Example for src/config/site.ts
    export const siteConfig = {
      // ... existing config
      author: {
        "@type": "Person",
        "name": "Sabina Shao",
        "jobTitle": "CEO & Financial Education Expert",
        "hasCredential": "CFA Charterholder",
        "knowsAbout": ["Personal Finance", "Investment Strategy", "Financial Planning", "Wealth Building"],
        "yearsOfExperience": "10+"
      },
      organization: {
        "@type": "EducationalOrganization",
        "@id": "https://moneko.io#organization",
        "name": "Moneko",
        "founder": this.author, // or reference siteConfig.author
        // ... other details
      }
    }
    ```

*   **Create a Reusable "Expert Attribution" Component:** The UI pattern that displays the "EXPERT-DESIGNED" badge and the founder's name is used in both `pricing.tsx` and `register/index.tsx`.
    *   **Recommendation:** To ensure visual consistency and reduce code duplication, consider creating a small, reusable component for this.

    ```tsx
    // src/components/shared/expert-attribution-badge.tsx
    import { Badge } from "@/components/ui/badge";

    export function ExpertAttributionBadge() {
      return (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-full border mb-4">
          <Badge variant="secondary" className="text-xs">EXPERT-DESIGNED</Badge>
          <span className="text-sm font-medium">By CFA Charterholder Sabina Shao</span>
        </div>
      );
    }
    ```

This is an exemplary implementation of a feature that thoughtfully combines marketing, SEO, and clean code. Great work.
