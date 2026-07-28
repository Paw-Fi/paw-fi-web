import type { Blog } from "@/components/blogs/blogs.typing";
import { authorsData, tags } from "./authors";
import { stripSourceMetadata } from "./strip-source-metadata";
import couplesContent from "../../../Documentation/Best Apps for Couples to Manage Money in 2026 (Compared & Reviewed).md?raw";
import billSplittingContent from "../../../Documentation/Best Bill Splitting Apps in 2026 (Compared for Couples, Roommates & Travel).md?raw";
import adhdContent from "../../../Documentation/Best Budget Apps for ADHD in 2026.md?raw";
import freelancersContent from "../../../Documentation/Best Budget Apps for Freelancers in 2026.md?raw";
import freeBudgetAppsContent from "../../../Documentation/Best Free Budget Apps in 2026_ Find the Right App for Your Money.md?raw";
import goodbudgetContent from "../../../Documentation/Moneko AI vs. Goodbudget_ Which Budgeting App Is Better in 2026_.md?raw";
import honeydueContent from "../../../Documentation/Moneko AI vs. Honeydue_ Which App Is Better for Couples_.md?raw";
import splidContent from "../../../Documentation/Moneko AI vs. Splid_ Which Bill Splitting App Is Better in 2026_.md?raw";
import splitwiseContent from "../../../Documentation/Moneko AI vs. Splitwise_ Which Bill Splitting App Is Better_.md?raw";
import ynabContent from "../../../Documentation/Moneko AI vs. YNAB_ Which Budgeting App Is Better in 2026_.md?raw";
import couplesCover from "../../../Documentation/imgs/Best Apps for Couples to Manage Money in 2026.png";
import billSplittingCover from "../../../Documentation/imgs/Best Bill Splitting Apps in 2026.png";
import adhdCover from "../../../Documentation/imgs/Best Budget Apps for ADHD in 2026.png";
import freelancersCover from "../../../Documentation/imgs/Best Budget Apps for Freelancers in 2026.png";
import freeBudgetAppsCover from "../../../Documentation/imgs/Best Free Budget Apps in 2026.png";

const publishedAt = "2026-07-28T00:00:00.000Z";
const author = authorsData[4];
const budgeting = tags.find((tag) => tag.id === "tag-44")!;
const personalFinance = tags.find((tag) => tag.id === "tag-13")!;
const couples = tags.find((tag) => tag.id === "tag-65")!;
const sharedFinances = tags.find((tag) => tag.id === "tag-66")!;

