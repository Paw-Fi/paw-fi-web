export function BudgetingComparisonLinks() {
  return (
    <section
      aria-labelledby="budgeting-comparison-guides"
      className="border-border/50 bg-muted/20 border-y py-12"
    >
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <h2
          id="budgeting-comparison-guides"
          className="text-foreground text-2xl font-bold tracking-tight"
        >
          Compare budgeting apps before you choose
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl leading-7">
          Review current prices, free-plan limits, budgeting methods, bank sync,
          household support, AI capabilities, strengths, and tradeoffs.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/budgeting-app-2026"
            className="bg-primary text-primary-foreground rounded-full px-5 py-3 text-sm font-semibold"
          >
            Best budgeting apps in 2026
          </a>
          <a
            href="/free-budgeting-app"
            className="border-border bg-background text-foreground rounded-full border px-5 py-3 text-sm font-semibold"
          >
            Best free budgeting apps
          </a>
          <a
            href="/splitwise-alternative"
            className="border-border bg-background text-foreground rounded-full border px-5 py-3 text-sm font-semibold"
          >
            Moneko vs Splitwise
          </a>
        </div>
      </div>
    </section>
  );
}
