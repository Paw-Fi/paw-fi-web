// Supabase Edge Function to fetch App Store reviews
// This bypasses CORS by calling the API from the server side

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APP_STORE_CONNECT_API_BASE = "https://api.appstoreconnect.apple.com/v1";
const APP_ID = "6753925279";

interface FetchReviewsRequest {
  limit?: number;
  sort?: string;
  filterRating?: number[];
  filterTerritory?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Get JWT token from environment variable
    const jwtToken = Deno.env.get("APP_STORE_CONNECT_TOKEN");

    if (!jwtToken) {
      return new Response(
        JSON.stringify({ error: "App Store Connect token not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Parse request body
    let body: FetchReviewsRequest = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        // Use default values if no body
      }
    }

    const {
      limit = 30,
      sort = "-createdDate",
      filterRating,
      filterTerritory,
    } = body;

    // Build URL with query parameters
    const params = new URLSearchParams();
    params.append("limit", String(Math.min(limit, 200)));
    params.append("sort", sort);

    if (filterRating && filterRating.length > 0) {
      filterRating.forEach((rating) => {
        params.append("filter[rating]", String(rating));
      });
    }

    if (filterTerritory && filterTerritory.length > 0) {
      filterTerritory.forEach((territory) => {
        params.append("filter[territory]", territory);
      });
    }

    const url = `${APP_STORE_CONNECT_API_BASE}/apps/${APP_ID}/customerReviews?${params.toString()}`;

    console.log("Fetching App Store reviews:", url);

    // Call App Store Connect API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("App Store Connect API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `App Store Connect API error: ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const data = await response.json();

    console.log(`Successfully fetched ${data.data?.length || 0} reviews`);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
