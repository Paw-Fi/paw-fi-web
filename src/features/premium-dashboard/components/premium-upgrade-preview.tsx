import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, FileSpreadsheet, Download, Activity, Receipt } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PremiumUpgradePreview() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-7xl mx-auto relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none blur-[2px] transition-all select-none">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-8">
          <Card className="h-32"></Card>
          <Card className="h-32"></Card>
          <Card className="h-32"></Card>
          <Card className="h-32"></Card>
          <Card className="md:col-span-3 h-80"></Card>
          <Card className="h-80"></Card>
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-2xl mx-auto space-y-8 mt-12 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl p-8 md:p-12 rounded-3xl border shadow-xl">
        <div className="bg-primary/10 p-4 rounded-full">
          <Lock className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Unlock the Business Dashboard
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your mobile capture still works great. Upgrade to Premium to unlock the dedicated business dashboard, secure file retention, and export packages for accounting and taxes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <Activity className="w-6 h-6 text-blue-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Business Snapshot</h4>
              <p className="text-sm text-muted-foreground mt-1">Track net cashflow, profit/loss, and budget progress instantly.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <Receipt className="w-6 h-6 text-green-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Secure File Retention</h4>
              <p className="text-sm text-muted-foreground mt-1">Keep original email attachments and receipts safe forever.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <FileSpreadsheet className="w-6 h-6 text-orange-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Tax-Ready Exports</h4>
              <p className="text-sm text-muted-foreground mt-1">Export your data to CSV or generate full tax packages.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <Download className="w-6 h-6 text-purple-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Bulk Downloads</h4>
              <p className="text-sm text-muted-foreground mt-1">Download everything with one click for easy accountant handoff.</p>
            </div>
          </div>
        </div>

        <Link to="/dashboard/user-settings/membership" className="w-full sm:w-auto mt-4">
          <Button size="lg" className="w-full sm:w-auto rounded-full font-semibold text-base px-8 h-14">
            Manage Membership
          </Button>
        </Link>
      </div>
    </div>
  );
}
