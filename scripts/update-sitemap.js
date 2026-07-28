#!/usr/bin/env node

import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_URL =
  "https://pbopcsmrcykdzbilpilf.supabase.co/functions/v1/sitemap-generator/sitemap.xml";
const OUTPUT_PATH = path.join(__dirname, "..", "public", "sitemap.xml");
const GEO_DATA_PATH = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "landing-pages",
  "geo-pages.json",
);
const BUDGETING_APP_VARIANTS_PATH = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "home",
  "passive-income-variants.json",
);

async function updateSitemap() {
  try {
    console.log("🚀 Starting sitemap update process...");

    const baseXml = await loadBaseSitemap();

    const sitemapWithGeoPages = mergeGeoLandingPages(baseXml, loadGeoPages());

    const sitemapWithBudgetingVariants = mergeBudgetingAppVariants(
      sitemapWithGeoPages,
      loadBudgetingAppVariants(),
    );

    const cleanedSitemap = filterNonPublicUrls(sitemapWithBudgetingVariants);

    const finalSitemap = dedupeSitemapUrls(
      mergeFixedPublicUrls(cleanedSitemap),
    );

    writeFileWithBackup(OUTPUT_PATH, finalSitemap);

    const urlMatches = finalSitemap.match(/<url>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;

    console.log(`🎉 Sitemap update completed successfully!`);
    console.log(`📊 Updated ${urlCount} URLs in sitemap.xml`);
  } catch (error) {
    console.error("❌ Sitemap update failed:", error.message);

    const backupPath = `${OUTPUT_PATH}.backup`;
    if (fs.existsSync(backupPath)) {
      console.log("🔄 Restoring from backup...");
      fs.copyFileSync(backupPath, OUTPUT_PATH);
      console.log("✅ Backup restored");
    }

    process.exit(1);
  }
}

async function loadBaseSitemap() {
  const localXml = fs.existsSync(OUTPUT_PATH)
    ? fs.readFileSync(OUTPUT_PATH, "utf8")
    : null;

  if (localXml) {
    validateXML(localXml);
  }

  try {
    const remoteXml = await fetchXML(SITEMAP_URL);
    validateXML(remoteXml);

    if (localXml && getUrlCount(localXml) >= getUrlCount(remoteXml)) {
      console.log(
        "✅ Using local sitemap as base because it contains more URLs",
      );
      return localXml;
    }

    console.log("✅ Using remote sitemap as base");
    return remoteXml;
  } catch (error) {
    console.log(
      `⚠️ Remote sitemap unavailable, falling back to local file: ${error.message}`,
    );

    if (!localXml) {
      throw new Error("Local sitemap fallback not found");
    }

    console.log("✅ Using local sitemap as base");
    return localXml;
  }
}

function fetchXML(url) {
  return new Promise((resolve, reject) => {
    console.log(`🌐 Fetching sitemap from: ${url}`);

    const request = https.get(url, (response) => {
      let data = "";

      if (response.statusCode !== 200) {
        reject(
          new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
        );
        return;
      }

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        console.log(`✅ Successfully fetched ${data.length} characters`);
        resolve(data);
      });
    });

    request.on("error", (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error("Request timeout after 10 seconds"));
    });
  });
}

function validateXML(content) {
  if (!content.includes("<urlset") || !content.includes("</urlset>")) {
    throw new Error("Invalid XML: Missing urlset tags");
  }

  if (
    !content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  ) {
    throw new Error("Invalid XML: Missing sitemap namespace");
  }

  return true;
}

function writeFileWithBackup(filePath, content) {
  console.log(`💾 Writing sitemap to: ${filePath}`);

  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`📋 Created backup: ${backupPath}`);
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log("✅ Successfully updated sitemap.xml");
}

function loadGeoPages() {
  const raw = fs.readFileSync(GEO_DATA_PATH, "utf8");
  const parsed = JSON.parse(raw);

  return Object.values(parsed)
    .filter(
      (page) =>
        page.slug && page.slug !== "main" && page.slug !== "best-budgeting-app",
    )
    .map((page) => ({
      slug: page.slug,
      // Only emit <lastmod> when we have a specific, intentional value.
      lastmod: page.sitemapLastmod ?? undefined,
      changefreq: page.sitemapChangefreq ?? "weekly",
      priority: page.sitemapPriority ?? "0.9",
    }));
}

