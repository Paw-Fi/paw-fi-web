import {
  type AnalyzeRequestBody,
  type ProgressCallback,
  runAnalyzeExpense,
} from "./analyze-core.ts";
import {
  enrichAnalyzedMerchantItems,
  type MerchantAnalysisContext,
} from "./merchant-analysis.ts";

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
  for (const analyzedItem of params.analyzedItems) {
    if (typeof analyzedItem.merchant_id !== "string") continue;
    const key = transactionIdentityKey(analyzedItem);
    if (identities.has(key)) {
      identities.delete(key);
      continue;
    }
    identities.set(key, analyzedItem);
  }

  return params.items.map((item) => {
    const analyzedItem = identities.get(transactionIdentityKey(item));
    if (!analyzedItem) return item;
    return {
      ...item,
      ...Object.fromEntries(
        MERCHANT_IDENTITY_FIELDS.flatMap((field) =>
          analyzedItem[field] == null ? [] : [[field, analyzedItem[field]]]
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
    items: await enrichAnalyzedMerchantItems({
      items: transformedItems,
      ...params.merchantContext,
    }),
  };
}
