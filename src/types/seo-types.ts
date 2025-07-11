/**
 * SEO data types for Moneko pSEO system
 */

/**
 * SEO Page Data structure
 * Used for dynamic pSEO pages - matches database schema
 */
export interface SEOPageData {
  id?: string;
  slug: string;
  target_group: string;
  financial_goal: string;
  region?: string;
  title: string;
  meta_description: string;
  keywords: string[];
  intro_content: string;
  feature_benefit_snippet: string;
  cta_snippet: string;
  secondary_content: string;
  benefits: { title: string; description: string }[];
  faqs: FAQ[];
  suggestions: string[];
  related_article_slugs: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * FAQ item
 */
export interface FAQ {
  question: string;
  answer: string;
}

/**
 * Related page link
 */
export interface RelatedPage {
  slug: string;
  title: string;
  target_group: string;
  financial_goal: string;
  region?: string;
}
