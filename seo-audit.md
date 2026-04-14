# SEO + AI Visibility Audit: Moneko (moneko-web)

## Summary

Moneko is a fintech product with a strong starting point for SEO and AI-answer visibility: it has substantial question/guide/calculator content, extensive JSON-LD usage, a `llm.txt`, and a sitemap process. Overall grade: **B-** (good foundations, but a few technical and content-trust risks reduce upside).

Most impactful fix: **ensure structured data is reliably emitted server-side on every indexable marketing/content route**, and tighten page-level trust and topical focus (avoid inflated/placeholder claims in JSON-LD and `llm.txt`).

## Critical Issues (fix immediately)

1. **Structured data injection bug was blocking JSON-LD on many routes**

   - What was wrong: many routes used `head: { script: [...] }` instead of `head: { scripts: [...] }` (TanStack Router expects `scripts`).
   - Why it matters: FAQ/HowTo/Article JSON-LD is a primary driver for rich results and AI citation; missing JSON-LD is a direct ranking and GEO loss.
   - Status: **Fixed** across `moneko-web/src/routes/**` (no remaining `script: [` usage under routes).
   - Verification:
     1. Run locally: `npm --prefix moneko-web run dev`
     2. View page source for a few pages that add JSON-LD in `head()` (ex: `/`, `/questions/...`, `/guides/...`, `/budgeting-app/<slug>`).
     3. Confirm `application/ld+json` scripts are present in SSR output.

2. **Robots/sitemaps referenced non-existent resources**

   - What was wrong: `moneko-web/public/robots.txt` referenced missing `sitemap-images.xml` and `rss.xml`.
   - Status: **Fixed** (now references only `https://moneko.io/sitemap.xml`).
   - Follow-up check: ensure `public/sitemap.xml` is deployed at that exact URL on Firebase App Hosting.

3. **Canonical domain inconsistency (moneko.ai vs moneko.io)**

   - What was wrong: `/help` used the wrong canonical domain.
   - Status: **Fixed** in `moneko-web/src/routes/help.tsx`.
   - Remaining risk: reintroductions elsewhere. Add a CI check to fail if `moneko.ai` appears anywhere in `moneko-web/src`.

4. **Programmatic/variant page canonical + meta not slug-specific**
   - What was wrong: `/budgeting-app/$slug` wasn’t reliably deriving canonical/meta from the slug.
   - Status: **Fixed** in `moneko-web/src/routes/budgeting-app/$slug.tsx` using route `loader` + `head({ params, loaderData })`.

## High Impact Opportunities

1. **Normalize “indexability” rules and keep private app pages out of search**

   - Already present: `moneko-web/src/routes/dashboard/route.tsx` sets `robots: noindex, nofollow`.
   - Recommendation:
     - Ensure every authenticated/dashboard route inherits that directive (either via a shared dashboard layout head, or explicit per-route head).
     - Confirm `/dashboard/*` is not in `public/sitemap.xml`. If it is, remove it.

