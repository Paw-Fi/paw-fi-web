import React from "react";
import { usePremiumExportJobs } from "../hooks/use-premium-export-jobs";
import { ExportType } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export function ExportCenter() {
  const { jobs, createJob, downloadJob, isLoading } = usePremiumExportJobs();

  const handleCreateExport = (exportType: ExportType) => {
    createJob.mutate({ exportType });
  };

  return (
    <Card className="col-span-1 border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Export Center
        </CardTitle>
        <CardDescription className="text-xs mt-1 text-slate-500">
          Generate tax-ready packages and secure backups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="w-full justify-start text-left h-10 border-slate-200/60 dark:border-slate-800/60 font-medium"
            onClick={() => handleCreateExport("transactions_csv")}
            disabled={createJob.isPending}
          >
            Transactions CSV
          </Button>

          <Button 
            size="sm" 
            variant="outline"
            className="w-full justify-start text-left h-10 border-slate-200/60 dark:border-slate-800/60 font-medium"
            onClick={() => handleCreateExport("tax_package_zip")}
            disabled={createJob.isPending}
          >
            Tax Package ZIP
          </Button>

          <Button 
            size="sm" 
            variant="default"
            className="w-full justify-start text-left h-10 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium"
            onClick={() => handleCreateExport("everything_zip")}
            disabled={createJob.isPending}
          >
            Full Backup (Including Receipts)
          </Button>
        </div>

        {jobs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
              Recent Exports
            </h4>
            <div className="space-y-3">
              {jobs.slice(0, 3).map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm group">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {job.status === "ready" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : job.status === "failed" || job.status === "expired" ? (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="font-medium text-slate-700 dark:text-slate-300 capitalize text-xs block truncate">
                        {job.export_type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {format(new Date(job.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2">
                    {job.status === "ready" ? (
                      <button 
                        onClick={() => downloadJob(job.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Download &rarr;
                      </button>
                    ) : job.status !== "failed" && job.status !== "expired" ? (
                      <span className="text-xs font-medium text-slate-400">
                        {job.progress_percent}%
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-rose-500">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
