import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileText,
  X,
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
        <div className="animate-pulse">
          <div className="mt-8 mb-16 md:mb-24">
            <div className="h-12 w-64 rounded-xl bg-slate-100 dark:bg-slate-900 mb-6" />
            <div className="h-6 w-96 max-w-full rounded-lg bg-slate-50 dark:bg-slate-900/50" />
          </div>
          
          <div className="mb-20 py-8 border-y border-slate-100 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="h-12 bg-slate-50 dark:bg-slate-900 rounded-lg w-full" />
             <div className="h-12 bg-slate-50 dark:bg-slate-900 rounded-lg w-full" />
             <div className="h-12 bg-slate-50 dark:bg-slate-900 rounded-lg w-full" />
          </div>

          <div className="space-y-24">
            {[1, 2].map((i) => (
              <div key={i} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-24 border-b border-slate-100 dark:border-slate-800/60">
                <div className="lg:col-span-5">
                   <div className="h-8 w-48 bg-slate-100 dark:bg-slate-900 rounded-lg mb-6" />
                   <div className="h-4 w-32 bg-slate-50 dark:bg-slate-900/50 rounded-lg" />
                </div>
                <div className="lg:col-span-7">
                   <div className="h-24 w-full bg-slate-50 dark:bg-slate-900 rounded-[2rem] mb-4" />
                   <div className="h-24 w-full bg-slate-50 dark:bg-slate-900 rounded-[2rem]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </ReviewShell>
    );
  }

  if (!token || requestError) {
    return (
      <ReviewShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="w-24 h-24 mb-8 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-slate-500" strokeWidth={2} />
          </div>
          <h1 className="mb-4 text-4xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
            {requestError ? "Link Unavailable" : "Invalid Link"}
          </h1>
          <p className="max-w-md text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            {requestError ?? "This secure link is invalid or has already been removed from this browser."}
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
      <div className="mb-16 md:mb-24 mt-8">
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
          Review Required
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          We need a few clarifications before we can save these transactions to your account.
        </p>
      </div>

      <ReviewSourceCard source={review.source} />

      <div className="flex flex-col gap-24">
        {review.items.map((item, index) => {
          const isDeclined = selections[`${item.id}:decline`] === "decline";

          return (
            <section
              key={item.id}
              className={cn(
                "relative transition-all duration-500",
                index !== review.items.length - 1 && "pb-24 border-b border-slate-100 dark:border-slate-800/60"
              )}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
                <div className={cn("lg:col-span-5 transition-opacity duration-300", isDeclined && "opacity-40 grayscale")}>
                  <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-6">
                    {item.summary}
                  </h2>
                  <TransactionContextCard transaction={item.transaction} />
                </div>

                <div className="lg:col-span-7">
                  <div className="flex flex-col gap-10">
                    {item.issues.map((issue) => (
                      <div key={issue.field}>
                        <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                          Confirm {issue.field}
                        </h4>
                        <div className="flex flex-col gap-3">
                          {issue.choices.map((choice) => {
                            const isSelected = selections[`${item.id}:${issue.field}`] === choice.id;

                            return (
                              <label
                                key={choice.id}
                                className={cn(
                                  "group relative flex cursor-pointer items-start justify-between rounded-2xl p-5 transition-all duration-200",
                                  isSelected && !isDeclined
                                    ? "bg-slate-900 dark:bg-slate-100"
                                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800",
                                  isDeclined && "opacity-40 grayscale"
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
                                    }))
                                  }
                                />
                                <div className="flex-1 pr-6">
                                  <div
                                    className={cn(
                                      "text-base font-medium transition-colors",
                                      isSelected && !isDeclined
                                        ? "text-white dark:text-slate-900"
                                        : "text-slate-900 dark:text-slate-100"
                                    )}
                                  >
                                    {choice.label}
                                  </div>
                                  {choice.evidence && (
                                    <div
                                      className={cn(
                                        "mt-1.5 text-sm leading-relaxed transition-colors",
                                        isSelected && !isDeclined
                                          ? "text-slate-300 dark:text-slate-600"
                                          : "text-slate-500 dark:text-slate-400"
                                      )}
                                    >
                                      {choice.evidence}
                                    </div>
                                  )}
                                </div>
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center mt-0.5">
                                  {isSelected && !isDeclined ? (
                                    <Check
                                      className="h-5 w-5 text-white dark:text-slate-900"
                                      strokeWidth={3}
                                    />
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-slate-400 dark:group-hover:border-slate-500 transition-colors" />
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <label
                        className={cn(
                          "group inline-flex cursor-pointer items-center gap-3 transition-colors",
                          isDeclined
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
                            }))
                          }
                        />
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                            isDeclined
                              ? "bg-rose-100 dark:bg-rose-900/30"
                              : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                          )}
                        >
                          <X className="h-4 w-4" strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-medium">Discard this transaction</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {requestError && (
        <div className="mt-12 flex items-start gap-4 rounded-2xl bg-rose-50/50 p-6 dark:bg-rose-500/10">
          <AlertCircle className="h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <p className="text-base font-medium text-rose-800 dark:text-rose-300 leading-relaxed" role="alert">
            {requestError}
          </p>
        </div>
      )}

      <div className="sticky bottom-8 mt-16 flex justify-end z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <Button
            size="lg"
            className={cn(
              "rounded-full px-8 py-6 text-base font-medium shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300",
              isSubmitting && "cursor-wait opacity-80",
              !complete && "opacity-50"
            )}
            disabled={!complete || isSubmitting}
            onClick={submit}
          >
            {isSubmitting ? "Importing..." : "Complete Import"}
            {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
          </Button>
        </div>
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
  const isCompleted = review.status === "completed";
  const isExpired = review.status === "expired";
  const title = isCompleted
    ? "Import Completed"
    : review.status === "declined"
    ? "Import Declined"
    : isExpired
    ? "Link Expired"
    : "Import Failed";

  return (
    <ReviewShell>
      <div className="py-4 md:py-8 flex flex-col items-center text-center">
        <div className={cn(
          "size-12 mb-6 rounded-full flex items-center justify-center",
          isCompleted ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-100 dark:bg-slate-900"
        )}>
          {isCompleted ? (
            <Check className="size-5 text-white dark:text-slate-900" strokeWidth={3} />
          ) : (
            <AlertCircle className="size-5 text-slate-500" strokeWidth={2} />
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-50 mb-6">
          {title}
        </h1>
        <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
          {resultCopy(review.status)}
        </p>

        {isCompleted && (
          <Button
            size="lg"
            className="mt-12 rounded-full px-8 py-6 text-base font-medium"
            onClick={onOpenApp}
          >
            Open Moneko
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        )}
      </div>

      <ReviewSourceCard source={review.source} />

      {review.items.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mb-8">
            Import Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {review.items.map((item) => (
              <div
                key={item.id}
                className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between"
              >
                <TransactionContextCard transaction={item.transaction} />
                <div className="mt-10 flex items-center gap-3 text-sm font-medium">
                  {item.saveStatus === "saved" ? (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-900 dark:text-slate-100">Logged successfully</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400">{resultItemLabel(item.saveStatus)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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
    <div className="mb-20 grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-y border-slate-100 dark:border-slate-800/60">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Source</span>
        <span className="text-base text-slate-900 dark:text-slate-100">{source.senderEmail || "Unknown Sender"}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Date</span>
        <span className="text-base text-slate-900 dark:text-slate-100">{source.receivedAt ? formatReviewDate(source.receivedAt) : "Unknown"}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Documents</span>
        <div className="flex flex-col gap-2 mt-1">
          {source.files?.map((file) => (
            <div key={file.name} className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{file.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h3>
        {typeof transaction.amount === "number" && (
          <div className="text-xl font-medium text-slate-900 dark:text-slate-50 shrink-0">
            {formatReviewAmount(transaction.amount, transaction.currency)}
          </div>
        )}
      </div>
      
      {transaction.description && transaction.description !== title && (
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          {transaction.description}
        </p>
      )}
      
      {details.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-500">
          {details.map((detail, i) => (
            <span key={`${detail}-${i}`} className="flex items-center gap-4">
              <span>{detail}</span>
              {i < details.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans dark:bg-slate-950 selection:bg-slate-100 dark:selection:bg-slate-800">
      <main className="mx-auto max-w-4xl px-6 ">{children}</main>
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

