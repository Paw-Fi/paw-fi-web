import {
  APP_STORE_RATING,
  APP_STORE_REVIEW_COUNT,
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
  "free budgeting app",
  "household budgeting",
  "personal finance apps",
  "pocket budgeting",
  "shared expense tracking",
  "WhatsApp budgeting",
];

export const monekoAggregateRating = {
  "@type": "AggregateRating",
  ratingValue: APP_STORE_RATING,
  ratingCount: APP_STORE_REVIEW_COUNT,
  reviewCount: APP_STORE_REVIEW_COUNT,
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
    name: "Moneko Free",
    price: "0",
    priceCurrency: "USD",
    description:
      "Permanent free plan with AI capture by text, photo, and voice, up to two Spaces, up to two Wallets, and standard support.",
    availability: "https://schema.org/InStock",
    url,
  };
}

export function createMonekoPricingOffers(pageUrl: string) {
  return [
    createMonekoFreeOffer(pageUrl),
    {
      "@type": "Offer",
      name: "Moneko Plus Monthly",
      price: "10.99",
      priceCurrency: "USD",
      description:
        "Monthly subscription to Moneko Plus with every current budgeting, capture, household, currency, and support feature included.",
      url: pageUrl,
      availability: "https://schema.org/InStock",
      category: "Digital Good",
    },
    {
      "@type": "Offer",
      name: "Moneko Plus Annual",
      price: "79.99",
      priceCurrency: "USD",
      description:
        "Annual subscription to Moneko Plus with every current budgeting, capture, household, currency, and support feature included.",
      url: pageUrl,
      availability: "https://schema.org/InStock",
      category: "Digital Good",
    },
  ];
}
