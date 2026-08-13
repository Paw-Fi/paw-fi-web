import { useCallback, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";

export interface CreatorUserLookupCounts {
  transactions: number;
  accounts: number;
  budgets: number;
  recurring: number;
  devices: number;
  households: number;
  bankConnections: number;
  chatSessions: number;
  emailImportSenders: number;
}

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
  counts?: CreatorUserLookupCounts;
}

export type SectionName =
  | "transactions"
  | "accounts"
  | "budgets"
  | "recurring"
  | "devices"
  | "households"
  | "bank-connections"
  | "chat-sessions"
  | "email-import";

interface SectionState {
  data: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalCount: number;
  loaded: boolean;
}

const INITIAL_SECTION_STATE: SectionState = {
  data: null,
  isLoading: false,
  error: null,
  page: 1,
  pageSize: 10,
  totalCount: 0,
  loaded: false,
};

const DEFAULT_PAGE_SIZE = 10;

export function useCreatorUserLookup() {
  const [data, setData] = useState<CreatorUserLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState<Record<string, SectionState>>({});
  const userEmailRef = useRef<string | null>(null);

  const lookup = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    setSections({});
    userEmailRef.current = email;

    const { data: result, error: invokeError } =
      await supabase.functions.invoke("creator-user-lookup", {
        body: { email },
      });

    if (invokeError) {
      setData(null);
      setError(invokeError.message);
      setIsLoading(false);
      return;
    }

    setData((result as CreatorUserLookupResult | null) ?? null);
    setIsLoading(false);
  }, []);

  const fetchSection = useCallback(
    async (
      section: SectionName,
      page: number = 1,
      pageSize: number = DEFAULT_PAGE_SIZE,
    ) => {
      const email = userEmailRef.current;
      if (!email) return;

      setSections((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] ?? INITIAL_SECTION_STATE),
          isLoading: true,
          error: null,
          page,
          pageSize,
        },
      }));

      const { data: result, error: invokeError } =
        await supabase.functions.invoke("creator-user-lookup", {
          body: { email, section, page, pageSize },
        });

      if (invokeError) {
        setSections((prev) => ({
          ...prev,
          [section]: {
            ...(prev[section] ?? INITIAL_SECTION_STATE),
            isLoading: false,
            error: invokeError.message,
            loaded: true,
          },
        }));
        return;
      }

      const payload = result as { section: string; data: Record<string, unknown> } | null;
      const sectionData = payload?.data ?? {};
      const totalCount =
        typeof sectionData.totalCount === "number" ? sectionData.totalCount : 0;

      setSections((prev) => ({
        ...prev,
        [section]: {
          data: sectionData,
          isLoading: false,
          error: null,
          page,
          pageSize,
          totalCount,
          loaded: true,
        },
      }));
    },
    [],
  );

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setSections({});
    userEmailRef.current = null;
  }, []);

  return { data, error, isLoading, lookup, clear, sections, fetchSection };
}
