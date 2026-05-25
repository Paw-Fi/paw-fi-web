# EUR Personal Multi-Currency Fixture Expected Values

Fixture: `supabase/scripts/multicurrency_eur_fixture.sql`

User ID: `a1af5807-9321-4e2a-ac9f-441c510eb826`

Base/display currency to select in app: `EUR`

Selected currencies: `EUR`, `USD`

Fixture month: current Europe/Paris month at seed time.

Fallback conversion rate used by the app: `1 USD = 0.854338 EUR`.

Native transactions:

| Row                           |       Native amount |
| ----------------------------- | ------------------: |
| salary (eur)                  | EUR 3,000.00 income |
| freelance (usd)               |   USD 500.00 income |
| groceries (eur)               |  EUR 120.00 expense |
| transport (eur)               |   EUR 30.00 expense |
| groceries (usd)               |  USD 100.00 expense |
| rent (eur), recurring         |  EUR 800.00 expense |
| subscription (usd), recurring |   USD 25.00 expense |

EUR overview totals:

| Metric        |     Expected |
| ------------- | -----------: |
| Expense total | EUR 1,056.79 |
| Income total  | EUR 3,427.17 |
| Net cashflow  | EUR 2,370.38 |

Personal pockets:

| Pocket         | Native limit | Expected spent |
| -------------- | -----------: | -------------: |
| pocket1e (eur) |   EUR 200.00 |     EUR 120.00 |
| pocket2e (eur) |   EUR 900.00 |     EUR 800.00 |
| pocket3e (eur) |   EUR 100.00 |      EUR 30.00 |
| pocket1e (usd) |   USD 500.00 |     USD 100.00 |
| pocket2e (usd) |    USD 50.00 |      USD 25.00 |

When viewing EUR pockets with both EUR and USD selected, unallocated spend should be `EUR 106.79` from `groceries (usd)` and `subscription (usd)`.

Personal wallets:

| Wallet         | Native expected balance |
| -------------- | ----------------------: |
| wallet1e (eur) |            EUR 3,050.00 |
| wallet1u (usd) |            USD 2,375.00 |

EUR wallet overview:

| Metric       |     Expected |
| ------------ | -----------: |
| Income total | EUR 3,427.17 |
| Spent total  | EUR 1,056.79 |
| Net worth    | EUR 5,079.06 |
