import { useEffect, useState } from "react";

import { getCurrencySymbolBasedOnTimeZone } from "@/utils/currency-symbols";

export function useClientCurrencySymbol(fallback = "$") {
  const [symbol, setSymbol] = useState(fallback);

  useEffect(() => {
    setSymbol(getCurrencySymbolBasedOnTimeZone());
  }, []);

  return symbol;
}
