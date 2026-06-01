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
  Calendar as CalendarIcon
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
        <h1 className="text-3xl font-bold tracking-tight">Export & Backups</h1>
        <p className="text-muted-foreground mt-1">
          Generate tax-ready packages and secure backups of your business data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col gap-1.5 flex-1 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Date Range Filter</label>
          <DatePickerWithRange 
            date={dateRange as any} 
            setDate={(d) => setDateRange(d as any)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="pb-4">
            <div className="p-3 w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl mb-3 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <CardTitle className="text-base">Transactions CSV</CardTitle>
            <CardDescription className="text-sm">
              Export all ledger entries within the selected date range.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleCreateExport("transactions_csv")}
              disabled={createJob.isPending}
            >
              Generate CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="pb-4">
            <div className="p-3 w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl mb-3 flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <CardTitle className="text-base">Tax Package ZIP</CardTitle>
            <CardDescription className="text-sm">
              Transactions, categories, and receipts in one organized file.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handleCreateExport("tax_package_zip")}
              disabled={createJob.isPending}
            >
              Generate Package
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl overflow-hidden flex flex-col bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
          <CardHeader className="pb-4">
            <div className="p-3 w-12 h-12 bg-white/10 dark:bg-black/10 rounded-xl mb-3 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <CardTitle className="text-base text-white dark:text-slate-900">Full Backup</CardTitle>
            <CardDescription className="text-sm text-slate-300 dark:text-slate-600">
              Everything including all original email attachments.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button 
              className="w-full bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800" 
              onClick={() => handleCreateExport("everything_zip")}
              disabled={createJob.isPending}
            >
              Generate Full Backup
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Recent Exports</h2>
          
          {jobs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p>No recent exports found.</p>
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
                        {format(new Date(job.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 pl-4">
                    {job.status === "ready" ? (
                      <Button 
                        onClick={() => downloadJob(job.id)}
                        variant="secondary"
                        size="sm"
                        className="font-medium"
                      >
                        Download
                      </Button>
                    ) : job.status !== "failed" && job.status !== "expired" ? (
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                        {job.progress_percent}%
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
          <h2 className="text-xl font-bold tracking-tight">Available Attachments</h2>
          
          <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
            {isLoadingAttachments ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : !attachments || attachments.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No attachments found in this date range.</p>
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
                        <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                          {file.filename}
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
