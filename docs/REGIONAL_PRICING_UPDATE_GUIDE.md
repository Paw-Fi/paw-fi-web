# Regional Pricing Update Guide

Use this guide whenever prices change for the Moneko website, Android app, or Stripe Checkout.

## Source of truth

Edit only:

```text
moneko-web/config/regional-pricing.json
```

Do not edit the generated TypeScript or Dart pricing files directly.

All amounts are integers in the currency's minor unit:

- `499` with `minorUnits: 2` means `4.99`.
- `4990` with `minorUnits: 0` means `4,990`.

The important price fields for each market are:

- `monthly`
- `yearly`
- `lifetime`
- `compareAtMonthly`
- `compareAtYearly`

Stripe supports only one amount for each currency inside a multi-currency Price. Markets that share a currency must therefore use the same `monthly`, `yearly`, and `lifetime` amounts.

## Complete update procedure

Run all commands from the web project:

```bash
cd /Users/charles/side-projects/Moneko/moneko-web
```

### 1. Update the catalog

Open `config/regional-pricing.json` and:

1. Increase `catalogVersion` by exactly one, for example from `1` to `2`.
2. Update the required market amounts.
3. Keep every market using the same currency on identical plan amounts.

Always increase `catalogVersion` when a Stripe amount changes. Stripe Price amounts are immutable, so the new version gives the three new Prices new lookup keys such as:

```text
moneko_plus_monthly_v2
moneko_plus_yearly_v2
moneko_lifetime_v2
```

### 2. Update web and mobile pricing files

This single command regenerates pricing for the web app, checkout Edge Function, and Flutter mobile app:

```bash
npm run pricing:generate
```

It updates:

```text
moneko-web/src/data/regional-pricing.generated.ts
moneko-web/supabase/functions/shared/regional-pricing.generated.ts
moneko-mobile/lib/features/subscription/data/regional_pricing.generated.dart
```

The Flutter file is the Android local-price fallback. iOS continues to display the localized price returned by the App Store.

### 3. Validate the generated pricing

```bash
npm run pricing:check
npm run pricing:test
```

These pricing-specific checks do not run the full Flutter test suite.

### 4. Configure Stripe credentials

Ensure `.env.production` contains a Stripe key and the three Product IDs:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PLUS_MONTHLY_PRODUCT_ID=prod_...
STRIPE_PLUS_YEARLY_PRODUCT_ID=prod_...
STRIPE_LIFETIME_PRODUCT_ID=prod_...
```

Use test Product IDs with `sk_test_...` and live Product IDs with `sk_live_...`. Never commit a real secret key.

### 5. Preview the Stripe update

```bash
npm run pricing:stripe:plan
```

Plan mode reads Stripe but creates nothing. Confirm that it reports exactly three missing multi-currency Prices: monthly, yearly, and lifetime.

If the plan reports that an existing lookup key has different amounts, do not overwrite it. Increase `catalogVersion`, regenerate the files, and run the plan again.

### 6. Create the three Stripe Prices

For Stripe test mode:

```bash
npm run pricing:stripe:sync
```

For Stripe live mode, first run the plan with the live key and Product IDs, then explicitly allow the live write:

```bash
npm run pricing:stripe:plan
npm run pricing:stripe:sync -- --allow-live
```

The sync is safe to rerun. It reuses matching Prices and creates only missing Prices. A pricing version creates at most three Stripe Prices, with all supported currencies stored inside each Price.

### 7. Deploy the checkout pricing

Create the Stripe Prices before deploying the new checkout function. This prevents the deployed function from requesting a new lookup key that does not exist yet.

Deploy only the function affected by regional pricing:

```bash
supabase functions deploy create-checkout-session --project-ref pbopcsmrcykdzbilpilf
```

The project also has `deploy-payments-functions.sh`, but that deploys the entire payments function set and is unnecessary for a pricing-only update.

### 8. Release the clients

- **Web:** commit and deploy the regenerated web pricing file through the normal website deployment workflow.
- **Android:** include the regenerated Dart pricing file in the next Android release.
- **iOS:** update App Store Connect prices separately when required. The iOS UI reads prices directly from the App Store.

Do not release the updated web or Android client before the matching live Stripe Prices and checkout function are available.

## Short command checklist

After editing the catalog and increasing `catalogVersion`:

```bash
cd /Users/charles/side-projects/Moneko/moneko-web
npm run pricing:generate
npm run pricing:check
npm run pricing:test
npm run pricing:stripe:plan
npm run pricing:stripe:sync -- --allow-live
supabase functions deploy create-checkout-session --project-ref pbopcsmrcykdzbilpilf
```

Remove `--allow-live` when working with a Stripe test key:

```bash
npm run pricing:stripe:sync
```

## Current intentional shared-currency prices

Unless the pricing policy changes, keep these currencies unified across all countries that use them:

| Currency | Monthly | Yearly | Lifetime |
| --- | ---: | ---: | ---: |
| EUR | 499 | 2999 | 9999 |
| USD | 1099 | 7999 | 14999 |

These values are in minor units.
