import { useCallback, useMemo, useState } from "react";
import { subDays } from "date-fns";

import {
  applyRangePreset,
  buildCompareRange,
  buildNormalizedRange,
  dateToIso,
  formatRangeLabel,
  type DateRange,
  type RangePreset,
} from "@/lib/creator-date-range";

export interface CreatorDateRange {
  rangePreset: RangePreset;
  startDate: string;
  endDate: string;
  compareEnabled: boolean;
  normalizedRange: DateRange;
  compareRange: DateRange;
  rangeLabel: string;
  compareLabel: string;
  setRangePreset: (preset: RangePreset) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setCompareEnabled: (updater: (prev: boolean) => boolean) => void;
  applyPreset: (preset: RangePreset) => void;
}

/**
 * Shared state + derived values for the creator "Range & Comparison" card.
 * Defaults to the last 7 days.
 */
export function useCreatorDateRange(): CreatorDateRange {
  const [rangePreset, setRangePreset] = useState<RangePreset>("last_7_days");
  const [startDate, setStartDate] = useState(() =>
    dateToIso(subDays(new Date(), 6)),
  );
  const [endDate, setEndDate] = useState(() => dateToIso(new Date()));
  const [compareEnabled, setCompareEnabledState] = useState(true);

  const normalizedRange = useMemo(
    () => buildNormalizedRange(startDate, endDate),
    [startDate, endDate],
  );

  const compareRange = useMemo(
    () => buildCompareRange(normalizedRange),
    [normalizedRange],
  );

  const rangeLabel = useMemo(
    () => formatRangeLabel(normalizedRange),
    [normalizedRange],
  );
  const compareLabel = useMemo(
    () => formatRangeLabel(compareRange),
    [compareRange],
  );

  const applyPreset = useCallback((preset: RangePreset) => {
    setRangePreset(preset);
    const resolved = applyRangePreset(preset);
    if (resolved) {
      setStartDate(resolved.start);
      setEndDate(resolved.end);
    }
  }, []);

  const setCompareEnabled = useCallback(
    (updater: (prev: boolean) => boolean) => {
      setCompareEnabledState((prev) => updater(prev));
    },
    [],
  );

  return {
    rangePreset,
    startDate,
    endDate,
    compareEnabled,
    normalizedRange,
    compareRange,
    rangeLabel,
    compareLabel,
    setRangePreset,
    setStartDate,
    setEndDate,
    setCompareEnabled,
    applyPreset,
  };
}
