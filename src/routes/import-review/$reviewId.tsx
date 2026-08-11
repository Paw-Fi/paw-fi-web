import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Mail,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/import-review/$reviewId")({
  component: ImportReviewPage,
});

interface ReviewChoice {
  id: string;
  label: string;
  evidence: string;
}
interface ReviewIssue {
  field: string;
  choices: ReviewChoice[];
}
interface ReviewItem {
  id: string;
  summary: string;
  issues: ReviewIssue[];
  transaction: ReviewTransaction;
  saveStatus?: string;
  transactionId?: string;
}
interface ReviewTransaction {
  type?: "expense" | "income";
  amount?: number;
  currency?: string;
  date?: string;
  merchant?: string;
  description?: string;
  category?: string;
}
interface ReviewSourceFile {
  name: string;
  status: "processed" | "failed" | "unknown";
  transactionCount: number;
}
interface ReviewSource {
  senderEmail?: string;
  subjectLine?: string;
  receivedAt?: string;
  files: ReviewSourceFile[];
}
interface Review {
  status: string;
  version: number;
  expiresAt?: string;
  source: ReviewSource;
  items: ReviewItem[];
}

const REVIEW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod/i;
const attemptedAppLaunches = new Set<string>();

function attemptMobileAppLaunch(reviewId: string, secret: string) {
  const isMobile = MOBILE_USER_AGENT_PATTERN.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isMobile) return;

  const launchKey = `moneko:import-review:app-launch:${reviewId}`;
  if (attemptedAppLaunches.has(launchKey)) return;
  try {
    if (window.sessionStorage.getItem(launchKey) === "1") return;
    window.sessionStorage.setItem(launchKey, "1");
  } catch {
    // The in-memory guard still prevents another attempt during this page load.
  }
  attemptedAppLaunches.add(launchKey);
  openMobileApp(reviewId, secret);
}

function openMobileApp(reviewId: string, secret: string) {
  window.location.href = `moneko://import-review/${reviewId}#${secret}`;
}