export const NEW_COMPARISON_BLOGS_2026: Blog[] = [
  {
    id: "blog-60",
    slug: "best-apps-for-couples-to-manage-money-in-2026",
    title: "Best Apps for Couples to Manage Money in 2026",
    excerpt:
      "Compare nine apps for couples who want to budget together, split bills, track recurring expenses, and manage shared finances.",
    content: stripSourceMetadata(couplesContent),
    coverImage: couplesCover,
    hideCreditLabel: true,
    author,
    tags: [couples, sharedFinances, budgeting],
    publishedAt,
    readTime: 26,
    featured: false,
    seo: {
      metaTitle: "9 Best Apps for Couples to Manage Money in 2026",
      metaDescription:
        "Compare the best apps for couples to manage money in 2026, including Moneko, Monarch Money, YNAB, Honeydue, Copilot Money, and more.",
      keywords:
        "best apps for couples to manage money, couples budgeting apps, shared finance apps, bill splitting apps for couples",
    },
  },
  {
    id: "blog-61",
    slug: "best-bill-splitting-apps-in-2026",
    title: "Best Bill Splitting Apps in 2026",
    excerpt:
      "Compare bill splitting apps for couples, roommates, travel, and shared household expenses, including Moneko, Splitwise, Tricount, and Splid.",
    content: stripSourceMetadata(billSplittingContent),
    coverImage: billSplittingCover,
    hideCreditLabel: true,
    author,
    tags: [sharedFinances, couples, personalFinance],
    publishedAt,
    readTime: 24,
    featured: false,
    seo: {
      metaTitle: "Best Bill Splitting Apps in 2026 Compared",
      metaDescription:
        "Compare the best bill splitting apps in 2026, including Moneko, Splitwise, Tricount, Settle Up, Splid, and more for couples, roommates, travel, and shared expenses.",
      keywords:
        "best bill splitting apps, split bills app, shared expense tracker, apps for roommates, apps for couples",
    },
  },
  {
    id: "blog-62",
    slug: "best-budget-apps-for-adhd-in-2026",
    title: "Best Budget Apps for ADHD in 2026",
    excerpt:
      "Compare eight budgeting apps that can reduce mental load, simplify expense tracking, and help build sustainable money habits.",
    content: stripSourceMetadata(adhdContent),
    coverImage: adhdCover,
    hideCreditLabel: true,
    author,
    tags: [budgeting, personalFinance],
    publishedAt,
    readTime: 8,
    featured: false,
    seo: {
      metaTitle:
        "Best Budget Apps for ADHD in 2026: 8 Apps That Make Budgeting Easier",
      metaDescription:
        "Compare the best budgeting apps for ADHD to reduce overwhelm, track expenses, automate routine tasks, and build better money habits.",
      keywords:
        "best budget app for ADHD, ADHD budgeting app, easy expense tracker, low effort budgeting",
    },
  },
  {
    id: "blog-63",
    slug: "best-budget-apps-for-freelancers-in-2026",
    title: "Best Budget Apps for Freelancers in 2026",
    excerpt:
      "Compare budgeting apps for freelancers who need to manage irregular income, business expenses, recurring bills, and cash flow.",
    content: stripSourceMetadata(freelancersContent),
    coverImage: freelancersCover,
    hideCreditLabel: true,
    author,
    tags: [budgeting, personalFinance],
    publishedAt,
    readTime: 9,
    featured: false,
    seo: {
      metaTitle: "Best Budget Apps for Freelancers in 2026",
      metaDescription:
        "Compare budgeting apps for freelancers, creators, consultants, and self-employed professionals managing irregular income and business expenses.",
      keywords:
        "best budget apps for freelancers, freelancer budgeting app, irregular income budget, business expense tracker",
    },
  },
  {
    id: "blog-64",
    slug: "best-free-budget-apps-in-2026",
    title: "Best Free Budget Apps in 2026",
    excerpt:
      "Compare free budget apps for couples, shared expenses, envelope budgeting, subscriptions, and everyday money management.",
    content: stripSourceMetadata(freeBudgetAppsContent),
    coverImage: freeBudgetAppsCover,
    hideCreditLabel: true,
    author,
    tags: [budgeting, personalFinance, sharedFinances],
    publishedAt,
    readTime: 10,
    featured: false,
    seo: {
      metaTitle: "Best Free Budget Apps in 2026: 9 Apps That Are Worth Using",
      metaDescription:
        "Compare free budget apps in 2026, including Moneko, Goodbudget, EveryDollar, Rocket Money, PocketGuard, Buddy, and more.",
      keywords:
        "best free budget apps, free budgeting app, free budget app for couples, free expense tracker",
    },
  },
  {
    id: "blog-65",
    slug: "moneko-vs-goodbudget-2026",
    title: "Moneko vs. Goodbudget: Which Budgeting App Is Better in 2026?",
    excerpt:
      "Compare Moneko and Goodbudget for shared expenses, AI expense tracking, envelope budgeting, and everyday money management.",
    content: stripSourceMetadata(goodbudgetContent),
    coverImage: freeBudgetAppsCover,
    hideCreditLabel: true,
    author,
    tags: [budgeting, personalFinance],
    publishedAt,
    readTime: 9,
    featured: false,
    seo: {
      metaTitle: "Moneko vs Goodbudget: Which Budgeting App Is Better in 2026?",
      metaDescription:
        "Compare Moneko and Goodbudget for couples, shared expenses, AI expense tracking, envelope budgeting, and everyday money management.",
      keywords:
        "Moneko vs Goodbudget, Goodbudget alternative, envelope budgeting app, AI budgeting app",
    },
  },
  {
    id: "blog-66",
    slug: "moneko-vs-honeydue-2026",
    title: "Moneko vs. Honeydue: Which App Is Better for Couples?",
    excerpt:
      "Compare Moneko and Honeydue for couples who need shared budgets, bill splitting, recurring bills, and household expense tracking.",
    content: stripSourceMetadata(honeydueContent),
    coverImage: couplesCover,
    hideCreditLabel: true,
    author,
    tags: [couples, sharedFinances, budgeting],
    publishedAt,
    readTime: 9,
    featured: false,
    seo: {
      metaTitle:
        "Moneko vs. Honeydue: Which Couples Budget App Is Better in 2026?",
      metaDescription:
        "Compare Moneko and Honeydue for couples, shared budgets, bill splitting, AI expense tracking, recurring bills, and household finances.",
      keywords:
        "Moneko vs Honeydue, Honeydue alternative, budget app for couples, shared finances app",
    },
  },
  {
    id: "blog-67",
    slug: "moneko-vs-splid-2026",
    title: "Moneko vs. Splid: Which Bill Splitting App Is Better in 2026?",
    excerpt:
      "Compare Moneko and Splid for couples, roommates, travel, shared budgets, recurring bills, and AI expense tracking.",
    content: stripSourceMetadata(splidContent),
    coverImage: billSplittingCover,
    hideCreditLabel: true,
    author,
    tags: [sharedFinances, couples, personalFinance],
    publishedAt,
    readTime: 10,
    featured: false,
    seo: {
      metaTitle:
        "Moneko vs. Splid: Which Bill Splitting App Is Better in 2026?",
      metaDescription:
        "Compare Moneko and Splid for couples, roommates, travel, shared budgets, recurring bills, and AI expense tracking.",
      keywords:
        "Moneko vs Splid, Splid alternative, bill splitting app, shared expense tracker",
    },
  },
  {
    id: "blog-68",
    slug: "moneko-vs-splitwise-2026",
    title: "Moneko vs. Splitwise: Which Bill Splitting App Is Better?",
    excerpt:
      "Compare Moneko and Splitwise for couples, roommates, travel, shared budgets, AI expense tracking, and recurring household bills.",
    content: stripSourceMetadata(splitwiseContent),
    coverImage: billSplittingCover,
    hideCreditLabel: true,
    author,
    tags: [sharedFinances, couples, personalFinance],
    publishedAt,
    readTime: 10,
    featured: false,
    seo: {
      metaTitle:
        "Moneko vs. Splitwise: Which Bill Splitting App Is Better in 2026?",
      metaDescription:
        "Compare Moneko and Splitwise for couples, roommates, travel, shared budgets, AI expense tracking, and recurring household bills.",
      keywords:
        "Moneko vs Splitwise, Splitwise alternative, bill splitting app, shared expense tracker",
    },
  },
  {
    id: "blog-69",
    slug: "moneko-vs-ynab-2026",
    title: "Moneko vs. YNAB: Which Budgeting App Is Better in 2026?",
    excerpt:
      "Compare Moneko and YNAB for AI expense tracking, envelope budgeting, couples, shared expenses, recurring bills, and daily budgeting.",
    content: stripSourceMetadata(ynabContent),
    coverImage: freeBudgetAppsCover,
    hideCreditLabel: true,
    author,
    tags: [budgeting, personalFinance, couples],
    publishedAt,
    readTime: 10,
    featured: false,
    seo: {
      metaTitle: "Moneko vs. YNAB: Which Budgeting App Is Better in 2026?",
      metaDescription:
        "Compare Moneko and YNAB for AI expense tracking, envelope budgeting, couples, shared expenses, recurring bills, and everyday money management.",
      keywords:
        "Moneko vs YNAB, YNAB alternative, AI budgeting app, shared budgeting app",
    },
  },
];
