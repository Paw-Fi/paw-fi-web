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

    const finalSitemap = mergeFixedPublicUrls(cleanedSitemap);

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
    .filter((page) => page.slug && page.slug !== "main")
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
    .filter((slug) => slug && slug !== "main")
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
    [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]),
  );

  const fixedPages = [
    {
      url: "https://moneko.io/guides",
      page: {
        changefreq: "weekly",
        priority: "0.8",
      },
    },
  ];

  const entries = fixedPages
    .filter((item) => !existingUrls.has(item.url))
    .map((item) => buildUrlEntry(item.url, item.page));

  if (entries.length === 0) return xmlContent;

  console.log(`➕ Adding ${entries.length} fixed public URLs`);
  return xmlContent.replace("</urlset>", `${entries.join("\n")}</urlset>`);
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
    /^\/early-access(?:\/|$)/,
    /^\/promo(?:\/|$)/,
    /^\/onboarding(?:\/|$)/,
    /^\/invites(?:\/|$)/,
    /^\/referral(?:\/|$)/,
    /^\/creator(?:\/|$)/,
    /^\/plaid(?:\/|$)/,
    /^\/oauth(?:\/|$)/,
    /^\/verify-telegram(?:\/|$)/,
    /^\/verify-whatsapp(?:\/|$)/,
    /^\/avatar-customizer(?:\/|$)/,
    /^\/health(?:\/|$)/,
    /^\/test(?:\/|$)/,
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

function getUrlCount(xmlContent) {
  const matches = xmlContent.match(/<url>/g);
  return matches ? matches.length : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateSitemap();
}

export { updateSitemap };
