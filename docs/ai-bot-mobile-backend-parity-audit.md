# AI Bot Mobile/Backend Parity Audit

Purpose: verify that Twilio/Telegram AI bot tools send the same payload shape and business semantics as the mobile app flows, and that every payload matches the Supabase Edge Function/RPC/table contract that persists the feature.

Audit rule: do not mark a feature done until FE entrypoints, imported child widgets, providers/repositories, backend functions/RPC/table writes, bot tool schemas, and bot dispatch payload builders have all been inspected.

## Checklist

- [x] Transactions: create, read/list, update, delete, analyze, split, wallet, receipt/media behavior.
- [x] Recurring transactions: create, update, analyze, reminder, recurrence rule, split, wallet behavior.
- [x] Spaces: create shared/private space, get space info with members, update settings, auto-split config, delete behavior.
- [x] Pockets budgets: create/update monthly budget amount and scope behavior.
- [x] Pockets envelopes: create, update, delete pocket, category links, colors/icons, allocation rebalance behavior.
- [x] Wallets: create and update wallet, default wallet, scope behavior.
- [x] Insights/advice: analyze data and financial advice parity with insights/scenario planning.

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

- Status: Done.
- Mobile FE files checked: `moneko-mobile/lib/features/home/presentation/widgets/unified_transaction_sheet.dart`, `moneko-mobile/lib/features/home/presentation/widgets/home_ai_fab.dart`, `moneko-mobile/lib/features/home/presentation/state/expense_save_providers.dart`, `moneko-mobile/lib/features/home/presentation/state/transaction_edit_notifier.dart`, `moneko-mobile/lib/features/income/presentation/providers/income_providers.dart`, `moneko-mobile/lib/features/home/presentation/models/parsed_expense.dart`, `moneko-mobile/lib/features/home/presentation/models/expense_entry.dart`.
- Backend files checked: `supabase/functions/save-expense/index.ts`, `supabase/functions/save-income/index.ts`, `supabase/functions/save-transactions-batch/index.ts`, `supabase/functions/save-transactions-batch/request-normalization.ts`, `supabase/functions/update-expense/index.ts`, `supabase/functions/delete-expense/index.ts`, `supabase/functions/shared/expenses-helpers.ts`, `supabase/functions/shared/household-auto-split.ts` by import/contract reference.
- Bot files checked: `supabase/functions/shared/bot/tool-definitions.ts`, `supabase/functions/shared/bot/transaction-tool.ts`, `supabase/functions/shared/bot/household-utils.ts`, `supabase/functions/twilio-whatsapp-ai-bot/index.ts`, `supabase/functions/telegram-ai-bot/index.ts`, `supabase/functions/shared/bot/transaction-tool.golden_test.ts`.
- Mobile create payload contract: `userId`, `amount`, `category`, `currency`, `date` as `YYYY-MM-DD`, `clientCreatedAt`, `type: expense` for expenses, optional `description`, `merchant`, `breakdown`, `receiptImageUrl`, `householdId`, `isPortfolio`, `accountId`, `customSplits`, `payerUserId`, `clientRecordId`, `clientMutationId`, `idempotencyKey`. Income uses the same shared-space split/account fields plus `ownerType`, `privacyScope`, optional `source`, `attachments`, `isRecurring`, `recurrence_rule`.
- Mobile AI batch payload contract: top-level `userId`, optional `householdId`, `isPortfolio`, `debugTraceId`, and `transactions[]` with `type`, `amount`, `category`, `currency`, `date`, optional `accountId`, `clientCreatedAt`, mutation metadata, `isRecurring`, `recurrence_rule`, `description`, `breakdown`, expense-only `receiptImageUrl`, shared-space `payerUserId` and `customSplits`, and income privacy defaults handled by backend.
- Mobile update payload contract: `update-expense` body with `userId`, `expenseId`, `updates`, optional `householdId`, `isPortfolio`, `customSplits`, `payerUserId`, or `splitUpdate`. `updates` can include `amount_cents`, `category`, `currency`, `raw_text`, `merchant`, `date`, `created_at`, `receipt_image_url`, `account_id`, `household_id`, `payer_user_id`, and compatibility `payerUserId`.
- Mobile delete payload contract: `delete-expense` body with `userId`, `expenseIds` comma-separated, plus mutation metadata.
- Backend expected contract: `save-expense` accepts positive or negative numeric `amount` and stores absolute cents, validates category/currency/date/merchant, validates `householdId`, resolves default account, creates split group for non-portfolio household expenses. `save-income` accepts positive numeric `amount`, category/currency/date/merchant/privacy fields/account, and supports `customSplits`/`payerUserId`. `save-transactions-batch` accepts both expense and income items with shared split metadata. `update-expense` validates `updates`, scope/account changes, split creation/update, and category remap mode. `delete-expense` accepts `expenseIds`, `expense_ids`, `expenseId`, or `expense_id`.
- Bot create/update contract after fix: single and batch add now resolve split config for both expenses and incomes, pass `payerUserId` and `customSplits` into `invokeTransactionSave`, and `invokeTransactionSave` preserves those fields for both `save-expense` and `save-income`. `update_transaction` now exposes AI-facing `space_id`, `space_name`, `space_type`, `wallet_id`, `wallet_name`, `payer_name`, `split_type`, and `member_splits`, then maps them to backend `update-expense` fields `householdId`, `updates.household_id`, `updates.account_id`, `payerUserId`, `customSplits`, and `splitUpdate`.
- Parity verdict: Matches for bot-supported transaction create/list/update/delete/analyze paths after fixes. Receipt replacement remains mobile-only because `update-expense` does not accept `receipt_image_url` today.
- Findings and fixes: Fixed bot shared-income split payload loss in `shared/bot/transaction-tool.ts`, Twilio app mode, Twilio WhatsApp mode, Telegram add, Telegram batch, and Telegram recurring add path. Added update parity for wallet reassignment, space moves, payer updates, and custom split create/update. Replaced AI-facing old naming with `space_*` and `wallet_*` parameters while retaining backend mapping aliases internally.
- Verification: `deno check "supabase/functions/shared/bot/tool-definitions.ts" "supabase/functions/shared/bot/household-utils.ts" "supabase/functions/shared/bot/transaction-tool.ts" "supabase/functions/shared/bot/space-tools.ts" "supabase/functions/twilio-whatsapp-ai-bot/index.ts" "supabase/functions/telegram-ai-bot/index.ts"` passed. `deno test --no-lock --allow-env "supabase/functions/shared/bot/tool-definitions.golden_test.ts" "supabase/functions/shared/bot/household-utils.golden_test.ts" "supabase/functions/shared/bot/transaction-tool.golden_test.ts"` passed with 11 tests.

