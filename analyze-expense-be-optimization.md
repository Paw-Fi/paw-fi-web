# Analyze Expense BE Optimization Plan

This plan restores `analyze-expense` to a fast BE-first path for mobile free-form logging by reducing unnecessary pre-AI work, shrinking prompt/context size, and routing each input mode through the lightest possible backend pipeline without changing the FE contract or function parameters.

## What I found

- The mobile caller always sends `language`, `typeHint: mixed`, `date`, and sometimes household context to `analyze-expense`.
- The March 2026 custom-category work added extra backend reads before analysis:
  - custom categories
  - hidden categories
  - category preferences
  - category remaps
- The text path uses a large generic instruction even for short one-line inputs.
- The shared analyzer is optimized for many modes (short text, receipt image, CSV, PDF, audio, household splits), but the hot path for mobile quick-log is still paying for generalized logic.
- The language addition itself increased prompt size, but the larger regression likely came from the combination of:
  - extra DB reads
  - bigger category lists/context
  - overly generous token/time budgets
  - multi-pass helpers intended for import/statement flows

## BE-only optimization goals

1. Keep the existing request/response contract exactly the same.
2. Keep `gemini-3.1-flash-lite` as the primary fast model for the quick-log path.
3. Make short text analysis use the smallest possible prompt and context.
4. Avoid fetching or passing data that does not materially improve the current request.
5. Preserve richer/import-oriented logic only for attachments, PDFs, CSV/XLSX, and other heavy modes.

## Proposed implementation

### 1. Add a dedicated fast path for short free-form text

Route short plain-text requests through a specialized path before the generic analyzer path.

Rules:
- Trigger only when input is text-only.
- Use a small threshold (for example: short text, no attachment, no audio, no image).
- Skip chunking/import-style normalization logic entirely.
- Use a compact system instruction tailored to:
  - amount
  - type
  - category
  - currency
  - date
  - short description
  - optional household split fields only when household mode is present

Expected benefit:
- less prompt construction
- less token usage
- less model reasoning overhead
- much faster first result for the main mobile use case

### 2. Make user-category enrichment conditional instead of unconditional

Do not always load custom categories, hidden categories, preferences, and remaps before every analysis.

Proposed policy:
- short text quick-log:
  - load only what is necessary for final category mapping
  - prefer post-parse remap/preference application over injecting large category context into the prompt
- imports / statements / attachments:
  - keep richer category context where it helps larger batch extraction
- if no customizations exist for the user, use canonical defaults immediately

Implementation direction:
- collapse the current 4 reads into a lighter strategy, ideally:
  - one compact query path or cached shape when possible
  - defer preference/remap reads until there are parsed items to post-process
- avoid sending long merged category lists to Gemini unless required

Expected benefit:
- lower pre-AI latency
- smaller prompts
- cleaner separation between AI extraction and deterministic category personalization

### 3. Split prompt templates by input mode

Replace the current one-size-fits-many instruction usage with mode-specific prompt builders.

Modes:
- quick text
- receipt image
- bank/statement text
- PDF/import
- audio

For quick text specifically:
- remove import/bulk extraction language
- keep category guidance compact
- keep language requirement minimal and localized to free-text fields only
- include household instructions only when household context exists
- keep tool schema unchanged, but reduce verbose descriptive text where safe

Expected benefit:
- smaller prompts
- faster model completion
- fewer unnecessary reasoning branches

### 4. Tighten token budgets and retry behavior by mode

Current budgets are generous for many paths.

Plan:
- quick text path:
  - much lower `maxOutputTokens`
  - shorter timeout
  - minimal/no retry unless the error is clearly transient
- keep larger budgets only for PDFs/imports/image-heavy flows
- verify there is no hidden pre-delay on the active `analyze-expense` path
- ensure fallback escalation only happens for heavy modes, not for short text

Expected benefit:
- faster failures when something is wrong
- lower tail latency
- less time wasted on oversized response budgets

### 5. Prefer deterministic post-processing over AI prompt bloat

Keep AI focused on extraction, then do personalization after parsing.

Examples:
- apply category remaps after extraction
- apply learned preferences after extraction
- normalize currency/date/category deterministically after extraction
- only pass custom category context into Gemini when strictly needed

Expected benefit:
- cleaner responsibilities
- smaller prompts
- easier future tuning

### 6. Add timing instrumentation around every major backend stage

Before and after implementation, add stage timing for:
- auth/getUser
- category/context loading
- household enrichment
- prompt/model call
- post-processing/remaps
- total request time

This stays BE-only and will let us confirm which stage actually dominates.

Expected benefit:
- removes guesswork
- prevents future regressions
- lets us tune with real numbers instead of intuition

## Suggested rollout order

1. Add stage timing instrumentation.
2. Implement short-text fast path using `gemini-3.1-flash-lite`.
3. Make category/preference/remap loading conditional and lighter.
4. Introduce mode-specific prompt builders and lower quick-text token/time budgets.
5. Validate that receipt/PDF/import paths still behave correctly.

## Acceptance criteria

- No FE changes.
- No request parameter changes.
- No response shape changes.
- Short free-form text requests avoid heavy import/generalized logic.
- Backend no longer performs unnecessary pre-analysis reads for the quick-log path.
- Prompt size and token budgets are materially smaller for short text.
- Stage timing makes the slowest segment obvious in logs.

## Risks to watch

- Over-aggressive prompt shrinking can reduce category accuracy.
- Deferring category personalization must not break custom category behavior.
- Household split extraction must remain intact when household context is present.
- The exact deploy-supported Gemini fast model ID should be re-verified during implementation before changing model constants broadly.
