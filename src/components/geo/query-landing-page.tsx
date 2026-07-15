import { AppleDownloadButton } from "@/components/ui/apple-download-button";
import { AndroidDownloadButton } from "@/components/ui/android-download-button";
import type {
  ComparisonRow,
  EditorialComparison,
  FaqItem,
  ProofCard,
  ResourceLink,
  Section,
} from "@/lib/geo-landing-pages";

export function QueryLandingPage({
  eyebrow,
  title,
  description,
  keyTakeaways,
  comparisonTitle,
  alternativeLabel,
  comparisonRows,
  sections,
  proofCards = [],
  editorialComparison,
  ratingSummary,
  faqItems,
  resourceLinks,
  showIntro = true,
}: QueryLandingPageProps) {
  return (
    <div className="bg-background min-h-screen">
      {showIntro && (
        <section className="border-border/50 border-b py-20 md:py-24">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
                {eyebrow}
              </p>
              <h1 className="text-foreground mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                {title}
              </h1>
              <p className="text-muted-foreground mx-auto mt-6 max-w-3xl text-lg leading-8 md:text-xl">
                {description}
              </p>

              <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
                {keyTakeaways.map((item) => (
                  <div
                    key={item}
                    className="bg-card border-border/60 rounded-2xl border px-4 py-4 text-sm leading-7 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                <AppleDownloadButton className="w-auto" />
                <AndroidDownloadButton className="w-auto" />
              </div>
            </div>
          </div>
        </section>
      )}

      {editorialComparison && (
        <EditorialComparisonSection
          editorialComparison={editorialComparison}
          ratingSummary={ratingSummary}
        />
      )}

      {proofCards.length > 0 && (
        <section className="py-6 pb-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm">
              <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
                Proof points
              </p>
              <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                Evidence at a glance
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {proofCards.map((card) => (
                  <article
                    key={`${card.label}-${card.value}`}
                    className="bg-background border-border/50 rounded-3xl border px-5 py-5"
                  >
                    <p className="text-muted-foreground text-sm font-medium">
                      {card.label}
                    </p>
                    <h3 className="text-foreground mt-2 text-3xl font-bold tracking-tight">
                      {card.value}
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {comparisonRows.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm">
              <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
                Direct comparison
              </p>
              <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight md:text-3xl">
                {comparisonTitle}
              </h2>
              <div className="border-border/50 mt-8 overflow-x-auto rounded-3xl border">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-foreground px-4 py-4 text-sm font-semibold">
                        Comparison point
                      </th>
                      <th className="text-foreground px-4 py-4 text-sm font-semibold">
                        Moneko
                      </th>
                      <th className="text-foreground px-4 py-4 text-sm font-semibold">
                        {alternativeLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr
                        key={row.label}
                        className="border-border/50 border-t align-top"
                      >
                        <td className="text-foreground px-4 py-4 text-sm font-medium">
                          {row.label}
                        </td>
                        <td className="text-muted-foreground px-4 py-4 text-sm leading-7">
                          {row.moneko}
                        </td>
                        <td className="text-muted-foreground px-4 py-4 text-sm leading-7">
                          {row.alternative}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-4 pb-16">
        <div className="container mx-auto max-w-6xl space-y-6 px-4 md:px-6">
          {sections.map((section) => (
            <article
              key={section.title}
              className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm"
            >
              <h2 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
                {section.title}
              </h2>
              <div className="mt-5 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-muted-foreground max-w-4xl leading-8"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-6 grid gap-3 md:grid-cols-2">
                  {section.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="bg-background border-border/50 text-foreground rounded-2xl border px-4 py-4 text-sm leading-7"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="py-4 pb-16">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm">
            <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
              Frequently asked questions
            </p>
            <div className="mt-6 space-y-4">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className="bg-background border-border/50 rounded-2xl border px-5 py-5"
                >
                  <h3 className="text-foreground text-lg font-semibold">
                    {item.question}
                  </h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-4 pb-20">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm">
            <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
              Keep exploring
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {resourceLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    item.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="bg-background border-border/50 hover:border-primary/30 rounded-3xl border px-5 py-5 transition hover:shadow-sm"
                >
                  <h3 className="text-foreground text-lg font-semibold">
                    {item.label}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-7">
                    {item.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function EditorialComparisonSection({
  editorialComparison,
  ratingSummary,
}: {
  editorialComparison: EditorialComparison;
  ratingSummary?: RatingSummary;
}) {
  return (
    <>
      <section className="py-10">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
                  Editorial verdict
                </p>
                <p className="text-foreground mt-3 text-xl leading-8 font-semibold">
                  {editorialComparison.verdict}
                </p>
              </div>
              <dl className="text-muted-foreground grid shrink-0 gap-2 text-sm">
                <div>
                  <dt className="text-foreground inline font-semibold">
                    Updated:{" "}
                  </dt>
                  <dd className="inline">{editorialComparison.updatedAt}</dd>
                </div>
                <div>
                  <dt className="text-foreground inline font-semibold">By: </dt>
                  <dd className="inline">
                    {editorialComparison.author.name} —{" "}
                    {editorialComparison.author.credential}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground inline font-semibold">
                    Reviewed by:{" "}
                  </dt>
                  <dd className="inline">
                    {editorialComparison.reviewer.name} —{" "}
                    {editorialComparison.reviewer.credential}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-muted/40 border-border/50 mt-6 rounded-2xl border px-5 py-4">
              <p className="text-foreground text-sm leading-7">
                <strong>Disclosure:</strong> {editorialComparison.disclosure}
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {editorialComparison.methodology.map((item) => (
                <div
                  key={item}
                  className="bg-background border-border/50 rounded-2xl border px-4 py-4 text-sm leading-7"
                >
                  {item}
                </div>
              ))}
              {ratingSummary && (
                <div className="bg-background border-border/50 rounded-2xl border px-4 py-4 text-sm leading-7">
                  <strong>{ratingSummary.rating}/5</strong> from{" "}
                  {ratingSummary.reviewCount} App Store ratings.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="border-border/60 bg-card rounded-[32px] border p-8 shadow-sm">
            <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
              Ranked comparison
            </p>
            <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Compare the leading budgeting apps
            </h2>
            <div className="border-border/50 mt-8 overflow-x-auto rounded-3xl border">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="bg-muted/40">
                    {[
                      "Rank",
                      "App",
                      "Best for",
                      "Free access",
                      "Current price",
                      "Platforms",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="text-foreground px-4 py-4 text-sm font-semibold"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editorialComparison.apps.map((app) => (
                    <tr
                      key={app.name}
                      className="border-border/50 border-t align-top"
                    >
                      <td className="text-foreground px-4 py-4 font-semibold">
                        #{app.rank}
                      </td>
                      <td className="px-4 py-4">
                        <a
                          href={app.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground hover:text-primary font-semibold transition-colors"
                        >
                          {app.name}
                        </a>
                      </td>
                      <td className="text-muted-foreground px-4 py-4 text-sm leading-7">
                        {app.bestFor}
                      </td>
                      <td className="text-muted-foreground px-4 py-4 text-sm leading-7">
                        {formatFreePlanType(app.freePlanType)}
                      </td>
                      <td className="text-muted-foreground px-4 py-4 text-sm leading-7">
                        {app.price}
                      </td>
                      <td className="text-muted-foreground px-4 py-4 text-sm leading-7">
                        {app.platforms}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto grid max-w-6xl gap-6 px-4 md:px-6 lg:grid-cols-2">
          {editorialComparison.apps.map((app) => (
            <article
              key={`${app.rank}-${app.name}`}
              className="border-border/60 bg-card rounded-[32px] border p-7 shadow-sm"
            >
              <p className="text-primary text-sm font-semibold">
                #{app.rank} · {app.bestFor}
              </p>
              <h2 className="text-foreground mt-2 text-2xl font-bold">
                {app.name}
              </h2>
              <p className="text-muted-foreground mt-4 leading-8">
                {app.verdict}
              </p>
              <dl className="mt-6 grid gap-3 text-sm">
                <ComparisonDetail
                  label={`Price (verified ${app.priceVerifiedAt})`}
                  value={app.price}
                />
                <ComparisonDetail
                  label="Budgeting method"
                  value={app.budgetingMethod}
                />
                <ComparisonDetail label="Bank sync" value={app.bankSync} />
                <ComparisonDetail
                  label="Household support"
                  value={app.householdSupport}
                />
                <ComparisonDetail label="AI" value={app.aiCapabilities} />
              </dl>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <EditorialList title="Strengths" items={app.strengths} />
                <EditorialList title="Limitations" items={app.limitations} />
              </div>
              <a
                href={app.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary mt-6 inline-flex text-sm font-semibold hover:underline"
              >
                Verify with {app.sourceLabel}
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ComparisonDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr]">
      <dt className="text-foreground font-semibold">{label}</dt>
      <dd className="text-muted-foreground">{value}</dd>
    </div>
  );
}

function EditorialList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-foreground font-semibold">{title}</h3>
      <ul className="text-muted-foreground mt-2 space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatFreePlanType(
  type: EditorialComparison["apps"][number]["freePlanType"],
) {
  switch (type) {
    case "freeForever":
      return "Free forever";
    case "freemium":
      return "Free plan + paid upgrade";
    case "freeTrial":
      return "Free trial only";
    case "paidOnly":
      return "Paid only";
  }
}

interface QueryLandingPageProps {
  eyebrow: string;
  title: string;
  description: string;
  keyTakeaways: string[];
  comparisonTitle: string;
  alternativeLabel: string;
  comparisonRows: ComparisonRow[];
  sections: Section[];
  proofCards?: ProofCard[];
  editorialComparison?: EditorialComparison;
  ratingSummary?: RatingSummary;
  faqItems: FaqItem[];
  resourceLinks: ResourceLink[];
  showIntro?: boolean;
}

interface RatingSummary {
  rating: number;
  reviewCount: number;
}
