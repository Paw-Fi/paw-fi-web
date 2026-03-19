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

async function updateSitemap() {
  try {
    console.log("🚀 Starting sitemap update process...");

    const baseXml = await loadBaseSitemap();

    const sitemapWithGeoPages = mergeGeoLandingPages(baseXml, loadGeoPages());

    writeFileWithBackup(OUTPUT_PATH, sitemapWithGeoPages);

    const urlMatches = sitemapWithGeoPages.match(/<url>/g);
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
      lastmod: page.sitemapLastmod ?? new Date().toISOString().slice(0, 10),
      changefreq: page.sitemapChangefreq ?? "weekly",
      priority: page.sitemapPriority ?? "0.9",
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

function buildUrlEntry(url, page) {
  return [
    "  <url>",
    `    <loc>${url}</loc>`,
    `    <lastmod>${page.lastmod}</lastmod>`,
    `    <changefreq>${page.changefreq}</changefreq>`,
    `    <priority>${page.priority}</priority>`,
    "  </url>",
  ].join("\n");
}

function getUrlCount(xmlContent) {
  const matches = xmlContent.match(/<url>/g);
  return matches ? matches.length : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateSitemap();
}

export { updateSitemap };
