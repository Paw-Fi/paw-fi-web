import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("November articles publish their content, metadata, and matching covers", async () => {
  const server = await createServer({
    configFile: false,
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("../src", import.meta.url)),
        "@assets": fileURLToPath(new URL("../src/assets", import.meta.url)),
      },
    },
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { blogs } = await server.ssrLoadModule("/src/data/blogs/blogs.ts");
    const expected = [
      ["40-30-30-budgeting-rule", "The 40_30_30 Budget Rule.png"],
      ["60-20-20-budgeting-rule", "The 60_20_20 Budget Rule.png"],
      [
        "discretionary-income-definition-examples",
        "Understanding Discretionary Income.png",
      ],
      ["fixed-expenses-examples", "Fixed Expenses_ Examples and Budgeting.png"],
      [
        "gross-income-definition-calculation",
        "Gross Income Explained Simply.png",
      ],
      ["how-to-budget-for-a-trip", "How to Budget for a Trip.png"],
      [
        "choose-personal-finance-app",
        "How to Choose a Personal Finance App.png",
      ],
      [
        "how-to-find-and-cancel-unused-subscriptions",
        "Cancelling Unused Subscriptions Made Simple.png",
      ],
      ["how-to-pay-off-car-loan-faster", "Pay Off Your Car Loan Faster.png"],
      [
        "variable-expenses-definition-examples",
        "Variable Expenses_ A Cosy Budget Desk.png",
      ],
      ["what-is-financial-health", "Cute Financial Health Desk Dashboard.png"],
    ];

    for (const [slug, cover] of expected) {
      const matches = blogs.filter((blog) => blog.slug === slug);
      assert.equal(matches.length, 1, slug);
      const blog = matches[0];
      assert.ok(decodeURIComponent(blog.coverImage).includes(cover), slug);
      assert.ok(
        blog.seo.metaTitle && blog.seo.metaDescription && blog.seo.keywords,
        slug,
      );
      assert.match(blog.content, /Frequently asked questions/i, slug);
      assert.doesNotMatch(blog.content, /^# /m, slug);
      assert.match(blog.content, /^## /m, slug);
      assert.doesNotMatch(
        blog.content,
        /approved-for-developer-handoff|^status:|\]\(\[https?:/m,
        slug,
      );
    }

    const fixed = blogs.find((blog) => blog.slug === "fixed-expenses-examples");
    assert.match(fixed.content, /\$900 every six months/);
    assert.match(fixed.content, /\$480 ÷ 12 = \$40/);
    const health = blogs.find(
      (blog) => blog.slug === "what-is-financial-health",
    );
    assert.doesNotMatch(
      health.content,
      /goal Pockets|financial-goals-for-individuals/,
    );
  } finally {
    await server.close();
  }
});
