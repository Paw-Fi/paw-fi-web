"use client";

import React, { useState } from "react";
import { Check, X, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type VendorKey = "moneko" | "ynab" | "monarch" | "copilot" | "simplifi";

interface Vendor {
  key: VendorKey;
  label: string;
  highlight?: boolean;
}

const vendors: ReadonlyArray<Vendor> = [
  { key: "moneko", label: "Moneko", highlight: true },
  { key: "ynab", label: "YNAB" },
  { key: "monarch", label: "Monarch Money" },
  { key: "copilot", label: "Copilot Money" },
  { key: "simplifi", label: "Quicken Simplifi" },
];

const competitors = vendors.filter((v) => v.key !== "moneko");

type FeatureRow = {
  name: string;
} & Record<VendorKey, string | boolean>;

const features: FeatureRow[] = [
  {
    name: "Capture without bank sync",
    moneko:
      "AI quick-add via text, photo, voice notes, files, or WhatsApp review",
    ynab: "Manual entry, direct import, or file import when banks don’t sync",
    monarch: "Bank import plus mobile receipt scanning & auto-split",
    copilot: "Relies on connected accounts with AI categorization",
    simplifi:
      "Connect accounts or enter transactions manually inside Spending Plan",
  },
  {
    name: "WhatsApp budgeting assistant",
    moneko: true,
    ynab: false,
    monarch: false,
    copilot: false,
    simplifi: false,
  },
  {
    name: "Personal vs household views",
    moneko:
      "One-tap Personal / Household modes with shared widgets & notifications",
    ynab: "Share a single budget via YNAB Together (manual coordination)",
    monarch: "Invite collaborators to the same workspace (no dual-mode toggle)",
    copilot: "Share full account access by forwarding a magic-link login",
    simplifi: "Secure sharing inside one account; no separate household views",
  },
  {
    name: 'Chat-based "What if?" planning',
    moneko:
      "Ask natural-language scenarios in app or WhatsApp and store answers",
    ynab: "Loan calculator + manual targets (no conversational planner)",
    monarch:
      "In-app AI assistant answers account questions (no chat budgeting on messaging apps)",
    copilot:
      "AI explains spending trends but no conversational budget adjustments",
    simplifi: "Projected cash flow dashboard (no chat assistant)",
  },
];

const getCellContent = (value: string | boolean) => {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="bg-primary/10 rounded-full p-1">
          <Check className="text-primary h-5 w-5" />
        </div>
      </div>
    );
  }

  if (value === false) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          <X className="text-muted-foreground/50 h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <span className="text-foreground/90 text-sm leading-relaxed md:text-base">
      {value}
    </span>
  );
};

export function ComparisonTable() {
  const [selectedCompetitor, setSelectedCompetitor] =
    useState<VendorKey>("ynab");

  return (
    <section className="bg-background relative overflow-hidden py-24">
      <div className="relative z-10 container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-16 space-y-4 text-center">
          <h2 className="text-foreground text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Moneko vs traditional budgeting apps
          </h2>
          <p className="text-muted-foreground mx-auto max-w-[700px] md:text-xl">
            Moneko is built around chat-based capture, Pockets, and household
            workflows.
          </p>
        </div>

        {/* Competitor Selector Pills */}
        <div className="mb-12 flex flex-wrap justify-center gap-2">
          <div className="bg-muted/50 border-border/50 inline-flex rounded-full border p-1.5 backdrop-blur-sm">
            {competitors.map((vendor) => (
              <button
                key={vendor.key}
                onClick={() => setSelectedCompetitor(vendor.key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  selectedCompetitor === vendor.key
                    ? "text-foreground scale-105 bg-white font-semibold shadow-sm dark:bg-neutral-800"
                    : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50",
                )}
              >
                {vendor.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="mx-auto max-w-5xl">
          {/* Header Row */}
          <div className="mb-8 grid grid-cols-1 items-center gap-4 px-6 md:grid-cols-12 md:gap-8">
            <div className="text-muted-foreground/50 hidden pl-4 text-lg font-bold tracking-widest uppercase md:col-span-4 md:block">
              Feature
            </div>
            <div className="col-span-12 text-center md:col-span-4">
              <div className="text-primary flex items-center justify-center gap-2 text-2xl font-bold">
                <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                  M
                </div>
                Moneko
              </div>
            </div>
            <div className="col-span-12 hidden text-center md:col-span-4 md:block">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCompetitor}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-muted-foreground text-xl font-bold"
                >
                  {vendors.find((v) => v.key === selectedCompetitor)?.label}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Feature Rows */}
          <div className="space-y-4">
            {features.map((feature, i) => (
              <div key={feature.name} className="group relative">
                {/* Card Layout */}
                <div
                  className={cn(
                    "bg-card border-border/50 hover:border-primary/20 grid grid-cols-1 gap-0 overflow-hidden rounded-3xl border transition-all duration-300 hover:shadow-lg md:grid-cols-12 md:gap-8 dark:bg-neutral-900/50",
                    i % 2 === 0
                      ? "bg-neutral-50/50 dark:bg-neutral-900/20"
                      : "",
                  )}
                >
                  {/* Feature Name (Left) */}
                  <div className="border-border/30 flex items-center p-6 md:col-span-4 md:border-r md:p-8">
                    <span className="text-foreground/80 font-semibold">
                      {feature.name}
                    </span>
                  </div>

                  {/* Moneko Value (Center - Highlighted) */}
                  <div className="bg-primary/5 dark:bg-primary/10 relative flex items-center justify-center p-6 text-center md:col-span-4 md:p-8">
                    <div className="via-primary/20 absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent to-transparent opacity-50 md:h-full md:w-[1px] md:bg-gradient-to-b" />
                    <div className="via-primary/20 absolute right-0 bottom-0 h-[1px] w-full bg-gradient-to-r from-transparent to-transparent opacity-50 md:h-full md:w-[1px] md:bg-gradient-to-b" />
                    {getCellContent(feature.moneko)}
                  </div>

                  {/* Competitor Value (Right) */}
                  <div className="relative flex min-h-[100px] items-center justify-center p-6 text-center md:col-span-4 md:p-8">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedCompetitor}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex w-full justify-center"
                      >
                        {/* Mobile Label for context */}
                        <span className="text-muted-foreground/50 absolute top-2 left-1/2 -translate-x-1/2 text-[10px] tracking-wider uppercase md:hidden">
                          {
                            vendors.find((v) => v.key === selectedCompetitor)
                              ?.label
                          }
                        </span>
                        {getCellContent(feature[selectedCompetitor])}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
