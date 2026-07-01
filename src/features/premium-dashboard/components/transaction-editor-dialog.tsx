import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PremiumDashboardSummary } from "../types";
import {
  TransactionMutationInput,
  usePremiumTransactionMutations,
} from "../hooks/use-premium-transaction-mutations";

type DashboardTransaction =
  PremiumDashboardSummary["recentTransactions"][number];

interface TransactionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: DashboardTransaction | null;
  displayCurrency: string;
  wallets: PremiumDashboardSummary["wallets"]["wallets"];
  onSaved?: () => void;
}

const CATEGORIES = [
  "groceries",
  "dining",
  "transport",
  "shopping",
  "housing",
  "utilities",
  "health",
  "travel",
  "salary",
  "freelance",
  "investment",
  "uncategorized",
];

const NONE_ACCOUNT = "__none__";

function toAmountInput(cents: number) {
  return (Math.abs(cents) / 100).toFixed(2);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionEditorDialog({
  open,
  onOpenChange,
  transaction,
  displayCurrency,
  wallets,
  onSaved,
}: TransactionEditorDialogProps) {
  const isEditing = Boolean(transaction);
  const { createTransaction, updateTransaction } =
    usePremiumTransactionMutations();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(displayCurrency);
  const [category, setCategory] = useState("uncategorized");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayIsoDate());
  const [accountId, setAccountId] = useState<string>(NONE_ACCOUNT);
  const [error, setError] = useState<string | null>(null);

  const walletOptions = useMemo(
    () =>
      wallets.filter((wallet) => wallet.currency === currency || isEditing),
    [currency, isEditing, wallets],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setType(transaction?.type ?? "expense");
    setAmount(transaction ? toAmountInput(transaction.amountCents) : "");
    setCurrency(transaction?.currency ?? displayCurrency);
    setCategory(transaction?.category ?? "uncategorized");
    setMerchant(transaction?.merchant ?? "");
    setDescription(transaction?.description ?? "");
    setDate(transaction?.date ?? todayIsoDate());
    setAccountId(transaction?.accountId ?? NONE_ACCOUNT);
  }, [displayCurrency, open, transaction]);

  const isSaving = createTransaction.isPending || updateTransaction.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountNumber = Number.parseFloat(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    const payload: TransactionMutationInput = {
      id: transaction?.id,
      type,
      amountCents: Math.round(amountNumber * 100),
      currency,
      category: category.trim() || "uncategorized",
      date,
      merchant: merchant.trim(),
      description: description.trim(),
      accountId: accountId === NONE_ACCOUNT ? null : accountId,
    };

    try {
      if (isEditing) {
        await updateTransaction.mutateAsync(payload);
      } else {
        await createTransaction.mutateAsync(payload);
      }
      onSaved?.();
      onOpenChange(false);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to save transaction.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-neutral-200 bg-white p-0 text-neutral-950 shadow-[0_30px_120px_-56px_rgba(15,23,42,0.7)] dark:border-white/10 dark:bg-neutral-950 dark:text-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-neutral-100 px-6 py-5 text-left dark:border-white/10">
            <DialogTitle className="text-xl font-semibold tracking-tight text-neutral-950 dark:text-white">
              {isEditing ? "Edit transaction" : "Add transaction"}
            </DialogTitle>
            <DialogDescription>
              Save a real Moneko transaction using the same backend paths as the mobile app.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Type">
                <Select
                  value={type}
                  onValueChange={(value) =>
                    setType(value as "income" | "expense")
                  }
                  disabled={isEditing}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Amount">
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]"
                />
              </Field>

              <Field label="Currency">
                <Input
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase().slice(0, 3))
                  }
                  maxLength={3}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50 uppercase dark:border-white/10 dark:bg-white/[0.06]"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11 w-full rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        <span className="capitalize">{item}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date">
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]"
                />
              </Field>
            </div>

            <Field label="Wallet">
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-11 w-full rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_ACCOUNT}>Auto-select wallet</SelectItem>
                  {walletOptions.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.name} ({wallet.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Merchant">
              <Input
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
                placeholder="Merchant or payee"
                className="h-11 rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]"
              />
            </Field>

            <Field label="Description">
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Notes, receipt text, or context"
                className="min-h-24 rounded-xl border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]"
              />
            </Field>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-neutral-100 px-6 py-4 dark:border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
        {label}
      </Label>
      {children}
    </div>
  );
}
