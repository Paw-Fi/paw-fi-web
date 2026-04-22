# SEO + AI Visibility Audit: Moneko

## Summary

Moneko is a TanStack Router + React marketing site for an AI budgeting app focused on chat-based expense capture, shared budgets, wallets, pockets, and guided finance workflows. Overall SEO health is **B-**: the crawl/index foundations are stronger than average, but the homepage still hides some of its best explanatory content and several public pages can do a better job answering intent directly for both Google and AI systems.

The single most impactful fix is to make the homepage's product-summary content visible instead of keeping it in a screen-reader-only block. That content is already well structured in `src/components/homepage/v2/product-overview-section.tsx`; surfacing it would improve human comprehension, snippet eligibility, and AI-answer extraction at the same time.

## Critical Issues (fix immediately)

### 1. Important homepage explainer content is hidden from sighted users

**What's wrong:** `src/components/homepage/v2/product-overview-section.tsx` contains one of the clearest direct-answer sections on the site, but the whole section is wrapped in `sr-only`. That makes the homepage visually weaker for users and less likely to win snippets or AI citations from visible, scannable content.

**Where:** `src/components/homepage/v2/product-overview-section.tsx`

**How to fix:** Remove `sr-only` and restyle the section as a visible overview block on `/`. At minimum, surface the intro, the six product-area cards, and one comparison or capture block.

### 2. Homepage headings were reading like keyword clusters instead of natural answers

**What's wrong:** Several homepage section titles were technically valid but too stiff and keyword-dense, which weakens readability and makes the page feel more optimized for search engines than for people.

**Where:**

- `src/components/homepage/v2/hero-v2.tsx`
- `src/components/homepage/v2/features-section.tsx`
- `src/components/homepage/v2/capture-section.tsx`
- `src/components/homepage/v2/how-it-works-section.tsx`
- `src/components/homepage/v2/comparison-table.tsx`
- `src/components/homepage/new/faq-section.tsx`
- `src/components/homepage/user-community-showcase.tsx`
- `src/components/performance/home-page-route-component.tsx`

**How to fix:** Keep one clear intent phrase per heading, shorten the sentence, and make it read like a natural promise. I applied those copy updates in code now.

## High Impact Opportunities

### 1. Add visible internal links from the homepage comparison block to alternative pages

You already have comparison-intent pages like `/$slug` entries for `ynab-alternative`, `monarch-money-alternative`, and `expense-tracker-for-couples` in `src/data/landing-pages/geo-pages.json`, but the homepage comparison table does not send users or crawlers into that cluster.

**Fix:** Add inline links or CTA rows from `src/components/homepage/v2/comparison-table.tsx` to:

- `/ynab-alternative`
- `/monarch-money-alternative`
- `/expense-tracker-for-couples`

### 2. Consolidate analytics so pageview data is trustworthy

There are multiple GA-related touchpoints: inline `gtag` in `src/routes/__root.tsx`, `ReactGA` pageviews in `src/components/google-tag-manager.tsx`, and Vite Radar in `vite.config.ts`.

**Fix:** Keep one source of truth for GA initialization and one source of pageview events. Right now measurement is likely noisy, which makes SEO decisions harder.

### 3. Add Search Console verification and keep it in code

I found GA wiring, but no obvious Google Search Console verification meta tag or verification file.

**Fix:** Add the verification tag in the root head or a verification file in `public/`. Then submit `https://moneko.io/sitemap.xml` inside GSC.

### 4. Ship an RSS feed for blog distribution

The blog index exists at `src/routes/blogs/index.tsx`, but I did not find `rss.xml`, `feed.xml`, or an Atom route in `public/` or `src/routes/`.

**Fix:** Generate `public/rss.xml` from the same blog source used by `loadStaticBlogs()` and link it from the blog index head.

### 5. Surface author and expertise signals on public content

You have a hidden byline-like source in `src/data/home/moneko-product-summary.ts`, but the public marketing pages still lean more product-led than expert-led.

**Fix:** Add visible bylines and lightweight author boxes on blogs, guides, and major query pages. Link them to `/team` or dedicated author pages.

### 6. Use the questions hub as a stronger link target from the homepage

