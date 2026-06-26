import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2Icon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PremiumUpgradePreview() {
  return (
    <div className="flex flex-col gap-6 px-4 md:px-8 w-full max-w-7xl mx-auto relative overflow-hidden">
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
            <CheckCircle2Icon className="w-6 h-6 text-green-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Business Snapshot</h4>
              <p className="text-sm text-muted-foreground mt-1">Track net cashflow, profit/loss, and budget progress instantly.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <CheckCircle2Icon className="w-6 h-6 text-green-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Secure File Retention</h4>
              <p className="text-sm text-muted-foreground mt-1">Keep original email attachments and receipts safe forever.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <CheckCircle2Icon className="w-6 h-6 text-green-500 mt-1 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Tax-Ready Exports</h4>
              <p className="text-sm text-muted-foreground mt-1">Export your data to CSV or generate full tax packages.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card border">
            <CheckCircle2Icon className="w-6 h-6 text-green-500 mt-1 shrink-0" />
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