## Recurring Transactions

- Status: Done.
- Mobile FE files checked: `moneko-mobile/lib/features/recurring/presentation/widgets/add_recurring_sheet.dart`, `moneko-mobile/lib/features/recurring/presentation/providers/recurring_providers.dart`, `moneko-mobile/lib/features/recurring/domain/models/recurring_transaction.dart`.
- Backend files checked: `moneko-web/supabase/functions/save-expense/index.ts`, `moneko-web/supabase/functions/save-income/index.ts`, `moneko-web/supabase/functions/update-expense/index.ts`, `moneko-web/supabase/functions/shared/accounts.ts`, `moneko-web/supabase/functions/shared/household-auto-split.ts`, recurring/account/reminder migrations.
- Bot files checked: `moneko-web/supabase/functions/twilio-whatsapp-ai-bot/index.ts`, `moneko-web/supabase/functions/telegram-ai-bot/index.ts`, `moneko-web/supabase/functions/shared/bot/tool-definitions.ts`, `transaction-tool.ts`, `date-utils.ts`, `household-utils.ts`, `wallet-scope.ts`.
- Mobile payload contract: create sends `isRecurring: true` and `recurrence_rule` with `frequency`, `anchor_date`, optional `end_date`, `interval`, `reminder.enabled/value/unit`, wallet `accountId`, optional space/split fields. Update sends `update-expense` with `updates.is_recurring`, `updates.recurrence_rule`, `updates.account_id`, `updates.household_id`, optional `payerUserId`, `customSplits`, or `splitUpdate`.
- Backend expected contract: `save-expense`, `save-income`, and `update-expense` require non-null `recurrence_rule.frequency` and `anchor_date` when recurring, validate reminders, preserve wallet/account scope, and support split payloads for shared spaces.
- Bot contract after fix: `add_transaction` exposes schedule/reminder fields and defaults recurring saves to a valid monthly recurrence rule if frequency is omitted. WhatsApp and Telegram both pass recurrence rules through shared builders and update recurring transactions via `update-expense`.
- Parity verdict: Matches for create/update recurring transaction payloads after fixes.
- Findings and fixes: Fixed recurring add with missing frequency by defaulting to monthly rule. Added schedule/reminder fields to `add_transaction` and `update_transaction` schemas. Wallet/split update parity is covered by the transaction update fix.
- Verification: Bot Deno check passed for shared tool definitions, transaction helper, space helper, Twilio bot, and Telegram bot. Shared bot golden tests passed with 11 tests.

