import {
  monekoCaptureMethods,
  monekoComparisonRows,
  monekoContentByline,
  monekoContentDates,
  monekoProductAreas,
} from "@/data/home/moneko-product-summary";

export function ProductOverviewSection() {
  return (
    <section className="bg-background py-20 sr-only">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-sm font-semibold tracking-[0.18em] uppercase">
            Product summary
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            What does Moneko do?
          </h2>
          <p className="text-muted-foreground mt-5 text-lg leading-8">
            Moneko is an AI budgeting app for fast transaction capture,
            envelope-style Pockets, personal and household finances, net worth
            tracking, recurring bills, and WhatsApp-based money updates.
          </p>
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            Published {monekoContentDates.published}. Updated{" "}
            {monekoContentDates.updated} by {monekoContentByline.name},{" "}
            {monekoContentByline.credential}
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {monekoProductAreas.map((area) => (
            <article
              key={area.id}
              className="border-border/60 bg-card rounded-lg border p-6 shadow-sm"
            >
              <h3 className="text-foreground text-xl font-semibold tracking-tight">
                {area.question}
              </h3>
              <p className="text-foreground mt-4 leading-7 font-medium">
                {area.directAnswer}
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {area.details}
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {area.examples.map((example) => (
                  <li
                    key={example}
                    className="border-border/50 bg-background rounded-md border px-3 py-2 text-sm"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-border/60 bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="text-foreground text-2xl font-bold tracking-tight">
              How can you add transactions in Moneko?
            </h3>
            <p className="text-muted-foreground mt-4 leading-7">
              Moneko supports multiple capture methods so budgeting does not
              depend on perfect manual entry.
            </p>
            <ol className="mt-6 space-y-4">
              {monekoCaptureMethods.map((method, index) => (
                <li key={method.label} className="flex gap-4">
                  <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="text-foreground font-semibold">
                      {method.label}
                    </h4>
                    <p className="text-muted-foreground mt-1 text-sm leading-7">
                      {method.answer}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="border-border/60 bg-card rounded-lg border p-6 shadow-sm">
            <h3 className="text-foreground text-2xl font-bold tracking-tight">
              How does Moneko compare with traditional budgeting apps?
            </h3>
            <div className="border-border/50 mt-6 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-muted/40">
                    <th className="text-foreground px-4 py-3 text-sm font-semibold">
                      User need
                    </th>
                    <th className="text-foreground px-4 py-3 text-sm font-semibold">
                      Moneko
                    </th>
                    <th className="text-foreground px-4 py-3 text-sm font-semibold">
                      Traditional apps
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monekoComparisonRows.map((row) => (
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
                        {row.traditionalApps}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
