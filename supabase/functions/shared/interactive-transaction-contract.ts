import { VALID_CURRENCIES } from "./currency-validator.ts";
import { getCurrencySymbol } from "./currency-symbols.ts";

export interface InteractiveRequest {
  version: 1;
  answers: Array<{ question: string; answer: string }>;
  clientIssue?: {
    itemIndex: number;
    field: "transactionTime";
    reason: "nonexistent_wall_time" | "ambiguous_wall_time";
  };
}

export interface InteractiveSource {
  text?: string;
  audio?: { data: string; contentType: string };
}

export function parseInteractiveSource(value: unknown): InteractiveSource {
  const input = objectValue(value);
  for (
    const field of [
      "currency",
      "date",
      "language",
      "userId",
      "householdId",
      "accountId",
    ]
  ) {
    if (input[field] != null && !boundedText(input[field], 256)) {
      throw new Error(`Invalid interactive ${field}`);
    }
  }
  if (input.date != null && !validDate(input.date)) {
    throw new Error("Invalid interactive default date");
  }
  if (
    input.image != null || (input.attachments != null &&
      (!Array.isArray(input.attachments) || input.attachments.length > 0))
  ) {
    throw new Error("Interactive analysis requires text or audio");
  }
  if (
    input.text != null &&
    (typeof input.text !== "string" || input.text.length > 16000)
  ) {
    throw new Error("Invalid interactive text");
  }
  const audio = input.audio == null ? undefined : objectValue(input.audio);
  if (
    audio && (!boundedText(audio.data, 16000000) ||
      !["audio/aac", "audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a"]
        .includes(String(audio.contentType)))
  ) {
    throw new Error("Invalid interactive audio");
  }
  if (!(typeof input.text === "string" && input.text.trim()) && !audio) {
    throw new Error("Missing interactive source");
  }
  return {
    ...(typeof input.text === "string" && input.text.trim()
      ? { text: input.text }
      : {}),
    ...(audio
      ? {
        audio: {
          data: audio.data as string,
          contentType: audio.contentType as string,
        },
      }
      : {}),
  };
}

export interface InteractiveSpace {
  id: string;
  name: string;
  isPortfolio: boolean;
  members: Array<{ userId: string; name: string }>;
  autoSplitEnabled?: boolean;
}

export interface InteractiveWallet {
  id: string;
  name: string;
  currency: string;
  spaceId: string;
}

export interface InteractiveContext {
  userId: string;
  defaultSpaceId: string;
  defaultWalletId: string | null;
  currency: string;
  date: string;
  language: string;
  preferredTimezone?: string;
  expenseCategories: string[];
  incomeCategories: string[];
  spaces: InteractiveSpace[];
  wallets: InteractiveWallet[];
}

export interface InteractiveIssue {
  itemIndex: number;
  field: string;
  reason: string;
}

export interface InteractiveItem extends Record<string, unknown> {
  type: "expense" | "income";
  amount: number;
  currency: string;
  category: string;
  date: string;
  explicitFields: string[];
  destination: {
    householdId: string | null;
    isPortfolio: boolean;
    accountId: string | null;
    accountCurrency: string | null;
    spaceLabel: string;
  };
}

export interface InteractiveQuestion {
  question: string;
  choices: string[];
  allowCustomResponse: true;
}

export function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parseInteractiveRequest(
  value: unknown,
): InteractiveRequest | null {
  if (value === undefined) return null;
  const input = objectValue(value);
  if (input.version !== 1) {
    throw new Error("Unsupported interactive analysis version");
  }
  const answers = input.answers ?? [];
  if (!Array.isArray(answers) || answers.length > 12) {
    throw new Error("Invalid clarification history");
  }
  const clientIssue = input.clientIssue == null
    ? undefined
    : objectValue(input.clientIssue);
  if (
    clientIssue &&
    (clientIssue.field !== "transactionTime" ||
      !Number.isInteger(clientIssue.itemIndex) ||
      Number(clientIssue.itemIndex) < 0 ||
      Number(clientIssue.itemIndex) >= 40 ||
      !["nonexistent_wall_time", "ambiguous_wall_time"].includes(
        String(clientIssue.reason),
      ))
  ) throw new Error("Invalid client clock issue");
  return {
    version: 1,
    ...(clientIssue
      ? {
        clientIssue: clientIssue as NonNullable<
          InteractiveRequest["clientIssue"]
        >,
      }
      : {}),
    answers: answers.map((value) => {
      const answer = objectValue(value);
      if (
        !boundedText(answer.question, 1200) || !boundedText(answer.answer, 4000)
      ) {
        throw new Error("Invalid clarification answer");
      }
      return {
        question: String(answer.question).trim(),
        answer: String(answer.answer).trim(),
      };
    }),
  };
}

