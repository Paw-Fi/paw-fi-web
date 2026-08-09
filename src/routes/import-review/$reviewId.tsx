import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  saveStatus?: string;
}
interface Review {
  status: string;
  version: number;
  expiresAt?: string;
  items: ReviewItem[];
}

const REVIEW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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

  if (!hasLoadedToken)
    return (
      <ReviewShell>
        <div className="flex animate-pulse flex-col gap-12">
          <div>
            <div className="mb-4 h-8 w-48 rounded-sm bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-3/4 rounded-sm bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </ReviewShell>
    );

  if (!token)
    return (
      <ReviewShell>
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
          Invalid Link
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          This secure link is invalid or has already been removed from this
          browser.
        </p>
      </ReviewShell>
    );

  if (!review && requestError)
    return (
      <ReviewShell>
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
          Link Unavailable
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400" role="alert">
          {requestError}
        </p>
      </ReviewShell>
    );

  if (!review)
    return (
      <ReviewShell>
        <div className="flex animate-pulse flex-col gap-12">
          <div>
            <div className="mb-4 h-8 w-48 rounded-sm bg-slate-200 dark:bg-slate-800" />
            <div className="h-5 w-3/4 rounded-sm bg-slate-100 dark:bg-slate-900" />
          </div>

          <div className="border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="mb-8 h-6 w-1/3 rounded-sm bg-slate-200 dark:bg-slate-800" />
            <div className="mb-4 h-4 w-16 rounded-sm bg-slate-200 dark:bg-slate-800" />
            <div className="mb-4 flex gap-4">
              <div className="h-4 w-4 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1">
                <div className="mb-2 h-5 w-1/2 rounded-sm bg-slate-100 dark:bg-slate-900" />
                <div className="h-4 w-1/3 rounded-sm bg-slate-100 dark:bg-slate-900" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-4 shrink-0 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1">
                <div className="mb-2 h-5 w-1/2 rounded-sm bg-slate-100 dark:bg-slate-900" />
                <div className="h-4 w-1/3 rounded-sm bg-slate-100 dark:bg-slate-900" />
              </div>
            </div>
          </div>
        </div>
      </ReviewShell>
    );

  if (review.status !== "pending") {
    let title = "Review Unavailable";

    if (review.status === "completed") {
      title = "Import Completed";
    } else if (review.status === "declined") {
      title = "Import Declined";
    } else if (review.status === "expired") {
      title = "Link Expired";
    } else if (review.status === "failed") {
      title = "Import Failed";
    }

    return (
      <ReviewShell>
        <h1 className="mb-2 text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h1>
        <p className="mb-8 text-lg text-slate-600 dark:text-slate-400">
          {resultCopy(review.status)}
        </p>
        <Button variant="outline" asChild>
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </ReviewShell>
    );
  }

  const complete = review.items.every(
    (item) =>
      selections[`${item.id}:decline`] === "decline" ||
      item.issues.every((issue) => selections[`${item.id}:${issue.field}`]),
  );

  return (
    <ReviewShell>
      <div className="mb-12">
        <h1 className="mb-3 text-3xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
          Review import
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          We need a few clarifications before we can save these transactions.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {review.items.map((item, index) => {
          const isDeclined = selections[`${item.id}:decline`] === "decline";

          return (
            <section
              key={item.id}
              className={cn(
                "pt-10 transition-opacity duration-300",
                index > 0 && "border-t border-slate-200 dark:border-slate-800",
                isDeclined && "opacity-75 grayscale-[0.2]",
              )}
            >
              <h2
                className={cn(
                  "mb-8 text-xl font-medium transition-colors",
                  isDeclined
                    ? "text-slate-500 line-through decoration-slate-300 dark:text-slate-400 dark:decoration-slate-600"
                    : "text-slate-900 dark:text-slate-50",
                )}
              >
                {item.summary}
              </h2>

              <div className="flex flex-col gap-10">
                {item.issues.map((issue) => (
                  <div
                    key={issue.field}
                    className={cn(
                      "transition-opacity",
                      isDeclined && "pointer-events-none opacity-50",
                    )}
                  >
                    <h3 className="mb-4 text-sm font-medium text-slate-900 capitalize dark:text-slate-300">
                      Select {issue.field}
                    </h3>

                    <div className="flex flex-col gap-1">
                      {issue.choices.map((choice) => {
                        const isSelected =
                          selections[`${item.id}:${issue.field}`] === choice.id;

                        return (
                          <label
                            key={choice.id}
                            className={cn(
                              "group relative -mx-4 flex cursor-pointer items-start gap-4 rounded-lg p-4 transition-colors",
                              isSelected && !isDeclined
                                ? "bg-slate-50 dark:bg-slate-900/50"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30",
                            )}
                          >
                            <input
                              type="radio"
                              className="mt-1 h-4 w-4 cursor-pointer border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:checked:bg-slate-100 dark:focus:ring-slate-100 dark:focus:ring-offset-slate-950"
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
                            <div className="flex-1">
                              <div
                                className={cn(
                                  "text-base transition-colors",
                                  isSelected && !isDeclined
                                    ? "font-medium text-slate-900 dark:text-slate-50"
                                    : "text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100",
                                )}
                              >
                                {choice.label}
                              </div>
                              {choice.evidence && (
                                <div className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">
                                  {choice.evidence}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="mt-2 border-t border-slate-100 pt-4 dark:border-slate-800/60">
                  <label
                    className={cn(
                      "group relative -mx-4 flex cursor-pointer items-start gap-4 rounded-lg p-4 transition-colors",
                      isDeclined
                        ? "bg-rose-50/50 dark:bg-rose-900/20"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30",
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-1 h-4 w-4 cursor-pointer border-slate-300 text-rose-600 focus:ring-rose-600 dark:border-slate-700 dark:checked:bg-rose-500 dark:focus:ring-rose-500 dark:focus:ring-offset-slate-950"
                      name={`${item.id}:decline`}
                      checked={isDeclined}
                      onChange={() =>
                        setSelections((current) => ({
                          ...current,
                          [`${item.id}:decline`]: "decline",
                        }))
                      }
                    />
                    <div className="flex-1">
                      <span
                        className={cn(
                          "text-base transition-colors",
                          isDeclined
                            ? "font-medium text-rose-900 dark:text-rose-200"
                            : "text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100",
                        )}
                      >
                        Do not import this transaction
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {requestError && (
        <div className="mt-10 rounded-lg bg-rose-50 p-4 dark:bg-rose-900/20">
          <p
            className="text-sm font-medium text-rose-800 dark:text-rose-300"
            role="alert"
          >
            {requestError}
          </p>
        </div>
      )}

      <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-slate-200 pt-8 sm:flex-row dark:border-slate-800">
        <div className="order-2 w-full sm:order-1 sm:w-auto">
          <p className="text-center text-sm text-slate-500 sm:text-left dark:text-slate-400">
            Need to edit details?{" "}
            <Link
              to="/login"
              search={{ redirect: `/import-review/${reviewId}` } as any}
              className="text-slate-900 underline underline-offset-4 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-50"
            >
              Sign in
            </Link>
          </p>
        </div>

        <Button
          size="lg"
          className={cn(
            "order-1 w-full rounded-none px-8 sm:order-2 sm:w-auto",
            isSubmitting && "opacity-80",
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

function ReviewShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans dark:bg-slate-950">
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">{children}</main>
    </div>
  );
}

function resultCopy(status: string) {
  if (status === "completed")
    return "Your transaction was securely imported into your account.";
  if (status === "declined")
    return "This transaction was discarded and will not be imported.";
  if (status === "expired")
    return "For your security, this review link has expired. Please initiate a new import.";
  if (status === "failed") return "This transaction could not be imported.";
  return "This review link is currently unavailable.";
}
