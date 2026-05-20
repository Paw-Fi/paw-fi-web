# AI Bot Mobile/Backend Parity Audit

Purpose: verify that Twilio/Telegram AI bot tools send the same payload shape and business semantics as the mobile app flows, and that every payload matches the Supabase Edge Function/RPC/table contract that persists the feature.

Audit rule: do not mark a feature done until FE entrypoints, imported child widgets, providers/repositories, backend functions/RPC/table writes, bot tool schemas, and bot dispatch payload builders have all been inspected.

## Checklist

- [ ] Transactions: create, read/list, update, delete, analyze, household split, wallet/account, receipt/media behavior.
- [ ] Recurring transactions: create, update, analyze, reminder, recurrence rule, household split, wallet/account behavior.
- [ ] Spaces: create shared/private space, get space info with members, update settings, auto-split config, delete behavior.
- [ ] Pockets budgets: create/update monthly budget amount and scope behavior.
- [ ] Pockets envelopes: create, update, delete pocket, category links, colors/icons, allocation rebalance behavior.
- [ ] Wallets: create and update wallet/account, default wallet, scope behavior.
- [ ] Insights/advice: analyze data and financial advice parity with insights/scenario planning.

## Audit Template

For each feature:

- Status: Not started | In progress | Blocked | Done.
- Mobile FE files checked: list every entrypoint, imported child widget, provider, repository, model, utility visited.
- Backend files checked: list every Edge Function, RPC/table write path, shared helper, migration/schema source visited.
- Bot files checked: list tool definition, normalization, dispatch, shared helper, and tests visited.
- Mobile payload contract: exact keys, types, required/optional fields, defaults, validation, scope behavior.
- Backend expected contract: exact keys, types, required/optional fields, defaults, rejected values, response shape.
- Bot contract: exact exposed tool params, normalization, generated request body, response handling.
- Parity verdict: Matches | Mismatch found | Needs clarification.
- Findings and fixes: concrete issues, file references, status.
- Verification: static checks, tests, or manual contract checks run.

## Transactions