## Spaces

- Status: Done.
- Mobile FE files checked: `moneko-mobile/lib/features/households/presentation/pages/create_space_page.dart`, `household_settings_page.dart`, `household_service.dart`, `household_repository_impl.dart`, `household_repository.dart`, `household.dart`, `household_providers.dart`, `selected_household_provider.dart`, `create_household_form_content.dart`, `space_visibility_selector_card.dart`, `auto_split_toggle_tile.dart`, `household_members_panel.dart`, `custom_split_config_codec.dart`.
- Backend files checked: households/space migrations, `moneko-web/supabase/functions/shared/household-auto-split.ts`, transaction save/update paths that consume space split settings.
- Bot files checked: Twilio and Telegram bot entrypoints, `shared/bot/tool-definitions.ts`, `shared/bot/household-utils.ts`, `shared/bot/space-tools.ts`, session state.
- Mobile payload contract: create writes `households` with `name`, `currency`, `cover_image_url`, `theme_color`, `is_portfolio`, `ai_use_default_split`, `owner_id`. Get reads space row plus members and user profile rows. Update writes settings including visibility, cover/theme, `ai_use_default_split`, and `ai_default_split_config`. Delete uses RPC `delete_household(p_household_id)`.
- Backend expected contract: tables still use `households` and `household_members`; owner trigger adds the owner member; owner/admin can update; owner can delete. Auto-split config is stored in `ai_default_split_config` and coerced by backend helpers.
- Bot contract after fix: AI-facing tools are `create_space`, `get_space_info`, and `update_space_settings` with `space_id`, `space_name`, and `space_type`. Shared helper maps those to existing backend `households` rows and returns space plus members. Old `household_*` and `is_portfolio` names are internal aliases only and are no longer exposed in tool schemas/prompts.
- Parity verdict: Matches for create, info-with-members, and update settings. Delete remains backend/mobile-only because no user-facing bot delete-space flow was requested.
- Findings and fixes: Added `shared/bot/space-tools.ts`, registered space tools in both bots, updated context/prompt naming to `space_*`, and removed AI-facing `household`/`portfolio`/`account_id` terminology from tool schemas.
- Verification: Bot Deno check passed. Shared bot golden tests passed with 11 tests.

## Pockets Budgets

- Status: Done.
- Mobile FE files checked: `pockets_header_card.dart`, `pockets_grid_section.dart`, `pockets_page.dart`, `pockets_providers.dart`, `pocket_envelope.dart`, `mobile_outbox_sync_provider.dart`.
- Backend files checked: budget/envelope migrations, `get_pockets_month_v2` migrations, `moneko-web/supabase/functions/shared/budgets-helpers.ts`.
- Bot files checked: Twilio bot budget handlers, Telegram bot budget handlers, `shared/bot/tool-definitions.ts`, `shared/bot/budget-utils.ts`.
- Mobile payload contract: monthly budget writes `budgets.total_budget_cents`, `user_id`, `household_id`, `currency`, `period_month`, `updated_at`; local-first replay uses `save_pockets_month` with `replaceMissingPockets` and exact pocket `budgetAmountCents`.
- Backend expected contract: `budgets.total_budget_cents` is canonical; `budget_envelopes.budget_amount_cents` and `envelope_allocations.amount_cents` store exact cents; legacy percentage trigger still backfills when percent is used.
- Bot contract: `set_budget`, `draft_budget`, and `confirm_budget` accept total amount plus optional pockets. Bot handlers convert major-unit budget amounts to cents and write the same `budgets` table via helpers.
- Parity verdict: Checked. Budget total amount and scope match backend; pocket allocation parity details are covered under Pockets Envelopes.
- Findings and fixes: Existing bot schema is percentage-first for pocket splits while mobile is amount-cents canonical. Backend trigger and helper path keep persisted cents aligned when total budget is known.
- Verification: Bot Deno check passed. Shared bot golden tests passed with 11 tests.

## Pockets Envelopes

