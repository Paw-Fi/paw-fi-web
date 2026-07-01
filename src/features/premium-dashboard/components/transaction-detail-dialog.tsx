import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "../lib/formatters";
import { PremiumDashboardSummary } from "../types";
import { usePremiumTransactionMutations } from "../hooks/use-premium-transaction-mutations";
import { TransactionEditorDialog } from "./transaction-editor-dialog";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardTransaction =
  PremiumDashboardSummary["recentTransactions"][number];

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: DashboardTransaction | null;
  displayCurrency: string;
  wallets: PremiumDashboardSummary["wallets"]["wallets"];
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
  displayCurrency,
  wallets,
}: TransactionDetailDialogProps) {
  const { deleteTransaction } = usePremiumTransactionMutations();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const isIncome = transaction.type === "income";
  const title = transaction.merchant || transaction.description || "Transaction";

  async function handleDelete() {
    if (!transaction) return;
    setError(null);
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      onOpenChange(false);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete transaction.",
      );
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl rounded-2xl border-neutral-200 bg-white p-0 text-neutral-950 shadow-[0_30px_120px_-56px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-neutral-950 dark:text-white">
          <DialogHeader className="border-b border-neutral-100 px-6 py-5 text-left dark:border-white/10">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  isIncome
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300",
                )}
              >
                {isIncome ? (
                  <ArrowUpRight className="size-5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="size-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1 capitalize">
                  {transaction.category} / {transaction.currency}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            <div className="rounded-2xl bg-neutral-950 p-5 text-white dark:bg-white dark:text-neutral-950">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55 dark:text-neutral-500">
                Native amount
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight">
                {isIncome ? "+" : "-"}
                {formatCurrency(transaction.amountCents, transaction.currency)}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailItem
                icon={CalendarDays}
                label="Date"
                value={formatDate(transaction.date)}
              />
              <DetailItem
                icon={CreditCard}
                label="Wallet"
                value={transaction.accountName || "Auto-selected wallet"}
              />
              <DetailItem
                icon={Paperclip}
                label="Attachments"
                value={
                  transaction.receiptImageUrl || transaction.attachmentCount > 0
                    ? `${Math.max(1, transaction.attachmentCount)} attached`
                    : "No attachments"
                }
              />
              <DetailItem
                icon={isIncome ? ArrowUpRight : ArrowDownRight}
                label="Type"
                value={isIncome ? "Income" : "Expense"}
              />
            </div>

            {transaction.description && (
              <div className="mt-4 rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Description
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                  {transaction.description}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-neutral-100 px-6 py-4 dark:border-white/10">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTransaction.isPending}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {deleteTransaction.isPending ? "Deleting..." : "Delete"}
            </Button>
            <Button type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionEditorDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        transaction={transaction}
        displayCurrency={displayCurrency}
        wallets={wallets}
        onSaved={() => {
          setIsEditing(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/70 bg-neutral-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-500 shadow-sm dark:bg-white/10 dark:text-neutral-300">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-neutral-950 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}
