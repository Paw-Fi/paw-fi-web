// A short page can reflect an API row cap, so only an empty page ends the read.
export async function readWalletLedgerPages<T extends { id: string }>(
  fetchPage: (afterId: string | null) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  let afterId: string | null = null;
  while (true) {
    const page = await fetchPage(afterId);
    if (page.error) throw page.error;
    if (page.data == null) throw new Error("Wallet ledger page missing");
    if (page.data.length === 0) return rows;
    for (const row of page.data) {
      if (
        typeof row.id !== "string" || !row.id ||
        (afterId != null && row.id <= afterId)
      ) {
        throw new Error("Wallet ledger cursor did not advance");
      }
      rows.push(row);
      afterId = row.id;
    }
  }
}
