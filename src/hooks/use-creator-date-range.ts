import { useCallback, useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";

import {
  applyRangePreset,
  buildCompareRange,
  buildNormalizedRange,
  dateToIso,
  formatRangeLabel,
  isValidIsoDate,
  type DateRange,
  type RangePreset,
} from "@/lib/creator-date-range";

export type CompareMode = "auto" | "custom";

export interface CreatorDateRange {
  rangePreset: RangePreset;
  startDate: string;
  endDate: string;
  compareEnabled: boolean;
  compareMode: CompareMode;
  compareStartDate: string;
  compareEndDate: string;
  normalizedRange: DateRange;
  compareRange: DateRange;
  rangeLabel: string;
  compareLabel: string;
  setRangePreset: (preset: RangePreset) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setCompareEnabled: (updater: (prev: boolean) => boolean) => void;
  setCompareMode: (mode: CompareMode) => void;
  setCompareStartDate: (value: string) => void;
  setCompareEndDate: (value: string) => void;
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
  const [compareEnabled, setCompareEnabledState] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareMode>("auto");
  const [compareStartDate, setCompareStartDateState] = useState(() =>
    dateToIso(subDays(new Date(), 13)),
  );
  const [compareEndDate, setCompareEndDateState] = useState(() =>
    dateToIso(subDays(new Date(), 7)),
  );

  const normalizedRange = useMemo(
    () => buildNormalizedRange(startDate, endDate),
    [startDate, endDate],
  );

  const autoCompareRange = useMemo(
    () => buildCompareRange(normalizedRange),
    [normalizedRange],
  );

  const customCompareRange = useMemo(
    () => buildNormalizedRange(compareStartDate, compareEndDate),
    [compareStartDate, compareEndDate],
  );

  const compareRange = compareMode === "custom" ? customCompareRange : autoCompareRange;

  // Sync custom compare dates to auto-computed values when in auto mode,
  // so switching to custom starts from the auto-computed values.
  useEffect(() => {
    if (compareMode === "auto") {
      setCompareStartDateState(autoCompareRange.start);
      setCompareEndDateState(autoCompareRange.end);
    }
  }, [compareMode, autoCompareRange]);

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

  const setCompareStartDate = useCallback((value: string) => {
    if (isValidIsoDate(value)) setCompareStartDateState(value);
  }, []);

  const setCompareEndDate = useCallback((value: string) => {
    if (isValidIsoDate(value)) setCompareEndDateState(value);
  }, []);

  return {
    rangePreset,
    startDate,
    endDate,
    compareEnabled,
    compareMode,
    compareStartDate,
    compareEndDate,
    normalizedRange,
    compareRange,
    rangeLabel,
    compareLabel,
    setRangePreset,
    setStartDate,
    setEndDate,
    setCompareEnabled,
    setCompareMode,
    setCompareStartDate,
    setCompareEndDate,
    applyPreset,
  };
}
