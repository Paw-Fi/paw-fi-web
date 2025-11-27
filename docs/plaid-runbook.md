# Plaid Integration Runbook

This guide covers how to connect Plaid to the Supabase backend, how to exchange tokens, and how to run manual transaction syncs that populate the `expenses` table.

## 1. Required Environment Variables

Configure these secrets locally (`.env.local` / `supabase/.env`) and in Supabase Project Settings → API → Secrets.

| Variable | Description |
| --- | --- |
| `PLAID_CLIENT_ID` | Plaid client ID (Sandbox/Development/Production). |
| `PLAID_SECRET` | Plaid secret associated with the environment. |
| `PLAID_ENV` | `sandbox`, `development`, or `production`. Defaults to `sandbox`. |
| `PLAID_PRODUCTS` | Comma-separated product list (default `transactions`). |
| `PLAID_COUNTRY_CODES` | Comma-separated ISO country codes (default `US,CA`). |
| `PLAID_CLIENT_NAME` | Display name shown inside Link (default `Moneko`). |
| `PLAID_REDIRECT_URI` | Optional redirect URI (needed for European/OAuth flows). |
| `PLAID_WEBHOOK_URL` | Optional webhook URL for Plaid events. |
| `PLAID_LINK_CUSTOMIZATION_NAME` | Optional Link customization key. |
| `PLAID_ENCRYPTION_KEY` | 32-byte base64 key used for AES-GCM encryption of access tokens. |

> Generate `PLAID_ENCRYPTION_KEY` via `openssl rand -base64 32` and keep it secret. All access tokens are encrypted before being stored in `bank_connections.plaid_access_token_encrypted`.

## 2. Flow Overview

1. **Create Link Token** – Frontend calls `POST /functions/v1/plaid-create-link-token` (optional body `{ connectionId }` for update mode). The function authenticates the Supabase user and returns `{ linkToken, expiration }`.
2. **Launch Plaid Link** – The React app passes the `linkToken` to the Plaid Link SDK. When Link succeeds it returns a `public_token` and `institution` metadata. For OAuth-based institutions set Plaid’s redirect URI to `https://<your-domain>/plaid/redirect`; that page automatically forwards all query/hash params to the deep link `moneko://plaid?...`.
3. **Exchange Public Token** – Frontend sends `public_token` (and optional institution metadata) to `POST /functions/v1/plaid-exchange-public-token`. The function:
   - Exchanges the token for an access token + item ID.
   - Encrypts and stores the access token in `bank_connections`.
   - Fetches accounts via `/accounts/get` and upserts them into `bank_accounts`.
   - Responds with the connection ID and the list of stored accounts.
4. **Manual Sync** – The “Sync” button calls `POST /functions/v1/plaid-sync-transactions`. Optional body parameters:
   ```json
   {
     "connectionId": "optional-bank-connection-id",
     "bankAccountId": "optional-local-bank-account-id",
     "cursorOverride": "reset or specific cursor"
   }
   ```
   The function decrypts each access token, runs `/transactions/sync` until caught up, inserts/updates expenses, deletes removed transactions, and records a `bank_sync_audit` row.

## 3. Frontend Notes

- **Create Link Token**
  ```ts
  const { data } = await fetch('/functions/v1/plaid-create-link-token', { method: 'POST' });
  const { linkToken } = await data.json();
  const plaid = usePlaidLink({ token: linkToken, onSuccess: ({ public_token, metadata }) => {
    await fetch('/functions/v1/plaid-exchange-public-token', {
      method: 'POST',
      body: JSON.stringify({
        publicToken: public_token,
        institutionId: metadata.institution?.institution_id,
        institutionName: metadata.institution?.name,
      }),
    });
  }});
  ```
- **Sync**
   ```ts
   await fetch('/functions/v1/plaid-sync-transactions', { method: 'POST' });
   // Afterwards refetch expenses list from Supabase REST/Edge function.
   ```

### Mobile deep-link parameters

When an OAuth institution completes, `/plaid/redirect` collects the query/hash parameters passed by Plaid and forwards them to `moneko://plaid`. Listen for the following keys inside the native app:

- `link_token`: Needed to resume the Plaid Link flow inside the webview after redirect.
- `oauth_state_id`: Plaid’s state handle to verify against the existing Link session.
- `status`: Optional string set by Plaid (e.g., `connected`).
- `error_code` / `error_message`: Present if the OAuth handoff failed.
- Any additional Plaid query params are forwarded untouched, so future additions continue working without frontend changes.

## 4. Local Testing Checklist

1. Start Supabase Edge Functions locally:
   ```bash
   supabase functions serve plaid-create-link-token plaid-exchange-public-token plaid-sync-transactions --env-file supabase/.env
   ```
2. Use Plaid Sandbox credentials in `.env`.
3. Call `plaid-create-link-token`, open Plaid Link (sandbox institutions such as `ins_109508`), and finish the flow.
4. Trigger `plaid-sync-transactions` from Postman or the app to pull sandbox transactions into `public.expenses` (you can call `/sandbox/transactions/create` via Plaid to generate extra data if needed).

## 5. Operations & Future Enhancements

- All syncs are manual today; `bank_sync_audit` keeps per-run stats so a future cron job can reuse the same endpoint.
- Removed Plaid transactions trigger deletions in the `expenses` table keyed by `provider_transaction_id`.
- Access tokens never leave Supabase; only encrypted strings are stored in the database, and AES-GCM keys live in secrets.

Need help? `supabase functions logs plaid-sync-transactions` is the fastest way to debug sync issues.