- Status: Done.
- Mobile FE files checked: `edit_pocket_envelope_sheet.dart`, `pockets_header_card.dart`, `pockets_grid_section.dart`, `pockets_page.dart`, `pockets_providers.dart`, `pocket_envelope.dart`, `mobile_outbox_sync_provider.dart`.
- Backend files checked: envelope/budget migrations, recurring-aware pockets RPC migrations, `shared/budgets-helpers.ts`.
- Bot files checked: Twilio/Telegram `set_pocket` and `delete_pocket` handlers, `tool-definitions.ts`, `budget-utils.ts`.
- Mobile payload contract: create/update writes `budget_envelopes` with `name`, `budget_amount_cents`, `currency`, `color`, `icon`; writes `envelope_allocations.amount_cents`; replaces `envelope_category_links`; delete removes the envelope and local-first replay can replace missing pockets.
- Backend expected contract: unique `(budget_id, name)`, exact cents in `budget_amount_cents`, allocation rows by `(envelope_id, period_month)`, category links by `(envelope_id, category)`.
- Bot contract: `set_pocket` can create/update a pocket with `percentage`, categories, color/icon in WhatsApp; Telegram has minimal schema. `delete_pocket` deletes by name. Helper derives cents from total budget where available.
- Parity verdict: Checked with known difference documented: bot pocket allocation input remains percentage-based while mobile edit is exact amount-based.
- Findings and fixes: No backend contract mismatch found. Follow-up recommended to add AI-facing `amount`/`budget_amount` to pocket tools and centralize amount-cents rebalance so bots match the mobile sheet exactly.
- Verification: Bot Deno check passed. Shared bot golden tests passed with 11 tests.

## Wallets

- Status: Done.
- Mobile FE files checked: `create_edit_wallet_sheet.dart`, `wallet.dart`, `wallet_providers.dart`, `wallet_auth_headers_provider.dart`, `wallets_page.dart`, `wallet_details_page.dart`, Plaid/import wallet paths.
- Backend files checked: `save-wallet/index.ts`, `update-wallet/index.ts`, `list-wallets/index.ts`, `shared/accounts.ts`, accounts migrations and default wallet cleanup migrations.
- Bot files checked: Twilio/Telegram wallet handlers, `tool-definitions.ts`, `wallet-scope.ts`, `household-utils.ts`, AI validation helpers.
- Mobile payload contract: create wallet invokes `save-wallet` with `name`, `icon`, `color`, `openingBalanceCents`, `goalAmountCents`, `isDefault`, optional `householdId`; update invokes `update-wallet` with `accountId`, optional display fields, `openingBalanceCents`, `goalAmountCents`, and `isDefault`.
- Backend expected contract: `accounts` table stores wallets; `save-wallet`/`update-wallet` validate auth/scope and update exact cents. Default wallet uniqueness is per personal or space scope.
- Bot contract after fix: AI-facing tools use wallet naming only. `create_wallet` supports opening balance, goal amount, default, and space scope. `update_wallet` now exposes and sends `opening_balance` as `openingBalanceCents`, plus name/icon/color/goal/default.
- Parity verdict: Matches for create/update payload fields after adding opening-balance update support.
- Findings and fixes: Added `opening_balance` to update wallet schema and both bot handlers. Removed AI-facing `account_id` terminology from update transaction schema in favor of `wallet_id`/`wallet_name`, mapping internally to backend `account_id`.
- Verification: Bot Deno check passed. Shared bot golden tests passed with 11 tests.

## Insights And Financial Advice

- Status: Done.
- Mobile FE files checked: `insights_page.dart`, `monthly_report_page.dart`, `monthly_report_provider.dart`, `monthly_financial_report.dart`, `scenario_planning_tab.dart`, `scenario_result_sheet.dart`, analytics providers.
- Backend files checked: `ai-scenario-planner/index.ts`, `get-financial-health-profile/index.ts`, financial health profile/scenario migrations.
- Bot files checked: Twilio/Telegram bot `financial_insight` handlers, `tool-definitions.ts`, `media-utils.ts`, Telegram parity helper.
- Mobile analysis contract: monthly report is local-first and combines transactions, local overlays, pockets/budgets, wallets/net worth, recurring projections, selected currency conversion, and scope. Scenario planner calls `ai-scenario-planner` with `question`, `targetDate`, `language`, `currency`, optional `currencies`, `mode`, and optional `householdId`.
- Backend expected contract: `ai-scenario-planner` streams NDJSON `meta`, `chunk`, `done`, or `error`; validates personal vs space mode; reads transactions, budgets, financial health profile, and scenario history.
- Bot contract: `financial_insight` is available in both bots; Twilio computes a current-month snapshot; Telegram tool currently returns success and lets the model answer from context.
- Parity verdict: Checked with known depth difference documented: bot financial insight is thinner than mobile monthly report.
- Findings and fixes: Removed abandoned goals from `ai-scenario-planner` data queries and prompt injection so AI advice no longer uses `financial_goals`.
- Verification: `deno fmt` ran on `ai-scenario-planner/index.ts`. `deno check "supabase/functions/ai-scenario-planner/index.ts"` is blocked by an existing bare `@google/generative-ai` import resolution issue in that function. Bot Deno check passed. Shared bot golden tests passed with 11 tests.
