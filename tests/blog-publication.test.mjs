import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { stripSourceMetadata } from "../src/data/blogs/strip-source-metadata.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const blogSlugs = [
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
];

const articleSources = [
  "Documentation/Best Apps for Couples to Manage Money in 2026 (Compared & Reviewed).md",
  "Documentation/Best Bill Splitting Apps in 2026 (Compared for Couples, Roommates & Travel).md",
  "Documentation/Best Budget Apps for ADHD in 2026.md",
  "Documentation/Best Budget Apps for Freelancers in 2026.md",
  "Documentation/Best Free Budget Apps in 2026_ Find the Right App for Your Money.md",
  "Documentation/Moneko AI vs. Goodbudget_ Which Budgeting App Is Better in 2026_.md",
  "Documentation/Moneko AI vs. Honeydue_ Which App Is Better for Couples_.md",
  "Documentation/Moneko AI vs. Splid_ Which Bill Splitting App Is Better in 2026_.md",
  "Documentation/Moneko AI vs. Splitwise_ Which Bill Splitting App Is Better_.md",
  "Documentation/Moneko AI vs. YNAB_ Which Budgeting App Is Better in 2026_.md",
];

test("new editorial blogs are published and discoverable", () => {
  const blogData = read("src/data/blogs/new-comparison-blogs-2026.ts");
  const blogRegistry = read("src/data/blogs/blogs.ts");
  const sitemap = read("public/sitemap.xml");
  const llms = read("public/llms.txt");
  const aiPolicy = read("public/.well-known/ai.txt");

  assert.match(blogData, /import \{ stripSourceMetadata \}/);
  assert.match(blogData, /hideCreditLabel: true/);
  assert.match(blogData, /content: stripSourceMetadata\(/);

  for (const slug of blogSlugs) {
    const url = `https://moneko.io/blogs/${slug}`;
    assert.match(blogData, new RegExp(`slug: "${slug}"`));
    assert.match(sitemap, new RegExp(`<loc>${url}</loc>`));
    assert.match(llms, new RegExp(url));
    assert.match(aiPolicy, new RegExp(url));
  }

  assert.match(blogRegistry, /NEW_COMPARISON_BLOGS_2026/);
});

test("source-only metadata never reaches rendered article content", () => {
  for (const source of articleSources) {
    const content = stripSourceMetadata(read(source));

    assert.doesNotMatch(content, /\*\*Meta (?:Title|Description):\*\*/);
    assert.doesNotMatch(content, /^# /m, `${source} retains a source H1`);
  }
});
