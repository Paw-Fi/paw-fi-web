import { useQuery } from "@tanstack/react-query";
import { getStandardQueryConfig } from "@/lib/query-config";
import { supabase } from "@/lib/supabase";

export interface AppStoreReview {
  id: string;
  type: string;
  attributes: {
    rating: number;
    title: string;
    body: string;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
  };
  relationships?: {
    response?: {
      links?: {
        self?: string;
        related?: string;
      };
    };
  };
  links?: {
    self?: string;
  };
}

export interface AppStoreReviewsResponse {
  data: AppStoreReview[];
  links?: {
    self?: string;
    next?: string;
  };
  meta?: {
    paging?: {
      total?: number;
      limit?: number;
    };
  };
}

export interface FetchAppStoreReviewsOptions {
  limit?: number;
  sort?: "rating" | "-rating" | "createdDate" | "-createdDate";
  filterRating?: number[];
  filterTerritory?: string[];
  includeResponse?: boolean;
}

/**
 * Fetches customer reviews from App Store Connect API via Supabase Edge Function
 * This bypasses CORS by calling the API from the server side
 *
 * @param options - Optional parameters for filtering and sorting reviews
 * @returns Promise with the reviews response
 *
 * @example
 * const reviews = await fetchAppStoreReviews({ limit: 10, sort: '-createdDate' });
 */
export async function fetchAppStoreReviews(
  options: FetchAppStoreReviewsOptions = {},
): Promise<AppStoreReviewsResponse> {
  const {
    limit = 20,
    sort = "-createdDate",
    filterRating,
    filterTerritory,
  } = options;

  const functionUrl = `${supabase.supabaseUrl}/functions/v1/app-store-reviews`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabase.supabaseKey}`,
    },
    body: JSON.stringify({
      limit,
      sort,
      filterRating,
      filterTerritory,
    }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `App Store reviews fetch error: ${response.status} ${response.statusText}. ${errorData.error || ""}`,
    );
  }

  const data = await response.json();

  // eslint-disable-next-line no-console
  console.log("📱 App Store Reviews Response:");
  // eslint-disable-next-line no-console
  console.log(
    `   Total reviews: ${data.meta?.paging?.total || data.data?.length || 0}`,
  );
  // eslint-disable-next-line no-console
  console.log(`   Returned: ${data.data?.length || 0} reviews`);
  // eslint-disable-next-line no-console
  console.log("   Reviews data:", data.data);

  if (data.data?.length > 0) {
    // eslint-disable-next-line no-console
    console.log("\n📝 First review details:");
    const firstReview = data.data[0];
    // eslint-disable-next-line no-console
    console.log(`   ID: ${firstReview.id}`);
    // eslint-disable-next-line no-console
    console.log(`   Rating: ${firstReview.attributes.rating}/5`);
    // eslint-disable-next-line no-console
    console.log(`   Title: ${firstReview.attributes.title}`);
    // eslint-disable-next-line no-console
    console.log(
      `   Body: ${firstReview.attributes.body.substring(0, 100)}${firstReview.attributes.body.length > 100 ? "..." : ""}`,
    );
    // eslint-disable-next-line no-console
    console.log(`   Reviewer: ${firstReview.attributes.reviewerNickname}`);
    // eslint-disable-next-line no-console
    console.log(`   Date: ${firstReview.attributes.createdDate}`);
    // eslint-disable-next-line no-console
    console.log(`   Territory: ${firstReview.attributes.territory}`);
  }

  return data;
}

/**
 * Fetches the next page of reviews using the cursor from the previous response
 *
 * @param jwtToken - The JWT authentication token
 * @param nextUrl - The URL from the 'next' link in the previous response
 * @returns Promise with the next page of reviews
 */
export async function fetchNextPage(
  jwtToken: string,
  nextUrl: string,
): Promise<AppStoreReviewsResponse> {
  const response = await fetch(nextUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `App Store Connect API error: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

/**
 * React Query hook for fetching App Store reviews via Supabase Edge Function
 *
 * @param options - Optional parameters for filtering and sorting
 * @returns TanStack Query result with reviews data
 *
 * @example
 * const { data, isLoading, error } = useAppStoreReviews({ limit: 10 });
 */
export function useAppStoreReviews(options: FetchAppStoreReviewsOptions = {}) {
  return useQuery({
    queryKey: ["app-store-reviews", options],
    queryFn: () => fetchAppStoreReviews(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...getStandardQueryConfig(),
  });
}

/**
 * Hook to fetch average rating from App Store reviews
 *
 * @returns Object with average rating and total reviews count
 *
 * @example
 * const { averageRating, totalReviews, isLoading } = useAppStoreRating();
 */
export function useAppStoreRating() {
  const { data, isLoading, error } = useAppStoreReviews({
    limit: 200, // Get max reviews for accurate calculation
    sort: "-createdDate",
  });

  const reviews = data?.data || [];

  const calculateAverageRating = (): number | null => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce(
      (acc, review) => acc + review.attributes.rating,
      0,
    );
    return Number((sum / reviews.length).toFixed(1));
  };

  return {
    averageRating: calculateAverageRating(),
    totalReviews: data?.meta?.paging?.total || reviews.length,
    reviews,
    isLoading,
    error,
  };
}
