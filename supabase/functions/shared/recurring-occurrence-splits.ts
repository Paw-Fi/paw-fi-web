type JsonObject = Record<string, unknown>;

const asObject = (value: unknown): JsonObject | null =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;

const memberUserId = (value: unknown) => {
  const object = asObject(value);
  const userId = object?.userId;
  return typeof userId === "string" && userId.trim().length > 0
    ? userId.trim()
    : null;
};

export function completeRecurringOccurrenceSplitMembers(
  customSplits: unknown,
  householdMemberUserIds: readonly string[],
  totalAmountCents: number,
): unknown {
  const split = asObject(customSplits);
  const memberSplits = split?.memberSplits;
  const splitType = split?.splitType;
  if (
    split == null ||
    !Array.isArray(memberSplits) ||
    memberSplits.length === 0 ||
    (splitType !== "amount" && splitType !== "equal")
  ) {
    return customSplits;
  }

  const existingUserIds = memberSplits.map(memberUserId);
  if (existingUserIds.some((userId) => userId == null)) {
    return customSplits;
  }
  const existing = new Set(existingUserIds as string[]);
  const missing = [
    ...new Set(
      householdMemberUserIds.map((userId) => userId.trim()).filter(Boolean),
    ),
  ].filter((userId) => !existing.has(userId));
  if (missing.length === 0) return customSplits;

  const preservedMembers = splitType === "amount"
    ? memberSplits.map((member) => ({ ...asObject(member)! }))
    : memberSplits.map((_, index) => {
      const baseAmountCents = Math.floor(
        totalAmountCents / memberSplits.length,
      );
      const remainder = totalAmountCents % memberSplits.length;
      return {
        userId: existingUserIds[index],
        amount: (baseAmountCents + (index < remainder ? 1 : 0)) / 100,
      };
    });

  return {
    ...split,
    splitType: "amount",
    memberSplits: [
      ...preservedMembers,
      ...missing.map((userId) => ({ userId, amount: 0 })),
    ],
  };
}
