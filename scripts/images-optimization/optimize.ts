import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import pLimit from "p-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/* ---------- ENV LOAD ---------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust if switching environments
const projectRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(projectRoot, ".env.production") });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Environment variables failed to load.");
}

console.log("Supabase Target:", process.env.SUPABASE_URL);

/* ---------- CLIENT ---------- */

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------- CONFIG ---------- */

const BUCKET = "expense-receipts";
const TABLE = "expenses";
const COLUMN = "receipt_image_url";

const CONCURRENCY = 4;   // ⭐ Safe deterministic testing
const DRY_RUN = false;

const limit = pLimit(CONCURRENCY);

/* ---------- HELPERS ---------- */

function extractPath(url: string | null) {
  if (!url) return null;
  if (!url.startsWith("http")) return url;

  const idx = url.indexOf(`${BUCKET}/`);
  if (idx === -1) return null;

  return url.substring(idx + BUCKET.length + 1);
}

async function optimize(buffer: Buffer) {
  const metadata = await sharp(buffer).metadata();

  const optimized = await sharp(buffer)
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: metadata.format === "png" ? 72 : 70,
      mozjpeg: true,
      chromaSubsampling: "4:2:0",
    })
    .toBuffer();

  // Validate output image
  await sharp(optimized).metadata();

  return optimized;
}

/* ---------- PROCESS ---------- */

async function processRow(url: string) {
  const path = extractPath(url);
  if (!path) return { skipped: true };

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(path);

    if (error) throw error;

    const original = Buffer.from(await data.arrayBuffer());
    const optimized = await optimize(original);

    const originalSize = original.length;
    const newSize = optimized.length;
    const savings = (1 - newSize / originalSize) * 100;

    if (savings < 5) {
      console.log(`Skip ${path} (${savings.toFixed(1)}%)`);
      return { skipped: true };
    }

    if (!DRY_RUN) {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, optimized, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;
    }

    console.log(
      `✓ Replaced ${path} saved ${savings.toFixed(1)}% (${(originalSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB)`
    );

    return { processed: true, savings };

  } catch (err: any) {
    console.error(`✗ ${path}`, err.message);
    return { failed: true };
  }
}

/* ---------- FETCH ---------- */

async function fetchAll() {
  const page = 500;
  let from = 0;
  const urls: string[] = [];

  while (true) {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`${COLUMN}`)
      .not(COLUMN, "is", null)
      .range(from, from + page - 1);

    if (error) throw error;
    if (!data.length) break;

    urls.push(...data.map(r => r[COLUMN]));
    from += page;
  }

  // ⭐ Deduplicate identical storage objects
  return [...new Set(urls)];
}

/* ---------- RUN ---------- */

async function run() {
  const urls = await fetchAll();

  console.log(`Processing ${urls.length} unique images\n`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalSavings = 0;

  await Promise.all(
    urls.map(url =>
      limit(async () => {
        const res = await processRow(url);

        if (res?.processed) {
          processed++;
          totalSavings += res.savings;
        } else if (res?.failed) {
          failed++;
        } else {
          skipped++;
        }
      })
    )
  );

  console.log(`
Done
Processed: ${processed}
Skipped:   ${skipped}
Failed:    ${failed}
Avg savings: ${
    processed ? (totalSavings / processed).toFixed(1) : 0
  }%
`);
}

run();