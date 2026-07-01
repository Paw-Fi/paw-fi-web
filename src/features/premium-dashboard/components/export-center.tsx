import React from "react";
import { usePremiumExportJobs } from "../hooks/use-premium-export-jobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, CheckCircle, Download, FileArchive, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function ExportCenter() {
  const { jobs, downloadJob } = usePremiumExportJobs();

  return (
    <Card className="col-span-1 rounded-lg border border-neutral-200/80 bg-white/90 py-0 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <CardHeader className="px-5 pb-0 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Export Center
            </p>
            <CardTitle className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 dark:text-white">
              Secure packages
            </CardTitle>
          </div>
          <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
            <FileArchive className="size-4" aria-hidden="true" />
          </div>
        </div>
        <CardDescription className="mt-3 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
          Generate tax-ready files, backups, receipts, and premium originals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 pt-5">
        <Button 
          asChild
          size="sm" 
          className="h-11 w-full justify-between rounded-full bg-neutral-950 px-4 text-sm font-semibold text-white shadow-none transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          <Link to="/dashboard/export">
            Open Export Manager
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>

        {jobs.length > 0 && (
          <div className="border-t border-neutral-100 pt-5 dark:border-white/10">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Recent exports
            </h4>
            <div className="mt-4 space-y-3">
              {jobs.slice(0, 3).map((job) => {
                const statusStyle =
                  job.status === "ready"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                    : job.status === "failed" || job.status === "expired"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"
                    : "bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-300";

                return (
                  <div key={job.id} className="rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg", statusStyle)}>
                          {job.status === "ready" ? (
                            <CheckCircle className="size-4" aria-hidden="true" />
                          ) : job.status === "failed" || job.status === "expired" ? (
                            <AlertCircle className="size-4" aria-hidden="true" />
                          ) : (
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold capitalize text-neutral-800 dark:text-neutral-100">
                            {job.export_type.replace(/_/g, " ")}
                          </span>
                          <span className="mt-1 block truncate text-xs text-neutral-400">
                            {format(new Date(job.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {job.status === "ready" ? (
                          <button 
                            type="button"
                            onClick={() => downloadJob(job.id)}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-neutral-950 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/20"
                          >
                            <Download className="size-3.5" aria-hidden="true" />
                            Download
                          </button>
                        ) : job.status !== "failed" && job.status !== "expired" ? (
                          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            {job.progress_percent}%
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-rose-500">Failed</span>
                        )}
                      </div>
                    </div>

                    {job.status !== "ready" && job.status !== "failed" && job.status !== "expired" && (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200/80 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-neutral-950 transition-[width] duration-500 dark:bg-white"
                          style={{ width: `${Math.min(100, Math.max(0, job.progress_percent))}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
