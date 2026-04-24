import {
  APP_STORE_RATING,
  TOTAL_REVIEW_COUNT,
  appStoreReviews,
} from "@/data/app-store-reviews";

const featuredReview = appStoreReviews[0];

export const monekoSameAs = [
  "https://x.com/moneko_ai",
  "https://www.linkedin.com/company/moneko-ai",
  "https://www.instagram.com/moneko_ai",
  "https://www.facebook.com/moneko-ai",
];

export const monekoAlternateNames = [
  "Moneko AI",
  "Moneko app",
  "Moneko budgeting app",
  "Moneko expense tracker",
  "Moneyko",
  "Moneyko budgeting app",
  "Moneyko expense tracker",
];

export const monekoKnowsAbout = [
  "AI budgeting",
  "automatic expense tracking",
  "budgeting app for couples",
  "email receipt capture",
  "envelope budgeting",
  "expense sharing",
  "free budgeting app trial",
  "household budgeting",
  "personal finance apps",
  "pocket budgeting",
  "shared expense tracking",
  "WhatsApp budgeting",
];

export const monekoAggregateRating = {
  "@type": "AggregateRating",
  ratingValue: APP_STORE_RATING,
  ratingCount: TOTAL_REVIEW_COUNT,
  reviewCount: TOTAL_REVIEW_COUNT,
  bestRating: 5,
  worstRating: 1,
};

export const monekoFeaturedReview = {
  "@type": "Review",
  name: featuredReview.title,
  reviewBody: featuredReview.body,
  datePublished: featuredReview.createdDate.split("T")[0],
  author: {
    "@type": "Person",
    name: featuredReview.reviewerNickname,
  },
  reviewRating: {
    "@type": "Rating",
    ratingValue: featuredReview.rating,
    bestRating: 5,
    worstRating: 1,
  },
};

export const monekoAvailableLanguages = "Multiple languages";

export function createMonekoFreeOffer(url = "https://moneko.io/download") {
  return {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url,
  };
}

export function createMonekoPricingOffers(pageUrl: string) {
  return [
    {
      "@type": "Offer",
      name: "Moneko Pro Monthly",
      price: "4.99",
      priceCurrency: "USD",
      description:
        "Monthly subscription to Moneko Pro with WhatsApp-first money assistance.",
      url: pageUrl,
      availability: "https://schema.org/InStock",
      category: "Digital Good",
    },
    {
      "@type": "Offer",
      name: "Moneko Pro Annual",
      price: "34.99",
      priceCurrency: "USD",
      description:
        "Annual subscription to Moneko Pro with WhatsApp assistant features.",
      url: pageUrl,
      availability: "https://schema.org/InStock",
      category: "Digital Good",
    },
    {
      "@type": "Offer",
      name: "Moneko Pro Lifetime",
      price: "69.99",
      priceCurrency: "USD",
      description:
        "Lifetime access to Moneko Pro with WhatsApp assistant features unlocked.",
      url: pageUrl,
      availability: "https://schema.org/InStock",
      category: "Digital Good",
    },
  ];
}
