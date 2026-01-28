import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Trash2, ShieldCheck } from "lucide-react";

export function DataOwnershipSection() {
  return (
    <section className="container px-4 py-24 mx-auto border-t border-slate-100 dark:border-slate-800">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Your Data, Your Rules
            </Badge>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Complete Control. Zero Lock-in.</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            We believe your financial data is yours alone. We don't sell it, and we make it easy for you to take it with you or destroy it completely.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm">
              <FileSpreadsheet className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Export to Excel</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Download your full transaction history as .xlsx or .csv files instantly. 
              Keep your own backups or run custom analysis in your favorite tools.
            </p>
          </div>

          {/* Delete Card */}
          <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-white dark:bg-black rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center mb-6 shadow-sm">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">One-Click Wipe</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              If you decide to leave, you can delete your account and all associated data instantly. 
              We keep no backups. When you say go, it's gone for good.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
