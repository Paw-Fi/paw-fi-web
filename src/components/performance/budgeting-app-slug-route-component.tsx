"use client";

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  FileSpreadsheet,
  Mail,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { HomePageRouteComponent } from "@/components/performance/home-page-route-component";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StructuredData } from "@/components/seo/structured-data";
import { Route } from "@/routes/budgeting-app/$slug";

interface CompetitorArticleSectionProps {
  article?: {
    title: string;
    tags?: string[];
    body: string;
  };
}

export function BudgetingAppSlugRouteComponent() {
  const pageData = Route.useLoaderData() as any;
  const emailLanding = pageData.landing?.type === "email-receipt-capture";

  return (
    <HomePageRouteComponent>
      {emailLanding && (
        <>
          <EmailReceiptCaptureStructuredData pageData={pageData} />
          <EmailReceiptCaptureLanding pageData={pageData} />
        </>
      )}

      <CompetitorArticleSection article={pageData.article} />

      <section className="bg-background relative px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <Link
            to="/budgeting-app"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Explore more budgeting guides
          </Link>
        </div>
      </section>
    </HomePageRouteComponent>
  );
}

function EmailReceiptCaptureLanding({ pageData }: { pageData: any }) {
  const { landing } = pageData;
  const steps = landing.steps as Array<{ title: string; description: string }>;
  const useCases = landing.useCases as Array<{
    title: string;
    description: string;
  }>;
  const supportedFiles = landing.supportedFiles as string[];
  const securityPoints = landing.securityPoints as string[];

  return (
    <section className="bg-section-bg-light relative px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit">
              Email-based budgeting
            </Badge>
            <div className="space-y-4">
              <h2 className="text-foreground text-3xl leading-tight font-bold sm:text-4xl">
                Forward a receipt. Moneko logs the expense.
              </h2>
              <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                Email receipt capture turns online receipts, invoices, and
                supported attachments into budget entries without retyping the
                merchant, date, amount, category, or wallet.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/download">
                  Download Moneko
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="/budgeting-app-2026">
                  Compare budgeting features
                </a>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Mail className="text-primary h-6 w-6" aria-hidden="true" />
                files@inbound.moneko.io
              </CardTitle>
              <CardDescription>
                Save this as Moneko Receipts in Gmail, Outlook, Apple Mail, or
                any inbox you use for purchases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {supportedFiles.map((fileType) => (
                  <div
                    key={fileType}
                    className="border-subtle-border bg-muted/30 flex items-center gap-3 rounded-lg border p-3"
                  >
                    <FileSpreadsheet
                      className="text-primary h-5 w-5"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{fileType}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric label="Setup time" value="Minutes" />
                <Metric label="Sender control" value="Approved only" />
                <Metric label="Default routing" value="Space + wallet" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <Badge variant="outline" className="mb-3 w-fit">
                  Step {index + 1}
                </Badge>
                <CardTitle>{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <ShieldCheck
                  className="text-primary h-6 w-6"
                  aria-hidden="true"
                />
                Built for controlled capture
              </CardTitle>
              <CardDescription>
                Email forwarding only works from sender addresses you approve.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityPoints.map((point) => (
                <div key={point} className="flex gap-3">
                  <CheckCircle2
                    className="text-primary mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-muted-foreground">{point}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {useCases.map((useCase) => (
              <Card key={useCase.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {useCase.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What happens after forwarding?</CardTitle>
            <CardDescription>
              Moneko processes the receipt, saves the expense, and tells you
              when it is ready to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible defaultValue="routing">
              <AccordionItem value="routing">
                <AccordionTrigger>
                  Where does the captured expense go?
                </AccordionTrigger>
                <AccordionContent>
                  It is saved to the default space and wallet you choose during
                  setup. You can change the transaction later if a receipt
                  belongs somewhere else.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="notification">
                <AccordionTrigger>How do I know it worked?</AccordionTrigger>
                <AccordionContent>
                  Moneko sends a confirmation email and a phone notification
                  after the receipt is processed and added to your account.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="best-results">
                <AccordionTrigger>
                  What gives the best results?
                </AccordionTrigger>
                <AccordionContent>
                  Forward receipts from an approved sender and make sure the
                  email or attachment includes the merchant, date, and amount.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const Icon =
    label === "Default routing"
      ? WalletCards
      : label === "Sender control"
        ? ShieldCheck
        : BellRing;

  return (
    <div className="space-y-2">
      <Icon className="text-primary h-5 w-5" aria-hidden="true" />
      <div className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </div>
      <div className="text-foreground font-semibold">{value}</div>
    </div>
  );
}

function EmailReceiptCaptureStructuredData({ pageData }: { pageData: any }) {
  const pageUrl = `https://moneko.io/budgeting-app/${pageData.slug}`;
  const faq = pageData.landing.faq as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <>
      <StructuredData
        type="breadcrumb"
        data={[
          { name: "Moneko", url: "https://moneko.io" },
          { name: "Budgeting App", url: "https://moneko.io/budgeting-app/" },
          { name: "Email-Based Budgeting", url: pageUrl },
        ]}
      />
      <StructuredData
        type="software"
        data={{
          name: "Moneko Email Receipt Capture",
          description: pageData.meta.description,
          url: pageUrl,
          applicationCategory: "FinanceApplication",
          operatingSystem: "iOS, Android, Web",
          dateModified: "2026-04-23",
          publisher: {
            name: "Moneko",
            url: "https://moneko.io",
            logo: "https://moneko.io/logo192.png",
          },
        }}
      />
      <StructuredData
        type="howto"
        data={{
          name: "How to set up email receipt capture in Moneko",
          description:
            "Enable email receipt capture, choose a default space and wallet, approve senders, and forward receipts to Moneko.",
          totalTime: "PT5M",
          estimatedCost: { currency: "USD", value: "0" },
          steps: pageData.landing.steps.map(
            (step: { title: string; description: string }) => ({
              name: step.title,
              text: step.description,
              url: pageUrl,
            }),
          ),
        }}
      />
      <StructuredData type="faq" data={faq} />
    </>
  );
}

function CompetitorArticleSection({ article }: CompetitorArticleSectionProps) {
  if (!article) {
    return null;
  }

  const paragraphs = article.body.split("\n\n");

  return (
    <section className="bg-section-bg-light relative">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
          {article.title}
        </h2>
        {article.tags && article.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="bg-moneko-soft text-moneko-dark rounded-full px-3 py-1 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="prose prose-slate mt-6 max-w-none">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
