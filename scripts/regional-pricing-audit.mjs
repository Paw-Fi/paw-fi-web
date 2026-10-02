import {
  fromStripeMinorUnits,
  validatePricingRows,
  readStripeUnitAmount,
} from "./regional-pricing-model.mjs";

export function buildPricingAudit(rows, inspected, policy) {
  const failures = validatePricingRows(rows, policy);
  return rows.map((row) => {
    const targetId =
      row.plan === "monthly"
        ? "plus_monthly"
        : row.plan === "yearly"
          ? "plus_yearly"
          : "lifetime";
    const price = inspected.find(
      (item) => item.target.id === targetId,
    )?.previous;
    const currency = row.currency.toLowerCase();
    const existingValue =
      price?.currency === currency
        ? price
        : price?.currency_options?.[currency];
    const existingMinor = readStripeUnitAmount(existingValue);
    const existingDisplayed =
      existingMinor === null
        ? null
        : fromStripeMinorUnits(row.currency, existingMinor);
    const existingDifferencePercent =
      existingDisplayed === null
        ? null
        : (existingDisplayed / row.rawFx - 1) * 100;
    const ratio =
      existingDisplayed === null ? null : existingDisplayed / row.majorAmount;
    let existingStatus =
      existingDisplayed === null
        ? existingValue
          ? "Invalid"
          : "Missing"
        : "OK";
    if (
      ratio !== null &&
      ((ratio >= 0.004 && ratio <= 0.025) || (ratio >= 40 && ratio <= 250))
    )
      existingStatus = "Decimal/minor-unit bug";
    else if (ratio !== null && (ratio <= 0.11 || ratio >= 9))
      existingStatus = "Suspicious";
    else if (row.override && existingDisplayed !== row.majorAmount)
      existingStatus = "Incorrect override";
    else if (
      existingDifferencePercent !== null &&
      !row.override &&
      Math.abs(existingDifferencePercent) > policy.tolerancePercent
    )
      existingStatus = "Outside tolerance";
    const validationFailures = failures.filter((issue) =>
      issue.includes(`${row.plan}:${row.currency}`),
    );
    const rootCause =
      existingStatus === "Decimal/minor-unit bug"
        ? "Legacy major/minor-unit scale mismatch; regenerate from EUR FX"
        : existingStatus === "Outside tolerance"
          ? "Static local price outside EUR-reference tolerance"
          : existingStatus === "Incorrect override"
            ? "Incorrect fixed/regional price"
            : existingStatus === "OK"
              ? existingMinor === row.stripeAmount
                ? "Unchanged"
                : "EUR FX regeneration/local-market rounding"
              : existingStatus;
    return {
      ...row,
      existingPriceId: price?.id ?? null,
      existingStripeAmount: existingMinor,
      existingDisplayed,
      reconstructedDisplayed: fromStripeMinorUnits(
        row.currency,
        row.stripeAmount,
      ),
      existingDifferencePercent,
      existingStatus,
      rootCause,
      changed: existingMinor !== row.stripeAmount,
      status: validationFailures.length
        ? "Invalid"
        : row.override === "fixed"
          ? "Fixed override"
          : row.override === "regional"
            ? "Regional override"
            : "OK",
      validationFailures,
    };
  });
}

export function pricingAuditCsv(rows, changesOnly = false) {
  const columns = changesOnly
    ? ["Plan", "Currency", "Old", "New", "Root cause"]
    : [
        "Plan",
        "Currency",
        "Existing displayed price",
        "EUR reference",
        "Raw FX value",
        "Rounded major-unit price",
        "Stripe API amount",
        "Reconstructed displayed price",
        "EUR equivalent",
        "Difference %",
        "Status",
        "Existing status",
        "Existing difference %",
      ];
  const values = (changesOnly ? rows.filter((row) => row.changed) : rows).map(
    (row) =>
      changesOnly
        ? [
            row.plan,
            row.currency,
            row.existingDisplayed,
            row.majorAmount,
            row.rootCause,
          ]
        : [
            row.plan,
            row.currency,
            row.existingDisplayed,
            row.reference,
            row.rawFx,
            row.majorAmount,
            row.stripeAmount,
            row.reconstructedDisplayed,
            row.eurEquivalent,
            row.differencePercent,
            row.status,
            row.existingStatus,
            row.existingDifferencePercent,
          ],
  );
  return (
    [columns, ...values]
      .map((cells) =>
        cells
          .map(
            (value) =>
              `"${String(value ?? "Missing/Invalid").replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\n") + "\n"
  );
}

export function summarizePricingAudit(rows) {
  return {
    unchanged: rows.filter((row) => !row.changed).length,
    changed: rows.filter((row) => row.changed).length,
    fixedOverrides: rows.filter((row) => row.override === "fixed").length,
    regionalOverrides: rows.filter((row) => row.override === "regional").length,
    validationFailures: rows.reduce(
      (sum, row) => sum + row.validationFailures.length,
      0,
    ),
  };
}

export function printPricingAudit(rows, summary) {
  console.table(
    rows.map((row) => ({
      Plan: row.plan,
      Currency: row.currency,
      "Existing displayed": row.existingDisplayed ?? "Missing/Invalid",
      "EUR reference": row.reference,
      "Raw FX": Number(row.rawFx.toFixed(6)),
      "Rounded major": row.majorAmount,
      "Stripe API amount": row.stripeAmount,
      "Reconstructed displayed": row.reconstructedDisplayed,
      "EUR equivalent": Number(row.eurEquivalent.toFixed(4)),
      "Difference %": Number(row.differencePercent.toFixed(2)),
      Status: row.status,
      "Existing status": row.existingStatus,
    })),
  );
  for (const row of rows.filter((row) => row.changed)) {
    console.log(
      `${row.plan} ${row.currency}: ${row.existingDisplayed ?? "Missing/Invalid"} → ${row.majorAmount} (${row.existingStatus})`,
    );
  }
  console.log(
    `Unchanged: ${summary.unchanged}; changed: ${summary.changed}; fixed overrides: ${summary.fixedOverrides}; regional overrides: ${summary.regionalOverrides}; validation failures: ${summary.validationFailures}`,
  );
}
