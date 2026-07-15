import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const pages = JSON.parse(read("src/data/landing-pages/geo-pages.json"));
const comparisonPage = pages["budgeting-app-2026"];
const freePage = pages["free-budgeting-app"];
const splitwisePage = pages["splitwise-alternative"];

test("commercial-intent pages have distinct editorial ownership", () => {
  assert.equal(comparisonPage.pageVariant, "editorialComparison");
  assert.equal(freePage.pageVariant, "editorialComparison");
  assert.notEqual(comparisonPage.title, freePage.title);
  assert.notEqual(comparisonPage.description, freePage.description);
  assert.equal(comparisonPage.editorialComparison.apps.length, 11);
  assert.equal(freePage.editorialComparison.apps.length, 8);
  assert.doesNotMatch(freePage.eyebrow, /independent/i);

  for (const page of [comparisonPage, freePage, splitwisePage]) {
    const answerWordCount = page.pageDescription.trim().split(/\s+/).length;
    assert.ok(answerWordCount >= 40 && answerWordCount <= 60);
    assert.ok(page.editorialComparison.disclosure.includes("Moneko publishes"));
    assert.ok(page.editorialComparison.methodology.length >= 3);
    assert.ok(page.faqItems.length >= 5);

    assert.ok(page.title.length >= 30 && page.title.length <= 65);
    assert.ok(page.description.length >= 120 && page.description.length <= 160);
    assert.match(JSON.stringify(page.sections), /privacy/i);
    assert.ok(
      page.resourceLinks.some((link) => link.href === "/privacy-policy"),
    );

    const updatedAt = new Date(
      `${page.editorialComparison.updatedAt}T00:00:00Z`,
    );
    const now = new Date();
    const ageInDays = (now - updatedAt) / (24 * 60 * 60 * 1000);
    assert.ok(ageInDays >= -1 && ageInDays <= 120);

    for (const app of page.editorialComparison.apps) {
      assert.match(app.sourceUrl, /^https:\/\//);
      assert.equal(app.priceVerifiedAt, "2026-07-15");
      assert.ok(app.strengths.length >= 2);
      assert.ok(app.limitations.length >= 2);
    }
  }
});

test("Splitwise intent has a dedicated source-backed comparison", () => {
  assert.equal(splitwisePage.pageVariant, "editorialComparison");
  assert.match(splitwisePage.title, /Splitwise Alternative/i);
  assert.match(splitwisePage.keywords, /apps like Splitwise/i);

  const answerWordCount = splitwisePage.pageDescription
    .trim()
    .split(/\s+/).length;
  assert.ok(answerWordCount >= 40 && answerWordCount <= 60);
  assert.deepEqual(
    splitwisePage.editorialComparison.apps.map((app) => app.name),
    ["Moneko", "Splitwise"],
  );

  const splitwise = splitwisePage.editorialComparison.apps[1];
  assert.equal(splitwise.freePlanType, "freemium");
  assert.match(splitwise.price, /daily expense limit/i);
  assert.match(
    splitwise.sourceUrl,
    /^https:\/\/(?:secure\.|feedback\.)?splitwise\.com/,
  );
  assert.match(JSON.stringify(splitwise.limitations), /full.*budget/i);
  assert.match(
    JSON.stringify(splitwisePage),
    /does not currently document a one-click Splitwise import/i,
  );

  for (const page of [comparisonPage, freePage]) {
    assert.ok(
      page.editorialComparison.apps.some((app) => app.name === "Splitwise"),
    );
    assert.ok(
      page.resourceLinks.some((link) => link.href === "/splitwise-alternative"),
    );
  }
});

test("Moneko free-plan claims are permanent and explicit", () => {
  const freeText = JSON.stringify(freePage);
  assert.match(freeText, /permanent free plan/i);
  assert.match(freeText, /up to two Spaces/i);
  assert.match(freeText, /up to two Wallets/i);
  assert.match(freeText, /WhatsApp and Telegram capture/i);
  const monekoFree = freePage.editorialComparison.apps.find(
    (app) => app.name === "Moneko",
  );
  assert.equal(monekoFree.freePlanType, "freeForever");
  assert.doesNotMatch(monekoFree.price, /trial/i);

  const homeFaq = read("src/data/home/home-faq.json");
  const schema = read("src/utils/app-schema.ts");
  const pricingRoute = read("src/routes/pricing.tsx");
  const llms = read("public/llms.txt");
  assert.match(homeFaq, /Moneko Free is a permanent plan/);
  assert.match(schema, /name: "Moneko Free"/);
  assert.match(schema, /price: "0"/);
  assert.match(pricingRoute, /lowPrice: "0"/);
  assert.match(llms, /permanent free plans, freemium plans, and trials/);
});

test("query landing pages render one query-first main and aligned FAQs", () => {
  const route = read("src/routes/$slug.tsx");
  const component = read("src/components/geo/query-landing-page.tsx");

  assert.equal((route.match(/<main\b/g) ?? []).length, 1);
  assert.equal((component.match(/<main\b/g) ?? []).length, 0);
  assert.doesNotMatch(route, /HeroV2/);
  assert.ok(
    route.indexOf("<QueryLandingPage") <
      route.indexOf("<MobileAppPreviewCarousel"),
  );
  assert.match(route, /showIntro/);
  assert.match(route, /mainEntity: loaderData\.faqItems\.map/);
  assert.match(route, /faqItems=\{page\.faqItems\}/);
  assert.match(route, /"@type": "Article"/);
  assert.match(route, /`\$\{pageUrl\}#rankings`/);
  assert.match(route, /breadcrumb: \{ "@id": `\$\{pageUrl\}#breadcrumb` \}/);
  assert.match(route, /item: \{[\s\S]+"@type": "SoftwareApplication"/);
  assert.match(
    route,
    /createMonekoFreeOffer\("https:\/\/moneko\.io\/pricing"\)/,
  );

  const schema = read("src/utils/app-schema.ts");
  assert.match(schema, /ratingCount: APP_STORE_REVIEW_COUNT/);
  assert.doesNotMatch(schema, /TOTAL_REVIEW_COUNT/);
  assert.match(component, /App Store ratings/);
});

test("retired competing URLs redirect and stay out of discovery files", () => {
  const rootRoute = read("src/routes/$slug.tsx");
  const nestedRoute = read("src/routes/budgeting-app/$slug.tsx");
  const sitemap = read("public/sitemap.xml");
  const llms = read("public/llms.txt");
  const sitemapScript = read("scripts/update-sitemap.js");
  const geoLibrary = read("src/lib/geo-landing-pages.ts");
  const aiPolicy = read("public/.well-known/ai.txt");
  const robots = read("public/robots.txt");

  assert.match(rootRoute, /best-budgeting-app[\s\S]+statusCode: 301/);
  assert.match(nestedRoute, /best-budgeting-app-2026[\s\S]+statusCode: 301/);
  assert.doesNotMatch(
    sitemap,
    /<loc>https:\/\/moneko\.io\/best-budgeting-app<\/loc>/,
  );
  assert.doesNotMatch(
    sitemap,
    /\/budgeting-app\/best-budgeting-app-2026<\/loc>/,
  );
  assert.match(sitemap, /<loc>https:\/\/moneko\.io\/budgeting-app-2026<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/moneko\.io\/free-budgeting-app<\/loc>/);
  assert.match(
    sitemap,
    /<loc>https:\/\/moneko\.io\/splitwise-alternative<\/loc>/,
  );
  assert.doesNotMatch(llms, /https:\/\/moneko\.io\/best-budgeting-app(?:\s|$)/);
  assert.match(sitemapScript, /best-budgeting-app-2026/);
  assert.match(geoLibrary, /retiredGeoLandingPageSlugs/);
  assert.match(geoLibrary, /"best-budgeting-app"/);
  assert.doesNotMatch(
    aiPolicy,
    /https:\/\/moneko\.io\/best-budgeting-app(?:\s|$)/,
  );
  assert.doesNotMatch(aiPolicy, /Free budgeting app trial/i);
  assert.match(aiPolicy, /https:\/\/moneko\.io\/splitwise-alternative/);
  assert.match(robots, /Allow: \/splitwise-alternative/);

  const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(sitemapUrls).size, sitemapUrls.length);
});
