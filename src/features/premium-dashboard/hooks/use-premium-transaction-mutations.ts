import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export interface TransactionMutationInput {
  id?: string;
  type: "income" | "expense";
  amountCents: number;
  currency: string;
  category: string;
  date: string;
  description: string;
  merchant: string;
  accountId: string | null;
}

async function getFunctionErrorMessage(error: any, fallback: string) {
  if (error?.context) {
    try {
      const body = await error.context.json();
      return body.error || body.message || fallback;
    } catch {
      return error.message || fallback;
    }
  }
  return error?.message || fallback;
}

function mutationKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function usePremiumTransactionMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidateDashboard = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["premium-dashboard-summary"],
    });
  };

  const createTransaction = useMutation({
    mutationFn: async (input: TransactionMutationInput) => {
      if (!user?.id) throw new Error("Authentication required");

      const functionName =
        input.type === "income" ? "save-income" : "save-expense";
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          userId: user.id,
          amount: Math.abs(input.amountCents) / 100,
          category: input.category,
          currency: input.currency,
          date: input.date,
          clientCreatedAt: new Date().toISOString(),
          description: input.description,
          merchant: input.merchant,
          accountId: input.accountId,
          clientMutationId: mutationKey(),
          idempotencyKey: mutationKey(),
        },
      });

      if (error) {
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to save transaction"),
        );
      }
      if (!data?.success) {
        throw new Error(data?.error || "Failed to save transaction");
      }
      return data.data;
    },
    onSuccess: invalidateDashboard,
  });

  const updateTransaction = useMutation({
    mutationFn: async (input: TransactionMutationInput) => {
      if (!input.id) throw new Error("Missing transaction id");
      const { data, error } = await supabase.functions.invoke(
        "update-expense",
        {
          body: {
            expenseId: input.id,
            updates: {
              amount_cents: Math.abs(input.amountCents),
              category: input.category,
              raw_text: input.description,
              merchant: input.merchant || null,
              date: input.date,
              currency: input.currency,
              account_id: input.accountId,
            },
            clientMutationId: mutationKey(),
            idempotencyKey: mutationKey(),
          },
        },
      );

      if (error) {
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to update transaction"),
        );
      }
      if (!data?.success) {
        throw new Error(data?.error || "Failed to update transaction");
      }
      return data.data;
    },
    onSuccess: invalidateDashboard,
  });

  const deleteTransaction = useMutation({
    mutationFn: async (transactionId: string) => {
      if (!user?.id) throw new Error("Authentication required");
      const { data, error } = await supabase.functions.invoke(
        "delete-expense",
        {
          body: {
            expenseId: transactionId,
            userId: user.id,
            clientMutationId: mutationKey(),
            idempotencyKey: mutationKey(),
          },
        },
      );

      if (error) {
        throw new Error(
          await getFunctionErrorMessage(error, "Failed to delete transaction"),
        );
      }
      if (!data?.success) {
        throw new Error(data?.error || "Failed to delete transaction");
      }
      return data;
    },
    onSuccess: invalidateDashboard,
  });

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
