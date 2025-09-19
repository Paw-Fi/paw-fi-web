Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

Overall, this is a solid set of changes that correctly addresses a critical bug for Server-Side Rendering (SSR). By ensuring `document` is only accessed on the client-side, you've prevented server crashes and improved the robustness of the application. The change to the `vite.config.ts` appears to be a deliberate configuration update and raises no concerns.

#### Suggestions (Consider Improving)

*   **Code Duplication:** The client-side check `typeof document !== 'undefined' && document.documentElement.classList.contains('dark')` is now duplicated across multiple calculator components. To improve maintainability and adhere to the Don't Repeat Yourself (DRY) principle, this logic could be abstracted into a custom hook or a utility function.

    A custom hook is a good approach here as it can also handle theme changes reactively if needed in the future.

    **Example Custom Hook:**

    You could create a `useTheme` hook like this:

    ```typescript
    // src/hooks/use-theme.ts
    import { useState, useEffect } from 'react';

    export function useTheme() {
      const [isDark, setIsDark] = useState(false);

      useEffect(() => {
        // This effect runs only on the client
        const isDarkMode = document.documentElement.classList.contains('dark');
        setIsDark(isDarkMode);

        // Optional: If you want to listen for theme changes
        const observer = new MutationObserver(() => {
          setIsDark(document.documentElement.classList.contains('dark'));
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });

        return () => observer.disconnect();
      }, []);

      return { isDark };
    }
    ```

    And then use it in your components like this:

    ```tsx
    // src/components/calculators/auto-loan/auto-loan-calculator.tsx
    import { useTheme } from '@/hooks/use-theme'; // Adjust path as needed

    function AmortizationLineChart(...) {
      // ...
      const { isDark } = useTheme();
      // ...
    }
    ```

There are no critical issues or warnings to report. This is a good contribution that improves the stability of the application.