`/questions`, `/guides`, `/calculators`, `/blogs`, and `/features/*` create a good topical structure, but the homepage pushes feature discovery harder than problem discovery.

**Fix:** Add one homepage block or footer-adjacent strip linking to top question clusters such as budgeting, debt, retirement, and net worth.

## AI Answer Optimization

### Make direct answers visible above the fold

The hidden product overview already contains strong question-first copy like "What does Moneko do?" and "How can you add transactions in Moneko?". Make that content visible so AI systems have clean, attributable answer blocks on the homepage.

### Add a short TL;DR block under the hero

Use 3 bullets immediately below the hero:

- Track expenses from chat, receipts, and voice notes
- Organize spending into pockets and shared budgets
- Ask Moneko what changed before the month gets away from you

### Turn homepage proof into quotable facts

`src/components/homepage/user-community-showcase.tsx` has strong social proof, but it is light on verifiable framing.

**Fix:** Add one sentence that pairs the rating with the review count and source, for example: "Rated 4.9/5 from X public App Store reviews as of April 2026." Use the exact count available in code or data.

### Keep comparison language explicit

The site already targets comparison intent. Expand that by using visible phrases like "YNAB alternative", "Monarch Money alternative", and "expense tracker for couples" in internal anchor text instead of generic "learn more" links.

### Prefer answer-first intros on guides and questions pages

Your query pages in `src/data/landing-pages/geo-pages.json` already do this well. Apply the same pattern consistently to guides and blog posts: answer the question in the first two sentences, then explain.

### Add citations or concrete benchmarks where possible

AI systems cite pages more often when they contain concrete facts. Where you mention ratings, supported platforms, or product behaviors, back them with counts, dates, or source references when available.

## Content Gaps

### 1. Copilot Money alternative page

**Intent:** High-intent comparison traffic from users switching budgeting apps.

You already cover YNAB and Monarch-style intent. Add a `/copilot-money-alternative` page using the same query-page format.

### 2. Quicken Simplifi alternative page

**Intent:** Mid-to-high commercial comparison traffic.

The homepage comparison UI already compares against Simplifi, but there is no matching dedicated query page visible in the landing-page data.

### 3. WhatsApp budgeting guide

**Intent:** Informational + product-led problem solving.

Create a guide like `/guides/how-to-track-expenses-in-whatsapp` and link it from the WhatsApp feature page and homepage.

### 4. Apple Wallet and Android notification tracking explainer pages

**Intent:** Device-specific long-tail queries with strong AI-answer potential.

Suggested pages:

- `/guides/how-to-track-apple-wallet-spending`
- `/guides/how-to-track-expenses-from-android-notifications`

### 5. Shared expenses workflow page

**Intent:** Couples and household budgeting queries.

You already have `/couple-budgeting` and the household feature page. Add a practical guide focused on the workflow itself, such as "how to split household expenses without mixing personal spending".

## Maintenance & Monitoring

- Refresh blog and guide pages that still show 2025 dates in `public/sitemap.xml` if they remain strategic.
- Re-run the sitemap build whenever new public routes or geo pages ship.
- Track impressions and CTR in Search Console by page type: home, feature, comparison, guide, question, calculator.
- Review internal linking quarterly so new guides and comparison pages are linked from the homepage, footer, and related pages.
- Maintain `public/llm.txt`; it is a good GEO asset and already cleaner than most sites.
- Track whether AI-answer visibility improves after making direct-answer blocks visible on the homepage.

## Quick Reference Checklist

- [ ] Make `src/components/homepage/v2/product-overview-section.tsx` visible on the homepage
- [ ] Keep homepage headings short, natural, and intent-led
- [ ] Link homepage comparison content to `/ynab-alternative`, `/monarch-money-alternative`, and `/expense-tracker-for-couples`
- [ ] Add Google Search Console verification
- [ ] Consolidate GA pageview tracking across `__root.tsx`, `google-tag-manager.tsx`, and `vite.config.ts`
- [ ] Generate `rss.xml` for the blog
- [ ] Add visible author/byline signals on guides, blogs, and major landing pages
- [ ] Add a visible TL;DR block below the homepage hero
- [ ] Add quotable proof statements with dates and counts
- [ ] Create dedicated Copilot and Simplifi alternative pages
