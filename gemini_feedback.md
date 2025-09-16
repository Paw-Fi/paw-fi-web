Data collection is disabled.
Excellent, I've reviewed the provided changes. Here is my feedback.

### Code Review

Overall, this is an excellent and comprehensive UI refresh. The changes demonstrate a systematic and consistent application of a new design system, resulting in a more modern, cohesive, and maintainable frontend. The refactoring to use centralized UI components like `Input` and `Textarea` is a significant improvement for code quality.

There are no critical issues to report. This is a high-quality contribution that dramatically improves the look and feel of the application. Great work.

#### Warnings (Should Fix)

*   **Minor Typo in UI Text**: There's a small grammatical error in a user-facing privacy notice. "Privacy" is a singular noun and should be paired with "is" instead of "are".

    *   **File**: `src/components/goal-tracker/questionnaire/QuestionnaireFlow.tsx` (Line 673)

    **Current Code:**
    ```diff
    - No one can access your data, not even our developers. Your privacy and security are our top priority.
    + No one can access your data, not even our developers. Your privacy are always our top priority.
    ```

    **Recommendation:**
    ```diff
    - No one can access your data, not even our developers. Your privacy are always our top priority.
    + No one can access your data, not even our developers. Your privacy is always our top priority.
    ```

#### Suggestions (Consider Improving)

*   **Consistent Error Styling in `form-question.tsx`**: The error message has been nicely styled within its own bordered box. However, the input field's border color also changes on error. This creates a "double-highlight" effect (a red border on the input and a separate red-bordered box below). For a cleaner look, you could consider showing the error state *only* on the input's border and ring, and have the error message text appear below without its own border. This is a minor stylistic point, and the current implementation is also perfectly clear.

    *Example (conceptual)*:
    ```tsx
    // In FormQuestion component
    <Input className={error ? "border-destructive" : ""} />
    {error && (
      <p className="text-sm text-destructive mt-2">{error}</p> 
      // Message without its own border/background
    )}
    ```