export function parseInteractiveQuestion(value: unknown): InteractiveQuestion {
  const input = objectValue(value);
  const choices = Array.isArray(input.choices)
    ? input.choices.map((choice) =>
      typeof choice === "string" ? choice.trim() : choice
    )
    : [];
  if (
    !boundedText(input.question, 1200) || !Array.isArray(input.choices) ||
    choices.length < 2 || choices.length > 4 ||
    !choices.every((choice) => boundedText(choice, 400)) ||
    new Set(choices).size !== choices.length
  ) {
    throw new Error("Invalid clarification question");
  }
  return {
    question: String(input.question).trim(),
    choices: choices as string[],
    allowCustomResponse: true,
  };
}

export function validateInteractiveItems(
  raw: unknown,
  context: InteractiveContext,
): {
  items: InteractiveItem[];
  issues: InteractiveIssue[];
} {
  const issues: InteractiveIssue[] = [];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) {
    return {
      items: [],
      issues: [{
        itemIndex: 0,
        field: "items",
        reason: "Provide between 1 and 40 supported transactions",
      }],
    };
  }
  const items = raw.map((value, itemIndex): InteractiveItem => {
    const item = objectValue(value);
    const issue = (field: string, reason: string) =>
      issues.push({ itemIndex, field, reason });
    const explicitFields =
      Array.isArray(item.explicitFields) && item.explicitFields.every((field) =>
          typeof field === "string"
        )
        ? item.explicitFields as string[]
        : [];
    if (
      !Array.isArray(item.explicitFields) ||
      explicitFields.length !== item.explicitFields.length ||
      new Set(explicitFields).size !== explicitFields.length
    ) issue("explicitFields", "Missing or invalid field provenance");
    for (const field of Object.keys(item)) {
      if (field !== "explicitFields" && !INTERACTIVE_FIELDS.includes(field)) {
        issue(
          field,
          "Unsupported instruction must be clarified, not discarded",
        );
      }
    }
    for (const field of explicitFields) {
      if (!INTERACTIVE_FIELDS.includes(field) || item[field] == null) {
        issue(
          field,
          "Explicit instruction has no supported value",
        );
      }
    }
    for (
      const field of [
        "spaceId",
        "walletId",
        "payerUserId",
        "customSplits",
        "transactionTime",
      ]
    ) {
      if (item[field] != null && !explicitFields.includes(field)) {
        issue(
          field,
          "User-specific values require explicit source or clarification evidence",
        );
      }
    }
    const namedWallet = item.walletId == null
      ? null
      : context.wallets.find((wallet) => wallet.id === item.walletId);
    if (item.walletId != null && !namedWallet) {
      issue(
        "walletId",
        "Wallet is unavailable or unauthorized",
      );
    }
    const spaceId = item.spaceId ?? namedWallet?.spaceId ??
      context.defaultSpaceId;
    const space = context.spaces.find((space) => space.id === spaceId);
    if (!space) issue("spaceId", "Space is unavailable or unauthorized");
    const drawerWallet = context.wallets.find((wallet) =>
      wallet.id === context.defaultWalletId && wallet.spaceId === spaceId
    );
    if (
      item.walletId == null && spaceId === context.defaultSpaceId &&
      context.defaultWalletId != null && !drawerWallet
    ) {
      issue(
        "walletId",
        "Selected drawer wallet is unavailable; ask for an authorized replacement rather than substituting another wallet",
      );
    }
    const defaultCurrency = namedWallet?.currency ?? drawerWallet?.currency ??
      context.currency;
    const currency = item.currency ?? defaultCurrency;
    if (
      item.currency != null && currency !== defaultCurrency &&
      !explicitFields.includes("currency")
    ) {
      issue(
        "currency",
        "Changing native currency requires explicit source or clarification evidence",
      );
    }
    if (
      typeof currency !== "string" || !VALID_CURRENCIES.includes(currency)
    ) issue("currency", "Unsupported native currency");
    if (
      namedWallet &&
      (namedWallet.spaceId !== spaceId || namedWallet.currency !== currency)
    ) {
      issue(
        "walletId",
        "Explicit wallet conflicts with transaction Space or native currency",
      );
    }
    const defaultWallet =
      spaceId === context.defaultSpaceId && drawerWallet?.currency === currency
        ? drawerWallet
        : null;
    const wallet = namedWallet ?? defaultWallet;
    const amount = item.amount;
    if (
      typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100))
    ) {
      issue("amount", "A positive finite amount is required");
    } else if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
      issue("amount", "Amount exceeds supported minor-unit precision");
    }
    if (item.type !== "expense" && item.type !== "income") {
      issue(
        "type",
        "Unsupported transaction type",
      );
    }
    const categories = item.type === "income"
      ? context.incomeCategories
      : context.expenseCategories;
    if (
      typeof item.category !== "string" || !categories.includes(item.category)
    ) {
      issue(
        "category",
        "Category must be an allowed category for this transaction type",
      );
    }
    const date = item.date ?? context.date;
    if (!validDate(date)) issue("date", "Invalid calendar date");
    if (
      item.date != null && date !== context.date &&
      !explicitFields.includes("date")
    ) {
      issue(
        "date",
        "Changing the caller calendar date requires explicit source or clarification evidence",
      );
    }
    if (
      item.transactionTime != null &&
      (typeof item.transactionTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(item.transactionTime))
    ) {
      issue("transactionTime", "Invalid normalized wall-clock time");
    }
    for (const field of ["description", "merchant"]) {
      if (
        item[field] != null &&
        !boundedText(item[field], field === "merchant" ? 255 : 4000)
      ) {
        issue(
          field,
          "Invalid text value",
        );
      }
    }
    const memberIds = new Set(space?.members.map((member) => member.userId));
    if (
      item.payerUserId != null &&
      (!memberIds.has(String(item.payerUserId)) || space?.isPortfolio ||
        spaceId === "personal")
    ) {
      issue("payerUserId", "Payer must belong to the selected shared Space");
    }
    if (
      item.payerUserId != null && item.payerUserId !== context.userId &&
      space?.autoSplitEnabled === false && item.customSplits == null
    ) {
      issue(
        "payerUserId",
        "This Space has auto-split disabled; preserving another payer requires an explicit allocation. Ask the user rather than silently losing the payer",
      );
    }
    if (item.customSplits != null) {
      if (
        !space || space.isPortfolio || spaceId === "personal" ||
        !explicitFields.includes("customSplits")
      ) {
        issue(
          "customSplits",
          "An explicit split requires an authorized shared Space",
        );
      } else {
        const splitIssue = validateSplit(
          item.customSplits,
          memberIds,
          Number(amount),
        );
        if (splitIssue) issue("customSplits", splitIssue);
      }
    }
    if (
      item.isRecurring != null && typeof item.isRecurring !== "boolean"
    ) issue("isRecurring", "Recurrence must be a boolean");
    if (item.recurrence_rule != null && item.isRecurring !== true) {
      issue(
        "recurrence_rule",
        "A recurrence rule requires explicit recurring intent",
      );
    }
    if (item.isRecurring === true) {
      if (!explicitFields.includes("isRecurring")) {
        issue(
          "isRecurring",
          "Recurrence requires explicit source or clarification evidence",
        );
      }
      const rule = objectValue(item.recurrence_rule);
      if (
        Object.keys(rule).some((field) =>
          !["frequency", "interval", "anchor_date", "end_date"].includes(field)
        )
      ) {
        issue(
          "recurrence_rule",
          "Unsupported recurrence details must be clarified, not discarded",
        );
      }
      if (
        !["daily", "weekly", "biweekly", "monthly", "yearly", "custom"]
          .includes(String(rule.frequency)) ||
        !Number.isInteger(rule.interval) || Number(rule.interval) < 1 ||
        Number(rule.interval) > 365 ||
        !validDate(rule.anchor_date) || rule.anchor_date !== date ||
        (rule.end_date != null &&
          (!validDate(rule.end_date) ||
            String(rule.end_date) < String(rule.anchor_date)))
      ) {
        issue("recurrence_rule", "Unsupported or incomplete recurrence rule");
      }
      if (item.transactionTime != null) {
        issue(
          "transactionTime",
          "Recurring templates do not support a scheduled wall time; clarify whether to record a dated transaction instead",
        );
      }
    }
    const retained = Object.fromEntries(
      INTERACTIVE_FIELDS.filter((field) =>
        !["spaceId", "walletId"].includes(field) && item[field] != null
      ).map((field) => [field, item[field]]),
    );
    return {
      ...retained,
      ...(item.customSplits != null &&
          !issues.some((entry) => entry.itemIndex === itemIndex)
        ? {
          customSplits: completeSplitMembers(
            item.customSplits,
            memberIds,
            Number(amount),
          ),
        }
        : {}),
      type: item.type as InteractiveItem["type"],
      amount: Number(amount),
      currency: String(currency),
      currencySymbol: getCurrencySymbol(String(currency)),
      category: String(item.category),
      date: String(date),
      explicitFields,
      destination: {
        householdId: spaceId === "personal" ? null : String(spaceId),
        isPortfolio: space?.isPortfolio ?? false,
        accountId: wallet?.id ?? null,
        accountCurrency: wallet?.currency ?? null,
        spaceLabel: space?.name ?? "",
      },
    };
  });
  return { items: issues.length ? [] : items, issues };
}