2. **Sitemap hygiene + automation**

   - Current: `moneko-web/public/sitemap.xml` is large and includes content routes. Script exists: `moneko-web/scripts/update-sitemap.js` (and GEO data in `src/data/landing-pages/geo-pages.json`).
   - Recommendations:
     - Ensure every URL in sitemap has a canonical, indexable page that returns 200 and a stable `<title>`.
     - Avoid including auth and transactional pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/*`, `/checkout/*`, `/payment-status`, `/unsubscribe`) unless you deliberately want them indexed.
     - Add a simple periodic task (even manual weekly) to regenerate sitemap and update `lastmod` based on real content changes.

3. **Tighten and de-risk JSON-LD claims (trust + E-E-A-T)**

   - Issue: some structured data includes **specific ratings, review counts, permissions, screenshots, and market integration claims** that may not be verifiable.
   - Why it matters:
     - Google can treat misleading schema as spam and ignore it.
     - AI systems are increasingly sensitive to “too-good-to-be-true” claims.
   - Where: check `moneko-web/src/routes/budgeting-app/$slug.tsx` and similar pages for `AggregateRating`, reviews, and feature claims.
   - Recommendation:
     - Remove or ground any claims you cannot back with public sources.
     - If you keep ratings/reviews, point to a verifiable source (ex: App Store/Play store listing URL) and use accurate values.

4. **Make the content system “answer-first” for AI Overview / Perplexity**

   - Strength already present:
     - Questions pages (`/questions/*`) + FAQ schema.
     - Guides (`/guides/*`) and calculators.
     - Help Center with large FAQ surface.
   - Recommendations:
     - Add a 1-2 sentence “Direct answer” block at the top of every `/questions/*` and key guides.
     - Add a small “Key takeaways” list (3-5 bullets) near the top.
     - Add “Assumptions” and “Example” sections for calculators/guides.

5. **Improve internal linking to reinforce topical clusters**

   - Current assets to cluster:
     - Budgeting: `/budgeting-app/*`, `/questions/*` budget/debt, calculators.
     - Investing: `/guides/*` investing, calculators, related blog posts.
     - Retirement: `/guides/how-much-do-i-need-to-retire`, `/calculators/retirement-calculator`, related questions.
   - Recommendation:
     - Add “Related” blocks on:
       - `/guides/*` linking to 2-4 relevant questions and calculators.
       - `/calculators/*` linking to 2-4 relevant guides.
       - `/questions/*` linking to a deeper guide + relevant calculator.

6. **Open Graph consistency audit**
   - Current: `moneko-web/src/utils/seo.ts` generates OG/Twitter meta.
   - Recommendation:
     - Ensure every public route uses it (including GEO pages and programmatic pages).
     - Ensure OG images are valid and sized consistently (at least 1200x630).

## AI Answer Optimization

1. **Fix `llm.txt` tone and maintainability**

   - Current: `moneko-web/public/llm.txt` is very long and includes dated “2025” positioning and a few claims that read promotional or unbounded.
   - Recommendation:
     - Split into:
       - A short “What is Moneko” + “What problems it solves” + “Key links” section.
       - A compact index of authoritative pages (help center, guides hub, calculators hub, pricing, features).
     - Remove unverifiable statements (ex: “real-time market integration” unless true and documented).
     - Keep it stable and updated quarterly.

2. **Add citation hooks to key pages**

   - Add explicit, quotable snippets:
     - Definitions (1 sentence)
     - A simple formula (where applicable)
     - A minimal step-by-step checklist
     - A “common mistakes” bullet list
   - AI systems often lift these blocks verbatim.

3. **Add source references for factual claims**
   - For any stats (inflation, average rates, IRS limits, etc.), link to primary sources (IRS, CFPB, BLS, Federal Reserve).
   - This improves both Google quality scoring and AI citation likelihood.

## Content Gaps

1. **Pillar hubs (category index pages) that link to existing depth**

   - Create (or enhance if they exist):
     - `/guides` as a true hub grouped by topic (budgeting, debt, investing, retirement, home-buying).
     - `/questions` grouped by topic.
     - `/calculators` grouped by intent.
   - Goal: reduce orphaning and clarify topical authority.

2. **Comparison / alternatives coverage (high-intent)**

   - You already have variant pages in `/budgeting-app/*` that look like “alternatives”. Ensure they are:
     - Actually unique and helpful.
     - Clearly disclosed (comparison methodology).
     - Not thin/duplicative.

3. **Trust pages that AI systems cite**
   - Add or strengthen:
     - “Methodology” page for calculators/assumptions.
     - “Editorial policy” for guides/questions.
     - “Privacy/security” plain-English page (separate from legal policy).

## Maintenance & Monitoring

1. **Search Console + sitemap monitoring**

   - Confirm GSC is connected.
   - Watch:
     - Indexing coverage (excluded, discovered currently not indexed)
     - Rich results reports (FAQ/HowTo/Article)
     - Crawl stats + server response issues

2. **Schema validation spot-check**

   - After the `scripts` fix, validate a sample set of pages with:
     - Google Rich Results Test
     - Schema Markup Validator
   - Fix errors, remove risky schema.

3. **Content freshness loop**
   - Quarterly: update top 10 pages by impressions.
   - Add/update `lastmod` for those pages in sitemap.

## Quick Reference Checklist

- [ ] Verify JSON-LD appears in SSR output on key routes (home, questions, guides, budgeting-app slug)
- [ ] Ensure all dashboard/auth/checkout pages are `noindex` and not included in sitemap
- [ ] Remove or validate any schema claims that cannot be publicly verified
- [ ] Tighten `public/llm.txt` (shorter, factual, updated)
- [ ] Add “Direct answer” + “Key takeaways” blocks to questions/guides
- [ ] Strengthen internal linking between guides, questions, calculators
- [ ] Ensure OG tags and OG image URLs are correct for every public route
- [ ] Confirm GSC + sitemap health, monitor rich results errors monthly
