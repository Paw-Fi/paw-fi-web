import React, { useState } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Info
} from "lucide-react";
import { usePremiumExportJobs, usePremiumExportAttachments } from "../../hooks/use-premium-export-jobs";
import { ExportType } from "../../types";

export function PremiumExportManager() {
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date } | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const formattedFilters = {
    startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const { jobs, createJob, downloadJob } = usePremiumExportJobs();
  const { data: attachments, isLoading: isLoadingAttachments } = usePremiumExportAttachments(formattedFilters);

  const handleCreateExport = (exportType: ExportType) => {
    createJob.mutate({ exportType, filters: formattedFilters });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-4 md:p-8 pb-24">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Data Privacy & Exports</h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" /> E2E Encrypted
          </span>
        </div>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Generate tax-ready packages and secure backups of your data. All exports are compiled securely on our isolated infrastructure to ensure absolute privacy.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-sm">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="leading-relaxed">
          <strong>Secure Compilation Process:</strong> When you request an export, our isolated servers assemble your data into an encrypted archive. This may take a minute or two. Once finished, it will safely appear in your <strong>Recent Exports</strong> ready for you to securely download.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col gap-1.5 flex-1 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target Date Range</label>
          <DatePickerWithRange 
            date={dateRange as any} 
            setDate={(d) => setDateRange(d as any)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl overflow-hidden flex flex-col relative group">
          <CardHeader className="pb-4">
            <div className="p-3 w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl mb-3 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <CardTitle className="text-base flex items-center gap-2">
              Transactions CSV
              <Lock className="w-3.5 h-3.5 text-slate-400" />
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
              {createJob.isPending && createJob.variables?.exportType === "transactions_csv" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing & Compiling...</>
              ) : "Compile Secure CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl overflow-hidden flex flex-col relative group">
          <CardHeader className="pb-4">
            <div className="p-3 w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl mb-3 flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <CardTitle className="text-base flex items-center gap-2">
              Tax Package ZIP
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </CardTitle>
            <CardDescription className="text-sm">
              Transactions, categories, and receipts safely bundled into one organized file.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleCreateExport("tax_package_zip")}
              disabled={createJob.isPending}
            >
              {createJob.isPending && createJob.variables?.exportType === "tax_package_zip" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing & Compiling...</>
              ) : "Prepare Tax Package"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl overflow-hidden flex flex-col bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 relative">
          <CardHeader className="pb-4">
            <div className="p-3 w-12 h-12 bg-white/10 dark:bg-black/10 rounded-xl mb-3 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <CardTitle className="text-base text-white dark:text-slate-900 flex items-center gap-2">
              Full Backup
              <Lock className="w-3.5 h-3.5 opacity-60" />
            </CardTitle>
            <CardDescription className="text-sm text-slate-300 dark:text-slate-600">
              Complete snapshot including all original email attachments, end-to-end encrypted.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button 
              className="w-full bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800" 
              onClick={() => handleCreateExport("everything_zip")}
              disabled={createJob.isPending}
            >
              {createJob.isPending && createJob.variables?.exportType === "everything_zip" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Securing & Compiling...</>
              ) : "Request Encrypted Backup"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Recent Exports</h2>
          
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p>No recent exports found. Request an export above and it will securely appear here when compiled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 text-sm group shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {job.status === "ready" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : job.status === "failed" || job.status === "expired" ? (
                      <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize block truncate">
                        {job.export_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-slate-500 block truncate">
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
                        className="font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border-0"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Download Securely
                      </Button>
                    ) : job.status !== "failed" && job.status !== "expired" ? (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> {job.progress_percent}%
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-full">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Available Private Attachments</h2>
          
          <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
            {isLoadingAttachments ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : !attachments || attachments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No secure attachments found in this date range.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[400px] overflow-y-auto">
                {attachments.map((file) => (
                  <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                          {file.filename}
                          <Lock className="w-3 h-3 text-slate-400" />
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(file.created_at), "MMM d, yyyy")} • {(file.size_bytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
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
