import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";

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

function ImportReviewPage() {
  const { reviewId } = Route.useParams();
  const [review, setReview] = useState<Review | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const secret = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (!secret) return;
    setToken(secret);
    void inspect(secret);
  }, [reviewId]);

  async function inspect(secret: string) {
    const { data } = await supabase.functions.invoke(
      "email-import-review-inspect",
      {
        body: { reviewId, token: secret },
      },
    );
    setReview(data as Review);
  }

  async function submit() {
    if (!token || !review || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data } = await supabase.functions.invoke(
        "email-import-review-submit",
        {
          body: {
            reviewId,
            token,
            version: review.version,
            decisions: review.items.map((item) => ({
              itemId: item.id,
              optionIds: item.issues
                .map((issue) => selections[`${item.id}:${issue.field}`])
                .filter(Boolean),
            })),
          },
        },
      );
      setReview(data as Review);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token)
    return (
      <ReviewShell>
        <p>
          This secure link is invalid or has already been removed from this
          browser.
        </p>
      </ReviewShell>
    );
  if (!review)
    return (
      <ReviewShell>
        <div className="bg-muted h-6 w-48 animate-pulse rounded" />
        <div className="bg-muted mt-6 h-32 animate-pulse rounded" />
      </ReviewShell>
    );
  if (review.status !== "pending")
    return (
      <ReviewShell>
        <h1>Import review</h1>
        <p>{resultCopy(review.status)}</p>
      </ReviewShell>
    );

  const complete = review.items.every((item) =>
    item.issues.every((issue) => selections[`${item.id}:${issue.field}`]),
  );
  return (
    <ReviewShell>
      <h1 className="text-2xl font-semibold">Review import</h1>
      <p className="text-muted-foreground mt-2">
        Loading this page does not import anything. Choose from the
        source-supported options, then confirm.
      </p>
      {review.items.map((item) => (
        <section className="mt-6 rounded-lg border p-4" key={item.id}>
          <h2 className="font-medium">{item.summary}</h2>
          {item.issues.map((issue) => (
            <fieldset className="mt-4" key={issue.field}>
              <legend className="font-medium capitalize">
                Choose {issue.field}
              </legend>
              {issue.choices.map((choice) => (
                <label
                  className="mt-2 flex cursor-pointer gap-2 rounded border p-3"
                  key={choice.id}
                >
                  <input
                    type="radio"
                    name={`${item.id}:${issue.field}`}
                    checked={
                      selections[`${item.id}:${issue.field}`] === choice.id
                    }
                    onChange={() =>
                      setSelections((current) => ({
                        ...current,
                        [`${item.id}:${issue.field}`]: choice.id,
                      }))
                    }
                  />
                  <span>
                    <strong>{choice.label}</strong>
                    <small className="text-muted-foreground mt-1 block">
                      {choice.evidence}
                    </small>
                  </span>
                </label>
              ))}
            </fieldset>
          ))}
        </section>
      ))}
      <button
        className="bg-primary text-primary-foreground mt-6 rounded px-4 py-2 disabled:opacity-50"
        disabled={!complete || isSubmitting}
        onClick={submit}
      >
        {isSubmitting ? "Importing..." : "Confirm and import"}
      </button>
      <p className="text-muted-foreground mt-4 text-sm">
        Need to edit details?{" "}
        <Link to="/login" search={{ redirect: `/import-review/${reviewId}` }}>
          Sign in to edit details
        </Link>
        .
      </p>
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-12">{children}</main>
  );
}

function resultCopy(status: string) {
  if (status === "completed") return "Your transaction was imported.";
  if (status === "declined") return "This transaction was not imported.";
  if (status === "expired") return "This review link has expired.";
  return "This review link is unavailable.";
}
