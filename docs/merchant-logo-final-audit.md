# Moneko Merchant Logo Final Audit

Status: `[x]` verified, `[~]` partial, `[!]` failed/unsafe.

## 1. Logo.dev Community-tier compliance

- [x] `api.logo.dev/search` exists only in `merchant-user-search/index.ts`.
- [x] Worker, backfill, Plaid, recurring, imports, OCR, and migrations make zero Search calls.
- [x] Only `img.logo.dev` CDN is used for images; no paid APIs, storage download, or self-hosting.
- [x] Attribution link is visible in `settings_page.dart`.

## 2. Merchant database architecture

- [x] Global `merchants`, nullable `expenses.merchant_id`, FK, confidence, source, timestamps, domain, and Logo.dev identifier exist.

## 3. Merchant aliases

- [~] Safe global alias uniqueness exists, but user corrections do not yet earn a controlled global alias promotion.

## 4. Merchant normalization

- [!] TypeScript normalization is deterministic/tested, but SQL job-key normalization differs; Unicode/international coverage is missing.

## 5. Resolution order

- [~] Worker order is user override, alias, global identity, then unresolved. Explicit Search does not first reuse an internal identity.

## 6. User-trigger requirement

- [x] Only explicit search/correction can call Logo.dev Search; background is internal-only.

## 7. Existing production transaction backfill

- [~] Bounded internal-only enqueueing and idempotent job rows exist; progress/failure observability and database integration proof are missing.

## 8. Financial-data safety

- [x] Resolver/backfill update only `merchant_id`, `updated_at`, and merchant-specific job state.

## 9. AI merchant-query assistance

- [~] Not implemented. This is safe but lacks optional query refinement.

## 10. Logo.dev candidate selection

- [~] Scoring exists, but explicit user selection is allowed for any returned candidate rather than a thresholded automatic match.

## 11. Duplicate request prevention

- [~] Render/pagination/resume never Search; daily server quota exists. UI query dedupe and stale cancellation are missing.

## 12. Unresolved merchant cooldown

- [~] Internal unresolved jobs have a 30-day cooldown. Explicit Search does not persist a descriptor-specific no-result cooldown.

## 13. Concurrency safety

- [~] Unique identities and job locks exist, but no concurrency integration tests validate races.

## 14. Transaction creation performance

- [x] Transaction saves queue internal work only and do not await Logo.dev or AI.

## 15. Offline behavior

- [~] Code retains category fallback and local persistence; no offline test was run.

## 16. Frontend display logic

- [~] `MerchantLogo` falls back for missing/error/loading states. Only audited direct tiles receive metadata; semantic labels are missing.

## 17. Frontend secret safety

- [x] Flutter uses only `LOGO_DEV_PUBLISHABLE_KEY`; secret/service-role/AI credentials remain server-side.

## 18. User correction flow

- [~] Explicit search, selection, transaction assignment, and user overrides work; undo/clear-to-category fallback is missing.

## 19. Cross-user safety

- [~] Global merchants contain no transaction text. Future global alias promotion needs explicit privacy safeguards.

## 20. RLS and Supabase permissions

- [~] RLS/grants and owner/admin household correction checks exist; no executed migration/RLS integration tests.

## 21. Database indexes

- [~] Transaction reference, normalized merchant, normalized alias, and job indexes exist; alias merchant-ID/domain indexes and query-plan review are missing.

## 22. Historical backfill performance

- [~] Bounded locked batches exist; per-job worker lookups are N+1 and no production-scale/progress test exists.

## 23. All transaction sources

- [~] `expenses` triggers cover persisted sources, but source-by-source runtime tests and `analyze-core` normalizer reuse are absent.

## 24. Existing functionality regression audit

- [!] Full product regression suite was not run. Flutter tests are blocked by the existing missing `dotenv-prod` asset declaration.

## 25. Error handling

- [~] Search/image failures degrade safely in code; external HTTP, conflict, and database failure behavior lacks tests.

## 26. Usage monitoring

- [!] Daily quota exists, but required structured metrics for hits, assignments, unresolveds, errors, and corrections are absent.

## 27. Free-tier safety protection

- [~] No background Search and daily quota are verified. UI debounce/deduplication/stale cancellation are absent.

## 28. Search UI

- [~] Explicit submit, minimum length, loading, error, and persistence exist; debounce, no-results, dedupe, and stale cancellation are absent.

## 29. Data consistency

- [~] Nullable FK and intentional deletion behavior exist; merchant merge behavior is absent.

## 30. Merchant correction and future learning

- [~] Same-user future reuse is now implemented. Controlled multi-user promotion/global learning is absent.

## 31. Automated tests

- [~] Descriptor and static contract tests exist; behavioral integration, offline, fallback, correction, failure, and concurrency tests are missing.

## 32. Policy-regression tests

- [!] No source-specific tests guard Plaid/import/recurring/background paths from future Search calls.

## 33. Code quality audit

- [~] TypeScript resolver and Logo.dev client are centralized; SQL key normalization diverges and AI assistance is absent.

## 34. Manual scenarios

- [!] No end-to-end scenarios were executed against a migrated environment.

## 35. Final acceptance criteria

- [!] NOT SAFE TO RELEASE until all failed/required partial items are resolved and migration/runtime tests pass.
