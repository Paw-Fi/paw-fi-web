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
    moneko: "AI quick-add via text, photo, voice notes, files, or WhatsApp review",
    ynab: "Manual entry, direct import, or file import when banks don’t sync",
    monarch: "Bank import plus mobile receipt scanning & auto-split",
    copilot: "Relies on connected accounts with AI categorization",
    simplifi: "Connect accounts or enter transactions manually inside Spending Plan",
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
    moneko: "One-tap Personal / Household modes with shared widgets & notifications",
    ynab: "Share a single budget via YNAB Together (manual coordination)",
    monarch: "Invite collaborators to the same workspace (no dual-mode toggle)",
    copilot: "Share full account access by forwarding a magic-link login",
    simplifi: "Secure sharing inside one account; no separate household views",
  },
  {
    name: "Chat-based \"What if?\" planning",
    moneko: "Ask natural-language scenarios in app or WhatsApp and store answers",
    ynab: "Loan calculator + manual targets (no conversational planner)",
    monarch: "In-app AI assistant answers account questions (no chat budgeting on messaging apps)",
    copilot: "AI explains spending trends but no conversational budget adjustments",
    simplifi: "Projected cash flow dashboard (no chat assistant)",
  },
];

const getCellContent = (value: string | boolean) => {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="bg-primary/10 rounded-full p-1">
             <Check className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  if (value === false) {
    return (
      <div className="flex justify-center">
         <div className="bg-neutral-100 dark:bg-neutral-800 rounded-full p-1">
            <X className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
    );
  }

  return <span className="text-sm md:text-base leading-relaxed text-foreground/90">{value}</span>;
};

export function ComparisonTable() {
  const [selectedCompetitor, setSelectedCompetitor] = useState<VendorKey>("ynab");

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-foreground">
            Why choose Moneko?
          </h2>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
             See how we stack up against the rest.
          </p>
        </div>

        {/* Competitor Selector Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
            <div className="inline-flex bg-muted/50 p-1.5 rounded-full border border-border/50 backdrop-blur-sm">
                {competitors.map((vendor) => (
                    <button
                        key={vendor.key}
                        onClick={() => setSelectedCompetitor(vendor.key)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                            selectedCompetitor === vendor.key 
                                ? "bg-white dark:bg-neutral-800 text-foreground shadow-sm scale-105 font-semibold" 
                                : "text-muted-foreground hover:text-foreground hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
                        )}
                    >
                        {vendor.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Comparison Grid */}
        <div className="max-w-5xl mx-auto">
            {/* Header Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-center mb-8 px-6">
                <div className="hidden md:block md:col-span-4 text-lg font-bold text-muted-foreground/50 uppercase tracking-widest pl-4">
                    Feature
                </div>
                <div className="col-span-12 md:col-span-4 text-center">
                   <div className="text-2xl font-bold text-primary flex items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">M</div>
                      Moneko
                   </div>
                </div>
                 <div className="col-span-12 md:col-span-4 text-center hidden md:block">
                     <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedCompetitor}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-xl font-bold text-muted-foreground"
                        >
                            {vendors.find(v => v.key === selectedCompetitor)?.label}
                        </motion.div>
                     </AnimatePresence>
                </div>
            </div>

            {/* Feature Rows */}
            <div className="space-y-4">
                {features.map((feature, i) => (
                    <div key={feature.name} className="relative group">
                         {/* Card Layout */}
                        <div className={cn(
                            "grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-8 bg-card dark:bg-neutral-900/50 border border-border/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20",
                            i % 2 === 0 ? "bg-neutral-50/50 dark:bg-neutral-900/20" : ""
                        )}>
                            
                            {/* Feature Name (Left) */}
                            <div className="md:col-span-4 p-6 md:p-8 flex items-center md:border-r border-border/30">
                                <span className="font-semibold text-foreground/80">{feature.name}</span>
                            </div>

                            {/* Moneko Value (Center - Highlighted) */}
                            <div className="md:col-span-4 p-6 md:p-8 flex items-center justify-center text-center bg-primary/5 dark:bg-primary/10 relative">
                                <div className="absolute top-0 left-0 w-full h-[1px] md:h-full md:w-[1px] bg-gradient-to-r md:bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-50" />
                                <div className="absolute bottom-0 right-0 w-full h-[1px] md:h-full md:w-[1px] bg-gradient-to-r md:bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-50" />
                                {getCellContent(feature.moneko)}
                            </div>

                            {/* Competitor Value (Right) */}
                            <div className="md:col-span-4 p-6 md:p-8 flex items-center justify-center text-center relative min-h-[100px]">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedCompetitor}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="w-full flex justify-center"
                                    >
                                        {/* Mobile Label for context */}
                                        <span className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                                            {vendors.find(v => v.key === selectedCompetitor)?.label}
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