function ImportReviewPage() {
  const { reviewId } = Route.useParams();
  const [review, setReview] = useState<Review | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedToken, setHasLoadedToken] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const isActiveRef = useRef(true);
  const activeReviewIdRef = useRef(reviewId);
  const pollTimeoutRef = useRef<number | null>(null);

  const isCurrentReview = () =>
    isActiveRef.current && activeReviewIdRef.current === reviewId;

  useEffect(() => {
    isActiveRef.current = true;
    activeReviewIdRef.current = reviewId;
    setReview(null);
    setToken(null);
    setSelections({});
    setIsSubmitting(false);
    setRequestError(null);
    const cleanup = () => {
      isActiveRef.current = false;
      if (pollTimeoutRef.current != null) {
        window.clearTimeout(pollTimeoutRef.current);
      }
    };
    const storageKey = `moneko:import-review:${reviewId}`;
    const fragmentSecret = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    let storedSecret: string | null = null;
    try {
      storedSecret = window.sessionStorage.getItem(storageKey);
    } catch {
      storedSecret = null;
    }
    const secret = REVIEW_TOKEN_PATTERN.test(fragmentSecret)
      ? fragmentSecret
      : storedSecret;
    setHasLoadedToken(true);
    if (!secret || !REVIEW_TOKEN_PATTERN.test(secret)) return cleanup;
    try {
      window.sessionStorage.setItem(storageKey, secret);
    } catch {
      // The active page keeps the bearer only in memory when storage is blocked.
    }
    setToken(secret);
    attemptMobileAppLaunch(reviewId, secret);
    void inspect(secret);
    return cleanup;
  }, [reviewId]);

  async function inspect(secret: string) {
    if (!isCurrentReview()) return;
    setRequestError(null);
    const { data, error } = await supabase.functions.invoke(
      "email-import-review-inspect",
      {
        body: { reviewId, token: secret },
      },
    );
    if (!isCurrentReview()) return;
    if (error || !data) {
      setIsSubmitting(false);
      setRequestError("This review link is unavailable or has expired.");
      return;
    }
    if (data.status === "processing") {
      setIsSubmitting(true);
      pollTimeoutRef.current = window.setTimeout(
        () => void inspect(secret),
        1500,
      );
      return;
    }
    setIsSubmitting(false);
    if (data.status !== "pending") {
      try {
        window.sessionStorage.removeItem(`moneko:import-review:${reviewId}`);
      } catch {
        // The bearer may only exist in memory when storage is blocked.
      }
    }
    setReview(data as Review);
  }

  async function submit() {
    if (!token || !review || isSubmitting) return;
    setIsSubmitting(true);
    setRequestError(null);
    let shouldKeepSubmitting = false;
    try {
      const { data, error } = await supabase.functions.invoke(
        "email-import-review-submit",
        {
          body: {
            reviewId,
            token,
            version: review.version,
            decisions: review.items.map((item) => ({
              itemId: item.id,
              ...(selections[`${item.id}:decline`] === "decline"
                ? { decline: true }
                : {
                  optionIds: item.issues
                    .map((issue) => selections[`${item.id}:${issue.field}`])
                    .filter(Boolean),
                }),
            })),
          },
        },
      );
      if (!isCurrentReview()) return;
      if (error || !data) {
        setRequestError(
          "We could not confirm this import. Your choices are unchanged; please try again.",
        );
        return;
      }
      if (data.status === "processing") {
        shouldKeepSubmitting = true;
        await inspect(token);
      } else {
        try {
          window.sessionStorage.removeItem(`moneko:import-review:${reviewId}`);
        } catch {
          // The bearer may only exist in memory when storage is blocked.
        }
        setReview(data as Review);
      }
    } finally {
      if (isCurrentReview() && !shouldKeepSubmitting) setIsSubmitting(false);
    }
  }

  if (!hasLoadedToken || (token && !review && !requestError)) {
    return (
      <ReviewShell>
        <div className="flex animate-pulse flex-col gap-10">
          <div className="mb-6">
            <div className="mb-4 h-10 w-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>

          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-4">
              <div className="mx-2 h-6 w-1/3 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="h-24 border-b border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900" />
                <div className="h-24 bg-white dark:bg-slate-900" />
              </div>
            </div>
          ))}
        </div>
      </ReviewShell>
    );
  }

  if (!token || requestError) {
    return (
      <ReviewShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <AlertCircle className="mb-6 h-16 w-16 text-rose-500" />
          <h1 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {requestError ? "Link Unavailable" : "Invalid Link"}
          </h1>
          <p className="mb-10 max-w-sm text-lg text-slate-500 dark:text-slate-400">
            {requestError ??
              "This secure link is invalid or has already been removed from this browser."}
          </p>
        </div>
      </ReviewShell>
    );
  }

  if (!review) return null;

  if (review.status !== "pending") {
    return (
      <ReviewResult
        review={review}
        onOpenApp={() => openMobileApp(reviewId, token)}
      />
    );
  }

  const complete = review.items.every(
    (item) =>
      selections[`${item.id}:decline`] === "decline" ||
      item.issues.every((issue) => selections[`${item.id}:${issue.field}`]),
  );

  return (
    <ReviewShell>
      <div className="mb-10 px-2">
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Review import
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400">
          We need a few clarifications before saving these transactions.
        </p>
      </div>

      <ReviewSourceCard source={review.source} />

      <div className="mt-10 flex flex-col gap-10">
        {review.items.map((item) => {
          const isDeclined = selections[`${item.id}:decline`] === "decline";

          return (
            <section key={item.id} className="transition-all duration-500">
              <h2
                className={cn(
                  "mb-4 px-2 text-xl font-semibold tracking-tight transition-colors",
                  isDeclined
                    ? "text-slate-500 line-through decoration-slate-300 dark:text-slate-500 dark:decoration-slate-600"
                    : "text-slate-900 dark:text-slate-100",
                )}
              >
                {item.summary}
              </h2>

              <TransactionContextCard transaction={item.transaction} />

              <div className="mt-6 flex flex-col gap-6">
                {item.issues.map((issue) => (
                  <div key={issue.field}>
                    <h3 className="mb-2 px-2 text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      Select {issue.field}
                    </h3>

                    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                      {issue.choices.map((choice, choiceIdx) => {
                        const isSelected =
                          selections[`${item.id}:${issue.field}`] === choice.id;

                        return (
                          <label
                            key={choice.id}
                            className={cn(
                              "group relative flex cursor-pointer items-center justify-between p-5 transition-colors",
                              "hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50 dark:active:bg-slate-800",
                              choiceIdx > 0 &&
                                "border-t border-slate-100 dark:border-slate-800/80",
                              isDeclined && "opacity-50 grayscale",
                            )}
                          >
                            <input
                              type="radio"
                              className="peer sr-only"
                              name={`${item.id}:${issue.field}`}
                              checked={isSelected && !isDeclined}
                              onChange={() =>
                                setSelections((current) => ({
                                  ...current,
                                  [`${item.id}:decline`]: "",
                                  [`${item.id}:${issue.field}`]: choice.id,
                                }))}
                            />
                            <div className="flex-1 pr-4">
                              <div
                                className={cn(
                                  "text-lg transition-colors",
                                  isSelected && !isDeclined
                                    ? "font-semibold text-slate-900 dark:text-slate-50"
                                    : "font-medium text-slate-700 dark:text-slate-300",
                                )}
                              >
                                {choice.label}
                              </div>
                              {choice.evidence && (
                                <div className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                                  {choice.evidence}
                                </div>
                              )}
                            </div>
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                              {isSelected && !isDeclined && (
                                <Check
                                  className="h-6 w-6 text-blue-600 dark:text-blue-500"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                  <label
                    className={cn(
                      "group relative flex cursor-pointer items-center justify-between p-5 transition-colors",
                      "hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50 dark:active:bg-slate-800",
                      isDeclined &&
                        "bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-900/10 dark:hover:bg-rose-900/20",
                    )}
                  >
                    <input
                      type="radio"
                      className="peer sr-only"
                      name={`${item.id}:decline`}
                      checked={isDeclined}
                      onChange={() =>
                        setSelections((current) => ({
                          ...current,
                          [`${item.id}:decline`]: "decline",
                        }))}
                    />
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                          isDeclined
                            ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500",
                        )}
                      >
                        <XCircle className="h-6 w-6" />
                      </div>
                      <span
                        className={cn(
                          "text-lg font-semibold",
                          isDeclined
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-slate-700 dark:text-slate-300",
                        )}
                      >
                        Do not import this
                      </span>
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {isDeclined && (
                        <Check
                          className="h-6 w-6 text-rose-600 dark:text-rose-500"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {requestError && (
        <div className="mt-10 flex items-center gap-3 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-200 dark:bg-rose-900/20 dark:ring-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <p
            className="text-sm font-medium text-rose-800 dark:text-rose-300"
            role="alert"
          >
            {requestError}
          </p>
        </div>
      )}

      <div className="mt-16 pb-8">
        <Button
          size="lg"
          className={cn(
            "w-full rounded-full py-7 text-lg font-semibold shadow-sm transition-all sm:py-8",
            isSubmitting && "cursor-wait opacity-80",
          )}
          disabled={!complete || isSubmitting}
          onClick={submit}
        >
          {isSubmitting ? "Importing..." : "Confirm and import"}
        </Button>
      </div>
    </ReviewShell>
  );
}

function ReviewResult({
  review,
  onOpenApp,
}: {
  review: Review;
  onOpenApp: () => void;
}) {
  const title = review.status === "completed"
    ? "Import completed"
    : review.status === "declined"
    ? "Import declined"
    : review.status === "expired"
    ? "Link expired"
    : "Import failed";
  const icon = review.status === "completed"
    ? <CheckCircle2 className="h-16 w-16 text-emerald-500" />
    : review.status === "declined"
    ? <XCircle className="h-16 w-16 text-slate-400" />
    : review.status === "expired"
    ? <Clock className="h-16 w-16 text-amber-500" />
    : <AlertCircle className="h-16 w-16 text-rose-500" />;

  return (
    <ReviewShell>
      <div className="flex flex-col items-center text-center">
        {icon}
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        <p className="mt-3 max-w-md text-lg text-slate-500 dark:text-slate-400">
          {resultCopy(review.status)}
        </p>
      </div>

      <div className="mt-10">
        <ReviewSourceCard source={review.source} />
      </div>

      {review.items.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 px-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Import results
          </h2>
          <div className="flex flex-col gap-4">
            {review.items.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  {item.saveStatus === "saved"
                    ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Transaction logged
                        </span>
                      </>
                    )
                    : (
                      <>
                        <AlertCircle className="h-5 w-5 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-400">
                          {resultItemLabel(item.saveStatus)}
                        </span>
                      </>
                    )}
                </div>
                <TransactionContextCard transaction={item.transaction} />
              </div>
            ))}
          </div>
        </section>
      )}

      {review.status === "completed" && (
        <Button
          size="lg"
          className="mt-10 w-full rounded-full py-7 text-lg font-semibold sm:py-8"
          onClick={onOpenApp}
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          Open Moneko
        </Button>
      )}
    </ReviewShell>
  );
}

function ReviewSourceCard({ source }: { source: ReviewSource }) {
  const hasDetails = source?.senderEmail ||
    source?.subjectLine ||
    source?.receivedAt ||
    source?.files?.length;
  if (!hasDetails) return null;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            Forwarded import
          </div>
          {source.receivedAt && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Received {formatReviewDate(source.receivedAt)}
            </div>
          )}
        </div>
      </div>
      {source.subjectLine && (
        <div className="mt-5 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {source.subjectLine}
        </div>
      )}
      {source.senderEmail && (
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          From {source.senderEmail}
        </div>
      )}
      {source.files?.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800">
          {source.files.map((file) => (
            <div key={file.name} className="flex items-center gap-3 py-2">
              <FileText
                className={cn(
                  "h-5 w-5 shrink-0",
                  file.status === "failed" ? "text-rose-500" : "text-slate-400",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                {file.name}
              </span>
              <span
                className={cn(
                  "text-xs",
                  file.status === "failed"
                    ? "text-rose-500"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                {file.status === "failed"
                  ? "Could not read"
                  : `${file.transactionCount} found`}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TransactionContextCard({
  transaction,
}: {
  transaction: ReviewTransaction;
}) {
  if (!transaction || Object.keys(transaction).length === 0) return null;
  const title = transaction.merchant ||
    transaction.description ||
    "Transaction awaiting review";
  const details = [
    transaction.type && titleCase(transaction.type),
    transaction.category && titleCase(transaction.category),
    transaction.date && formatReviewDate(transaction.date),
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-950/60 dark:ring-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </div>
        {typeof transaction.amount === "number" && (
          <div className="shrink-0 text-lg font-bold text-slate-900 dark:text-slate-50">
            {formatReviewAmount(transaction.amount, transaction.currency)}
          </div>
        )}
      </div>
      {transaction.description && transaction.description !== title && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {transaction.description}
        </p>
      )}
      {details.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {details.map((detail) => (
            <span
              key={detail}
              className="rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {detail}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans dark:bg-slate-950">
      <main className="mx-auto max-w-2xl px-5 py-12 md:py-20">{children}</main>
    </div>
  );
}

function resultCopy(status: string) {
  if (status === "completed") {
    return "The transactions below were securely added to your account.";
  }
  if (status === "declined") {
    return "This transaction was discarded and will not be imported.";
  }
  if (status === "expired") {
    return "For your security, this review link has expired. Please initiate a new import.";
  }
  if (status === "failed") return "This transaction could not be imported.";
  return "This review link is currently unavailable.";
}

function resultItemLabel(status?: string) {
  if (status === "duplicate") return "Already logged";
  if (status === "declined") return "Not imported";
  if (status === "failed") return "Could not log";
  return "Processed";
}

function formatReviewAmount(amount: number, currency?: string) {
  return `${currency ?? ""} ${amount.toFixed(2)}`.trim();
}

function formatReviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function titleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