function validateSplit(
  raw: unknown,
  memberIds: Set<string>,
  total: number,
): string | null {
  const split = objectValue(raw);
  if (
    Object.keys(split).some((field) =>
      !["splitType", "memberSplits"].includes(field)
    )
  ) return "Unsupported split details";
  const lines = split.memberSplits;
  if (
    !["equal", "amount", "percentage", "shares"].includes(
      String(split.splitType),
    ) || !Array.isArray(lines) || !lines.length
  ) return "Unsupported split";
  const seen = new Set<string>();
  let sum = 0;
  for (const value of lines) {
    const line = objectValue(value);
    if (
      typeof line.userId !== "string" || !memberIds.has(line.userId) ||
      seen.has(line.userId)
    ) return "Unresolved or duplicate split member";
    seen.add(line.userId);
    const key = split.splitType === "percentage"
      ? "percentage"
      : split.splitType === "shares"
      ? "shares"
      : "amount";
    if (
      Object.keys(line).some((field) =>
        field !== "userId" && (split.splitType === "equal" || field !== key)
      )
    ) return "Conflicting or unsupported allocation fields";
    if (split.splitType === "equal") continue;
    const amount = line[key];
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return "Invalid allocation";
    }
    if (key === "shares" && (!Number.isSafeInteger(amount) || amount <= 0)) {
      return "Invalid shares";
    }
    if (
      key === "amount" &&
      (!Number.isSafeInteger(Math.round(amount * 100)) ||
        Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)
    ) return "Invalid allocation precision";
    sum += key === "amount" ? Math.round(amount * 100) : amount;
  }
  if (split.splitType === "amount" && sum !== Math.round(total * 100)) {
    return "Explicit allocations do not equal the total; ask who receives the remainder or which value to correct";
  }
  if (split.splitType === "percentage" && Math.abs(sum - 100) > 0.000001) {
    return "Explicit percentages do not total 100";
  }
  return null;
}

