export interface HelpCategory {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  iconName: "rocket" | "receipt" | "wallet" | "sparkles";
}

export interface HelpArticleFaqItem {
  question: string;
  answer: string;
}

export interface HelpArticleHowToStep {
  name: string;
  text: string;
}

export interface HelpArticle {
  id: string;
  number: string;
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  readTime: number;
  keywords: string[];
  seoTitle?: string;
  publishedAt?: string;
  updatedAt?: string;
  featured?: boolean;
  includeTechArticleSchema?: boolean;
  faqItems?: HelpArticleFaqItem[];
  howToSteps?: HelpArticleHowToStep[];
  content: string;
  videoId?: string;
}
