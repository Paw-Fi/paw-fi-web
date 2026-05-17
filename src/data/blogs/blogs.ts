import { Blog} from "@/components/blogs/blogs.typing";
import whatsappBlog from "./new-blog-whatsapp-budgeting";
import ynabAlternativesBlog from "./new-blog-ynab-alternatives";
import telegramBotsBlog from "./new-blog-telegram-bots";
import whatsappBudgetSetupBlog from "./new-blog-whatsapp-budget-setup";
import whatsappVsAppsBlog from "./new-blog-whatsapp-vs-apps";
import appleWalletSyncBlog from "./new-blog-apple-wallet-sync";
import { APP_FEATURES_GUIDELINES } from "./app-features-guidelines";
import { BLOG_YNAB_ALTERNATIVES_2026 } from "./blog-ynab-alternatives-2026";
import { BLOG_COUPLE_BUDGETING_2026 } from "./blog-couple-budgeting-2026";
import { BLOG_STOP_PAYCHECK_TO_PAYCHECK_2026 } from "./blog-stop-paycheck-to-paycheck-2026";
import { BLOG_AI_BUDGETING_APPS_2026 } from "./blog-ai-budgeting-apps-2026";
import { BLOG_EASIEST_EXPENSE_TRACKING_2026 } from "./blog-easiest-expense-tracking-2026";
import { BLOG_WHY_BUDGETING_APPS_FAIL_2026 } from "./blog-why-budgeting-apps-fail-2026";
import { old_blogs } from "./old_blogs";



// --- Blog Data ---
export const blogs: Blog[] = [
...old_blogs,
whatsappBlog,
ynabAlternativesBlog,
telegramBotsBlog,
whatsappBudgetSetupBlog,
whatsappVsAppsBlog,
appleWalletSyncBlog,
...APP_FEATURES_GUIDELINES,
  ...BLOG_YNAB_ALTERNATIVES_2026,
  ...BLOG_COUPLE_BUDGETING_2026,
  ...BLOG_STOP_PAYCHECK_TO_PAYCHECK_2026,
  ...BLOG_AI_BUDGETING_APPS_2026,
  ...BLOG_EASIEST_EXPENSE_TRACKING_2026,
  ...BLOG_WHY_BUDGETING_APPS_FAIL_2026,
];
