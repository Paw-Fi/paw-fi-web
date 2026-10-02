import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  SUPPORTED_CURRENCIES,
  validatePricingPolicy,
} from "./regional-pricing-model.mjs";

export const LATEST_EUR_RATES_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json";
const executeFile = promisify(execFile);

export async function fetchLatestPricingPolicy(
  policy,
  { runCurl = executeFile, now = new Date() } = {},
) {
  try {
    const { stdout } = await runCurl(
      "curl",
      [
        "--disable",
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--proto",
        "=https",
        "--proto-redir",
        "=https",
        "--connect-timeout",
        "10",
        "--max-time",
        "30",
        "--header",
        "Cache-Control: no-cache",
        LATEST_EUR_RATES_URL,
      ],
      { encoding: "utf8", timeout: 35000, maxBuffer: 1024 * 1024 },
    );
    const snapshot = JSON.parse(stdout);
    const date = snapshot?.date;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
      !snapshot?.eur ||
      typeof snapshot.eur !== "object" ||
      Array.isArray(snapshot.eur)
    ) {
      throw new Error("Invalid EUR FX response structure/date");
    }
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== date ||
      timestamp > today ||
      today - timestamp > 2 * 24 * 60 * 60 * 1000
    ) {
      throw new Error(`Invalid, stale or future EUR FX date: ${date}`);
    }
    const refreshed = {
      ...policy,
      fx: {
        base: "EUR",
        date,
        source: LATEST_EUR_RATES_URL,
        rates: Object.fromEntries(
          SUPPORTED_CURRENCIES.map((currency) => [
            currency,
            snapshot.eur[currency.toLowerCase()],
          ]),
        ),
      },
    };
    validatePricingPolicy(refreshed);
    return refreshed;
  } catch (error) {
    throw new Error(
      `Latest pricing FX refresh failed; generation stopped: ${error.message}`,
      { cause: error },
    );
  }
}