function completeSplitMembers(
  raw: unknown,
  memberIds: Set<string>,
  total: number,
) {
  const split = objectValue(raw);
  const lines = (split.memberSplits as unknown[]).map(objectValue);
  const missing = [...memberIds].filter((id) =>
    !lines.some((line) => line.userId === id)
  );
  const isEqual = split.splitType === "equal";
  const key = split.splitType === "percentage"
    ? "percentage"
    : split.splitType === "shares"
    ? "shares"
    : "amount";
  if (!missing.length) {
    // Save handlers distinguish deliberate equal intent using this sentinel;
    // numeric equal-looking payloads otherwise fall back to stored defaults.
    if (isEqual || lines.every((line) => line[key] === lines[0][key])) {
      return {
        splitType: "equal",
        memberSplits: lines.map((line) => ({ userId: line.userId })),
      };
    }
    return split;
  }
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / lines.length);
  return {
    splitType: isEqual ? "amount" : split.splitType,
    memberSplits: [
      ...lines.map((line, index) =>
        isEqual
          ? {
            userId: line.userId,
            amount: (base + (index === 0 ? cents - base * lines.length : 0)) /
              100,
          }
          : line
      ),
      ...missing.map((userId) => ({ userId, [key]: 0 })),
    ],
  };
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= max;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export const INTERACTIVE_FIELDS = [
  "type",
  "amount",
  "category",
  "currency",
  "date",
  "transactionTime",
  "description",
  "merchant",
  "spaceId",
  "walletId",
  "payerUserId",
  "customSplits",
  "isRecurring",
  "recurrence_rule",
];
