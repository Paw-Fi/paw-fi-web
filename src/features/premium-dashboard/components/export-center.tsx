import React from "react";
import { usePremiumExportJobs } from "../hooks/use-premium-export-jobs";
import { ExportType } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Download, Archive, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export function ExportCenter() {
  const { jobs, createJob, downloadJob, isLoading } = usePremiumExportJobs();

  const handleCreateExport = (exportType: ExportType) => {
    createJob.mutate({ exportType });
  };

  return (
    <Card className="col-span-1 lg:col-span-3 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Premium Export Center
        </CardTitle>
        <CardDescription>
          Generate tax-ready packages and export your data securely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-background rounded-xl p-4 border flex flex-col items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Transactions CSV</h4>
              <p className="text-xs text-muted-foreground mt-1">Export all ledger entries for this period.</p>
            </div>
            <Button 
              size="sm" 
              className="w-full mt-auto" 
              variant="secondary"
              onClick={() => handleCreateExport("transactions_csv")}
              disabled={createJob.isPending}
            >
              Generate CSV
            </Button>
          </div>

          <div className="bg-background rounded-xl p-4 border flex flex-col items-start gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-lg">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Tax Package ZIP</h4>
              <p className="text-xs text-muted-foreground mt-1">Transactions, categories, and receipts in one file.</p>
            </div>
            <Button 
              size="sm" 
              className="w-full mt-auto" 
              variant="secondary"
              onClick={() => handleCreateExport("tax_package_zip")}
              disabled={createJob.isPending}
            >
              Generate Package
            </Button>
          </div>

          <div className="bg-background rounded-xl p-4 border flex flex-col items-start gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Full Backup</h4>
              <p className="text-xs text-muted-foreground mt-1">Everything including original email attachments.</p>
            </div>
            <Button 
              size="sm" 
              className="w-full mt-auto"
              onClick={() => handleCreateExport("everything_zip")}
              disabled={createJob.isPending}
            >
              Generate Full Backup
            </Button>
          </div>
        </div>

        {jobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Recent Exports</h4>
            <div className="space-y-2">
              {jobs.slice(0, 3).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm">
                  <div className="flex items-center gap-3">
                    {job.status === "ready" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : job.status === "failed" || job.status === "expired" ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    )}
                    <span className="font-medium">{job.export_type.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{format(new Date(job.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  {job.status === "ready" && (
                    <Button size="sm" variant="ghost" onClick={() => downloadJob(job.id)}>
                      Download
                    </Button>
                  )}
                  {job.status !== "ready" && job.status !== "failed" && job.status !== "expired" && (
                    <span className="text-muted-foreground">{job.progress_percent}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
