import {
  type AnalyzeRequestBody,
  type ProgressCallback,
  runAnalyzeExpense,
} from "./analyze-core.ts";
import { type MerchantAnalysisContext } from "./merchant-analysis.ts";
import { enrichSourceVerifiedMerchantItems } from "./merchant-source-verification.ts";
import { blockAnalyzedMerchantIdentity } from "./merchant-auto-resolution-policy.ts";

export {
  enrichAnalyzedMerchantItems,
  resolveAnalyzedMerchantIdentity,
} from "./merchant-analysis.ts";
export type {
  AnalyzedMerchantIdentity,
  MerchantAnalysisContext,
} from "./merchant-analysis.ts";

const MERCHANT_IDENTITY_FIELDS = [
  "merchant_id",
  "merchant_domain",
  "merchant_structured_name",
  "merchant_resolution_source",
] as const;

function transactionIdentityKey(item: Record<string, unknown>): string {
  return [
    item.type,
    item.date,
    Number(item.amount).toFixed(2),
    String(item.merchant ?? "")
      .trim()
      .toLocaleLowerCase(),
  ].join("|");
}

export function preserveAnalyzedMerchantIdentity(params: {
  items: Array<Record<string, unknown>>;
  analyzedItems: Array<Record<string, unknown>>;
}): Array<Record<string, unknown>> {
  const identities = new Map<string, Record<string, unknown>>();
  const ambiguous = new Set<string>();
  for (const analyzedItem of params.analyzedItems) {
    const key = transactionIdentityKey(analyzedItem);
    if (ambiguous.has(key)) continue;
    if (identities.has(key)) {
      identities.delete(key);
      ambiguous.add(key);
      continue;
    }
    identities.set(key, analyzedItem);
  }

  return params.items.map((item) => {
    const analyzedItem = identities.get(transactionIdentityKey(item));
    if (!analyzedItem || analyzedItem.merchant_auto_resolution_blocked === true)
      return blockAnalyzedMerchantIdentity(item);
    return {
      ...item,
      ...Object.fromEntries(
        MERCHANT_IDENTITY_FIELDS.flatMap((field) =>
          analyzedItem[field] == null ? [] : [[field, analyzedItem[field]]],
        ),
      ),
    };
  });
}

export async function runEnrichedTransactionAnalysis(params: {
  body: AnalyzeRequestBody;
  apiKey: string;
  merchantContext: MerchantAnalysisContext;
  onProgress?: ProgressCallback;
  transformItems?: (items: any[]) => any[] | Promise<any[]>;
  merchantDeadlineAt?: number;
}): Promise<any> {
  const result = await runAnalyzeExpense(
    {
      ...params.body,
      preferredTimezone: params.merchantContext.preferredTimezone,
    },
    params.apiKey,
    params.onProgress,
  );
  if (!result.success || !Array.isArray(result.items)) return result;

  const transformedItems = params.transformItems
    ? await params.transformItems(result.items)
    : result.items;
  return {
    ...result,
    items: await enrichSourceVerifiedMerchantItems({
      body: params.body,
      items: transformedItems,
      merchantContext: params.merchantContext,
      deadlineAt: params.merchantDeadlineAt,
    }),
  };
}