function loadBudgetingAppVariants() {
  const raw = fs.readFileSync(BUDGETING_APP_VARIANTS_PATH, "utf8");
  const parsed = JSON.parse(raw);

  return Object.keys(parsed)
    .filter(
      (slug) => slug && slug !== "main" && slug !== "best-budgeting-app-2026",
    )
    .map((slug) => ({
      slug,
      changefreq: "weekly",
      priority: "0.9",
    }));
}

function mergeGeoLandingPages(xmlContent, geoPages) {
  const existingUrls = new Set(
    [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
  );

  const geoEntries = geoPages
    .map((page) => ({
      page,
      url: `https://moneko.io/${page.slug}`,
    }))
    .filter((item) => !existingUrls.has(item.url))
    .map((item) => buildUrlEntry(item.url, item.page));

  if (geoEntries.length === 0) {
    console.log("ℹ️ No new GEO landing-page URLs to append");
    return xmlContent;
  }

  console.log(
    `➕ Adding ${geoEntries.length} GEO landing-page URLs from shared data`,
  );
  return xmlContent.replace("</urlset>", `${geoEntries.join("\n")}</urlset>`);
}

function mergeBudgetingAppVariants(xmlContent, variants) {
  const existingUrls = new Set(
    [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
  );

  const entries = variants
    .map((page) => ({
      page,
      url: `https://moneko.io/budgeting-app/${page.slug}`,
    }))
    .filter((item) => !existingUrls.has(item.url))
    .map((item) => buildUrlEntry(item.url, item.page));

  if (entries.length === 0) {
    console.log("ℹ️ No new budgeting-app variant URLs to append");
    return xmlContent;
  }

  console.log(`➕ Adding ${entries.length} budgeting-app variant URLs`);
  return xmlContent.replace("</urlset>", `${entries.join("\n")}</urlset>`);
}

function mergeFixedPublicUrls(xmlContent) {
  const existingUrls = new Set(
    [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
      normalizeSitemapUrl(match[1]),
    ),
  );

  const fixedPages = [
    {
      url: "https://moneko.io/solutions",
      page: {
        changefreq: "weekly",
        priority: "0.9",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals",
      page: {
        changefreq: "weekly",
        priority: "0.9",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples",
      page: {
        changefreq: "weekly",
        priority: "0.9",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/how-to-start-budgeting",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/financial-goals-for-individuals",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/the-50-30-20-budget-rule",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/zero-based-budgeting",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/how-to-track-expenses",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/how-to-stop-overspending",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/building-an-emergency-fund",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-individuals/how-to-create-a-monthly-budget",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/how-to-split-bills-fairly",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/joint-vs-separate-bank-accounts",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/financial-goals-for-couples",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/wedding-budget-guide",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/shared-credit-cards",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/moving-in-together",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/budgeting-after-having-a-baby",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/saving-for-your-childrens-education",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/building-an-emergency-fund",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/solutions/budgeting-for-couples/household-expenses",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/guides",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/early-access",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
    {
      url: "https://moneko.io/referral",
      page: {
        changefreq: "weekly",
        priority: "0.7",
      },
    },
    ...[
      "best-apps-for-couples-to-manage-money-in-2026",
      "best-bill-splitting-apps-in-2026",
      "best-budget-apps-for-adhd-in-2026",
      "best-budget-apps-for-freelancers-in-2026",
      "best-free-budget-apps-in-2026",
      "moneko-vs-goodbudget-2026",
      "moneko-vs-honeydue-2026",
      "moneko-vs-splid-2026",
      "moneko-vs-splitwise-2026",
      "moneko-vs-ynab-2026",
    ].map((slug) => ({
      url: `https://moneko.io/blogs/${slug}`,
      page: {
        lastmod: "2026-07-28",
        changefreq: "weekly",
        priority: "0.8",
      },
    })),
  ];

  const entries = fixedPages
    .filter((item) => !existingUrls.has(normalizeSitemapUrl(item.url)))
    .map((item) => buildUrlEntry(item.url, item.page));

  if (entries.length === 0) return xmlContent;

  console.log(`➕ Adding ${entries.length} fixed public URLs`);
  return xmlContent.replace("</urlset>", `${entries.join("\n")}</urlset>`);
}

function normalizeSitemapUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function buildUrlEntry(url, page) {
  const lines = ["  <url>", `    <loc>${url}</loc>`];

  if (page.lastmod) {
    lines.push(`    <lastmod>${page.lastmod}</lastmod>`);
  }

  lines.push(
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${page.priority}</priority>`,
    "  </url>",
  );

  return lines.join("\n");
}

function filterNonPublicUrls(xmlContent) {
  const nonPublicPathPatterns = [
    /^\/dashboard(?:\/|$)/,
    /^\/auth(?:\/|$)/,
    /^\/login(?:\/|$)/,
    /^\/register(?:\/|$)/,
    /^\/reset-password(?:\/|$)/,
    /^\/forgot-password(?:\/|$)/,
    /^\/checkout(?:\/|$)/,
    /^\/payment-status(?:\/|$)/,
    /^\/billing(?:\/|$)/,
    /^\/unsubscribe(?:\/|$)/,
    /^\/promo(?:\/|$)/,
    /^\/onboarding(?:\/|$)/,
    /^\/invites(?:\/|$)/,
    /^\/referral\/.+/,
    /^\/creator(?:\/|$)/,
    /^\/plaid(?:\/|$)/,
    /^\/oauth(?:\/|$)/,
    /^\/verify-telegram(?:\/|$)/,
    /^\/verify-whatsapp(?:\/|$)/,
    /^\/avatar-customizer(?:\/|$)/,
    /^\/health(?:\/|$)/,
    /^\/test(?:\/|$)/,
    /^\/best-budgeting-app$/,
    /^\/budgeting-app\/best-budgeting-app-2026$/,
  ];

  const urlBlocks = [...xmlContent.matchAll(/<url>[\s\S]*?<\/url>/g)].map(
    (m) => m[0],
  );

  if (urlBlocks.length === 0) return xmlContent;

  const kept = [];
  let removed = 0;

  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>(.*?)<\/loc>/);

    if (!locMatch) {
      kept.push(block);
      continue;
    }

    try {
      const url = new URL(locMatch[1]);
      const isNonPublic = nonPublicPathPatterns.some((re) =>
        re.test(url.pathname),
      );

      if (isNonPublic) {
        removed += 1;
      } else {
        kept.push(block);
      }
    } catch {
      // If the URL is malformed, keep it rather than producing an invalid sitemap.
      kept.push(block);
    }
  }

  if (removed > 0) {
    console.log(`🧹 Removed ${removed} non-public URLs from sitemap`);
  }

  // Preserve the original <urlset ...> opening tag to keep namespaces intact.
  const openTagMatch = xmlContent.match(/<urlset[^>]*>/);
  const openTag = openTagMatch
    ? openTagMatch[0]
    : '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  return `${xmlContent.split(openTag)[0]}${openTag}\n${kept.join("\n")}\n</urlset>`;
}

function dedupeSitemapUrls(xmlContent) {
  const urlBlocks = [...xmlContent.matchAll(/<url>[\s\S]*?<\/url>/g)].map(
    (match) => match[0],
  );
  const uniqueBlocks = new Map();

  for (const block of urlBlocks) {
    const location = block.match(/<loc>(.*?)<\/loc>/)?.[1];
    if (!location) continue;

    const existing = uniqueBlocks.get(location);
    const existingLastmod = existing?.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
    const candidateLastmod = block.match(/<lastmod>(.*?)<\/lastmod>/)?.[1];

    if (!existing || (candidateLastmod ?? "") > (existingLastmod ?? "")) {
      uniqueBlocks.set(location, block);
    }
  }

  const removed = urlBlocks.length - uniqueBlocks.size;
  if (removed > 0) {
    console.log(`🧹 Removed ${removed} duplicate sitemap URL(s)`);
  }

  const withoutUrls = xmlContent.replace(/<url>[\s\S]*?<\/url>\s*/g, "");
  return withoutUrls.replace(
    "</urlset>",
    `${[...uniqueBlocks.values()].join("\n")}\n</urlset>`,
  );
}

function getUrlCount(xmlContent) {
  const matches = xmlContent.match(/<url>/g);
  return matches ? matches.length : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateSitemap();
}

export { updateSitemap };
