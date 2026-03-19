import geoLandingPagesData from "@/data/landing-pages/geo-pages.json";

export function getGeoLandingPage(slug: string): GeoLandingPage | null {
  return geoLandingPages[slug] ?? null;
}

export function getMainGeoLandingPage(): GeoLandingPage {
  return geoLandingPages.main;
}

export function getGeoLandingPageSlugs(): string[] {
  return Object.keys(geoLandingPages).filter((key) => key !== "main");
}

const geoLandingPages = geoLandingPagesData as GeoLandingPagesMap;

interface GeoLandingPagesMap {
  [key: string]: GeoLandingPage;
  main: GeoLandingPage;
}

export interface GeoLandingPage {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  sitemapLastmod?: string;
  sitemapChangefreq?: string;
  sitemapPriority?: string;
  organizationDescription?: string;
  websiteDescription?: string;
  softwareDescription?: string;
  softwareAlternateNames?: string[];
  softwareFeatureList?: string[];
  eyebrow?: string;
  pageTitle?: string;
  pageDescription?: string;
  keyTakeaways?: string[];
  comparisonTitle?: string;
  alternativeLabel?: string;
  comparisonRows?: ComparisonRow[];
  sections?: Section[];
  proofCards?: ProofCard[];
  faqItems: FaqItem[];
  resourceLinks?: ResourceLink[];
}

export interface ComparisonRow {
  label: string;
  moneko: string;
  alternative: string;
}

export interface Section {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ResourceLink {
  label: string;
  description: string;
  href: string;
}

export interface ProofCard {
  label: string;
  value: string;
  description: string;
}
