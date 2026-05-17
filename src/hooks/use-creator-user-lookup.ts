import { useState } from "react";

import { supabase } from "@/lib/supabase";

export interface CreatorUserLookupResult {
  user: Record<string, unknown> | null;
  contact?: Record<string, unknown> | null;
  subscription?: Record<string, unknown> | null;
  stripe?: Record<string, unknown> | null;
  appStore?: Record<string, unknown> | null;
  errors?: {
    stripe?: string | null;
    appStore?: string | null;
  };
}

export function useCreatorUserLookup() {
  const [data, setData] = useState<CreatorUserLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function lookup(email: string) {
    setIsLoading(true);
    setError(null);

    const { data: result, error: invokeError } =
      await supabase.functions.invoke("creator-user-lookup", {
        body: { email },
      });

    setIsLoading(false);

    if (invokeError) {
      setData(null);
      setError(invokeError.message);
      return;
    }

    setData((result as CreatorUserLookupResult | null) ?? null);
  }

  function clear() {
    setData(null);
    setError(null);
    setIsLoading(false);
  }

  return { data, error, isLoading, lookup, clear };
}
