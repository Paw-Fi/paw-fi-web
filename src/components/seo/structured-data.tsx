import React from "react";

import {
  createMonekoFreeOffer,
  monekoAggregateRating,
  monekoAlternateNames,
  monekoAvailableLanguages,
  monekoFeaturedReview,
  monekoKnowsAbout,
  monekoSameAs,
} from "@/utils/app-schema";

interface OrganizationData {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  alternateName?: string[];
  sameAs?: string[];
  knowsAbout?: string[];
}

interface WebsiteData {
  url: string;
  name: string;
  description?: string;
  publisher?: OrganizationData;
}

interface ArticleData {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  author?: {
    name: string;
    url?: string;
    jobTitle?: string;
    image?: string;
    sameAs?: string[];
  };
  image?: string;
  publisher?: OrganizationData;
  wordCount?: number;
  timeRequired?: string;
  educationalLevel?: string;
  isAccessibleForFree?: boolean;
  keywords?: string[];
  articleSection?: string;
  proficiencyLevel?: string;
  dependencies?: string;
  speakable?: {
    cssSelector: string[];
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface HowToStep {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

interface HowToData {
  name: string;
  description: string;
  totalTime?: string;
  estimatedCost?: {
    currency: string;
    value: string;
  };
  steps: HowToStep[];
  image?: string;
}

interface SoftwareApplicationData {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  requirements?: string;
  screenshot?: string[];
  softwareVersion?: string;
  dateModified?: string;
  publisher?: OrganizationData;
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
  };
}

interface PersonData {
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
  worksFor?: OrganizationData;
  knowsAbout?: string[];
  alumniOf?: string[];
  email?: string;
}

interface StructuredDataProps {
  type:
    | "organization"
    | "website"
    | "article"
    | "techArticle"
    | "breadcrumb"
    | "faq"
    | "howto"
    | "software"
    | "person";
  data:
    | OrganizationData
    | WebsiteData
    | ArticleData
    | BreadcrumbItem[]
    | FAQItem[]
    | HowToData
    | SoftwareApplicationData
    | PersonData;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const getStructuredData = () => {
    const baseContext = "https://schema.org";

    switch (type) {
      case "organization":
        const orgData = data as OrganizationData;
        return {
          "@context": baseContext,
          "@type": "Organization",
          name: orgData.name,
          url: orgData.url,
          logo: orgData.logo,
          description: orgData.description,
          alternateName: orgData.alternateName,
          sameAs: orgData.sameAs,
          knowsAbout: orgData.knowsAbout,
        };

      case "website":
        const websiteData = data as WebsiteData;
        return {
          "@context": baseContext,
          "@type": "WebSite",
          name: websiteData.name,
          url: websiteData.url,
          description: websiteData.description,
          publisher: websiteData.publisher,
        };

      case "article":
        const articleData = data as ArticleData;
        return {
          "@context": baseContext,
          "@type": "Article",
          headline: articleData.title,
          description: articleData.description,
          url: articleData.url,
          datePublished: articleData.datePublished,
          dateModified: articleData.dateModified,
          author: articleData.author
            ? {
                "@type": "Person",
                name: articleData.author.name,
                url: articleData.author.url,
                jobTitle: articleData.author.jobTitle,
                image: articleData.author.image,
                sameAs: articleData.author.sameAs,
              }
            : undefined,
          image: articleData.image,
          publisher: articleData.publisher,
          wordCount: articleData.wordCount,
          timeRequired: articleData.timeRequired,
          educationalLevel: articleData.educationalLevel,
          isAccessibleForFree: articleData.isAccessibleForFree,
          keywords: articleData.keywords,
          articleSection: articleData.articleSection,
          speakable: articleData.speakable,
        };

      case "techArticle":
        const techArticleData = data as ArticleData;
        return {
          "@context": baseContext,
          "@type": "TechArticle",
          headline: techArticleData.title,
          description: techArticleData.description,
          url: techArticleData.url,
          datePublished: techArticleData.datePublished,
          dateModified: techArticleData.dateModified,
          author: techArticleData.author
            ? {
                "@type": "Person",
                name: techArticleData.author.name,
                url: techArticleData.author.url,
                jobTitle: techArticleData.author.jobTitle,
                image: techArticleData.author.image,
                sameAs: techArticleData.author.sameAs,
              }
            : undefined,
          image: techArticleData.image,
          publisher: techArticleData.publisher,
          wordCount: techArticleData.wordCount,
          timeRequired: techArticleData.timeRequired,
          educationalLevel: techArticleData.educationalLevel,
          isAccessibleForFree: techArticleData.isAccessibleForFree,
          keywords: techArticleData.keywords,
          articleSection: techArticleData.articleSection,
          proficiencyLevel: techArticleData.proficiencyLevel,
          dependencies: techArticleData.dependencies,
          speakable: techArticleData.speakable,
        };

      case "breadcrumb":
        const breadcrumbData = data as BreadcrumbItem[];
        return {
          "@context": baseContext,
          "@type": "BreadcrumbList",
          itemListElement: breadcrumbData.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        };

      case "faq":
        const faqData = data as FAQItem[];
        return {
          "@context": baseContext,
          "@type": "FAQPage",
          mainEntity: faqData.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        };

      case "howto":
        const howtoData = data as HowToData;
        return {
          "@context": baseContext,
          "@type": "HowTo",
          name: howtoData.name,
          description: howtoData.description,
          totalTime: howtoData.totalTime,
          estimatedCost: howtoData.estimatedCost,
          image: howtoData.image,
          step: howtoData.steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
            url: step.url,
            image: step.image,
          })),
        };

      case "software":
        const softwareData = data as SoftwareApplicationData;
        return {
          "@context": baseContext,
          "@type": "SoftwareApplication",
          name: softwareData.name,
          description: softwareData.description,
          url: softwareData.url,
          applicationCategory: softwareData.applicationCategory,
          operatingSystem: softwareData.operatingSystem,
          availableLanguage: monekoAvailableLanguages,
          requirements: softwareData.requirements,
          screenshot: softwareData.screenshot,
          softwareVersion: softwareData.softwareVersion,
          dateModified: softwareData.dateModified,
          publisher: softwareData.publisher,
          offers: createMonekoFreeOffer(softwareData.url),
          aggregateRating: softwareData.aggregateRating
            ? {
                "@type": "AggregateRating",
                ratingValue: softwareData.aggregateRating.ratingValue,
                ratingCount: softwareData.aggregateRating.ratingCount,
              }
            : monekoAggregateRating,
          review: monekoFeaturedReview,
        };

      case "person":
        const personData = data as PersonData;
        return {
          "@context": baseContext,
          "@type": "Person",
          name: personData.name,
          jobTitle: personData.jobTitle,
          description: personData.description,
          image: personData.image,
          url: personData.url,
          sameAs: personData.sameAs,
          worksFor: personData.worksFor,
          knowsAbout: personData.knowsAbout,
          alumniOf: personData.alumniOf,
          email: personData.email,
        };

      default:
        return null;
    }
  };

  const structuredData = getStructuredData();

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}

// Pre-configured components for common use cases
export function MonekoOrganizationData() {
  return (
    <StructuredData
      type="organization"
      data={{
        name: "Moneko",
        url: "https://moneko.io",
        logo: "https://moneko.io/logo192.png",
        description:
          "AI budgeting app and expense tracker for Pockets, Wallets, WhatsApp, email receipt capture, and shared expenses.",
        alternateName: monekoAlternateNames,
        sameAs: monekoSameAs,
        knowsAbout: monekoKnowsAbout,
      }}
    />
  );
}

export function MonekoWebsiteData() {
  return (
    <StructuredData
      type="website"
      data={{
        url: "https://moneko.io",
        name: "Moneko",
        description:
          "Track expenses, organize monthly Pockets, manage Wallets, capture receipts, and coordinate shared budgets with Moneko.",
        publisher: {
          name: "Moneko",
          url: "https://moneko.io",
          logo: "https://moneko.io/logo192.png",
        },
      }}
    />
  );
}
