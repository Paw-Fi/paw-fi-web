import { buildInternalInvokeHeaders } from "../auth.ts";
import { updatePreferredCurrency } from "../currency-helpers.ts";
import { formatInvokeError } from "../formatting-helpers.ts";

type SupabasePreferenceClient = {
  from: (table: string) => any;
  functions: {
    invoke: (
      functionName: string,
      options?: any,
    ) => Promise<{
      data?: any;
      error?: any;
    }>;
  };
};

export type BotPreferenceToolFailure = {
  formatted: string;
  error: unknown;
  targetFunction?: string;
  context: Record<string, unknown>;
};

export type BotPreferenceToolResult = {
  result: Record<string, unknown>;
  failure?: BotPreferenceToolFailure;
};

export async function setBotPreferredCurrency(params: {
  supabase: SupabasePreferenceClient;
  contactId: string;
  currency: string;
}): Promise<BotPreferenceToolResult> {
  const { data, error } = await updatePreferredCurrency(
    params.supabase as any,
    params.contactId,
    params.currency,
  );

  if (!error) {
    return {
      result: {
        success: true,
        currency: data?.preferred_currency || params.currency,
      },
    };
  }

  const formatted = formatInvokeError(error);
  return {
    result: { error },
    failure: {
      formatted,
      error,
      context: { currency: params.currency },
    },
  };
}

export async function setBotPreferredLanguage(params: {
  supabase: SupabasePreferenceClient;
  internalFunctionKey: string;
  userId: string;
  language: string;
}): Promise<BotPreferenceToolResult> {
  const { data, error } = await params.supabase.functions.invoke(
    "update-preferred-language",
    {
      body: {
        userId: params.userId,
        language: params.language,
      },
      headers: buildInternalInvokeHeaders(params.internalFunctionKey),
    },
  );
  const resolvedLanguage = data?.results?.preferredLanguage || params.language;
  const success = !error && (data?.ok === true || data?.success === true);

  if (success) {
    return {
      result: {
        success: true,
        language: resolvedLanguage,
        reply_language: resolvedLanguage,
        message: `Preferred language updated to ${resolvedLanguage}. Reply in this language for this confirmation and use it as the default language for future replies.`,
      },
    };
  }

  const formatted =
    formatInvokeError(error ?? data?.error) ||
    "Failed to update preferred language";
  return {
    result: { error: formatted },
    failure: {
      formatted,
      error: error ?? data?.error,
      targetFunction: "update-preferred-language",
      context: { language: params.language },
    },
  };
}
