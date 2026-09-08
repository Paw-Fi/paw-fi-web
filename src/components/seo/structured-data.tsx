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

interface BaseSchemaData {
  "@context"?: string;
  "@type"?: string;
  "@id"?: string;
  [key: string]: any;
}

interface OrganizationData extends BaseSchemaData {
  name: string;
  url: string;
  logo?: string | { url: string; [key: string]: any };
  description?: string;
  alternateName?: string | string[];
  sameAs?: string[];
  knowsAbout?: string[];
}

interface WebsiteData extends BaseSchemaData {
  url: string;
  name: string;
  description?: string;
  publisher?: OrganizationData;
}

interface ArticleData extends BaseSchemaData {
  title?: string;
  headline?: string;
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
    [key: string]: any;
  };
  image?: string | { url: string; [key: string]: any };
  publisher?: OrganizationData;
  wordCount?: number;
  timeRequired?: string;
  educationalLevel?: string;
  isAccessibleForFree?: boolean;
  keywords?: string[] | string;
  articleSection?: string;
  proficiencyLevel?: string;
  dependencies?: string;
  speakable?: {
    cssSelector: string[];
    [key: string]: any;
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

interface HowToStep extends BaseSchemaData {
  name: string;
  text: string;
  url?: string;
  image?: string;
}

interface HowToData extends BaseSchemaData {
  name: string;
  description: string;
  totalTime?: string;
  estimatedCost?: {
    currency?: string;
    value?: string;
    [key: string]: any;
  } | string;
  steps: HowToStep[];
  image?: string;
}

interface SoftwareApplicationData extends BaseSchemaData {
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

interface PersonData extends BaseSchemaData {
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
  worksFor?: OrganizationData | { [key: string]: any };
  knowsAbout?: string[];
  alumniOf?: string | string[];
  email?: string;
}

interface EducationalOrganizationData extends BaseSchemaData {
  name: string;
  description: string;
  url: string;
  logo?: string;
  hasCredential?: string[];
  educationalCredentialAwarded?: string;
  offers?: {
    "@type": string;
    name: string;
    description: string;
    provider?: {
      "@type": string;
      name: string;
    };
    [key: string]: any;
  };
}

export type StructuredDataProps =
  | { type: "organization"; data: OrganizationData }
  | { type: "educationalorganization"; data: EducationalOrganizationData }
  | { type: "website"; data: WebsiteData }
  | { type: "article"; data: ArticleData }
  | { type: "techArticle"; data: ArticleData }
  | { type: "breadcrumb"; data: BreadcrumbItem[] }
  | { type: "faq"; data: FAQItem[] }
  | { type: "howto"; data: HowToData }
  | { type: "software"; data: SoftwareApplicationData }
  | { type: "person"; data: PersonData };

export function StructuredData(props: StructuredDataProps) {
  const getStructuredData = () => {
    const baseContext = "https://schema.org";

    switch (props.type) {
      case "organization":
        return {
          "@context": baseContext,
          "@type": "Organization",
          name: props.data.name,
          url: props.data.url,
          logo: props.data.logo,
          description: props.data.description,
          alternateName: props.data.alternateName,
          sameAs: props.data.sameAs,
          knowsAbout: props.data.knowsAbout,
        };

      case "educationalorganization":
        return {
          "@context": baseContext,
          "@type": "EducationalOrganization",
          name: props.data.name,
          url: props.data.url,
          logo: props.data.logo,
          description: props.data.description,
          hasCredential: props.data.hasCredential,
          educationalCredentialAwarded: props.data.educationalCredentialAwarded,
          offers: props.data.offers,
        };

      case "website":
        return {
          "@context": baseContext,
          "@type": "WebSite",
          name: props.data.name,
          url: props.data.url,
          description: props.data.description,
          publisher: props.data.publisher,
        };

      case "article":
        return {
          "@context": baseContext,
          "@type": "Article",
          ...props.data,
          headline: props.data.headline || props.data.title,
          author: props.data.author
            ? {
                "@type": "Person",
                ...props.data.author,
              }
            : undefined,
        };

      case "techArticle":
        return {
          "@context": baseContext,
          "@type": "TechArticle",
          ...props.data,
          headline: props.data.headline || props.data.title,
          author: props.data.author
            ? {
                "@type": "Person",
                ...props.data.author,
              }
            : undefined,
        };

      case "breadcrumb":
        return {
          "@context": baseContext,
          "@type": "BreadcrumbList",
          itemListElement: props.data.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        };

      case "faq":
        return {
          "@context": baseContext,
          "@type": "FAQPage",
          mainEntity: props.data.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        };

      case "howto":
        return {
          "@context": baseContext,
          "@type": "HowTo",
          name: props.data.name,
          description: props.data.description,
          totalTime: props.data.totalTime,
          estimatedCost: props.data.estimatedCost,
          image: props.data.image,
          step: props.data.steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
            url: step.url,
            image: step.image,
          })),
        };

      case "software":
        return {
          "@context": baseContext,
          "@type": "SoftwareApplication",
          name: props.data.name,
          description: props.data.description,
          url: props.data.url,
          applicationCategory: props.data.applicationCategory,
          operatingSystem: props.data.operatingSystem,
          availableLanguage: monekoAvailableLanguages,
          requirements: props.data.requirements,
          screenshot: props.data.screenshot,
          softwareVersion: props.data.softwareVersion,
          dateModified: props.data.dateModified,
          publisher: props.data.publisher,
          offers: createMonekoFreeOffer(props.data.url),
          aggregateRating: props.data.aggregateRating
            ? {
                "@type": "AggregateRating",
                ratingValue: props.data.aggregateRating.ratingValue,
                ratingCount: props.data.aggregateRating.ratingCount,
              }
            : monekoAggregateRating,
          review: monekoFeaturedReview,
        };

      case "person":
        return {
          "@context": baseContext,
          "@type": "Person",
          name: props.data.name,
          jobTitle: props.data.jobTitle,
          description: props.data.description,
          image: props.data.image,
          url: props.data.url,
          sameAs: props.data.sameAs,
          worksFor: props.data.worksFor,
          knowsAbout: props.data.knowsAbout,
          alumniOf: props.data.alumniOf,
          email: props.data.email,
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