- Status: In progress.
- Mobile FE files checked: `moneko-mobile/lib/features/home/presentation/widgets/unified_transaction_sheet.dart`, `moneko-mobile/lib/features/home/presentation/widgets/home_ai_fab.dart`, `moneko-mobile/lib/features/home/presentation/state/expense_save_providers.dart`, `moneko-mobile/lib/features/home/presentation/state/transaction_edit_notifier.dart`, `moneko-mobile/lib/features/income/presentation/providers/income_providers.dart`, `moneko-mobile/lib/features/home/presentation/models/parsed_expense.dart`, `moneko-mobile/lib/features/home/presentation/models/expense_entry.dart`.
- Backend files checked: `supabase/functions/save-expense/index.ts`, `supabase/functions/save-income/index.ts`, `supabase/functions/save-transactions-batch/index.ts`, `supabase/functions/save-transactions-batch/request-normalization.ts`, `supabase/functions/update-expense/index.ts`, `supabase/functions/delete-expense/index.ts`, `supabase/functions/shared/expenses-helpers.ts`, `supabase/functions/shared/household-auto-split.ts` by import/contract reference.
- Bot files checked: `supabase/functions/shared/bot/tool-definitions.ts`, `supabase/functions/shared/bot/transaction-tool.ts`, `supabase/functions/shared/bot/household-utils.ts`, `supabase/functions/twilio-whatsapp-ai-bot/index.ts`, `supabase/functions/telegram-ai-bot/index.ts`, `supabase/functions/shared/bot/transaction-tool.golden_test.ts`.
- Mobile create payload contract: `userId`, `amount`, `category`, `currency`, `date` as `YYYY-MM-DD`, `clientCreatedAt`, `type: expense` for expenses, optional `description`, `merchant`, `breakdown`, `receiptImageUrl`, `householdId`, `isPortfolio`, `accountId`, `customSplits`, `payerUserId`, `clientRecordId`, `clientMutationId`, `idempotencyKey`. Income uses the same shared-space split/account fields plus `ownerType`, `privacyScope`, optional `source`, `attachments`, `isRecurring`, `recurrence_rule`.
- Mobile AI batch payload contract: top-level `userId`, optional `householdId`, `isPortfolio`, `debugTraceId`, and `transactions[]` with `type`, `amount`, `category`, `currency`, `date`, optional `accountId`, `clientCreatedAt`, mutation metadata, `isRecurring`, `recurrence_rule`, `description`, `breakdown`, expense-only `receiptImageUrl`, shared-space `payerUserId` and `customSplits`, and income privacy defaults handled by backend.
- Mobile update payload contract: `update-expense` body with `userId`, `expenseId`, `updates`, optional `householdId`, `isPortfolio`, `customSplits`, `payerUserId`, or `splitUpdate`. `updates` can include `amount_cents`, `category`, `currency`, `raw_text`, `merchant`, `date`, `created_at`, `receipt_image_url`, `account_id`, `household_id`, `payer_user_id`, and compatibility `payerUserId`.
- Mobile delete payload contract: `delete-expense` body with `userId`, `expenseIds` comma-separated, plus mutation metadata.
- Backend expected contract: `save-expense` accepts positive or negative numeric `amount` and stores absolute cents, validates category/currency/date/merchant, validates `householdId`, resolves default account, creates split group for non-portfolio household expenses. `save-income` accepts positive numeric `amount`, category/currency/date/merchant/privacy fields/account, and supports `customSplits`/`payerUserId`. `save-transactions-batch` accepts both expense and income items with shared split metadata. `update-expense` validates `updates`, scope/account changes, split creation/update, and category remap mode. `delete-expense` accepts `expenseIds`, `expense_ids`, `expenseId`, or `expense_id`.
- Bot create contract after fix: single and batch add now resolve shared-space split config for both expenses and incomes, pass `payerUserId` and `customSplits` into `invokeTransactionSave`, and `invokeTransactionSave` now preserves those fields for both `save-expense` and `save-income`.
- Parity verdict: Mismatch found and partially fixed. Create/save parity for shared income splits is now aligned with mobile/backend. Update parity is not yet complete because bot `update_transaction` does not expose or build all mobile-supported update fields for wallet/account reassignment, household/portfolio scope changes, payer changes, custom split creation/update, or receipt replacement.
- Findings and fixes: Fixed bot shared-income split payload loss in `shared/bot/transaction-tool.ts`, Twilio app mode, Twilio WhatsApp mode, Telegram add, Telegram batch, and Telegram recurring add path. Added regression coverage in `shared/bot/transaction-tool.golden_test.ts`.
- Verification: `deno check "supabase/functions/shared/bot/transaction-tool.ts" "supabase/functions/shared/bot/household-utils.ts" "supabase/functions/shared/bot/tool-definitions.ts" "supabase/functions/twilio-whatsapp-ai-bot/index.ts" "supabase/functions/telegram-ai-bot/index.ts"` passed. `deno test --no-lock --allow-env "supabase/functions/shared/bot/tool-definitions.golden_test.ts" "supabase/functions/shared/bot/household-utils.golden_test.ts" "supabase/functions/shared/bot/transaction-tool.golden_test.ts"` passed with 11 tests. Lock-enforced Deno test is blocked by an existing remote integrity mismatch for `https://esm.sh/utf-8-validate@6.0.5/denonext/utf-8-validate.mjs` in `deno.lock`. `git diff --check` passed.

## Recurring Transactions

- Status: Not started.
- Mobile FE files checked: pending.
- Backend files checked: pending.
- Bot files checked: pending.
- Mobile payload contract: pending.
- Backend expected contract: pending.
- Bot contract: pending.
- Parity verdict: pending.
- Findings and fixes: pending.
- Verification: pending.

## Spaces

- Status: Not started.
- Mobile FE files checked: pending.
- Backend files checked: pending.
- Bot files checked: pending.
- Mobile payload contract: pending.
- Backend expected contract: pending.
- Bot contract: pending.
- Parity verdict: pending.
- Findings and fixes: pending.
- Verification: pending.

## Pockets Budgets

- Status: Not started.
- Mobile FE files checked: pending.
- Backend files checked: pending.
- Bot files checked: pending.
- Mobile payload contract: pending.
- Backend expected contract: pending.
- Bot contract: pending.
- Parity verdict: pending.
- Findings and fixes: pending.
- Verification: pending.

## Pockets Envelopes

- Status: Not started.
- Mobile FE files checked: pending.
- Backend files checked: pending.
- Bot files checked: pending.
- Mobile payload contract: pending.
- Backend expected contract: pending.
- Bot contract: pending.
- Parity verdict: pending.
- Findings and fixes: pending.
- Verification: pending.

## Wallets

- Status: Not started.
- Mobile FE files checked: pending.
- Backend files checked: pending.
- Bot files checked: pending.
- Mobile payload contract: pending.
- Backend expected contract: pending.
- Bot contract: pending.
- Parity verdict: pending.
- Findings and fixes: pending.
- Verification: pending.

## Insights And Financial Advice

- Status: Not started.
- Mobile FE files checked: pending.
- Backend files checked: pending.
- Bot files checked: pending.
- Mobile payload contract: pending.
- Backend expected contract: pending.
- Bot contract: pending.
- Parity verdict: pending.
- Findings and fixes: pending.
- Verification: pending.
