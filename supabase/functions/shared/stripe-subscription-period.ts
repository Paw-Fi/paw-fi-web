export interface StripePeriodResolution {
  currentPeriodEnd: string | null;
  unixSeconds: number | null;
  source:
    | "subscription.current_period_end"
    | "subscription_item.current_period_end"
    | "subscription.trial_end"
    | "invoice_line.period.end"
    | "lifetime"
    | "missing";
}

export function unixSecondsToIso(value: unknown): string | null {
  const seconds = toUnixSeconds(value);
  if (seconds === null) return null;

  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function resolveStripeCurrentPeriodEnd(params: {
  subscription: unknown;
  invoice?: unknown;
  status?: string | null;
  plan?: string | null;
}): StripePeriodResolution {
  const plan = params.plan?.toLowerCase() ?? null;
  if (plan === "lifetime") {
    return { currentPeriodEnd: null, unixSeconds: null, source: "lifetime" };
  }

  const subscription = asRecord(params.subscription);
  const subscriptionCurrentPeriodEnd = toUnixSeconds(
    subscription?.current_period_end,
  );
  if (subscriptionCurrentPeriodEnd !== null) {
    return toResolution(
      subscriptionCurrentPeriodEnd,
      "subscription.current_period_end",
    );
  }

  const itemPeriodEnd = latestUnixSeconds(
    getListData(asRecord(subscription?.items)).map((item) =>
      toUnixSeconds(asRecord(item)?.current_period_end)
    ),
  );
  if (itemPeriodEnd !== null) {
    return toResolution(itemPeriodEnd, "subscription_item.current_period_end");
  }

  if (params.status === "trialing") {
    const trialEnd = toUnixSeconds(subscription?.trial_end);
    if (trialEnd !== null) {
      return toResolution(trialEnd, "subscription.trial_end");
    }
  }

  const invoiceLinePeriodEnd = latestUnixSeconds([
    ...getInvoiceLinePeriodEnds(params.invoice),
    ...getInvoiceLinePeriodEnds(subscription?.latest_invoice),
  ]);
  if (invoiceLinePeriodEnd !== null) {
    return toResolution(invoiceLinePeriodEnd, "invoice_line.period.end");
  }

  return { currentPeriodEnd: null, unixSeconds: null, source: "missing" };
}

function getInvoiceLinePeriodEnds(invoice: unknown): Array<number | null> {
  const invoiceRecord = asRecord(invoice);
  return getListData(asRecord(invoiceRecord?.lines))
    .filter(isSubscriptionPeriodLine)
    .map((line) => toUnixSeconds(asRecord(asRecord(line)?.period)?.end));
}

function isSubscriptionPeriodLine(line: unknown): boolean {
  const record = asRecord(line);
  if (!record) return false;
  if (record.type === "subscription") return true;

  const parent = asRecord(record.parent);
  if (parent?.type === "subscription_item_details") return true;

  const price = asRecord(record.price);
  const pricing = asRecord(record.pricing);
  return Boolean(
    asRecord(price?.recurring) ||
      asRecord(asRecord(pricing?.price_details)?.recurring),
  );
}

function toResolution(
  unixSeconds: number,
  source: StripePeriodResolution["source"],
): StripePeriodResolution {
  return {
    currentPeriodEnd: unixSecondsToIso(unixSeconds),
    unixSeconds,
    source,
  };
}

function latestUnixSeconds(values: Array<number | null>): number | null {
  const finiteValues = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (finiteValues.length === 0) return null;
  return finiteValues.reduce((latest, value) =>
    value > latest ? value : latest
  );
}

function toUnixSeconds(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getListData(value: Record<string, unknown> | null): unknown[] {
  return Array.isArray(value?.data) ? value.data : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}
