import type { PlaidSyncResponse, PlaidTransaction } from "./plaid-client.ts";

export interface CompletePlaidSyncBatch {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  nextCursor: string;
  restartCount: number;
}

interface FetchCompletePlaidSyncBatchParams {
  initialCursor?: string | null;
  maxRestarts?: number;
  fetchPage: (cursor?: string | null) => Promise<PlaidSyncResponse>;
  isMutationDuringPagination: (error: unknown) => boolean;
  onRestart?: (restartCount: number, error: unknown) => void;
  onPage?: (page: PlaidSyncResponse, requestCursor?: string | null) => void;
}

export async function fetchCompletePlaidSyncBatch(
  params: FetchCompletePlaidSyncBatchParams,
): Promise<CompletePlaidSyncBatch> {
  const maxRestarts = params.maxRestarts ?? 2;
  let restartCount = 0;

  while (true) {
    const added: PlaidTransaction[] = [];
    const modified: PlaidTransaction[] = [];
    const removed: Array<{ transaction_id: string }> = [];
    let cursor = params.initialCursor;

    try {
      while (true) {
        const requestCursor = cursor;
        const page = await params.fetchPage(requestCursor);
        params.onPage?.(page, requestCursor);
        added.push(...page.added);
        modified.push(...page.modified);
        removed.push(...(page.removed ?? []));
        cursor = page.next_cursor;

        if (!page.has_more) {
          return {
            added,
            modified,
            removed,
            nextCursor: cursor,
            restartCount,
          };
        }
      }
    } catch (error) {
      if (
        !params.isMutationDuringPagination(error) ||
        restartCount >= maxRestarts
      ) {
        throw error;
      }
      restartCount += 1;
      params.onRestart?.(restartCount, error);
    }
  }
}
