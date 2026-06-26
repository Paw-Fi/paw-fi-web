import React, { useState } from "react";
import { format, subDays } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Download,
  Archive,
  Loader2,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Calendar as CalendarIcon,
  ShieldCheck,
  Lock,
  Info,
} from "lucide-react";
import {
  usePremiumExportJobs,
  usePremiumExportAttachments,
} from "../../hooks/use-premium-export-jobs";
import { ExportType } from "../../types";

export function PremiumExportManager() {
  const [dateRange, setDateRange] = useState<
    { from: Date; to?: Date } | undefined
  >({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const formattedFilters = {
    startDate: dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const { jobs, createJob, downloadJob, downloadAttachment } =
    usePremiumExportJobs();
  const { data: attachments, isLoading: isLoadingAttachments } =
    usePremiumExportAttachments(formattedFilters);

  const handleCreateExport = (exportType: ExportType) => {
    createJob.mutate({ exportType, filters: formattedFilters });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 pb-24 md:p-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Data Privacy & Exports
          </h1>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold tracking-wider text-emerald-600 uppercase sm:inline-flex dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Private Storage
          </span>
        </div>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Generate tax-ready packages and secure backups of your data. All
          exports are compiled securely on our isolated infrastructure and kept
          in private storage.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="leading-relaxed">
          <strong>Secure Compilation Process:</strong> When you request an
          export, our isolated servers assemble your data into an encrypted
          archive. This may take a minute or two. Once finished, it will safely
          appear in your <strong>Recent Exports</strong> ready for you to
          securely download.
        </div>
      </div>

      <div className="flex flex-col items-end gap-4 rounded-2xl border border-slate-200/60 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-800/60 dark:bg-slate-900">
        <div className="flex w-full flex-1 flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Target Date Range
          </label>
          <DatePickerWithRange
            date={dateRange as any}
            setDate={(d) => setDateRange(d as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="group relative flex flex-col overflow-hidden rounded-2xl border-slate-200/60 shadow-sm dark:border-slate-800/60">
          <CardHeader className="pb-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <CardTitle className="flex items-center gap-2 text-base">
              Transactions CSV
              <Lock className="h-3.5 w-3.5 text-slate-400" />
            </CardTitle>
            <CardDescription className="text-sm">
              Securely export all ledger entries within the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleCreateExport("transactions_csv")}
              disabled={createJob.isPending}
            >
              {createJob.isPending &&
              createJob.variables?.exportType === "transactions_csv" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing &
                  Compiling...
                </>
              ) : (
                "Compile Secure CSV"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="group relative flex flex-col overflow-hidden rounded-2xl border-slate-200/60 shadow-sm dark:border-slate-800/60">
          <CardHeader className="pb-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-900/20">
              <Archive className="h-6 w-6" />
            </div>
            <CardTitle className="flex items-center gap-2 text-base">
              Tax Package ZIP
              <Lock className="h-3.5 w-3.5 text-slate-400" />
            </CardTitle>
            <CardDescription className="text-sm">
              Transactions, categories, and receipts safely bundled into one
              organized file.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleCreateExport("tax_package_zip")}
              disabled={createJob.isPending}
            >
              {createJob.isPending &&
              createJob.variables?.exportType === "tax_package_zip" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing &
                  Compiling...
                </>
              ) : (
                "Prepare Tax Package"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="relative flex flex-col overflow-hidden rounded-2xl border-slate-200/60 bg-slate-900 text-white shadow-sm dark:border-slate-800/60 dark:bg-slate-100 dark:text-slate-900">
          <CardHeader className="pb-4">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 p-3 dark:bg-black/10">
              <Download className="h-6 w-6" />
            </div>
            <CardTitle className="flex items-center gap-2 text-base text-white dark:text-slate-900">
              Full Backup
              <Lock className="h-3.5 w-3.5 opacity-60" />
            </CardTitle>
            <CardDescription className="text-sm text-slate-300 dark:text-slate-600">
              Complete snapshot including all original email attachments from
              private storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              className="w-full bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
              onClick={() => handleCreateExport("everything_zip")}
              disabled={createJob.isPending}
            >
              {createJob.isPending &&
              createJob.variables?.exportType === "everything_zip" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing &
                  Compiling...
                </>
              ) : (
                "Request Encrypted Backup"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Recent Exports</h2>

          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-slate-800">
              <p>
                No recent exports found. Request an export above and it will
                securely appear here when compiled.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-4 text-sm shadow-sm dark:border-slate-800/60 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {job.status === "ready" ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : job.status === "failed" || job.status === "expired" ? (
                      <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-400" />
                    )}
                    <div className="truncate">
                      <span className="block truncate font-semibold text-slate-900 capitalize dark:text-slate-100">
                        {job.export_type.replace(/_/g, " ")}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {job.status === "ready"
                          ? `Ready • ${format(new Date(job.created_at), "MMM d, h:mm a")}`
                          : job.status === "failed"
                            ? "Compilation Failed"
                            : job.status === "expired"
                              ? "Expired for Security"
                              : "Securely Compiling..."}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 pl-4">
                    {job.status === "ready" ? (
                      <Button
                        onClick={() => downloadJob(job.id)}
                        variant="secondary"
                        size="sm"
                        className="border-0 bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                      >
                        <Lock className="mr-1.5 h-3.5 w-3.5" /> Download
                        Securely
                      </Button>
                    ) : job.status !== "failed" && job.status !== "expired" ? (
                      <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800">
                        <Loader2 className="h-3 w-3 animate-spin" />{" "}
                        {job.progress_percent}%
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-500 dark:bg-rose-900/20">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">
            Available Private Attachments
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-950">
            {isLoadingAttachments ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : !attachments || attachments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No secure attachments found in this date range.</p>
              </div>
            ) : (
              <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800/60">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="shrink-0 rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800">
                        <Paperclip className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {file.filename}
                          <Lock className="h-3 w-3 text-slate-400" />
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(file.created_at), "MMM d, yyyy")} •{" "}
                          {formatFileSize(file.size_bytes)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => downloadAttachment(file.id)}
                      variant="ghost"
                      size="sm"
                      className="ml-4 shrink-0 text-xs font-medium"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(sizeBytes: number | null) {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes)) {
    return "Unknown size";
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
